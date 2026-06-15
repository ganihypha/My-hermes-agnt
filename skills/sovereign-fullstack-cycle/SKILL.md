---
name: sovereign-fullstack-cycle
version: 1.1.0
description: >-
  SparkMind Sovereign MASTER ORCHESTRATOR — full-cycle fullstack
  end-to-end di Genspark AI Dev: context ingest → scope lock →
  scaffold/code (Hono + Cloudflare Pages + D1/KV/R2) → build → test →
  PM2 preview → deploy production (BYOK CF) → push GitHub → backup →
  README. Satu trigger = seluruh pipeline jalan. Dipakai untuk SEMUA
  project sub-brand SparkMind (BarberKas / KuratorKas / PaceLokal /
  Nurani / MomentKas) dari nol sampai production. Trigger: "full
  cycle", "fullstack", "kerjakan semua", "build sampai deploy",
  "execute end-to-end", "selesaikan project ini".
metadata:
  category: orchestrator
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  composes:
    - sovereign-context-injection      # FASE 0
    - sovereign-cowork-handoff         # FASE 0 (resume) + FASE 7 (handoff)
    - sovereign-workflow-ops           # FASE 3-4
    - sovereign-computer-browser-use   # FASE 4 (test UI/console)
    - sovereign-enterprise-patterns    # FASE 4b (hardening pra-deploy)
    - sovereign-gtm-engineering        # opsional (project landing/GTM)
    - sovereign-cf-byok-deploy         # FASE 5
    - sovereign-github-push            # FASE 6
    - sovereign-credit-aware           # lintas-fase (cost guard)
  requires:
    bins: ["node", "npm", "npx", "pm2", "wrangler", "git", "curl"]
    tools: ["setup_cloudflare_api_key", "setup_github_environment", "meta_info", "GetServiceUrl", "ProjectBackup", "TodoWrite"]
---

# sovereign-fullstack-cycle

**MASTER SKILL** — orkestrator full-cycle. Satu perintah user →
seluruh pipeline dieksekusi berurutan. Skill ini MEMANGGIL skill
sovereign lain per fase (composition pattern). User cukup bilang
"jalankan full cycle" — minimal prompting by design.

## Hard constraints (embed — non-negotiable)

1. 100% genspark.ai/ai_developer + Cloudflare Workers/Pages. ZERO VPS,
   ZERO Vercel/Netlify, ZERO local dev di luar sandbox.
2. Working dir WAJIB `/home/user/webapp`. Setiap bash:
   `cd /home/user/webapp && ...`
3. Stack default: **Hono + TypeScript + Vite + Wrangler** backend,
   frontend CDN (TailwindCSS, FontAwesome, axios, Chart.js).
4. Storage WAJIB Cloudflare-native: D1 (relasional) / KV (key-value) /
   R2 (file). JANGAN simpan data di memory/filesystem runtime.
5. D-1 Truth-Lock: laporkan kegagalan apa adanya, jangan klaim sukses
   sebelum verifikasi curl/log.
6. Credit-aware: patuhi guard skill `sovereign-credit-aware` di setiap
   fase (jangan panggil tool mahal tanpa perlu).

## PIPELINE (7 fase — urutan EXACT, jangan diacak)

Buat TodoWrite 1 todo per fase di awal. Tandai progress real-time.

### FASE 0 — Context Ingest & Scope Lock
→ Ikuti skill `sovereign-context-injection` secara penuh
→ + `sovereign-cowork-handoff`: baca `HANDOFF.md` / commit `handoff:`
  terakhir untuk resume dari titik sesi sebelumnya berhenti:
- Baca SEMUA file upload user (`/home/user/uploaded_files/`), repo
  existing, SB-Git refs, README lama.
- Ekstrak: brand, scope fitur, data model, theme, constraint khusus.
- **Scope lock**: tulis ringkasan scope 5-10 baris + konfirmasi singkat
  ke user HANYA jika ada ambiguitas fatal. Jika scope jelas → langsung
  lanjut (minimal prompting doctrine).

### FASE 1 — Scaffold & Arsitektur
```bash
# Proyek sudah pre-init Hono CF Pages. Verifikasi:
ls /home/user/webapp/package.json || \
  (cd /home/user && npm create -y hono@latest webapp -- \
   --template cloudflare-pages --install --pm npm)   # timeout 300s
cd /home/user/webapp && git status || (git init && git add . && git commit -m "init")
```
- Susun struktur: `src/index.tsx` (routes API), `public/static/`
  (app.js, styles.css), `migrations/` (jika D1), `seed.sql`,
  `ecosystem.config.cjs`, `wrangler.jsonc`.
- Definisikan data model DULU (migrations) sebelum koding fitur.

