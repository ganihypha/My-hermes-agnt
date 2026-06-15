---
name: sovereign-enterprise-patterns
version: 1.0.0
description: >-
  SparkMind Sovereign ENTERPRISE-PATTERNS — pola produksi-grade ala
  Anthropic "building AI agents for the enterprise": keamanan (secrets
  via wrangler secret, zero token di frontend), validasi input, error
  handling + retry, rate limiting, audit log, kepatuhan UU PDP
  Indonesia (consent, retensi, hak hapus), observability ringan, dan
  hardening untuk webapp Hono + Cloudflare Pages free-tier. Naikkan
  project dari "jalan" ke "layak produksi" tanpa biaya. Trigger:
  "enterprise", "hardening", "security", "rate limit", "audit log",
  "compliance", "uu pdp", "produksi", "error handling", "secrets".
metadata:
  category: hardening
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  source_inspiration: "Anthropic — building AI agents for the enterprise"
  pairs_with:
    - sovereign-cf-byok-deploy      # secrets + deploy production
    - sovereign-github-push         # secret-scan sebelum push
    - sovereign-gtm-engineering     # consent/PII pada lead capture
    - sovereign-fullstack-cycle     # diterapkan sebelum deploy
  requires:
    bins: ["npx", "wrangler", "git", "grep", "curl"]
    tools: []
---

# sovereign-enterprise-patterns

Checklist hardening yang menaikkan webapp dari "demo jalan" ke "layak
produksi" — tetap di free-tier Cloudflare. Diterapkan di fullstack-
cycle SEBELUM FASE 5 (deploy).

## 1. Secrets & token (ZERO leak — paling kritis)

```bash
# Token pihak ketiga / API key → SELALU wrangler secret (server-side):
npx wrangler pages secret put OPENAI_API_KEY --project-name <proj>
# Lokal dev: .dev.vars (WAJIB di .gitignore, JANGAN commit)
echo ".dev.vars" >> .gitignore
```
Aturan keras:
- TIDAK ADA token/API key di frontend (`public/`, `c.html()`, app.js).
- Semua call pihak ketiga lewat route server Hono, baca `c.env.SECRET`.
- Secret-scan sebelum push → `sovereign-github-push` (cek pola key).

## 2. Validasi input (jangan percaya client)

```typescript
app.post('/api/x', async (c) => {
  const b = await c.req.json().catch(() => null)
  if (!b || typeof b.field !== 'string' || b.field.length > 500)
    return c.json({ error: 'input tidak valid' }, 400)
  // ... lanjut
})
```
- Validasi tipe + panjang + whitelist nilai. Tolak 400 bila gagal.
- Query D1 SELALU parameterized (`.bind()`) — cegah SQL injection.
- Escape output yang masuk HTML — cegah XSS.

## 3. Error handling + retry (graceful)

```typescript
app.onError((err, c) => {
  console.error('ERR', err)                       // observability
  return c.json({ error: 'terjadi kesalahan' }, 500)  // jangan bocorkan stack
})
```
- Call eksternal: timeout + retry terbatas (mis. 2x, backoff) — JANGAN
  loop tak hingga (CPU limit Workers 10-30ms).
- Pesan error ke user ramah id-ID; detail teknis ke log saja.

## 4. Rate limiting ringan (KV)

```typescript
// Batasi per IP per menit pakai KV TTL
const ip = c.req.header('cf-connecting-ip') ?? 'x'
const k = `rl:${ip}:${Math.floor(Date.now()/60000)}`
const n = parseInt(await c.env.KV.get(k) ?? '0') + 1
if (n > 60) return c.json({ error: 'terlalu banyak permintaan' }, 429)
await c.env.KV.put(k, String(n), { expirationTtl: 60 })
```

## 5. Audit log (jejak D-1)

Tabel `audit_log` (actor, action, target, ts) untuk operasi sensitif
(hapus data, ubah harga, akses PII). Append-only; jangan timpa.

## 6. Kepatuhan UU PDP Indonesia (WAJIB untuk PII)

UU No. 27/2022 Pelindungan Data Pribadi:
- **Consent eksplisit** sebelum simpan PII (centang, bukan pre-checked).
- **Minimalisasi**: simpan hanya data yang perlu (nama+kontak cukup).
- **Hak hapus**: sediakan jalur hapus data (`DELETE /api/lead/:id`
  dengan verifikasi).
- **Retensi**: tetapkan masa simpan; purge data kedaluwarsa.
- **Tujuan jelas**: cantumkan untuk apa data dipakai di form.
- Jangan kirim PII ke pihak ketiga tanpa dasar hukum + consent.

## 7. Observability ringan (free-tier)

- `console.log` terstruktur (level + konteks) → terlihat di
  `pm2 logs --nostream` (lokal) & Cloudflare logs (production).
- Health endpoint: `GET /api/health` → `{status:"ok", ts}`.
- Metrik bisnis ringan ke D1 (`events`) — bukan APM berbayar.

## 8. Checklist pra-deploy (gate sebelum FASE 5)

```
[ ] Tidak ada secret/token di repo (grep + secret-scan)
[ ] Semua input tervalidasi + query parameterized
[ ] onError global + pesan ramah (no stack leak)
[ ] Rate limit di endpoint publik sensitif
[ ] Consent + hak hapus untuk semua PII (UU PDP)
[ ] /api/health hidup
[ ] .dev.vars & .env di .gitignore
```

## D-1 Truth-Lock: batas platform free-tier

- Workers CPU limit (10ms free / 30ms paid) → JANGAN komputasi berat;
  pindahkan ke query SQL atau tolak desainnya.
- Worker size limit ~10MB → dependency ramping, frontend via CDN.
- Tidak ada WAF/SIEM enterprise di free-tier — hardening ini "best-
  effort layak produksi UMKM", bukan setara SOC2. Laporkan jujur.

## Failure modes

| Gejala | Fix |
|---|---|
| Token kebocor di commit | Rotate key SEGERA + `git` history purge + re-deploy. |
| 429 false positive | Naikkan limit / perbaiki kunci window KV. |
| PII tanpa consent | Tambah validasi server + audit; hapus data non-consent. |
| CPU limit exceeded | Sederhanakan logika / pindah ke SQL agregasi. |

## Out of scope

- Mekanisme deploy/secrets command → `sovereign-cf-byok-deploy`.
- Secret-scan push → `sovereign-github-push`.
- Desain landing/lead → `sovereign-gtm-engineering`.
