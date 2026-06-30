# PM-STATUS-A — Qooma Backend · Dev A (Nathan)

> **Per-dev tracker untuk slot A (Nathan).** PM A + Executor A komunikasi **hanya** via file ini. Roll-up short summary ke `PM-STATUS-PARENT.md §2` setelah tiap VERDICT atau end-of-session.
>
> **PM B, PM C, Executor B, Executor C — JANGAN edit file ini.** File ini private ke slot A.
>
> **Identity check**: di response pertama session WAJIB confirm `Role: PM | Executor`, `Slot: A (Nathan)`. Bila user belum sebut slot — STOP, tanya dulu (lihat `KICKOFF.md §4`).
>
> Format block di §2 Active assignments **append-only** (lihat `EXECUTOR-PROTOCOL.md §0.5` & `PM-AGENT.md §0.4`).

---

## 0. Current focus (slot A)

- **Day**: cycle 1 — Slot A ONLINE (Nathan hadir, 2026-06-30). First Slot A session.
- **Active task**: T01 (foundation sign-off) — ASSIGNMENT issued §2, awaiting Executor A PLAN.
- **Branch**: Slot A foundation work bases on `feat/auth-core` (sequencing decision — §2 + §6).
- **Next gate (global)**: G1 (criteria-based, no deadline) — lihat `PM-STATUS-PARENT.md §5`.
- **My queue (un-parked)**: **T01** → adopt **T02** + adopt **T11** → **T03** → **T04** (see §1, §2, §8).
- **Adopt-only (NO re-exec)**: T02 (migration) + T11 (tenant-guard) already executed cross-slot by Slot B on `feat/auth-core` (deviations §4-D05 / §4-D01), not yet merged to main. Slot A = canonical adopt/sign-off only.

---

## 1. Task tracker (slot A — PM A authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=A. PM A update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T01 | pnpm install verify + `make check` green | `wip · PLAN ACKED (2 amendments)` | — | ASSIGNMENT §2; PLAN ACKED cycle 1 w/ reorder (start→check) + lockfile guard. Verify on `feat/auth-core`. Verification only, no code change. Gate **G1**. Awaiting SUBMIT. |
| T02 | Initial Prisma migration (tiers/hotels/users/sessions/prt) | `ADOPT-pending (exec by Slot B §4-D05)` | — | **Canonical Slot A**. Already FULL APPROVE by PM B on `feat/auth-core` (NOT merged to main). Slot A = **adopt/sign-off, NO re-exec**. Adopt gated on T01 green. Migration: `prisma/migrations/20260630042913_init`. |
| T11 | tenant-guard middleware (Fastify plugin) | `ADOPT-pending (exec by Slot B §4-D01)` | — | **Canonical Slot A**. APPROVE-PARTIAL by PM B on `feat/auth-core`. Slot A = **adopt/sign-off, NO re-exec**. Lives `src/plugins/tenant-guard.ts`. Gate **G2**. |
| T03 | Tiers seed (4 rows: lite/professional/luxury/enterprise) | `assigned · BLOCKED-until T01 + adopt-T02` | — | Deps T02 (tables) + real PrismaClient. **Branch from `feat/auth-core`** (§2 decision). Writes `prisma/seeds/`. Idempotent. DoD §2. Gate **G1**. |
| T04 | `seed-super-admin` CLI (`pnpm seed:super-admin`) | `assigned · BLOCKED-until T01 + adopt-T02` | — | Deps T02 + argon2 (both on `feat/auth-core`). **Branch from `feat/auth-core`** (§2). Adds `seed:super-admin` script + CLI. Must reuse auth argon2 params. DoD §2. Gate **G1**. |

---

## 2. Active assignments (append-only)

> **Executor A** append `ASSIGNMENT` block saat claim task. **PM A** append `ACK` / `VERDICT` sub-block di bawah block executor — JANGAN edit block lama.

---

### 🧭 SEQUENCING DECISION — Slot A foundation (PM A, 2026-06-30)

