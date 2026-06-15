# 🏗️ 03 — ARCHITECTURE

> Canonical · turunan dari `00-SSOT` & `02-PRD` · v1.1 · 2026-06-15

---

## 1. High-level diagram

```
                         ┌──────────────────────────────┐
        HP / Browser ───►│  Cloudflare Pages (Hono app)  │
        (PROXY_TOKEN)    │  - /chat  /memory  UI         │
                         │  - /v1/* OpenAI-compat proxy  │
                         │  - /api/* tools & memory       │
                         └───────────────┬───────────────┘
                                         │ (server-side, keys as secrets)
            ┌────────────────────────────┼─────────────────────────────┐
            ▼                            ▼                              ▼
   ┌─────────────────┐        ┌────────────────────┐         ┌───────────────────┐
   │  LLM PROVIDERS  │        │   AGENT MEMORY     │         │   WEB TOOLS        │
   │  - Groq (fast)  │        │  - KV (raw facts)  │         │  - Browser         │
   │  - Workers AI   │        │  - Vectorize       │         │    Rendering       │
   │    (free LLM +  │◄──────►│    (semantic)      │◄───────►│  - Workers AI      │
   │    embeddings)  │ embed  │  - (opt) Agent Mem │ summarize│    summarize HTML │
   └─────────────────┘        └────────────────────┘         └───────────────────┘
```

Semua kotak = **Cloudflare-native** (kecuali Groq = REST eksternal). Tidak ada server
long-running, tidak ada filesystem runtime. 100% deploy-able ke CF Pages.

## 2. Tech stack

| Layer | Pilihan | Alasan |
|-------|---------|--------|
| Runtime | Cloudflare Pages + Workers (edge) | Gratis, global, serverless |
| Web framework | **Hono** + JSX renderer | Ringan, native CF Workers |
| Build | Vite (`@hono/vite-build`) | Sudah ter-scaffold |
| Frontend | HTML + Tailwind (CDN) + vanilla JS | Zero build untuk UI, mobile-first |
| LLM (default) | **Groq** `llama-3.3-70b-versatile` (OpenAI-compat) | Cepat, free tier, sesuai live |
| LLM (fallback/free) | **Workers AI** `@cf/meta/llama-3.x` | Gratis di edge, no key bocor |
| Embeddings | Workers AI `@cf/baai/bge-*` | Untuk Vectorize recall |
| Memory (raw) | **Workers KV** | Key-value fakta/ingatan |
| Memory (semantic) | **Vectorize** | topK recall relevan |
| Web tool (default) | **Browser Run REST `/crawl`** | `…/browser-rendering/crawl` → markdown bersih via AI internal CF; tanpa nulis Puppeteer (hemat CPU edge) |
| Web tool (fallback) | **Browser Rendering binding (Puppeteer)** | Halaman JS berat / butuh interaksi (`@cloudflare/puppeteer`) |
| Skill storage (backlog) | **Cloudflare Artifacts** (Git-for-Agents, beta) | Simpan/versi skill dinamis agent — backlog, bukan v1 |
| Secrets | `wrangler pages secret put` / `.dev.vars` | BYOK aman |

## 3. Bindings (wrangler.jsonc)

```jsonc
{
  "name": "my-hermes-agnt",
  "compatibility_date": "2026-06-05",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",

  "ai": { "binding": "AI" },                      // Workers AI (LLM + embeddings)
  "kv_namespaces": [
    { "binding": "HERMES_MEM", "id": "<kv-id>" }  // raw memory
  ],
  "vectorize": [
    { "binding": "HERMES_VEC", "index_name": "hermes-memory-index" } // semantic
  ],
  "browser": { "binding": "BROWSER" }             // Browser Rendering (tool)
}
```
Secrets (bukan di wrangler.jsonc): `PROXY_TOKEN`, `GROQ_API_KEY`,
`CLOUDFLARE_ACCOUNT_ID` + `CF_BROWSER_TOKEN` (untuk Browser Run REST `/crawl`).

## 4. Request flows

