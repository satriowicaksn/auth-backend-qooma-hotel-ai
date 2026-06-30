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
- **Active task**: **T03 (tiers seed)** — ASSIGNMENT issued §2, awaiting Executor A PLAN. (T01 ✅ approved · adopt-T02 ✅ · adopt-T11 ✅.)
- **Branch**: foundation verify done on `feat/auth-core`; **code work (T03/T04) on `feat/seed-foundation`** off `feat/auth-core` (§2 decision).
- **Next gate (global)**: G1 (criteria-based, no deadline) — lihat `PM-STATUS-PARENT.md §5`.
- **My queue**: ~~T01~~ ✅ → ~~adopt T02~~ ✅ → ~~adopt T11~~ ✅ → **T03 (active)** → **T04 (un-blocked, next)**.
- **Progress**: 3 / 5 signed-off (T01 approved, T02 + T11 adopted). T03 active, T04 next. G1 foundation nearly closed for Slot A (pending T03+T04 seeds).

---

## 1. Task tracker (slot A — PM A authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=A. PM A update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T01 | pnpm install verify + `make check` green | ✅ `approved (cycle 1, attempt 1)` | **PM A ✓** | APPROVED + GAP T01-#1 ratified (Option A — make-binary absent, underlying recipe equiv, CI runs literal make). DB verified independently (5 tables, migration applied). VERDICT §2. Gate **G1**. |
| T02 | Initial Prisma migration (tiers/hotels/users/sessions/prt) | ✅ `adopted (PM A canonical)` | **PM A ✓** | ADOPTED (exec Slot B §4-D05, no re-exec). All constraints verified (UNIQUE/FK ON DELETE/mutual-exclusion CHECK proven live). Ownership-of-record = Slot A. Full APPROVE rides Slot B batch+CI. VERDICT §2. |
| T11 | tenant-guard middleware (Fastify plugin) | ✅ `adopted (PM A canonical)` | **PM A ✓** | ADOPTED (exec Slot B §4-D01, no re-exec). Clean; recorded fail-open invariant (pass-through-on-missing-cookie requires upstream jwt). Ownership = Slot A. VERDICT §2 + invariant §6. |
| T03 | Tiers seed (4 rows: lite/professional/luxury/enterprise) | 🟠 `wip · fix authorized (Option A)` | — | Code green (152 unit + 35 integ incl tiers-seed 2/2). GAP T03-#2: `prisma-client.ts:25` `.prisma/client` import crashes at runtime. **RE-RULING §2** (rebuttal upheld — PM A verified): Option B (`@prisma/client`) WITHDRAWN (throws under `node-linker=isolated`); **Option A AUTHORIZED** = `tsconfig.json` paths `.prisma/client`→real client (verified instantiates + typecheck real types). 4-pt verify (seed/typecheck+lint/tests/dev:api). Code change → branch, Nathan merges. Prod-dist boot = Q-A-04 (tsc-alias, separate). Gate **G1**. |
| T04 | `seed-super-admin` CLI (`pnpm seed:super-admin`) | `assigned · READY (un-blocked, next)` | — | Deps T01 ✓ + adopt-T02 ✓ satisfied. ASSIGNMENT after T03 PLAN (single-focus). Branch `feat/seed-foundation`. Must reuse auth argon2 params. DoD §2. Gate **G1**. |

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

#### SUBMIT T01 — exec-A (Nathan) at cycle 1 (2026-06-30) (attempt 1)

Task: pnpm install verify + `make check` green — foundation sign-off (G1).
Files changed: **0** (verification-only; `git diff` empty, HEAD unchanged `25d2007`).
Branch: `feat/auth-core` @ `25d20078fea72a8906eda64cb4634b778007adb2`.
Env: pnpm `9.0.0` (corepack-provisioned), node `v22.21.1`, docker compose `v5.1.2`.

**⚠️ Read GAP T01-#1 first (Notes) — `make` cannot run on host (macOS CLT absent). I ran the byte-identical underlying recipe from the Makefile. All substance green; requesting you ratify the substitution as part of VERDICT.**