**Context**: Slot A baru online. Foundation T01/T03/T04 un-parked dari PARENT §1. T02 (migration) + T11 (tenant-guard) sudah dieksekusi cross-slot oleh Slot B (deviasi §4-D05 & §4-D01) di branch `feat/auth-core` — **belum merge ke main**. Slot A = adopt/sign-off, **JANGAN suruh ulang**.

**Verified git ground-truth (PM A, read-only inspection 2026-06-30):**

| Artifact | `main` | `feat/auth-core` |
| --- | --- | --- |
| `prisma/schema.prisma` (5 model: Tier/Hotel/User/Session/PRT) | ✅ identical | ✅ identical |
| `prisma/migrations/20260630042913_init/` | ❌ **absent** | ✅ present |
| `prisma/seeds/index.ts` | placeholder (boilerplate) | identical placeholder → **T03 belum ditulis** |
| `src/core/prisma/prisma-client.ts` | `{}` placeholder | real `PrismaClient` singleton (import `.prisma/client`) |
| deps `argon2` + `@fastify/cookie` | ❌ absent | ✅ present (§4-D02/D03) |
| script `seed:super-admin` | ❌ (cuma `seed`) | ❌ → **T04 harus tambah** |

**DECISION — Slot A foundation work bases on `feat/auth-core`, BUKAN tunggu merge ke main.**

Rationale:
1. T03 + T04 hard-blocked oleh 3 artefak yang **hanya** ada di `feat/auth-core`: init migration (tabel DB), real PrismaClient singleton, dan `argon2` (T04 hash password). `main` tidak bisa menjalankan seed/CLI sama sekali.
2. Tunggu merge `feat/auth-core → main` = couple start Slot A ke penyelesaian cycle-7 Slot B (T02-sub-1) + batch VERDICT + merge. Itu idle Slot A tanpa alasan — pekerjaan T03/T04 independen di level file.
3. File T03/T04 (`prisma/seeds/*`, CLI script, `package.json scripts`) **tidak bertabrakan** dengan file Slot B (`src/modules/auth`, `src/modules/users`, `src/plugins`). Collision risk rendah & terlokalisasi.

**Integration plan (hindari kekacauan merge):**
- Executor A branch dari `origin/feat/auth-core` → branch `feat/seed-foundation` (atau `feat/foundation-seed`).
- Slot A foundation di-PR/rebase **setelah** `feat/auth-core` landing di main. Karena commit Slot A seed-only (file berbeda), rebase onto main trivial — tidak overlap dengan diff Slot B.
- Bila PO/Parent kemudian memutuskan `feat/auth-core` membawa segalanya, commit Slot A bisa cherry-pick — tapi default = stacked branch + rebase-onto-main.

**Sequence (PM A, slot-A authority via bootstrap delegation, no Parent PM):**
**T01 (sign-off, blocking)** → **adopt-T02** + **adopt-T11** (PM-led review, paralel) → **T03** → **T04**.
T03 & T04 saling independen (dua-duanya cuma butuh T02 tables) — boleh dikerjakan urut atau di-stack.

---

### ASSIGNMENT T01 — routed to exec-A (Nathan) by PM A at cycle 1 (2026-06-30)
- **Task**: pnpm install verify + `make check` green — foundation sign-off (G1 criterion).
- **Branch**: `feat/auth-core` (checkout read-only — verifikasi state integrasi yang menuju main). **TIDAK ada perubahan file** — ini verification + evidence task.
- **Routed from**: PARENT §1 T01 (un-parked oleh PM A, Slot A online).
- **Why feat/auth-core, bukan main**: `main` cuma boilerplate placeholder (prisma-client `{}`, seeds placeholder); `make check` di sana tidak menguji stack auth nyata. `feat/auth-core` = state nyata yang akan jadi main; sign-off di sini sekaligus de-risk merge. (PM B lapor 155 unit test pass di cycle 6 close — T01 = konfirmasi cepat.)

