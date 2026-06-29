# PM-STATUS-B — Qooma Backend · Dev B (Nanak)

> **Per-dev tracker untuk slot B (Nanak).** PM B + Executor B komunikasi **hanya** via file ini. Roll-up short summary ke `PM-STATUS-PARENT.md §2` setelah tiap VERDICT atau end-of-session.
>
> **PM A, PM C, Executor A, Executor C — JANGAN edit file ini.** File ini private ke slot B.
>
> **Identity check**: di response pertama session WAJIB confirm `Role: PM | Executor`, `Slot: B (Nanak)`. Bila user belum sebut slot — STOP, tanya dulu (lihat `KICKOFF.md §4`).
>
> Format block di §2 Active assignments **append-only** (lihat `EXECUTOR-PROTOCOL.md §0.5` & `PM-AGENT.md §0.4`).

---

## 0. Current focus (slot B)

- **Pace model**: criteria-based, no calendar deadlines (PO ruling 2026-06-29) — lihat PARENT §0.
- **Active task**: T05 — Auth core endpoints (login/logout/refresh) · `READY-PARTIAL (unit-only)`
- **Branch**: `feat/auth-core` (Executor B finalize di PLAN)
- **Next gate (global)**: G2 untuk T05 (modul auth) — lihat `PM-STATUS-PARENT.md §5`
- **Cycle 1 sequence (PO-ratified)**: **T05 → T06 → T11 → T07**. Don't pick T06 sampai T05 APPROVED.
- **Single-dev cycle**: hanya Slot B (Nanak) online; T01..T04 (Slot A foundation) `PARKED` — integration test deferred sampai T02 ships.

---

## 1. Task tracker (slot B — PM B authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=B. PM B update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status                                   | Verified by PM | Notes                                                                                                  |
| --- | ---------------------------------- | ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| T05 | Auth core endpoints (login/logout/refresh) + sessions/JWT/CSRF plumbing | `assigned · READY-PARTIAL (unit-only)`   | —              | Cycle 1 task #1. Integration deferred until T02 (Slot A) ships. Spec: `MVP-AUTH-FIRST.md §1` row 1.    |
| T06 | Auth current-user + password rotation gate | `backlog · READY-PARTIAL (unit-only)`    | —              | Cycle 1 task #2 — picks up after T05 APPROVED.                                                         |
| T11 | tenant-guard middleware (cross-slot execution per PARENT §4 deviation) | `backlog · READY-FULL`                   | —              | Cycle 1 task #3. Ownership of record = Slot A; execution by Slot B this cycle only.                    |
| T07 | Per-hotel users CRUD (gm_admin scope) | `backlog · READY-PARTIAL (unit-only) — gated by T11` | —     | Cycle 1 task #4 — wires T11. Sequence: T05 → T06 → T11 → T07.                                          |

---

## 2. Active assignments (append-only)

> **Executor B** append `ASSIGNMENT` block saat claim task. **PM B** append `ACK` / `VERDICT` sub-block di bawah block executor — JANGAN edit block lama.

### ASSIGNMENT T05 — claimed by exec-B (Nanak) at cycle 1 (2026-06-29)

- **Spec row pointer**: `docs/spec/MVP-AUTH-FIRST.md §1` row 1 (`POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh`) + canonical detail di `docs/spec/01-auth-identity.md §1.1` + §3 sessions table + `docs/SERVICE-CHARTER §2` cookie/JWT/CSRF contract
- **Routed from**: `PM-STATUS-PARENT.md §1` T05 row + §8 T05 audit block (full DoD lines 214–251)
- **Branch**: `feat/auth-core` (Executor B finalize di PLAN — `feat/<modul>-<short>` per CLAUDE.md §12)
- **Status flag**: `READY-PARTIAL (unit-only)` — see PARENT §8 audit summary
- **Gate target**: G2 (modul auth lands here)

#### PM B notes — Scope this cycle (PARTIAL — unit-only)

