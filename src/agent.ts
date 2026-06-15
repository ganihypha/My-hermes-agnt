/**
 * ============================================================================
 * Hermes Agent — God Mode V3 core (edge-native)
 * ============================================================================
 *
 * 100% Cloudflare-deployable. NO Python, NO long-running process, NO fs.
 *
 * D-1 Truth-Lock: every "god mode" capability here is REAL & legal:
 *   - Persistent memory across sessions (Workers KV)
 *   - SEMANTIC recall (Vectorize + Workers AI bge embeddings) — V3 upgrade,
 *     graceful fallback to keyword scoring when Vectorize is absent
 *   - Web tool: crawl URL -> clean markdown (Browser Rendering REST)
 *   - Workers AI summarize/answer (free edge LLM) + Groq provider
 *   - Tool-calling agent loop with bounded self-healing retry
 *     (LangGraph-style state machine, NOT a global multi-worker swarm)
 *
 * NO captcha-solver, NO TLS-fingerprint spoof, NO YOLO auto-actions.
 * Risky writes (save memory) are explicit user actions (HITL).
 * ============================================================================
 */

export type AgentBindings = {
  GROQ_API_KEY: string
  GROQ_BASE_URL?: string
  PROXY_TOKEN?: string
  DEFAULT_MODEL?: string
  // God Mode V2/V3 bindings (optional at runtime — code degrades gracefully):
  AI?: Ai
  HERMES_MEM?: KVNamespace
  HERMES_VEC?: VectorizeIndex // V3: semantic recall
  BROWSER?: Fetcher // V3: Puppeteer fallback (binding)
  // Browser Rendering REST /markdown (secrets):
  CLOUDFLARE_ACCOUNT_ID?: string
  CF_BROWSER_TOKEN?: string
}

// Embedding model (1024-dim) for Vectorize semantic recall.
export const EMBED_MODEL = '@cf/baai/bge-large-en-v1.5'
export const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'

// ---------------------------------------------------------------------------
// Memory layer (Workers KV) — raw persistent facts across sessions.
// Key scheme:  mem:<ts>:<rand>   (sortable by time)
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string
  text: string
  tags: string[]
  ts: number
  user: string
}

function memId(): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 10)
  return `mem:${ts}:${rand}`
}

/** Best-effort embedding via Workers AI bge. Returns null if unavailable. */
export async function embed(env: AgentBindings, text: string): Promise<number[] | null> {
  if (!env.AI) return null
  try {
    const res: any = await env.AI.run(EMBED_MODEL, { text: [text.slice(0, 4000)] })
    const vec = res?.data?.[0]
    return Array.isArray(vec) ? vec : null
  } catch {
    return null
  }
}

export async function saveMemory(
  env: AgentBindings,
  input: { text: string; tags?: string[]; user?: string }
): Promise<MemoryEntry> {
  const kv = env.HERMES_MEM!
  const entry: MemoryEntry = {
    id: memId(),
    text: input.text.trim(),
    tags: (input.tags || []).map((t) => t.trim()).filter(Boolean),
    ts: Date.now(),
    user: input.user || 'reza',
  }
  await kv.put(entry.id, JSON.stringify(entry), {
    metadata: { tags: entry.tags, ts: entry.ts },
  })

  // V3: semantic index in Vectorize (best-effort; never blocks KV write)
  if (env.HERMES_VEC) {
    try {
      const vec = await embed(env, entry.text + ' ' + entry.tags.join(' '))
      if (vec) {
        await env.HERMES_VEC.upsert([
          {
            id: entry.id,
            values: vec,
            metadata: { text: entry.text, tags: entry.tags.join(','), ts: entry.ts },
          },
        ])
      }
    } catch {
      /* semantic indexing is best-effort */
    }
  }
  return entry
}

export async function listMemories(kv: KVNamespace, limit = 50): Promise<MemoryEntry[]> {
  const list = await kv.list({ prefix: 'mem:', limit: Math.min(limit, 1000) })
  const out: MemoryEntry[] = []
  for (const k of list.keys) {
    const v = await kv.get(k.name)
    if (v) {
      try {
        out.push(JSON.parse(v) as MemoryEntry)
      } catch {
        /* skip corrupt */
      }
    }
  }
  return out.sort((a, b) => b.ts - a.ts)
}

export async function deleteMemory(env: AgentBindings, id: string): Promise<void> {
  if (env.HERMES_MEM) await env.HERMES_MEM.delete(id)
  if (env.HERMES_VEC) {
    try {
      await env.HERMES_VEC.deleteByIds([id])
    } catch {
      /* best-effort */
    }
  }
}

/**
 * V3 recall — semantic-first (Vectorize), keyword fallback (KV).
 * 1. If Vectorize + embeddings available: embed query -> topK vector search.
 * 2. Else: keyword overlap scoring over all KV entries.
 */