**DoD T01:**
- [ ] `git checkout feat/auth-core` (atau worktree) — confirm branch + HEAD commit hash di SUBMIT.
- [ ] `pnpm install` clean — honor `pnpm-lock.yaml`, **tidak** ada perubahan lockfile (`git status` clean setelah install). Report pnpm + node version.
- [ ] `make check` **green** — lint (`--max-warnings 0`) + format:check + typecheck (`tsc --noEmit`) + test:unit. Paste ringkasan hasil (jumlah test pass, 0 lint warning).
- [ ] `make start` — docker compose up (Postgres host **5433**, Redis **6380** per pre-D01 fix) + api boot tanpa error. (Bila host env tak punya Docker, report sebagai GAP — jangan fail diam-diam.)
- [ ] `make db-migrate` (`prisma migrate dev`) apply `20260630042913_init` ke DB lokal exit 0 — confirm 5 tabel ada.
- [ ] **No file change** — `git diff` kosong di akhir. SUBMIT = evidence only (command output).
- [ ] Drift floor pada working tree: N/A (no edits), tapi confirm `git status` clean.

**Catatan PM A**: Ini sign-off cepat, bukan re-build. Kalau ada step yang butuh resource yang tak tersedia di env (mis. Docker), raise GAP — aku decide apakah descope step itu untuk G1 sign-off atau eskalasi. Setelah T01 green → aku trigger adopt-T02 + adopt-T11, lalu un-block T03.

_Awaiting Executor A PLAN T01._

#### PLAN T01 — exec-A (Nathan) at cycle 1 (2026-06-30)

**Scope recap**
- T01 = foundation sign-off (G1), **verification-only, no file change**. Checkout `feat/auth-core` (state nyata menuju main), provision toolchain, jalankan `make check` hijau, `make start` (deps up), `make db-migrate` apply `20260630042913_init`, konfirmasi 5 tabel + `git status`/`git diff` bersih. SUBMIT = command output evidence only.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nathan) ✓
- CLAUDE.md loaded ✓ ; EXECUTOR-PROTOCOL.md read ✓
- Task spec read: PM-STATUS-A.md §2 ASSIGNMENT T01 (DoD 7 butir) + §1 tracker row T01
- Parent docs spot-read: `Makefile` (install/start/check/db-migrate targets), `docker-compose.yml` (pg host **5433**, redis **6380**), `package.json` (`packageManager: pnpm@9.0.0`, scripts)
- Dependencies: none (T01 = root foundation, §1) ✓
- `make typecheck`/`make lint` clean: **N/A pre-ACK** — running these IS the T01 deliverable; akan dieksekusi post-ACK pada `feat/auth-core` (butuh pnpm yang di-provision via `make install`). Flag bila tidak hijau.
- Scaffolder risk: none. Tooling note di bawah.

**Verified ground-truth (read-only, pre-ACK):**
- `origin/feat/auth-core` HEAD = `25d20078fea72a8906eda64cb4634b778007adb2` ("test(prisma): smoke suite — connection + UNIQUE + CHECK trip", 2026-06-30 12:45 +0700).
- `origin/main` HEAD = `d3ca0ce3` (PM A roll-up). Working tree currently on `main`, **clean**.
- Init migration present on `feat/auth-core`: `prisma/migrations/20260630042913_init/migration.sql` + `migration_lock.toml` ✓.
- Toolchain available: `corepack` 0.34.0 (→ akan provision `pnpm@9.0.0` via `make install`, **bukan** `pnpm add` — tidak butuh approval PO), `docker compose` v5.1.2, node `v22.21.1` (memenuhi `engines.node >=20`). Docker daemon up; container project lain di host (`mvp-backend-*`) di port 5432/6379 → **tidak bentrok** dengan 5433/6380 milik kita.

**Files to create / modify**
- **None.** Verification task — `git diff` harus kosong di akhir.

