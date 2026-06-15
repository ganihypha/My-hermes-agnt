# Hermes Chat — Groq-powered Cloudflare Worker (UI + API)

A single Cloudflare Worker that is **both** the chat frontend **and** an
OpenAI-compatible backend for Groq. No Hugging Face, no separate server, no PC —
just one URL that works on a phone browser.

## Project Overview
- **Name**: webapp (Hermes Chat shim)
- **Goal**: A self-contained, phone-friendly AI chat that runs 100% on Cloudflare's edge, using your Groq API key (kept server-side).
- **Why**: The original Hermes Studio Hugging Face Spaces kept getting auto-flagged "abusive" by HF. This Worker removes the dependency on Hugging Face entirely.

## Features (completed)
- ✅ Built-in streaming chat UI at `GET /chat` (Tailwind + vanilla JS, mobile-first, dark theme)
- ✅ OpenAI-compatible API: `POST /v1/chat/completions` (streaming + non-streaming)
- ✅ `GET /v1/models` (forwarded to Groq)
- ✅ Groq API key stays server-side (never in the browser)
- ✅ Optional access protection via `PROXY_TOKEN`
- ✅ Default-model fallback (`llama-3.3-70b-versatile`)
- ✅ Probe compatibility for Hermes Studio (`GET /health`=200, `GET /v1/chat/completions`=405) — so it ALSO works as a backend for a Hermes Studio frontend if you ever want that

## 🔱 God Mode V2 (NEW — edge-native agent upgrade)
Per canonical `03-ARCHITECTURE` + `00-SSOT` (D-1 Truth-Lock). All real, legal, 100% Cloudflare-deployable. **No** captcha-bypass, **no** TLS-spoof, **no** YOLO auto-actions.

- ✅ **Persistent memory across sessions** (Workers KV `HERMES_MEM`) — save / list / recall / delete
- ✅ **Auto-recall**: before each chat, relevant past memories (keyword match) are injected as system context so the agent "remembers"
- ✅ **Web tool**: `POST /api/tools/crawl` → Cloudflare Browser Run → clean markdown → Workers AI summarize/answer (honors robots/ToS)
- ✅ **Free Workers AI fallback**: send `"model":"@cf/meta/llama-3.1-8b-instruct"` → routes to edge LLM (no key, no Groq quota burn)
- ✅ **Honest status probe**: `GET /api/status` reports which capabilities are actually wired
- 🔭 Backlog: Vectorize semantic recall (F5), Browser binding Puppeteer fallback (F6)

## Functional entry points (URIs)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | JSON info page (no secrets) | none |
| GET | `/chat` | **The chat web app** — open this in your browser/phone | none (UI) |
| GET | `/health` | Liveness probe → 200 | none |
| GET | `/favicon.ico` | Inline SVG icon | none |
| GET | `/v1/models` | List Groq chat models | `PROXY_TOKEN` if set |
| GET | `/v1/chat/completions` | Returns 405 (probe) | none |
| POST | `/v1/chat/completions` | Chat completion (Groq or `@cf/*` Workers AI) + memory recall | `PROXY_TOKEN` if set |
| GET | `/api/status` | Honest capability report (memory/ai/crawl/groq) | none |
| GET | `/api/memory` | List saved memories (newest first) | `PROXY_TOKEN` if set |
| POST | `/api/memory` | Save a memory `{text, tags?}` (HITL) | `PROXY_TOKEN` if set |
| GET | `/api/memory/recall?q=` | Keyword recall topK | `PROXY_TOKEN` if set |
| DELETE | `/api/memory/:id` | Delete a memory by id | `PROXY_TOKEN` if set |
| POST | `/api/tools/crawl` | Crawl `{url, question?, summarize?, includeRaw?}` → summary | `PROXY_TOKEN` if set |

Request body for `POST /v1/chat/completions` (standard OpenAI shape):
```json
{ "model": "default", "messages": [{"role":"user","content":"Hi"}], "stream": true }
```
`"model": "default"` is rewritten to `DEFAULT_MODEL`.

