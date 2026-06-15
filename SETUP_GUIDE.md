# Hermes Chat — Full Setup & Usage Guide (Phone / Browser only)

This guide gets you a working AI chat at **one Cloudflare URL**, with **no PC, no
Hugging Face, no Tailscale** required. Everything below can be done from a phone
browser.

---

## 0) Why this design (read this first)

Your two Hugging Face Spaces (`My-hermes-agent` and the clean `My-hrms-agnt`)
were **both auto-flagged "abusive" by Hugging Face** and paused. The build was
fine — HF's automated classifier flags **Hermes Studio** because it is an
*agent / terminal* style app. A flagged Space can only be un-flagged by HF
support; there is no code fix.

**So we stopped depending on Hugging Face.** This Worker contains its **own chat
UI** (`/chat`) plus the Groq backend in one place. Cloudflare does not flag a
simple chat proxy, so this is stable and fully phone-usable.

```
  Phone browser ──▶  https://your-worker.pages.dev/chat   (UI, served by Worker)
                          │  POST /v1/chat/completions
                          ▼
                     Cloudflare Worker  (holds GROQ_API_KEY)
                          │
                          ▼
                     Groq API  (llama-3.3-70b-versatile)
```

---

## 1) What you need
- A **Cloudflare account** (free) → https://dash.cloudflare.com
- A **Cloudflare API token** (created in the dashboard, on your phone)
- Your **Groq API key** (you already have it): `gsk_...`
- (You do **not** need Hugging Face anymore.)

---

## 2) Create a Cloudflare API token (on your phone)
1. Open `https://dash.cloudflare.com/profile/api-tokens`
2. **Create Token → "Edit Cloudflare Workers"** template (or Custom with
   `Account: Cloudflare Pages: Edit`).
3. Create and **copy** the token.
4. In **this Genspark interface → the Deploy panel / Cloudflare tab**, paste that
   token. (The assistant cannot deploy without it — HF tokens don't work for CF.)

---

## 3) Deploy the Worker (assistant does this once you add the token)
With the token in the Deploy panel, the assistant runs the `cf-byok-deploy` flow:
```bash
# (run by the assistant)
npm run build
npx wrangler pages project create <project-name> --production-branch main
npx wrangler pages deploy dist --project-name <project-name>
```
Then it sets your secrets (never committed to git):
```bash
npx wrangler pages secret put GROQ_API_KEY     --project-name <project-name>
npx wrangler pages secret put PROXY_TOKEN       --project-name <project-name>   # optional but recommended
npx wrangler pages secret put DEFAULT_MODEL     --project-name <project-name>   # optional
```
You'll get a URL like `https://<project-name>.pages.dev`.

---

## 4) Use it (daily, from your phone)
1. Open `https://<project-name>.pages.dev/chat`
2. Tap the **gear ⚙️** (top-right):
   - If you set a `PROXY_TOKEN`, paste it in **Access token** → **Save**.
   - Optionally change **Model** or add a **System prompt**.
   - Tap **Test connection** → should say "Connection OK ✓".
3. Type a message → **send** (paper-plane). Replies **stream live**.
4. **Add to Home Screen** (browser menu) to use it like a native app.

Tips:
- **Clear chat** button (in ⚙️) resets the conversation.
- History is kept only in the open tab; settings are saved in the browser.

---

## 5) Recommended Groq models
Set in the ⚙️ Model field or via `DEFAULT_MODEL`:
- `llama-3.3-70b-versatile` (default, best general)
- `llama-3.1-8b-instant` (fastest, cheapest)
- `openai/gpt-oss-120b` / `openai/gpt-oss-20b` (if available on your account)

Check what your key supports any time: open `/v1/models` (with your token).

---

## 6) Optional: also drive a Hermes Studio frontend
This Worker still satisfies Hermes Studio's probes (`/health`=200,
`GET /v1/chat/completions`=405). If you ever run a Hermes Studio UI somewhere
that does **not** get flagged (your own VPS, Render, Railway, Fly.io, etc.), set:
```
HERMES_API_URL = https://<project-name>.pages.dev
HERMES_API_KEY = <your PROXY_TOKEN>
HERMES_MODEL   = llama-3.3-70b-versatile
```
But for phone-only use, you don't need it — `/chat` is enough.

---

## 7) Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Chat says `Error 401` | Wrong/missing PROXY_TOKEN | ⚙️ → paste token → Save |
| `Test connection` fails | Worker not deployed / wrong URL | Re-check the `.pages.dev` URL |
| Empty replies | Groq key invalid/expired | Rotate key, re-set `GROQ_API_KEY` secret |
| HF Space still paused | Flagged by HF (not fixable by us) | Ignore it — use `/chat` instead |

---

## 8) Security reminder ⚠️
The tokens in your uploaded files (HF `hf_...` and Groq `gsk_...`) are now visible
in chat history. **Rotate them after setup**:
- Groq: https://console.groq.com/keys
- Hugging Face: https://huggingface.co/settings/tokens

The Worker keeps your Groq key server-side, but anything pasted in chat should be
considered exposed.