**Approach** (commands yang akan dijalankan post-ACK, urut):
1. `git checkout feat/auth-core` (HEAD `25d2007`) — confirm branch + hash.
2. `make install` — **touches root**: jalankan `corepack enable && corepack prepare pnpm@9.0.0 --activate` lalu `pnpm install --frozen-lockfile` (honor lockfile — konfirmasi `git status` clean, no lockfile churn) + `prisma generate`.
3. `make check` — lint (`--max-warnings 0`) + format:check + typecheck + test:unit. Paste ringkasan (jumlah test pass, 0 warning).
4. `make start` — `docker compose up -d postgres redis` (5433/6380) → wait healthy → `prisma generate` → `db-migrate`.
5. `make db-migrate` (`prisma migrate dev`) apply `20260630042913_init` → verifikasi 5 tabel (tiers/hotels/users/sessions + prt) via `\dt`.
6. `git status` + `git diff` → konfirmasi bersih (no file change, no lockfile change).

**Env note** (bukan GAP — minor): `.env` sudah ada di working tree (untracked, gitignored). DoD T01 tidak sebut env setup. `make start`/`db-migrate`/config-zod mungkin butuh `DATABASE_URL`/`JWT_*`/`ENCRYPTION_KEY` ter-isi. Intent: pakai `.env` existing; **bila** `make check`/`start` gagal karena env key kosong, isi `JWT_*`/`ENCRYPTION_KEY` via `openssl rand -hex 32` (per brief bootstrap original) — `.env` tidak akan di-commit (gitignore + §0.7). Akan kureport hasilnya di SUBMIT, tidak diam-diam.

**GAPs / questions**
- (none blocking T01) — flag terpisah utk task nanti (bukan minta resolve sekarang): `.env.example` belum punya `SEED_SUPER_ADMIN_*` (→ T04) & `JWT_ACCESS_TTL=8h` vs kode 15m. Akan kuraise GAP formal saat T04 aktif, tidak kusentuh `.env.example`/docs sekarang.

Awaiting PM A ACK.

##### PM A ACK — T01 PLAN APPROVED with 2 mandatory amendments + 3 notes (cycle 1, 2026-06-30)

PLAN sound: verification-only, ground-truth verified (HEAD `25d2007`, migration present, toolchain ok, ports 5433/6380 no-collision), no file change, good deferred-GAP discipline (T04 `.env.example`/TTL — agreed, **jangan** sentuh sekarang, raise formal saat T04 aktif). **Proceed to coding** setelah incorporate di bawah — no re-PLAN, reflect amendments di SUBMIT evidence.

**⚠️ Amendment #1 (MANDATORY — reorder, else spurious fail).** Approach-mu jalankan `make check` (step 3) SEBELUM `make start` (step 4). Itu akan gagal: `src/core/prisma/__tests__/prisma-client.smoke.test.ts` bernama `.smoke.test.ts` → match pattern `test:unit` (`__tests__/.*\.test\.ts`) → ikut jalan di `make check`. Smoke ini **hit LIVE Postgres + tabel ter-migrasi** (connection round-trip + UNIQUE(hotel_id,email) trip + mutual-exclusion CHECK trip — lihat file header + `jest.config.json` `testMatch`). Tanpa DB up, `make check` merah di smoke = false negative.
- **Fix — urutan benar**: `checkout feat/auth-core` → `make install` → **`make start`** (DB up + healthy + prisma-generate + db-migrate, per `Makefile:46-50`) → **`make check`** (smoke konek ke DB ter-migrasi) → `git status`/`git diff` clean.
- `make db-migrate` eksplisit di DoD-mu **sudah dilakukan di dalam `make start`** (`Makefile:50`). Re-run untuk konfirmasi exit 0 + 5 tabel boleh (idempotent), tapi taruh SETELAH start sebagai evidence "5 tabel", bukan sebagai apply pertama.

