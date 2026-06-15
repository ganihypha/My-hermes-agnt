---
name: sovereign-master-boot
version: 1.1.0
description: >-
  SparkMind Sovereign BOOT — entry point sesi baru dengan minimal
  prompting: satu perintah "activate semua skill" → agent membaca
  seluruh folder skills/, meng-load 6 skill sovereign sebagai playbook
  aktif, jalankan context ingest, lalu standby/eksekusi full cycle.
  Ini skill yang Gyss/Reza panggil PERTAMA di tiap sesi. Trigger:
  "activate semua skill", "boot", "load skills", "mulai sesi",
  "aktifkan playbook", "sovereign mode".
metadata:
  category: bootstrap
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  loads:
    - sovereign-credit-aware          # guard — load PERTAMA
    - sovereign-context-injection     # fase 0
    - sovereign-cowork-handoff        # resume antar-sesi (v4.0)
    - sovereign-workflow-ops          # operate harian
    - sovereign-computer-browser-use  # verifikasi/test UI (v4.0)
    - sovereign-gtm-engineering       # aset GTM sub-brand (v4.0)
    - sovereign-enterprise-patterns   # hardening produksi (v4.0)
    - sovereign-cf-byok-deploy        # deploy production
    - sovereign-github-push           # vcs
    - sovereign-fullstack-cycle       # orkestrator
  requires:
    bins: ["git", "gsk", "cat", "grep"]
    tools: []
---

# sovereign-master-boot

Entry point sesi. Tujuan: **Gyss/Reza cukup 1 kalimat**, agent
nge-load semua playbook sendiri dan langsung kerja.

## Cara user memicu (contoh kalimat valid)

> "Boot sovereign mode."
> "Activate semua skill di skills/, resume project, lanjut."
> "@sovereign-master-boot lanjutkan full cycle."

## Urutan boot (EXACT)

### 1. Temukan sumber skill (cek berurutan, pakai yang pertama ada)

```bash
# a. Folder skills/ di workspace (paling umum — auto-restore dari repo)
ls /home/user/webapp/skills/*/SKILL.md 2>/dev/null

# b. File upload user (ZIP pack / SKILL.md lepas)
ls /home/user/uploaded_files/ 2>/dev/null | grep -iE "skill|pack"

# c. SB-Git repo project (persisten)
gsk sb-git ls -r <project-repo> 2>/dev/null | grep -i skill
```
ZIP → extract dulu ke `/home/user/webapp/skills/` (struktur
`<nama-skill>/SKILL.md`).

### 2. Load SEMUA skill sebagai playbook aktif

```bash
for f in /home/user/webapp/skills/*/SKILL.md; do
  echo "=== $f ==="; cat "$f"
done
```
Baca dan PEGANG seluruh isi sebagai instruksi aktif sesi ini.
Urutan prioritas jika ada konflik antar skill:
**credit-aware (guard) > skill spesifik fase > fullstack-cycle
(orkestrator) > default system**.

### 3. Status laporan boot (1 blok singkat ke user)

```
🔱 SOVEREIGN BOOT OK
- Skills loaded : <n> (<daftar nama>)
- Plan akun     : <hasil gsk me — free/plus/pro> → mode <hemat>
- Workspace     : <ada/kosong> · last commit: <oneline>
- Siap          : sebut perintah ("full cycle" / "deploy" / "push" / ...)
```

### 4. Auto-continue (jika user sudah kasih perintah kerja)

Jika kalimat user mengandung perintah kerja (mis. "...lalu lanjut full
cycle" / "resume dan deploy") → JANGAN berhenti di laporan boot.
Langsung eksekusi:
1. `sovereign-context-injection` (ingest + scope lock)
2. `sovereign-fullstack-cycle` dari fase yang relevan / tersisa.

## Routing perintah pasca-boot

| User bilang | Skill yang dijalankan |
|---|---|
| "full cycle" / "kerjakan semua" / "selesaikan" | sovereign-fullstack-cycle (fase 0-7) |
| "jalankan" / "restart" / "log" / "reset db" | sovereign-workflow-ops |
| "deploy" / "production" / "BYOK" | sovereign-cf-byok-deploy (atau tanya BYOK vs hosted jika ambigu) |
| "push github" / "buat repo" | sovereign-github-push |
| "resume" / "baca context" / "lanjutkan kemarin" | sovereign-context-injection (+ sovereign-cowork-handoff baca HANDOFF.md) |
| "hemat kredit" / "budget" | sovereign-credit-aware (perketat mode) |
| "handoff" / "simpan progress" / "checkpoint" | sovereign-cowork-handoff |
| "test UI" / "cek tampilan" / "debug frontend" / "screenshot" | sovereign-computer-browser-use |
| "landing" / "waitlist" / "gtm" / "pricing page" | sovereign-gtm-engineering |
| "hardening" / "security" / "compliance" / "uu pdp" / "produksi" | sovereign-enterprise-patterns |

## Aturan instalasi skill update (maintenance)

User upload pack versi baru → bandingkan `version` frontmatter:
versi lebih tinggi → replace folder skill + commit
`chore: skills pack v<X>` → repo auto-push Second Brain →
sesi berikutnya boot otomatis pakai versi baru.

## D-1 Truth-Lock: batas platform

- Skill custom ini TIDAK terdaftar otomatis di `<available_skills>`
  sistem (registry dikontrol platform). Boot harus dipicu user 1x per
  sesi — itulah fungsi skill ini: menekan biaya prompting jadi
  1 kalimat.
- Folder `skills/` di repo project = jalur persistensi paling andal
  (auto-push tiap turn). ZIP upload = jalur portabel antar-project.

## Failure modes

| Gejala | Fix |
|---|---|
| skills/ tidak ada di mana pun | Minta user upload SOVEREIGN-SKILLS-PACK ZIP, atau rebuild dari Second Brain repo. |
| Versi skill konflik (duplikat beda versi) | Pakai `version` tertinggi; laporkan ke user. |
| User perintah ambigu pasca-boot | Tawarkan routing table di atas sebagai menu 1 baris. |

## Out of scope

- Isi playbook tiap skill → file SKILL.md masing-masing.
- Pembuatan skill baru → edit manual + bump version + re-zip
  (lihat `00-DEEP-DIVE-SKILLS-GENSPARK-AIDEV.md`).