### FASE 2 — Code (iteratif per fitur)
- Backend: route API Hono per fitur (`/api/...`), binding D1/KV/R2
  via `type Bindings`.
- Frontend: HTML di `c.html()` + logic di `public/static/app.js`
  (axios → API). Semantic HTML + id bermakna.
- **Commit per fitur selesai** (`feat: ...`) — jangan numpuk.

### FASE 3 — Build + Preview lokal
→ Ikuti skill `sovereign-workflow-ops` section A & B:
```bash
fuser -k 3000/tcp 2>/dev/null || true; pm2 delete all 2>/dev/null || true
cd /home/user/webapp && npm run build                      # 300s+
npx wrangler d1 migrations apply webapp-production --local # jika D1
npx wrangler d1 execute webapp-production --local --file=./seed.sql
pm2 start ecosystem.config.cjs
```

### FASE 4 — Test (WAJIB sebelum deploy)
```bash
curl -s http://localhost:3000 | head -20          # homepage hidup
curl -s http://localhost:3000/api/<endpoint>      # tiap API utama
pm2 logs webapp --nostream --lines 30             # nol error
```
- Test SEMUA endpoint CRUD utama (GET+POST minimal).
- Gagal → fix → rebuild → retest. JANGAN lanjut fase 5 jika ada error.
- Sukses → `GetServiceUrl(port=3000)` → kasih preview URL ke user.
- UI/frontend → verifikasi visual via `sovereign-computer-browser-use`
  (PlaywrightConsoleCapture: nol error JS, elemen kunci ter-render).

### FASE 4b — Hardening pra-deploy (WAJIB sebelum FASE 5)
→ Jalankan checklist `sovereign-enterprise-patterns`:
secrets (zero token frontend) · validasi input + query parameterized ·
onError global · rate limit · consent/hak-hapus PII (UU PDP) ·
`/api/health` · `.dev.vars`+`.env` di `.gitignore`. Gate ini HARUS
lulus sebelum deploy production.

### FASE 5 — Deploy Production (BYOK CF)
→ Ikuti skill `sovereign-cf-byok-deploy` secara penuh:
`setup_cloudflare_api_key` → `whoami` → `meta_info` nama project →
`pages project create` → D1 prod create+migrate → `pages deploy dist`
→ secrets → verifikasi curl production → persist `meta_info`.

### FASE 6 — Push GitHub
→ Ikuti skill `sovereign-github-push` secara penuh:
`setup_github_environment` → secret-scan → commit → remote → push
`main` → verifikasi.

### FASE 7 — Backup + README close-out
```text
ProjectBackup(project_path="/home/user/webapp",
              backup_name="<brand>_fullcycle_YYYY-MM-DD")
```
Update `README.md`: fitur selesai, URI + parameter, fitur belum,
next steps, URL production + GitHub, data model + storage, panduan
user, status deploy + tanggal. Commit `docs: README close-out`.
→ + `sovereign-cowork-handoff`: tulis/Update `HANDOFF.md` (state,
keputusan, next step atomic, known issues) + commit `handoff: ...`
agar sesi berikutnya bisa resume tanpa ingest ulang dari nol.

Catatan: untuk project landing/waitlist/pricing, aplikasikan pola
`sovereign-gtm-engineering` (lead capture D1 + consent + SEO/OG) di
FASE 1-2.

## Laporan akhir WAJIB (format)

```
✅ FULL CYCLE SELESAI — <brand>
- Preview sandbox : <GetServiceUrl>
- Production      : https://<nama>.pages.dev
- GitHub          : https://github.com/<owner>/<repo>
- Backup          : <ProjectBackup URL>
- Fitur selesai   : <list>
- Belum / known   : <list jujur D-1>
```

## Failure handling antar-fase

| Fase gagal | Aksi |
|---|---|
| 0 (context kosong/ambigu fatal) | STOP, tanya user 1 pertanyaan padat (bukan interogasi panjang). |
| 3 build error | Fix → rebuild. 3x gagal → laporkan jujur + diagnosa. |
| 4 test gagal | JANGAN deploy. Fix dulu. |
| 5 auth CF gagal | STOP fase 5, arahkan Deploy panel; fase 6-7 tetap lanjut. |
| 6 auth GitHub gagal | STOP fase 6, arahkan tab #github; fase 7 tetap lanjut. |
| Sandbox freeze | `ResetSandbox` → resume dari fase terakhir (file disk aman). |

Prinsip: kegagalan satu fase TIDAK membatalkan fase independen
lainnya. Laporkan status per fase di laporan akhir.

## Out of scope

- Detail per-fase → skill komponennya masing-masing (lihat
  `metadata.composes`).
- Hosted deploy akun Genspark → skill bawaan `gsk-hosted-deploy`
  (tanya user pilih BYOK vs hosted jika belum jelas).
