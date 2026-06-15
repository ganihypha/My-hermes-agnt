---
name: sovereign-github-push
version: 1.1.0
description: >-
  SparkMind Sovereign GitHub playbook — setup auth GitHub di sandbox
  Genspark AI Dev lalu push kode proyek ke repo GitHub user. Full
  workflow: setup_github_environment → git init/.gitignore → commit →
  remote → push. Termasuk aturan repo existing vs repo baru, force
  push first deploy, dan failure recovery. Dipakai semua sub-brand
  SparkMind (BarberKas / KuratorKas / PaceLokal / Nurani / MomentKas).
metadata:
  category: vcs
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK"
  requires:
    bins: ["git", "gh"]
    tools: ["setup_github_environment"]
---

# sovereign-github-push

Push kode proyek dari sandbox `/home/user/webapp` ke **GitHub repo
milik user**. Auth dikelola tool `setup_github_environment` — JANGAN
pernah minta user paste Personal Access Token di chat.

## Kapan dipakai

- User bilang: "push github", "push ke repo", "simpan ke github",
  "backup github", "buat repo".

## Urutan WAJIB

### 1. Auth — `setup_github_environment` (tool, bukan bash)

Panggil tool `setup_github_environment` **sebelum operasi GitHub apa
pun** (push, gh api, create repo).

- Tool ini mengkonfigurasi `git credential.helper store` +
  `gh auth login --with-token` secara global. Setelah sukses, perintah
  `git` / `gh` biasa langsung jalan TANPA token di URL.
- Jika GAGAL → **STOP**. Arahkan user ke tab **#github** untuk
  otorisasi (GitHub App + OAuth). JANGAN coba push manual / token di
  URL / API call tanpa setup sukses.
- Output tool berisi daftar repo yang sudah dipilih/diotorisasi user
  → **PRIORITASKAN repo existing itu**, jangan buat repo baru kecuali
  user eksplisit minta.

### 2. Pastikan git repo + .gitignore sehat

```bash
cd /home/user/webapp && git status || git init
```

`.gitignore` minimal wajib berisi:

```
node_modules/
dist/
.wrangler/
.dev.vars
.env
*.log
.pm2/
*.tar.gz
*.zip
*.backup
```

⚠️ Cek tidak ada secret ter-commit: `git grep -l "cfut_\|cfat_\|ghp_\|sk-" -- . || true`
Jika ketemu → hapus dari file + commit ulang SEBELUM push.

### 3. Commit

```bash
cd /home/user/webapp && git add . && \
  git commit -m "feat: <deskripsi singkat perubahan>" || echo "nothing to commit"
```

Konvensi pesan: `feat:` / `fix:` / `docs:` / `chore:` + bahasa jelas.

### 4. Remote + push

```bash
cd /home/user/webapp
git remote get-url origin 2>/dev/null || \
  git remote add origin https://github.com/<OWNER>/<REPO>.git

git branch -M main

# Repo BARU / kosong → force push pertama:
git push -f origin main

# Repo EXISTING dengan history → push normal:
git push origin main
```

Selalu branch `main` kecuali user minta lain.

### 5. Buat repo baru (HANYA jika user eksplisit minta)

```bash
gh repo create <OWNER>/<REPO> --private --source=/home/user/webapp \
  --remote=origin --push
```

Default `--private` untuk proyek SparkMind (doctrine PUBLIC-SAFE:
dokumen internal jangan ke repo public tanpa sanitasi).

### 6. Verifikasi

```bash
cd /home/user/webapp && git log --oneline -3 && git remote -v
gh repo view <OWNER>/<REPO> --json url,visibility 2>/dev/null || true
```

Update `README.md`: tambahkan URL GitHub di section URLs.

## Failure modes

| Gejala | Penyebab / fix |
|---|---|
| `setup_github_environment` gagal | User belum otorisasi. STOP, arahkan ke tab #github. |
| `push` rejected (non-fast-forward) | Repo remote punya history beda. Jika first deploy & user setuju → `git push -f origin main`. Jika tidak → `git pull --rebase origin main` dulu. |
| `permission denied` saat push | GitHub App belum di-install ke repo itu. User harus tambah repo di setting GitHub App. |
| `gh: not logged in` | `setup_github_environment` belum dipanggil di sesi ini. Panggil ulang. |
| Secret terlanjur ter-push | Rotate token segera + `git filter-repo` / commit penghapusan + force push. Beritahu user eksplisit. |

## Out of scope

- Deploy Cloudflare → skill `sovereign-cf-byok-deploy`.
- Backup tar.gz / AI Drive → skill `sovereign-workflow-ops`.
- SB-Git (knowledge repo Genspark) → bukan GitHub; pakai mekanisme
  auto-push genspark remote bawaan (baca: `sovereign-context-injection`).
- Full pipeline end-to-end → skill `sovereign-fullstack-cycle`
  (skill ini = FASE 6-nya).