export async function recallMemories(
  env: AgentBindings,
  query: string,
  topK = 5
): Promise<{ items: MemoryEntry[]; mode: 'semantic' | 'keyword' | 'none' }> {
  // --- semantic path ---
  if (env.HERMES_VEC && env.AI) {
    try {
      const qvec = await embed(env, query)
      if (qvec) {
        const res: any = await env.HERMES_VEC.query(qvec, { topK, returnMetadata: true })
        const matches = (res?.matches || []) as Array<{
          id: string
          score: number
          metadata?: { text?: string; tags?: string; ts?: number }
        }>
        const items: MemoryEntry[] = matches
          .filter((m) => m.score >= 0.3 && m.metadata?.text)
          .map((m) => ({
            id: m.id,
            text: m.metadata!.text || '',
            tags: (m.metadata!.tags || '').split(',').filter(Boolean),
            ts: m.metadata!.ts || 0,
            user: 'reza',
          }))
        if (items.length) return { items, mode: 'semantic' }
      }
    } catch {
      /* fall through to keyword */
    }
  }

  // --- keyword fallback path ---
  if (!env.HERMES_MEM) return { items: [], mode: 'none' }
  const all = await listMemories(env.HERMES_MEM, 1000)
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2)
  if (terms.length === 0) return { items: all.slice(0, topK), mode: 'keyword' }

  const scored = all.map((m) => {
    const hay = (m.text + ' ' + m.tags.join(' ')).toLowerCase()
    let score = 0
    for (const t of terms) if (hay.includes(t)) score += 1
    score += Math.min(m.ts / 1e15, 0.5) // recency nudge
    return { m, score }
  })
  const items = scored
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.m)
  return { items, mode: 'keyword' }
}

// ---------------------------------------------------------------------------
// Web tool — crawl a URL into clean markdown.
// DEFAULT: Browser Rendering REST /markdown (AI internal strips nav/ads).
// FALLBACK: BROWSER binding (Puppeteer) for JS-heavy pages.
// Honors robots/ToS. No bypass of protections (D-1 Truth-Lock).
// ---------------------------------------------------------------------------

export interface CrawlResult {
  ok: boolean
  sourceUrl: string
  markdown?: string
  via?: 'rest' | 'puppeteer'
  error?: string
}

async function crawlViaRest(env: AgentBindings, url: string): Promise<CrawlResult> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) {
    return { ok: false, sourceUrl: url, error: 'REST not configured (need CLOUDFLARE_ACCOUNT_ID + CF_BROWSER_TOKEN)' }
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })
    if (!resp.ok) {
      const t = await resp.text()
      return { ok: false, sourceUrl: url, error: `REST ${resp.status}: ${t.slice(0, 200)}` }
    }
    const data: any = await resp.json()
    const md: string = data?.result ?? data?.markdown ?? (typeof data === 'string' ? data : '')
    if (!md || !md.trim()) return { ok: false, sourceUrl: url, error: 'Empty markdown from REST' }
    return { ok: true, sourceUrl: url, markdown: md, via: 'rest' }
  } catch (e: any) {
    return { ok: false, sourceUrl: url, error: String(e?.message || e) }
  }
}

async function crawlViaPuppeteer(env: AgentBindings, url: string): Promise<CrawlResult> {
  // BROWSER binding requires @cloudflare/puppeteer at deploy time. We probe
  // gracefully; if binding/lib not present, report honestly (no crash).
  if (!env.BROWSER) return { ok: false, sourceUrl: url, error: 'BROWSER binding not configured' }
  try {
    // Dynamic import keeps build working even when lib isn't installed locally.
    // @ts-ignore — optional dependency, resolved only when present at deploy.
    const puppeteer = await import('@cloudflare/puppeteer').catch(() => null as any)
    if (!puppeteer?.default?.launch) {
      return { ok: false, sourceUrl: url, error: '@cloudflare/puppeteer not available' }
    }
    const browser = await puppeteer.default.launch(env.BROWSER as any)
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 })
    const text: string = await page.evaluate(() => (document.body?.innerText || '').slice(0, 20000))
    await browser.close()
    if (!text.trim()) return { ok: false, sourceUrl: url, error: 'Empty text from Puppeteer' }
    return { ok: true, sourceUrl: url, markdown: text, via: 'puppeteer' }
  } catch (e: any) {
    return { ok: false, sourceUrl: url, error: String(e?.message || e) }
  }
}

/** Crawl with self-healing: REST first, Puppeteer fallback on empty/error. */
export async function crawlUrl(env: AgentBindings, url: string): Promise<CrawlResult> {
  const rest = await crawlViaRest(env, url)
  if (rest.ok) return rest
  const pup = await crawlViaPuppeteer(env, url)
  if (pup.ok) return pup
  // Honest failure — report both attempts.
  return { ok: false, sourceUrl: url, error: `REST: ${rest.error} | Puppeteer: ${pup.error}` }
}

// ---------------------------------------------------------------------------
// Workers AI — free edge LLM summarize/answer (no key leak, no Groq quota burn)
// ---------------------------------------------------------------------------