**In scope this submission**:
1. `POST /api/auth/login` route handler — accept `{ email, password }`, verify password hash, issue access JWT (httpOnly cookie `token=<jwt>`), persist session row (refresh token + csrf token + expires_at + ua + ip), return `{ user, csrfToken }` shape locked di `01-auth-identity §1.1`.
2. `POST /api/auth/logout` route handler — clear cookie, mark session row `revoked_at = NOW()`.
3. `POST /api/auth/refresh` route handler — consume refresh cookie, rotate access JWT idempotently, rotate session row.
4. zod request/response schemas (`auth.schema.ts`).
5. Service orchestrator (`auth.service.ts`) — orchestrate hash port + sessions repo + JWT signing.
6. Repository class (`auth.repository.ts`) — Prisma direct, NO interface wrap (per ADR-0001 + CLAUDE.md §4).
7. Types (`auth.types.ts`).
8. Barrel `index.ts`.
9. Wiring stub di `src/entrypoints/api.ts` (manual DI per CLAUDE.md §4 — no tsyringe).
10. **Unit tests** untuk service + zod schema parse + route inject handlers. Coverage target ≥ 80% line per CLAUDE.md §8 + `docs/TESTING.md §9` (auth = critical → 90% recommended, 80% floor).

**Explicitly OUT-of-scope this cycle (deferred until T02 ships)**:
- Integration tests for `AuthRepository` (testcontainers Postgres + `prisma migrate dev`) — Slot A's T02 prerequisite not yet shipped.
- Full E2E happy-path via Fastify `inject()` against real DB — same reason.
- Tenant-guard middleware wiring — login is **public** (no guard), logout/refresh authenticate via cookie directly without scoped queries → defer T11 dep to T07.
- CSRF token rotation on `/me` — that's T06's scope, coordinate handoff via shared `auth.service.ts` helper.
- Real `argon2`/`bcrypt` adapter wiring smoke test — defer until package install ratified (raise in PLAN if executor needs PO approval for hash lib per CLAUDE.md §11 "tambah package.json deps").

#### PM B notes — DoD this submission

- [ ] 3 endpoints (`login`/`logout`/`refresh`) authored: route handler + zod schemas (req + resp) + service method + repo method
- [ ] Cookie + CSRF response shape **matches `01-auth-identity §1.1`** verbatim — eksplisit field-by-field assertion di unit test
- [ ] Sessions table writes (refresh_token + csrf_token + expires_at + user_agent + ip_address) — repo method authored even though full integration test deferred
- [ ] JWT plumbing: short-lived access (default 15 min per spec §3 — override-able via `config.JWT_ACCESS_TTL`), long-lived refresh (30 d per CLAUDE.md §6)
- [ ] **Password hash port + adapter** — `ports/password-hash.port.ts` + `adapters/argon2-hash.adapter.ts` (or bcrypt; Slot B picks di PLAN). Rationale port: per ADR-0001 + Parent PM note (PARENT §8 T05 row line 250), hash IS swappable external lib; tests benefit dari in-memory fake. If Executor B disagrees → rebut di PLAN dengan ADR pointer.
- [ ] Unit tests (per `docs/TESTING.md §4` pattern):
  - Service tests mock hash port + mock repo INSTANCE (NOT mock `PrismaClient` — repo is just a Prisma wrapper, mock the class instance per TESTING.md §4 example)
  - Route tests via Fastify `inject()` with mocked service decorator
  - zod schema parse + reject paths (invalid email, short password, missing fields → ValidationError)
  - Happy path: login → cookie set + csrfToken returned + session row create called with correct shape
  - 401 path: wrong password → `AuthError` thrown
  - Logout: session revocation invoked
  - Refresh: new JWT issued + old refresh consumed
- [ ] **Test naming**: `it('should <expected> when <condition>')` per CLAUDE.md §8 + TESTING.md §4
- [ ] **Coverage line ≥ 80%** untuk file yang ditambah (verify via `pnpm test:coverage` — record di SUBMIT)
- [ ] Integration test **placeholder** file `auth.repository.integration.test.ts` dengan `it.todo()` referencing T02 dependency (so T02 ship triggers fill-in — same pattern as T11 per PARENT §8 line 311)
- [ ] `make check` green (lint + format-check + typecheck + test-unit) — full output di SUBMIT
- [ ] Security floor (CLAUDE.md §6 + docs/SECURITY.md): password bcrypt cost 12 OR argon2 (PLAN decides); refresh token **hashed in DB** (SHA-256 per SECURITY.md §3); JWT signed dengan `JWT_ACCESS_SECRET` dari `config`; `timingSafeEqual` untuk password comparison if you implement it manually (use lib default — argon2/bcrypt sudah timing-safe internal); no secrets hardcoded; logger redact pattern `password|token|secret|authorization` not bypassed; PII (email) masked di log via `maskEmail()` per CLAUDE.md §6
- [ ] No `any` / `console.log` / `@ts-ignore` (CLAUDE.md §5 + §13) — `@ts-expect-error` allowed only with comment alasan
- [ ] No `throw new Error('string')` — pakai `AppError` subclass (`AuthError`, `ValidationError`)
- [ ] Named exports only (CLAUDE.md §5 — default export only allowed di `entrypoints/api.ts` + config files)
- [ ] Public function explicit return type
- [ ] File ≤ 300 LOC rule-of-thumb (CLAUDE.md §13)

