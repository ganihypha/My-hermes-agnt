/**
 * ============================================================================
 * Groq-Compat Shim for Hermes Studio  (Cloudflare Pages / Worker)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Hermes Studio (https://github.com/JPeetz/Hermes-Studio) can run in "portable
 * mode" against any OpenAI-compatible backend. On startup it PROBES the backend
 * pointed to by HERMES_API_URL:
 *
 *   GET  {base}/health               -> expects 200          (liveness)
 *   GET  {base}/v1/chat/completions  -> expects 405          ("exists but wrong verb")
 *   GET  {base}/v1/models            -> expects 200          (model list)
 *
 * It enters "portable" mode if chatCompletions OR health probe succeeds.
 *
 * Pointing HERMES_API_URL straight at Groq does NOT work, because Groq returns
 * 404 (not 405) for `GET /v1/chat/completions` and has no `/health`. So the
 * probe fails and Hermes stays "disconnected".
 *
 * This Worker is a thin compatibility shim that:
 *   - GET  /health               -> 200  (satisfies liveness probe)
 *   - GET  /v1/chat/completions  -> 405  (satisfies "endpoint exists" probe)
 *   - POST /v1/chat/completions  -> forwards to Groq (streaming + non-stream),
 *                                   injecting the Groq key server-side
 *   - GET  /v1/models            -> forwards to Groq (filtered to chat models)
 *
 * The Groq API key stays on Cloudflare (never in the HF Space env, never in the
 * browser). Optionally protect the shim with PROXY_TOKEN so only your Space can
 * use it.
 *
 * ENV (Cloudflare secrets / vars):
 *   GROQ_API_KEY   (required)  your Groq key (gsk_...)
 *   GROQ_BASE_URL  (optional)  default https://api.groq.com/openai/v1
 *   PROXY_TOKEN    (optional)  if set, callers must send Authorization: Bearer <PROXY_TOKEN>
 *   DEFAULT_MODEL  (optional)  default llama-3.3-70b-versatile
 * ============================================================================
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { chatPage } from './chat-ui'
import {
  type AgentBindings,
  saveMemory,
  listMemories,
  deleteMemory,
  recallMemories,
  crawlUrl,
  summarizeWithWorkersAI,
} from './agent'

type Bindings = AgentBindings

const app = new Hono<{ Bindings: Bindings }>()

// Allow the Hermes Studio frontend (and probes) to call from any origin.
app.use('*', cors())

const GROQ_DEFAULT_BASE = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

function groqBase(env: Bindings): string {
  return (env.GROQ_BASE_URL || GROQ_DEFAULT_BASE).replace(/\/+$/, '')
}

/**
 * Optional access control. If PROXY_TOKEN is configured, every protected route
 * requires `Authorization: Bearer <PROXY_TOKEN>`. If PROXY_TOKEN is empty/unset,
 * the shim is open (relies on Cloudflare obscurity + the Groq key staying server-side).
 */
function checkAuth(c: { req: { header: (k: string) => string | undefined }; env: Bindings }): boolean {
  const required = c.env.PROXY_TOKEN
  if (!required) return true // open mode
  const auth = c.req.header('Authorization') || c.req.header('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token === required
}

// ---------------------------------------------------------------------------
// Liveness / probe endpoints
// ---------------------------------------------------------------------------

// Root: friendly info page (no secrets).
app.get('/', (c) => {
  return c.json({
    service: 'groq-compat-shim',
    description: 'OpenAI-compatible Groq proxy for Hermes Studio portable mode',
    endpoints: {
      chat_ui: 'GET /chat   (open this in your browser/phone)',
      health: 'GET /health',
      models: 'GET /v1/models',
      chat: 'POST /v1/chat/completions',
    },
    groq_base: groqBase(c.env),
    default_model: c.env.DEFAULT_MODEL || DEFAULT_MODEL,
    protected: Boolean(c.env.PROXY_TOKEN),
  })
})

// ---------------------------------------------------------------------------
// Built-in chat UI (no Hugging Face needed). Phone/browser friendly.
// Talks to this same Worker's /v1/chat/completions. The Groq key stays
// server-side; the page only needs PROXY_TOKEN (if you set one).
// ---------------------------------------------------------------------------
app.get('/chat', (c) =>
  c.html(chatPage({ defaultModel: c.env.DEFAULT_MODEL || DEFAULT_MODEL, protected: Boolean(c.env.PROXY_TOKEN) }))
)

// Tiny inline favicon (feather emoji) so browsers don't log a 404.
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="84" font-size="84">🪶</text></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
})