**⚠️ Amendment #2 (MANDATORY — lockfile guard).** `make install` = `pnpm install --frozen-lockfile || pnpm install` (`Makefile:38`). Bila `--frozen-lockfile` gagal, fallback `|| pnpm install` **mutate `pnpm-lock.yaml`** → langgar DoD "no file change / git clean".
- **Fix**: setelah `make install`, cek `git status`. Bila `pnpm-lock.yaml` modified → **STOP**: artinya lockfile di `feat/auth-core` out-of-sync dengan `package.json` (deps argon2/@fastify/cookie §4-D02/D03). Raise GAP, `git checkout -- pnpm-lock.yaml` untuk discard, **JANGAN commit**. Jangan tutupi — ini finding nyata yang harus aku lihat (juga sinyal untuk merge-readiness feat/auth-core).

**Note #1 (non-blocking) — Node version.** Kamu di node v22.21.1; standar proyek Node 20 LTS (`CLAUDE.md §2`), `engines.node >=20` izinkan 22. OK untuk local sign-off; CI (Node 20) = gate kanonik. `argon2` itu native addon — bila ada check yang gagal HANYA di 22 (rebuild native / API diff), catat eksplisit, jangan anggap defect branch. Bila perlu, retry di Node 20.

**Note #2 (non-blocking) — env/zod.** Reuse `.env` existing (gitignored — never commit ✓). Bila harus isi key: `ENCRYPTION_KEY` wajib penuhi zod schema di `src/core/config/env.ts` (AES-256-GCM → `openssl rand -hex 32` = 64 hex char = 32 byte, benar). Spot-check constraint `env.ts` dulu biar check tidak gagal karena alasan salah. Report di SUBMIT key mana (kalau ada) yang kamu generate.

**Note #3 (bonus — early adopt-T02 signal).** Saat `make start` jalankan `prisma migrate dev`: bila ia mau CREATE migration baru / modifikasi `prisma/migrations/*` atau `schema.prisma` (git dirty) → **STOP + report**. Itu sinyal drift schema↔migration = finding nyata, jangan di-accept. Clean apply (no file baru) = evidence positif untuk adopt-T02 nanti.

**On green → SUBMIT** dengan command output: install (+ konfirmasi lockfile clean) · start · check (jumlah test pass / 0 warning) · db-migrate exit 0 + 5 tabel · `git status`/`git diff` final clean. Aku verify + VERDICT, lalu trigger adopt-T02 + adopt-T11 → un-block T03.

---

### 📋 PRE-STAGED — adopt + T03/T04 (DoD visible up-front; ASSIGNMENT formal di-issue setelah T01 green)

> Di-stage supaya Executor A lihat seluruh jalur. Belum aktif sampai dependency tercapai.

**adopt-T02 (PM-led, gated on T01 green)** — Slot A canonical sign-off, NO re-exec:
- PM A review (read-only, sebagian sudah aku lakukan): migration `20260630042913_init/migration.sql` match `prisma/schema.prisma`; mutual-exclusion CHECK `(role='super_admin' AND hotel_id IS NULL) OR (role<>'super_admin' AND hotel_id IS NOT NULL)` ada; `UNIQUE(hotel_id,email)` ada; FK ON DELETE (RESTRICT hotels/tiers/users, CASCADE sessions/PRT) ada; `prisma-client.ts` = real singleton.
- Executor A role: konfirmasi migration apply green + smoke test pass di env-mu (sudah tercakup T01 `make db-migrate`). Tidak nulis ulang.
- Output: PM A `VERDICT adopt-T02 — ADOPTED` + roll-up note PARENT §2; ownership-of-record Slot A diteguhkan.

**adopt-T11 (PM-led, gated on T01 green)** — sama pola: review `src/plugins/tenant-guard.ts` + unit suite vs spec `01-auth-identity §6` (req.session + req.tenantScope 4 role, deny-by-default 401, public-route bypass). NO re-exec.