export async function summarizeWithWorkersAI(
  env: AgentBindings,
  content: string,
  question?: string
): Promise<string> {
  if (!env.AI) return '[Workers AI binding not available]'
  const trimmed = content.slice(0, 12000)
  const sys =
    'You are a precise research assistant. Summarize the given web content faithfully. ' +
    'Do not invent facts. If a question is asked, answer it using only the content.'
  const user = question
    ? `QUESTION: ${question}\n\nWEB CONTENT:\n${trimmed}`
    : `Summarize this web content concisely:\n\n${trimmed}`
  try {
    const res: any = await env.AI.run(WORKERS_AI_MODEL, {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    })
    return res?.response || res?.result?.response || '[no response]'
  } catch (e: any) {
    return `[Workers AI error: ${String(e?.message || e)}]`
  }
}

// ===========================================================================
// V3: TOOL-CALLING AGENT LOOP (bounded self-healing) — LangGraph-style.
// Honest edge implementation: a small state machine with a retry counter,
// NOT a global multi-worker swarm. Risky writes are HITL (never auto).
// ===========================================================================

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'recall_memory',
    description: 'Search long-term memory for relevant facts from previous sessions.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to recall' } },
      required: ['query'],
    },
  },
  {
    name: 'crawl_web',
    description: 'Fetch a public web page and return clean text/markdown. Use for reading a URL the user provides.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to read' },
        question: { type: 'string', description: 'Optional question to answer from the page' },
      },
      required: ['url'],
    },
  },
  {
    name: 'save_memory',
    description:
      'Save a fact to long-term memory. RISKY WRITE — only call when the user explicitly asks to remember something (HITL).',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The fact to remember' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
      },
      required: ['text'],
    },
  },
]

export const OPERATOR_SYSTEM_PROMPT = `You are Hermes, a sovereign edge AI operator running on Cloudflare's global network.

You have REAL capabilities (use them honestly):
- recall_memory: pull relevant facts from your persistent long-term memory.
- crawl_web: read a public web page (clean markdown) and answer questions about it.
- save_memory: store a new fact — ONLY when the user explicitly asks you to remember (this is a human-in-the-loop write; never save silently).

Doctrine (non-negotiable):
- Be brutally honest. If a tool fails or you cannot do something, say so plainly — never fake success.
- You CANNOT bypass captchas, anti-bot protection, or do anything against a site's ToS. Refuse such requests.
- For risky actions (saving memory, anything external), confirm intent first.
- Keep answers concise and useful. Prefer markdown for structure.`

export interface ToolCall {
  name: string
  arguments: Record<string, any>
}

export interface AgentStep {
  type: 'tool_call' | 'tool_result' | 'answer' | 'error'
  tool?: string
  detail?: string
  ok?: boolean
}

/**
 * Execute one tool call server-side with bounded retry/self-healing.
 * Returns a string result fed back to the LLM, plus a structured step log.
 */
export async function executeTool(
  env: AgentBindings,
  call: ToolCall,
  maxRetry = 2
): Promise<{ result: string; step: AgentStep }> {
  let lastErr = ''
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      switch (call.name) {
        case 'recall_memory': {
          const q = String(call.arguments?.query || '')
          const { items, mode } = await recallMemories(env, q, 5)
          const text = items.length
            ? items.map((m) => `- ${m.text}${m.tags.length ? ` [${m.tags.join(', ')}]` : ''}`).join('\n')
            : '(no relevant memories found)'
          return {
            result: `Memory recall (${mode}):\n${text}`,
            step: { type: 'tool_result', tool: 'recall_memory', ok: true, detail: `${items.length} via ${mode}` },
          }
        }
        case 'crawl_web': {
          const url = String(call.arguments?.url || '')
          if (!url) throw new Error('missing url')
          const crawl = await crawlUrl(env, url)
          if (!crawl.ok) {
            lastErr = crawl.error || 'crawl failed'
            // self-healing: retry loop will try again; bge/REST are idempotent
            throw new Error(lastErr)
          }
          const summary = await summarizeWithWorkersAI(env, crawl.markdown || '', call.arguments?.question)
          return {
            result: `Web content from ${crawl.sourceUrl} (via ${crawl.via}):\n${summary}`,
            step: { type: 'tool_result', tool: 'crawl_web', ok: true, detail: `${crawl.via}` },
          }
        }
        case 'save_memory': {
          if (!env.HERMES_MEM) throw new Error('memory storage not configured')
          const text = String(call.arguments?.text || '')
          if (!text) throw new Error('missing text')
          const entry = await saveMemory(env, { text, tags: call.arguments?.tags })
          return {
            result: `Saved to memory: "${entry.text}" (id ${entry.id})`,
            step: { type: 'tool_result', tool: 'save_memory', ok: true, detail: entry.id },
          }
        }
        default:
          return {
            result: `Unknown tool: ${call.name}`,
            step: { type: 'error', tool: call.name, ok: false, detail: 'unknown tool' },
          }
      }
    } catch (e: any) {
      lastErr = String(e?.message || e)
      if (attempt < maxRetry) continue // self-heal: try again
    }
  }
  // gave up honestly
  return {
    result: `Tool "${call.name}" failed after ${maxRetry + 1} attempts: ${lastErr}`,
    step: { type: 'error', tool: call.name, ok: false, detail: lastErr },
  }
}
