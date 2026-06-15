# 🎨 04 — DESIGN / UI

> Canonical · turunan dari `02-PRD` · v1.1 · 2026-06-15
> Baseline: live UI di `my-hermes-agnt.pages.dev/chat` (dipertahankan & ditingkatkan)

---

## 1. Design principles

1. **Mobile-first.** Dirancang untuk layar HP dulu; desktop = bonus.
2. **Dark, calm, focused.** Latar gelap (`#0b1020`), aksen indigo. Tidak ramai.
3. **Zero-friction.** Buka → langsung bisa chat (setelah set token sekali).
4. **Honest status.** Indikator status koneksi/agent jelas (idle/busy/ok/err).
5. **Progressive disclosure.** Settings & tools disembunyikan sampai dibutuhkan.

## 2. Design tokens

| Token | Nilai | Pakai |
|-------|-------|-------|
| `--bg` | `#0b1020` | Background utama |
| `--surface` | `slate-900/60` | Header, panel, composer |
| `--bubble-user` | `indigo-600` | Bubble user |
| `--bubble-ai` | `slate-800` | Bubble assistant |
| `--accent` | `indigo-400/500` | Ikon, tombol primer |
| `--text` | `slate-100` | Teks utama |
| `--muted` | `slate-400/500` | Teks sekunder |
| status | emerald/amber/rose/slate | ok/busy/err/idle |
| Radius | `rounded-2xl` bubble, `rounded-full` send | Lembut |
| Font | sistem sans (Tailwind default) | Cepat, native |
| Ikon | FontAwesome 6.4 (CDN) | Konsisten |

## 3. Layout (mobile-first)

```
┌─────────────────────────────┐
│ ☰ Hermes Agent   ● status ⚙ │  header (sticky)
├─────────────────────────────┤
│  [memory recall chips]      │  (F5) opsional, muncul saat relevan
│                             │
│        chat messages        │  scroll area, bubble kiri/kanan
│   (markdown rendered)       │
│                             │
├─────────────────────────────┤
│ 🔧 tools | 🧠 memory        │  quick actions (F6/F8)
│ [ textarea ........] [➤]    │  composer (safe-area bottom)
└─────────────────────────────┘
```

Halaman:
- `/chat` — layar utama (di atas).
- `/memory` — daftar ingatan: kartu {text, tags, tanggal, hapus}.
- Settings panel (slide-down): PROXY_TOKEN, model picker, system prompt, test conn.

## 4. Komponen UI

| Komponen | Status baseline | Upgrade (project ini) |
|----------|-----------------|------------------------|
| Header + status dot | ✅ ada | + tombol ke /memory |
| Settings panel | ✅ ada | + provider/model dropdown (Groq / Workers AI) |
| Message bubbles | ✅ plain `<pre>` | **+ markdown render** (code block, list, bold) |
| Composer | ✅ auto-grow | + tombol attach url (untuk crawl tool) |
| Typing indicator | ✅ ada | pertahankan |
| Memory chips | ❌ | **baru** — tampil ingatan yang dipakai |
| Tool result card | ❌ | **baru** — kartu hasil crawl (judul, ringkasan, sumber, "simpan") |
| Memory page | ❌ | **baru** — CRUD ingatan |

## 5. Interaksi kunci

- **Kirim**: Enter (desktop) / tombol (HP). Shift+Enter = newline.
- **Stream**: token muncul real-time (SSE), auto-scroll.
- **Tool call**: saat agent panggil tool, tampil kartu "🔧 Menjalankan: crawl <url>…"
  lalu hasil. Aksi simpan-ke-memori = tombol eksplisit (HITL).
- **Recall**: chip "🧠 mengingat: …" muncul di atas jawaban bila memori dipakai.
- **Error**: bubble merah dengan pesan jelas (401 → "cek token di Settings").

## 6. Aksesibilitas & mobile

- `viewport-fit=cover` + `env(safe-area-inset-bottom)` (sudah ada di baseline).
- Target sentuh ≥ 44px. Kontras teks AA.
- Tidak ada hover-only interaction (HP tidak punya hover).

## 7. Referensi visual

- Baseline kita: `my-hermes-agnt.pages.dev/chat` (Hermes Chat — sudah bagus, dark+indigo).
- Hermes Studio (dashboard yang lebih kaya): https://github.com/JPeetz/Hermes-Studio
  → ambil ide dari **Conductor V2** (panel tools/memory, real-time log stream, status
    sub-agent, tampilan screenshot-proof hasil crawl), tapi **JANGAN copy berat** —
    Hermes Studio butuh Docker/server; kita tetap ringan (vanilla + Tailwind CDN).
  → Yang kita adopsi (versi ringan): tool-result card, memory chips, status dot live.
  → Yang TIDAK kita adopsi: Docker monitoring, SQLite viewer, SSE event-replay penuh.

## 8. Out of scope (UI)

- ❌ Build pipeline frontend berat (React/Vue) — cukup vanilla + Tailwind CDN.
- ❌ Multi-theme switcher (dark saja dulu).
- ❌ Animasi kompleks.

---
*Konsisten dengan komponen di 02-PRD §5 dan flow di 03-ARCHITECTURE §4.*
