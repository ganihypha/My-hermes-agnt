---
name: sovereign-gtm-engineering
version: 1.0.0
description: >-
  SparkMind Sovereign GTM-ENGINEERING — pola "go-to-market engineering"
  ala Anthropic (how Anthropic uses Claude for GTM): bangun aset GTM
  yang dapat di-deploy untuk sub-brand SparkMind (landing page konversi,
  waitlist/lead capture ke D1/KV, pricing page, copy id-ID, analytics
  ringan, SEO/OG meta) — semua di stack Hono + Cloudflare Pages, free-
  tier, tanpa tool pihak ketiga berbayar. Untuk 64 juta UMKM Indonesia.
  Trigger: "gtm", "go to market", "landing page", "waitlist", "lead
  capture", "pricing page", "konversi", "funnel", "copywriting", "seo".
metadata:
  category: growth
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  source_inspiration: "Anthropic — how Anthropic uses Claude (GTM engineering)"
  pairs_with:
    - sovereign-fullstack-cycle     # GTM page = project fullstack
    - sovereign-cf-byok-deploy      # deploy landing ke production
    - sovereign-enterprise-patterns # compliance/consent untuk lead data
  requires:
    bins: ["node", "npm", "npx", "wrangler", "curl"]
    tools: ["meta_info"]
---

# sovereign-gtm-engineering

GTM sebagai engineering, bukan slide. Tiap sub-brand SparkMind
(BarberKas / KuratorKas / MomentKas / PaceLokal / Nurani) butuh aset
go-to-market yang DI-DEPLOY (bukan mockup). Skill ini standarkan
pembuatannya di stack free-tier.

## Constraint (embed — non-negotiable)

- Rp 0/bulan: ZERO SaaS GTM berbayar (no Mailchimp/HubSpot/Typeform).
  Lead capture → **Cloudflare D1/KV** sendiri.
- Stack: Hono + CF Pages + Tailwind/FontAwesome CDN. Bahasa UI **id-ID**.
- Target: UMKM Indonesia → copy konkret, anti-jargon, mobile-first
  (mayoritas HP Android).
- Consent/PII lead = ikut `sovereign-enterprise-patterns` (UU PDP).

## Aset GTM standar (per sub-brand)

| Aset | Isi | Storage |
|---|---|---|
| Hero / value prop | 1 kalimat masalah + solusi + CTA | — (HTML) |
| Waitlist / lead form | nama, WhatsApp/email, jenis usaha | D1 `leads` / KV |
| Pricing | tier + harga Rp + fitur (jujur, no dark pattern) | — (HTML) |
| Social proof | testimoni/logo (HANYA yang asli — D-1) | — |
| SEO/OG meta | title, description, og:image, lang=id | `<head>` |
| Analytics ringan | hit counter / event ke D1 (no GA berbayar) | D1 `events` |

## Lead capture (pola D1 — copy-ready)

Migrasi:
```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  kontak TEXT NOT NULL,            -- WhatsApp/email
  jenis_usaha TEXT,
  sub_brand TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0,  -- UU PDP: persetujuan eksplisit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leads_brand ON leads(sub_brand);
```
Route Hono:
```typescript
app.post('/api/lead', async (c) => {
  const { nama, kontak, jenis_usaha, sub_brand, consent } = await c.req.json()
  if (!nama || !kontak || !consent) return c.json({ error: 'data/consent wajib' }, 400)
  await c.env.DB.prepare(
    `INSERT INTO leads (nama,kontak,jenis_usaha,sub_brand,consent) VALUES (?,?,?,?,?)`
  ).bind(nama, kontak, jenis_usaha ?? '', sub_brand, consent ? 1 : 0).run()
  return c.json({ ok: true })
})
```
Checkbox consent WAJIB (UU PDP) — tanpa centang, tolak 400.

## Copywriting (doktrin SparkMind id-ID)

- Bahasa: Indonesia, langsung, untuk pemilik UMKM (bukan korporat).
- Struktur hero: **Masalah → Janji → Bukti → CTA tunggal**.
- CTA spesifik: "Daftar Waitlist Gratis", bukan "Submit".
- D-1 honest: JANGAN klaim fitur/angka yang belum ada. No fake urgency
  palsu (countdown bohong), no testimoni fiktif.

## SEO / OG meta (wajib di tiap landing)

```html
<html lang="id">
<title><Brand> — <value prop 1 baris></title>
<meta name="description" content="<≤155 char, id-ID, kata kunci UMKM>">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="/static/og.png">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## Analytics free-tier (no GA berbayar)

Event ringan ke D1 (`events`: brand, event, ts) untuk hitung
view/CTR/konversi. Dashboard internal sederhana via route admin +
agregasi SQL. Cukup untuk validasi funnel tanpa biaya.

## Alur eksekusi (komposisi)

1. Landing = project fullstack → jalankan `sovereign-fullstack-cycle`.
2. Lead/PII → patuhi `sovereign-enterprise-patterns` (consent, retensi).
3. Deploy production → `sovereign-cf-byok-deploy`; simpan nama project
   via `meta_info`.

## D-1 Truth-Lock

- Konversi nyata butuh traffic nyata — skill ini bangun ASET, bukan
  jaminan growth. Laporkan jujur: aset siap, hasil tergantung distribusi.
- Tanpa email service berbayar, follow-up lead = manual / WhatsApp.
  Jangan janjikan email otomatis kalau belum dibangun.

## Failure modes

| Gejala | Fix |
|---|---|
| Form submit gagal | Cek route `/api/lead` + binding D1 (workflow-ops). |
| Lead tanpa consent masuk | Validasi server-side wajib (400). |
| Copy generik/korporat | Tulis ulang dgn masalah UMKM konkret. |

## Out of scope

- Iklan berbayar / channel distribusi → di luar sandbox (manual user).
- Email automation berbayar → tidak ada di free-tier.
- Build/deploy mekanis → skill fullstack-cycle / cf-byok-deploy.