#### PM B notes — File ownership

Per `docs/MODULE_TEMPLATE.md §1` (modul dengan external IO):

```
src/modules/auth/
├── index.ts                            (barrel — export routes + service type)
├── auth.routes.ts                      (Fastify plugin — POST login/logout/refresh)
├── auth.service.ts                     (orchestrator)
├── auth.repository.ts                  (Prisma direct — sessions + users)
├── auth.schema.ts                      (zod — Login/Logout/Refresh req+resp)
├── auth.types.ts                       (Session, JwtClaims, etc.)
├── ports/
│   └── password-hash.port.ts           (PasswordHashPort interface)
├── adapters/
│   └── argon2-hash.adapter.ts          (or bcrypt — PLAN decides)
└── __tests__/
    ├── auth.service.test.ts            (unit — mock port + mock repo instance)
    ├── auth.routes.test.ts             (unit — Fastify inject)
    ├── auth.schema.test.ts             (unit — zod parse)
    └── auth.repository.integration.test.ts  (PLACEHOLDER it.todo — fill in after T02)
```

Wiring (modify):
- `src/entrypoints/api.ts` — register `authRoutes` plugin dengan prefix `/api/auth`; decorate `fastify.services.auth = new AuthService(...)`.

#### PM B notes — Parent doc refs (WAJIB baca executor sebelum PLAN)

- **`CLAUDE.md §4`** — Hexagonal Disiplin (kapan port wajib vs dilarang) + `§5` (TS strict + naming + error handling) + `§6` (security WAJIB: enkripsi, HMAC, masking, JWT TTL) + `§8` (testing WAJIB: unit + coverage 80%)
- **`docs/MODULE_TEMPLATE.md`** — full file-by-file convention untuk modul + barrel export rules
- **`docs/SECURITY.md §2`** (JWT 8h access / 30d refresh / refresh hashed) + `§3` (encryption envelope + key rotation) + `§5` (PII masking helpers) + `§6` (rate limit di login — pakai `@fastify/rate-limit` per PARENT §1 row config)
- **`docs/TESTING.md §4`** (unit pattern dengan mock port + mock repo instance) + `§9` (coverage targets: auth = critical 90% recommended, 80% floor)
- **`docs/decisions/0001-hexagonal-disiplin.md`** — port wajib untuk external IO (hash lib included); Prisma TIDAK pakai port
- **`docs/decisions/0006-fastify-vs-express.md`** — Fastify plugin system (route + plugin pattern)
- **`docs/decisions/0007-prisma-vs-alternatives.md`** — Prisma direct, no `IUserRepository` wrap

#### PM B notes — Acceptance criteria recap

Copy from `MVP-AUTH-FIRST §1` row 1 + cycle-1 unit-only addendum:

1. Login endpoint matches `01-auth-identity §1.1` shape (cookie + `{ user, csrfToken }` response).
2. Logout revokes session row.
3. Refresh rotates access JWT idempotently.
4. `make check` green (lint + format-check + typecheck + **unit test only this cycle**).
5. No `any` / `console.log` / `@ts-ignore` (drift floor per `PM-AGENT.md §3 Step 2`).
6. Coverage line ≥ 80% for files added (critical floor — pakai jest coverage report).
7. Security floor (SECURITY.md §6 baseline): hashed refresh token, masked email di log, no plaintext secret di code.
8. **Integration test deferred** — placeholder file with `it.todo()`. Full APPROVE deferred until T02 ships di Slot A; this cycle PM B post **APPROVE-PARTIAL** in VERDICT dengan re-open trigger noted.

#### PM B notes — Sequence + cycle constraint

- **Cycle 1 sequence (PO-ratified, PARENT §10)**: T05 → T06 → T11 → T07. **Don't pick up T06 sampai T05 APPROVED.**
- **Single-dev cycle**: only Slot B (Nanak) online; T01..T04 (Slot A foundation) `PARKED · unowned-this-cycle` di PARENT §1. Integration test for `auth.repository` deferred until T02 (initial migration) ships.
- **APPROVE-PARTIAL convention** for this cycle: PM B akan issue `APPROVE-PARTIAL` (unit scope met) di VERDICT — task tetap berlanjut ke T06; row di PARENT §1 status flag bertahan `READY-PARTIAL (integration deferred)` sampai T02 unparks dan PM B re-open T05 untuk integration validation.
- **Re-open trigger**: ketika Slot A T02 APPROVED + migrate applied, PM B akan **re-open T05** dengan ASSIGNMENT addendum (integration scope only) — exec B isi `it.todo()` placeholder + run full integration suite.

