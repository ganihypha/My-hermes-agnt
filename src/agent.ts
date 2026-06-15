/**
 * ============================================================================
 * Hermes Agent — God Mode V2 core (edge-native)
 * ============================================================================
 *
 * Pure Cloudflare-deployable. NO Python, NO long-running process, NO fs.
 * D-1 Truth-Lock: every "god mode" capability here is REAL & legal:
 *   - Persistent memory across sessions (Workers KV)
 *   - Web tool: crawl URL -> clean markdown (Browser Run REST /crawl)
 *   - Workers AI summarize/answer (free edge LLM) + fallback LLM provider
 * NO captcha-solver, NO TLS-fingerprint spoof, NO YOLO auto-actions.
 * Risky writes (save memory) are explicit user actions (HITL).
 * ============================================================================
 */

export type AgentBindings = {
  GROQ_API_KEY: string
  GROQ_BASE_URL?: string
  PROXY_TOKEN?: string
  DEFAULT_MODEL?: string
  // God Mode V2 bindings (optional at runtime — code degrades gracefully):
  AI?: Ai
  HERMES_MEM?: KVNamespace
  // Browser Run REST /crawl (secrets):
  CLOUDFLARE_ACCOUNT_ID?: string
  CF_BROWSER_TOKEN?: string
}

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

export async function saveMemory(
  kv: KVNamespace,
  input: { text: string; tags?: string[]; user?: string }
): Promise<MemoryEntry> {
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
  return entry
}

export async function listMemories(
  kv: KVNamespace,
  limit = 50
): Promise<MemoryEntry[]> {
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
  // newest first
  return out.sort((a, b) => b.ts - a.ts)
}

export async function deleteMemory(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(id)
}

/**
 * Lightweight keyword recall (no Vectorize required for V2).
 * Scores entries by overlap of query terms with text+tags.
 * Vectorize semantic recall = backlog (F5) per architecture doc.
 */
export async function recallMemories(
  kv: KVNamespace,
  query: string,
  topK = 5
): Promise<MemoryEntry[]> {
  const all = await listMemories(kv, 1000)
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2)
  if (terms.length === 0) return all.slice(0, topK)

  const scored = all.map((m) => {
    const hay = (m.text + ' ' + m.tags.join(' ')).toLowerCase()
    let score = 0
    for (const t of terms) {
      if (hay.includes(t)) score += 1
    }
    // small recency bonus
    score += Math.min(m.ts / 1e15, 0.5)
    return { m, score }
  })
  return scored
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.m)
}

// ---------------------------------------------------------------------------
// Web tool — crawl a URL into clean markdown via Cloudflare Browser Run /crawl.
// Honors robots/ToS; used for sites that allow it. No bypass of protections.
// ---------------------------------------------------------------------------

export interface CrawlResult {
  ok: boolean
  sourceUrl: string
  markdown?: string
  error?: string
}

export async function crawlUrl(
  env: AgentBindings,
  url: string
): Promise<CrawlResult> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) {
    return {
      ok: false,
      sourceUrl: url,
      error:
        'Browser Run not configured. Set CLOUDFLARE_ACCOUNT_ID and CF_BROWSER_TOKEN secrets.',
    }
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
      return { ok: false, sourceUrl: url, error: `Browser Run ${resp.status}: ${t.slice(0, 300)}` }
    }
    const data: any = await resp.json()
    const md: string =
      data?.result ?? data?.markdown ?? (typeof data === 'string' ? data : '')
    if (!md || !md.trim()) {
      return { ok: false, sourceUrl: url, error: 'Empty markdown returned.' }
    }
    return { ok: true, sourceUrl: url, markdown: md }
  } catch (e: any) {
    return { ok: false, sourceUrl: url, error: String(e?.message || e) }
  }
}

// ---------------------------------------------------------------------------
// Workers AI — free edge LLM summarize/answer (no key leak, no quota burn on Groq)
// ---------------------------------------------------------------------------

const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'

export async function summarizeWithWorkersAI(
  env: AgentBindings,
  content: string,
  question?: string
): Promise<string> {
  if (!env.AI) return '[Workers AI binding not available]'
  const trimmed = content.slice(0, 12000) // keep within context
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
