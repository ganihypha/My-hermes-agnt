---
name: sovereign-computer-browser-use
version: 1.0.0
description: >-
  SparkMind Sovereign COMPUTER/BROWSER-USE — disiplin pakai tool
  browsing & verifikasi visual di Genspark AI Dev mengikuti best
  practice Anthropic "computer use / browser use": gunakan browser
  HANYA setelah jalur kode (curl/fetch/API) gagal, loop kecil
  observe→act→verify, screenshot/console capture untuk debug frontend,
  dan guard biaya (render_js = last resort). Cocok untuk test E2E UI,
  scraping terkontrol, debug JS runtime di webapp. Trigger: "browser
  use", "computer use", "cek tampilan", "screenshot", "debug frontend",
  "console log", "test UI", "verifikasi visual", "playwright".
metadata:
  category: verification
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  source_inspiration: "Anthropic — best practices for computer & browser use"
  pairs_with:
    - sovereign-credit-aware        # render_js/browser = tier mahal
    - sovereign-workflow-ops        # test fase setelah build
    - sovereign-fullstack-cycle     # dipakai di FASE 4 (test)
  requires:
    bins: ["curl", "grep"]
    tools: ["PlaywrightConsoleCapture", "GetServiceUrl", "crawler"]
---

# sovereign-computer-browser-use

Adaptasi doktrin Anthropic "computer use / browser use" ke environment
Genspark AI Dev. Prinsip inti: **browser/visual adalah jalur MAHAL &
lambat — pakai sebagai verifikasi, bukan jalur utama.**

## Hierarki tool (termurah → termahal — patuhi credit-aware)

| Tingkat | Tool | Kapan |
|---|---|---|
| 0 | `curl http://localhost:3000/...` | SELALU pertama: cek HTML/JSON, status, header. |
| 1 | `crawler` (raw=false, TANPA render_js) | Ambil konten halaman statis/eksternal. |
| 2 | `PlaywrightConsoleCapture` | Debug JS runtime: error console, warning, log. |
| 3 | `crawler` render_js=true | Halaman butuh JS render / anti-bot — LAST RESORT. |

## Loop observe → act → verify (pola Anthropic)

Jangan "tembak" banyak aksi sekaligus. Satu siklus kecil:
1. **Observe** — ambil state nyata (curl output / console capture /
   screenshot), JANGAN berasumsi.
2. **Act** — lakukan SATU perubahan (fix kode / klik / isi form).
3. **Verify** — ambil ulang state, bandingkan dgn ekspektasi.
4. Ulang sampai pass. Catat tiap langkah ringkas (audit trail D-1).

## Test E2E UI webapp (SOP)

```bash
# 1. Pastikan service hidup (workflow-ops)
curl -s http://localhost:3000 | head -20
# 2. Dapatkan URL publik untuk browser tool
#    → GetServiceUrl(port=3000)
# 3. Capture console (deteksi error JS yang tak terlihat di curl)
#    → PlaywrightConsoleCapture(url=<service-url>, capture_duration=5,
#       wait_for_selector="#app")
# 4. Verifikasi: nol error merah di console; elemen kunci ter-render.
```
Gagal → fix kode → `npm run build` → restart PM2 → ulang capture.

## Debug frontend (kasus umum)

| Gejala | Aksi browser-use |
|---|---|
| Halaman blank tapi curl OK | ConsoleCapture → cari error JS (import gagal, CDN 404). |
| API call dari frontend gagal | ConsoleCapture cek CORS/network; cek route Hono via curl. |
| Style tidak muncul | curl `/static/styles.css` (200?); cek path serveStatic. |
| Interaksi (klik) tak jalan | ConsoleCapture saat load; cek listener di app.js. |

## Scraping terkontrol (jika scope butuh data eksternal)

1. `crawler` raw/markdown dulu (tier 1) — cukup untuk mayoritas situs.
2. Hanya jika 403/blank → `render_js=true` (tier 3) + konfirmasi
   credit-aware.
3. Hormati lisensi gambar/konten (lihat aturan Image Licensing system).
4. Jangan loop crawl masif — batch, cache hasil, jangan re-crawl.

## Guard biaya (D-1 + credit-aware)

- `render_js=true` dan browser tool = tier mahal. Konfirmasi user bila
  plan free atau dipakai berulang.
- JANGAN screenshot/console-capture berkali-kali untuk hal sama —
  satu capture yang benar > sepuluh capture buta.
- Selalu coba `curl` dulu; 80% verifikasi selesai di tier 0.

## D-1 Truth-Lock: batas platform

- Tidak ada "computer use" desktop penuh (mouse/keyboard OS) di
  sandbox ini; yang tersedia = `PlaywrightConsoleCapture` (headless
  console) + `crawler`. Jangan klaim bisa klik UI desktop arbitrer.
- Screenshot piksel-akurat tidak dijamin; verifikasi struktural (DOM,
  console, curl) lebih andal daripada interpretasi visual.

## Failure modes

| Gejala | Fix |
|---|---|
| ConsoleCapture timeout | Naikkan `timeout`, pastikan service hidup + URL benar. |
| crawler kosong/403 | Naik ke render_js (konfirmasi), atau cari sumber lain. |
| Service URL tidak publik | `GetServiceUrl(port=3000)` dulu, baru browser tool. |

## Out of scope

- Build/PM2/restart → `sovereign-workflow-ops`.
- Keputusan biaya tool → `sovereign-credit-aware`.
- Generasi screenshot artistik → bukan tujuan skill ini.
