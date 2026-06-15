---
name: sovereign-cf-byok-deploy
version: 1.1.0
description: >-
  SparkMind Sovereign deploy playbook — deploy proyek Hono/Cloudflare
  Pages ke akun Cloudflare milik user sendiri (BYOK, token via Deploy
  panel). Full workflow: setup_cloudflare_api_key → build → pages
  project create → deploy → D1 migrations production → secrets →
  custom domain → verifikasi. Dipakai untuk semua sub-brand SparkMind
  (BarberKas / KuratorKas / PaceLokal / Nurani / MomentKas).
metadata:
  category: hosted
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK"
  requires:
    bins: ["wrangler", "npx", "npm"]
    tools: ["setup_cloudflare_api_key", "meta_info"]
---

# sovereign-cf-byok-deploy

Deploy production proyek **Hono + Cloudflare Pages** ke akun Cloudflare
**milik user sendiri** (BYOK = Bring Your Own Key). Token Cloudflare
di-paste user di **Deploy panel** UI Genspark; tool
`setup_cloudflare_api_key` lalu meng-export `CLOUDFLARE_API_TOKEN` di
sandbox sehingga `wrangler` jalan langsung terhadap akun CF user.

**Hard constraint SparkMind**: 100% genspark.ai/ai_developer +
Cloudflare Workers/Pages. ZERO VPS, ZERO Vercel/Netlify, ZERO local dev.

## Kapan dipakai

- User bilang: "deploy", "deploy cf", "deploy pakai akun CF saya",
  "BYOK deploy", "push ke production Cloudflare".
- Proyek sudah build-able (`npm run build` menghasilkan `dist/`).

## Urutan WAJIB (jangan diacak)

### 1. Auth — `setup_cloudflare_api_key` (tool, bukan bash)

Panggil tool `setup_cloudflare_api_key` **sebelum perintah wrangler
apa pun**.

- Jika GAGAL → **STOP TOTAL**. Minta user masukkan Cloudflare API
  token di **Deploy panel** project UI, lalu retry.
- **JANGAN PERNAH** coba `wrangler login`, OAuth, atau auth fallback
  lain — semuanya TIDAK berfungsi di sandbox ini.

### 2. Verifikasi auth

```bash
cd /home/user/webapp && npx wrangler whoami
```

Harus print email akun CF user (token user-owned `cfut_…`) atau nama
akun (token account-owned `cfat_…`). **Keduanya valid** — jangan tolak
token account-owned.

### 3. Kelola nama project via `meta_info`

```text
meta_info(action="read", key="cloudflare_project_name")
# Kosong → default ke code_name proyek (mis. "webapp" /
#   "barberkas" / "momentkas").
# Duplicate name saat create → suffix angka: nama-2, nama-3, ...
meta_info(action="write", key="cloudflare_project_name", value="<nama>")
```

### 4. Build

```bash
cd /home/user/webapp && npm run build   # timeout 300s+
```

Output: `dist/` berisi `_worker.js`, `_routes.json`, static assets.

### 5. Create Pages project (HANYA first deploy)

```bash
npx wrangler pages project create <cloudflare_project_name> \
  --production-branch main \
  --compatibility-date 2024-01-01
```

Selalu pakai branch `main` kecuali user minta lain.

### 6. D1 production (jika proyek pakai D1)

```bash
# First deploy: create DB production, copy database_id ke wrangler.jsonc
npx wrangler d1 create <cloudflare_project_name>-production

# Apply migrations ke production (first deploy + setiap migration baru)
npx wrangler d1 migrations apply <cloudflare_project_name>-production
```

⚠️ JANGAN jalankan `seed.sql` ke production kecuali user eksplisit minta.

### 7. Deploy

```bash
npx wrangler pages deploy dist --project-name <cloudflare_project_name>
```

Hasil:
- Production: `https://<random-id>.<nama>.pages.dev`
- Branch:     `https://main.<nama>.pages.dev`

### 8. Persist nama project (WAJIB setelah first deploy sukses)

```text
meta_info(action="write", key="cloudflare_project_name", value="<nama-final>")
```

## Secrets (env vars production)

JANGAN PERNAH hardcode token/API key di repo, frontend, atau
`wrangler.jsonc`. Pakai wrangler secrets:

```bash
# Set (pipe via stdin — non-interaktif)
echo "$VALUE" | npx wrangler pages secret put NAMA_SECRET \
  --project-name <cloudflare_project_name>

# List
npx wrangler pages secret list --project-name <cloudflare_project_name>
```

Local dev: pakai file `.dev.vars` (harus ada di `.gitignore`).

## Custom domain (opsional)

```bash
npx wrangler pages domain add example.com \
  --project-name <cloudflare_project_name>
```

DNS domain harus sudah pointing ke Cloudflare.

## Verifikasi pasca-deploy (WAJIB)

```bash
curl -sI https://<nama>.pages.dev | head -5
curl -s https://<nama>.pages.dev/api/hello
curl -sI https://<nama>.pages.dev/static/app.js | head -3
```

Lalu update `README.md` proyek: URL production + status deploy + tanggal.

## Failure modes

| Gejala | Penyebab / fix |
|---|---|
| `setup_cloudflare_api_key` gagal | User belum isi token CF. STOP, arahkan ke Deploy panel. JANGAN `wrangler login`. |
| `whoami` → "Not authenticated" | Token invalid/expired. Minta user refresh token di Deploy panel, re-run setup tool. |
| `project create` duplicate name | Nama sudah dipakai di akun CF. Suffix-increment, retry, tulis balik ke `meta_info`. |
| Deploy permission error | Token kurang scope **Cloudflare Pages: Edit**. Minta user regenerate token. |
| `secret put` hang | Baca dari stdin — pipe value seperti contoh di atas. |
| D1 binding error production | `database_id` di `wrangler.jsonc` belum diisi dari hasil `d1 create`. |

## Out of scope

- GitHub push → pakai skill `sovereign-github-push`.
- PM2 / local dev workflow → pakai skill `sovereign-workflow-ops`.
- Hosted deploy via akun Genspark → pakai skill bawaan `gsk-hosted-deploy`.
- Full pipeline end-to-end (code→test→deploy→push) → skill
  `sovereign-fullstack-cycle` (skill ini = FASE 5-nya).
- Disiplin biaya tool → `sovereign-credit-aware`.
