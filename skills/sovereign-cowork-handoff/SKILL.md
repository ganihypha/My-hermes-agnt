---
name: sovereign-cowork-handoff
version: 1.0.0
description: >-
  SparkMind Sovereign COWORK/HANDOFF — kolaborasi multi-sesi & antar-
  agent ala Claude Cowork: tiap sesi AI Dev menulis HANDOFF.md
  (state + keputusan + next steps + known issues), sesi/agent berikut
  membacanya untuk resume tanpa kehilangan konteks. Mengatasi batas
  sandbox yang non-persisten antar sesi via repo project (auto-push
  Second Brain). Untuk solo founder mode dengan banyak sesi pendek.
  Trigger: "handoff", "cowork", "tulis status", "serah terima",
  "lanjutkan sesi", "checkpoint", "simpan progress", "resume nanti".
metadata:
  category: collaboration
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  source_inspiration: "Anthropic — Claude Cowork product guide (multi-session collaboration)"
  pairs_with:
    - sovereign-context-injection   # baca HANDOFF saat ingest
    - sovereign-github-push         # commit handoff
    - sovereign-fullstack-cycle     # tulis handoff di akhir cycle
  requires:
    bins: ["git", "cat", "date"]
    tools: ["ProjectBackup"]
---

# sovereign-cowork-handoff

Jembatan antar-sesi. Sandbox AI Dev TIDAK persisten antar sesi, dan
solo founder sering kerja dalam banyak sesi pendek → tanpa handoff,
tiap sesi mulai buta. Skill ini bikin "serah terima" eksplisit.

## Prinsip Cowork (adaptasi Anthropic)

- **State eksplisit, bukan implisit** — tulis di mana progress berada,
  jangan andalkan memori sesi.
- **Atomic next step** — sesi berikut tahu PERSIS aksi pertamanya.
- **Truth over optimism (D-1)** — known issues ditulis jujur, bukan
  disembunyikan.
- **Persisten via repo** — HANDOFF.md di repo project = ikut auto-push
  Second Brain tiap turn → andal antar sesi.

## Lokasi & format HANDOFF.md

Path: `/home/user/webapp/HANDOFF.md` (selalu di root repo, ter-commit).

```markdown
# HANDOFF — <brand/project>
> Diperbarui: <YYYY-MM-DD HH:MM> · Sesi: <n> · Oleh: <agent/Gyss>

## STATE saat ini
- Fase fullstack-cycle: <0-7> (<nama fase>)
- Branch/commit: <oneline last commit>
- Service: <hidup di :3000 / mati> · Deploy: <belum / URL .pages.dev>

## SELESAI sesi ini
- <bullet ringkas, per fitur/keputusan>

## NEXT STEP (atomic — aksi pertama sesi berikut)
1. <perintah/aksi paling konkret>

## KEPUTUSAN penting (decision log)
- <apa yang diputuskan + alasan, agar tidak diulang/dibatalkan>

## KNOWN ISSUES (jujur D-1)
- <bug/limit yang belum kelar + dugaan penyebab>

## CONTEXT untuk resume
- Scope lock: <ref ke ringkasan>
- File kunci: <path penting>
```

## SOP menulis handoff (akhir tiap sesi / sebelum context penuh)

```bash
cd /home/user/webapp
# (tulis/Update HANDOFF.md via Write/Edit)
git add HANDOFF.md && git commit -m "handoff: sesi <n> — <fase> (<ringkas>)"
# auto-push Second Brain mengurus persistensi; opsional ProjectBackup
```
Pakai prefix commit `handoff:` agar mudah dicari sesi berikut:
`git log --oneline | grep handoff`.

## SOP membaca handoff (awal sesi berikut)

Dipanggil dari `sovereign-context-injection` fase ingest:
```bash
cat /home/user/webapp/HANDOFF.md 2>/dev/null
git log --oneline | grep -i handoff | head -3
```
→ Mulai langsung dari "NEXT STEP". Hormati "KEPUTUSAN penting"
(jangan batalkan tanpa alasan). Tangani "KNOWN ISSUES" lebih dulu jika
memblokir.

## Multi-agent handoff (jika pakai create_agent / sub-agent)

- Sebelum delegasi ke sub-agent (slides/docs/deep_research): sertakan
  ringkasan HANDOFF + scope lock di `query`/`instructions` (sub-agent
  TIDAK mewarisi context parent).
- Setelah sub-agent selesai: catat output URL + ringkasan hasil ke
  HANDOFF.md supaya tercatat di decision log.
- Patuhi `sovereign-credit-aware`: sub-agent = tier 4, konfirmasi dulu.

## D-1 Truth-Lock: batas platform

- TIDAK ada "Cowork" realtime multi-user bawaan di AI Dev; ini emulasi
  via file + git. Persistensi = repo, bukan state sesi.
- Auto-push Second Brain jalan di akhir turn; mid-turn push manual
  butuh injeksi `$GSK_TOKEN` (lihat system prompt) — jarang perlu.

## Failure modes

| Gejala | Fix |
|---|---|
| HANDOFF.md tidak ada di sesi baru | Sesi pertama project: buat baru dari template. |
| Konflik handoff (2 sesi paralel) | Pakai timestamp terbaru; gabungkan decision log manual. |
| Next step ambigu | Tulis ulang lebih atomic; 1 perintah konkret, bukan paragraf. |

## Out of scope

- Ingest sumber lain (upload/SB-Git) → `sovereign-context-injection`.
- Push/auth GitHub → `sovereign-github-push`.
- Orkestrasi fase → `sovereign-fullstack-cycle`.
