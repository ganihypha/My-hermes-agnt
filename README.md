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

## Functional entry points (URIs)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | JSON info page (no secrets) | none |
| GET | `/chat` | **The chat web app** — open this in your browser/phone | none (UI) |
| GET | `/health` | Liveness probe → 200 | none |
| GET | `/favicon.ico` | Inline SVG icon | none |
| GET | `/v1/models` | List Groq chat models | `PROXY_TOKEN` if set |
| GET | `/v1/chat/completions` | Returns 405 (probe) | none |
| POST | `/v1/chat/completions` | Chat completion, forwards to Groq | `PROXY_TOKEN` if set |

Request body for `POST /v1/chat/completions` (standard OpenAI shape):
```json
{ "model": "default", "messages": [{"role":"user","content":"Hi"}], "stream": true }
```
`"model": "default"` is rewritten to `DEFAULT_MODEL`.

## Data Architecture
- **Storage services**: None. Stateless edge Worker. Chat history lives only in the browser tab (in memory); user settings (token/model/system prompt) are stored in browser `localStorage`.
- **Data flow**: Browser `/chat` → `POST /v1/chat/completions` (this Worker) → Groq API → streamed back to the browser.

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
- **Platform**: Cloudflare Pages / Workers
- **Status**: ✅ **LIVE**
- **Production URL**: https://my-hermes-agnt.pages.dev
- **Chat UI**: https://my-hermes-agnt.pages.dev/chat
- **Access token** (PROXY_TOKEN): `hermes-2026-secure-token` — paste in the ⚙️ Settings on first use
- **Tech Stack**: Hono + TypeScript (Vite build)
- **CF account**: ganihypha@gmail.com (deployed via cf-byok)
- **GitHub**: https://github.com/ganihypha/My-hermes-agnt
- **Worker**: ✅ Built & tested (UI + streaming + non-streaming + probes all pass in production)
- **Last Updated**: 2026-06-15

## Not yet done / next steps
- ⏳ Deploy to Cloudflare (requires your CF API token).
- 🔁 Optional: add markdown rendering & code-copy buttons in the chat UI.
- 🔁 Optional: model picker dropdown populated from `/v1/models`.
