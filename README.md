# Groq-Compat Shim for Hermes Studio

## Project Overview
- **Name**: webapp (Groq-Compat Shim)
- **Goal**: Give Hermes Studio (running on a Hugging Face Space) a working
  OpenAI-compatible LLM backend by proxying to **Groq's free API**, while
  satisfying Hermes Studio's startup probe so it enters "portable mode".
- **Why a shim is needed**: Hermes Studio probes its backend with
  `GET /health` (wants 200) and `GET /v1/chat/completions` (wants 405).
  Groq returns 404 for those and has no `/health`, so Hermes never connects.
  This shim answers the probes correctly and forwards real traffic to Groq.

## Architecture
```
Hermes Studio (HF Space)  --HERMES_API_URL-->  This Worker (Cloudflare)  -->  Groq API
                                               (Groq key stays here,
                                                never in the Space/browser)
```

## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Service info (no secrets) |
| GET | `/health` | Liveness probe → `200 {"status":"ok"}` |
| GET | `/v1/chat/completions` | Returns `405` (so the probe registers the endpoint) |
| POST | `/v1/chat/completions` | Forwards to Groq (streaming + non-streaming) |
| GET | `/v1/models` | Forwards to Groq model list |

`/v1/models` and `POST /v1/chat/completions` require
`Authorization: Bearer <PROXY_TOKEN>` **if** `PROXY_TOKEN` is configured.

## Environment Variables (Cloudflare secrets)
| Name | Required | Default | Notes |
|------|----------|---------|-------|
| `GROQ_API_KEY` | ✅ | — | Your Groq key (`gsk_...`) |
| `GROQ_BASE_URL` | ❌ | `https://api.groq.com/openai/v1` | Override upstream |
| `PROXY_TOKEN` | ❌ | (open) | If set, callers must send it as Bearer token |
| `DEFAULT_MODEL` | ❌ | `llama-3.3-70b-versatile` | Used when caller sends `"default"` |

## Local Development
```bash
cd /home/user/webapp
# .dev.vars holds GROQ_API_KEY / PROXY_TOKEN / DEFAULT_MODEL (gitignored)
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000/health
```

## Deployment (Cloudflare Pages)
Requires a Cloudflare API token (entered in the Deploy panel). Then:
```bash
npm run build
npx wrangler pages deploy dist --project-name <project>
# Set secrets:
npx wrangler pages secret put GROQ_API_KEY --project-name <project>
npx wrangler pages secret put PROXY_TOKEN  --project-name <project>
```

## Wiring it into the HF Space
On the HF Space → Settings → Variables and secrets:
- `HERMES_API_URL = https://<your-worker>.pages.dev`
- `HERMES_API_TOKEN = <your PROXY_TOKEN>`
- `HERMES_DEFAULT_MODEL = llama-3.3-70b-versatile`

## Status
- **Worker**: ✅ Built & tested locally (all probes + streaming + non-streaming pass)
- **Cloudflare deploy**: ⏳ Pending user's Cloudflare API token
- **Tech Stack**: Hono + TypeScript on Cloudflare Pages/Workers
- **Last Updated**: 2026-06-15
