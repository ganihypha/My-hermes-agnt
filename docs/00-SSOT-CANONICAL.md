# 🧭 00 — SSOT CANONICAL (Single Source of Truth)

> **Project**: Hermes Agent × Cloudflare — "God Mode" Edge AI Agent Platform
> **Code name**: `webapp` → Cloudflare project `my-hermes-agnt`
> **Owner**: Reza Estes / Haidar Faras + Gyss (spousal 50/50)
> **Doctrine**: MASTER-ARCHITECT-PROMPT v5.0+v7.0+v8.0 · D-1 Truth-Lock
> **Status**: Canonical docs **v1.1 (enhanced)** · build pending approval
> **Last updated**: 2026-06-15 (v1.1 — deep-dive enhance dari 25+ file referensi)

---

## 0. Apa itu dokumen ini

Ini adalah **SSOT (Single Source of Truth)** — satu pintu masuk ke semua dokumen
canonical project. Kalau ada konflik antar dokumen, **dokumen yang versinya lebih
baru + dirujuk di sini yang menang**. Semua dokumen lain harus konsisten dengan ini.

## 1. Peta dokumen canonical

| # | Dokumen | Fungsi | File |
|---|---------|--------|------|
| 00 | **SSOT Canonical** (ini) | Pintu masuk + aturan konsistensi | `docs/00-SSOT-CANONICAL.md` |
| 01 | **North Star** | Visi, misi, 1 metrik utama, prinsip | `docs/01-NORTH-STAR.md` |
| 02 | **PRD** (Product Requirements) | Apa yang dibangun, untuk siapa, scope | `docs/02-PRD.md` |
| 03 | **Architecture** | Bagaimana sistem dirakit (teknis) | `docs/03-ARCHITECTURE.md` |
| 04 | **Design / UI** | Tampilan, UX, design system | `docs/04-DESIGN-UI.md` |
| 05 | **Todo / Roadmap** | Urutan kerja, sprint, DoD | `docs/05-TODO-ROADMAP.md` |
| 06 | **External Integrations** | Jalur eksternal (HF Spaces, CrewAI, LangGraph, n8n via REST) | `docs/06-EXTERNAL-INTEGRATIONS.md` |

Konteks pendukung (bukan canonical, tapi sumber kebenaran brand):
- `context/capturekas/` — doktrin SparkMind/CaptureKas (privasi Gyss, dll)
  ⚠️ *Catatan v1.1*: tarball upload ter-truncate — baru 1 dari 17 dokumen ter-extract
  (`00-CAPTUREKAS-AaaS-DR-PHASE1-v0.1.md`). Re-upload ZIP utuh untuk konteks penuh.
- `BOOT.md` + `boot.sh` — sistem boot-loop minimal-prompting
- `agentic-team-skills/` — 12 role-skill C-Suite/squad (ter-extract penuh ✅)
- `SECRETS.local.md` — vault kredensial (GITIGNORED, jangan pernah push)

## 2. Ringkasan 1-paragraf (untuk siapapun yang baru baca)

Kita membangun **platform AI agent di edge Cloudflare** yang terinspirasi 3 referensi
resmi: **Hermes Agent (Nous Research)** untuk konsep self-improving + memory + skills,
**Cloudflare Agents stack** (Workers AI, Vectorize, KV, Browser Rendering / Browser Run,
Agent Memory) untuk infrastruktur, dan **hermes-cloudflare plugin (raulvidis)** untuk
pola tool crawl/scrape/screenshot. Produk minimal yang sudah LIVE adalah **Hermes Chat**
(`my-hermes-agnt.pages.dev/chat`) — UI chat yang mem-proxy Groq lewat Worker. Target
project ini = **upgrade & enhance** chat itu menjadi agent ber-memori + ber-tools yang
masih 100% deploy-able ke Cloudflare Pages (BYOK), bisa dijalankan dari HP lewat browser.

## 3. Referensi resmi (jangan dilupakan)

| Referensi | URL | Dipakai untuk |
|-----------|-----|---------------|
| Hermes Agent (official) | https://github.com/NousResearch/hermes-agent | Konsep learning loop, skills, memory, tools |
| Hermes Agent docs | https://hermes-agent.nousresearch.com/docs/ | Spesifikasi 4-layer memory, agent loop |
| Hermes Studio (dashboard UI) | https://github.com/JPeetz/Hermes-Studio | Referensi UI dashboard |
| hermes-cloudflare plugin | https://github.com/raulvidis/hermes-cloudflare | Pola tool cf_crawl/cf_scrape/cf_screenshot |
| Cloudflare puppeteer | https://github.com/cloudflare/puppeteer | Browser Rendering / stealth |
| CF Agent Memory (blog) | https://blog.cloudflare.com/introducing-agent-memory/ | Memory binding |
| CF Browser Run crawl | https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/ | **/crawl REST endpoint** (HTML→markdown via AI internal) — jalur ringan F6 |
| CF Browser Rendering (Puppeteer) | https://developers.cloudflare.com/browser-run/puppeteer/ | Binding `BROWSER` render kompleks |
| CF serverless Puppeteer (blog) | https://blog.cloudflare.com/running-serverless-puppeteer-workers-durable-objects/ | Pola browser pool warm |
| **CF Artifacts (Git-for-Agents)** | https://blog.cloudflare.com/artifacts-git-for-agents-beta/ | Storage skill dinamis agent (backlog) |
| CF managed-agents (tools docs) | https://github.com/cloudflare/claude-managed-agents | Pola tool browser-rendering |
| Composio Hermes×CF | https://composio.dev/toolkits/cloudflare/framework/hermes-agent | MCP toolkit |
| **HF Spaces (Docker)** | https://huggingface.co/spaces | "VPS gratis" untuk CrewAI/LangGraph/n8n (eksternal) |
| LangGraph vs CrewAI | https://maritime.sh/blog/langgraph-vs-crewai-choosing-the-right-framework | Pola self-healing loop & orkestrasi |
| Project repo (kita) | https://github.com/ganihypha/My-hermes-agnt | Repo current state |
| Live (current) | https://my-hermes-agnt.pages.dev/chat | Baseline yang di-upgrade |