#### PM B notes — Open items untuk Executor B raise di PLAN

1. **Hash lib choice** — argon2 vs bcrypt. Spec SECURITY.md §3 menyebut `bcrypt cost 12`; spec lebih lentur — Executor B propose di PLAN dengan rationale. **CLAUDE.md §11**: tambah package.json deps **WAJIB tanya user dulu** → raise sebagai GAP di PLAN supaya PM B route ke Parent PM → PO sebelum executor `pnpm add`.
2. **JWT library** — `@fastify/jwt` vs `jose` vs `jsonwebtoken`. Same install-approval rule. Recommend `@fastify/jwt` (already Fastify-native, sudah ada di Fastify ecosystem) — verify `package.json` apakah sudah ada (if yes, no approval needed).
3. **CSRF token generation** — `crypto.randomBytes(32).toString('hex')` (Node built-in, no deps) — recommended. Confirm di PLAN.
4. **Cookie flags** — `httpOnly: true, secure: <env-conditional>, sameSite: 'lax'` per spec — confirm flag matrix di PLAN.
5. **Rate-limit login** — SECURITY.md §6 says 5 fail/15 min per IP+email + 15 min lockout. Decide di PLAN: include rate-limit plugin di this submission, atau defer ke separate task. Recommend defer (not in T05 row DoD) — but state explicitly.

Awaiting Executor B PLAN.

<!--
TEMPLATE — copy untuk task baru:

### ASSIGNMENT T## — claimed by exec-B (Nanak) at H{N} HH:MM
- Branch: feat/<modul>-<short>
- Routed from: PM-STATUS-PARENT.md §1 T## (Parent PM assigned)

#### PLAN T## — exec-B (Nanak) at H{N} HH:MM

**Scope recap**
- ...

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot B (Nanak) ✓
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

Awaiting PM B ACK.

##### PM B ACK — T## PLAN APPROVED, proceed to coding (H{N})
- (atau) PM B REJECT-PLAN — fix sebelum mulai: <list>

#### SUBMIT T## — exec-B (Nanak) at H{N} HH:MM (attempt 1)

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

Requesting PM B VERDICT.

##### VERDICT T## — APPROVED (H{N}, revisi N) by PM B
- All DoD verified ✓
- Drift scans clean ✓
- `make check` PASS confirmed by PM rerun
- → §1 task tracker updated; row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

(atau)

##### VERDICT T## — REJECT (revisi N) by PM B

⛔ Items to fix:

**Item #1 — <kategori>** `src/.../<file>.ts:<line>`
- **Violation**: <pelanggaran>
- **Fix**: <satu kalimat fix-path>

**Item #2 — ...**
- ...

Re-run `make check` after fix, confirm pass, resubmit (attempt N+1).

(atau)

##### VERDICT T## — ESCALATE by PM B
- Reason: <gap planning / open Q PO>
- Escalated to Parent PM at H{N} HH:MM (will reach PO via PARENT §3)
- Executor B: pick task lain dari §8 sementara

-->

---

## 3. Slot B open questions (mirror to PARENT §3)

> PM B catat di sini ketika executor B raise `GAP` atau `BLOCKED`. Setelah resolve atau eskalasi ke Parent PM, update status. Parent PM consolidate ke `PM-STATUS-PARENT.md §3`.

| ID            | Question | Source         | Status | Resolution |
| ------------- | -------- | -------------- | ------ | ---------- |
| —             | —        | —              | —      | —          |

---

## 4. Drift baseline (slot B files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

> PM B jalankan drift scan per `PM-AGENT.md §3 Step 2` setiap SUBMIT + end-of-day full scan untuk slot B's touched files.

---

## 5. Standup log slot B (latest di atas)

> PM B post daily standup di sini, lalu post 1-2 baris ringkas ke `PM-STATUS-PARENT.md §6` (yang Parent PM consolidate jadi cross-team report).
>
> Format: per `PM-AGENT.md §7`.

### H0 — TBD (Nanak onboard, awaiting first assignment)

