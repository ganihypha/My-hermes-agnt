# 🔬 DEEP DIVE — Fitur "Skills" (SKILL.md) di Genspark AI Developer

**Owner**: Reza Estes / Haidar Faras + Gyss (spousal 50/50)
**Doctrine**: MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 — D-1 Truth-Lock BRUTAL HONEST
**Date**: 2026-06-11
**Status**: CANONICAL · hasil inspeksi LANGSUNG dari dalam sandbox AI Dev (bukan tebakan)
**Bundle**: `SOVEREIGN-SKILLS-PACK-v1.0`

---

## 1. Apa itu Skill di Genspark AI Developer

Skill = **folder berisi file `SKILL.md`** yang memberi agent instruksi
terstruktur untuk tugas spesifik. Pola ini sama dengan standar industri
"Agent Skills" (Claude Skills, agentskills.io, AI SDK):

```
nama-skill/
├── SKILL.md        ← WAJIB (frontmatter YAML + instruksi markdown)
├── scripts/        ← opsional (script executable)
├── references/     ← opsional (dokumen referensi tambahan)
└── assets/         ← opsional (template, gambar, dll)
```

Di environment AI Dev, skill ter-mount di `/mnt/skills/<nama>/SKILL.md`
dan diaktifkan via tool `activate_ai_developer_skill(skill_name=...)`.
Tool ini mengembalikan: `instructions` (isi SKILL.md), `path` aktual,
`available_references/scripts/assets`.

## 2. Format SKILL.md yang VALID (hasil inspeksi skill bawaan)

Saya bongkar langsung skill bawaan `cf-byok-deploy` di sandbox. Format
canonical-nya:

```markdown
---
name: nama-skill                  # WAJIB, lowercase-kebab-case
version: 1.0.0                    # semver
description: >-                   # WAJIB — INI YANG MEMICU TRIGGER.
  Deskripsi padat: kapan skill dipakai, apa yang dicakup,
  kata kunci yang user mungkin ucapkan.
metadata:
  category: hosted|ops|vcs|...    # bebas, untuk organisasi
  requires:
    bins: ["wrangler", "npx"]     # binary yang dibutuhkan
---

# nama-skill

Penjelasan + langkah eksekusi step-by-step + failure modes + out of scope.
```

**Kunci truth-lock**: yang menentukan skill ter-trigger adalah
`description` di frontmatter (agent membaca daftar skill + description,
lalu memutuskan activate). Body markdown = playbook yang dieksekusi
SETELAH aktif. Jadi description harus berisi trigger words.

## 3. Mekanisme trigger di AI Dev (verbatim dari system behavior)

1. **Explicit mention** `@nama-skill` → langsung aktif.
2. **Task match description** → agent konfirmasi dulu ke user.
3. **Deploy routing khusus**: jika ada >1 skill deploy
   (`cf-byok-deploy` vs `gsk-hosted-deploy`), agent WAJIB tanya user
   pilih jalur mana — kecuali user sudah bilang (mis. "pakai akun CF
   saya" ⇒ BYOK).

## 4. Cara "upload" / inject skill custom ke environment Anda — BRUTAL HONEST

| Jalur | Bisa? | Catatan |
|---|---|---|
| **A. Upload file SKILL.md / ZIP ke chat** | ✅ BISA | Agent extract → baca → ikuti sebagai playbook. Paling simpel. Tapi TIDAK auto-terdaftar di `<available_skills>` — agent harus membacanya manual tiap sesi. |
| **B. Simpan di SB-Git / Second Brain repo** | ✅ BISA & RECOMMENDED | Commit folder `skills/` ke repo genspark project. Sesi berikutnya: agent clone/baca → playbook persisten lintas-sesi. Inilah "sovereign storage" Anda. |
| **C. `gsk init-skills`** | ✅ ADA (CLI) | `gsk init-skills -o .gsk/skills [--agent claude]` — meng-copy dokumen skill GSK ke proyek untuk discovery agent (Claude Code/Gemini config). Untuk pemakaian via tool eksternal. |
| **D. Tulis langsung ke `/mnt/skills/`** | ⚠️ TIDAK RELIABLE | Mount kadang read-only / tidak ready (terverifikasi di sesi ini: warning `project_storage_mount_not_applicable`). Jangan diandalkan. |
| **E. Registrasi resmi ke `<available_skills>` sistem** | ❌ TIDAK BISA dari sandbox | Daftar skill bawaan dikontrol platform Genspark. Tidak ada API publik user untuk register skill global. Jujur: ini batas platform saat ini. |

**Kesimpulan praktis (jalur sovereign)**: format ZIP `skills/<nama>/SKILL.md`
→ upload ke chat ATAU commit ke SB-Git project repo → tiap sesi baru
bilang: *"baca dan ikuti skills/ di repo"* atau *"@sovereign-cf-byok-deploy"*
sambil lampirkan/refer file-nya. Agent akan mengeksekusi sesuai playbook.

## 5. Skill bawaan yang SUDAH ada di environment ini

| Skill | Fungsi |
|---|---|
| `cf-byok-deploy` | Deploy CF Pages pakai token CF user sendiri (Deploy panel). |
| `gsk-hosted-deploy` | Deploy CF via akun Cloudflare yang di-host Genspark (`gsk hosted_*`), tanpa token user; ada approval handshake untuk operasi destructive. |

Tools internal lain yang relevan workflow: `setup_github_environment`,
`setup_cloudflare_api_key`, `meta_info`, `ProjectBackup`,
`GetServiceUrl`, `gsk` CLI (sb-git, sb-gist, aidrive, upload/download,
hosted, dst).

## 6. Isi pack ini (3 skill custom SparkMind)

| Skill | Trigger | Cakupan |
|---|---|---|
| `sovereign-cf-byok-deploy` | "deploy cf", "byok", "production" | Auth token → build → pages create → D1 prod migrate → deploy → secrets → domain → verify |
| `sovereign-github-push` | "push github", "buat repo" | setup_github_environment → gitignore/secret-scan → commit → remote → push → verify |
| `sovereign-workflow-ops` | "start", "restart", "log", "reset db", "backup" | PM2 SOP → D1 local → git discipline → ProjectBackup + AI Drive → README discipline |

Ketiganya saling cross-reference (out-of-scope section) supaya tidak
tumpang tindih — sama seperti pola skill bawaan platform.

## 7. Cara pakai (SOP Gyss)

1. **Simpan ZIP** `SOVEREIGN-SKILLS-PACK-v1.0.zip` di arsip Anda / AI Drive.
2. **Sesi baru AI Dev**: upload ZIP (atau refer dari repo) + perintah:
   > "Extract dan ikuti skill `sovereign-cf-byok-deploy` untuk deploy."
3. Atau commit folder `skills/` ke project repo (sudah dilakukan di
   project ini — auto-push ke Second Brain repo Anda).
4. Update skill = edit SKILL.md → naikkan `version` → re-zip.

---
*D-1 Truth-Lock: dokumen ini berbasis inspeksi langsung sandbox
(2026-06-11), bukan klaim marketing. Batasan jalur E adalah fakta
platform hari ini dan bisa berubah.*
