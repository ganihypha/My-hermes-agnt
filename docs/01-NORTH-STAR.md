# ⭐ 01 — NORTH STAR

> Canonical · turunan dari `docs/00-SSOT-CANONICAL.md` · v1.1 · 2026-06-15

---

## 1. Vision (mimpi besar — 3 tahun)

> **"Setiap orang — termasuk operator solo dari Indonesia — bisa punya AI agent
> pribadi yang mengingat, belajar, dan bertindak; berjalan murah di edge global,
> dijalankan cukup dari sebuah HP lewat browser."**

Bukan chatbot sekali pakai. Agent yang **tumbuh bersama pemiliknya** (self-improving,
ala Hermes Agent), tapi di-host di infrastruktur **paling murah & global** (Cloudflare),
sehingga zero biaya server bulanan.

## 2. Mission (apa yang kita lakukan sekarang — 6 bulan)

Meng-**upgrade** "Hermes Chat" yang sudah live (`my-hermes-agnt.pages.dev/chat`) dari
sekadar proxy Groq → menjadi **agent edge ber-memori + ber-tools**:
1. Memori persisten lintas sesi (KV + Vectorize).
2. Tool-calling nyata (web crawl/scrape via Browser Rendering, recall memory).
3. Multi-provider LLM (Groq cepat + Workers AI gratis sebagai fallback).
4. UI yang bisa dipakai nyaman dari HP.

## 3. ⭐ North Star Metric (satu angka yang paling penting)

> **WAR — Weekly Active Recall**: jumlah sesi/minggu dimana agent **berhasil
> memanggil memori lama ATAU sebuah tool** dan output itu dipakai user.

Kenapa metrik ini: ia menangkap inti produk (memori + aksi), bukan vanity metric.
Chat biasa = "messages sent". Tapi yang membedakan kita = recall & tool-use yang berguna.

Supporting metrics:
- **Memory write rate** — berapa fakta disimpan/sesi.
- **Tool success rate** — % pemanggilan tool yang sukses (target ≥ 80%).
- **Cost per active session** — harus mendekati $0 (free tier).
- **Mobile session share** — % sesi dari HP (target tinggi, sesuai visi).

## 4. Prinsip (pegangan saat ragu)

1. **Edge-first, zero-server.** Kalau sebuah fitur butuh server long-running, cari
   cara edge-native dulu; kalau mustahil, eksternal-kan via REST + dokumentasikan.
2. **Memory > cleverness.** Agent yang ingat konteks user mengalahkan model paling pintar
   yang amnesia.
3. **BYOK & privat.** Key milik user, data milik user. Tidak ada kebocoran key ke frontend.
4. **Brutal-honest.** Tidak menjual "bypass segala proteksi". Menjual kapabilitas nyata.
5. **Mobile-first.** Kalau tidak enak dipakai di HP, belum selesai.
6. **Indonesia-first, global-ready.** Bahasa & UX ramah Indonesia, tapi infra global.

## 5. Anti-goals (yang SENGAJA tidak kita kejar)

- ❌ Bukan tool untuk melanggar ToS / membobol captcha / TLS-fingerprint spoof situs orang.
- ❌ Bukan agent "YOLO" yang beraksi tanpa konfirmasi pada aksi berisiko (no auto-strike).
- ❌ Bukan platform yang butuh GPU / training model sendiri.
- ❌ Bukan menyalin n8n / Python Hermes-3 / CrewAI ke dalam Cloudflare (tidak mungkin secara
  teknis — kalau perlu, eksternal-kan via REST; lihat `06-EXTERNAL-INTEGRATIONS`).
- ❌ Bukan SaaS multi-tenant berbayar dulu — fokus single-operator dulu, monetisasi nanti.

## 6. Definisi sukses 6 bulan

> Reza bisa buka HP, chat dengan agent, agent ingat keputusan minggu lalu, dan bisa
> disuruh "ringkas halaman X" lalu agent crawl + ringkas + simpan ke memori —
> semua jalan di Cloudflare gratis, deploy-able ulang dalam 1 perintah.

---
*Kalau sebuah fitur tidak menggerakkan North Star Metric (WAR), tanyakan: kenapa dikerjakan?*