```
QOOMA BE B (Nanak) — Standup — H{N}/{total}

✅ Approved hari ini
- (none — belum start)

🔄 In progress
- (none)

⛔ Rejected
- (none)

🚨 Eskalasi ke Parent PM
- (none)

📅 Gate status (global)
- Next gate: G1 — lihat PARENT §5

📈 Progress slot B
- 0 / TBD task

🎯 Fokus besok
- Awaiting Parent PM first assignment.
```

---

## 6. Slot B incidents / lessons (own-scope only)

> Hal yang affect cuma slot B. Bila affect > 1 dev, escalate ke `PM-STATUS-PARENT.md §7` lewat Parent PM.

_(kosong)_

---

## 7. PM B operating notes (untuk Executor B)

- PM B baca `PM-AGENT.md` (full) + `PM-STATUS-B.md` + scan `PM-STATUS-PARENT.md` (§1 mine, §3, §5, §8).
- PM B **TIDAK** edit `src/`, `prisma/schema.prisma` (kecuali typo non-semantik), `package.json` deps — read-only di area itu.
- PM B **BOLEH** update planning docs untuk sync (per `PM-AGENT.md §0.6`) — TAPI escalation ke Parent PM dulu bila perubahan affect dev lain. Tiap edit planning docs dicatat di `PM-STATUS-PARENT.md §4`.
- PM B **TIDAK** edit `PM-STATUS-A.md` / `PM-STATUS-C.md` — strict per-slot ownership.
- PM B **TIDAK** jawab open contract / package question — hanya PO via Parent PM.
- PM B **TIDAK** negosiasi scope. Descope adalah otoritas PO via Parent PM.
- On REJECT: fix exactly the listed items (file:line). Re-run `make check` self-validate. Resubmit per `EXECUTOR-PROTOCOL §4.5`, sebut item mana yang sudah di-address.
- Rebuttal: bila Executor B yakin PM B flag salah, post one-sentence rebuttal + evidence di sub-block `REBUTTAL T## item-#N`. PM B re-check dalam session yang sama.
- Untuk CLI command apapun yang touch root repo (scaffolder, generator, dll.): tulis exact command di PLAN supaya PM B bisa flag risiko overwrite sebelum executor run.
- Branch naming: `feat/<modul>-<short>`, `fix/<modul>-<short>`, `chore/<short>`, `docs/<short>` (per `CLAUDE.md §12`).
- Commit message: conventional commits — `feat(modul): X`, `fix(modul): Y`.
- Gunakan `make commit MSG="..."` — auto lint + typecheck + format-check sebelum commit.

---

## 8. Slot B queue (filter dari PARENT §8 di mana Slot=B)

> Parent PM authority untuk rewrite — PM B baca only. Executor B self-select dari sini bila tidak ada explicit ASSIGNMENT.

**Cycle 1 sequence (PO-ratified, lihat PARENT §8 + §10)**: **T05 → T06 → T11 → T07**.

| Order | T## | Title                                                              | Status                                          | Notes                                                                                                  |
| ----- | --- | ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1     | T05 | Auth core endpoints (login/logout/refresh) + sessions/JWT/CSRF     | `assigned · READY-PARTIAL (unit-only)`          | **Currently assigned** (lihat §2). Integration deferred → T02. APPROVE-PARTIAL convention this cycle.  |
| 2     | T06 | Auth current-user + password rotation gate (`/api/auth/me`)        | `backlog · READY-PARTIAL (unit-only)`           | Wait sampai T05 APPROVED. Rotation-gate = cross-cutting plugin.                                        |
| 3     | T11 | tenant-guard middleware (cross-slot execution per PARENT §4 dev.)  | `backlog · READY-FULL`                          | Ownership of record = Slot A; execution by Slot B this cycle only. Resolves Q-PARENT-01.               |
| 4     | T07 | Per-hotel users CRUD (gm_admin scope)                              | `backlog · READY-PARTIAL (unit-only) — gated`   | T11 must APPROVE before T07 SUBMIT. Reuse generate-password helper (coord di T07 PLAN).                |

**Single-dev cycle constraint**: T01..T04 (Slot A foundation) + T08..T10 (Slot C admin) PARKED. If Slot B exhausts READY-PARTIAL scope sebelum Slot A unparks → eskalasi ke Parent PM untuk further deviation (Slot B absorb T01..T04 as one-off, per PARENT §8 line 210).

**Full task detail**: lihat PARENT §8 (each T## block dengan Scope + DoD + Parent PM notes). PM B will copy DoD ke ASSIGNMENT block di §2 saat each cycle.

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM B:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot B)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