// Health probe -> always 200 (this is what the Hermes probe wants).
app.get('/health', (c) => c.json({ status: 'ok' }))
app.get('/healthz', (c) => c.json({ status: 'ok' }))
app.get('/v1/health', (c) => c.json({ status: 'ok' }))

// GET on the chat endpoint must return 405 so the probe registers it as "exists".
app.get('/v1/chat/completions', (c) =>
  c.json({ error: { message: 'Method Not Allowed. Use POST.', type: 'invalid_request_error' } }, 405)
)

// ---------------------------------------------------------------------------
// /v1/models  -> forward to Groq (GET)
// ---------------------------------------------------------------------------
app.get('/v1/models', async (c) => {
  if (!checkAuth(c)) {
    return c.json({ error: { message: 'Unauthorized', type: 'invalid_request_error' } }, 401)
  }
  if (!c.env.GROQ_API_KEY) {
    return c.json({ error: { message: 'GROQ_API_KEY not configured on the shim', type: 'server_error' } }, 500)
  }

  const upstream = await fetch(`${groqBase(c.env)}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${c.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
  return new Response(upstream.body, { status: upstream.status, headers })
})

// ---------------------------------------------------------------------------
// /v1/chat/completions  -> forward to Groq (POST, streaming + non-streaming)
// ---------------------------------------------------------------------------
app.post('/v1/chat/completions', async (c) => {
  if (!checkAuth(c)) {
    return c.json({ error: { message: 'Unauthorized', type: 'invalid_request_error' } }, 401)
  }
  if (!c.env.GROQ_API_KEY) {
    return c.json({ error: { message: 'GROQ_API_KEY not configured on the shim', type: 'server_error' } }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { message: 'Invalid JSON body', type: 'invalid_request_error' } }, 400)
  }

  // Fill in a default model if the caller didn't specify one (or sent "default").
  if (!body.model || body.model === 'default') {
    body.model = c.env.DEFAULT_MODEL || DEFAULT_MODEL
  }

  const isStream = body.stream === true
  const modelName = String(body.model || '')

  // -------------------------------------------------------------------------
  // God Mode V2: semantic-ish recall — if KV memory exists, prepend relevant
  // memories as a system context message so the agent "remembers" across sessions.
  // -------------------------------------------------------------------------
  try {
    if (c.env.HERMES_MEM && Array.isArray(body.messages)) {
      const msgs = body.messages as Array<{ role: string; content: string }>
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
      if (lastUser?.content) {
        const recalled = await recallMemories(c.env.HERMES_MEM, lastUser.content, 5)
        if (recalled.length) {
          const memBlock =
            'Relevant long-term memories (from previous sessions):\n' +
            recalled.map((m) => `- ${m.text}${m.tags.length ? ` [${m.tags.join(', ')}]` : ''}`).join('\n')
          msgs.unshift({ role: 'system', content: memBlock })
          body.messages = msgs
        }
      }
    }
  } catch {
    /* recall is best-effort; never block chat */
  }

  // -------------------------------------------------------------------------
  // God Mode V2: free Workers AI fallback. If model starts with "@cf/",
  // route to Workers AI binding instead of Groq (no key, no quota burn).
  // -------------------------------------------------------------------------
  if (modelName.startsWith('@cf/')) {
    if (!c.env.AI) {
      return c.json({ error: { message: 'Workers AI (AI binding) not available', type: 'server_error' } }, 500)
    }
    try {
      const res: any = await c.env.AI.run(modelName, { messages: body.messages })
      const text = res?.response || res?.result?.response || ''
      return c.json({
        id: `cf-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      })
    } catch (e: any) {
      return c.json({ error: { message: `Workers AI error: ${String(e?.message || e)}`, type: 'server_error' } }, 500)
    }
  }

  const upstream = await fetch(`${groqBase(c.env)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  // Stream SSE straight through to the client for streaming requests.
  if (isStream) {
    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/event-stream')
    headers.set('Cache-Control', 'no-cache')
    headers.set('Connection', 'keep-alive')
    return new Response(upstream.body, { status: upstream.status, headers })
  }

  // Non-streaming: pass JSON through.
  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
  return new Response(upstream.body, { status: upstream.status, headers })
})

// ===========================================================================
// God Mode V2 — Agent API: persistent memory + web tools (edge-native)
// All protected by PROXY_TOKEN (same gate as /v1/*).
// ===========================================================================

// --- Memory: list ---------------------------------------------------------
app.get('/api/memory', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  if (!c.env.HERMES_MEM) return c.json({ error: 'KV (HERMES_MEM) not configured', items: [] }, 200)
  const items = await listMemories(c.env.HERMES_MEM, 100)
  return c.json({ count: items.length, items })
})

// --- Memory: save (HITL — explicit user action) ---------------------------
app.post('/api/memory', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  if (!c.env.HERMES_MEM) return c.json({ error: 'KV (HERMES_MEM) not configured' }, 500)
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body?.text || typeof body.text !== 'string') {
    return c.json({ error: 'Field "text" (string) is required' }, 400)
  }
  const entry = await saveMemory(c.env.HERMES_MEM, {
    text: body.text,
    tags: Array.isArray(body.tags) ? body.tags : [],
    user: body.user,
  })
  return c.json({ ok: true, entry })
})

// --- Memory: recall (keyword) --------------------------------------------
app.get('/api/memory/recall', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  if (!c.env.HERMES_MEM) return c.json({ items: [] })
  const q = c.req.query('q') || ''
  const items = await recallMemories(c.env.HERMES_MEM, q, 5)
  return c.json({ query: q, count: items.length, items })
})

// --- Memory: delete -------------------------------------------------------
app.delete('/api/memory/:id', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  if (!c.env.HERMES_MEM) return c.json({ error: 'KV (HERMES_MEM) not configured' }, 500)
  // id contains colons (mem:ts:rand) — read raw path segment
  const id = decodeURIComponent(c.req.path.replace('/api/memory/', ''))
  await deleteMemory(c.env.HERMES_MEM, id)
  return c.json({ ok: true, id })
})

// --- Tool: crawl URL -> clean markdown (+ optional AI summarize/answer) ----
app.post('/api/tools/crawl', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body?.url || typeof body.url !== 'string') {
    return c.json({ error: 'Field "url" (string) is required' }, 400)
  }
  const crawl = await crawlUrl(c.env, body.url)
  if (!crawl.ok) {
    return c.json({ ok: false, sourceUrl: body.url, error: crawl.error }, 502)
  }
  let summary: string | undefined
  if (body.summarize !== false) {
    summary = await summarizeWithWorkersAI(c.env, crawl.markdown || '', body.question)
  }
  return c.json({
    ok: true,
    sourceUrl: crawl.sourceUrl,
    summary,
    markdown: body.includeRaw ? crawl.markdown : undefined,
  })
})

// --- Agent capabilities probe (honest status) -----------------------------
app.get('/api/status', (c) => {
  return c.json({
    service: 'hermes-agent',
    version: 'god-mode-v2',
    capabilities: {
      memory_kv: Boolean(c.env.HERMES_MEM),
      workers_ai: Boolean(c.env.AI),
      web_crawl: Boolean(c.env.CLOUDFLARE_ACCOUNT_ID && c.env.CF_BROWSER_TOKEN),
      groq: Boolean(c.env.GROQ_API_KEY),
      protected: Boolean(c.env.PROXY_TOKEN),
    },
    doctrine: 'D-1 Truth-Lock: real edge capabilities only; no captcha-bypass, no YOLO.',
  })
})

// ---------------------------------------------------------------------------
// Catch-all 404 (JSON, OpenAI-style)
// ---------------------------------------------------------------------------
app.notFound((c) =>
  c.json({ error: { message: `No route for ${c.req.method} ${new URL(c.req.url).pathname}`, type: 'invalid_request_error' } }, 404)
)

export default app
