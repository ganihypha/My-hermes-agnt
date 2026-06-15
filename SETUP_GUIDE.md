# 📱 Hermes Studio + Groq — Full Setup & Daily Usage Guide (Phone-Only)

This guide gets you a working **AI chat agent** (Hermes Studio UI) running in the
cloud, powered by **Groq's free LLMs**, usable entirely from an **Android phone
browser** — no PC, no Termux, no app install required.

---

## 🧩 How the pieces fit together

```
  Your phone browser
        │
        ▼
  Hermes Studio UI   ───►  Cloudflare Worker  ───►  Groq API
  (Hugging Face Space)     (Groq-compat shim)       (free LLMs)
   My-hrms-agnt            webapp / pages.dev        llama-3.3-70b
```

- **Hermes Studio (HF Space)** = the chat website you open on your phone.
- **Cloudflare Worker (the shim)** = a tiny translator so Hermes can talk to Groq.
  It also hides your Groq key (it lives on Cloudflare, never in the browser).
- **Groq** = the actual AI brain (free, fast llama models).

> **Why the shim?** Hermes Studio checks its backend with `GET /health` and
> `GET /v1/chat/completions` before connecting. Groq answers those with 404, so
> Hermes refuses to connect. The shim answers them correctly, then forwards your
> messages to Groq. Without it, the UI shows the "no backend / not connected" error.

---

## ✅ What's already done for you

| Component | Status |
|-----------|--------|
| Clean HF Space `elmatador0197/My-hrms-agnt` | ✅ Created + Dockerfile pushed (building/running) |
| Groq-compat shim Worker (code) | ✅ Built & tested (`/home/user/webapp`, pushed to GitHub) |
| GitHub repo `ganihypha/My-hermes-agnt` | ✅ Code pushed |
| Cloudflare deploy of the shim | ⏳ **Needs your Cloudflare API token** (one step left) |
| Wiring HF Space → shim (3 env vars) | ⏳ After the Worker is deployed |

> ⚠️ The old Space `My-hermes-agent` was **paused by Hugging Face ("flagged as
> abusive")** and can't be un-paused via API. That's why we use the **fresh
> clean Space `My-hrms-agnt`** instead.

---

## 🔑 STEP 1 — Deploy the Groq shim to Cloudflare (one-time, ~3 min)

You need a **Cloudflare API token** (free Cloudflare account). On your phone:

### 1a. Get a Cloudflare API token
1. Open **dash.cloudflare.com** → sign in (create a free account if needed).
2. Tap your profile (top-right) → **My Profile** → **API Tokens**.
3. **Create Token** → use template **"Edit Cloudflare Workers"** → Continue → Create.
4. **Copy** the token (starts with a long random string). Keep it safe.

### 1b. Give the token to this assistant
Paste your Cloudflare token into the **Deploy panel** of this app (or just paste
it in chat and say "deploy"). I will then:
- Deploy the Worker to `https://<project>.pages.dev`
- Set the secrets on Cloudflare:
  - `GROQ_API_KEY` = your Groq key (already provided)
  - `PROXY_TOKEN` = a private password protecting your shim
  - `DEFAULT_MODEL` = `llama-3.3-70b-versatile`
- Give you back the final **Worker URL** + the **PROXY_TOKEN**.

> 💡 You only ever do Step 1 **once**.

---

## 🔌 STEP 2 — Connect the Space to the shim (one-time, ~2 min, phone browser)

Once you have the **Worker URL** and **PROXY_TOKEN** from Step 1:

1. On your phone, open:
   **huggingface.co/spaces/elmatador0197/My-hrms-agnt/settings**
2. Scroll to **"Variables and secrets"**.
3. Add these **3** entries (tap *New variable* / *New secret*):

   | Type | Name | Value |
   |------|------|-------|
   | Variable | `HERMES_API_URL` | `https://<your-worker>.pages.dev` |
   | **Secret** | `HERMES_API_TOKEN` | `<your PROXY_TOKEN>` |
   | Variable | `HERMES_DEFAULT_MODEL` | `llama-3.3-70b-versatile` |

4. The Space restarts automatically. Wait ~1 min.

> If you'd rather not use a Worker at all, you can technically put the Groq key
> directly in the Space — but then the key is exposed in the Space env and Groq's
> probe-incompatibility still needs the shim. **The shim is the clean, secure way.**

---

## 💬 STEP 3 — Daily usage (just a browser, every day)

1. On your phone, open:
   **https://elmatador0197-my-hrms-agnt.hf.space**
2. It loads Hermes Studio and redirects to **/chat/new**.
3. Type your message and send. The reply streams in from Groq. 🎉
4. **Add it to your home screen** for an app-like experience:
   - Chrome (Android): menu **⋮** → **Add to Home screen**.
   - Now it opens fullscreen like a normal app.

### Switching models
In the chat UI's model selector (or by changing `HERMES_DEFAULT_MODEL`), you can use any Groq model, e.g.:
- `llama-3.3-70b-versatile` (smart, default)
- `llama-3.1-8b-instant` (very fast)
- `openai/gpt-oss-120b` / `openai/gpt-oss-20b`
- `qwen/qwen3-32b`

---

## 😴 About "Space paused / sleeping"
Free HF Spaces **sleep after ~48h of inactivity**. When you open the URL again it
**wakes up automatically** (takes ~30–60s the first time). This is normal — it is
NOT the "flagged abusive" pause. Just wait for it to load.

To reduce sleeping, you can (optional) set the Space to a paid "always-on" tier,
but the free tier is fine for daily personal use.

---

## 🛠️ Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| UI loads but "not connected / no backend" | Env vars not set / Worker down | Re-check Step 2 values; open the Worker URL `/health` → should say `{"status":"ok"}` |
| "Unauthorized" in chat | `HERMES_API_TOKEN` ≠ Worker `PROXY_TOKEN` | Make them match exactly |
| Space shows build error | Dockerfile/build issue | Check **Space → Logs → Build** |
| Space won't open at all | Sleeping | Wait 30–60s for wake-up |
| Slow first message | Cold start | Normal; subsequent messages are fast |

---

## 🔐 Security reminders
- Your **Groq key** stays on Cloudflare (never in the Space or browser). Good.
- The **`PROXY_TOKEN`** is what protects your shim from strangers — keep it private.
- ⚠️ The **HF and Groq tokens in your uploaded files are now visible in chat.**
  Once everything works, **rotate/revoke them**:
  - HF tokens: https://huggingface.co/settings/tokens
  - Groq key: https://console.groq.com/keys

---

## 📍 Quick links
- **Chat (daily use)**: https://elmatador0197-my-hrms-agnt.hf.space
- **Space settings**: https://huggingface.co/spaces/elmatador0197/My-hrms-agnt/settings
- **Shim source (GitHub)**: https://github.com/ganihypha/My-hermes-agnt
- **Groq console**: https://console.groq.com
- **Cloudflare dashboard**: https://dash.cloudflare.com