## Data Architecture (God Mode V2)
- **Storage services**: **Cloudflare Workers KV** (`HERMES_MEM`) for persistent agent memory across sessions. Chat history still lives in the browser tab; settings in `localStorage`.
- **Memory model** (KV entry): `{ id:"mem:<ts>:<rand>", text, tags[], ts, user }`.
- **Data flow**: Browser `/chat` → `POST /v1/chat/completions` → [recall relevant KV memories → prepend as system context] → route to Groq **or** `@cf/*` Workers AI → response. Web tool: `/api/tools/crawl` → Browser Run REST → markdown → Workers AI summarize.

### Extra env (God Mode V2)
| Var | Required | Notes |
|-----|----------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | for crawl tool | account id for Browser Run REST |
| `CF_BROWSER_TOKEN` | for crawl tool | token with Browser Rendering perms |

Bindings (in `wrangler.jsonc`): KV `HERMES_MEM`, AI `AI` (re-enabled at deploy).

## Environment variables (Cloudflare secrets)
| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `GROQ_API_KEY` | ✅ | — | Your `gsk_...` key |
| `PROXY_TOKEN` | optional | — | If set, callers must send `Authorization: Bearer <PROXY_TOKEN>` |
| `DEFAULT_MODEL` | optional | `llama-3.3-70b-versatile` | Model used when none/`default` is sent |
| `GROQ_BASE_URL` | optional | `https://api.groq.com/openai/v1` | Override upstream |

Local dev uses `.dev.vars` (gitignored). Production uses `wrangler pages secret put`.

## User Guide
1. Open the deployed URL + `/chat` (e.g. `https://your-worker.pages.dev/chat`).
2. If you set a `PROXY_TOKEN`, tap the gear ⚙️ → paste the token → Save.
3. Type a message and send. Replies stream in live. Works on phone.
See `SETUP_GUIDE.md` for the full phone-only deploy + usage walkthrough.

## Deployment
- **Platform**: Cloudflare Pages / Workers (edge, BYOK)
- **Status**: ✅ **LIVE — God Mode V3 fully wired in production**
- **Production URL**: https://my-hermes-agnt.pages.dev
- **Chat UI**: https://my-hermes-agnt.pages.dev/chat
- **Memory dashboard**: https://my-hermes-agnt.pages.dev/memory
- **Access token** (PROXY_TOKEN): paste in the ⚙️ Settings on first use
- **Tech Stack**: Hono + TypeScript (Vite build)
- **CF account**: ganihypha@gmail.com (deployed via `sovereign-cf-byok-deploy` skill)
- **GitHub**: https://github.com/ganihypha/My-hermes-agnt (pushed via `sovereign-github-push` skill)
- **Worker**: ✅ Built & tested (UI + streaming + non-streaming + probes all pass in production)
- **God Mode V3**: ✅ LIVE — `/api/status` (prod) reports `memory_kv:true, semantic_recall:true, workers_ai:true, web_crawl_rest:true, agent_tool_loop:true, groq:true, protected:true`
- **Bindings (prod)**: KV `HERMES_MEM` (`8a114a83...`), Vectorize `hermes-memory-index` (1024d cosine), Workers AI `AI`
- **Secrets (prod)**: `PROXY_TOKEN`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `DEFAULT_MODEL`, `CLOUDFLARE_ACCOUNT_ID`, `CF_BROWSER_TOKEN` (all set via `wrangler pages secret put`)
- **Verified 2026-06-15**: live Groq chat → "ALIVE"; chat UI 200; auth gate 401 without token
- **Last Updated**: 2026-06-15 (God Mode V3 — production deploy + GitHub push via sovereign skills)

## Not yet done / next steps
- ⏳ Deploy to Cloudflare (requires your CF API token).
- 🔁 Optional: add markdown rendering & code-copy buttons in the chat UI.
- 🔁 Optional: model picker dropdown populated from `/v1/models`.