## 4. Aturan main (Non-Negotiables)

1. **Cloudflare-deployable saja.** Tidak ada server long-running, tidak ada `fs`,
   tidak ada proses Python runtime. Semua harus jalan di Workers/Pages edge runtime.
   (n8n, Python Hermes-3 lokal, CrewAI Python = **di luar** scope CF — jika perlu,
   jalankan di HF Spaces / VM eksternal dan panggil via REST.)
2. **BYOK (Bring Your Own Key).** Semua API key = Cloudflare secret, **tidak pernah**
   di frontend. Frontend hanya pegang `PROXY_TOKEN` (gate), bukan key provider.
3. **Privasi Gyss MUTLAK** (warisan doktrin CaptureKas). Tidak ada identitas/foto Gyss
   di demo/screenshot/konten eksternal.
4. **Brutal-honest + Auditable.** Klaim "god mode" diterjemahkan ke kapabilitas NYATA
   yang bisa diuji, bukan marketing kosong. Lihat §5.
5. **Zero-cost bootstrap.** Pakai free tier (CF Pages, Workers AI free quota, Groq free,
   HF free) selama memungkinkan.

## 5. ⚠️ D-1 TRUTH-LOCK — terjemahan jujur "God Mode"

Istilah "God Mode" di file referensi = narasi semangat. Terjemahan teknis yang **nyata
dan legal & deploy-able**:

| Klaim "God Mode" | Realita yang kita bangun |
|------------------|--------------------------|
| "Bypass semua anti-bot / Turnstile / WAF Enterprise" | Cloudflare **Browser Rendering / Browser Run** dapat me-render & meng-crawl halaman dari edge. Ini BUKAN jaminan bypass proteksi situs lain; kita pakai untuk crawl/scrape situs yang mengizinkan, sesuai ToS. **Tidak** membangun captcha-solver melanggar hukum. |
| "Memori tak terbatas" | KV + Vectorize + (opsional) Agent Memory binding = memori persisten praktis, dibatasi kuota free tier. |
| "Otonom tanpa izin" | Agent loop dengan tool-calling + **Human-in-the-loop** untuk aksi berisiko (kirim WA, transaksi). Tidak ada "auto-strike" tanpa guard. |
| "Workers AI gratis bersihkan HTML" | Benar — `@cf/meta/llama-*` + `@cf/baai/bge-*` untuk summarize & embeddings di edge. |
| "/crawl REST → markdown otomatis" | **Benar & dipakai** — `…/browser-rendering/crawl` mengembalikan markdown bersih (AI internal CF). Butuh `CLOUDFLARE_ACCOUNT_ID` + token Browser Rendering. Tetap hormati robots/ToS situs target. |
| "TLS fingerprint spoof / lolos Akamai-PerimeterX" | ❌ **DITOLAK.** Spoofing fingerprint untuk membobol proteksi situs orang = di luar koridor legal & ToS. Tidak dibangun. |
| "Captcha/Turnstile solver" | ❌ **DITOLAK.** Memecah captcha situs orang melanggar hukum/ToS. Tidak dibangun. |
| "YOLO mode / otonom tanpa konfirmasi (`--yolo`)" | ❌ **DITOLAK sebagai default.** Aksi berisiko (kirim pesan, transaksi, tulis eksternal) WAJIB Human-in-the-Loop. Tidak ada auto-strike tanpa guard. |
| "Cloudflare Artifacts: 10.000 fork sub-agent instan" | Fitur Artifacts NYATA (beta) untuk storage skill ber-Git, tapi "10.000 fork" = hiperbola. Masuk **backlog**, bukan klaim aktif. |
| "HF Spaces = VPS gratis 24/7" | Sebagian benar — HF Spaces (Docker) bisa host CrewAI/LangGraph/n8n, tapi free tier **tidur setelah 48 jam idle** & punya batas resource. Keep-alive via cron = patch, bukan SLA. Lihat `06-EXTERNAL-INTEGRATIONS`. |

> **Bottom line**: kita bangun agent edge yang KUAT & berguna, dalam koridor legal & ToS.
> Semua "god mode" = fitur nyata (memory, tools, browser-render, multi-provider, /crawl
> REST, recall semantik), **bukan** bypass proteksi situs orang / captcha solver / YOLO
> tanpa guard. Narasi "supreme overlord / shadow clone / infiltrator" di file referensi =
> semangat, **bukan spec yang dibangun**.

## 6. Definition of Done (project level)

- [x] 6 dokumen canonical (01–06) selesai & konsisten (v1.1 enhanced)
- [ ] Worker proxy multi-provider (Groq + Workers AI) jalan lokal (`curl` OK)
- [ ] Chat UI upgraded (memory recall, tool panel, model switch) jalan lokal
- [ ] Deploy ke Cloudflare Pages via skill `cf-byok-deploy` → URL live
- [ ] Push ke GitHub `ganihypha/My-hermes-agnt` via `setup_github_environment`
- [ ] README diupdate, secrets tidak pernah ter-commit

---
*Ubah dokumen ini setiap kali ada keputusan arsitektur/scope besar. Ini sumber kebenaran.*
