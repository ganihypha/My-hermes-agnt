# 🔌 06 — EXTERNAL INTEGRATIONS

> Canonical · turunan dari `00-SSOT` & `03-ARCHITECTURE` · v1.0 · 2026-06-15
> Konsolidasi riset dari file referensi: `b4.lnggraphhxcrew`, `hggingg.face.x.vps`,
> `lngchainn.x.crew.ai`, `kmbnasii.gdd.mdee`, `mtodee.rsmii`, `v3/v4/v5 god mode`, `rference`.

---

## 0. Kenapa dokumen ini ada

File-file referensi banyak bicara soal **CrewAI, LangGraph, n8n, Hermes-Studio, Python
Hermes-3** dengan narasi "God Mode V3/V4/V5". Semua itu **TIDAK bisa jalan native di
Cloudflare Pages/Workers** (V8 isolate, tanpa Python, tanpa long-running process). Dokumen
ini menjelaskan **jalur eksternal yang jujur & realistis** jika kelak fitur itu benar
dibutuhkan — tanpa mencemari arsitektur edge inti (dok 03).

> ⚠️ **Aturan main**: edge-native dulu (dok 03). Eksternal hanya jika ada kebutuhan nyata
> yang tidak bisa dipenuhi di edge. Eksternal = **opsional**, bukan dependency CF Pages.

---

## 1. Apa yang TIDAK bisa di Cloudflare (dan kenapa)

| Komponen | Kenapa tidak bisa di CF Workers/Pages |
|----------|----------------------------------------|
| **CrewAI** (Python) | Butuh interpreter Python; Workers = V8 JS/WASM saja |
| **LangGraph** (Python) | Sama — Python runtime |
| **n8n** | Butuh proses long-running + disk + VM penuh |
| **Python Hermes-3 / NousResearch core** | Model/agent loop berat, butuh server/VM |
| **Hermes-Studio dashboard** | Butuh Docker (Conductor V2, SQLite, SSE replay) |

Batas Workers: runtime V8 isolate, no Python, eksekusi milidetik–detik, no `fs`, 10MB worker,
CPU limit ketat. (Sumber: `cloudflarre.slutionn`, `hggingg.face.x.vps`.)

## 2. Pola integrasi yang BENAR (Hybrid Edge × Eksternal)

```
   ┌─────────────────────────────┐         ┌──────────────────────────────────┐
   │  CF Pages (Hono) — EDGE     │  REST   │  HF Spaces (Docker) — EKSTERNAL  │
   │  - chat/memory/tools UI     │────────►│  - FastAPI gateway               │
   │  - tool-loop ringan         │  HTTPS  │  - CrewAI + LangGraph swarm      │
   │  - panggil swarm via fetch  │◄────────│  - (opsional) n8n                │
   └─────────────────────────────┘  JSON   └──────────────────────────────────┘
        ▲ keys = CF secret                       ▲ keys = HF Space secret
```

**Prinsip**: Worker edge = front-door + tool ringan. Tugas berat/multi-agent =
dilempar ke endpoint REST eksternal, hasil ditarik balik. Tidak ada key bocor di frontend.

## 3. Jalur eksternal: HF Spaces (Docker) sebagai "VPS gratis"

Sumber: `hggingg.face.x.vps.q.q.q...txt`, `fll.godd.mkdee` (V5).

### 3.1 Setup
1. HF Spaces → **Create new Space** → SDK = **Docker** → template **Blank** → visibilitas **Private**.
2. Simpan key di **Settings → Variables and secrets** (`GROQ_API_KEY`, dll) — JANGAN di kode.
3. Port default HF = **7860**.

### 3.2 `Dockerfile` (minimal, Python swarm)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=7860
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### 3.3 `requirements.txt`
```
fastapi
uvicorn[standard]
crewai
langgraph
langchain-groq
langchain-core
groq
requests
```

### 3.4 ⚠️ Batas jujur free tier (D-1 Truth-Lock)
- **Tidur setelah ~48 jam idle.** Keep-alive cron (cron-job.org ping tiap ~30 menit) =
  **patch, bukan SLA**. Bisa tetap mati saat maintenance HF.
- CPU/RAM terbatas; "upgrade GPU 1 klik" = **berbayar**, bukan gratis.
- Untuk uptime serius → VPS/cloud berbayar. HF gratis = eksperimen/training, bukan produksi kritis.

## 4. Core swarm eksternal (CrewAI + LangGraph) — versi jujur

Sumber: `b4.lnggraphhxcrew.ai`, `lngchainn.x.crew.ai`.

- **LangChain** = penyedia LLM client (Groq) + custom tools.
- **CrewAI** = orkestrasi tim agent (role/goal/task, sequential/parallel).
- **LangGraph** = state machine + **self-healing loop** (retry saat gagal, conditional edges).

Pola self-healing (disederhanakan, legal):
```python
# retry terbatas saat tool gagal/blocked — bukan "infinite bypass"
def route(state):
    if state["error"] and state["retry"] < 3:
        return "retry"      # coba taktik lain (provider/fallback), BUKAN bobol proteksi
    return "finish"
```

> ❗ **Truth-Lock**: di file referensi, "self-healing" diceritakan untuk *bypass anti-bot
> tanpa henti*. Kita pakai polanya untuk **ketahanan eksekusi yang sah** (retry saat
> rate-limit/timeout, ganti provider), **BUKAN** untuk membobol proteksi/captcha situs orang.

## 5. Tool crawl: REST `/crawl` resmi CF (dipakai di edge juga)

Sumber: `rference.q.q.q.txt`.

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/crawl
Authorization: Bearer {CF_BROWSER_TOKEN}   # izin Browser Rendering
Body: { "url": "...", "format": "markdown" }
→ markdown bersih (HTML→markdown via AI internal CF)
```
Ini **jalur ringan** (tanpa nulis Puppeteer) dan dipakai sebagai default tool crawl edge
(lihat `03-ARCHITECTURE §4.3`). Hormati robots.txt & ToS situs target.

## 6. Backlog eksternal lain

- **Cloudflare Artifacts (Git-for-Agents, beta)** — storage skill dinamis ber-Git untuk agent.
  Relevan kalau agent mulai menulis/menyimpan skill sendiri. (Sumber: `rference`.)
- **n8n di HF Spaces** — automasi workflow; expose webhook, Worker jadi trigger/receiver.
- **Composio Cloudflare MCP** — kelola DNS/WAF lewat MCP toolkit.

## 7. Keamanan integrasi eksternal (wajib)

1. Worker → eksternal: kirim **shared secret** (header), bukan key provider.
2. Key provider (Groq dll) hidup **di sisi eksternal** (HF secret), tidak pernah ke browser.
3. Endpoint eksternal **whitelist origin** Worker; rate-limit.
4. Tidak ada aksi destruktif/eksternal tanpa **HITL** (no YOLO) — konsisten SSOT §5.

---
*Edge-native tetap juara. Dokumen ini = peta jalan kalau (dan hanya kalau) kebutuhan
melampaui batas edge. Konsisten dengan `00-SSOT §4–5` dan `03-ARCHITECTURE §8`.*