**T03 — Tiers seed (gated on adopt-T02):**
- Branch dari `feat/auth-core`. Tulis seed di `prisma/seeds/` (ganti placeholder `index.ts` atau tambah `prisma/seeds/tiers.ts` + panggil dari `index.ts` — executor pilih di PLAN).
- 4 row idempotent (`upsert` by unique `name`): `lite` / `professional` / `luxury` / `enterprise`.
- Kolom per schema `Tier` + `01-auth-identity §1.4` (baca spec untuk nilai eksak): `displayName`, `outboundQuotaMonthly` (2000/4000/8000/-1), `agentCap` (1/3/5/-1), `agentMinimum`, `userCap` (2/4/6/-1), `departmentCap` (1/3/5/-1), `features` JSONB. `-1` = unlimited (enterprise).
- DoD: `make db-seed` (`pnpm seed`) run idempotent — re-run **tidak** dupe (4 row tetap 4). Integration/smoke test: 4 tier ada + re-run idempotent. `make check` green. Drift floor (no `any`/`console.log`/`throw new Error`/default export di luar entrypoint — `console.warn` OK di script). Pakai real PrismaClient singleton (import `.prisma/client` pattern, lihat `prisma-client.ts`).

**T04 — seed-super-admin CLI (gated on adopt-T02):**
- Branch dari `feat/auth-core`. Tambah script `"seed:super-admin"` di `package.json scripts` (BUKAN dep baru — tidak perlu PO). CLI di `prisma/seeds/super-admin.ts` (atau `scripts/`).
- Baca env `SEED_SUPER_ADMIN_EMAIL` + `SEED_SUPER_ADMIN_PASSWORD` (validasi present via `core/config` pattern; fail jelas bila kosong).
- Idempotent INSERT 1 row: `role='super_admin'`, `hotel_id=NULL`, `mustRotatePassword` per spec (`01-auth-identity §1.3` — cek apakah true/false untuk seeded super admin), `name` default. Idempotency by `email` (atau by role+null-hotel — executor justify di PLAN).
- **HARD DoD — password hash**: WAJIB hash via argon2 dengan **parameter sama** dengan login path (`src/modules/auth/adapters/argon2-hasher.adapter.ts` / `ports/password-hasher.port.ts`). Kalau beda config, login super-admin gagal verify. Executor: reuse hasher via auth barrel bila di-export, ATAU instansiasi `Argon2Hasher` yang sama. Jangan hand-roll argon2 dengan param berbeda. Flag di PLAN cara import (hindari cross-module internal-import drift — script seed di luar `src/modules` jadi bukan modul, tapi reaching ke `adapters/` tetap di-justify).
- Respect mutual-exclusion CHECK (hotel_id NULL untuk super_admin) — INSERT harus lolos constraint.
- DoD: `pnpm seed:super-admin` run sukses; re-run idempotent (tidak dupe / tidak error); row terverifikasi (`role='super_admin'`, `hotel_id IS NULL`); password yang di-seed bisa di-verify oleh `Argon2Hasher.verify`. `make check` green. Drift floor.

---

<!--
TEMPLATE — copy untuk task baru:

### ASSIGNMENT T## — claimed by exec-A (Nathan) at H{N} HH:MM
- Branch: feat/<modul>-<short>
- Routed from: PM-STATUS-PARENT.md §1 T## (Parent PM assigned)

#### PLAN T## — exec-A (Nathan) at H{N} HH:MM

**Scope recap**
- ...

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nathan) ✓
- CLAUDE.md loaded ✓
- Task spec read: <doc:section>
- Parent docs spot-read: <list>
- Dependencies: T## ✓
- `make typecheck` clean ✓ ; `make lint` clean ✓
- Scaffolder risk: none / <tool>

**Files to create**
```
src/modules/<name>/...
```

**Files to modify**
- src/entrypoints/api.ts — ...

**Approach**
<1 paragraf>

**GAPs / questions**
- (none) / GAP T##-#1 — ...

Awaiting PM A ACK.

##### PM A ACK — T## PLAN APPROVED, proceed to coding (H{N})
- (atau) PM A REJECT-PLAN — fix sebelum mulai: <list>

#### SUBMIT T## — exec-A (Nathan) at H{N} HH:MM (attempt 1)

Task: <title>
Files changed: <count>
  - ...

DoD self-check
- [x] ...

