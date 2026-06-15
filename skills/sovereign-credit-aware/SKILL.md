---
name: sovereign-credit-aware
version: 1.0.0
description: >-
  SparkMind Sovereign credit/saldo guard — disiplin konsumsi kredit
  Genspark di setiap sesi AI Dev: cek plan/akun (gsk me), hindari tool
  mahal yang tidak perlu (image/video/audio gen, render_js, deep
  research, sub-agent), pilih jalur murah (bash/curl/grep dulu),
  batching tool call, dan eskalasi konfirmasi user sebelum operasi
  berbiaya. Trigger: "hemat kredit", "credit aware", "saldo", "jangan
  boros", "cek kredit", "budget mode", "konsumsi credit".
metadata:
  category: governance
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  requires:
    bins: ["gsk", "curl", "grep"]
    tools: []
---

# sovereign-credit-aware

Guard rail konsumsi kredit/saldo Genspark. Skill ini berlaku
**lintas-fase** — aktifkan di awal sesi, lalu patuhi di semua skill
lain (terutama `sovereign-fullstack-cycle`).

## D-1 Truth-Lock: fakta platform soal kredit

- **TIDAK ADA** API/CLI publik dari dalam sandbox untuk membaca sisa
  saldo kredit numerik secara real-time. `gsk me` hanya expose
  email + plan (`free`/`plus`/`pro`), BUKAN angka kredit.
- Saldo kredit akurat hanya terlihat user di UI Genspark
  (Settings → Billing/Usage). Jika butuh angka pasti → MINTA USER cek
  dan informasikan.
- Konsekuensi: strategi kita = **preventif** (minimalkan konsumsi),
  bukan reaktif (monitor angka).

## Cek status akun (awal sesi)

```bash
gsk me   # → email, plan. Plan "free" = mode hemat MAKSIMUM.
```

| Plan | Mode operasi |
|---|---|
| free | ULTRA-HEMAT: zero tool generatif tanpa konfirmasi, zero sub-agent, zero render_js. |
| plus/pro | HEMAT-NORMAL: tool berbiaya tetap konfirmasi dulu untuk operasi besar/batch. |

## Tabel biaya relatif (urutan termurah → termahal)

| Tier | Operasi | Kebijakan |
|---|---|---|
| 0 GRATIS-ringan | bash, curl, grep, git, npm, pm2, wrangler, Read/Write/Edit file | Pakai BEBAS — selalu jalur pertama. |
| 1 Murah | web_search, crawler (raw/markdown TANPA render_js), image_search | Boleh, tapi batch query & jangan redundant. |
| 2 Sedang | analyze_media_content, audio_transcribe, summarize_large_document, crawler `render_js=true` | Hanya jika tier 0-1 tidak cukup. render_js = last resort. |
| 3 Mahal | image_generation, audio_generation | WAJIB konfirmasi user dulu (jumlah + model) kecuali user sudah eksplisit minta. |
| 4 Sangat mahal | video_generation, create_agent (sub-agent: slides/deep_research/super_agent), hd_mode | WAJIB konfirmasi eksplisit + sebutkan ini operasi berbiaya tinggi. |

## Aturan operasional (WAJIB)

1. **Tier-0 first**: setiap kebutuhan info → coba bash/curl/grep/file
   read dulu sebelum tool API apa pun.
2. **Batch, jangan cicil**: gabungkan beberapa tool call independen
   dalam satu blok; gabungkan beberapa perintah bash dengan `&&`/`;`
   dalam satu invocation.
3. **Jangan re-read**: file yang sudah dibaca jangan dibaca ulang utuh;
   pakai grep/offset untuk bagian spesifik.
4. **Jangan re-generate**: asset (gambar/audio) yang sudah pernah
   dibuat → reuse URL-nya, jangan generate ulang.
5. **Crawler diet**: default `raw=false` tanpa `render_js`. Naik ke
   `render_js=true` HANYA setelah plain crawl gagal/403.
6. **Sub-agent gate**: `create_agent` (slides, deep_research, docs,
   super_agent) = konsumsi besar → selalu tanya user dulu KECUALI user
   eksplisit memintanya.
7. **Generatif gate**: sebelum image/video/audio generation, laporkan:
   jumlah item × model → minta OK. Pilih model termurah yang memenuhi
   kebutuhan (mis. `fal-ai/z-image/turbo` untuk draft, bukan model pro).
8. **Konteks hemat = kredit hemat**: jangan dump file besar ke chat;
   ringkas. (Detail → skill `sovereign-context-injection`.)
9. **Laporan konsumsi**: di akhir sesi, sebutkan jujur tool berbiaya
   apa saja yang dipakai (jenis + perkiraan jumlah call), supaya user
   bisa cocokkan dengan Usage di UI.

## Eskalasi format (template konfirmasi)

> ⚠️ Operasi berikut mengonsumsi kredit signifikan:
> `<tool> × <jumlah> (model: <model>)` — perkiraan tier 3/4.
> Lanjut? (ya/tidak/alternatif murah: <opsi>)

## Failure modes

| Gejala | Fix |
|---|---|
| User tanya sisa saldo persis | Jujur: tidak bisa dibaca dari sandbox. Arahkan ke UI Genspark → Settings → Usage. |
| Tool generatif gagal karena kredit habis | Laporkan apa adanya, sarankan top-up / downgrade kualitas / tunda. |
| Task butuh sub-agent tapi plan free | Tawarkan jalur manual inline (agent ini kerjakan sendiri tanpa sub-agent) — lebih lambat tapi hemat. |

## Out of scope

- Workflow build/deploy → `sovereign-workflow-ops` /
  `sovereign-cf-byok-deploy`.
- Manajemen context window → `sovereign-context-injection`.
