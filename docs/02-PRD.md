# 📋 02 — PRD (Product Requirements Document)

> Canonical · turunan dari `00-SSOT` & `01-NORTH-STAR` · v1.1 · 2026-06-15

---

## 1. Problem statement

Operator solo (Reza) butuh asisten AI yang:
- **Ingat** keputusan & konteks lintas sesi (chat biasa selalu lupa).
- Bisa **bertindak** di web (ambil & ringkas halaman) bukan cuma ngobrol.
- **Murah** (tidak ada biaya server bulanan).
- Bisa dijalankan **dari HP** kapan saja.

Solusi yang ada (ChatGPT app, dll) = mahal, vendor-locked, tidak BYOK, dan memorinya
bukan milik user. Hermes Agent resmi = powerful tapi butuh server/VM (tidak bisa di CF Pages).

## 2. Target user (persona)

| Persona | Deskripsi | Kebutuhan utama |
|---------|-----------|-----------------|
| **Reza (primary)** | Solo founder SparkMind, Indonesia, pre-revenue, kerja dari HP | Agent murah, BYOK, ber-memori, jalan di HP |
| **Adik (secondary)** | Calon co-founder, 21-22th, belajar AI/automation | Training ground, UI sederhana, bisa eksperimen |
| **Future: klien SparkMind** | UMKM yang mau agent sendiri | Template deploy 1-klik (jauh, bukan sekarang) |

## 3. Scope

### 3.1 IN SCOPE (yang dibangun di project ini, semua CF-deployable)

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| F1 | **Chat UI (upgraded)** | Perbaikan dari versi live: markdown render, model switch, mobile polish | P0 |
| F2 | **Multi-provider LLM proxy** | Worker route `/v1/chat/completions` → Groq (default) + Workers AI (fallback/gratis) | P0 |
| F3 | **Auth gate** | `PROXY_TOKEN` Bearer untuk semua endpoint API | P0 |
| F4 | **Persistent memory (KV)** | Simpan & list "fakta/ingatan" per user, lintas sesi | P0 |
| F5 | **Semantic recall (Vectorize + Workers AI embeddings)** | `bge` embeddings → query topK memori relevan, auto-inject ke prompt | P1 |
| F6 | **Web tool: crawl/scrape** | Endpoint `/api/tools/crawl`. **Default = CF Browser Run REST `/crawl`** (HTML→markdown via AI internal CF, ringan, tanpa Puppeteer). Fallback = binding `BROWSER` (Puppeteer) untuk halaman JS berat → ringkas Workers AI | P1 |
| F7 | **Tool-calling loop (self-healing)** | Agent bisa memutuskan memanggil tool (crawl / recall / save) lalu lanjut menjawab. **Retry loop terbatas** (pola ala LangGraph state machine: max 2-3 retry saat tool gagal, lalu menyerah dengan jujur) | P1 |
| F8 | **Memory dashboard** | Halaman `/memory` untuk lihat/hapus ingatan tersimpan | P2 |
| F9 | **"Hermes operator" system prompt** | System prompt sadar punya tools + memory (versi jujur, **bukan** YOLO/auto-strike). Aksi berisiko → minta konfirmasi user | P2 |

### 3.2 OUT OF SCOPE (eksternal / nanti)

- ❌ n8n self-host (tidak bisa di CF — dokumentasikan setup HF Spaces saja).
- ❌ Python Hermes-3 / CrewAI Python runtime (eksternal via REST kalau perlu).
- ❌ LangChain JS heavy (boleh pola ringan, tapi tidak wajib).
- ❌ Captcha solver / bypass proteksi situs lain (ilegal — ditolak).
- ❌ WhatsApp/Telegram gateway (fase jauh, butuh eksternal).
- ❌ Multi-tenant billing.

## 4. User stories (P0/P1)

- **US1** (F1/F2): Sebagai Reza, aku buka `/chat` di HP, ketik pesan, dan dapat jawaban
  streaming dari LLM lewat worker-ku sendiri. → *DoD: streaming token tampil, < 3s TTFB.*
- **US2** (F3): Sebagai pemilik, hanya aku (pakai PROXY_TOKEN) yang bisa pakai endpoint.
  → *DoD: request tanpa token → 401.*
- **US3** (F4): Sebagai Reza, aku bilang "ingat: aku pilih warna brand indigo", lalu
  sesi berikutnya agent masih tahu itu. → *DoD: fakta tersimpan di KV, muncul di /memory.*
- **US4** (F5): Sebagai Reza, saat aku tanya hal terkait, agent otomatis menarik ingatan
  relevan tanpa aku sebut. → *DoD: recall topK muncul di context, terbukti di log.*
- **US5** (F6/F7): Sebagai Reza, aku bilang "ringkas halaman <url>", agent crawl +
  ringkas + tawarkan simpan. → *DoD: ringkasan akurat, sumber tercatat.*

## 5. Functional requirements (ringkas API)

| Endpoint | Method | Auth | Fungsi |
|----------|--------|------|--------|
| `/` | GET | - | Landing / redirect ke /chat |
| `/chat` | GET | - | Chat UI (mobile-first) |
| `/memory` | GET | - | Memory dashboard UI |
| `/v1/models` | GET | Bearer | List model (test connection) |
| `/v1/chat/completions` | POST | Bearer | Chat completion (stream) multi-provider |
| `/api/memory` | GET/POST/DELETE | Bearer | CRUD ingatan (KV) |
| `/api/memory/recall` | POST | Bearer | Semantic recall (Vectorize) |
| `/api/tools/crawl` | POST | Bearer | Crawl+scrape+summarize url |
| `/api/health` | GET | - | Status check |

## 6. Non-functional requirements

- **Perf**: TTFB chat < 3s; tool call < 15s.
- **Cost**: target $0/bulan di free tier.
- **Security**: keys = CF secret; frontend hanya PROXY_TOKEN; CORS dibatasi.
- **Mobile**: layout responsif, safe-area, touch-friendly.
- **Portability**: redeploy 1 perintah via skill cf-byok-deploy.

## 7. Success metrics (lihat North Star)

WAR (Weekly Active Recall) naik; tool success ≥ 80%; cost/session ≈ $0.

## 8. Open questions / keputusan menunggu user

1. **Deploy path**: pakai akun Cloudflare sendiri (BYOK skill) — *user sudah minta cf-byok*. ✅
2. **Vectorize** butuh diaktifkan di akun CF (Workers Paid? — Vectorize ada di free tier
   terbatas). Konfirmasi saat deploy.
3. **Provider default**: Groq (`llama-3.3-70b-versatile`) — sesuai live. ✅
4. Rotasi semua key yang sudah ter-share di chat sebelum publik. ⚠️ (rekomendasi)
5. **(v1.1) Crawl path**: konfirmasi token Browser Rendering untuk `/crawl` REST. Browser
   Rendering REST + binding Puppeteer butuh **Workers Paid** untuk kuota nyaman — cek saat deploy.
6. **(v1.1) Eksternal swarm?** Apakah CrewAI/LangGraph/n8n perlu di-host di HF Spaces
   (lihat `06-EXTERNAL-INTEGRATIONS`) atau cukup tool-loop edge-native dulu? → default: **edge-native dulu**, eksternal hanya jika benar dibutuhkan.

---
*PRD ini hidup. Update saat scope berubah; sinkronkan dengan 03-ARCHITECTURE & 05-TODO.*