Quality gate
- `make check`: PASS
- ...

Drift scans
- ...

Security check
- ...

Test evidence
- Unit: <n>
- Integration: <n>

Notes
- ...

Requesting PM A VERDICT.

##### VERDICT T## — APPROVED (H{N}, revisi N) by PM A
- All DoD verified ✓
- Drift scans clean ✓
- `make check` PASS confirmed by PM rerun
- → §1 task tracker updated; row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

(atau)

##### VERDICT T## — REJECT (revisi N) by PM A

⛔ Items to fix:

**Item #1 — <kategori>** `src/.../<file>.ts:<line>`
- **Violation**: <pelanggaran>
- **Fix**: <satu kalimat fix-path>

**Item #2 — ...**
- ...

Re-run `make check` after fix, confirm pass, resubmit (attempt N+1).

(atau)

##### VERDICT T## — ESCALATE by PM A
- Reason: <gap planning / open Q PO>
- Escalated to Parent PM at H{N} HH:MM (will reach PO via PARENT §3)
- Executor A: pick task lain dari §8 sementara

-->

---

## 3. Slot A open questions (mirror to PARENT §3)

> PM A catat di sini ketika executor A raise `GAP` atau `BLOCKED`. Setelah resolve atau eskalasi ke Parent PM, update status. Parent PM consolidate ke `PM-STATUS-PARENT.md §3`.

| ID            | Question | Source         | Status | Resolution |
| ------------- | -------- | -------------- | ------ | ---------- |
| —             | —        | —              | —      | —          |

---

## 4. Drift baseline (slot A files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

> PM A jalankan drift scan per `PM-AGENT.md §3 Step 2` setiap SUBMIT + end-of-day full scan untuk slot A's touched files.

---

## 5. Standup log slot A (latest di atas)

> PM A post daily standup di sini, lalu post 1-2 baris ringkas ke `PM-STATUS-PARENT.md §6` (yang Parent PM consolidate jadi cross-team report).
>
> Format: per `PM-AGENT.md §7`.

### cycle 1 — 2026-06-30 (Slot A ONLINE — Nathan hadir, first assignment issued)

```
QOOMA BE A (Nathan) — Standup — cycle 1 (criteria-based, no deadline)

✅ Approved hari ini
- (none — baru online)

🔄 In progress
- T01 (foundation sign-off) — ASSIGNMENT issued §2, awaiting Executor A PLAN.

⛔ Rejected
- (none)

🚨 Eskalasi ke Parent PM
- (none — sequencing T03/T04 di-decide sendiri per bootstrap delegation: branch dari feat/auth-core, §2.)

📅 Gate status (global)
- Next gate: G1 (criteria-based) — Slot A foundation T01..T04 + adopt T11. PARENT §5.
- Open Qs slot A: 0.

📈 Progress slot A
- 0 / 5 approved (T01, T02-adopt, T11-adopt, T03, T04). T02 + T11 sudah exec by Slot B (adopt-pending, no re-exec).

🎯 Fokus besok
- T01 PLAN ACK → SUBMIT VERDICT → trigger adopt-T02 + adopt-T11 → un-block T03.
```

### H0 — (Nathan onboard, awaiting first assignment) — superseded oleh cycle 1 di atas

---

## 6. Slot A incidents / lessons (own-scope only)

> Hal yang affect cuma slot A. Bila affect > 1 dev, escalate ke `PM-STATUS-PARENT.md §7` lewat Parent PM.

### 2026-06-30 — Slot A foundation stacked on Slot B's unmerged branch (decision risk, slot-scoped)

**What**: Slot A foundation (T03/T04) di-base dari `feat/auth-core` (44 commits Slot B, belum merge ke main) karena init migration + real PrismaClient + argon2 hanya ada di sana. Rationale lengkap di §2 SEQUENCING DECISION.

