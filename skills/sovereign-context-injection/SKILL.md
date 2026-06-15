---
name: sovereign-context-injection
version: 1.1.0
description: >-
  SparkMind Sovereign CONTEXT OPS — fase 0 tiap sesi: ingest context
  dari semua sumber (file upload user, repo /home/user/webapp existing,
  SB-Git refs, README + git log lama, ProjectBackup), ekstrak brand +
  scope + data model + theme + constraint, lalu SCOPE LOCK (kunci ruang
  lingkup) + disiplin context window (jangan dump file besar mentah,
  ringkas dulu — hemat kredit). Dipanggil oleh fullstack-cycle FASE 0.
  Trigger: "ingest context", "resume project", "baca semua file",
  "lanjutkan kemarin", "scope lock", "context injection", "load konteks".
metadata:
  category: context
  owner: "Reza Estes / Haidar Faras + Gyss (spousal 50/50)"
  doctrine: "MASTER-ARCHITECT-PROMPT v5.0 + v7.0 + v8.0 OVERRIDE-LOCK · D-1 Truth-Lock"
  pairs_with:
    - sovereign-credit-aware        # hemat context = hemat kredit
    - sovereign-cowork-handoff      # baca handoff sesi sebelumnya
    - sovereign-fullstack-cycle     # dipanggil sebagai FASE 0
  requires:
    bins: ["ls", "cat", "grep", "git", "find", "unzip", "python3"]
    tools: []
---

# sovereign-context-injection

Fase 0 dari full cycle. Tujuan: agent paham SELURUH konteks project
sebelum nulis kode, tanpa membakar context window/kredit.

## Urutan ingest (cek berurutan, gabung yang relevan)

### 1. File upload user (paling sering)
```bash
ls -la /home/user/uploaded_files/ 2>/dev/null
# ZIP → extract dulu, JANGAN cat mentah:
for z in /home/user/uploaded_files/*.zip; do
  python3 -c "import zipfile,sys; print('\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))" "$z" 2>/dev/null
done
```
Aturan: untuk file besar (>200 baris / >20KB) **JANGAN `cat` utuh** —
pakai `head`, `grep`, atau `Read` dengan offset/limit. Ekstrak hanya
yang relevan ke scope.

### 2. Repo project existing
```bash
cd /home/user/webapp && git log --oneline -15 2>/dev/null
cat /home/user/webapp/README.md 2>/dev/null | head -60
ls /home/user/webapp/skills/*/SKILL.md 2>/dev/null   # skill pack
```

### 3. SB-Git knowledge refs (jika user kasih URL sb-git)
Clone ke `$HOME/sb-git-refs/<repo>` (BUKAN ke webapp), baca sebagai
referensi. Lihat aturan auth `$GSK_TOKEN` di system prompt.

### 4. Handoff sesi sebelumnya
→ Cek skill `sovereign-cowork-handoff`: baca `HANDOFF.md` / commit
`handoff:` terakhir untuk tahu di mana sesi lalu berhenti.

## Ekstraksi WAJIB (checklist)

Dari semua sumber, kunci nilai-nilai ini:

| Dimensi | Contoh |
|---|---|
| Brand / sub-brand | BarberKas, KuratorKas, MomentKas, PaceLokal, Nurani |
| Scope fitur (in/out) | CRUD apa, halaman apa, yang TIDAK termasuk |
| Data model | tabel D1 / key KV / bucket R2 + relasi |
| Theme / design | warna, font, tone, bahasa UI (id-ID) |
| Constraint khusus | Rp 0/bulan, free-tier, HP Android, NO VPS |
| Owner / doctrine | Reza/Haidar + Gyss · doctrine version aktif |

## SCOPE LOCK (output fase 0)

Tulis ringkasan 5-10 baris ke chat:
```
🔒 SCOPE LOCK — <brand>
- Goal      : <1 kalimat>
- In-scope  : <fitur inti>
- Out-scope : <yang TIDAK dikerjakan sesi ini>
- Data      : <D1/KV/R2 + model singkat>
- Constraint: <free-tier / lainnya>
```
Konfirmasi ke user **HANYA jika ada ambiguitas fatal** (1 pertanyaan
padat). Scope jelas → langsung lanjut ke fase 1 (minimal prompting).

## Disiplin context window (hemat kredit — D-1)

1. Ringkas, jangan tempel. File panjang → ekstrak poin, buang boilerplate.
2. Jangan re-read file yang sudah dibaca; pakai grep untuk bagian baru.
3. Banyak file mirip → baca 1 representatif + diff, bukan semua.
4. Catat temuan ke `HANDOFF.md` (lihat cowork-handoff) supaya sesi
   berikut tidak perlu ingest ulang dari nol.

## Failure modes

| Gejala | Fix |
|---|---|
| Upload kosong + repo kosong | Minta user jelaskan goal 1 paragraf / upload doctrine. |
| ZIP korup (BadZipFile) | Laporkan file mana; minta re-upload atau pakai sumber lain. |
| Scope bertabrakan antar dokumen | Pakai doctrine `version` tertinggi; konfirmasi konflik ke user. |
| Context terlalu besar | Ringkas agresif + simpan detail ke HANDOFF.md, jangan ke chat. |

## Out of scope

- Eksekusi build/deploy → `sovereign-fullstack-cycle` & komponennya.
- Persistensi antar-sesi → `sovereign-cowork-handoff`.
- Guard biaya tool → `sovereign-credit-aware`.