DoD self-check (reordered per Amendment #1: start → check):
- [x] **checkout `feat/auth-core`** — HEAD `25d20078fea72a8906eda64cb4634b778007adb2`, tree clean.
- [x] **install clean** — `corepack prepare pnpm@9.0.0 --activate` → `pnpm install --frozen-lockfile` succeeded (Done in 16.9s). **Amendment #2 guard PASSED**: `--frozen-lockfile` did **not** fail → `|| pnpm install` fallback never fired; `git status --short` empty + `git diff --stat pnpm-lock.yaml` empty → **zero lockfile churn**. (`argon2 0.44.0` resolved via prebuilt binary on Node 22 — no native-build failure; addresses Note #1.)
- [x] **start (deps up)** — `docker compose up -d --wait postgres redis` → `qooma-postgres` healthy `0.0.0.0:5433->5432`, `qooma-redis` healthy `0.0.0.0:6380->6379`. (`--wait` used instead of the Makefile's `until … sleep 1` loop — same healthy-gate, avoids blocked foreground `sleep`.)
- [x] **db-migrate** — `pnpm prisma:migrate:dev` applied `20260630042913_init` → **"Your database is now in sync with your schema"**, exit 0. **No new migration authored / no `schema.prisma` or `migrations/*` change** → no schema↔migration drift (**Note #3 ✓ — positive early signal for adopt-T02**). 5 domain tables present via `psql \dt`: `tiers`, `hotels`, `users`, `sessions`, `password_reset_tokens` (+ `_prisma_migrations`). `prisma migrate status` → "Database schema is up to date!" (idempotent ✓).
- [x] **check green** (4 components, all exit 0 — DB was up first per Amendment #1, so the live-DB smoke passed):
  - `pnpm lint` → exit 0, **0 warnings** (`eslint . --max-warnings 0`).
  - `pnpm format:check` → "All matched files use Prettier code style!".
  - `pnpm typecheck` → `tsc --noEmit` exit 0, 0 errors.
  - `pnpm test:unit` → exit 0, **155 passed** / 184 total. 2 suites skipped + 27 todo are **pre-existing on `feat/auth-core` (Slot B), not my edits** — reporting, not flagging.
- [x] **No file change** — final `git status --short` empty, `git diff` empty, HEAD still `25d2007`.

Quality gate
- lint: PASS (0 warnings) · format:check: PASS · typecheck: PASS · test:unit: PASS (155 passed)
- `make`-wrapper: **N/A — host CLT absent (GAP T01-#1)**; underlying pnpm/docker commands run instead (identical recipe).

Drift scans
- **N/A — no edits** (`git diff` empty). The smoke suite's two `prisma:error` console lines are its *intended* negative-path trips (UNIQUE `(hotel_id,email)` + `users_role_hotel_mutual_exclusion` CHECK) — suite PASSED, both constraints proven live. These + the 2 skipped suites/27 todo live in Slot B's code on `feat/auth-core`, not Slot A changes.

Security check
- N/A (no auth/webhook/crypto code written). No secret committed; `.env` untracked (gitignored), never staged. Used existing `.env` (all keys present incl. valid `ENCRYPTION_KEY`) — **generated 0 keys** (addresses Note #2; `openssl` not needed).

Test evidence
- `test:unit`: 155 passed. Live-DB smoke `src/core/prisma/__tests__/prisma-client.smoke.test.ts` **PASS** — (a) connection round-trip, (b) UNIQUE(hotel_id,email) trip, (c) mutual-exclusion CHECK trip all verified against the migrated DB at `localhost:5433`.
- Tables: `psql -U app -d app -c '\dt'` → 5 domain tables + `_prisma_migrations`.
- No new endpoint/webhook/job in this task → no curl sample applicable.

Notes / questions
- **GAP T01-#1 — `make` unavailable on host (raised per ASSIGNMENT note "missing env resource → raise GAP, PM decides").**
  - **Gap**: macOS Command Line Tools not installed → `/usr/bin/make` is only the CLT stub (invoking it pops the `xcode-select` install dialog, runs nothing). `xcode-select -p` errors ("Unable to get active developer directory"); no `gmake`/homebrew `make`. So literal targets `make install/start/check/db-migrate` cannot execute in this env.
  - **Doc ref**: ASSIGNMENT T01 DoD (`make check`/`make start`/`make db-migrate`) + PM note. PM ACK referenced `Makefile:38/46-50` assuming `make` runs — that's the only post-ACK delta.
  - **Workaround already executed**: byte-identical underlying recipe (corepack→`pnpm install --frozen-lockfile`→`pnpm prisma:generate`→`docker compose up -d --wait`→`pnpm prisma:migrate:dev`→`pnpm lint`/`format:check`/`typecheck`/`test:unit`). All green; evidence above. DoD substance fully verified — nothing needed descoping.
  - **Options**: A) (my intent, recommended) **Ratify the substitution** — accept underlying-command evidence as satisfying `make check`/`start`/`db-migrate` for G1 sign-off. `make` is a thin wrapper; CI (canonical) still runs `make`. B) **Require literal `make`** — I install Xcode CLT (`xcode-select --install`, interactive GUI, multi-GB; 44 GB free is enough) then re-run via `make`; expect identical green — needs you/user to click the dialog. C) Descope the `make`-wrapper requirement (PM authority) — unnecessary since substance is green.
  - **My intent**: **A**.
- Amendments/notes incorporated: #1 reorder (start before check) ✓ · #2 lockfile guard (frozen passed, no churn) ✓ · Note #1 (Node 22 — argon2 prebuilt, no 22-only failure) ✓ · Note #2 (existing `.env`, 0 keys generated) ✓ · Note #3 (clean migrate apply, no drift) ✓.
- Deps containers left **running** (5433/6380) for adopt-T02/T03/T04.

Requesting PM A VERDICT (incl. ratification of GAP T01-#1 option A).

##### VERDICT T01 — APPROVED (cycle 1, attempt 1) by PM A · GAP T01-#1 RATIFIED (Option A)

✅ **APPROVED.** All DoD substance verified; independently corroborated by PM A (read-only):
- Branch `feat/auth-core` @ `25d2007`, 0 file changes (working tree back on `main` @ `3b4de87`, only this SUBMIT uncommitted ✓).
- install: `--frozen-lockfile` succeeded, zero lockfile churn (**Amend #2 ✓**). argon2 0.44.0 prebuilt on Node 22 (Note #1 ✓).
- **DB independently checked by PM A** (`psql` on :5433): `_prisma_migrations` → `20260630042913_init` applied (`finished_at` set); 5 domain tables present (tiers/hotels/users/sessions/password_reset_tokens). Matches claim.
- check: lint 0-warn · format ✓ · typecheck 0-err · test:unit 155 passed incl. live-DB smoke (connection + UNIQUE + CHECK trips) — **Amend #1 reorder confirmed effective**.
- 2 skipped suites = `src/modules/_template/` reference boilerplate (CLAUDE.md §3 "jangan edit isinya") — by-design, NOT auth code, NOT a merge-drift item. 27 `it.todo` = T02-gated integration placeholders (Slot B, cycle 7). Both correctly reported, not flagged.

🔧 **GAP T01-#1 — RATIFIED via Option A.** `make` binary unavailable (macOS CLT absent). The underlying-recipe substitution satisfies `make check`/`start`/`db-migrate` for **G1 foundation sign-off**, because:
1. `make` here is a thin wrapper — `check: lint format-check typecheck test-unit` (`Makefile:148`) = the 4 pnpm scripts you ran; `start`/`db-migrate`/`install` likewise. Each recipe reproduced faithfully, component-by-component green.
2. The **canonical `make` path is exercised by CI** (`CLAUDE.md §12` "wajib lewat CI") when `feat/auth-core` PRs to main — G1's "make check hijau" is met at the gate by CI; local run proves substance.
3. `docker compose up --wait` vs Makefile `until pg_isready` loop = equivalent healthy-gate; accepted.
- **Option B (install Xcode CLT) explicitly NOT required** — multi-GB, interactive, zero added signal beyond CI.
- **Forward guidance (T03/T04)**: invoke `pnpm seed` / `pnpm seed:super-admin` directly — make-gap does NOT block seed tasks; no CLT install needed.
- Recorded: §3 (resolved) + §6 (incident, durable for future Slot A sessions).

→ §1 tracker T01 → `approved`; row mirrored PARENT §1. → roll-up PARENT §2.

---

##### VERDICT adopt-T02 — ADOPTED (PM A canonical sign-off, cycle 1) — NO re-exec

Slot A (canonical owner per `SERVICE-CHARTER §3`) adopts T02 (executed by Slot B §4-D05). PM A review of `prisma/migrations/20260630042913_init/migration.sql` + live DB:
- ✅ 5 tables match `schema.prisma`. `UNIQUE(hotel_id,email)` = `users_hotel_id_email_unique` (MVP §4.7).
- ✅ FK ON DELETE: hotels.tier_id→tiers **RESTRICT** · users.hotel_id→hotels **RESTRICT** · sessions.user_id→users **CASCADE** · password_reset_tokens.user_id→users **CASCADE** — exact spec match.
- ✅ Mutual-exclusion CHECK `users_role_hotel_mutual_exclusion` present (MVP §4.4) — **proven live** by smoke (Postgres 23514 trip).
- ✅ Bonus CHECKs: `tiers_name_check`, `users_role_check`, `hotels_status_check`, `users_language_check`. `prisma-client.ts` = real singleton (Q-B-02(b) resolved); no drift ("in sync", no new migration).
- **Ownership-of-record affirmed = Slot A**; future migration amendments return to Slot A. NO re-exec.
→ §1 T02 → `adopted`.

**⚠️ Carry-forward for T03/T04 (from the CHECKs above — these will reject bad INSERTs):**
- T03 tiers seed MUST use exactly `lite`/`professional`/`luxury`/`enterprise` (else `tiers_name_check` fails).
- T04 super-admin MUST be `role='super_admin'` + `hotel_id=NULL` (else `users_role_check` / `users_role_hotel_mutual_exclusion` fail). `language` ∈ {`id`,`en`}.

---

##### VERDICT adopt-T11 — ADOPTED (PM A canonical sign-off, cycle 1) — NO re-exec

Slot A adopts T11 tenant-guard (executed by Slot B §4-D01, APPROVE-PARTIAL by PM B). PM A review of `src/plugins/tenant-guard.ts`:
- ✅ Role scopes per spec §6: super_admin → `{type:'all-hotels'}`; non-super_admin w/ hotelId → `{type:'single-hotel',hotelId}`.
- ✅ Non-super_admin w/ `hotelId===null` → `TenantScopeViolationError` (403) + audit log (correlationId/userId/role — no phone/email PII; Open Item #5 shape). AppError subclass, no `throw new Error`, no `any`, no console.log, structured log ✓.
- ✅ Allowlist bypass for public/auth routes; `matchedPath` uses Fastify 4.28 `routeOptions.url` + safe fallback.
- ✅ Imports auth JWT-claim/cookie/error helpers — tight coupling **sanctioned by design** (Parent §8 T11: "coordinate JWT verify util with T05 — duplication is worse than tight coupling"). Not a cross-module drift block.

**🔒 Recorded canonical invariant (Slot A owns):** guard PASSES THROUGH on missing/invalid cookie (delegates 401 to upstream `@fastify/jwt` + handler — "Amendment 1"). Spec-compliant, NOT fail-open **provided every protected route also has JWT auth wired upstream**. Fail-open boundary = a protected route wired with tenant-guard but WITHOUT jwt auth. → Slot A protects this on all future tenant-guard amendments + flags it on route-wiring reviews (relevant to T07 wiring, Slot B). Logged §6 + informational to Parent §10.
- **Ownership-of-record affirmed = Slot A.** NO re-exec. Full APPROVE rides Slot B's batch + CI (PM B owns execution-status row).
→ §1 T11 → `adopted`.

---

### ASSIGNMENT T03 — routed to exec-A (Nathan) by PM A at cycle 1 (2026-06-30) — ✅ UN-BLOCKED
- **Task**: Tiers seed — 4 rows, idempotent. **First Slot A CODE task** (T01 was verify-only).
- **Branch**: branch from `origin/feat/auth-core` → **`feat/seed-foundation`** (per §2 SEQUENCING DECISION). Conventional commits (`feat(seed): …` / `chore(seed): …`).
- **Deps satisfied**: T01 ✓ green · adopt-T02 ✓ (tables live, confirmed by PM A). Containers up (5433/6380, left running by T01).
- **Spec**: `MVP-AUTH-FIRST §3` step 1 + `01-auth-identity §1.4` (Tier shape + per-tier values).

**DoD T03:**
- [ ] Branch `feat/seed-foundation` off `feat/auth-core` @ `25d2007` — confirm base in PLAN.
- [ ] Seed implemented in `prisma/seeds/` (replace placeholder `index.ts`, or add `prisma/seeds/tiers.ts` invoked from `index.ts` — your call, justify in PLAN). Uses the **real `PrismaClient` singleton** (import-path `.prisma/client` per `src/core/prisma/prisma-client.ts` — that quirk is mandatory, see prisma-client header).
- [ ] **4 rows, idempotent `upsert` by unique `name`**: `lite` · `professional` · `luxury` · `enterprise` (EXACT — `tiers_name_check` rejects anything else). Re-run = still 4 rows, no dupe, no error.
- [ ] Columns per schema `Tier` + read `01-auth-identity §1.4` for exact values: `displayName`, `outboundQuotaMonthly` (2000/4000/8000/`-1`), `agentCap` (1/3/5/`-1`), `agentMinimum` (default 3 — confirm per-tier override in spec), `userCap` (2/4/6/`-1`), `departmentCap` (1/3/5/`-1`), `features` JSONB. `-1` = unlimited (enterprise). **Read the spec for the feature map — don't guess.**
- [ ] Runs via `pnpm seed` (= `tsx prisma/seeds/index.ts`) — exit 0, idempotent on re-run. (Per ratified GAP T01-#1: invoke `pnpm seed` directly; `make db-seed` is the wrapper, equivalent.)
- [ ] **Test**: integration/smoke test asserting 4 tiers exist post-seed + re-run idempotent (4 stays 4). Lives `*.integration.test.ts` (needs DB up). If you add a unit-level test, mock nothing Prisma (ADR-0001/CLAUDE §8).
- [ ] `make check` equivalent green (lint 0-warn · format · typecheck · test:unit) + the new integration test green (DB up).
- [ ] Drift floor: no `any`, no `console.log` (use `console.warn` only if a script status line is needed — allowed in `prisma/seeds/` scripts per drift table exception), no `throw new Error` (use AppError if throwing in service-path code; a top-level seed script may `process.exit(1)` on failure per existing boilerplate pattern), no default export outside entrypoints.
- [ ] `git diff` scoped to seed files only — no `src/modules/*`, `schema.prisma`, or migration changes. SUBMIT lists exact files.

**Catatan PM A**: Independent T03 & T04 (both only need T02 tables). I'm assigning **T03 first**; **T04 is now also un-blocked** (deps T01+adopt-T02 met) — ASSIGNMENT T04 issues after your T03 PLAN (keeps focus single). Spec values: read `01-auth-identity §1.4` rather than trusting the schema-comment shorthand for the `features` map + `displayName`. Raise GAP if §1.4 is ambiguous on any tier's quota.

_Awaiting Executor A PLAN T03._

#### PLAN T03 — exec-A (Nathan) at cycle 1 (2026-06-30)

**Scope recap**
- Tiers seed: 4 idempotent rows (`lite`/`professional`/`luxury`/`enterprise`) per `01-auth-identity §1.4` + `MVP-AUTH-FIRST §3` step 1. First Slot A code task. Real `PrismaClient` singleton, `upsert`-by-`name`, integration test, drift floor.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity: Executor, Slot A (Nathan) ✓ · CLAUDE.md loaded ✓
- Task spec read: ASSIGNMENT T03 DoD (9 butir) + `01-auth-identity §1.4` + `MVP-AUTH-FIRST §3` + `API-CONTRACT §2.1b` (Tier shape/example)
- Deps: T01 ✓ approved · adopt-T02 ✓ (5 tables live, init migration applied). Containers up (5433/6380, left from T01).
- Base branch: see Decision #0 (origin/feat/auth-core advanced `25d2007`→`d1cf477`, +6 Slot B cycle-7 commits — prereqs unchanged).
- `lint`/`typecheck`/`test:unit` were green on `feat/auth-core` (T01); will re-confirm on the new branch before editing.
- Scaffolder risk: none.

**Decisions (DoD: "your call, justify in PLAN"):**
- **#0 Base commit** — branch `feat/seed-foundation` off **current tip `d1cf477`**, not the stale `25d2007` in the ASSIGNMENT. `git diff 25d2007..d1cf477 -- prisma/ src/core/prisma/` = only ADD `src/core/prisma/__tests__/integration-helpers.ts`; schema/migration/prisma-client/seeds all unchanged → T03 prereqs identical + I reuse the new helpers. Confirm OK.
- **#1 File structure** — logic+data in `prisma/seeds/tiers.ts` (`export async function seedTiers(db): Promise<void>` + `TIER_SEEDS`); `prisma/seeds/index.ts` → thin runner (env-preload → singleton `db` → `seedTiers` → exit/disconnect), replacing placeholder. Keeps `pnpm seed = index.ts` (DoD-literal) + isolates testable logic.
- **#2 PrismaClient** — reuse real singleton `db` from `@core/prisma/prisma-client.js` (already does mandatory `.prisma/client` import + `loadConfig`). No 2nd client.
- **#3 `pnpm seed` env** — tsx does NOT auto-load `.env`; singleton's `loadConfig()` runs at import → would throw locally. Fix: `seed` script → `tsx --env-file-if-exists=.env prisma/seeds/index.ts`. `-if-exists` loads `.env` locally but is **CI-safe** (CI injects real env, no `.env` file → no error). 1-line `package.json` edit (seed scope; same pattern aids T04). Confirm acceptable (alt: side-effect preload import — but this is cleaner, dep-free).
- **#4 Test location** — jest `roots: ["src","scripts"]` (cycle-7 `jest.config.json`) → tests under `prisma/` aren't discovered. Test at `src/core/prisma/__tests__/tiers-seed.integration.test.ts` (co-located w/ smoke + `integration-helpers.ts`), imports `seedTiers` from `prisma/seeds/tiers.ts` + `connectPrisma`/`disconnectPrisma`. Runs under `pnpm test:integration` (`--runInBand`, DB up); NOT `test:unit`/`make check` (cycle-7 regex excludes `.integration`). Caveat: `prisma/seeds/*.ts` is outside tsconfig `include:["src/**"]` so `pnpm typecheck` won't cover it — matches the existing placeholder convention (seed = eslint+runtime-checked). Coverage thresholds scoped to auth/users/plugins only → seed not counted.

**Seed values** (from §1.4 + §2.1b; luxury `8000/5/3/6/5` + display `"Luxury"` confirmed by §2.1b example):

| name | display_name | outbound | agent_cap | agent_min | user_cap | dept_cap | is_custom |
|---|---|---|---|---|---|---|---|
| lite | Lite | 2000 | 1 | 3 | 2 | 1 | false |
| professional | Professional | 4000 | 3 | 3 | 4 | 3 | false |
| luxury | Luxury | 8000 | 5 | 3 | 6 | 5 | false |
| enterprise | Enterprise | -1 | -1 | 3 | -1 | -1 | true |

- `agent_minimum = 3` all tiers (§1.4 "3 — all tiers, server-enforced floor"; schema default 3, set explicitly).
- enterprise unlimited = `-1` (schema `Int` non-null → not `null`).
- `is_custom = true` only enterprise (§1.4 + §2.1b); else false.

**Files to create**
- `prisma/seeds/tiers.ts` (new — `seedTiers` + `TIER_SEEDS`)
- `src/core/prisma/__tests__/tiers-seed.integration.test.ts` (new)

**Files to modify**
- `prisma/seeds/index.ts` (placeholder → thin runner)
- `package.json` (1 line: `seed` script + `--env-file-if-exists=.env`)

**Approach**
`seedTiers(db)` iterates `TIER_SEEDS` (typed `ReadonlyArray`) → `db.tier.upsert({ where:{name}, update:{<config>}, create:{<config>} })` — idempotent by unique `name`, re-run converges config (4 stays 4). `index.ts`: `await seedTiers(db)` → `console.warn('[seed] tiers: 4 rows ✓')`; `.catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect())`. Test: `beforeAll(connectPrisma)` → `seedTiers(db)` → assert `count===4` + per-row fields → re-run → assert still 4 + no throw → `afterAll` delete the 4 canonical names (serial `--runInBand` + cleanup keeps shared DB clean vs other integration tests' `createTestTier` default `name:'lite'`) + `disconnectPrisma`.

**GAPs / questions**
- **GAP T03-#1 — `features` JSONB per-tier map is unspecified in this repo.** §1.4 sources it from `src/mocks/fixtures/feature-flags.ts` (**absent** — no `src/mocks/`); `API-CONTRACT:208` from `docs/DEVELOPMENT-PLAN.md` (**absent**) + product CLAUDE.md §1 (this repo ships the *boilerplate* CLAUDE.md — no feature matrix); §2.1b's luxury example is truncated (`"..."`), not a full 4-tier × 19-key map.
  - **Options**: **A)** seed `features: {}` (schema default) for all 4 as MVP placeholder — `/api/admin/tiers` returns `{}` until matrix sourced; §1.4 says it "evolves as flags are added" + PATCH out-of-MVP → no runtime dependency; non-destructive backfill later. **B)** you/PO supply the 19-key per-tier matrix (FE `feature-flags.ts` / DEVELOPMENT-PLAN) → I seed exact. **C)** guess partial map from §2.1b hint — rejected (violates "don't guess").
  - **My intent: A** (empty `{}`) + a code comment noting source-of-record + backfill follow-up. Escalate to PO via you only if a real matrix is required at seed-time for G1.
- **Q #2 (confirm, non-blocking):** base off `d1cf477` (#0), `--env-file-if-exists` package.json edit (#3), test in `src/core/prisma/__tests__` (#4), `displayName` Title-case. Proceeding on these unless you object in ACK.

Awaiting PM A ACK.

##### PM A ACK — T03 PLAN APPROVED · GAP T03-#1 ruled (Option A) · 1 amendment (env) · confirm-items (cycle 1, 2026-06-30)

Strong PLAN — values verified, idempotency + cleanup sound, test-runner classification correct. **Proceed** after the env amendment below; no re-PLAN.

**Independently verified by PM A (read-only):**
- ✅ **Tier values** match `01-auth-identity §1.4` (lines 176-189) + DDL (270-281) exactly: outbound 2000/4000/8000/-1 · agent_cap 1/3/5/-1 · agent_minimum 3 all · user_cap 2/4/6/-1 · dept_cap 1/3/5/-1 · is_custom enterprise-only. `-1`=unlimited explicitly allowed (§1.4:189).
- ✅ **`features: {}` is safe** — grep of built code (T05/T06/T07/T11) shows **nothing reads `tier.features`**; DDL default is literally `'{}'::jsonb` (§1.4:277).
- ✅ **Base `d1cf477`** — confirmed +6 commits = Slot B T02-sub-1 integration backfill (integration-helpers + assertions + `1ee1c33` test:unit regex tighten). No seed-file conflict. Approved.

**🟢 GAP T03-#1 — RULED: Option A (`features: {}`).** Confirmed your source-analysis independently: the per-tier matrix sources are genuinely absent (`src/mocks/fixtures/feature-flags.ts` ❌, `docs/DEVELOPMENT-PLAN.md` ❌); feature flags are Hotel Core's domain (SERVICE-CHARTER); `open-questions.md:205` even hints MVP tier-gating may be just "row exists." So:
- Seed `features: {}` (= schema default) for all 4 — MVP placeholder. **Add a code comment** at the `features` field: `// MVP placeholder — per-tier feature matrix pending PO (Q-A-02); backfill via re-run upsert. Source-of-record: feature-flags.ts (FE) + DEVELOPMENT-PLAN.md (absent).`
- I am **NOT** silently deciding contract data. The real matrix IS needed before **T08** (`GET /api/admin/tiers` returns features, Slot C, G3). **Raised to PO as Q-A-02** (PM-STATUS-A §3 + PARENT §3a; cross-ref existing Q-CONTRACT-08). T03 ships now with `{}` (non-blocking); upsert-by-name makes backfill a one-line-per-tier change later. Option C (guess) correctly rejected.

**⚠️ Amendment (MANDATORY) — env loading, reject `--env-file-if-exists`.** That flag is **Node 22.9+**; project baseline + CI = **Node 20 LTS** (CLAUDE.md §2). A committed `seed` script must run on Node 20 — `pnpm seed` would error on the Node-20 baseline (`make db-seed`/`start-fresh`/deploy). Use the repo's established **dep-free** pattern instead (your `loadConfig()` reads `process.env` at module-load; `test-setup.ts` already solves this with a no-dep KEY=VALUE parser, ratified DD2 cycle 6):
- **Preferred**: create `src/shared/utils/load-env.ts` (new Slot A file — minimal no-dep `.env` parser, graceful-if-missing like test-setup) and **side-effect import it FIRST** in `prisma/seeds/index.ts`, before the `db` singleton import (ESM evaluates imports in source order → env in `process.env` before `loadConfig()` fires). **Do NOT refactor `test-setup.ts`** (Slot B file on shared branch — avoid cross-slot edit; minor parser duplication is fine). Bonus: `load-env.ts` is reused by T04's CLI.
- **Acceptable alt**: `tsx --env-file=.env` (`--env-file` IS Node 20.6+) — 1-liner, but errors if `.env` absent. Your call between these two; **not** `--env-file-if-exists`. No new dep either way.

**Confirm-items:**
- #0 base `d1cf477` ✅ (verified). **Rebase-aware**: feat/auth-core is "cycle-7 final pre-merge" → rebase `feat/seed-foundation` onto `main` once it lands (trivial, seed-only files). Pin base commit in SUBMIT.
- #1 file structure (`tiers.ts` + thin `index.ts`) ✅. #4 test location `src/core/prisma/__tests__/tiers-seed.integration.test.ts` ✅. displayName Title-case ✅.
- **Correction to your #4 typecheck note**: `tiers.ts` **IS** typechecked — the `src/` integration test imports `seedTiers` from it, so `tsc` covers it transitively (only the `index.ts` runner is uncovered — trivial, OK).

**Test-runner reminder (from `1ee1c33`):** `test:unit` regex now `(?<!\.integration)\.test\.ts` → your `.integration.test.ts` runs under **`pnpm test:integration`** (`--runInBand`), NOT `make check`/`test:unit`. But `make check` (test:unit) STILL needs DB up (the pre-existing `prisma-client.smoke.test.ts` rides it). So: keep DB up throughout; **SUBMIT must show BOTH `test:unit` green (make-check equiv) AND `test:integration` green (your new tiers-seed test)** — don't conflate the runners.

On ACK → create `feat/seed-foundation` off `d1cf477`, implement (Option A `{}` + comment, env via load-env util or `--env-file`), run test:unit + test:integration both green (DB up), SUBMIT. → After APPROVE I issue ASSIGNMENT T04.

_Awaiting Executor A SUBMIT T03._

##### NUDGE T03 — merge-timing correction (PM A, post-Slot-B BATCH VERDICT, 2026-06-30)

Mid-task heads-up (does NOT change your T03 implementation — keep building on `feat/seed-foundation`):
- **Slot B sequence is now COMPLETE** (PM B BATCH VERDICT — T02-sub-1 + quartet T05/T06/T11/T07 all FULL APPROVE; `feat/auth-core` frozen, 50 commits / 185 tests green).
- **Correction to my ACK confirm-item #0 ("rebase onto main once feat/auth-core lands")**: now **inverted** — PM B states `feat/auth-core` merge is **gated on Slot A closing T03+T04**, so it will NOT merge to `main` before you finish. **Action: nothing differently** — keep `feat/seed-foundation` based on `feat/auth-core` `d1cf477`; do **not** wait for / rebase onto `main` mid-T03. Coordinated merge happens after T03+T04 sign-off.
- **Implication**: Slot A T03+T04 are now on the **critical path** to the `feat/auth-core → main` merge + G1 close. Don't rush quality — just be aware your seeds are the last gate before merge.
- Cross-slot **merge strategy** (does `feat/seed-foundation` subsume `feat/auth-core` in one merge, or two) = Parent/PO call — recorded PARENT §3c Q-A-03, not yours. Keep your branch clean + seed-scoped.
---

##### BLOCKED T03 — exec-A (Nathan) at cycle 1 (2026-06-30)

**TL;DR**: All T03 code is done + proven correct. The one blocker is a **mandatory-DoD-vs-runtime conflict** needing your scope ruling: the mandated `.prisma/client` singleton import is **invalid at runtime under tsx/Node-ESM**, so `pnpm seed` crashes. I have a **verified 1-line fix**, but it's out of "seed-files-only" scope, touches shared config, and exposes a service-wide latent bug. WIP committed `bf5517b` → pushed `origin/feat/seed-foundation` (off `feat/auth-core` tip `e4a8720`; `d1cf477` was orphaned by the feat/auth-core rebase — same Decision #0 logic).

**GREEN (verified, DB up):** `pnpm lint` 0-warn · `format:check` clean · `typecheck` exit 0 · `test:unit` 152 passed · `test:integration` 35 passed incl. my `tiers-seed.integration.test.ts` 2/2 (exact §1.4 values + idempotent). With the fix below, `pnpm seed` = exit 0, 4 rows w/ exact values (lite 2000/1/3/2/1/false · professional 4000/3/3/4/3/false · luxury 8000/5/3/6/5/false · enterprise -1/-1/3/-1/-1/true · `features={}` all), re-run stays 4 (idempotent).

**Blocker — `.prisma/client` = valid TYPE specifier but INVALID runtime ESM specifier:**
- `pnpm seed` (`tsx prisma/seeds/index.ts`) imports mandated singleton `@core/prisma/prisma-client.js` → which does `import { PrismaClient } from '.prisma/client'` (value import). Node/tsx ESM throws: `ERR_INVALID_MODULE_SPECIFIER: Invalid module ".prisma/client" is not a valid package name`.
- **Isolated from my code**: `tsx -e "import('@core/prisma/prisma-client.js')"` fails identically (singleton alone). Not my seed.
- **Why tests still pass**: jest-resolve leniently maps `.prisma/client`→`node_modules/.prisma/client`; tsc "Bundler" mode + eslint TS resolver accept it for types. Real Node ESM (tsx / `node dist`) does not.
- **Scope — now mainline**: `src/entrypoints/api.ts:18` imports the same singleton → `dev:api` (tsx) can't boot; `start:api` (`node dist`) emits `.prisma/client` verbatim → same crash in prod. `feat/auth-core` merged to `main` (PR #1 `12f9c4d`), so this latent runtime defect is on `main` now — broader than T03.

**Verified minimal fix (keeps the mandated import, no source change):** add to `tsconfig.json` `paths`: `".prisma/client": ["node_modules/.prisma/client"]`. tsx resolves tsconfig paths at runtime → `pnpm seed` + `dev:api` work under tsx. I tested it (results above) then reverted it (unapproved scope). **Limitation**: `node dist` (prod) ignores tsconfig paths → `start:api` still broken until a build-time rewrite (`tsc-alias`) or switching value imports to `@prisma/client`. So this unblocks dev + seed (T03), not prod.

**Options:**
- **A (recommended for T03)** — you ACK the 1-line `tsconfig.json` `.prisma/client` path mapping as part of T03 (scope expansion). I apply + SUBMIT immediately. Minimal, keeps mandated import, no runtime-behavior change. Cons: shared/mainline config; doesn't fix prod `node dist`.
- **B (root fix, bigger)** — amend `prisma-client.ts` (+ `auth.repository.ts`/`users.repository.ts` value imports) to import runtime value from `@prisma/client` keeping `.prisma/client` types. Fixes dev+prod everywhere. Touches Slot B's just-merged files → likely a **separate task**, not T03.
- **C** — seed constructs its own `@prisma/client` instance (deviates from mandated singleton; leaves dev:api/prod broken). Rejected.

**My recommendation**: **A** to unblock T03 now + **route the service-wide runtime defect (dev:api/prod) as a separate finding to PARENT/Slot-B** (their just-merged prisma-client; complete fix = B or `tsc-alias`, beyond T03). I will NOT touch prisma-client.ts/repositories without your ruling.

**Specific question**: Approve Option A (1-line `tsconfig.json` `.prisma/client` path) as part of T03 so I apply + SUBMIT? And shall I draft the separate PARENT/Slot-B finding for the prod-runtime fix?

Awaiting PM A ruling.

###### PM A RULING — BLOCKED T03 / GAP T03-#2 — Option A REJECTED · root fix authorized (Slot A canonical) · P0 escalated (cycle 1, 2026-06-30)

**Defect CONFIRMED — PM A reproduced independently** (not just accepted the report): `node --import tsx/esm -e "import('@core/prisma/prisma-client.js')"` → `ERR_INVALID_MODULE_SPECIFIER: Invalid module ".prisma/client" is not a valid package name`. Real, P0, on `main`. Good catch — would've bitten first prod/dev boot.

**Blast radius — verified by PM A (corrects your Option-B scoping):** grepped all `.prisma/client` imports in `src/` on `main`. **Exactly ONE runtime value-import: `prisma-client.ts:25`.** The others — `auth.repository.ts:9`, `users.repository.ts:5`, `integration-helpers.ts:22` — are all `import type` → **erased at compile, zero runtime impact**. So Option B is NOT "3 files / touches Slot B repos" — it's **one line in `prisma-client.ts`**. Repos fine as-is.

**🟢 RULING: Option A REJECTED · Option B authorized, scoped to one line.**
- **Reject Option A** (tsconfig `.prisma/client` path): incomplete — fixes tsx only; prod `node dist` stays broken (no `tsc-alias`); shared-infra churn; masks the defect. Not acceptable as the fix.
- **Authorize root fix (Option B, minimal):** `prisma-client.ts:25` — change the **value** import `from '.prisma/client'` → `from '@prisma/client'`. Verified by PM A: `@prisma/client` is runtime-valid (`node --import tsx/esm -e "import('@prisma/client')"` → `PrismaClient is function`) and `@prisma/client/index.d.ts` re-exports the real generated types (`export * from '.prisma/client/default'`). Fixes **dev (tsx) + prod (node dist) + seed** in one file, no tsconfig/build change.
  - **If** `@prisma/client`'s value-type degrades to `any` under pnpm (Slot B's original concern): keep the type via `import type { PrismaClient } from '.prisma/client'` (erased — safe) + value from `@prisma/client`. Typecheck must stay green, **no new `any`** (drift floor).
- **Ownership — NOT cross-slot trespass:** `prisma-client.ts` is **Slot A canonical** (adopt-T02: "future amendments return to Slot A"; Slot B only EXECUTED it one-off per §4-D05). Fixing it = your canonical foundation responsibility. This is a **T02 foundation hotfix (amendment)**, surfaced by T03.

**Branch + verify (paste all four in SUBMIT):**
- Branch off current `main`: `fix/prisma-client-esm-import` (seed WIP already on main via PR#2 → fix completes the picture, no revert).
1. `pnpm seed` exit 0 + 4 exact rows + idempotent re-run.
2. `pnpm typecheck` green, **no new `any`**.
3. `pnpm build` (`tsc -p tsconfig.build.json`) → import/`node --check` the built `dist/**/prisma-client.js` resolves — **proves PROD fixed**, not just dev.
4. `pnpm dev:api` (tsx) boots past the singleton import (api up) — **proves G1 "make start/api boots"**.

**Escalation — I handle it (not you).** P0 latent defect reached `main` (PR#1+PR#2). I'm escalating to Parent/PO (PARENT §3c Q-A-04 + §2): (a) api could never boot dev/prod → **G1's "make start/api boots" was never actually validated** (T01 `make start` = DB+Redis deps only, never booted the api process — I own that gap in my T01 sign-off); (b) PR#2 merged blocked/unapproved T03 WIP to main. **You do NOT draft the PARENT finding — that's my job.** You: one-line fix + 4-point verify + SUBMIT T03.

**T03 status:** BLOCKED → unblocked by the one-line foundation fix. Once `pnpm seed` runs green, your T03 (code already verified-green) → SUBMIT → I VERDICT. T04 follows.

_Awaiting Executor A: foundation hotfix `prisma-client.ts:25` + T03 SUBMIT (4-point evidence)._

###### REBUTTAL — Option B is empirically BROKEN under `node-linker=isolated`; Option A verified working (exec-A, cycle 1, 2026-06-30)

I implemented Option B on `fix/prisma-client-esm-import` exactly as ruled (`prisma-client.ts:25` value import → `@prisma/client`) and ran the 4-point verify. **It fails 2 of 4. I did NOT ship it.** Hard evidence:

**B fails — runtime (#1):** `pnpm seed` → `Error: @prisma/client did not initialize yet. Please run "prisma generate"...`, thrown at `new PrismaClient` in `node_modules/.pnpm/@prisma+client@5.22.0_.../node_modules/.prisma/client/default.js:43`. **Cause**: `.npmrc` `node-linker=isolated` + `shamefully-hoist=false` (ADR-0002). pnpm gives `@prisma/client` its OWN nested `.prisma/client` = the **un-generated stub**; `prisma generate` populates only the **top-level** `node_modules/.prisma/client` (the real client, which jest uses). So `@prisma/client` → stub → `new PrismaClient()` throws. Seed still exit 1 (different error, still broken).

**B fails — types (#2):** `pnpm lint` → **190 `@typescript-eslint/no-unsafe-*` errors**. `@prisma/client/default.d.ts` = `export * from '.prisma/client/default'` → that same nested stub → `PrismaClient: any` → every `db.tier`/`db.user`/`db.$connect` across auth/users/seed is "unsafe". Revert to `.prisma/client` → lint clean → **B is the sole cause**. (`pnpm typecheck` passes — tsc tolerates a lib `any` — which is exactly why a typecheck-only gate misses it; lint's type-aware rules catch it.)

**Why the RULING's check read green but the fix is red:** `import('@prisma/client') → PrismaClient is function` confirms the import *resolves* + is a class — but never *instantiates* it (`new PrismaClient()` throws the stub error) nor inspects the *resolved* type (the `any` stub via `default.d.ts`). Necessary, not sufficient.

**The line-396 fallback doesn't rescue it:** `import type` from `.prisma/client` + value from `@prisma/client` fixes only the TYPE; the runtime VALUE still comes from `@prisma/client` → identical `did not initialize` crash. Runtime failure is independent of the type import.

**Option A re-verified WORKING + type-safe (just now):** tsconfig `paths` `".prisma/client": ["node_modules/.prisma/client"]` → `pnpm seed` exit 0 + 4 exact rows + idempotent · `pnpm lint` clean · `pnpm typecheck` clean (**real generated types, no `any`**). It points the `.prisma/client` specifier at the top-level REAL client for tsx's runtime resolver, keeping the same import the repos already use.

**On rejecting A for "prod `node dist` stays broken":** I built + grepped dist — **prod is already non-bootable irrespective of Prisma**: `tsc` emits path aliases verbatim, so dist has unresolved `@core/*` in `dist/core/prisma/prisma-client.js`, `dist/core/config/env.js`, `dist/core/logger/logger.js`, … (plus `.prisma/client` at `prisma-client.js:24`). So a 1-line import swap can't "fix prod" — Option B's dist still can't resolve `@core/*`, and `new PrismaClient()` throws anyway. **Prod runtime needs a holistic build-time alias resolver (`tsc-alias`) covering `@core/*`+`.prisma/client` — that is the true Q-A-04 P0 scope, not a 1-liner.**

**Recommendation:**
1. **Re-authorize Option A** (tsconfig `.prisma/client` path) as the T03 / dev-runtime unblock — verified, type-safe, no `any`, no source edit. Unblocks `pnpm seed` + `dev:api` (tsx) now.
2. **Q-A-04 proper (P0, separate Slot A foundation task):** add `tsc-alias` to `build` (rewrite `@core/*`/`@modules/*`/`@plugins/*`/`@shared/*` + `.prisma/client` in dist) so `node dist` boots; OR set the Prisma generator `output` to an in-repo path imported relatively. I'll scope + implement on your go.
3. **Option B (+ line-396 fallback): withdraw** — broken under `node-linker=isolated`.

Nothing shipped on `fix/prisma-client-esm-import` (B reverted; branch clean, no commits). **Awaiting PM A re-ruling** on (1)+(2).

###### PM A RE-RULING — REBUTTAL UPHELD. You were right, I was wrong on Option B. (cycle 1, 2026-06-30)

**Acknowledged — and independently re-verified by PM A.** My Option B ruling was wrong; my earlier "green" check was incomplete (I confirmed `import('@prisma/client')` *resolves* — `PrismaClient is function` — but never **instantiated** it or checked its **type**, exactly as you called out). I re-ran the decisive tests myself:
- `.npmrc` → `node-linker=isolated` + `shamefully-hoist=false` confirmed (ADR-0002). `@prisma/client` resolves to `node_modules/.pnpm/@prisma+client@.../@prisma/client/` which has **no** adjacent generated `.prisma/client`; the real client is only at top-level `node_modules/.prisma/client`.
- `new PrismaClient()` from **`@prisma/client`** → **THROWS** `"@prisma/client did not initialize yet. Please run 'prisma generate'"`. From **`.prisma/client`** → **INSTANTIATED OK**. ✅ Your runtime claim verified.
- **Option A applied (then reverted)**: `node --import tsx/esm` import of the singleton → `db.tier.upsert` present (**instantiated OK**); `pnpm typecheck` → exit 0, real types (no `any`). ✅ Your Option A claim verified.
- **Prod-dist claim verified**: `pnpm build` then `node dist/entrypoints/api.js` → `ERR_MODULE_NOT_FOUND: Cannot find package '@core/config'` — crashes on `@core/*` **before** Prisma. So `node dist` was already non-bootable independent of Prisma; **no import swap fixes prod** — confirmed. ✅

**🟢 RE-RULING:**
1. **Option B WITHDRAWN** (+ the `import type` fallback) — empirically broken under `node-linker=isolated`. My error.
2. **Option A AUTHORIZED** as the T03/dev unblock: add to `tsconfig.json` `paths`: `".prisma/client": ["node_modules/.prisma/client"]`. Keeps the original `.prisma/client` import (the JSDoc was correct). Verified by PM A: singleton instantiates under tsx + typecheck real types. **This is the fix — apply it.**
3. **Q-A-04 RE-SCOPED** — the prod `node dist` boot failure is **NOT** Prisma-specific; it's the general TS path-alias problem (`tsc` emits `@core/*`/`@modules/*`/`@plugins/*`/`@shared/*` + `.prisma/client` verbatim → `ERR_MODULE_NOT_FOUND`). Pre-existing latent defect (prod never booted). Fix = a build-time alias resolver (`tsc-alias`) covering all aliases — **separate Slot A foundation task**, and `tsc-alias` is a **new dev dep → needs Nathan's approval** (CLAUDE.md §11). NOT blocking T03 or G1-dev.

**Revised T03 verify (4-point, corrected — prod-dist removed, it's Q-A-04):**
1. `pnpm seed` exit 0 + 4 exact rows + idempotent re-run.
2. `pnpm typecheck` exit 0 + `pnpm lint` 0-warn (real types, no `any`).
3. `pnpm test:unit` + `pnpm test:integration` green (incl your tiers-seed 2/2).
4. `pnpm dev:api` (tsx) **boots past the singleton** (api process comes up) — closes the real G1 "api boots" check (note: that was never actually exercised in T01 — `make start` = deps only; my gap).

**Branch / merge (per Nathan's workflow):** apply Option A on a **branch** (`fix/prisma-client-esm-import` or fold into your seed branch) — it's a code change, **Nathan merges**, I notify when verified-ready. PM-STATUS (docs) I push to main directly.

**Process note (my accountability):** I over-ruled on incomplete verification and rejected your correct Option A on a false premise (assumed prod-break was Prisma-specific + assumed @prisma/client worked). The rebuttal protocol worked exactly as intended — you brought evidence, I re-checked, you were right. Lesson logged §6: *resolve ≠ instantiate ≠ types-ok*, and *tests-green ≠ service-boots* under isolated linker.

_Awaiting Executor A: apply Option A (tsconfig path) + 4-point verify + SUBMIT T03. I'll then VERDICT + tell Nathan T03 is merge-ready._

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
| GAP T01-#1    | `make` binary unavailable on host (macOS CLT absent → `/usr/bin/make` = xcode-select stub). Literal `make check/start/db-migrate` cannot run. | SUBMIT T01 §2 (exec-A) | **resolved** 2026-06-30 by PM A | **Option A ratified**: underlying-recipe (pnpm/docker) substitution accepted for G1 sign-off — `make` is thin wrapper; each recipe reproduced green; canonical `make` runs in CI on PR. Option B (Xcode CLT install) NOT required. Slot-internal (no PO escalation). Forward: T03/T04 use `pnpm seed`/`pnpm seed:super-admin` directly. See §6 incident. |
| Q-A-02        | Per-tier `tiers.features` JSONB unlock map — exact 19-key matrix × 4 tiers. Sources absent in-repo: `src/mocks/fixtures/feature-flags.ts` (FE) + `docs/DEVELOPMENT-PLAN.md`. Needed before **T08** (`GET /api/admin/tiers` returns features, G3). | GAP T03-#1 (exec-A PLAN T03) | **open → PO** (raised PARENT §3a, 2026-06-30) | **PO action**: supply the per-tier feature matrix (or confirm `{}`-until-Hotel-Core). T03 ships now with `features: {}` (schema default, nothing reads it in auth scope) — **non-blocking**; backfill via upsert re-run. Cross-ref `open-questions.md` Q-CONTRACT-08 (FE feature-flags shape / 19 names). |
| GAP T03-#2    | `pnpm seed`/`dev:api` crash: `prisma-client.ts:25` runtime import `from '.prisma/client'` → `ERR_INVALID_MODULE_SPECIFIER` under tsx/Node-ESM. Latent (jest resolver lenient); on `main` via PR#1+#2. **PM A reproduced.** | BLOCKED T03 + REBUTTAL (exec-A) | **resolved-direction** 2026-06-30 (RE-RULING, rebuttal upheld) | **RE-RULING §2** (PM A verified): Option B (`→ @prisma/client`) **WITHDRAWN** — throws `new PrismaClient(): did not initialize` under `node-linker=isolated` (ADR-0002); types→`any`. **Option A AUTHORIZED**: `tsconfig.json` paths `.prisma/client`→`node_modules/.prisma/client` (verified: instantiates under tsx + typecheck real types). Prod `node dist` boot = separate pre-existing alias defect → Q-A-04 (tsc-alias). Unblocks T03. |

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

### cycle 1 (update 2) — 2026-06-30 (T01 APPROVED + adopt-T02/T11 ADOPTED + T03 issued)

```
QOOMA BE A (Nathan) — Standup — cycle 1 (criteria-based, no deadline)

✅ Approved hari ini
- T01 (foundation sign-off) — APPROVED attempt 1. GAP T01-#1 (make absent) ratified Option A. DB verified independent (5 tables, migration applied).
- adopt-T02 (migration) — ADOPTED (PM A canonical, no re-exec). All constraints verified incl. live mutual-exclusion CHECK.
- adopt-T11 (tenant-guard) — ADOPTED (PM A canonical, no re-exec). Fail-open invariant recorded §6.

🔄 In progress
- T03 (tiers seed) — ASSIGNMENT issued §2, awaiting Executor A PLAN. First Slot A code task, branch feat/seed-foundation.

⛔ Rejected
- (none — T01 clean APPROVE, 0 re-spin)

🚨 Eskalasi ke Parent PM
- (none) — GAP T01-#1 resolved slot-internal. Informational: tenant-guard fail-open invariant → Parent §10 (cross-dev, relevant T07 wiring).

📅 Gate status (global)
- Next gate: G1. Slot A foundation: T01 ✅ T02 ✅ T11 ✅ — remaining T03 (active) + T04 (next). G1 near-closed for Slot A.
- Open Qs slot A: 0.

📈 Progress slot A
- 3 / 5 signed-off (T01 approved · T02 adopted · T11 adopted). T03 active, T04 un-blocked.

🎯 Fokus besok
- T03 PLAN ACK → SUBMIT VERDICT → issue T04 ASSIGNMENT → G1 Slot A foundation complete.
```

### cycle 1 — 2026-06-30 (Slot A ONLINE — Nathan hadir, first assignment issued) — superseded by update 2 above

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

### 2026-06-30 — `make` binary unavailable on Slot A host (durable, slot-scoped)

**What**: macOS Command Line Tools belum ter-install → `/usr/bin/make` cuma stub xcode-select (invoke = popup installer, runs nothing). Tidak ada `gmake`/homebrew make. Surfaced di SUBMIT T01 (GAP T01-#1).

**Resolution**: ratified Option A — pakai underlying recipe (pnpm/docker) langsung; `make` = thin wrapper, CI jalankan literal make. Detail §3 GAP T01-#1.

**How to apply (future Slot A sessions/tasks)**: JANGAN tunggu/instal Xcode CLT. Map target → recipe langsung:
- `make check` → `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:unit`
- `make start` → `docker compose up -d --wait postgres redis` (+ `pnpm prisma:generate` + `pnpm prisma:migrate:dev`)
- `make db-migrate` → `pnpm prisma:migrate:dev` · `make db-seed` → `pnpm seed` · `make install` → `corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile`
- CI (Node 20) tetap source-of-truth untuk literal-make gate.

### 2026-06-30 — tenant-guard fail-open invariant (adopt-T11, Slot A canonical — durable)

**Invariant (Slot A owns)**: `src/plugins/tenant-guard.ts` PASSES THROUGH on missing/invalid access cookie (delegates 401 ke upstream `@fastify/jwt` + handler — design "Amendment 1"). Ini spec-compliant & **bukan** fail-open SELAMA setiap protected route juga punya jwt-auth ter-wire upstream (missing cookie → jwt 401 sebelum handler jalan).

**Fail-open boundary**: protected route yang di-wire dengan tenant-guard TAPI tanpa jwt-auth → missing cookie lolos = fail-open (langgar MVP §4.1).

**How to apply**: Slot A jaga invariant ini di tiap amendment tenant-guard masa depan + flag saat review wiring route (relevan T07 wiring, Slot B). Informational note ke Parent §10 (cross-dev). Bukan blocker adopt — ADOPTED.

### 2026-06-30 — `.prisma/client` value-import = runtime ESM crash (P0, durable lesson)

**What**: `src/core/prisma/prisma-client.ts:25` does `import { PrismaClient } from '.prisma/client'` (runtime **value** import). `.prisma/client` is a valid TYPE specifier but an **invalid Node-ESM runtime specifier** → `ERR_INVALID_MODULE_SPECIFIER`. Crashed `pnpm seed`, `dev:api` (tsx). **Latent on main** (PR#1+#2) until T03's `pnpm seed` (first standalone Node-ESM import of the singleton) exposed it. Surfaced by exec-A BLOCKED T03; PM A reproduced.

**Fix (CORRECTED after rebuttal — initial @prisma/client ruling was WRONG):** add `tsconfig.json` path `".prisma/client": ["node_modules/.prisma/client"]` (tsx honors tsconfig paths → resolves to the real generated client → instantiates + real types). **Do NOT switch to `@prisma/client`**: under `.npmrc node-linker=isolated` (ADR-0002), `@prisma/client` has no adjacent generated client → `new PrismaClient()` throws "did not initialize" + types degrade to `any`. The original `.prisma/client` import is correct; only the *runtime resolution* needed the tsconfig path. (PM A verified both: `@prisma/client` instantiation throws; tsconfig-path makes `.prisma/client` instantiate + typecheck clean.) Detail §3 GAP T03-#2 + §2 RE-RULING.

**Why it hid**: jest's resolver leniently maps `.prisma/client`→`node_modules/.prisma/client`; tsc + eslint accept it for TYPES. So 187 tests green while the service can't boot. **Type-check + test-green ≠ runtime-boots.**

**How to apply (durable for Slot A)**:
- **`resolve ≠ instantiate ≠ types-ok`**: confirming an `import()` resolves does NOT prove `new X()` works or that the type isn't `any`. Under pnpm `node-linker=isolated`, verify by INSTANTIATING + a `typecheck`/`lint`, not just importing. (This is the gap that made my first Option-B ruling wrong — caught by exec-A rebuttal.)
- Generated Prisma client under isolated pnpm: keep the `.prisma/client` import; make it runtime-resolvable via tsconfig path (dev) and `tsc-alias` (prod dist) — NOT by switching to `@prisma/client`.
- **Don't trust "tests green" as boot-proof.** Foundation/G1 sign-off MUST include an actual runtime boot of the entrypoint (`dev:api` under tsx). ⚠️ **T01 gap owned**: T01 `make start` validated DB+Redis deps + migration but never booted the api process — this slipped my T01 APPROVE. Future foundation sign-offs add an api-boot step.
- **Prod `node dist` is separately broken** (Q-A-04): `tsc` emits ALL path aliases (`@core/*` etc. + `.prisma/client`) verbatim → `ERR_MODULE_NOT_FOUND`. Needs `tsc-alias` build step (new dep → PO approval). Pre-existing; not Prisma-specific.

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
| T01 | pnpm install verify + `make check` green | ✅ `approved` (GAP T01-#1 ratified) | none | G1 |
| T02 | Initial Prisma migration | ✅ `adopted` (PM A canonical) | T01 | G1 |
| T11 | tenant-guard middleware | ✅ `adopted` (PM A canonical) | T01 | G2 |
| T03 | Tiers seed (4 rows) | 🔵 `ACTIVE` — ASSIGNMENT §2, awaiting PLAN | T02 ✓ | G1 |
| T04 | `seed-super-admin` CLI | `READY (un-blocked, next)` | T02 ✓ | G1 |

Sequence: ~~T01~~ ✅ → ~~adopt-T02~~ ✅ → ~~adopt-T11~~ ✅ → **T03 (active)** → **T04 (next)** → **Q-A-04 prod-boot fix** (`tsc-alias`, PO-approved §4-D06, Slot A foundation task, queued AFTER T03/T04).

> **Note**: T03 dev unblock = `tsconfig.json` path `.prisma/client` (no dep, Option A). Separate from the prod `tsc-alias` task above. Both Slot A; both code → branch → Nathan merges (I notify when each verified-ready).

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM A:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot A)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