**Risk watch**:
- Rebase saat `feat/auth-core → main` merge. Mitigasi: commit Slot A seed-only (file `prisma/seeds/*`, CLI script, `package.json scripts`) tidak overlap diff Slot B → rebase trivial.
- Bila Slot B re-base/force-push `feat/auth-core` (seharusnya tidak — shared branch, CLAUDE.md §12 larang force-push), branch Slot A perlu sync. Flag bila terjadi.
- T02/T11 ownership-of-record = Slot A tapi eksekusi Slot B; adopt sign-off (§2) menegaskan kembali. Future amendments tenant-guard/migration kembali ke Slot A.

**Escalate to Parent PM bila**: merge `feat/auth-core` mundur > sesi berikutnya (Slot A idle di T03/T04 menunggu), atau collision file tak terduga muncul saat rebase.

---

## 7. PM A operating notes (untuk Executor A)

- PM A baca `PM-AGENT.md` (full) + `PM-STATUS-A.md` + scan `PM-STATUS-PARENT.md` (§1 mine, §3, §5, §8).
- PM A **TIDAK** edit `src/`, `prisma/schema.prisma` (kecuali typo non-semantik), `package.json` deps — read-only di area itu.
- PM A **BOLEH** update planning docs untuk sync (per `PM-AGENT.md §0.6`) — TAPI escalation ke Parent PM dulu bila perubahan affect dev lain. Tiap edit planning docs dicatat di `PM-STATUS-PARENT.md §4`.
- PM A **TIDAK** edit `PM-STATUS-B.md` / `PM-STATUS-C.md` — strict per-slot ownership.
- PM A **TIDAK** jawab open contract / package question — hanya PO via Parent PM.
- PM A **TIDAK** negosiasi scope. Descope adalah otoritas PO via Parent PM.
- On REJECT: fix exactly the listed items (file:line). Re-run `make check` self-validate. Resubmit per `EXECUTOR-PROTOCOL §4.5`, sebut item mana yang sudah di-address.
- Rebuttal: bila Executor A yakin PM A flag salah, post one-sentence rebuttal + evidence di sub-block `REBUTTAL T## item-#N`. PM A re-check dalam session yang sama.
- Untuk CLI command apapun yang touch root repo (scaffolder, generator, dll.): tulis exact command di PLAN supaya PM A bisa flag risiko overwrite sebelum executor run.
- Branch naming: `feat/<modul>-<short>`, `fix/<modul>-<short>`, `chore/<short>`, `docs/<short>` (per `CLAUDE.md §12`).
- Commit message: conventional commits — `feat(modul): X`, `fix(modul): Y`.
- Gunakan `make commit MSG="..."` — auto lint + typecheck + format-check sebelum commit.

---

## 8. Slot A queue (filter dari PARENT §8 di mana Slot=A)

> Parent PM authority untuk rewrite — PM A baca only. Executor A self-select dari sini bila tidak ada explicit ASSIGNMENT.
>
> **Mirror of PARENT §1 (rows Slot=A)** — bukan authoring baru. Parent PM offline; routing source = PARENT §1 yang sudah meng-assign T01..T04 + T11 ke Slot A. Live operational sequencing + DoD ada di §2 (PM A acting on session bootstrap delegation).

| T## | Title | Status (Slot A view) | Dep | Gate |
| --- | --- | --- | --- | --- |
| T01 | pnpm install verify + `make check` green | `assigned · READY-FULL` — **ACTIVE** (ASSIGNMENT §2) | none | G1 |
| T02 | Initial Prisma migration | `ADOPT-pending` (exec Slot B §4-D05, on `feat/auth-core`) | T01 | G1 |
| T11 | tenant-guard middleware | `ADOPT-pending` (exec Slot B §4-D01, on `feat/auth-core`) | T01 | G2 |
| T03 | Tiers seed (4 rows) | `assigned · BLOCKED-until T01 + adopt-T02` | T02 | G1 |
| T04 | `seed-super-admin` CLI | `assigned · BLOCKED-until T01 + adopt-T02` | T02 | G1 |

Sequence: **T01 → adopt-T02 + adopt-T11 → T03 → T04**.

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM A:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot A)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
