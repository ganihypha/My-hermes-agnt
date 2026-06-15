# ✅ 05 — TODO / ROADMAP

> Canonical · turunan dari `02-PRD` & `03-ARCHITECTURE` · v1.1 · 2026-06-15
> Status: **menunggu approval user untuk mulai build** (saat ini baru dokumen canonical).

---

## 0. Konvensi

- `[ ]` belum · `[~]` jalan · `[x]` selesai · `(Pn)` prioritas · `→ DoD` = definition of done.
- Setiap sprint diakhiri: build OK → curl test → commit. Deploy di akhir milestone.

---

## SPRINT 0 — Canonical & Setup  `[~]`  (sesi ini)

- [x] Deep dive semua file upload + deep research referensi (P0)
- [x] Vault kredensial (gitignored) + `.dev.vars.example` (P0)
- [x] Dokumen canonical 00–05 (SSOT, NorthStar, PRD, Arch, Design, Todo) (P0)
- [x] Extract skill bundles + BOOT ke workspace (P1)
- [ ] Commit awal canonical docs (P0)  → **DoD: git commit "docs: canonical SSOT"**
- [ ] **APPROVAL GATE**: user konfirm "lanjut build" (P0)

> ⛔ Build kode (Sprint 1+) menunggu approval, sesuai instruksi: *buat canonical doc dulu*.

---

## SPRINT 1 — Core proxy + Auth (F1/F2/F3)  `[ ]`  (P0)

- [ ] Konversi scaffold Hono → app dengan Tailwind layout (P0)
- [ ] Port chat UI dari live (dark+indigo, mobile) ke `src` + `public/static` (P0)
- [ ] `/v1/models` + `/v1/chat/completions` (stream) proxy ke **Groq** (P0)
  → DoD: `curl` dengan Bearer dapat stream; tanpa token → 401.
- [ ] Tambah provider **Workers AI** (model `@cf/*` → AI binding) (P0)
  → DoD: ganti model di settings → jawaban dari Workers AI.
- [ ] `/api/health` (P1)
- [ ] Build + PM2 + test lokal + commit (P0)

---

## SPRINT 2 — Memory: KV (F4)  `[ ]`  (P0)

- [ ] Buat KV namespace `HERMES_MEM` + binding wrangler (P0)
- [ ] `/api/memory` GET/POST/DELETE (CRUD) (P0)
  → DoD: simpan fakta → muncul di GET → bisa hapus.
- [ ] Perintah dalam chat: "ingat: …" → auto POST memory (P1)
- [ ] Halaman `/memory` (UI dashboard) (P2)
- [ ] Build + test + commit (P0)

---

## SPRINT 3 — Semantic recall: Vectorize + embeddings (F5)  `[ ]`  (P1)

- [ ] Buat Vectorize index `hermes-memory-index` (1024d cosine) (P1)
- [ ] Saat save memory → embed (bge) → insert Vectorize (P1)
- [ ] `/api/memory/recall` (embed query → topK) (P1)
- [ ] Auto-inject recall ke system context pada chat (P1)
  → DoD: tanya hal terkait → log menunjukkan memori relevan ter-inject.
- [ ] UI memory chips (P2)
- [ ] Build + test + commit (P1)

---

## SPRINT 4 — Web tool: crawl/scrape (F6/F7)  `[ ]`  (P1)

- [ ] **Default: Browser Run REST `/crawl`** — secret `CLOUDFLARE_ACCOUNT_ID` + `CF_BROWSER_TOKEN`;
      POST `…/browser-rendering/crawl {url, format:"markdown"}` (P1)
  → DoD: POST url → markdown bersih kembali.
- [ ] Fallback: Browser Rendering binding `BROWSER` (Puppeteer) untuk halaman JS berat (P2)
- [ ] `/api/tools/crawl` (REST default → fallback → Workers AI summarize) (P1)
  → DoD: POST url → ringkasan akurat + sourceUrl.
- [ ] Tool-calling loop + **self-healing retry terbatas** (max 2-3, pola LangGraph): LLM bisa
      minta `crawl_web`/`recall_memory`/`save_memory`; gagal → retry/fallback → menyerah jujur (P1)
- [ ] HITL untuk aksi simpan/eksternal — **no YOLO** (P1)
- [ ] UI tool result card (P2)
- [ ] Build + test + commit (P1)

---

## SPRINT 5 — Polish + God-mode prompt (F8/F9)  `[ ]`  (P2)

- [ ] Markdown render di bubble (P2)
- [ ] System prompt "Hermes operator" (versi jujur, sadar tools) (P2)
- [ ] Mobile polish pass (P2)
- [ ] Update README + docs (P1)

---

## MILESTONE DEPLOY  `[ ]`  (P0, akhir tiap milestone)

- [ ] Secrets prod: `wrangler pages secret put PROXY_TOKEN GROQ_API_KEY` (P0)
- [ ] Deploy via skill **`cf-byok-deploy`** → `--project-name my-hermes-agnt` (P0)
  → DoD: URL `.pages.dev` live, /chat jalan, 401 tanpa token.
- [ ] `setup_github_environment` → push ke `ganihypha/My-hermes-agnt` (P0)
- [ ] ProjectBackup (P1)

---

## Backlog / Nanti (bukan sekarang)

- [ ] Agent Memory binding resmi CF (saat keluar dari beta) (P3)
- [ ] **Cloudflare Artifacts (Git-for-Agents)** untuk storage skill dinamis (P3)
- [ ] Composio Cloudflare MCP toolkit (manage DNS/WAF) (P3)
- [ ] **Eksternal swarm** (lihat `06-EXTERNAL-INTEGRATIONS`): CrewAI + LangGraph self-healing
      di HF Spaces (Docker) + keep-alive cron + Worker memanggil via REST (P3)
- [ ] Eksternal: n8n di HF Spaces + webhook receiver di Worker (P3)
- [ ] Eksternal: CrewAI/Hermes-3 Python microservice via REST (P3)
- [ ] WhatsApp/Telegram gateway — HITL wajib (P3)
- [ ] Multi-user / billing (P4)

---

## Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Vectorize/Browser butuh Workers Paid | Fitur F5/F6 tertunda | Cek kuota saat deploy; F4 (KV) tetap jalan di free |
| Key sudah ter-share di chat | Bocor | Rotasi sebelum publik (sudah dicatat di vault) |
| "God mode" overpromise | Salah ekspektasi | D-1 Truth-Lock di SSOT §5 — fitur nyata saja |
| CF Pages limit (CPU/size) | Build gagal | Jaga worker ringan, summarize chunked |

---
*Kerjakan top-down per sprint. Jangan loncat sebelum DoD sprint sebelumnya hijau.*