### 4.1 Chat completion (stream)
```
Browser POST /v1/chat/completions  (Bearer PROXY_TOKEN, {messages, model, stream})
  → Worker verifies token
  → [optional] semantic recall: embed last user msg → Vectorize query topK
       → prepend relevant memories as system context
  → route by model: groq* → Groq REST | @cf/* → Workers AI
  → stream SSE back to browser
```

### 4.2 Memory write
```
POST /api/memory  {text, tags}
  → KV.put(uuid, json)
  → embed(text) via Workers AI bge
  → Vectorize.insert([{id, values, metadata:{text,tags}}])
```

### 4.3 Web tool (crawl + summarize)
```
POST /api/tools/crawl  {url, question?}
  → DEFAULT: POST …/accounts/{ACCOUNT_ID}/browser-rendering/crawl
            {url, format:"markdown"}  (Authorization: Bearer CF_BROWSER_TOKEN)
            → markdown bersih (AI internal CF strip nav/ads)
  → FALLBACK (markdown kosong / JS berat): BROWSER binding (Puppeteer) render → text
  → Workers AI llama summarize (answer question, ringkas)
  → return {summary, sourceUrl, raw?}  (+ offer to save to memory = HITL)
```

### 4.4 Agent tool-loop dengan self-healing (F7)
```
user msg → LLM with tool schema [recall_memory, crawl_web, save_memory]
  → if tool_call: execute server-side
       → on tool error/blocked: RETRY terbatas (max 2-3, pola LangGraph state machine):
            coba fallback (REST→Puppeteer), lalu menyerah JUJUR ("tidak bisa akses X")
       → on success: feed result back → LLM final answer
  → HITL: aksi berisiko (save / external / kirim) WAJIB konfirmasi user (no YOLO)
```
> Catatan: "self-healing loop" di file referensi V3/V4 (LangGraph + CrewAI) = pola bagus,
> tapi di edge kita implement **versi ringan & terbatas** (retry counter, bukan swarm
> multi-Worker global). Swarm penuh = jalur eksternal HF Spaces (lihat `06-EXTERNAL`).

## 5. Data model

**KV entry** (`HERMES_MEM`):
```json
{ "id":"uuid", "text":"fakta...", "tags":["brand"], "ts": 1699999999, "user":"reza" }
```
**Vectorize record** (`HERMES_VEC`): `id` (= KV id), `values` (bge vector ~1024d),
`metadata`: `{ text, tags, ts }`.

## 6. Security model

1. Semua `/v1/*` & `/api/*` butuh `Authorization: Bearer <PROXY_TOKEN>`.
2. Provider keys (Groq) **hanya** di server (secret). Frontend tidak pernah lihat.
3. CORS: `/v1/*` & `/api/*` dibatasi origin sendiri (atau `*` hanya untuk dev).
4. Browser Rendering hanya untuk URL yang user beri; hormati robots/ToS.
5. Tidak ada captcha-bypass / fingerprint-spoofing ilegal (D-1 Truth-Lock).
6. Vault `SECRETS.local.md` gitignored; rotasi key sebelum publik.

## 7. Deployment

- **Lokal**: `npm run build` → `pm2 start ecosystem.config.cjs` (wrangler pages dev :3000).
- **Prod**: skill **`cf-byok-deploy`** → `wrangler pages deploy dist --project-name my-hermes-agnt`.
- **DB/bindings**: buat KV (`wrangler kv namespace create HERMES_MEM`) & Vectorize
  (`wrangler vectorize create hermes-memory-index --dimensions=1024 --metric=cosine`)
  sebelum deploy fitur F4/F5.
- **Secrets prod**: `wrangler pages secret put PROXY_TOKEN` & `GROQ_API_KEY`.

## 8. Eksternal (di luar CF — lihat `06-EXTERNAL-INTEGRATIONS.md`)

Jika kelak butuh Python Hermes-3 / CrewAI / LangGraph / n8n: host di **HF Spaces (Docker)**
atau VM, expose REST, lalu Worker memanggilnya sebagai tool (1 binding fetch). **Tidak**
dijadikan dependency CF Pages — agent edge tetap berfungsi penuh tanpa eksternal. Detail
arsitektur eksternal (Dockerfile, keep-alive cron, batas free tier) ada di dok 06.

---
*Konsisten dengan PRD §5. Update bila binding/flow berubah.*
