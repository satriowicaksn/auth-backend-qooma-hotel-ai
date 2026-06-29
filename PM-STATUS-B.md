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
- **Active task**: T11 — tenant-guard middleware · `assigned · READY-FULL (cross-slot per §4-D01, cycle 4 single-dev)` — ASSIGNMENT issued cycle 4 (2026-06-29). **CROSS-SLOT execution** per PARENT §4-D01 (Slot A canonical owner; Slot B execution one-off). 5 open items for PLAN. Estimate ~3-5h impl→SUBMIT.
- **T05+T06 status**: both `APPROVE-PARTIAL` (cycle 2 + cycle 3 close). Re-open trigger waits for Slot A T02; will batch-upgrade alongside T11 to FULL APPROVE when T02 ships.
- **Cycle 4 sequence (PO-ratified)**: T11 (this) → T07 (per-hotel users CRUD, depends on T11).
- **Branch**: `feat/auth-core` (20 impl commits ahead of `main` post-fix-rebase) — T11 will stack on T06; same branch per §7 hygiene.
- **Branch hygiene rule active** (lihat §7) — PM-STATUS commits direct to main; impl commits on `feat/auth-core` until full APPROVE.
- **Next gate (global)**: G2 untuk T05 (modul auth) — lihat `PM-STATUS-PARENT.md §5`
- **Cycle 1 sequence (PO-ratified)**: **T05 → T06 → T11 → T07**. Don't pick T06 sampai T05 APPROVED.
- **Single-dev cycle**: hanya Slot B (Nanak) online; T01..T04 (Slot A foundation) `PARKED` — integration test deferred sampai T02 ships.

---

## 1. Task tracker (slot B — PM B authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=B. PM B update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status                                   | Verified by PM | Notes                                                                                                  |
| --- | ---------------------------------- | ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| T05 | Auth core endpoints (login/logout/refresh) + sessions/JWT/CSRF plumbing | `assigned · APPROVE-PARTIAL (cycle 2 unit-scope; full APPROVE held for T02)` | PM B — cycle 2 (2026-06-29) | VERDICT cycle 2 (2026-06-29) attempt 1 → APPROVE-PARTIAL. Branch `feat/auth-core` 11 commits ahead of `main` (no merge). 13/13 verifications match; 5 DDs ACCEPT; coverage 98.56% stmt / 100% line / critical files 100%. 4 foundation gaps → Q-B-02 (§3). PARTIAL→FULL upgrade conditions in §2 VERDICT block. |
| T06 | Auth current-user + password rotation gate | `approved-partial · cycle 3 close · full APPROVE held (T02)` | PM B — cycle 3 (2026-06-29) attempt 2 | VERDICT attempt 2 (2026-06-29) → APPROVE-PARTIAL. Fix commit `e753b38` on `feat/auth-core` (BusinessRuleError 422 per spec §1.1). 14/14 verifications match; coverage 99.57% line; drift zero. 6 DDs ACCEPT; 3 open items closed (#1 RESOLVED, #2/#3 deferred to T_AUX_01/02 backlog). Full APPROVE batched with T05 pending T02. |
| T11 | tenant-guard middleware (cross-slot execution per PARENT §4-D01) | `assigned · READY-FULL (cross-slot per §4-D01, cycle 4 single-dev)` | —              | Cycle 4 task. ASSIGNMENT issued 2026-06-29. Ownership of record = Slot A; execution by Slot B this cycle only. Scope: `src/plugins/tenant-guard.ts` factory + 4-role unit coverage + 5 open items for PLAN. Cross-slot commit ceremony WAJIB. |
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

#### PLAN T05 — exec-B (Nanak) at cycle 1 (2026-06-29) attempt 1

**Scope recap**

Implement Auth core (T05) per ASSIGNMENT §"In scope" 1-10 + DoD lines 71-94. Three endpoints (`POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh`) wired in `src/modules/auth/` (new module) — zod schemas, service orchestrator, Prisma-direct repository, **password hash port + argon2 adapter**, JWT plumbing via `@fastify/jwt` (already installed), refresh token rotation with SHA-256-hashed storage per SECURITY.md §3, session row writes (refresh_token + csrf_token + expires_at + user_agent + ip_address) keyed off the existing `Session` model in `prisma/schema.prisma:106-122`. Unit tests cover service (mock hash port + mock repo class instance per TESTING.md §4) + zod schemas + route handlers via Fastify `inject()`. Integration test is a `it.todo()` placeholder gated on T02. Wiring stub di `src/entrypoints/api.ts` (manual DI — no tsyringe per CLAUDE.md §4). Cycle 1 APPROVE-PARTIAL convention applies — full APPROVE deferred until T02 ships.

**Session-start gate** (EXECUTOR-PROTOCOL §2)

- Identity confirmed: Executor, Slot B (Nanak) ✓
- CLAUDE.md loaded ✓ (auto-load by harness)
- Task spec read: `MVP-AUTH-FIRST.md §1` row 1; `01-auth-identity §1.1` (login response shape locked at H3), §3 (sessions table + rotation strategy), §5 (hash lib options); `SERVICE-CHARTER §2` (cross-service contract notes)
- Parent docs spot-read: `CLAUDE.md §4` (Hexagonal Disiplin — port wajib untuk external IO, dilarang wrap Prisma), `§5` (TS strict + naming + error handling), `§6` (security floor — JWT 8h/30d, hash refresh, mask PII), `§8` (testing — 80% line floor, JANGAN mock Prisma), `§11` (workflow — package install butuh PO approval); `docs/MODULE_TEMPLATE.md §1-§4`; `docs/SECURITY.md §2-§6`; `docs/TESTING.md §4` (unit pattern dengan mock port + mock repo INSTANCE) + `§9` (auth=critical, 90% recommended/80% floor) + `§11` (builder pattern); `docs/decisions/0001-hexagonal-disiplin.md` (port hanya external IO); `prisma/schema.prisma` (User/Session models already defined — no schema migration needed for T05)
- Dependencies: none **required** (T01..T04 PARKED per cycle-1 single-dev model; integration scope deferred). Routine read of `src/core/errors/app-errors.ts` confirms `AuthError`/`ValidationError`/`NotFoundError` ready. `src/core/config/env.ts:36-39` already exposes `JWT_ACCESS_SECRET`/`JWT_ACCESS_TTL`/`JWT_REFRESH_SECRET`/`JWT_REFRESH_TTL`. `src/shared/utils/masking.ts` exposes `maskEmail()`. `@fastify/jwt ^8.0.1` already in `package.json:37` — no install GAP for JWT lib.
- `make typecheck` clean: **BLOCKED — system disk full (ENOSPC) on `/private/tmp`; `pnpm install --frozen-lockfile` fails before tsc runs.** Will retry post-cleanup or post-machine-restart; baseline clean is assumed from `main` state (no `src/` mutations since `1e32e34 Init project`).
- `make lint` clean: same ENOSPC blocker; same assumption.
- Scaffolder risk: **none** — no `pnpm create` / `prisma init`-style command planned. Only `pnpm add` for two new packages (see GAPs #1, #2).

**Files to create**

```
src/modules/auth/
├── index.ts                                  (barrel — export authRoutes + AuthService type; NO repo/adapter export)
├── auth.routes.ts                            (Fastify plugin — POST /login, /logout, /refresh)
├── auth.service.ts                           (orchestrator: hash port + repo + JWT issuer + masking)
├── auth.repository.ts                        (Prisma direct — user lookup + session create/revoke/rotate; NO interface wrap per ADR-0001)
├── auth.schema.ts                            (zod: LoginRequest/LoginResponse/RefreshResponse/LogoutResponse)
├── auth.types.ts                             (JwtClaims, SessionContext, AuthDomain types)
├── ports/
│   └── password-hash.port.ts                 (PasswordHashPort interface — hash, verify)
├── adapters/
│   └── argon2-hash.adapter.ts                (Argon2Adapter implements PasswordHashPort; argon2id default)
└── __tests__/
    ├── auth.service.test.ts                  (unit — mock PasswordHashPort + mock AuthRepository class instance)
    ├── auth.routes.test.ts                   (unit — Fastify inject() against in-process app with mocked services decorator)
    ├── auth.schema.test.ts                   (unit — zod parse happy/reject paths)
    └── auth.repository.integration.test.ts   (PLACEHOLDER: `it.todo()` x N referencing T02 dependency)
```

Optional helper (only if reusable across §"Test builders" §11):

```
src/modules/auth/__tests__/auth.builders.ts   (aUser, aSession, aLoginRequest builders — TESTING.md §11)
```

**Files to modify**

- `src/entrypoints/api.ts` — wire `AuthService` (manual DI per CLAUDE.md §4): `new AuthService(new AuthRepository(db), new Argon2Adapter(), fastify.jwt, config)`; `fastify.register(authRoutes, { prefix: '/api/auth' })`; register `@fastify/cookie` plugin (pending GAP #2) and `@fastify/jwt` (with `cookie` opt).
- `src/core/config/env.ts:37` — **change `JWT_ACCESS_TTL` default from `'8h'` to `'15m'`** to match spec §3 ratification (pending GAP #4). `JWT_REFRESH_TTL '30d'` stays.
- `src/shared/utils/crypto.ts` — **add `hashToken(plaintext: string): string`** export using `crypto.createHash('sha256').update(plaintext).digest('hex')` per SECURITY.md §3 (pending GAP #3). Existing `encrypt`/`decrypt` stubs untouched.
- `package.json` + `pnpm-lock.yaml` — install `argon2` (GAP #1) + `@fastify/cookie` (GAP #2). **Will NOT run `pnpm add` until GAPs cleared via PM B → Parent PM → PO.**

**Approach**

Module structure follows `MODULE_TEMPLATE.md §1` "modul dengan external IO" tree because hash lib is the one external dep (port + adapter per ADR-0001). `AuthService` receives `(repo: AuthRepository, hasher: PasswordHashPort, tokenIssuer: TokenIssuer, config: AppConfig)` — note `tokenIssuer` is a small **internal DI seam** (typed wrapper around `fastify.jwt.sign/verify` — see GAP #5), **NOT** a hexagonal port. Login flow: zod-parse body → repo `findUserByEmail` → hasher `verify` → on success generate refresh+csrf tokens (`crypto.randomBytes(32).toString('hex')` Node built-in — no dep) → repo `createSession` with refresh hashed via new `hashToken()` → service builds JWT claims `{ sub, role, hotelId, deptId }` → route sets cookies (`token` httpOnly+secure-by-env+sameSite=lax+path=/+maxAge=15m; `refresh` httpOnly+secure+sameSite=lax+path=/api/auth/refresh+maxAge=30d) + returns `{ user, csrfToken }` matching `01-auth-identity §1.1` verbatim. Logout: read refresh cookie → repo `revokeSessionByHash` → clear both cookies. Refresh: read+hash refresh cookie → repo `findActiveSessionByHash` → if expired/revoked throw `AuthError` → repo `rotateSession` (revoke old + insert new in single Prisma `$transaction`) → issue new access JWT + set fresh refresh cookie. Test strategy per `TESTING.md §4`: `AuthService` unit tests instantiate service with `jest.mocked()` repo class + `jest.mocked()` hash port + fake `TokenIssuer`; route tests use Fastify `inject()` with `fastify.decorate('services', { auth: mockedServiceInstance })`; `auth.repository.integration.test.ts` is `it.todo('should persist session when login succeeds — fill in after T02')` x N. Errors: wrong password → `AuthError('Invalid credentials')` (statusCode 401); zod-reject in `schema: { body }` returns Fastify default 400 which we map via `ValidationError` if we add a setSchemaErrorFormatter — defer formatter to T11/plugin task and let Fastify default 400 stand for now (state explicit in SUBMIT). PII at log: only `maskEmail()` on inputs; full redact pattern handled at winston layer (Slot A's responsibility once shipped).

**GAPs / questions**

- **GAP T05-#1 — argon2 install (PO approval per CLAUDE.md §11)**: hash lib not in `package.json`. ASSIGNMENT line 76 mandates `password-hash.port.ts` + adapter. Options: A) `argon2` (npm, native binding, argon2id default — OWASP 2024 password-storage CHEAT-SHEET recommended, GPU/ASIC-resistant, memory-hard), B) `bcrypt` (npm, mature, cost=12 mentioned in SECURITY.md §2), C) `bcryptjs` (pure-JS bcrypt — slower but no native compile). My intent: **A) argon2** — strictly newer/stronger than bcrypt at MVP level; `01-auth-identity §5` explicitly lists argon2id as acceptable. PM B route to Parent PM → PO. **BLOCKED-on-PO-approval-for-deps: argon2 ^0.41.x (latest stable). Will not start coding adapter until cleared.**
- **GAP T05-#2 — `@fastify/cookie` install (PO approval per CLAUDE.md §11)**: needed for `reply.setCookie()` / `request.cookies` ergonomics; `@fastify/jwt ^8` reads from `request.cookies.<name>` which **requires `@fastify/cookie` registered**. Options: A) install `@fastify/cookie ^9.x`, B) hand-roll via `reply.header('Set-Cookie', '...')` + `request.headers.cookie` parsing (error-prone, three endpoints × two cookies = repeated boilerplate). My intent: **A) install `@fastify/cookie`**. **BLOCKED-on-PO-approval-for-deps: @fastify/cookie ^9.x. Will not start coding routes until cleared.**
- **GAP T05-#3 — `hashToken()` helper placement (shared/utils ownership)**: SECURITY.md §3 mandates SHA-256 hash for refresh tokens. Repo currently has no helper. Options: A) extend `src/shared/utils/crypto.ts` with `hashToken(plaintext: string): string` export (Node built-in `createHash`; no dep), B) new file `src/shared/utils/token-hash.ts`, C) inline private helper in `auth.service.ts`. My intent: **A)** — natural home next to existing crypto envelope helpers, single function, zero dep. Cross-team touch on `shared/utils` is low-risk (additive export). Flag for PM B because Slot A may have plans for `crypto.ts`.
- **GAP T05-#4 — `JWT_ACCESS_TTL` default '8h' vs spec '15m'**: `src/core/config/env.ts:37` defaults to `'8h'` (aligned with SECURITY.md §2 generic baseline), but `01-auth-identity §3` ("Recommended: short-lived access token in cookie (15 min), long-lived refresh token …") + PM B DoD line 75 ("default 15 min per spec §3") supersede for Auth. Options: A) edit default to `'15m'` in env.ts (single-line change, all envs inherit unless override), B) leave default `'8h'` and require explicit env override in deploys. My intent: **A)** — keep config truth in sync with auth-spec ratification; SECURITY.md §2 is generic floor, spec §3 is concrete contract. Touch on `core/config/` is sensitive (Slot A's domain) — flag for PM B → Parent PM if Slot A objects.
- **GAP T05-#5 — JWT port (architectural, no install impact)**: hash gets `PasswordHashPort` per ADR-0001 + ASSIGNMENT line 76. Symmetry question — does JWT signing warrant the same? My position: **NO port** for JWT. Rationale: ADR-0001 §"Definisi tegas" mandates ports for *external IO* (HTTP API, outbound notif, S3, Bull producer) and **explicitly forbids ports for "logger, config, internal util"**. `@fastify/jwt` is a registered Fastify plugin (framework-stack, like `@fastify/cors`), pure in-process crypto, no IO — it's closer to "logger" than to "vendor adapter". Hash gets a port because PM B's DoD line 76 + Parent PM PARENT §8 row 250 cite swap-ability (argon2 ↔ bcrypt) and unit-test seam. JWT lib swap is hypothetical and the test seam comes from `fastify.jwt.sign` mock-ability at the Fastify decorator level. Approach: `AuthService` receives a thin `TokenIssuer` interface (`sign(claims) → token; verify(token) → claims`) as constructor dep — **this is an internal DI seam, NOT a hex port** — wired in entrypoint with a `FastifyJwtTokenIssuer` (1-file thin wrapper, NOT under `adapters/`). Unit tests inject a fake `TokenIssuer`. Options: A) NO hex port — internal `TokenIssuer` interface only (my intent), B) ADD `JwtSignerPort` under `ports/` for symmetry with hash, C) skip abstraction — sign inline in route handler. My intent: **A)**. Flag PM B for confirmation given hash-port asymmetry; willing to switch to B if PM B prefers strict symmetry.

**Non-GAPs explicitly confirmed (PM B item-by-item address)**

- (a) **Hash lib choice** — argon2 (argon2id default). Rationale + install GAP raised as #1 above.
- (b) **JWT library** — `@fastify/jwt ^8.0.1` **already installed** (`package.json:37`). No install GAP. Will register in `api.ts` with `{ secret: config.JWT_ACCESS_SECRET, cookie: { cookieName: 'token', signed: false } }`.
- (c) **CSRF token gen** — `crypto.randomBytes(32).toString('hex')` (Node built-in `node:crypto`). No dep, generated per-session, stored plaintext in `sessions.csrf_token` (per spec §1.1: rotates on every `GET /api/auth/me` — but `/me` is T06 scope; for T05 we set on login and refresh).
- (d) **Cookie flags matrix**:

  | Cookie     | httpOnly | secure                         | sameSite | path                  | maxAge                |
  | ---------- | -------- | ------------------------------ | -------- | --------------------- | --------------------- |
  | `token`    | ✓        | `config.NODE_ENV !== 'development'` | `lax`    | `/`                   | match `JWT_ACCESS_TTL` (15m) |
  | `refresh`  | ✓        | same                           | `lax`    | `/api/auth/refresh`   | match `JWT_REFRESH_TTL` (30d) |
  | (no cookie) `csrfToken` — returned in response body, FE holds in memory per spec §1.1 |

- (e) **Rate-limit on /login + /refresh** — **defer** to separate task per PM B note line 158. `@fastify/rate-limit ^9.1.0` is already installed (`package.json:38`); the lockout policy (5 fail/15 min per IP+email + 15-min account lockout per SECURITY.md §6) is more than plugin config — it needs account-state tracking in DB or Redis. Out of T05 row DoD. Will state explicit in SUBMIT.

**Test plan (per TESTING.md §4 + §11)**

- `auth.service.test.ts` (≥ 12 tests): `describe('AuthService.login')` — should set cookie + return user/csrfToken when credentials valid; should throw AuthError when user not found; should throw AuthError when password mismatch; should throw AuthError when user is_active=false; should mask email in log. `describe('AuthService.logout')` — should revoke session row when refresh cookie present; should no-op when cookie absent (idempotent). `describe('AuthService.refresh')` — should rotate session and issue new JWT when refresh valid; should throw AuthError when session revoked; should throw AuthError when session expired; should preserve user agent/ip on rotation.
- `auth.routes.test.ts` (≥ 6 tests): `inject()` POST /login happy → 200 + Set-Cookie headers + body shape; 400 on missing field; 401 on bad password (mocked service rejection). POST /logout → 204 + Set-Cookie clear. POST /refresh → 200 + new Set-Cookie. POST /refresh w/o cookie → 401.
- `auth.schema.test.ts` (≥ 4 tests): LoginRequest accepts valid; rejects invalid email; rejects short password (< 12 char per SECURITY.md §2.4); rejects missing fields.
- `auth.repository.integration.test.ts` — `it.todo()` placeholders mirroring the unit list, all tagged "fill in after T02".
- Coverage target: ≥ 90% line on `auth.service.ts` + `auth.routes.ts` + `auth.schema.ts`; ≥ 80% on `argon2-hash.adapter.ts` (verify hash + verify roundtrip without real argon2 cost burn — use low cost via test env override).
- Builders in `__tests__/auth.builders.ts`: `aUser({...})`, `aSession({...})`, `aLoginRequest({...})`.

**Security checklist (CLAUDE.md §6 + SECURITY.md)**

- Password hash via argon2id (argon2 default). No bcrypt cost-12 unless GAP #1 lands on B.
- Refresh token: plaintext only in cookie + transient memory; SHA-256-hashed at rest via new `hashToken()` (GAP #3).
- CSRF token: plaintext at rest is acceptable (used as proof-of-possession, not credential) — matches spec §1.1.
- JWT signed via `JWT_ACCESS_SECRET` from `config` (already in env schema). No secret hardcoded.
- `timingSafeEqual` not needed — argon2's `verify` is internally timing-safe.
- PII masking: `maskEmail()` applied at every log line touching user email. No raw `request.body` log.
- No secret value or token logged: rely on winston redact pattern (Slot A's plugin task). For T05 we'll just NOT log them explicitly.

**Risks + assumptions**

- **Risk**: integration test pathway deferred → unit + Fastify-inject tests provide coverage but cannot prove the Prisma queries are correct against real PG. APPROVE-PARTIAL convention per PM B note line 149 covers this; re-open on T02 ships per line 150-151.
- **Risk**: GAPs #1 + #2 install approval cadence (3 hops: PM B → Parent PM → PO) may stall T05. Mitigation: if PO blocks `argon2`, fall back to `bcrypt` (intent option B in GAP #1) — same port interface, swap adapter only.
- **Risk**: GAP #4 (env default change) may collide with Slot A's foundation work on `core/config`. Mitigation: route via PM B → Parent PM to confirm Slot A is OK; if not, leave default and document override in `.env.example`.
- **Assumption**: `User.passwordHash` column is the storage location for argon2 envelope (already in `prisma/schema.prisma:83` — `password_hash VARCHAR(255)`). Argon2 envelope is ≤ 100 char so VARCHAR(255) sufficient.
- **Assumption**: `Session.refreshToken` column stores SHA-256 hex (64 char) — `VARCHAR(512)` (schema.prisma:109) is way more than enough.
- **Assumption**: `must_rotate_password` enforcement is T06 scope (not T05) per PM B note line 65-66 + spec §4.2. T05 login simply succeeds and issues the cookie; the rotation gate is per-request middleware (T06).

**Tooling sanity**

- Working tree clean ✓ on `main`. Branch `feat/auth-core` will be created when implementation starts (post-ACK).
- Node 20.19.6 available via nvm (system default v18 incompatible — will export PATH in shell on each session).
- Disk full (ENOSPC on `/private/tmp`) is current blocker for `pnpm install` and therefore `make typecheck`/`make lint` baselines. Will resolve via host-side cleanup before coding starts. Not a code/planning issue.

**ETA**

- PLAN ACK + GAP resolution cycle: ~30-60 min wall-time once PO sees install asks.
- Implementation (routes + service + repo + schema + types + port + adapter + wiring + config tweak + hashToken helper): ~3-4h engineering time.
- Unit tests (service + routes + schema + builders + placeholder integration): ~2-3h.
- Self-validate (`make check` + drift scans per §4.4): ~30 min.
- Total wall-time exec: ~6-8h from ACK to SUBMIT, conditional on GAP closure.

**Status: BLOCKED-on-PO-approval-for-deps: `argon2`, `@fastify/cookie`. Will not start coding until GAPs #1 and #2 are cleared via PM B → Parent PM → PO. GAPs #3, #4, #5 are PM B internal decisions (no PO touch needed).**

Awaiting PM B ACK.

##### PM B PARTIAL-ACK PLAN T05 attempt 1 — 2 GAPs approved, 3 GAPs ESCALATED as Q-B-01 (cycle 1, 2026-06-29)

**Verdict summary**: PLAN structure solid; scope + DoD + file tree + test plan + security checklist all match ASSIGNMENT. **Two GAPs PM-internal-approved** (no PO touch needed). **Three GAPs escalated as bundled `Q-B-01`** to Parent PM → PO (deps install + Slot-A config touch). Executor B: **HOLD on coding** sampai Q-B-01 resolved; stretch goal allowed (read-only, NO commit).

**Pre-ACK verification (PM B sanity-checked Executor claims)**:

| Claim | Source line | PM B verify | Status |
|---|---|---|---|
| `@fastify/jwt ^8.0.1` at `package.json:37` | PLAN line 174, 228 | `grep -n '"@fastify' package.json` → `37: "@fastify/jwt": "^8.0.1"` | ✅ CONFIRMED |
| `@fastify/rate-limit ^9.1.0` at `package.json:38` | PLAN line 174, 238 | `grep` → `38: "@fastify/rate-limit": "^9.1.0"` | ✅ CONFIRMED |
| `argon2` absent from deps | PLAN line 219 | `grep -n '"argon2"' package.json` → no match | ✅ CONFIRMED (install GAP valid) |
| `@fastify/cookie` absent from deps | PLAN line 220 | scan deps block lines 34-47 → no entry | ✅ CONFIRMED (install GAP valid) |
| `JWT_ACCESS_TTL` default `'8h'` at `env.ts:37` | PLAN line 209, 222 | `grep` → `37: JWT_ACCESS_TTL: z.string().default('8h')` | ✅ CONFIRMED |
| `User.passwordHash VARCHAR(255)` at `schema.prisma:83` | PLAN line 264 | `grep` → `83: passwordHash String @map("password_hash") @db.VarChar(255)` | ✅ CONFIRMED |
| `Session.refreshToken VARCHAR(512)` at `schema.prisma:109` | PLAN line 265 | `grep` → `109: refreshToken String @map("refresh_token") @db.VarChar(512)` | ✅ CONFIRMED |
| `hashToken` absent from `src/shared/utils/crypto.ts` | PLAN line 210, GAP #3 | `grep -rn 'hashToken' src/shared/utils/` → no match | ✅ CONFIRMED |
| `maskEmail()` in `src/shared/utils/masking.ts` | PLAN line 174, 256 | confirmed (deferred — not material to ACK) | ✅ TRUST-BUT-VERIFY |
| `src/core/errors/app-errors.ts` exports `AuthError`/`ValidationError`/`NotFoundError` | PLAN line 174 | confirmed (deferred — not material to ACK) | ✅ TRUST-BUT-VERIFY |

**PM-internal APPROVED GAPs** (no PO touch — proceed when Q-B-01 lands):

- ✅ **GAP T05-#3 — `hashToken()` placement in `src/shared/utils/crypto.ts`**: APPROVED. Rationale: (a) zero-dep Node built-in (`crypto.createHash('sha256')`), no install ask; (b) additive export, no breaking change to existing `crypto.ts` envelope helpers; (c) natural co-location per `PROJECT_STRUCTURE.md §src/shared/utils/`; (d) Slot A is `PARKED` this cycle — no live coord conflict; if Slot A unparks later with overlapping plans for `crypto.ts`, Slot A's task will see this commit and reconcile. Executor B: proceed with option (A).
- ✅ **GAP T05-#5 — NO JWT hex port, internal `TokenIssuer` interface only**: APPROVED. Rationale: matches `ADR-0001` §"Definisi tegas" verbatim — ports WAJIB hanya untuk external IO (HTTP API call, outbound notif, S3, queue producer); `@fastify/jwt` is framework-stack pure-in-process crypto (sibling of `@fastify/cors`, `@fastify/helmet`) → fits ADR-0001's "TIDAK pakai port → logger, config, internal util". Hash port is justified because (a) lib swap is plausible (argon2 ↔ bcrypt — same DoD line says "Slot B picks"), (b) test seam benefit explicit in PARENT §8 row 250. JWT swap is hypothetical + `fastify.jwt.sign/verify` mock-ability at the decorator level already provides the test seam. **Asymmetry is fine and ADR-supported.** Executor B: proceed with option (A) — internal `TokenIssuer` interface, NO entry under `ports/`, NOT under `adapters/`. Wrap as a thin file `src/modules/auth/auth.token-issuer.ts` (kebab-case, module-scoped) or inline in `auth.service.ts` — Executor picks at code time.

**ESCALATED as bundled `Q-B-01`** to Parent PM → PO (see §3 + roll-up at PARENT §3b + PARENT §2):

- 🚨 **GAP T05-#1 — `argon2 ^0.41.x` install**: per `CLAUDE.md §11` package.json deps = PO authority. PM B route via Parent PM. Fallback option B (`bcrypt cost=12`) is acceptable per `SECURITY.md §2` baseline — PO picks.
- 🚨 **GAP T05-#2 — `@fastify/cookie ^9.x` install**: per `CLAUDE.md §11` package.json deps = PO authority. Hand-roll fallback (option B) is high-friction; recommend approve. PM B route via Parent PM.
- 🚨 **GAP T05-#4 — `JWT_ACCESS_TTL` default `'8h'` → `'15m'` in `src/core/config/env.ts:37`**: PM B does NOT have authority over `core/config/` (Slot A canonical domain per `SERVICE-CHARTER §3` + `PROJECT_STRUCTURE.md` `core/` layer ownership). Spec `01-auth-identity §3` ratifies 15-min access, but `SECURITY.md §2` says generic '8h' floor — these are not yet reconciled. PM B route via Parent PM for (a) Slot A coord clearance, (b) doc-sync decision (which spec wins → PM B updates one of the two per `PM-AGENT §0.6`). **Note**: this is technically a deviation/planning-sync (not a contract Q), but bundling under Q-B-01 because it's the same Executor-PLAN cycle and same blocker (won't start coding).

**Executor B HOLD state** (per CLAUDE.md §11 workflow + EXECUTOR-PROTOCOL §0.5 ACK gate):

- **NO `pnpm add`** sampai Q-B-01 GAP #1 + #2 resolved by PO.
- **NO edit `src/core/config/env.ts`** sampai Q-B-01 GAP #4 resolved (Slot A coord).
- **NO branch creation** (`feat/auth-core` deferred sampai ACK→FULL).
- **NO commit anything new**.
- **Stretch goal (idle, READ-ONLY)**: re-read `docs/spec/01-auth-identity.md §1.1` (login response shape — match field-by-field di unit test), `docs/spec/data-model.md` (Session/User columns), `docs/MODULE_TEMPLATE.md §3` per-file convention, `docs/TESTING.md §4 + §11` (mock-port pattern + builders). Sketch test cases **mentally** atau di local scratch file (not in repo). Re-confirm hash-lib + cookie-flag matrix against `01-auth-identity §1.1`. **JANGAN commit anything; JANGAN edit `src/`; JANGAN run `pnpm add`.**
- **Side blocker (ENOSPC) — non-PLAN-blocking, non-ACK-blocking** — logged at §6 incident for audit trail; resolve via host-side cleanup before coding cycle starts.

**Re-engage trigger**: ketika Parent PM post Q-B-01 resolution di `PARENT §3b` (per-GAP decision), PM B will append `##### PM B FULL-ACK PLAN T05 attempt 1 — Q-B-01 resolved` sub-block dengan PO-approved options inlined. Executor B then proceeds to coding.

**Next Executor B action**: **HOLD**. Watch §3 for Q-B-01 status updates. Read-only stretch goal allowed.

##### PM B FULL-ACK PLAN T05 attempt 1 — Q-B-01 resolved 2026-06-29 by PO. Executor B clear to implement.

**Verdict**: PLAN T05 attempt 1 FULL-ACKED. All 5 GAPs cleared (2 PM-internal, 3 PO-ratified as `PARENT §4-D02/D03/D04`). Executor B IMPL-READY. ENOSPC host cleanup is the only remaining gate (slot-internal, owner's local-env concern per §6 incident log).

**Cross-references (read-only)**:
- `PM-STATUS-PARENT.md §3b` Q-B-01 RESOLVED row + Parent PM consolidation (§3b lines 92-115)
- `PM-STATUS-PARENT.md §3c` Q-PARENT-02 RESOLVED (doc-sync conflict resolved together with Q-B-01(c))
- `PM-STATUS-PARENT.md §4` deviations §4-D02 (argon2 install), §4-D03 (@fastify/cookie install), §4-D04 (TTL `'8h'→'15m'` + SECURITY.md §2 doc-sync)
- `PM-STATUS-PARENT.md §1` T05 row status flipped ke `READY-PARTIAL (unit scope, PO-cleared)`
- `PM-STATUS-PARENT.md §10` rows 533-534 (Q-B-01 RESOLVED cross-dev coord, doc-sync executed)
- `docs/SECURITY.md §2` lines 25-26 (Parent PM doc-sync edit: 8h floor + auth-spec override note, deviation `§4-D04` cited inline)

**Resolution mapping per GAP**:

- ✅ **GAP T05-#1 — `argon2 ^0.41.x` install** — **APPROVED per PARENT §4-D02**.
  - Executor B: jalankan `pnpm add argon2` sebagai first impl commit.
  - Suggested commit message: `chore(deps): add argon2 ^0.41.x per PO ruling Q-B-01(a) / D02`.
  - Note: argon2id default mode (OWASP 2024 top recommendation). Fallback `bcrypt cost=12` documented at PARENT §4-D02 — same `PasswordHashPort` surface, one-file adapter swap if argon2 native compile ever breaks an arch. **Stick with argon2 unless install fails**; if fail, post `REBUTTAL` di §2 dengan failure log dan request fallback ratification — JANGAN switch unilaterally.

- ✅ **GAP T05-#2 — `@fastify/cookie ^9.x` install** — **APPROVED per PARENT §4-D03**.
  - Executor B: jalankan `pnpm add @fastify/cookie`.
  - Suggested commit message: `chore(deps): add @fastify/cookie ^9.x per PO ruling Q-B-01(b) / D03`.
  - Bundling choice: **Executor decide** — either single `chore(deps): add argon2 + @fastify/cookie` commit referencing `Q-B-01(a)+(b) / §4-D02 + §4-D03` OR two separate commits for atomic-revert ergonomics. Document the chosen granularity di SUBMIT `Notes` section so PM B audit trail is clean.

- ✅ **GAP T05-#3 — `hashToken()` di `src/shared/utils/crypto.ts`** — **APPROVED (PM B internal)**.
  - Confirmed earlier in PARTIAL-ACK; reaffirming.
  - **Conditions** (per PM B internal authority):
    - **Additive-only**: add `hashToken(plaintext: string): string` export using `crypto.createHash('sha256').update(plaintext).digest('hex')`. ZERO modification to existing exports (`encrypt`, `decrypt`, envelope helpers).
    - **No signature change** to existing functions. Pure append.
    - **No dependency added** (Node built-in `node:crypto` only).
  - **Log addition** di `PM-STATUS-B.md §10` (cross-dev coord notes — currently no §10 in this file; if absent, PM B will retro-add §10 at SUBMIT-review time atau log di §6 incidents as additive-cross-touch). Actually `PM-STATUS-B.md` doesn't have a §10 — log di `PM-STATUS-PARENT.md §10` is Parent PM authority. **Revised condition**: Executor B note the `shared/utils/crypto.ts` additive-touch eksplisit di SUBMIT `Files changed` + `Notes` block; PM B akan flag ke Parent PM saat VERDICT untuk consolidation di PARENT §10 kalau perlu.

- ✅ **GAP T05-#4 — `JWT_ACCESS_TTL` default `'8h' → '15m'` di `src/core/config/env.ts:37`** — **APPROVED per PARENT §4-D04**.
  - Single-line edit only (`z.string().default('8h')` → `z.string().default('15m')`).
  - **WAJIB inline comment** on the same line atau line above:
    ```ts
    JWT_ACCESS_TTL: z.string().default('15m'),  // '15m' override per spec MVP-AUTH-FIRST §3 + §4-D04
    ```
  - **JANGAN sentuh `CLAUDE.md §6.4`** — wording "8 jam" tetap karena boilerplate floor untuk service non-auth lain di ekosistem Qooma (per PARENT §4-D04 explicit non-amendment ruling).
  - **JANGAN sentuh `docs/SECURITY.md`** — Parent PM sudah `docs:` sync edit di §2 (lines 25-26 dengan override note + deviation `§4-D04` reference).
  - Suggested commit message: `chore(config): JWT_ACCESS_TTL 8h → 15m per PO ruling Q-B-01(c) / D04`.

- ✅ **GAP T05-#5 — NO JWT hex port; internal `TokenIssuer` interface only** — **APPROVED (PM B internal)**.
  - Confirmed earlier in PARTIAL-ACK; reaffirming.
  - Asymmetric port design ratified by `ADR-0001 §"Definisi tegas"`: hash gets a port (external lib swap + test seam); JWT lib doesn't (framework-stack plugin sibling cors/helmet, pure in-process crypto).
  - Implementation: internal `TokenIssuer` interface (sign/verify), thin wrapper in `src/modules/auth/auth.token-issuer.ts` (or inline in `auth.service.ts` — Executor picks at code time). **NOT** under `ports/`, **NOT** under `adapters/`.

**Standing instructions ke Executor B** (codify cycle 1 cadence):

- **Scope tetap unit-only this cycle**. Integration test untuk `auth.repository.integration.test.ts` stays as `it.todo()` placeholders gated on T02 (Slot A migration). PM B akan re-open T05 ASSIGNMENT addendum saat T02 APPROVED.
- **Suggested commit sequence** (Executor decide final granularity — bundling acceptable bila logical, splitting acceptable bila membaca):
  1. `chore(deps): argon2 + @fastify/cookie` — bundled OR split per Executor preference
  2. `chore(config): JWT_ACCESS_TTL 8h → 15m` — single env.ts edit, separate commit
  3. `feat(auth): module scaffold` — folder tree + barrels (empty stubs OK)
  4. `feat(auth): zod schemas + types` — `auth.schema.ts` + `auth.types.ts`
  5. `feat(auth): PasswordHashPort + Argon2Adapter` — port interface + adapter implementation
  6. `feat(auth): TokenIssuer (internal) + cookie helpers` — JWT seam wrapper + cookie flag helpers
  7. `feat(auth): service logic (login/logout/refresh)` — `auth.service.ts` orchestration
  8. `feat(auth): repo (Prisma direct, no port)` — `auth.repository.ts` per ADR-0001
  9. `feat(auth): route handlers + plugin wiring di entrypoints/api.ts` — `auth.routes.ts` + `api.ts` register
  10. `test(auth): unit tests (≥80% line, mock port + repo instance)` — `__tests__/*.test.ts` + builders + integration `it.todo()` placeholder

- **`hashToken()` addition di `src/shared/utils/crypto.ts`** — bundle dengan commit (5) atau (6) (whichever ships first need), single additive export.

- **Self-validate per `EXECUTOR-PROTOCOL §4.4` SEBELUM SUBMIT** (mandatory gate):
  - `make check` HARUS green — full output di SUBMIT (lint + format-check + typecheck + test-unit; NOT test-integration this cycle)
  - **Drift scan WAJIB zero hits** (per `PM-AGENT §3 Step 2`): no `any` / `console.log/info/debug` / `@ts-ignore` / `throw new Error(` di service / default export di non-entry files / forbidden imports (express/typeorm/moment/node-fetch) / `.skip` test / hardcoded URL / `setTimeout()` job-delay / cross-module internal import / wrap-Prisma interface
  - **Security floor verify**: refresh token SHA-256-hashed di DB (via new `hashToken()`); no plaintext secret di code; email/phone masked di log via `maskEmail()`; argon2 `verify` (timing-safe internal); JWT signed dengan `JWT_ACCESS_SECRET` from `config` not hardcoded
  - **Coverage report verify ≥80% line** untuk file yang ditambah (target 90% for `auth.service.ts`/`auth.routes.ts`/`auth.schema.ts` per `docs/TESTING.md §9` auth=critical floor). Record `pnpm test:coverage` output di SUBMIT `Test evidence`.

- **ENOSPC host-side cleanup WAJIB resolved sebelum `pnpm add`**. Kalau masih ENOSPC saat resume:
  - Post update di `PM-STATUS-B.md §6 incidents` (extend existing 2026-06-29 ENOSPC entry dengan retry log)
  - HOLD lagi sampai cleared — JANGAN attempt `pnpm add` against full disk (akan corrupt `node_modules` atau `pnpm-lock.yaml`)
  - Mention attempt di SUBMIT bila masih relevant for audit trail

- **Branch**: `feat/auth-core` per `EXECUTOR-PROTOCOL §0.6` (WIP push acceptable ke `feat/auth-core-wip` bila session ends mid-task per protocol).
- **Commit hygiene**: pakai `make commit MSG="..."` (auto lint + typecheck + format-check pre-commit per `CLAUDE.md §12`). NO `--no-verify` skip per CLAUDE.md.
- **Post SUBMIT block** ke `PM-STATUS-B.md §2` (append below this FULL-ACK block, JANGAN edit existing blocks) setelah self-validate green. Format per template lines 326-352 (`#### SUBMIT T05 — exec-B (Nanak) at <cycle> (attempt 1)`).

**PM B state**: **WAIT-MODE for SUBMIT**. No further action di §2 dari PM B side sampai Executor posts SUBMIT. Standby for VERDICT cycle.

#### SUBMIT T05 — exec-B (Nanak) at cycle 2 (2026-06-29) attempt 1

Task: Auth core endpoints (login/logout/refresh) + sessions/JWT/CSRF plumbing (READY-PARTIAL unit-only)

Branch: `feat/auth-core` (10 commits ahead of `main`, working tree clean)

Files changed: 24 files, +1517 / -34

```
 jest.config.json                                              |  43 +++ (new)
 package.json                                                  |  10 +-
 pnpm-lock.yaml                                                |  68 ++-
 src/core/config/env.ts                                        |   2 +-
 src/entrypoints/api.ts                                        | 106 ++++--
 src/modules/auth/__tests__/argon2-hasher.adapter.test.ts      |  22 ++ (new)
 src/modules/auth/__tests__/auth.builders.ts                   |  32 ++ (new)
 src/modules/auth/__tests__/auth.repository.integration.test.ts|  23 ++ (new)
 src/modules/auth/__tests__/auth.routes.test.ts                | 195 ++ (new)
 src/modules/auth/__tests__/auth.schema.test.ts                |  52 ++ (new)
 src/modules/auth/__tests__/auth.service.test.ts               | 264 ++ (new)
 src/modules/auth/__tests__/auth.token-issuer.test.ts          |  85 ++ (new)
 src/modules/auth/adapters/argon2-hasher.adapter.ts            |  18 ++ (new)
 src/modules/auth/auth.cookie-helpers.ts                       |  89 ++ (new)
 src/modules/auth/auth.repository.ts                           | 141 ++ (new)
 src/modules/auth/auth.routes.ts                               |  58 ++ (new)
 src/modules/auth/auth.schema.ts                               |  37 ++ (new)
 src/modules/auth/auth.service.ts                              | 185 ++ (new)
 src/modules/auth/auth.token-issuer.ts                         |  50 ++ (new)
 src/modules/auth/auth.types.ts                                |  25 ++ (new)
 src/modules/auth/index.ts                                     |  10 ++ (new)
 src/modules/auth/ports/password-hasher.port.ts                |   4 ++ (new)
 src/shared/types/fastify-augmentation.ts                      |  20 ++ (new)
 src/shared/utils/crypto.ts                                    |  12 + (additive hashToken)
```

Commits (10 — matches FULL-ACK suggested sequence cap):

1. `10d8813` — chore(deps): add argon2 + @fastify/cookie per Q-B-01 D02/D03
2. `011071b` — chore(config): JWT_ACCESS_TTL 8h -> 15m per Q-B-01(c) / D04
3. `8b8586d` — feat(auth): zod schemas + types + barrel skeleton
4. `2196aec` — feat(auth): PasswordHasherPort + Argon2Hasher + hashToken helper
5. `f934f22` — feat(auth): cookie helpers + TokenIssuer + Fastify augmentations
6. `d463546` — feat(auth): AuthRepository (Prisma direct, no port)
7. `ffb64fe` — feat(auth): AuthService orchestration (login, logout, refresh)
8. `2db0eef` — feat(auth): route handlers + entrypoint wiring
9. `623e2b7` — chore(test): jest.config.json + script flag for ts-node-free run
10. `7cfc1df` — test(auth): unit suite + integration placeholder; route + entrypoint touch-ups

DoD self-check (vs ASSIGNMENT §"DoD this submission" lines 71-94)

- [x] **3 endpoints authored** — `login`/`logout`/`refresh` in `auth.routes.ts:28-58`; zod parse in handler (Fastify 4 AJV doesn't accept zod natively — flagged as design note below); service methods in `auth.service.ts:39-135`; repo methods in `auth.repository.ts:37-103`.
- [x] **Cookie + CSRF response shape matches `01-auth-identity §1.1` verbatim** — `auth.routes.ts:37,52` returns `{ user, csrfToken }`; field-by-field zod schema lock in `auth.schema.ts:17-25` (id/email/name/role/hotel_id/dept_id/language). Asserted explicitly in `auth.routes.test.ts:65-68`.
- [x] **Sessions table writes** — `auth.repository.ts:46-59` `createSession` writes refresh_token (hashed) + csrf_token + expires_at + user_agent + ip_address. Method authored; integration test deferred to T02 (placeholder file with 10 `it.todo`).
- [x] **JWT plumbing** — `auth.token-issuer.ts:23-31` sign uses `fastify.jwt.sign` with claims `{sub, sid, role, hotelId, deptId}`. Access TTL 15m (env default per D04). Refresh TTL 30d (config default).
- [x] **Password hash port + adapter** — `ports/password-hasher.port.ts` (`PasswordHasherPort` interface) + `adapters/argon2-hasher.adapter.ts` (`Argon2Hasher` argon2id default). Service consumes port; entrypoint wires concrete adapter (with eslint-disable comment because `no-restricted-imports` has no entrypoint exception in `.eslintrc.cjs` — flagged in §"Notes" below for PM B).
- [x] **Unit tests per TESTING.md §4**:
  - Service tests mock hash port + repo class **instance** (not Prisma) per TESTING.md §4 example — `auth.service.test.ts:43-98` builds plain object then casts `as unknown as AuthRepository`
  - Route tests via Fastify `inject()` with mocked services decorator — `auth.routes.test.ts:32-46`
  - Zod schema parse + reject paths — `auth.schema.test.ts` (6 tests)
  - Happy path login: cookie set + csrfToken returned + session row create called with correct shape — `auth.service.test.ts:107-148`
  - 401 path: wrong password → AuthError — `auth.service.test.ts:150-163`
  - Logout: session revocation invoked by claims.sid — `auth.service.test.ts:173-186`; idempotent on invalid/null/empty — `:188-205`
  - Refresh: new JWT issued + session rotated; missing/expired/inactive-user paths — `auth.service.test.ts:215-262`
- [x] **Test naming** — every `it()` follows `should <expected> when <condition>` form (verified manually + via lint scan)
- [x] **Coverage line ≥ 80%** for added files (T05 scope, repository excluded per cycle-1 convention): see "Test evidence" below
- [x] **Integration placeholder** — `auth.repository.integration.test.ts` with 10 `it.todo()` calls referencing T02 dependency
- [x] **`make check` green** — full output below
- [x] **Security floor (CLAUDE.md §6 + docs/SECURITY.md)**:
  - argon2id default (not bcrypt; PO ruling Q-B-01(a))
  - Refresh token: plaintext only in cookie/transient memory; SHA-256-hashed in DB via new `hashToken()` (SECURITY.md §3)
  - JWT signed with `config.JWT_ACCESS_SECRET` (env-loaded) — no hardcoded secret
  - `timingSafeEqual` not needed — argon2 verify is internally timing-safe (lib default)
  - Email masked in log via `maskEmail()` at all three log lines (`auth.service.ts:42,51,69`)
  - No raw request.body logged anywhere
- [x] **No `any` / `console.log` / `@ts-ignore`** in T05 files (drift scan output below; `@ts-expect-error` not used)
- [x] **No `throw new Error(`** in modules/auth — only AppError subclasses (AuthError, ValidationError)
- [x] **Named exports only** — index.ts barrel uses `export { ... }`; entrypoint api.ts default-allowed per eslintrc override
- [x] **Public function explicit return type** — every public method on AuthService/AuthRepository/Argon2Hasher/FastifyJwtTokenIssuer has explicit `Promise<...>` or `: void`
- [x] **File ≤ 300 LOC rule-of-thumb** — largest is auth.service.ts at 183 LOC

Quality gate

- `make typecheck`: PASS
- `make lint`: PASS (0 errors, 0 warnings, `--max-warnings 0`)
- `make test-unit`: PASS — 31 passed + 10 todo + 2 skipped suites (skipped suites = `_template/*` pre-existing)
- `make format-check`: PASS
- `make check` exit 0 confirmed

Test evidence

```
Test Suites: 2 skipped, 6 passed, 6 of 8 total
Tests:       2 skipped, 10 todo, 31 passed, 43 total
Time:        ~0.7s
```

Coverage (scoped via `collectCoverageFrom` to T05 files; repository excluded as integration-deferred):

```
---------------------------|---------|----------|---------|---------|-------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------------------|---------|----------|---------|---------|-------------------
All files                  |   98.56 |    79.31 |     100 |     100 |
 auth                      |   98.49 |    79.31 |     100 |     100 |
  auth.cookie-helpers.ts   |   92.85 |       50 |     100 |     100 | 23-27
  auth.routes.ts           |     100 |    81.81 |     100 |     100 | 22-23
  auth.schema.ts           |     100 |      100 |     100 |     100 |
  auth.service.ts          |     100 |      100 |     100 |     100 |
  auth.token-issuer.ts     |     100 |      100 |     100 |     100 |
 auth/adapters             |     100 |      100 |     100 |     100 |
  argon2-hasher.adapter.ts |     100 |      100 |     100 |     100 |
---------------------------|---------|----------|---------|---------|-------------------
```

Per-file targets (TESTING.md §9 + PM B DoD):
- `auth.service.ts`: target 90% line → **100%** ✓
- `auth.routes.ts`: target 90% line → **100%** ✓
- `auth.schema.ts`: target 90% line → **100%** ✓
- `auth.token-issuer.ts`: floor 80% line → **100%** ✓
- `argon2-hasher.adapter.ts`: floor 80% line → **100%** ✓
- `auth.cookie-helpers.ts`: floor 80% line → **100%** ✓ (branch 50% — TTL parser fallback is unreachable from current call sites; intentional defensive behavior)
- `auth.repository.ts`: EXCLUDED from cycle-1 coverage per APPROVE-PARTIAL convention; re-evaluated post-T02

Drift scans (per EXECUTOR-PROTOCOL §4.4, restricted to T05 touched files)

```
$ grep -rnE ': any|<any>|as any' src/modules/auth src/shared/utils/crypto.ts src/shared/types/fastify-augmentation.ts src/entrypoints/api.ts --include='*.ts' | grep -v '__tests__'
   (zero hits)

$ grep -rnE 'console\.(log|info|debug)' src/modules/auth src/shared/utils/crypto.ts src/shared/types/fastify-augmentation.ts src/entrypoints/api.ts
   (zero hits — entrypoint uses console.error for fatal-startup which is eslint-allowed)

$ grep -rnE "throw new Error\(" src/modules/auth src/shared/utils/crypto.ts src/shared/types/fastify-augmentation.ts src/entrypoints/api.ts | grep -v '__tests__'
   (zero hits)
   (PRE-EXISTING in src/core/config/env.ts:75 + src/core/http/http-client.ts + src/shared/utils/crypto.ts:23,30 stubs — NOT my drift; flagged for Slot A foundation)

$ grep -rnE "from 'express'|from 'typeorm'|from 'sequelize'|from 'moment'|from 'node-fetch'" src/modules/auth src/shared src/entrypoints
   (zero hits)

$ grep -rn '^export default ' src/modules/auth src/shared
   (zero hits)

$ grep -rn '\.skip(' src/modules/auth --include='*.test.ts'
   (zero hits)
   (PRE-EXISTING in src/modules/_template/__tests__/*.test.ts — _template territory)

$ grep -rnE "https?://" src/modules/auth | grep -v '__tests__'
   (zero hits — no hardcoded URL)

$ grep -rnE "setTimeout\(" src/modules/auth
   (zero hits)
```

Security check (CLAUDE.md §6 + SECURITY.md)

- argon2id password hashing via `Argon2Hasher.hash` (`adapters/argon2-hasher.adapter.ts:8-10`) — argon2id default mode confirmed
- Refresh token at-rest hashing: `hashToken(refreshToken)` called before passing to repo (`auth.service.ts:148` + `:120`) — SHA-256 hex digest
- JWT secret: `config.JWT_ACCESS_SECRET` injected via `loadConfig()` in entrypoint (`entrypoints/api.ts:38`) — no hardcoded values
- `timingSafeEqual`: not needed; argon2 `verify` is internally timing-safe per library guarantees (also explicitly noted in adapter via try/catch returning false instead of throwing)
- Email PII masking: `maskEmail()` applied in `auth.service.ts:42,51,69` for every log line touching email
- Phone PII: not present in T05 surface (login only consumes email/password; phone is admin-create scope T05-out)
- No webhook in T05 surface (HMAC check NA)
- No secret hardcoded — confirmed via grep
- Cookie flags:
  - `token`: HttpOnly ✓, Secure conditional on `NODE_ENV !== 'development'` ✓, SameSite=Lax ✓, Path=/ ✓, Max-Age=ttlToSeconds(JWT_ACCESS_TTL) ✓
  - `refresh`: HttpOnly ✓, Secure conditional ✓, SameSite=Lax ✓, Path=/api/auth/refresh ✓, Max-Age=ttlToSeconds(JWT_REFRESH_TTL) ✓
  - `csrfToken`: NOT a cookie — returned in response body per spec §1.1 (FE holds in memory, not localStorage) ✓

Notes (open items / observations for PM B audit)

1. **Pre-existing foundation gaps surfaced during impl** (NOT introduced by T05; flagged for PM B → Parent PM coord with Slot A when foundation unparks):
   - `jest.config.ts` requires `ts-node` (not in devDeps). Worked around with `jest.config.json` + `--config jest.config.json` flag in package.json scripts. When Slot A installs ts-node OR migrates config to `.cjs`, the JSON + flag can be removed cleanly.
   - `src/core/prisma/prisma-client.ts` exports a placeholder `{}` rather than a real PrismaClient. Entrypoint casts to `PrismaClient` via `db as unknown as PrismaClient` (`entrypoints/api.ts:62`) — flagged with TODO(slot-A) comment. Auth surface typechecks but runtime needs Slot A's T02 to ship a real Prisma client.
   - `.eslintrc.cjs` does not have `no-restricted-imports: off` override for `src/entrypoints/*.ts`. Entrypoint needs to import adapters for manual wiring per CLAUDE.md §4 + ADR-0001. Used inline `// eslint-disable-next-line no-restricted-imports -- entrypoint is the wiring boundary ...` in `entrypoints/api.ts:21`. PM B may want to bump this to a per-file override at the eslintrc level (Slot A territory).
   - `src/plugins/error-handler.plugin.ts` does not exist yet (Slot A foundation). Entrypoint installs an inline `fastify.setErrorHandler` mapping `AppError → reply.code(err.statusCode)` so auth routes return correct status codes today. TODO(slot-A) marker placed (`entrypoints/api.ts:36`).

2. **Design decision: `sid` claim added to JWT** — not explicitly in PLAN but required so `/logout` can identify which session to revoke (since access cookie path = `/` but refresh cookie path = `/api/auth/refresh`, the refresh cookie isn't sent to `/logout`). The alternative — widening refresh cookie path — felt riskier for exposure surface. `JwtClaims` type now: `{ sub, sid, role, hotelId, deptId }`. Logout uses `verify → claims.sid → repo.revokeSession(sid)`. Flag for PM B awareness.

3. **Design decision: routes use `FastifyPluginCallback` (sync) not `FastifyPluginAsync`** — to satisfy `@typescript-eslint/require-await` lint (the body only registers route handlers, no `await`). Both forms work for `fastify.register`. Template uses Async; mine differs. Flag for PM B preference.

4. **Design decision: zod parsed manually in `/login` handler** — Fastify 4's `schema:` option expects AJV-compatible JSON Schema, not zod objects. PLAN had `schema: { body: LoginRequestSchema }`. Adjusted to parse with `LoginRequestSchema.safeParse(req.body)` in the handler and throw `ValidationError` on failure. PM B may want to revisit and add `fastify-type-provider-zod` later (would be a separate package install GAP).

5. **`@fastify/cookie` pinned to ^9.4.0 (not latest ^11.x)** — latest requires Fastify ^5; repo is on Fastify ^4.28.1 per `package.json:45`. Recorded inline in `chore(deps)` commit body.

6. **`shared/utils/crypto.ts` additive touch** — only added `hashToken()` export at the bottom (12 lines including doc comment + 1-line import). Existing `encrypt`/`decrypt`/`encryptDsn`/`decryptDsn` stubs untouched. Cross-team additive-touch flag for Slot A awareness (PM B to consolidate at `PARENT §10` if appropriate per FULL-ACK line 359).

7. **`src/core/config/env.ts:37` TTL edit** — exactly the single-line change per D04 with the mandated inline comment. No other env.ts changes.

8. **ENOSPC recovery (incident §6)** — host disk went from 1.3 GiB → 8.4 GiB free via `npm cache clean --force` (reclaimed ~5.3 GiB). Above the 5 GiB floor before any `pnpm add` invocation. Yarn cache (~22 GiB) noted but NOT cleared — repo is pnpm-managed; left for owner's discretion.

9. **No `console.log`** added; entrypoint uses `console.error` for the fatal-startup catch which is eslint-allowed (`'no-console': ['error', { allow: ['warn', 'error'] }]`).

Sample request/response (would need Slot A's T02 + ts-node-free `make start` path to verify against real server — deferred per cycle-1 convention; routes verified via Fastify `inject()` in unit tests). `auth.routes.test.ts:55-80` is the canonical reference for the cookie + body shape on `POST /api/auth/login`.

Requesting PM B VERDICT.

##### VERDICT T05 attempt 1 — APPROVE-PARTIAL (unit scope complete; full APPROVE deferred until T02 migration ships) by PM B (cycle 2, 2026-06-29)

**Outcome**: ✅ **APPROVE-PARTIAL**. Unit-scope DoD met in full; cycle-1 APPROVE-PARTIAL convention engaged per ASSIGNMENT §"Acceptance criteria" item 8 + FULL-ACK standing instructions. Branch `feat/auth-core` (11 commits ahead of `main` including this SUBMIT) **stays on branch** — NO merge to `main` until T02 lands and integration suite turns green (re-validation cycle described under "Conditions for PARTIAL→FULL upgrade" below).

---

**Independent verification (PM-AGENT §3 Step 2 — trust-but-verify, all re-run on my session)**

| Check | Executor klaim | PM B independent rerun | Status |
|---|---|---|---|
| `make check` (lint + format-check + typecheck + test-unit) | exit 0 green | rerun via `nvm use 20 && make check` → exit 0; output excerpt below | ✅ MATCH |
| Test counts | 31 passed + 10 todo + 2 skipped suites | identical: `Tests: 2 skipped, 10 todo, 31 passed, 43 total` | ✅ MATCH |
| Coverage (overall) | 98.56% stmt / 79.31% branch / 100% funcs / 100% lines | exact same numbers (rerun via `npx jest --config jest.config.json --coverage`) | ✅ MATCH |
| Coverage (auth.service.ts) | 100% stmt+branch+funcs+lines | 100% | ✅ MATCH (target 90% per TESTING.md §9 critical — exceeded) |
| Coverage (auth.routes.ts) | 100% stmt+funcs+lines, 81.81% branch | identical | ✅ MATCH |
| Coverage (auth.cookie-helpers.ts) | 92.85%/50%/100%/100% — uncovered 23-27 | identical | ✅ MATCH (50% branch = defensive TTL parser fallback at lines 23-27; intentional unreachable from current call sites; **PM B accepts dengan note** per user-PM cycle-2 ratification) |
| Drift scan (T05 files) | zero hits | rerun `grep -rnE "(: any[^a-z]\| any[^a-z_])\|console\.(log\|info)\|@ts-ignore\|@ts-nocheck\|throw new Error\(\|export default" src/modules/auth src/shared/utils/crypto.ts src/core/config/env.ts --include='*.ts'` → only 4 hits, ALL non-T05: (1) `auth.repository.integration.test.ts:9` — false-positive on `: any` in comment "any spec runs"; (2-4) `crypto.ts:23,30` + `env.ts:75` `throw new Error` confirmed pre-existing per `git blame` → commit `^1e32e34 Init project` by Satrio (Slot A territory) | ✅ MATCH (zero T05-attributable drift) |
| Refresh hashing | SHA-256 via `hashToken()` at service.ts:105,147 | confirmed (`grep "createHash\|hashToken"`) | ✅ MATCH |
| PII masking | `maskEmail()` at 3 log lines | confirmed at `auth.service.ts:44,53,71` | ✅ MATCH |
| JWT secret no hardcode | from `config.JWT_ACCESS_SECRET` | confirmed at `entrypoints/api.ts:56` `secret: config.JWT_ACCESS_SECRET` | ✅ MATCH |
| argon2 timing-safe verify | `argonVerify` (lib internal) | confirmed at `argon2-hasher.adapter.ts:13` + try/catch returning false on malformed envelope | ✅ MATCH |
| Cookie flags matrix (`token`/`refresh`/`csrfToken`) | httpOnly/secure-conditional/sameSite=lax/path correct | confirmed at `auth.cookie-helpers.ts:45-49,55-59,75-87`; csrfToken returned in body not cookie | ✅ MATCH (per `01-auth-identity §1.1`) |
| DD1 `sid` claim | present in JwtClaims + used at logout | confirmed at `auth.types.ts:16`, `auth.token-issuer.ts:16,28,41`, `auth.service.ts:93,96,163` | ✅ MATCH |
| DD2 `FastifyPluginCallback` (sync) | sync form, not async | confirmed at `auth.routes.ts:1, :27` | ✅ MATCH |
| DD3 manual `safeParse` in `/login` | Fastify 4 AJV-native workaround | confirmed at `auth.routes.ts:29` | ✅ MATCH |

`make check` excerpt (PM B rerun, abbreviated):
```
> @qooma/auth-backend@0.1.0 lint    → PASS (0/0 with --max-warnings 0)
> @qooma/auth-backend@0.1.0 format:check → All matched files use Prettier
> @qooma/auth-backend@0.1.0 typecheck → tsc --noEmit clean
> @qooma/auth-backend@0.1.0 test:unit → Tests: 2 skipped, 10 todo, 31 passed, 43 total | Time: 0.788 s
```

**All 13 verification checks PASS independently. Zero Executor claim discrepancies.**

---

**DoD checklist mapping** (12 items per ASSIGNMENT §"DoD this submission" lines 71-94)

| # | DoD item | Status | Evidence |
|---|---|---|---|
| 1 | 3 endpoints authored (route + zod + service + repo) | ✓ | `auth.routes.ts:28-58`, `auth.schema.ts`, `auth.service.ts:39-135`, `auth.repository.ts:37-103` |
| 2 | Cookie + CSRF response shape matches `01-auth-identity §1.1` verbatim | ✓ | `auth.routes.ts:37,52` returns `{ user, csrfToken }`; zod lock at `auth.schema.ts:17-25`; asserted at `auth.routes.test.ts:65-68` |
| 3 | Sessions writes (refresh+csrf+expires_at+ua+ip) | ✓ | `auth.repository.ts:46-59` `createSession` — refresh **hashed** before write |
| 4 | JWT plumbing (access 15m, refresh 30d) | ✓ | `auth.token-issuer.ts:23-31` + env defaults per D04 |
| 5 | Password hash port + adapter | ✓ | `ports/password-hasher.port.ts` interface + `adapters/argon2-hasher.adapter.ts` (argon2id default) — service consumes port, entrypoint wires adapter |
| 6 | Unit tests per TESTING.md §4 (mock port + mock repo INSTANCE) + coverage ≥80% | ✓ | service mocks port + repo class instance (NOT Prisma) at `auth.service.test.ts:43-98`; routes via `inject()` at `auth.routes.test.ts:32-46`; coverage 98.56% stmt / 100% line — exceeds 80% floor; critical files (service/routes/schema) at 100% line ≥ 90% target |
| 7 | Test naming `should <expected> when <condition>` | ✓ | spot-checked across 6 test files; convention adhered |
| 8 | Coverage ≥ 80% line for added files | ✓ | per Step 3 coverage table — minimum 92.85% stmt across all T05 files; line coverage = 100% on every file |
| 9 | Integration placeholder `it.todo()` referencing T02 | ✓ | `auth.repository.integration.test.ts` — **10 `it.todo()` calls** (jest reports `10 todo`) |
| 10 | `make check` green | ✓ | PM B independent rerun → exit 0 |
| 11 | Security floor (refresh SHA-256, no plaintext secret, email masked, argon2 timing-safe, JWT signed via config) | ✓ | independent verify per Step 3d above — all 6 sub-items confirmed |
| 12 | No `any` / `console.log` / `@ts-ignore` / `throw new Error(`-in-service / default export | ✓ | drift scan zero T05-attributable hits; 3 `throw new Error` are pre-existing Slot A territory (git blame confirms commit `1e32e34`) |

**Bonus DoD line items verified**:
- ✓ Named exports only (CLAUDE.md §5) — barrel `index.ts` clean
- ✓ Public function explicit return type — every public method has `Promise<...>` or `: void`
- ✓ File ≤ 300 LOC — largest is `auth.service.ts` at 183 LOC
- ✓ Branch `feat/auth-core` per CLAUDE.md §12

---

**5 Design Decision rulings (PM B sign-off)**

| DD | Topic | PM B ruling | Rationale |
|---|---|---|---|
| **DD1** | `sid` claim added to JWT (beyond PLAN) | ✅ **ACCEPT** | Enables session-specific revocation at `/logout` without widening refresh-cookie path scope (refresh path = `/api/auth/refresh`, NOT `/logout`). JwtClaims `{sub, sid, role, hotelId, deptId}` — small schema addition, sound security trade. Verified `sid` flows: created at login (`service.ts:163`), signed (`token-issuer.ts:28`), verified (`:41`), used to revoke specific session (`service.ts:93`). No leakage. |
| **DD2** | `FastifyPluginCallback` (sync) bukan `FastifyPluginAsync` | ✅ **ACCEPT option (i) — divergence dari `_template`** | `_template/_template.routes.ts` uses Async, T05 uses Callback (sync). Both valid for `fastify.register`. Reason for divergence: `@typescript-eslint/require-await` lint conflict (route body only registers handlers, no `await`). Working code + lint clean > template mirroring with eslint-disable. **Documented as mini-ADR candidate for Planning next cycle** — flag for cross-template alignment review. No action required from Executor B. |
| **DD3** | Manual `LoginRequestSchema.safeParse` di `/login` handler (Fastify 4 = AJV-native) | ✅ **ACCEPT for cycle 1** | Fastify 4's `schema:` option expects AJV JSON Schema, not zod objects. Manual `safeParse` + throw `ValidationError` is a legit pattern. `fastify-type-provider-zod` would be a separate package install GAP — **defer to next cycle**, logged below as PM B open observation for future Planning consideration (not blocking T05 APPROVE-PARTIAL). |
| **DD4** | `@fastify/cookie` pinned `^9.4.0` (not `^11.x`) | ✅ **ACCEPT (forced)** | `^11.x` requires Fastify `^5`; this repo is on Fastify `^4.28.1` per `package.json:45`. Version pinning correct. Recorded inline in `chore(deps)` commit body (`10d8813`). |
| **DD5** | TokenIssuer internal seam, NO hex port | ✅ **ACCEPT (re-affirm — already approved in Q-B-01 GAP #5)** | ADR-0001 alignment: `@fastify/jwt` is framework-stack pure-in-process crypto (sibling cors/helmet), not external IO. Hash gets a port (lib swap + test seam justified); JWT lib swap is hypothetical and `fastify.jwt.sign/verify` decorator already provides the test seam. Asymmetric port design ratified. |

**All 5 DDs ACCEPT. No rework required.**

---

**4 pre-existing Slot A foundation gaps surfaced by Executor B during T05 impl** → **logged as `Q-B-02`** in §3 below

These are NOT Executor B regressions. They are Slot A territory items that Executor B workaround sensibly for cycle 1 unit-only scope. Surface untuk Slot A onboarding next cycle via Parent PM coord (`PARENT §10`).

- **(a)** `jest.config.ts` needs `ts-node` (devDep absent) — Executor workaround: `jest.config.json` + `--config jest.config.json` flag in `package.json` test scripts. Clean migration path: when Slot A installs ts-node OR migrates jest config to `.cjs`, the JSON + flag removable cleanly.
- **(b)** `src/core/prisma/prisma-client.ts` exports `{}` placeholder — Executor workaround: entrypoint cast `db as unknown as PrismaClient` with `TODO(slot-A)` marker at `entrypoints/api.ts:62`. Auth typechecks; runtime needs Slot A's T02 to ship real PrismaClient.
- **(c)** `.eslintrc.cjs` lacks `no-restricted-imports: off` override for `src/entrypoints/*.ts` — Executor workaround: inline `// eslint-disable-next-line no-restricted-imports -- entrypoint is the wiring boundary` at `entrypoints/api.ts:21`. Slot A territory to bump to per-file override.
- **(d)** `src/plugins/error-handler.plugin.ts` doesn't exist — Executor workaround: inline `fastify.setErrorHandler` mapping `AppError → reply.code(err.statusCode)` at `entrypoints/api.ts:36` with `TODO(slot-A)` marker.

All 4 = sound workarounds for cycle 1 unit-only. PM B request Parent PM coord via PARENT §10 row (Parent PM authority; PM B raise via PARENT §3b Q-B-02 + roll-up at PARENT §2). **No PO action needed**.

---

**`hashToken()` additive-touch consolidation note**

Executor B added `hashToken(plaintext: string): string` export to `src/shared/utils/crypto.ts:48-49` (12 lines added including doc + `import { createHash } from 'node:crypto'`). Conditions from FULL-ACK GAP #3 verified:
- ✅ Additive-only (no signature change to existing `encrypt`/`decrypt`/`encryptDsn`/`decryptDsn` stubs)
- ✅ No new dep (Node built-in `node:crypto`)
- ✅ Documented in SUBMIT Notes #6

Cross-team additive-touch will be flagged to Parent PM via §2 roll-up for consolidation at PARENT §10 (Parent PM authority).

---

**Conditions for PARTIAL → FULL upgrade**

T05 stays **APPROVE-PARTIAL** until ALL of:
1. Slot A T02 (initial Prisma migration) APPROVED + `prisma migrate dev` applied locally
2. Executor B re-opens `auth.repository.integration.test.ts` — replaces 10 `it.todo()` with real testcontainers Postgres assertions per `docs/TESTING.md §5`
3. PM B re-validate full integration suite green + repo coverage ≥ 80% line per `TESTING.md §9` floor
4. Drift scan re-run clean across `auth.repository.ts`
5. Re-issue VERDICT as **`APPROVE (full)`** with new sub-block under this SUBMIT

Branch `feat/auth-core` stays open (no merge to `main`) until full APPROVE. Hygiene rationale: integration coverage gap + Slot A foundation workarounds (Q-B-02 a-d) should both clear before merge.

---

**Sequence next (PM B decision per FULL-ACK convention)**

Per ASSIGNMENT §"Sequence + cycle constraint" + PARENT §10 cycle-1 sequence: **T05 → T06 → T11 → T07**.

Now that T05 APPROVE-PARTIAL is issued, two options for Executor B's next move:

- **Option A — Pickup T06 now** (recommended): T06 is `READY-PARTIAL (unit-only)` per PARENT §1 + §8. T06 scope (`/api/auth/me` family + `must_rotate_password` per-request gate plugin) builds on T05's session lookup machinery — momentum + freshly-loaded mental model favor continuing. Same single-dev cycle, same foundation gaps already surfaced (Executor B can reuse Q-B-02 workarounds; no fresh blockers expected). T06 SUBMIT can land in next cycle window; T05 PARTIAL→FULL upgrade waits for T02 anyway.
- **Option B — Hold sampai T02 ships, then re-open T05 for FULL APPROVE first**: pure-sequence discipline but burns Executor B idle cycles since T02 is Slot A territory and PARKED. Unfavorable.

**PM B ruling: Option A (pickup T06)**. Executor B may self-select T06 from §8 queue per `EXECUTOR-PROTOCOL §4.1` self-select clause. PM B akan post ASSIGNMENT T06 block separately when Executor signals start; OR Executor B can post `ASSIGNMENT T06 — claimed by exec-B` self-claim per protocol, and PM B will append ACK/PLAN cycle.

---

**Roll-up + cross-references posted**:
- `PM-STATUS-B.md §1` task tracker row T05 → status flag flipped to `assigned · APPROVE-PARTIAL (cycle 2 unit-scope; full APPROVE held for T02)`
- `PM-STATUS-B.md §3` Q-B-02 row appended (4-gap consolidation, Slot A territory)
- `PM-STATUS-PARENT.md §2` short roll-up appended (per `PM-AGENT §0.8` APPROVE entry format + Q-B-02 mention)

**JANGAN diff-merge ke `main`** — branch `feat/auth-core` stay until full APPROVE.

PM B exits to **wait-mode**: next event is either (a) Executor B claims T06 (post new ASSIGNMENT sub-block under §2 — append-only), or (b) Slot A unparks + T02 lands → PM B re-opens T05 for PARTIAL→FULL upgrade cycle.

### ASSIGNMENT T06 — claimed by exec-B (Nanak) at cycle 3 (2026-06-29)

- **Spec row pointer**: `docs/spec/MVP-AUTH-FIRST.md §1` rows 2 + 3 (`GET /api/auth/me` · `PATCH /api/auth/me` · `POST /api/auth/me/password`) + canonical detail di `docs/spec/01-auth-identity.md §1.1` lines 54-92 + `MVP-AUTH-FIRST.md §4.2` (must_rotate_password per-request gate)
- **Routed from**: `PM-STATUS-PARENT.md §1` T06 row (status `backlog · READY-PARTIAL (unit-only)` at cycle 2 close; PM B authority untuk row update post-VERDICT)
- **Branch**: `feat/auth-core` (continues from T05 — same branch, T06 stacks on T05 commits)
- **Status flag**: `READY-PARTIAL (unit-only, single-dev cycle 3)` — integration deferred until T02 ships (same convention as T05)
- **Gate target**: G2 (modul auth — T05 + T06 + T11 collectively close G2 per PARENT §5)

#### PM B notes — Scope this cycle (PARTIAL — unit-only, single-dev)

**In scope this submission**:
1. **`GET /api/auth/me`** route handler — read JWT context (from `fastify.jwt.verify` or T05's TokenIssuer), look up user via `AuthRepository.findUserById` (extend repo), return sanitized user shape matching `01-auth-identity §1.1` lock + **rotate `csrfToken`** (update session row's csrf_token, return new value in response body per spec line 56 "must rotate `csrfToken`"). Cookie-only auth — NO request body.
2. **`PATCH /api/auth/me`** route handler — body `{ language: 'id' | 'en' }` zod-validated whitelist; service updates `user.language`; return `{ user: <updated> }` per spec lines 60-71. **Only `language` field whitelisted** — reject any other field with `ValidationError`. Email immutable per spec line 103.
3. **`POST /api/auth/me/password`** route handler — body `{ current_password, new_password }` per spec line 80; service flow:
   - `argon2.verify(user.passwordHash, current_password)` — fail → `AuthError` 422 BUSINESS_RULE per spec line 90
   - Validate `new_password` per SECURITY.md §2: min 12 char, ≥1 digit, ≥1 symbol — fail → `ValidationError` 400 per spec line 91
   - `argon2.hash(new_password)` via T05's `PasswordHasherPort`
   - `AuthRepository.updatePassword(userId, newHash)` — also **clear `must_rotate_password` flag** to `false` (per spec line 128 + MVP-AUTH-FIRST §4.2 last sentence)
   - Return `{ success: true }` per spec lines 84-86
4. **`must_rotate_password` per-request gate** Fastify plugin (cross-cutting). Lives at `src/plugins/must-rotate-password.plugin.ts` OR `src/modules/auth/plugins/must-rotate-password.ts` — Executor decide di PLAN (see Open Item #3). Behavior per `MVP-AUTH-FIRST §4.2`:
   - Read JWT/session → check `user.must_rotate_password` flag
   - If `true` AND request path NOT IN allow-list → return `403 PASSWORD_ROTATION_REQUIRED`
   - Allow-list (per spec §4.2): `POST /api/auth/me/password`, `GET /api/auth/me`, `POST /api/auth/logout`
   - Register globally in `entrypoints/api.ts` after T11 tenant-guard (when T11 lands) OR standalone if T11 not yet wired (T11 is next-cycle work)
5. **Reuse T05 building blocks**: `PasswordHasherPort` / `Argon2Hasher` / `TokenIssuer` / `AuthRepository` extended (add `findUserById`, `updatePassword`, `updateLanguage`, `rotateCsrfToken` methods)
6. **Unit tests** — service + routes + plugin + zod schema parse/reject paths

**Explicitly OUT-of-scope this cycle**:
- Integration tests for new repo methods — deferred until T02 (T05's `it.todo()` placeholder pattern; add 4-6 new `it.todo()` entries for findUserById/updatePassword/updateLanguage/rotateCsrfToken if Executor wants symmetry)
- Email-based password reset (`POST /api/users/:id/reset-password` via SMTP) — out of MVP per spec line 129
- Password history (last-N enforcement) — NOT in spec, NOT in `prisma/schema.prisma` (only `PasswordResetToken` table; `password_history` table absent). Don't introduce schema change.
- Lockout after N failed `current_password` attempts — NOT in spec for `/me/password` endpoint (lockout is for login per SECURITY.md §6 — separate concern)
- 2FA / MFA — out of MVP
- T11 tenant-guard wiring — T11 is next-cycle work; T06 plugin registers independently first

#### PM B notes — DoD this submission

- [ ] 3 endpoints authored (route + zod + service + repo extension): `GET /me`, `PATCH /me`, `POST /me/password`
- [ ] `GET /api/auth/me` response shape **exactly matches** `01-auth-identity §1.1` login response (same `{ user, csrfToken }` shape — verbatim per spec line 56)
- [ ] `csrfToken` rotation on `/me`: new random hex via `crypto.randomBytes(32).toString('hex')`, persisted to `sessions.csrf_token`, returned in response body
- [ ] `PATCH /me` whitelist: only `language` accepted; any other field → `ValidationError` 400
- [ ] `POST /me/password` flow:
  - [ ] `current_password` verify via `PasswordHasherPort.verify` (argon2 timing-safe internal)
  - [ ] Wrong current → `AuthError` 422 `BUSINESS_RULE` (per spec line 90)
  - [ ] `new_password` validation per SECURITY.md §2: min 12 / ≥1 digit / ≥1 symbol → `ValidationError` 400 on fail
  - [ ] `new_password` hashed via `PasswordHasherPort.hash` (argon2id)
  - [ ] `users.password_hash` + `must_rotate_password=false` updated atomically (single Prisma update)
  - [ ] Return `{ success: true }` per spec lines 84-86
- [ ] **`must_rotate_password` per-request gate plugin**:
  - [ ] Fastify plugin at chosen path (PLAN decides per Open Item #3)
  - [ ] Reads session/JWT → checks `user.must_rotate_password` flag
  - [ ] Returns `403 PASSWORD_ROTATION_REQUIRED` (custom AppError code) for non-allow-list routes when flag=true
  - [ ] Allow-list verbatim per spec §4.2: `POST /api/auth/me/password`, `GET /api/auth/me`, `POST /api/auth/logout`
  - [ ] Registered di `entrypoints/api.ts` — order documented (after `@fastify/jwt`, before route registration)
- [ ] **AuthRepository extensions**:
  - [ ] `findUserById(id: string): Promise<User | null>` — read by PK
  - [ ] `updatePassword(userId, newHash): Promise<void>` — atomic update password_hash + must_rotate_password=false
  - [ ] `updateLanguage(userId, language): Promise<User>` — return updated user
  - [ ] `rotateCsrfToken(sessionId, newToken): Promise<void>` — update session row
- [ ] **AuthService extensions**:
  - [ ] `getMe(claims: JwtClaims): Promise<{user, csrfToken}>` — fetch user + rotate CSRF + return
  - [ ] `updateMeLanguage(claims, language): Promise<{user}>`
  - [ ] `rotatePassword(claims, current, new): Promise<{success: true}>`
- [ ] Unit tests per `docs/TESTING.md §4` (mock port + mock repo instance):
  - [ ] `auth.service.test.ts` extensions: getMe happy + 404 user not found; rotatePassword happy + wrong current (422) + weak new (400 — exercise each rule: min length, digit, symbol) + must_rotate cleared post-rotation; updateMeLanguage happy + invalid lang
  - [ ] `auth.routes.test.ts` extensions: `GET /me` returns shape + Set-Cookie csrf rotation; `PATCH /me` language; `POST /me/password` happy + 422 + 400; whitelist rejects extra fields
  - [ ] `auth.schema.test.ts` extensions: PatchMeRequest accepts language; rejects non-whitelisted; RotatePasswordRequest accepts valid; rejects weak rule-by-rule
  - [ ] New plugin test file `must-rotate-password.plugin.test.ts`: flag=false → next(); flag=true + non-allow-list path → 403; flag=true + allow-list path → next(); JWT absent → delegate to upstream auth (skip silently or 401 — confirm in PLAN per Open Item #3)
- [ ] **Test naming** `should <expected> when <condition>` per CLAUDE.md §8
- [ ] **Coverage line ≥ 80%** for new files + extended files; target 90% on service/routes/schema per TESTING.md §9 critical
- [ ] Integration test placeholder extensions: add `it.todo()` entries in existing `auth.repository.integration.test.ts` (or new file if Executor prefers) for findUserById/updatePassword/updateLanguage/rotateCsrfToken — gated on T02
- [ ] `make check` green (lint + format-check + typecheck + test-unit; NOT test-integration this cycle)
- [ ] **Security floor** (CLAUDE.md §6 + SECURITY.md):
  - [ ] argon2 timing-safe verify (lib default)
  - [ ] No plaintext password leak in log — `maskEmail()` already used; do NOT log `current_password` or `new_password` ever (no `req.body` log)
  - [ ] No password leak in error response — generic `AuthError` message for wrong current (no "wrong password" specifics); `ValidationError` for weak new with rule violations OK (`min length` / `missing digit` / `missing symbol` enumerated)
  - [ ] CSRF token: new random 32-byte hex per rotation; old token discarded on session update
  - [ ] JWT secret still from `config.JWT_ACCESS_SECRET` — no hardcoded
- [ ] Drift floor: zero `any` / `console.log` / `@ts-ignore` / `throw new Error(`-in-service / default export / forbidden imports (express/typeorm/moment/node-fetch) / `.skip` / `setTimeout()` job-delay / wrap-Prisma interface — same standard as T05
- [ ] Named exports only; explicit return types on public methods; file ≤ 300 LOC
- [ ] **APPROVE-PARTIAL convention**: same as T05 — full APPROVE deferred until T02 ships + integration tests fill in `it.todo()` placeholders. VERDICT will be APPROVE-PARTIAL on first SUBMIT.

#### PM B notes — File ownership

**Extend existing T05 files** (per `docs/MODULE_TEMPLATE.md §1` — extending existing module pattern):

```
src/modules/auth/
├── auth.schema.ts                      EXTEND: PatchMeRequest + RotatePasswordRequest + MeResponse schemas
├── auth.types.ts                       EXTEND: add types if needed (e.g. PasswordPolicyError)
├── auth.service.ts                     EXTEND: getMe + updateMeLanguage + rotatePassword methods
├── auth.repository.ts                  EXTEND: findUserById + updatePassword + updateLanguage + rotateCsrfToken
├── auth.routes.ts                      EXTEND: GET /me + PATCH /me + POST /me/password
└── __tests__/
    ├── auth.service.test.ts            EXTEND: new describe blocks for getMe/rotatePassword/updateMeLanguage
    ├── auth.routes.test.ts             EXTEND: inject tests for 3 new endpoints
    ├── auth.schema.test.ts             EXTEND: zod parse for 2 new schemas
    ├── auth.repository.integration.test.ts  EXTEND: add 4 it.todo() entries for new repo methods
    └── must-rotate-password.plugin.test.ts  NEW: plugin unit tests
```

**New files** (cross-cutting plugin — single new file):

```
src/plugins/must-rotate-password.plugin.ts  OR  src/modules/auth/plugins/must-rotate-password.ts
```

Executor B picks path di PLAN (see Open Item #3 below). Recommend `src/plugins/` (cross-cutting per `PROJECT_STRUCTURE.md §src/plugins/` convention — siblings: `auth-jwt`, `hmac-validator`, `rate-limit`, `cors`, `helmet`, etc.).

**Wiring (modify)**:
- `src/entrypoints/api.ts` — register `mustRotatePasswordPlugin` after `@fastify/jwt` plugin, before route registrations. Order documented inline.

**NO touch zones** (Q-B-02 foundation gaps still parked — same workarounds OK; don't re-fight):
- `prisma/schema.prisma` — schema unchanged (no password_history, no new column)
- `src/core/prisma/prisma-client.ts` — still `{}` placeholder; entrypoint cast still applies
- `.eslintrc.cjs` — eslint-disable inline still OK
- `src/plugins/error-handler.plugin.ts` — still absent; inline setErrorHandler still applies

#### PM B notes — Parent doc refs (WAJIB baca executor sebelum PLAN)

- **`docs/spec/MVP-AUTH-FIRST.md §1` rows 2 + 3** — canonical endpoint list
- **`docs/spec/MVP-AUTH-FIRST.md §4.2`** — `must_rotate_password` enforcement rules (allow-list + 403 PASSWORD_ROTATION_REQUIRED)
- **`docs/spec/01-auth-identity.md §1.1` lines 54-92** — full shape detail untuk `/me` family + error codes (422 for wrong current, 400 for weak new)
- **`docs/SECURITY.md §2`** — password policy: min 12 char + ≥1 digit + ≥1 symbol (canonical floor for `new_password` validation)
- **`CLAUDE.md §4/§5/§6/§8`** — Hexagonal Disiplin + TS strict + security WAJIB + testing 80% floor
- **`docs/MODULE_TEMPLATE.md §3`** — extending existing module pattern (no new module — same `src/modules/auth/`)
- **`docs/TESTING.md §4`** — unit pattern (mock port + mock repo INSTANCE; do NOT mock Prisma)
- **`docs/decisions/0001-hexagonal-disiplin.md`** — middleware = NOT a port (`must-rotate-password.plugin.ts` is a Fastify plugin, direct, no hex port wrap)
- **`PM-STATUS-B.md §2` ASSIGNMENT T05 + PLAN T05 + FULL-ACK** — reuse PasswordHasherPort + TokenIssuer + AuthRepository patterns

#### PM B notes — Acceptance criteria

1. 3 endpoints functional (`GET /me`, `PATCH /me`, `POST /me/password`) with correct shapes per spec
2. `must_rotate_password` plugin enforces 403 for non-allow-list paths when flag=true
3. All DoD checkboxes met
4. `make check` green (lint + format + typecheck + test-unit)
5. Drift zero T05+T06 territory (foundation gaps Q-B-02 stays — don't re-fight)
6. Coverage line ≥ 80% on new + extended files; target 90% on service/routes/schema
7. Security floor: no plaintext password leak in log/response, CSRF properly rotated, argon2 timing-safe verify
8. **APPROVE-PARTIAL convention** — full APPROVE deferred until T02 ships di Slot A

#### PM B notes — Sequence + cycle constraint

- **Cycle 3 sequence (PO-ratified, PARENT §10)**: T06 (this) → T11 (tenant-guard) → T07 (gm_admin users CRUD)
- **Don't pick T11 sampai T06 APPROVED-PARTIAL.** T11 will be ASSIGNED separately by PM B after T06 SUBMIT-APPROVE.
- **Single-dev cycle still active**: Slot A/C PARKED. No Parent PM intervention expected.
- **T05 still PARTIAL** — both T05 and T06 will be PARTIAL until T02 ships. PM B will batch re-open both for FULL APPROVE when T02 lands.
- **Branch hygiene**: T06 impl commits land on `feat/auth-core` (same branch as T05). PM-STATUS commits (this ASSIGNMENT, executor PLAN/SUBMIT, PM B ACK/VERDICT) land on `main` per branch hygiene rule (§7).

#### PM B notes — Open items untuk Executor B raise di PLAN

1. **JWT context extraction at `GET /me`** — Executor decide pattern di PLAN:
   - Option (a): Helper function `extractJwtClaims(request): JwtClaims` lokal di `auth.service.ts` atau `auth.routes.ts`
   - Option (b): Fastify decorator `request.authClaims` populated by a `preHandler` hook on `/me` family routes specifically
   - Option (c): Wait for T11 tenant-guard plugin (next cycle) — but T06 needs `/me` working THIS cycle so can't wait
   - **Recommend (a)** for cycle 3 — minimal scope, no plugin scaffold needed. T11 (next cycle) can replace with `request.session` per spec §6 pseudocode. Executor confirm di PLAN.

2. **Password rotation policy resolution** — re-read SECURITY.md §2 line 27 ("min 12 char, 1 angka, 1 simbol"). Spec is canonical: **min 12 / ≥1 digit / ≥1 symbol**. NOT in scope: history depth, lockout, complexity beyond stated rules. Executor confirm di PLAN that rule set matches; raise GAP **only if** Executor finds ambiguity (e.g. is "symbol" = `[^a-zA-Z0-9]` or specific set?). **Recommend**: regex-based check `/[0-9]/` AND `/[^a-zA-Z0-9]/` AND `length >= 12`.

3. **`must_rotate_password` plugin path + integration with T11 (next cycle)** — Executor decide di PLAN:
   - Option (a): `src/plugins/must-rotate-password.plugin.ts` (cross-cutting per `PROJECT_STRUCTURE.md`) — recommended
   - Option (b): `src/modules/auth/plugins/must-rotate-password.ts` (module-scoped)
   - JWT context dependency: plugin needs to read `user.must_rotate_password` from session. Service layer query? Or rely on T11 to populate `request.session`? **For cycle 3** (before T11), plugin must do its own JWT verify + user lookup (Executor inline this). When T11 lands, refactor to read `request.session.user.must_rotate_password` and remove inline lookup.
   - **Recommend (a) + inline-lookup-for-now** with `TODO(T11)` marker. Document refactor plan in SUBMIT Notes.

4. **Session invalidation post-password-rotation** — spec does NOT mandate. Two design choices:
   - (i) Invalidate ALL sessions including current (force re-login on all devices) — security-paranoid default; user must log in again with new password on all devices
   - (ii) Invalidate ALL OTHER sessions, keep current alive (`revoke WHERE userId=X AND sid<>currentSid`) — user-friendly default; current session continues smoothly
   - (iii) No session invalidation — only password+flag updated; sessions stay live with old `passwordHash`-issued JWTs
   - **Recommend (ii)** — sensible UX default, mitigates stolen-device scenario. Executor propose; PM B will rule in PLAN ACK.

5. **Rate limit `POST /me/password`** — SECURITY.md §6 says login = 5 fail/15min lockout. Password rotation = adjacent risk surface (brute-force `current_password`). Options:
   - (a) Inline `@fastify/rate-limit` (already installed) at 5 fail/15min per user — same policy as login
   - (b) Defer to separate task (similar to T05 deferral of login rate-limit)
   - **Recommend (b)** — defer to keep T06 scope tight. Add to PM B follow-up list for next cycle. Executor confirm di PLAN.

6. **Password history table** — re-confirm: `prisma/schema.prisma` has NO `password_history` model (verified by PM B: `grep "model " prisma/schema.prisma` shows Tier/Hotel/User/Session/PasswordResetToken only). Spec does NOT mandate history. **Don't introduce schema change** — out of T06 scope. If FE later asks for "can't reuse last N passwords" → separate task with schema migration via Slot A.

Awaiting Executor B PLAN T06 attempt 1.

#### PLAN T06 — exec-B (Nanak) at cycle 3 (2026-06-29) attempt 1

**Scope recap**

Extend `src/modules/auth/` (existing T05 module on `feat/auth-core` branch) with 3 new endpoints (`GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/me/password`) + a cross-cutting `must-rotate-password` Fastify plugin that returns `403 PASSWORD_ROTATION_REQUIRED` for non-allow-list paths when `users.must_rotate_password = true`. Reuse T05 building blocks (`PasswordHasherPort` / `Argon2Hasher` / `TokenIssuer` / `AuthRepository`) — no new ports, no new adapters, no new ext deps. Extend `AuthRepository` with 4 read/write methods (`findUserById`, `updatePassword`, `updateLanguage`, `rotateCsrfToken`) + add 1 method for the rotation-policy session sweep (`revokeAllOtherSessions`). Extend `AuthService` with 3 orchestration methods (`getMe`, `updateMeLanguage`, `rotatePassword`). Add 1 new file (`src/plugins/must-rotate-password.plugin.ts`) for the cross-cutting gate. Wire plugin in `entrypoints/api.ts` after `@fastify/jwt`, before route registrations. Unit tests extend the 4 existing T05 test files + 1 new plugin test file. Integration tests stay as `it.todo()` placeholders (T02 deferral, same APPROVE-PARTIAL convention as T05). `make check` green prerequisite.

**Session-start gate** (EXECUTOR-PROTOCOL §2)

- Identity confirmed: Executor, Slot B (Nanak) ✓
- CLAUDE.md loaded ✓ (auto-load)
- Task spec read: `MVP-AUTH-FIRST.md §1` rows 2+3 + `§4.2`; `01-auth-identity §1.1` lines 54-92; `SECURITY.md §2.4` (password policy: min 12 + ≥1 digit + ≥1 symbol)
- Parent docs spot-read: `CLAUDE.md §4-§6, §8`; `docs/MODULE_TEMPLATE.md §1, §3`; `docs/decisions/0001-hexagonal-disiplin.md` (middleware/plugin ≠ port); `docs/TESTING.md §4, §9` (mock port + mock repo instance; auth=critical 90% target); `PROJECT_STRUCTURE.md §src/plugins/` (cross-cutting Fastify plugin location); T05 patterns in current `src/modules/auth/*` (on `feat/auth-core` branch); existing `prisma/schema.prisma` User/Session columns
- Dependencies: T05 `APPROVE-PARTIAL` confirmed (PM B VERDICT cycle 2). T06 stacks on `feat/auth-core` branch. Q-B-02 foundation gaps still parked — reuse T05 workarounds (jest.config.json + Prisma cast + eslint-disable on adapter import + inline setErrorHandler). No fresh blockers expected.
- `make typecheck` clean: ✓ on `main` baseline (verified mid-session by hopping to feat/auth-core; will re-verify post-checkout). Codebase on main is the pre-T05-merge state since T05 not yet merged; will checkout `feat/auth-core` post-ACK and re-baseline there.
- `make lint` clean: same as above, ✓ on T05 branch
- Scaffolder risk: **none** — no `pnpm create` / `prisma init` / scaffolder planned. **No new package install needed** (argon2, @fastify/cookie, @fastify/jwt, @fastify/rate-limit, zod all present in `package.json` post-T05).

**Files to create** (2 new)

```
src/plugins/must-rotate-password.plugin.ts                   NEW (cross-cutting gate)
src/modules/auth/__tests__/must-rotate-password.plugin.test.ts  NEW (plugin unit tests)
```

Optional 3rd new file if symbol set is non-trivial:

```
src/modules/auth/auth.password-policy.ts                     NEW (regex predicates + error mapper, isolated for clean unit-test)
```

Executor will decide at code-time whether to inline policy in `auth.schema.ts` (smaller change) or hoist to `auth.password-policy.ts` (better test isolation). PLAN baseline: **inline in schema** (one fewer file).

**Files to modify** (~9 EDIT)

Existing T05 surface (extended, additive):
- `src/modules/auth/auth.schema.ts` — add `PatchMeRequestSchema` (strict, `language` only) + `RotatePasswordRequestSchema` (current + new with rule-by-rule zod refine) + `MeResponseSchema` (alias/reuse of `LoginResponseSchema`) + `PasswordChangeResponseSchema` (`{ success: literal(true) }`)
- `src/modules/auth/auth.types.ts` — add `PasswordPolicyViolation` discriminated union (`min_length` | `missing_digit` | `missing_symbol`) for granular ValidationError details (or fold into ValidationError details — Executor decides)
- `src/modules/auth/auth.service.ts` — add `getMe(claims)` + `updateMeLanguage(claims, language)` + `rotatePassword(claims, current, new)` methods
- `src/modules/auth/auth.repository.ts` — add `findUserById` + `updatePassword(userId, newHash)` (atomic: also `must_rotate_password=false`) + `updateLanguage(userId, lang)` + `rotateCsrfToken(sessionId, newToken)` + `revokeAllOtherSessions(userId, exceptSessionId)` (per Open Item #4 decision below)
- `src/modules/auth/auth.routes.ts` — register `GET /me`, `PATCH /me`, `POST /me/password` handlers. JWT-context helper inlined here (per Open Item #1 decision)
- `src/modules/auth/__tests__/auth.service.test.ts` — extend with `describe('AuthService.getMe', ...)` (3 tests) + `describe('AuthService.updateMeLanguage', ...)` (2 tests) + `describe('AuthService.rotatePassword', ...)` (6 tests covering: happy + clears must_rotate; 422 wrong current; 400 weak new per-rule × 3; revokes other sessions ✓)
- `src/modules/auth/__tests__/auth.routes.test.ts` — extend with 3 new describe blocks (`GET /me`, `PATCH /me`, `POST /me/password`); test JWT cookie present/absent/expired; test 422/400 mappings
- `src/modules/auth/__tests__/auth.schema.test.ts` — extend with `PatchMeRequestSchema` (3 tests: language ok, extra field rejected, missing rejected) + `RotatePasswordRequestSchema` (4 tests: happy + missing length + missing digit + missing symbol)
- `src/modules/auth/__tests__/auth.repository.integration.test.ts` — add 5 `it.todo()` entries for new repo methods (findUserById/updatePassword/updateLanguage/rotateCsrfToken/revokeAllOtherSessions)

Cross-cutting wiring:
- `src/entrypoints/api.ts` — register `mustRotatePasswordPlugin` after `@fastify/jwt` plugin, before `authRoutes`. Order documented inline.

**File count**: **2 CREATE / 9 EDIT** (10 if optional `auth.password-policy.ts` lands).

**Approach**

`GET /me` flow: route handler reads `req.cookies.token` → calls local `extractJwtClaims(fastify, token)` helper (uses `fastify.jwt.verify` — throws `AuthError` on missing/invalid) → returns claims with `sid` → service `getMe(claims)` does `repo.findUserById(claims.sub)` + generates new CSRF (`crypto.randomBytes(32).toString('hex')`) + `repo.rotateCsrfToken(claims.sid, newCsrf)` + returns `{ user: toAuthUser(user), csrfToken }`. Route returns 200 + body. **No new Set-Cookie** (csrfToken in body per spec §1.1; access cookie stays as-is). `PATCH /me` flow: zod-parse body (`PatchMeRequestSchema` strict whitelist `{ language }`) → call `service.updateMeLanguage(claims, body.language)` → service `repo.updateLanguage(claims.sub, language)` returns updated user → route returns `{ user }`. `POST /me/password` flow: zod-parse body → service `rotatePassword(claims, current, new)`: `repo.findUserById(claims.sub)` (404 → unusual since claims came from valid JWT but defensive `AuthError`) → `hasher.verify(user.passwordHash, current)` (false → `AuthError` 422 `BUSINESS_RULE` with code `INVALID_CURRENT_PASSWORD`) → policy-check new (per Open Item #2 — `length>=12 && /[0-9]/ && /[^a-zA-Z0-9]/`) (fail → `ValidationError` 400 with per-rule details `{ failed: ['min_length', 'missing_digit', ...] }`) → `hasher.hash(new)` → `repo.updatePassword(claims.sub, newHash)` (atomic: also `must_rotate_password=false`) → `repo.revokeAllOtherSessions(claims.sub, claims.sid)` (Open Item #4 (ii)) → return `{ success: true }`. **Plugin** (`must-rotate-password.plugin.ts`): registered as `onRequest` hook globally. For each request: if path IN allow-list (`POST /api/auth/me/password` + `GET /api/auth/me` + `POST /api/auth/logout`) → skip (next). Else: read `req.cookies.token` → if absent → skip (no auth context to enforce against; let downstream 401 if needed). Else try `fastify.jwt.verify` → if invalid → skip (defer to existing 401 path). Else valid claims → `repo.findUserById(claims.sub)` → if `user.must_rotate_password === true` → throw `PasswordRotationRequiredError` (new AppError subclass with `statusCode=403, code='PASSWORD_ROTATION_REQUIRED'`). The inline `setErrorHandler` already maps AppError → status code, so the 403 lands cleanly. **TODO(T11)** marker on the inline lookup: when T11 ships tenant-guard plugin populating `request.session`, refactor plugin to read `request.session.user.mustRotatePassword` and remove inline repo lookup. Allow-list matched against `req.routerPath` (Fastify's normalized route path) to avoid path-prefix mismatches. **Test strategy** per T05 pattern: service tests use plain-object mocks cast to `AuthRepository`/`PasswordHasherPort`/`TokenIssuer` (avoids `unbound-method` lint trap); route tests via Fastify `inject()` with mocked service decorator; plugin test instantiates a fastify instance, registers @fastify/cookie + @fastify/jwt + the plugin + 3 dummy routes (one allow-listed, one not, one healthcheck), inject with various flag/cookie combos. Errors: define `PasswordRotationRequiredError extends AppError` in `core/errors/app-errors.ts` — **WAIT**, that's `src/core/` (Slot A territory). Alternative: inline in plugin file (subclass `AppError` locally) OR add to `src/modules/auth/auth.errors.ts` (module-local). Recommend **inline subclass in plugin file** (1-file scope, minimal cross-team touch). Flag for PM B confirmation.

**6 Open items — stance final**

1. ✅ **JWT context extraction at `/me`** → **(a) helper function** `extractJwtClaims(fastify, token)` inlined in `auth.routes.ts` (or its own helper file `auth.jwt-context.ts` if reused across multiple routes/plugin; baseline: inline). Helper reads `fastify.jwt.verify(token)` → returns `JwtClaims`; throws `AuthError` on null/empty/invalid. Plugin file gets its own copy of the helper (or imports from `auth.routes.ts` — Executor decides at code-time; both work since this is module-internal). **TODO(T11)** marker: when T11 lands, replace with `request.session.user` populated by tenant-guard. **Confirm (a).**

2. ✅ **Password rotation policy** → **regex set**: `length >= 12` AND `/[0-9]/` AND `/[^a-zA-Z0-9]/`. Symbol = ANY char outside `[a-zA-Z0-9]` (broad per spec ambiguity; matches OWASP common-policy definition). Encoded in zod via `.refine()` chain — one refine per rule with discriminated error key (`min_length` | `missing_digit` | `missing_symbol`) surfaced via `ValidationError.details`. **Confirm — no GAP raised.**

3. ✅ **Plugin path** → **(a) `src/plugins/must-rotate-password.plugin.ts`** (cross-cutting per `PROJECT_STRUCTURE.md`, siblings: auth-jwt/hmac-validator/rate-limit/cors/helmet etc.). Inline JWT-verify + inline `repo.findUserById` lookup with `TODO(T11)` marker for future refactor to `request.session`. **Confirm (a).**

4. ✅ **Session invalidation post-rotation** → **(ii) revoke ALL OTHER sessions, keep current alive**. Repo method `revokeAllOtherSessions(userId, exceptSessionId)` — single Prisma updateMany with `WHERE userId=$1 AND id<>$2 AND revokedAt IS NULL`. Service calls this after `updatePassword` (separate query, NOT in a transaction since the atomic guarantee is between updatePassword + must_rotate_password=false, not against session revoke; failure to revoke other sessions does NOT block password rotation — log warning, don't throw). **Confirm (ii).**

5. ✅ **Rate limit `POST /me/password`** → **(b) defer** to a separate follow-up task per PM B recommendation. SECURITY.md §6 lockout policy needs DB/Redis state tracking (similar to login lockout deferral in T05). Add explicit "Rate-limit deferred" line to SUBMIT Notes for PM B follow-up backlog. **Confirm (b).**

6. ✅ **Password history table** → **NO schema change**. Verified `prisma/schema.prisma` has no `password_history` model per PM B note. Out of T06 scope; if FE asks later → separate task with Slot A schema migration. **Confirm.**

**Auxiliary design questions (resolved internally, no PM B blocker)**

- **`PasswordRotationRequiredError` AppError subclass placement**: `src/core/errors/app-errors.ts` is Slot A territory; touch risk per Q-B-02 ethos. Options: (i) inline subclass in `src/plugins/must-rotate-password.plugin.ts` (module-internal extends from import); (ii) new `src/modules/auth/auth.errors.ts` (module-scoped); (iii) extend `src/core/errors/app-errors.ts` (Slot A territory). **Intent: (i)** — inline subclass in plugin file. AppError abstract class is importable from `@core/errors/app-errors.js`; defining a 3-line subclass in the plugin file keeps the cross-team touch zero. Flag for PM B confirm — willing to switch to (ii) if PM B prefers module-scoped errors file.
- **`extractJwtClaims` helper reuse**: For T06, the helper is used by both routes (`GET /me`) and the plugin. Two copies risk drift. Options: (A) export helper from `auth.routes.ts` (touches barrel?) — no, route file isn't barrel-exported; (B) extract to `src/modules/auth/auth.jwt-context.ts` (1 new file); (C) duplicate (2 LOC each). **Intent: (B)** — small dedicated file `auth.jwt-context.ts` exporting `extractJwtClaims(fastify, token | null): JwtClaims` (throws AuthError on null/invalid). One file count up (+1 EDIT becomes +1 CREATE). Adjusts file count: **3 CREATE / 9 EDIT**.

**GAPs / questions (PLAN-blocking)**

- **(none)**. All 6 PM B open items have confirmed stances. Auxiliary design questions (`PasswordRotationRequiredError` placement, `extractJwtClaims` extraction) are intent-stated; PM B may push back at ACK time but they're not blockers.
- **No package install needed** — argon2, @fastify/cookie, @fastify/jwt, @fastify/rate-limit, zod, winston all in `package.json` post-T05.
- **No schema change needed** — `prisma/schema.prisma` User/Session columns sufficient (`must_rotate_password` already exists at User row).
- **No env var addition needed** — no new TTL, no new secret.
- **No cross-team file touch beyond existing Q-B-02 workarounds** — `src/core/*` untouched, `src/plugins/error-handler.plugin.ts` still absent (inline setErrorHandler in entrypoint still serves), `.eslintrc.cjs` untouched (eslint-disable comment pattern reused).

**Test plan summary (per TESTING.md §4 + §11)**

- `auth.service.test.ts` extensions: ~11 new tests (3 getMe + 2 updateMeLanguage + 6 rotatePassword)
- `auth.routes.test.ts` extensions: ~9 new tests (3 endpoints × happy + auth/validation paths)
- `auth.schema.test.ts` extensions: ~7 new tests (3 PatchMe + 4 RotatePassword)
- `must-rotate-password.plugin.test.ts` (NEW): ~6 tests (flag=false → next; flag=true non-allowlist → 403; flag=true allowlist → next; cookie absent → skip; cookie invalid → skip; routes-decorator path-matching)
- `auth.repository.integration.test.ts` extensions: ~5 new `it.todo()` placeholders
- Coverage target per file (T06 scope): line ≥80% floor; 90% on service/routes/schema/plugin

**Security checklist (CLAUDE.md §6 + SECURITY.md)**

- argon2 verify (timing-safe internal) for current password check
- argon2id hash (T05 default mode) for new password
- `must_rotate_password=false` cleared atomically in `updatePassword` (single Prisma write)
- CSRF rotation on `GET /me`: new 32-byte hex per call; old token discarded by session row update
- No plaintext password logged anywhere (no `req.body` log, even on validation failure)
- No specifics in wrong-current AuthError message (generic "Invalid current password" — no "user not found"-style information leak)
- `ValidationError` details on weak new password enumerate per-rule failures (acceptable info disclosure — improves UX, no auth bypass risk)
- Session sweep post-rotation (Open Item #4 (ii)) — current session continues smoothly; other devices forced re-login (mitigates stolen-device window)
- Plugin: short-circuit on cookie absent / JWT invalid (don't leak whether user has must_rotate flag via timing); delegate to downstream 401

**Risks + assumptions**

- **Risk**: Plugin inline JWT-verify + repo lookup adds a DB hit per request. Optimization deferred to T11 (`request.session` populated upstream). Acceptable for T06 unit-scope; flag at SUBMIT Notes.
- **Risk**: `revokeAllOtherSessions` is best-effort post-rotation. If DB hiccup leaves a row unrevoked, user's other-device session keeps the old `passwordHash`-issued JWT alive until natural expiry (max 15min access TTL per D04). Acceptable per OWASP best-practice (rotation forces re-auth on token expiry, not immediately on all devices).
- **Assumption**: `req.routerPath` is the right path field for allow-list matching in Fastify 4. Will verify at code-time; fallback to `req.url.split('?')[0]` if needed.
- **Assumption**: `users.must_rotate_password` column exists (verified in `prisma/schema.prisma:88`). No schema migration.
- **Assumption**: T05's `feat/auth-core` branch is checkout-ready and `make check` green there. Will verify post-ACK with checkout + baseline run.

**ETA**

- PLAN ACK cycle: ~15-30 min wall-time
- Implementation (3 endpoints + plugin + 5 repo methods + 3 service methods + extractJwtClaims helper + Prisma client cast cleanup if needed): ~2.5-3.5h engineering time
- Unit tests (service extensions + routes extensions + schema extensions + plugin tests + integration `it.todo` extensions): ~2-3h
- Self-validate per §4.4 (make check + drift scan + coverage check): ~30-45 min
- Total wall-time exec: **~5-6.5h from ACK to SUBMIT**, conditional on no surprises during plugin path-matching debugging

**Status: ready-for-ACK. No PLAN-blocking GAPs. All 6 open items have confirmed stances.**

Per PM B branch hygiene rule (this file §7) + cycle-3 directive: PM-STATUS commits land on `main`; impl commits (post-ACK) will land on `feat/auth-core`. **NOT switching branch / NOT touching `src/` until PM B ACK posted.** Will checkout `feat/auth-core` only after ACK.

Awaiting PM B ACK.

##### PM B ACK PLAN T06 attempt 1 — Executor B clear to implement. 2 aux Qs ruled (1 amendment, 1 approve-as-proposed). Cycle 3 (2026-06-29).

**Outcome**: ✅ **ACK** with 1 amendment. Executor B IMPL-READY. Switch to `feat/auth-core` post-ACK; impl commits land on branch, PM-STATUS commits land on main per §7 branch hygiene.

**PLAN validation per PM-AGENT §2.3**:

| Criterion | Verdict | Note |
|---|---|---|
| Consistency vs ASSIGNMENT §"Scope" | ✅ | 3 endpoints + plugin + 5 repo methods + 3 service methods + helper — exact match |
| Consistency vs ASSIGNMENT §"DoD" (22 items) | ✅ | All 22 checkboxes mapped to PLAN approach paragraph + test plan |
| Consistency vs ASSIGNMENT §"AC" (8 items) | ✅ | APPROVE-PARTIAL convention respected; security floor encoded |
| File list completeness | ✅ | 3 CREATE (plugin + plugin test + jwt-context) / 9 EDIT — covers all ASSIGNMENT §"File ownership" entries; **PM B amendment below adds 1 more CREATE** → **4 CREATE / 9 EDIT** final |
| Test plan validity | ✅ | ~38 new tests (11 service + 9 routes + 7 schema + 6 plugin + 5 `it.todo`); mock pattern reuses T05 precedent (mock port + mock repo instance, NO Prisma mock) per TESTING.md §4 |
| GAP categorization | ✅ | 0 PLAN-blocking GAPs; 2 aux design Qs (intent stated) — both ruled below |
| ETA reasonability | ✅ | ~5-6.5h impl→SUBMIT vs T05 ~6-8h — sound; foundation already in place |
| 6 ASSIGNMENT open items stance | ✅ | All 6 confirmed verbatim per Executor (1: helper-a / 2: regex set / 3: plugin path-a inline + TODO(T11) / 4: revoke-others-keep-current / 5: rate-limit defer / 6: no schema change) |

**2 auxiliary design Q rulings**:

- **AUX-Q1 — `PasswordRotationRequiredError` AppError subclass placement** → ⚠️ **APPROVE-WITH-AMENDMENT**
  - **Executor intent**: option (i) inline subclass in `src/plugins/must-rotate-password.plugin.ts`
  - **PM B ruling**: option (ii) **NEW FILE `src/modules/auth/auth.errors.ts`** (module-scoped errors home) — extends `AppError` from `@core/errors/app-errors.js`; exports `PasswordRotationRequiredError` (statusCode 403, code `PASSWORD_ROTATION_REQUIRED`); plugin imports from this file. Module barrel `index.ts` does NOT re-export (internal-only — plugin is the only intra-module consumer).
  - **Rationale**:
    1. **SRP**: separates plugin transport logic from error domain definition
    2. **Reusable for T07+**: future auth-domain errors (`UserNotFoundError`, `SessionExpiredError`, etc.) have a single home — avoids ad-hoc inlining across files later
    3. **Respects Q-B-02 ethos**: NO touch to `src/core/errors/` (Slot A territory); `src/modules/auth/auth.errors.ts` is module's own surface
    4. **Low cost**: ~10 LOC new file; cleaner than inline-in-plugin
  - **File count update**: **4 CREATE / 9 EDIT** (was 3 CREATE per PLAN line 996). If Executor also extracts optional `auth.password-policy.ts` at code-time → 5 CREATE; document at SUBMIT.

- **AUX-Q2 — `extractJwtClaims` helper at `src/modules/auth/auth.jwt-context.ts`** → ✅ **APPROVE as proposed**
  - **Executor intent**: option (B) extract to own file `src/modules/auth/auth.jwt-context.ts` (shared between routes + plugin)
  - **PM B ruling**: APPROVE (no amendment)
  - **Rationale**:
    1. DRY across `auth.routes.ts` + `must-rotate-password.plugin.ts` (two consumers — avoids 2-LOC drift between copies)
    2. Module-scoped helper file (not core/) — respects Q-B-02
    3. Pure function (no port needed — ADR-0001 aligned)
    4. `TODO(T11)` marker keeps refactor surface visible for next-cycle tenant-guard work
  - **No change**: 1 of the 3 CREATE from PLAN baseline.

**Standing instructions ke Executor B** (post-ACK):

- **Switch branch**: `git checkout feat/auth-core && git rebase main` — sync latest hygiene rule + ASSIGNMENT + PLAN + ACK context onto branch via rebase. PLAN content already on main (commit `16c9706`) so rebase will replay branch impl commits on top of latest main without touching PM-STATUS-*.md (those are append-only on main).
- **Suggested commit sequence** (Executor decide final granularity):
  1. `feat(auth): module errors home (auth.errors.ts) + PasswordRotationRequiredError`
  2. `feat(auth): jwt-context helper (auth.jwt-context.ts) — shared route + plugin extractor`
  3. `feat(auth): schemas extension (PatchMe, RotatePassword, MeResponse, PasswordChangeResponse)`
  4. `feat(auth): repository extension (findUserById, updatePassword, updateLanguage, rotateCsrfToken, revokeAllOtherSessions)`
  5. `feat(auth): service extension (getMe, updateMeLanguage, rotatePassword)`
  6. `feat(auth): routes extension (GET/PATCH /me, POST /me/password)`
  7. `feat(plugins): must-rotate-password plugin — 403 gate for non-allow-list paths`
  8. `feat(auth): wire mustRotatePasswordPlugin di entrypoints/api.ts (after @fastify/jwt, before authRoutes)`
  9. `test(auth): unit suite extension (service + routes + schema + plugin + it.todo placeholders)`
- **Self-validate gate per EXECUTOR-PROTOCOL §4.4 SEBELUM SUBMIT** (same as T05):
  - `make check` HARUS green (lint + format-check + typecheck + test-unit; NOT test-integration this cycle)
  - **Drift scan zero hits** scoped to T06 touched files (per `PM-AGENT §3 Step 2`): no `any` / `console.log` / `@ts-ignore` / `throw new Error(`-in-service / default export / forbidden imports / `.skip` / hardcoded URL / `setTimeout()` / wrap-Prisma interface
  - **Coverage report** ≥80% line floor on new + extended files; target 90% on service/routes/schema/plugin per TESTING.md §9 critical
  - **Security floor verify**: argon2 timing-safe verify for `current_password`; no plaintext password leak in log or error response; CSRF rotation on `GET /me`; `must_rotate_password=false` cleared atomically with hash update; allow-list verbatim per spec §4.2 (`POST /api/auth/me/password`, `GET /api/auth/me`, `POST /api/auth/logout`)
- **Best-effort `revokeAllOtherSessions`**: per Executor PLAN stance #4 — catch + log warning, do NOT throw; password rotation must succeed even if session sweep hits DB hiccup (max 15min access TTL per D04 caps stale-token window).
- **Session invalidation**: confirmed option (ii) — revoke ALL OTHER sessions, keep current alive (`WHERE userId=$1 AND id<>$2 AND revokedAt IS NULL`).
- **Rate-limit deferral**: noted di SUBMIT Notes per Executor stance #5; PM B akan track as cycle-4+ follow-up backlog item (not Q-B-02 — that's Slot A foundation; this is a separate Slot B deferral).
- **TODO(T11) markers** on plugin's inline JWT-verify + repo lookup — when T11 lands (next-next cycle), refactor to `request.session.user.mustRotatePassword`. Document refactor surface in SUBMIT Notes.
- **4 pre-existing Q-B-02 workarounds OK untuk reuse** — jest.config.json + Prisma cast + eslint-disable on adapter import + inline setErrorHandler. Don't re-fight, don't re-document — Q-B-02 already logged.
- **Branch hygiene per §7**: impl commits 1-9 above land on `feat/auth-core`. SUBMIT block (PM-STATUS-B.md edit only) commits on `main` setelah self-validate green. Then PM B will re-checkout branch for independent verify, back to main for VERDICT.

**Risks acknowledged from PLAN — no PLAN-blocking concerns**:
- Inline JWT-verify + repo lookup per plugin request = 1 DB hit per request → optimization deferred to T11 (acceptable for unit-only cycle)
- `req.routerPath` Fastify 4 path-field assumption — Executor will verify at code-time; fallback `req.url.split('?')[0]` documented
- `revokeAllOtherSessions` non-transactional vs `updatePassword` — by-design per Executor stance #4; OWASP-aligned

**Re-engage trigger**: ketika Executor B posts SUBMIT T06 attempt 1 block (PM-STATUS-B.md §2 append, on `main` per hygiene rule), PM B akan run independent verify per PM-AGENT §3 Steps 1-7 → VERDICT (APPROVE-PARTIAL / REJECT / ESCALATE).

**PM B state**: **WAIT-MODE for SUBMIT T06**. No further action di §2 sampai Executor posts SUBMIT.

#### SUBMIT T06 — exec-B (Nanak) at cycle 3 (2026-06-29) attempt 1

Task: Auth current-user + password rotation gate (`GET /api/auth/me` · `PATCH /api/auth/me` · `POST /api/auth/me/password` + `must-rotate-password` per-request gate plugin) — READY-PARTIAL unit-only

Branch: `feat/auth-core` rebased atop `main` (latest PLAN+ACK commits), force-pushed. 19 commits ahead of main total (10 from T05 + 9 from T06).

T06 files changed: **15** (`4 CREATE / 11 EDIT`)
T06 LOC delta: **+1014 / -17**

```
A  src/modules/auth/auth.errors.ts                                      (CREATE, AUX-Q1 amendment)
A  src/modules/auth/auth.jwt-context.ts                                 (CREATE, AUX-Q2 as-proposed)
A  src/plugins/must-rotate-password.plugin.ts                           (CREATE)
A  src/modules/auth/__tests__/must-rotate-password.plugin.test.ts       (CREATE)
M  src/modules/auth/auth.schema.ts                                      EXTEND: PatchMe + RotatePassword + evaluatePasswordPolicy
M  src/modules/auth/auth.repository.ts                                  EXTEND: findUserById, updateUserPassword, updateUserLanguage, rotateCsrfToken, revokeAllOtherSessions
M  src/modules/auth/auth.service.ts                                     EXTEND: getMe, updateMeLanguage, rotatePassword
M  src/modules/auth/auth.routes.ts                                      EXTEND: GET /me + PATCH /me + POST /me/password
M  src/entrypoints/api.ts                                               wire: tokenIssuer decorator + must-rotate gate registration
M  src/shared/types/fastify-augmentation.ts                             EXTEND: tokenIssuer decorator type
M  src/modules/auth/__tests__/auth.service.test.ts                      14 new tests
M  src/modules/auth/__tests__/auth.routes.test.ts                       7 new tests
M  src/modules/auth/__tests__/auth.schema.test.ts                       16 new tests (incl. evaluatePasswordPolicy direct)
M  src/modules/auth/__tests__/auth.repository.integration.test.ts       6 new it.todo() placeholders
M  jest.config.json                                                     collectCoverageFrom now includes src/plugins/**/*.ts
```

Commits (9 — matches ACK suggested sequence; granularity is one-feature-per-commit):

1. `3b3b65c` — feat(auth): add module-scoped error home (PasswordRotationRequiredError)
2. `ad2e334` — feat(auth): jwt-context helper (shared route+plugin)
3. `a8ac762` — feat(auth): /me family schemas + rotation password rules
4. `af6404c` — feat(auth): repository extensions for /me + rotation + session sweep
5. `b8bf635` — feat(auth): service /me + updateMeLanguage + rotatePassword orchestration
6. `837b448` — feat(auth): /me + /me/password routes + tokenIssuer decorator augmentation
7. `cf78872` — feat(plugins): must-rotate-password gate (preHandler hook, 403 on flag=true)
8. `edd15ac` — feat(auth): wire must-rotate gate + tokenIssuer decorator in api entrypoint
9. `6dbde31` — test(auth): /me + rotation + plugin unit suite + integration placeholders

DoD self-check (22 items per ASSIGNMENT §"DoD this submission" lines 782-825)

- [x] **3 endpoints authored** (route + zod + service + repo): `GET /me`, `PATCH /me`, `POST /me/password` (`auth.routes.ts:67-99`)
- [x] **`GET /api/auth/me` shape matches `01-auth-identity §1.1` verbatim** — `GetMeResponseSchema` aliased to `LoginResponseSchema` (`auth.schema.ts:54`); route returns `{ user, csrfToken }` (`auth.routes.ts:71-72`)
- [x] **`csrfToken` rotation on `/me`** — `crypto.randomBytes(32).toString('hex')` per call, persisted via `repo.rotateCsrfToken(sid, newCsrf)`, returned in body (`auth.service.ts:101-105`)
- [x] **`PATCH /me` whitelist** — `PatchMeRequestSchema.strict()` (`auth.schema.ts:60-64`); extra field → 400 VALIDATION_ERROR (route test verifies)
- [x] **`POST /me/password` flow**:
  - [x] `current_password` verify via `PasswordHasherPort.verify` (`auth.service.ts:124`) — argon2 timing-safe internal
  - [x] Wrong current → `AuthError` (`auth.service.ts:131` — note: spec says 422 BUSINESS_RULE; existing `AuthError` maps to 401 via entrypoint setErrorHandler. See "Open items" #1 below for spec-vs-impl flag)
  - [x] `new_password` validation per SECURITY.md §2 — `evaluatePasswordPolicy(new)` returns failed rules `['min_length' | 'missing_digit' | 'missing_symbol']`; non-empty → `ValidationError` 400 with `{ failed: [...] }` (`auth.service.ts:135-138`)
  - [x] `new_password` hashed via `PasswordHasherPort.hash` (argon2id) (`auth.service.ts:140`)
  - [x] `users.password_hash` + `must_rotate_password=false` atomic single Prisma update (`auth.repository.ts:124-128`)
  - [x] Return `{ success: true }` per spec lines 84-86 (`auth.service.ts:162`)
- [x] **`must_rotate_password` per-request gate plugin**:
  - [x] Lives at `src/plugins/must-rotate-password.plugin.ts` (per ACK Option (a))
  - [x] Reads JWT via shared `extractJwtClaims` helper → checks `user.mustRotatePassword`
  - [x] Returns `403 PASSWORD_ROTATION_REQUIRED` (via `PasswordRotationRequiredError` from `auth.errors.ts`, mapped by entrypoint setErrorHandler)
  - [x] Allow-list verbatim per spec §4.2: `/api/auth/me`, `/api/auth/me/password`, `/api/auth/logout` (`must-rotate-password.plugin.ts:31`)
  - [x] Registered in `entrypoints/api.ts` after `@fastify/jwt` + tokenIssuer decoration, before `authRoutes` (`api.ts:87`)
- [x] **AuthRepository extensions** — 5 new methods (4 from DoD + `revokeAllOtherSessions` per Open Item #4): findUserById, updateUserPassword, updateUserLanguage, rotateCsrfToken, revokeAllOtherSessions (`auth.repository.ts:113-167`)
- [x] **AuthService extensions** — 3 new methods: getMe, updateMeLanguage, rotatePassword (`auth.service.ts:97-167`)
- [x] **Unit tests per TESTING.md §4** — 43 new T06 tests, all use plain-object mocks cast to interfaces (avoids `unbound-method` lint trap):
  - [x] `auth.service.test.ts`: getMe 3 (happy + 404 user not found + inactive); updateMeLanguage 1; rotatePassword 7 (happy clears must_rotate; 422 wrong current; 404 user gone; 400 weak — per-rule × 3; revoke best-effort failure-tolerant)
  - [x] `auth.routes.test.ts`: 3 endpoints × happy + error paths (7 tests). 401 on missing cookie via jwt-context helper.
  - [x] `auth.schema.test.ts`: PatchMe 5 + RotatePassword 6 + evaluatePasswordPolicy 5 = 16 tests
  - [x] `must-rotate-password.plugin.test.ts`: 8 tests (pass-through false; 403 on true non-allowlist; pass-through 3 allowlist routes; skip on no cookie; skip on JWT invalid; skip on user inactive)
- [x] **Test naming** — `should <expected> when <condition>` across the board
- [x] **Coverage ≥80% line on new + extended files; 90% target on critical** — see "Test evidence" below; all T06 files at 100% line, plugin 95.83% line
- [x] **Integration test placeholders extended** — 6 new `it.todo()` entries in existing `auth.repository.integration.test.ts` for findUserById/updatePassword/updateLanguage/rotateCsrfToken/revokeAllOtherSessions (gated on T02)
- [x] **`make check` green** (lint + format-check + typecheck + test-unit; NOT test-integration this cycle) — output excerpt below
- [x] **Security floor (CLAUDE.md §6 + SECURITY.md)**:
  - [x] argon2 verify timing-safe (lib default)
  - [x] No plaintext password leak in log — service does NOT log `current_password` or `new_password`; only `maskEmail(user.email)` + `userId`
  - [x] No password leak in error response — wrong current returns generic "Invalid current password" AuthError; weak new returns `ValidationError` with rule-keys only (`failed: ['min_length', ...]`)
  - [x] CSRF token: new random 32-byte hex per `getMe`; old discarded by session update
  - [x] JWT secret from `config.JWT_ACCESS_SECRET` (no hardcoded)
- [x] **Drift floor zero** — see "Drift scans" below
- [x] **Named exports only; explicit return types; file ≤ 300 LOC** — largest T06 file is auth.service.ts at 271 LOC
- [x] **APPROVE-PARTIAL convention** — integration suite stays `it.todo()` gated on T02

Quality gate

- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings, `--max-warnings 0`)
- `make test-unit`: **PASS** — 73 passed + 16 todo + 2 skipped suites (skipped = `_template/*` pre-existing)
- `make format-check`: **PASS**
- `make check` exit 0 confirmed

Test evidence

```
Test Suites: 2 skipped, 7 passed, 7 of 9 total
Tests:       2 skipped, 16 todo, 73 passed, 91 total
Time:        ~0.9s
```

Coverage (scoped via `collectCoverageFrom` to `src/modules/auth/**` + `src/plugins/**`, repository excluded as integration-deferred):

```
---------------------------------|---------|----------|---------|---------|-------------------
File                             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------------------------|---------|----------|---------|---------|-------------------
All files                        |   98.73 |       85 |     100 |   99.56 |
 modules/auth                    |   99.03 |    85.41 |     100 |     100 |
  auth.cookie-helpers.ts         |   92.85 |       50 |     100 |     100 | 23-27 (T05 carryover)
  auth.errors.ts                 |     100 |      100 |     100 |     100 |
  auth.jwt-context.ts            |     100 |      100 |     100 |     100 |
  auth.routes.ts                 |     100 |    84.61 |     100 |     100 | 27-28 (claimsFromRequest nullish coalesce)
  auth.schema.ts                 |     100 |      100 |     100 |     100 |
  auth.service.ts                |     100 |       95 |     100 |     100 | 210 (sweep-error log branch)
  auth.token-issuer.ts           |     100 |      100 |     100 |     100 |
 modules/auth/adapters           |     100 |      100 |     100 |     100 |
  argon2-hasher.adapter.ts       |     100 |      100 |     100 |     100 |
 plugins                         |      96 |    83.33 |     100 |   95.83 |
  must-rotate-password.plugin.ts |      96 |    83.33 |     100 |   95.83 | 68 (non-AppError re-raise)
---------------------------------|---------|----------|---------|---------|-------------------
```

Per-file vs DoD targets:
- Critical (service/routes/schema/plugin): target 90% line → **100% / 100% / 100% / 95.83%** ✓
- All other files: floor 80% line → 100% ✓
- Global thresholds met (lines 80% / branch 70% / func 75% / stmts 80%)

Drift scans (T06 territory: `src/modules/auth`, `src/plugins`, `src/shared/types/fastify-augmentation.ts`)

```
$ grep -rnE ": any|<any>|as any" src/modules/auth src/plugins ... | grep -v __tests__ | grep -v 'as unknown as'
   (zero hits)

$ grep -rnE "console\.(log|info|debug)" src/modules/auth src/plugins src/shared/types/fastify-augmentation.ts
   (zero hits)

$ grep -rnE "throw new Error\(" src/modules/auth src/plugins | grep -v __tests__
   (zero hits — T06 throws AppError subclasses only; PasswordRotationRequiredError in auth.errors.ts; AuthError/ValidationError from @core/errors)

$ grep -rn '^export default' src/modules/auth src/plugins src/shared/types/fastify-augmentation.ts
   (zero hits)

$ grep -rnE "from 'express'|from 'typeorm'|from 'sequelize'|from 'moment'|from 'node-fetch'" src/modules/auth src/plugins
   (zero hits)

$ grep -rn '\.skip(' src/modules/auth src/plugins --include='*.test.ts'
   (zero hits)

$ grep -rnE "https?://" src/modules/auth src/plugins | grep -v __tests__
   (zero hits — no hardcoded URL)
```

Security check (CLAUDE.md §6 + SECURITY.md §2 + spec §4)

- argon2 timing-safe verify confirmed (lib internal) — `auth.service.ts:124` calls `hasher.verify(user.passwordHash, currentPassword)`
- Password rotation atomic: `repo.updateUserPassword` writes both `passwordHash` and `mustRotatePassword=false` in a single Prisma `update` call (`auth.repository.ts:124-128`)
- Session sweep filter correct: `WHERE userId=$1 AND id<>$2 AND revokedAt IS NULL` (`auth.repository.ts:157-163`) — current session ID excluded, only active sessions targeted
- Sweep is best-effort per ACK ruling: caught in `try/catch`, logs via `logger.warn`, does NOT bubble up to fail password rotation (`auth.service.ts:144-156`)
- Email masked in every log line touching user identity (`maskEmail()` used 3× in rotatePassword + getMe)
- No new password / current password ever logged
- `PasswordRotationRequiredError` returns 403 with code `PASSWORD_ROTATION_REQUIRED` — details object includes `userId` only (no flag value, no path)
- CSRF token: 32 random bytes hex per `getMe` call; persisted via `rotateCsrfToken(sid, newToken)` overwriting old; returned in body (not cookie)
- JWT secret from `config.JWT_ACCESS_SECRET` (entrypoint inject); no hardcoded values in T06 surface
- Allow-list matched against `req.routeOptions.url` (Fastify 4.28+) with URL pathname fallback for unmatched 404 paths — avoids prefix mismatch + query-string drift

Notes (open items / observations for PM B audit)

1. **Spec status code mismatch (`POST /me/password` wrong current)** — spec line 90 says **422 BUSINESS_RULE** for wrong current; T05's `AuthError` maps to **401** via the existing entrypoint setErrorHandler. Options:
   - (a) Leave as 401 (current impl) — semantic-aligned with auth-fail
   - (b) Introduce `BusinessRuleError extends AppError { statusCode = 422 }` in `auth.errors.ts` and throw that instead of `AuthError` for wrong-current — strict spec alignment
   - **My intent**: defer to PM B. Strict spec compliance argues (b); pragmatic semantic alignment argues (a). If PM B rules (b), small follow-up commit on this branch. Flagged here to make the divergence visible at VERDICT time.

2. **Plugin: `fastify-plugin` workaround** — Fastify encapsulates `register`-scope hooks. Without `fastify-plugin` (npm, new dep → PO needed), a registered plugin's hooks don't apply to routes registered in the parent scope. Implemented as a `register*Gate(fastify, deps)` **factory function** that calls `fastify.addHook` directly on the root instance — global hook semantic, zero new deps. File still lives under `src/plugins/` per `PROJECT_STRUCTURE.md` cross-cutting convention. ESLint clean; tests verify global behavior. PM B may want to follow up with a `fastify-plugin` dep install ask in a future cycle for stricter Fastify-idiom; for now this works.

3. **Plugin hook timing: `preHandler` not `onRequest`** — initial impl used `onRequest`, but discovered at test time that Fastify `routeOptions.url` is not yet populated AND `req.cookies` (set by @fastify/cookie's own `onRequest` hook) may race depending on hook order. Switched to `preHandler` which guarantees both signals are ready. Inline comment captures the rationale.

4. **`fastify.tokenIssuer` decorator added** — to share the JWT verifier between routes (`GET /me`) and the plugin without code duplication or constructing a fresh `FastifyJwtTokenIssuer` per request. Augmentation file extended; entrypoint decorates once at startup. Plugin/routes call `fastify.tokenIssuer.verify(token)` via the `extractJwtClaims` helper.

5. **`jest.config.json` `collectCoverageFrom` expanded** — added `src/plugins/**/*.ts` so the must-rotate gate is in the coverage report (T05 only scoped to `src/modules/auth/**`). Threshold-passing (96% stmt / 83.33% branch / 100% func / 95.83% line on plugin). Single line addition, transparent.

6. **Rate limit on `POST /me/password` deferred** — per PLAN stance #5 + ACK Standing Instructions. SECURITY.md §6 lockout policy needs DB/Redis state tracking (same pattern as login lockout, also deferred in T05). Add to cycle-4+ backlog: implement `@fastify/rate-limit` (already installed) inline at `5 fail / 15 min per user` per SECURITY.md §6 row 4 once a lockout store is wired.

7. **Pre-existing Q-B-02 workarounds reused verbatim** — jest.config.json --config flag (still no ts-node), Prisma client cast in entrypoint (still placeholder), eslint-disable on adapter import in entrypoint, inline `setErrorHandler` in entrypoint. No new workarounds introduced. No new GAPs raised.

8. **`PasswordRotationRequiredError` placement** — `src/modules/auth/auth.errors.ts` per AUX-Q1 ACK amendment. Module barrel `index.ts` does NOT re-export (internal-only — plugin is the sole consumer); change to PM B's spec.

9. **Auto-format pass** — bundled into commit 9 to keep the impl history clean. Prettier-flagged files were the plugin, plugin test, routes, service test, entrypoint, and the augmentation file (cosmetic line-wrap consolidation, no semantic change).

Requesting PM B VERDICT.

##### VERDICT T06 attempt 1 — REQUEST-FIX (spec compliance, open item #1). Other criteria met. by PM B (cycle 3, 2026-06-29)

**Outcome**: ⛔ **REQUEST-FIX**. Quality + DoD + drift + security floor all green; **single spec-compliance fix required** before APPROVE-PARTIAL: wrong-current-password must throw `BusinessRuleError` (statusCode 422, code `BUSINESS_RULE`) per `01-auth-identity §1.1` line 90, NOT `AuthError` (401) as implemented. Test file `auth.routes.test.ts:328` already flags the mismatch in its name. Single commit fix (~30-45 min); attempt 2 SUBMIT then APPROVE-PARTIAL.

---

**Independent verification (PM-AGENT §3 Step 2 — rerun on my session)**

| Check | Executor klaim | PM B independent rerun | Status |
|---|---|---|---|
| `make check` exit code | exit 0 green | rerun via `nvm use 20 && make check` → exit 0 (lint 0/0, format, typecheck, test-unit all PASS) | ✅ MATCH |
| Test counts | 73 pass + 16 todo + 2 skipped suites | identical: `Tests: 2 skipped, 16 todo, 73 passed, 91 total` | ✅ MATCH |
| Coverage (overall) | 98.73% stmt / 85% branch / 100% funcs / 99.56% lines | exact same numbers | ✅ MATCH |
| Coverage auth.errors.ts | 100% all | 100% all | ✅ MATCH |
| Coverage auth.jwt-context.ts | 100% all | 100% all | ✅ MATCH |
| Coverage auth.service.ts | 100%/95% branch (uncovered 210) | identical | ✅ MATCH (target 90% per TESTING.md §9 critical — exceeded) |
| Coverage auth.routes.ts | 100% line / 84.61% branch (uncovered 27-28) | identical | ✅ MATCH |
| Coverage auth.schema.ts | 100% all | 100% all | ✅ MATCH |
| Coverage must-rotate-password.plugin.ts | 96%/83.33% branch/95.83% line (uncovered 68) | identical | ✅ MATCH (line ≥80% floor met; uncovered 68 is the `unknown` arm of repo-lookup error in plugin — acceptable) |
| Drift scan T06 territory | zero hits | rerun → 1 false-positive only: `auth.errors.ts:2` matches `any` in comment "maps any AppError" (NOT a type annotation). Zero actual T06-attributable drift. Pre-existing `throw new Error` di Slot A territory (commit `^1e32e34`) — same as T05. | ✅ MATCH |
| argon2.verify usage | timing-safe internal at rotatePassword | confirmed `auth.service.ts:177 hasher.verify(...)` (mirrors login at line 63) | ✅ MATCH |
| `revokeAllOtherSessions` filter correctness | `id <> exceptSessionId` | confirmed `auth.repository.ts:166 id: { not: exceptSessionId }` + `revokedAt: null` + `userId` scoping — correct Prisma `not` syntax, NOT accidentally revoking current | ✅ MATCH |
| `must_rotate_password` clear atomicity | single update query | confirmed `auth.repository.ts:130-136 updateUserPassword` single `db.user.update` with `data: { passwordHash, mustRotatePassword: false }` — ATOMIC | ✅ MATCH |
| Email mask at new T06 log lines | `maskEmail()` at rotate/me lines | confirmed `auth.service.ts:180 (rotate.rejected)`, `:198 (rotate.success)`; `auth.service.ts:207 (sweep_failed, no email logged in warn — userId only)` | ✅ MATCH |
| `PasswordRotationRequiredError` content | generic, no userId/field leak | confirmed `auth.errors.ts:13-16` — class only carries `statusCode=403` + `code='PASSWORD_ROTATION_REQUIRED'`, no payload | ✅ MATCH |

**14/14 verification checks PASS independently. Zero Executor claim discrepancies on quality data.**

`make check` excerpt (PM B rerun, abbreviated):
```
> @qooma/auth-backend@0.1.0 lint    → PASS (0/0 with --max-warnings 0)
> @qooma/auth-backend@0.1.0 format:check → All matched files use Prettier
> @qooma/auth-backend@0.1.0 typecheck → tsc --noEmit clean
> @qooma/auth-backend@0.1.0 test:unit → Tests: 2 skipped, 16 todo, 73 passed, 91 total | Time: 0.798 s
```

---

**6 Design Decision rulings — ALL ACCEPT**

| DD | Topic | PM B ruling | Rationale + verification |
|---|---|---|---|
| **DD1** | Plugin = factory setup function (NOT `FastifyPluginCallback` via `register()`) | ✅ **ACCEPT** | Plugin file lines 8-13 explain Fastify encapsulation: `register()` scopes hooks to its sub-instance unless `fastify-plugin` (npm) breaks encapsulation. Without that dep, factory `addHook` on root instance is the documented Fastify-4 workaround for global hooks. Zero new deps. Sound. Plugin tests confirm global-hook semantic. **Follow-up**: log `fastify-plugin` install as cycle-4+ backlog (see Open Item #2). |
| **DD2** | `preHandler` hook (NOT `onRequest`) | ✅ **ACCEPT** | Plugin lines 39-41 explain: `preHandler` is the earliest hook where both `req.routerPath` (route matched, allow-list comparable) AND `req.cookies` (parsed by `@fastify/cookie`) are populated. `onRequest` fires too early → `req.routerPath` undefined + cookies stale. Correct choice. |
| **DD3** | `fastify.tokenIssuer` decorator added | ✅ **ACCEPT** | Verified at `entrypoints/api.ts:74-78`: `const tokenIssuer = new FastifyJwtTokenIssuer(fastify); fastify.decorate('tokenIssuer', tokenIssuer);`. Type augmentation at `src/shared/types/fastify-augmentation.ts:16 tokenIssuer: TokenIssuer`. Avoids per-request construction; shared between routes + plugin via `extractJwtClaims(fastify.tokenIssuer, token)`. Sound DI; no global mutation issue. |
| **DD4** | `jest.config.json` `collectCoverageFrom` expanded for plugins | ✅ **ACCEPT** | Additive change only; ensures `src/plugins/must-rotate-password.plugin.ts` appears in coverage report (proof: shows 96/83.33/100/95.83 in PM B rerun output). |
| **DD5** | AUX-Q1 amendment honored: `PasswordRotationRequiredError` in `auth.errors.ts`, NOT re-exported in barrel | ✅ **ACCEPT** | Verified `auth.errors.ts:13-16` (class def) + `index.ts` (no `auth.errors` re-export — internal-only consumer is the plugin). Module-scoped encapsulation per PM B ACK ruling. |
| **DD6** | AUX-Q2 as-proposed: `auth.jwt-context.ts` shared, takes `TokenIssuer` interface | ✅ **ACCEPT** | Verified `auth.jwt-context.ts:14-21` — `extractJwtClaims(tokenIssuer: TokenIssuer, token: string \| null \| undefined): JwtClaims` signature; pure function, no port, `TODO(T11)` marker at line 5-7 keeps refactor surface visible. Single source of truth across routes + plugin. |

**All 6 DDs ACCEPT. No rework required for design.**

---

**3 Open Item rulings**

- ⛔ **Open Item #1 — Spec status code mismatch (422 vs 401 for wrong current password)** → **REQUEST-FIX before APPROVE-PARTIAL**

  **Current state**: `auth.service.ts:184` throws `new AuthError('Invalid current password')` → AppError hierarchy maps `AuthError → statusCode 401, code 'AUTH_ERROR'`. Test at `auth.routes.test.ts:328` expects 401 with name `'should return 401 AUTH_ERROR (422 BUSINESS_RULE in spec) when service throws on wrong current'` — Executor already flagged the spec mismatch in the test name itself.

  **Spec**: `docs/spec/01-auth-identity.md §1.1` line 90 — "`422 BUSINESS_RULE` if current password wrong"

  **Rationale for REQUEST-FIX (not waive)**:
  1. Spec is canonical implementation source. 422 ≠ 401 semantically: 401 = "not authenticated"; 422 = "authenticated but business rule violation". Wrong-current happens AFTER JWT-cookie auth succeeds → 422 is correct.
  2. Downstream FE / sibling services may route on status code — incorrect 401 will misroute to login redirect instead of "wrong current password" UX flow.
  3. Single clean fix, ~30-45 min, low blast radius (1 service line + 1-2 test assertion updates). Easier to land now than retrofit later.

  **Required fix scope**:
  1. **CREATE** `BusinessRuleError extends AppError { statusCode = 422; code = 'BUSINESS_RULE'; }` in `src/modules/auth/auth.errors.ts` (next to existing `PasswordRotationRequiredError`)
  2. **EDIT** `src/modules/auth/auth.service.ts:184` — replace `throw new AuthError('Invalid current password')` with `throw new BusinessRuleError('Invalid current password')`. Update import.
  3. **EDIT** `src/modules/auth/__tests__/auth.service.test.ts:388-391` — change `rejects.toThrow(AuthError)` to `rejects.toThrow(BusinessRuleError)`; update mocks/imports
  4. **EDIT** `src/modules/auth/__tests__/auth.routes.test.ts:327-345` — change test name (drop "in spec" qualifier); change mock to `mockRejectedValue(new BusinessRuleError(...))`; change `expect(res.statusCode).toBe(401)` → `toBe(422)`; change error code expectation `'AUTH_ERROR'` → `'BUSINESS_RULE'`
  5. Re-run `make check` + coverage; confirm still green + coverage holds (`BusinessRuleError` should land in `auth.errors.ts` coverage — already 100%)
  6. Optional: leave `PasswordRotationRequiredError` placement unchanged (still NOT re-exported via barrel — same pattern)

  **Estimate**: 30-45 min impl + test update. Single commit on `feat/auth-core` (atop current `6dbde31`):
  ```
  fix(auth): use BusinessRuleError 422 for wrong-current-password per spec §1.1
  ```

- 📋 **Open Item #2 — `fastify-plugin` dep follow-up** → **DEFER as cycle-4+ backlog**

  Factory workaround works correctly per Executor's plugin tests (96/95.83/100/83.33 coverage, behavior verified). Adding `fastify-plugin` as dep is a package install → would require PO ask (Q-B-XX). Not blocking T06 functionality.

  **Action**: log di **§8 Slot B queue → Future-cycle backlog block** (added to existing future-cycle list alongside rate-limit defer). No PO escalation now. **Candidate task**: T_AUX_02 "Adopt `fastify-plugin` for canonical plugin shape — covers T06 must-rotate-password + T11 tenant-guard" — to be authored when T11 design comes up next cycle.

- 📋 **Open Item #3 — Rate-limit deferred** → **CONFIRMED already-deferred per PLAN stance #5 + ACK Standing Instructions**

  No further action needed for VERDICT. Already documented as cycle-4+ backlog. Pairs with T05 login rate-limit deferral (both need DB/Redis lockout state machine). Single follow-up task can cover both.

---

**Conditions for REQUEST-FIX → APPROVE-PARTIAL upgrade**

T06 stays **REQUEST-FIX** until ALL of:
1. Executor B push fix commit on `feat/auth-core` (atop `6dbde31`) implementing Open Item #1 required scope
2. `make check` green post-fix (lint + format + typecheck + test-unit) — PM B will independently rerun
3. Drift scan stays zero on T06 files
4. Coverage stays ≥80% line (target 90% on service/routes/schema/plugin); `BusinessRuleError` should be 100% covered like `PasswordRotationRequiredError`
5. Executor B post **`SUBMIT T06 attempt 2`** sub-block on `main` (PM-STATUS-B.md §2 append, per §7 branch hygiene) — concise delta-only format: what changed in attempt 2 + new test evidence + re-rerun `make check` excerpt
6. PM B re-verify attempt 2 → issue **APPROVE-PARTIAL** sub-block (full APPROVE still deferred until T02 ships, same as T05)

**Branch `feat/auth-core` stays open** — no merge to `main` until T05+T06 both reach full APPROVE post-T02.

---

**Workflow for Executor B (cycle 3 continuation)**:

1. `git checkout feat/auth-core` (still on branch from current impl session — already there)
2. Implement fix per Open Item #1 required scope (5 sub-steps)
3. `make check` green
4. Commit + push: `fix(auth): use BusinessRuleError 422 for wrong-current-password per spec §1.1`
5. `git checkout main` per §7 branch hygiene
6. Post `#### SUBMIT T06 — exec-B (Nanak) at cycle 3 (2026-06-29) attempt 2` sub-block in PM-STATUS-B.md §2 (append below this VERDICT, **append-only**); format: concise delta-only (what changed since attempt 1 + green `make check` excerpt + coverage row for `BusinessRuleError`)
7. Commit + push to main: `exec B: SUBMIT T06 attempt 2 — BusinessRuleError 422 fix per VERDICT`
8. PM B re-engage → verify + APPROVE-PARTIAL

---

**Roll-up + cross-references**:
- `PM-STATUS-B.md §1` task tracker row T06 → status flag flipped to `assigned · REQUEST-FIX attempt 1 (spec compliance pending)`
- `PM-STATUS-B.md §8` future-cycle backlog → append `fastify-plugin install` follow-up next to existing rate-limit deferral
- `PM-STATUS-PARENT.md §2` short roll-up appended (per `PM-AGENT §0.8` REQUEST-FIX entry — using ESCALATE-style line since this is also a state-of-affairs change)

PM B exits to **wait-mode for SUBMIT T06 attempt 2**.

#### SUBMIT T06 — exec-B (Nanak) at cycle 3 (2026-06-29) attempt 2 — fix-only delta

**Resolution**: VERDICT attempt 1 Open Item #1 (spec 422 BUSINESS_RULE vs impl 401 AuthError on wrong-current-password) applied per required scope. Single commit. No new GAPs, no new DDs, no new workarounds.

**Fix commit**: `e753b38` on `feat/auth-core` (atop `6dbde31`).
```
fix(auth): use BusinessRuleError 422 for wrong-current-password per spec §1.1
```

**Branch state**: `feat/auth-core` force-pushed (rebase atop latest main brought in VERDICT context; `--force-with-lease` used). 20 commits ahead of main total (10 T05 + 10 T06).

**Files changed in attempt 2**: **4** (all EDIT)

```
M  src/modules/auth/auth.errors.ts                            +12 / -0  (add BusinessRuleError class)
M  src/modules/auth/auth.service.ts                            +5 / -1  (import + swap AuthError → BusinessRuleError + inline rationale comment)
M  src/modules/auth/__tests__/auth.service.test.ts             +4 / -3  (import + test name updated + assertion to BusinessRuleError)
M  src/modules/auth/__tests__/auth.routes.test.ts              +4 / -3  (import + test name updated + status 401 → 422 + code AUTH_ERROR → BUSINESS_RULE)
```

**LOC delta vs attempt 1**: `+25 / -7` (within `+~20 / -~5` estimate)

**Per VERDICT required scope (lines 1373-1379)**:

- [x] **CREATE** `BusinessRuleError extends AppError { statusCode = 422; code = 'BUSINESS_RULE'; }` in `auth.errors.ts` next to `PasswordRotationRequiredError` ✓
- [x] **EDIT** `auth.service.ts:184` — swap to `throw new BusinessRuleError('Invalid current password')`; import updated; inline rationale comment added ✓
- [x] **EDIT** `auth.service.test.ts:383` — assertion `rejects.toThrow(BusinessRuleError)`; test name dropped "AuthError" qualifier, now reads `'should throw BusinessRuleError (422) when current password verify fails per spec §1.1'` ✓
- [x] **EDIT** `auth.routes.test.ts:327` — mock now rejects with `BusinessRuleError`; status assertion `422`; error code assertion `'BUSINESS_RULE'`; test name updated to drop "in spec" qualifier (now: `'should return 422 BUSINESS_RULE when service throws BusinessRuleError on wrong current (spec §1.1)'`) ✓
- [x] `make check` + coverage re-run; both green (see below) ✓
- [x] `PasswordRotationRequiredError` placement unchanged; barrel still does NOT re-export either error class (same DD5 pattern) ✓

**Quality gate (post-fix)**:

- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings; auto-fix applied import-order shuffle on attempt-1 + 2 commits)
- `make format-check`: **PASS**
- `make test-unit`: **PASS** — 73 passed + 16 todo + 2 skipped suites (count UNCHANGED from attempt 1)
- `make check` exit 0 confirmed

**Test evidence (delta)**:

```
Test Suites: 2 skipped, 7 passed, 7 of 9 total
Tests:       2 skipped, 16 todo, 73 passed, 91 total   ← UNCHANGED count (no test added/removed; 2 assertions updated)
Time:        ~0.9s
```

**Coverage (delta)**:

```
File                             | % Stmts | % Branch | % Funcs | % Lines
---------------------------------|---------|----------|---------|---------
All files                        |   98.76 |       85 |     100 |   99.57   ← was 98.73 / 85 / 100 / 99.56 (BusinessRuleError adds 1 stmt, covered)
 modules/auth/auth.errors.ts     |     100 |      100 |     100 |     100   ← BusinessRuleError class 100% covered via service+routes wrong-current tests
 modules/auth/auth.service.ts    |     100 |       95 |     100 |     100   ← UNCHANGED
 modules/auth/auth.routes.ts     |     100 |    84.61 |     100 |     100   ← UNCHANGED
 plugins/must-rotate-password    |      96 |    83.33 |     100 |   95.83   ← UNCHANGED
```

All per-file targets STILL met (critical ≥90% line; floor ≥80% — every T06 file at 100% line except plugin at 95.83%). Global thresholds met.

**Drift scans (T06 fix files)**:

```
$ grep -rnE "(: any[^a-z]| any[^a-z_])|console\.(log|info)|@ts-ignore|@ts-nocheck|throw new Error\(|export default" src/modules/auth/auth.errors.ts src/modules/auth/auth.service.ts src/modules/auth/__tests__/auth.service.test.ts src/modules/auth/__tests__/auth.routes.test.ts
   (zero hits — sole grep match was a false-positive in auth.errors.ts:2 comment "any AppError" which is documentation prose, not code drift)
```

**14-row verify table from attempt 1**: still applicable. **Row #1 (spec status code semantic) now FLIPS from ⛔ → ✅** — spec §1.1 line 90 now matches impl: wrong-current returns 422 with code `BUSINESS_RULE`. All other 13 rows unchanged.

**6 design decisions from attempt 1**: unchanged. No new DDs at code-time for this fix (single-target swap; no new architectural choice).

**3 Open items**:
- **#1 — Spec status code 422** → ✅ **RESOLVED** (REQUEST-FIX applied)
- **#2 — `fastify-plugin` dep follow-up** → 📋 **DEFER as cycle-4+ backlog** (unchanged; ACK ruling stands)
- **#3 — Rate-limit deferred** → 📋 **CONFIRMED-DEFERRED** (unchanged; pairs with T05 login lockout)

**Pre-existing Q-B-02 workarounds reused verbatim** — no new workarounds, no new GAPs, no new package install asks.

Requesting PM B VERDICT (expected: APPROVE-PARTIAL).

##### VERDICT T06 attempt 2 — APPROVE-PARTIAL (cycle 3 close; full APPROVE held for T02 ship) by PM B (cycle 3, 2026-06-29)

**Outcome**: ✅ **APPROVE-PARTIAL**. Fix delta clean (1 class + 1 service line + 2 test files); 14/14 quality verifications match attempt 2; row #1 spec-compliance flipped from ⛔ → ✅. T06 unit-scope complete for cycle 3. Full APPROVE held alongside T05 until T02 ships (Slot A foundation unparks).

---

**Independent verification (PM-AGENT §3 Step 2 — re-run lighter on fix delta)**

| Check | Executor klaim | PM B independent rerun | Status |
|---|---|---|---|
| `make check` exit code | exit 0 green | rerun via `nvm use 20 && make check` → exit 0 (lint 0/0, format, typecheck, test-unit all PASS) | ✅ MATCH |
| Test counts (unchanged from attempt 1) | 73 pass + 16 todo + 2 skipped | identical: `Tests: 2 skipped, 16 todo, 73 passed, 91 total` | ✅ MATCH |
| Coverage overall line | 99.57% (slight bump from 99.56% attempt 1) | exact: 98.76% stmt / 85% branch / 100% funcs / **99.57%** lines | ✅ MATCH |
| `auth.errors.ts` coverage post-fix | 100% all (BusinessRuleError exercised by existing wrong-current test) | confirmed: 100/100/100/100 | ✅ MATCH |
| `auth.service.ts` coverage | 100% line / 95% branch (uncovered line shift 210→214 from new throw + import) | confirmed: 100/95/100/100 uncovered line 214 | ✅ MATCH |
| `BusinessRuleError` class definition | `extends AppError; statusCode=422; code='BUSINESS_RULE'` | confirmed `auth.errors.ts:18-21` (3-line class, inherits AppError abstract; no constructor override needed) | ✅ MATCH |
| Barrel re-export check (DD5 consistency) | NOT re-exported in `index.ts` | confirmed: `grep "BusinessRuleError\|auth.errors" src/modules/auth/index.ts` → ZERO hits | ✅ MATCH (internal-only pattern preserved) |
| Service swap target | line ~184/188 swap `AuthError` → `BusinessRuleError` for wrong-current-password | confirmed `auth.service.ts:188 throw new BusinessRuleError('Invalid current password')` + import added line 12 | ✅ MATCH |
| AuthError preserved elsewhere | other auth paths (login wrong-cred, refresh paths, missing token) unchanged | confirmed `auth.service.ts` still uses AuthError at lines 61, 71, 116, 121, 126, 156, 175 (login/refresh paths — correct semantics: 401 = not authenticated) | ✅ MATCH |
| Test assertion update — service test | `BusinessRuleError` expected | confirmed `auth.service.test.ts:9 import` + `:384 test name 'should throw BusinessRuleError (422) when current password verify fails per spec §1.1'` + `:391 rejects.toThrow(BusinessRuleError)` | ✅ MATCH |
| Test assertion update — routes test | status 422 + code 'BUSINESS_RULE' | confirmed `auth.routes.test.ts:8 import` + `:328 test name '422 BUSINESS_RULE when service throws BusinessRuleError on wrong current (spec §1.1)'` + `:331 mockRejectedValue(new BusinessRuleError(...))` + `:341 expect(res.statusCode).toBe(422)` + `:342 error.code = 'BUSINESS_RULE'` | ✅ MATCH |
| Old 401/AUTH_ERROR assertions on wrong-current REMOVED | zero hits expected | confirmed `grep -nE "401.*[Cc]urrent\|AUTH_ERROR.*[Cc]urrent\|[Cc]urrent.*401\|[Cc]urrent.*AUTH_ERROR" auth.routes.test.ts auth.service.test.ts` → ZERO hits | ✅ MATCH |
| Drift scan fix files | zero hits | same 1 false-positive (`auth.errors.ts:2 // any AppError` comment prose, NOT type annotation). Zero actual drift. | ✅ MATCH |
| Row #1 flip status from attempt 1 | ⛔ → ✅ | spec compliance confirmed (422 BUSINESS_RULE per `01-auth-identity §1.1` line 90) | ✅ FLIPPED |

`make check` excerpt (PM B rerun, abbreviated):
```
> @qooma/auth-backend@0.1.0 lint    → PASS (0/0 with --max-warnings 0)
> @qooma/auth-backend@0.1.0 format:check → All matched files use Prettier
> @qooma/auth-backend@0.1.0 typecheck → tsc --noEmit clean
> @qooma/auth-backend@0.1.0 test:unit → Tests: 2 skipped, 16 todo, 73 passed, 91 total | Time: 0.762 s
```

**14/14 verification checks PASS independently on attempt 2. Row #1 flipped from ⛔ REQUEST-FIX to ✅ RESOLVED.**

---

**6 Design Decision rulings — UNCHANGED from attempt 1 (all ACCEPT)**

No new code-time design decisions emerged from the fix (single-target swap of AuthError → BusinessRuleError; new error class follows the established `PasswordRotationRequiredError` pattern in `auth.errors.ts`). DDs 1-6 (plugin factory shape, preHandler hook, tokenIssuer decorator, jest collectCoverageFrom expansion, AUX-Q1 module-scoped errors home, AUX-Q2 shared jwt-context helper) all stand as-ruled.

---

**3 Open Item rulings — closed/deferred**

| # | Topic | Final ruling |
|---|---|---|
| **#1** | Spec status code 422 vs 401 (wrong-current-password) | ✅ **RESOLVED** — REQUEST-FIX applied per attempt 1 VERDICT; `BusinessRuleError 422` lands cleanly with 1 class + 1 service line + 2 test file updates. Coverage holds. |
| **#2** | `fastify-plugin` dep follow-up | 📋 **DEFER** — cycle-4+ backlog `T_AUX_02` (paired with T11 plugin design next cycle). Logged at `PM-STATUS-B.md §8 future-cycle backlog`. No PO action. |
| **#3** | Rate-limit lockout (T05 + T06 shared deferral) | 📋 **CONFIRMED-DEFERRED** — cycle-4+ backlog `T_AUX_01`. Needs Redis lockout state machine; pairs with T05 login rate-limit. No PO action. |

---

**Conditions for APPROVE-PARTIAL → FULL APPROVE upgrade (batch with T05)**

Both T05 and T06 stay APPROVE-PARTIAL until ALL of:
1. Slot A T02 (initial Prisma migration) APPROVED + `prisma migrate dev` applied locally
2. Executor B re-opens BOTH `auth.repository.integration.test.ts` placeholders (T05 had 10 `it.todo` + T06 added 5 = 15 total to fill in with testcontainers Postgres assertions per `docs/TESTING.md §5`)
3. PM B re-validate full integration suite green + repo coverage ≥ 80% line per TESTING.md §9
4. Drift re-scan clean across `auth.repository.ts` (now extended with T06's `findUserById`/`updateUserPassword`/`updateUserLanguage`/`rotateCsrfToken`/`revokeAllOtherSessions` methods)
5. Re-issue VERDICT as **`APPROVE (full)`** — single block covering both T05 and T06 batch
6. Branch `feat/auth-core` then merges to `main` (no merge until full APPROVE)

---

**Cycle 3 close — sequence next**

Per ASSIGNMENT T05/T06 + PARENT §10 cycle-1 sequence: **T05 → T06 → T11 → T07**.

- T05: APPROVE-PARTIAL (cycle 2 close) ✓
- T06: APPROVE-PARTIAL (cycle 3 close) ✓ — this VERDICT
- **T11**: tenant-guard middleware — Slot A canonical, Slot B execution per `PARENT §4-D01` deviation; status `READY-FULL` per PARENT §1; **CYCLE 4 PICKUP**
- T07: per-hotel users CRUD — gated by T11 ship; CYCLE 5 PICKUP

**Executor B**: clear to pick T11 in cycle 4. PM B akan author ASSIGNMENT T11 (cycle 4 opening) — either same session continuation OR fresh cycle window (see PM B recommendation in brief).

**Branch `feat/auth-core` stays open** — no merge to `main` until T02 lands and T05+T06+T11 batch reach full APPROVE.

---

**Roll-up + cross-references**:
- `PM-STATUS-B.md §1` task tracker row T06 → status flag `approved-partial · cycle 3 close · full APPROVE held (T02)`
- `PM-STATUS-B.md §0` current focus → next focus T11 cycle 4 (cross-slot per §4-D01)
- `PM-STATUS-PARENT.md §2` short roll-up appended (per `PM-AGENT §0.8` APPROVE entry format)

PM B exits to **wait-mode for cycle-4 opening**: either (a) PM B authors ASSIGNMENT T11 sub-block (after PM/user signal), or (b) Slot A unparks + T02 lands → PM B re-opens T05+T06 batch for PARTIAL→FULL upgrade cycle (whichever first).

### ASSIGNMENT T11 — claimed by exec-B (Nanak) cycle 4 (2026-06-29). CROSS-SLOT execution per PARENT §4-D01 (Slot A canonical ownership of record; Slot B execution one-off for single-dev cycle). EVERY commit body MUST reference §4-D01.

- **Spec row pointer**: `docs/spec/01-auth-identity.md §6` (tenant-guard pseudocode) + `docs/spec/MVP-AUTH-FIRST.md §4.1` (critical-correctness: tenant isolation must not fail-open) + `PM-STATUS-PARENT.md §1` T11 row + `PARENT §8` T11 DoD detail (lines 354-411)
- **Routed from**: PARENT §1 T11 row + **PARENT §4-D01 deviation** (cross-slot execution deviation, ratified PO 2026-06-29)
- **Branch**: `feat/auth-core` (continues from T05 + T06; T11 stacks on top — same branch per §7 hygiene)
- **Status flag**: `READY-FULL (Slot B execution per §4-D01, cycle 4 single-dev)`
- **Gate target**: G2 (modul auth gate — T05 + T06 + T11 collectively close)
- **Resolves**: Q-PARENT-01 (per PARENT §3c — final implementation lands here)

#### Cross-slot heritage (audit trail — WAJIB di setiap commit + SUBMIT/VERDICT)

- **Canonical owner of record**: Slot A (Nathan) per `docs/SERVICE-CHARTER.md §3` (`core/` + plugins boundary in Slot A foundation territory)
- **Execution this cycle**: Slot B (Nanak) one-off, per `PARENT §4-D01` deviation
- **Reason for deviation**: cycle-1 single-dev constraint — Slot A `PARKED · unowned-this-cycle`; T07 (next in sequence after T11) soft-blocks without tenant-guard. PO ratified 2026-06-29.
- **Commit message pattern (WAJIB for every T11 commit)**:
  ```
  feat(plugins): <subject — short>

  Cross-slot execution per §4-D01 (Slot A canonical territory).
  ```
- **SUBMIT block WAJIB header note**: "Cross-slot execution per §4-D01"
- **PM B VERDICT block WAJIB header note**: same — "cross-slot heritage"
- **Future amendment audit trail**: when Slot A onboards (next cycle or later), this ASSIGNMENT block + §4-D01 deviation row + final SUBMIT/VERDICT are the canonical handoff record. Slot A re-takes future tenant-guard amendments (per `PARENT §4-D01` last sentence).

#### PM B notes — Scope this cycle (unit-only — integration deferred until T02)

**In scope this submission**:
1. **`src/plugins/tenant-guard.ts`** Fastify plugin — factory function pattern (per T06 DD1 precedent: `registerTenantGuard(fastify, deps)`, no `register()`, no new `fastify-plugin` dep). Lives at `src/plugins/` per `PROJECT_STRUCTURE.md` cross-cutting convention (sibling: `must-rotate-password.plugin.ts`).
2. **Hook**: `preHandler` global hook on root instance (same shape as T06 plugin — earliest hook with both `req.routerPath` + `req.cookies` populated).
3. **Behavior per spec `01-auth-identity §6` pseudocode**:
   - Read access cookie → use existing `extractJwtClaims(fastify.tokenIssuer, cookie)` from `src/modules/auth/auth.jwt-context.ts` (DO NOT duplicate — reuse helper that has TODO(T11) marker explicitly pointing here)
   - Set `req.session = { userId, role, hotelId, deptId }` per spec line 376 (note: spec uses `user_id`/`hotel_id` snake_case; impl convention is camelCase — match T05/T06 type style)
   - Set `req.tenantScope`:
     - `super_admin` → `{ type: 'all-hotels' }` (bypass downstream `WHERE hotel_id = ...` filters)
     - else → `{ type: 'single-hotel', hotelId: session.hotelId }`
   - Decorate Fastify types via `src/shared/types/fastify-augmentation.ts` (additive — add `session?: SessionContext` + `tenantScope?: TenantScope` to FastifyRequest)
4. **Deny semantics (PM B ruling)** — delegate auth failure to existing layers per T06 precedent:
   - **Missing cookie**: skip plugin (let downstream route handler / @fastify/jwt produce its own 401)
   - **Invalid/expired JWT**: catch `AuthError` from `extractJwtClaims`, skip plugin (let downstream produce 401)
   - **JWT valid but missing `hotelId` claim AND role !== `super_admin`**: throw `TenantScopeViolationError` (NEW AppError subclass in `src/modules/auth/auth.errors.ts`, statusCode TBD per Open Item #2)
   - **Cross-tenant URL param mismatch** (e.g. `req.params.hotelId !== claims.hotelId` for non-super_admin): throw same `TenantScopeViolationError`
   - **No throw on super_admin** — bypass scope check (still sets `req.session` + `req.tenantScope = { type: 'all-hotels' }`)
   - **Fail-closed**: any uncaught error in plugin → bubble up to setErrorHandler (NEVER swallow + continue — `MVP-AUTH-FIRST §4.1` mandate)

   **PM B note**: PARENT §8 T11 row line 374 says deny-by-default → "401 UNAUTHENTICATED" from the plugin itself. PM B amending per T06 precedent: plugin delegates 401 to upstream auth layers (cleaner separation; tenant-guard's role is ONLY tenant-scope enforcement, not authentication). The 401 path still works end-to-end via `@fastify/jwt` + handler. If Executor disagrees → rebut di PLAN dengan rationale.
5. **Allowlist mechanism** — public/auth endpoints bypass tenant-guard entirely. 3 options listed in Open Items below; Executor pick + justify di PLAN.
6. **Types**: extend `src/shared/types/fastify-augmentation.ts` (additive) with `Session` + `TenantScope` types. Lives there per `PROJECT_STRUCTURE.md` (shared cross-cutting types).
7. **Unit tests** — 4-role coverage minimum + allowlist + missing claims + cross-tenant + super_admin bypass. Pattern reuse T06 plugin test fixture (Fastify app fixture + inject).
8. **Integration test placeholder** — 3+ `it.todo()` entries gated on T02.
9. **TODO marker for fastify-plugin canonical refactor** — when `T_AUX_02` lands (cycle-4+ backlog), refactor both T06 must-rotate-password + T11 tenant-guard simultaneously to `FastifyPluginCallback` wrapped with `fp()`. Comment marker in plugin header.

**Explicitly OUT-of-scope this cycle**:
- **Wiring tenant-guard to existing T05/T06 routes** — separate task. T05 (login/logout/refresh) + T06 (`/me` family) are mostly public OR self-targeted (auth via cookie, no cross-tenant resource access). T07 (`/api/users`) is the first true consumer — wire there.
- **`src/entrypoints/api.ts` wire-up of tenant-guard plugin** — defer to T07 (when first scoped route lands). T11 ships plugin authored + tested only, NOT yet registered. Avoids accidentally tripping T05/T06 routes which weren't designed for guard yet. **Executor: confirm `api.ts` is NOT modified in T11 PLAN; if you disagree (e.g. plugin must be registered to typecheck), raise as GAP.**
- **Multi-tenant DB query helper** — `req.tenantScope` is the contract surface; per-module repos consume it. NOT T11 work.
- **`super_admin` role definition / RBAC matrix** — assume `Role` type literal in `auth.types.ts` already includes `'super_admin'` (verified by PM B: line 1 of `auth.types.ts` on branch).
- **`request.session.user` full user object** — PARENT §8 says spec §6 sets `req.session = { user_id, role, hotel_id, dept_id }` (claims-derived, NOT full DB lookup). Plugin sets claims-shape only; if downstream needs full user, do separate `repo.findUserById(req.session.userId)` per request. **PM B ruling: claims-only `req.session` for T11.** T06 plugin's TODO(T11) marker about "request.session.user" will get a follow-up update at T07-time (when full-user lookup is actually needed).
- **Integration test full implementation** — same deferral as T05/T06; 3+ `it.todo()` placeholders only.

#### PM B notes — DoD this submission (15 items)

- [ ] **Plugin file CREATE** `src/plugins/tenant-guard.ts` — factory function `registerTenantGuard(fastify, deps?)` per T06 DD1 precedent (no `register()`, no new dep)
- [ ] Plugin uses **`preHandler` hook** on root instance (matches T06 pattern; earliest hook with `req.routerPath` + cookies)
- [ ] **JWT context reuse** — import `extractJwtClaims` from `@modules/auth/auth.jwt-context.js`; do NOT duplicate verify logic
- [ ] **Allowlist mechanism** implemented per Executor PLAN decision (Open Item #1)
- [ ] **Deny-by-default**: cross-tenant access AND missing-hotelId-claim → reject with `TenantScopeViolationError` (NEW AppError subclass) per Executor PLAN decision (Open Item #2 status code)
- [ ] **Cross-tenant resource access reject**: `req.params.hotelId !== claims.hotelId` for non-super_admin → reject (per Executor PLAN decision Open Item #4 extraction strategy)
- [ ] **`super_admin` bypass** implemented per Executor PLAN decision (Open Item #3 global vs per-route)
- [ ] **`req.session` populated** with `{ userId, role, hotelId, deptId }` (claims-derived) per `01-auth-identity §6` pseudocode line 376 (camelCase match T05/T06 types)
- [ ] **`req.tenantScope` populated**: `super_admin` → `{ type: 'all-hotels' }`, else → `{ type: 'single-hotel', hotelId }`
- [ ] **Types extension** `src/shared/types/fastify-augmentation.ts` — additive `Session` + `TenantScope` types (do NOT touch existing `tokenIssuer` augmentation)
- [ ] **NEW AppError subclass** `TenantScopeViolationError` in `src/modules/auth/auth.errors.ts` (next to `PasswordRotationRequiredError` + `BusinessRuleError`) — statusCode per Open Item #2 ruling; **NOT** re-exported via barrel `index.ts` (consistent DD5 pattern from T06)
- [ ] **Unit test file CREATE** `src/modules/auth/__tests__/tenant-guard.plugin.test.ts` (place in auth `__tests__/` per T06 precedent — keeps plugin tests near auth context; **Executor justify di PLAN if path differs**). Coverage:
  - super_admin → bypass scope, sets `{ type: 'all-hotels' }`, no throw
  - gm_admin same-hotel allow → sets `{ type: 'single-hotel', hotelId }`, no throw
  - gm_admin cross-hotel deny (URL param mismatch) → throw `TenantScopeViolationError`
  - dept_head + staff same patterns as gm_admin (parametric reuse OK)
  - unauthenticated (missing cookie) → no throw, skip (delegate to downstream 401)
  - invalid JWT → no throw, skip (delegate to downstream 401)
  - JWT valid but `hotelId === null` AND role !== `super_admin` → throw
  - allowlist path → no throw, skip entirely (no session/tenantScope set)
- [ ] **Integration placeholder** `src/modules/auth/__tests__/tenant-guard.plugin.integration.test.ts` (parallel-path naming) — 3+ `it.todo()` entries referencing T02 dependency
- [ ] **Coverage ≥ 80% line** for added files; target ≥ 90% for the plugin (critical security surface per TESTING.md §9)
- [ ] **`make check` green** (lint + format-check + typecheck + test-unit; NOT test-integration this cycle)
- [ ] **Drift floor zero hits** scoped to T11 territory (per `PM-AGENT §3 Step 2`): no `any` / `console.log` / `@ts-ignore` / `throw new Error(`-in-service / default export / forbidden imports / `.skip` / hardcoded URL / `setTimeout()` / wrap-Prisma interface
- [ ] **Security floor** (CLAUDE.md §6 + MVP-AUTH-FIRST §4.1):
  - **Fail-closed**: NO code path silently sets `tenantScope` for unauthenticated/invalid-claim cases. Verify with explicit negative test (mock JWT throw → assert `tenantScope` undefined).
  - No JWT secret in error response (`TenantScopeViolationError` payload generic)
  - **Status code consistency**: chosen status (403 OR 404 per Open Item #2) MUST be same across all deny cases (no enumeration via diff between "wrong hotel" vs "no hotel claim")
  - Logging: deny events logged at `warn` with `correlationId`, `role`, `userId` (masked or hashed — Open Item #5), requested vs claim `hotelId`, path, method. JANGAN log raw token. Per CLAUDE.md §7.

#### PM B notes — File ownership

**CREATE** (3 new files):
```
src/plugins/tenant-guard.ts                                         NEW (factory plugin)
src/modules/auth/__tests__/tenant-guard.plugin.test.ts              NEW (unit tests — auth tests dir per T06 precedent; Executor confirm di PLAN)
src/modules/auth/__tests__/tenant-guard.plugin.integration.test.ts  NEW (placeholder it.todo entries, T02-gated)
```

**EDIT** (2 files, additive only):
```
src/modules/auth/auth.errors.ts                              EXTEND: add TenantScopeViolationError class (no constructor override needed; mirrors BusinessRuleError pattern)
src/shared/types/fastify-augmentation.ts                     EXTEND: add Session + TenantScope types + FastifyRequest module augmentation
```

**NO TOUCH ZONES**:
- `src/entrypoints/api.ts` — plugin authored + tested only; wiring deferred to T07 (per OUT-of-scope). If Executor finds typecheck forces this touch, raise as GAP, do NOT modify unilaterally.
- `src/modules/auth/auth.jwt-context.ts` — reuse existing `extractJwtClaims` verbatim; NO signature change. (TODO(T11) marker in the file is documentary, not a refactor instruction — refactor happens at T07 / T_AUX_02 time.)
- `src/modules/auth/index.ts` — `TenantScopeViolationError` follows DD5 pattern (internal-only, NOT re-exported via barrel).
- `prisma/schema.prisma` — no schema change.
- `package.json` / `pnpm-lock.yaml` — NO new package install. `fastify-plugin` deferred to `T_AUX_02` cycle-4+ backlog.
- Q-B-02 foundation gaps still parked — reuse T05/T06 workarounds; do not re-fight.

**File count**: **3 CREATE / 2 EDIT** baseline. If Executor adopts a different test-dir path (e.g. `src/plugins/__tests__/`) → still 3 CREATE / 2 EDIT, just different location.

#### PM B notes — Parent doc refs (WAJIB baca executor sebelum PLAN)

- **`docs/spec/01-auth-identity.md §6`** — tenant-guard pseudocode (canonical implementation reference: `req.session` + `req.tenantScope` shape)
- **`docs/spec/MVP-AUTH-FIRST.md §4.1`** — critical-correctness: tenant isolation must not fail-open
- **`docs/SERVICE-CHARTER.md §3`** — slot ownership matrix (cross-slot context for §4-D01)
- **`docs/decisions/0001-hexagonal-disiplin.md`** — middleware is NOT a port (factory function is correct shape)
- **`docs/decisions/0008-repo-scope-auth.md`** — multi-hotel scoping intent; `hotel_id` semantics post-H11
- **`CLAUDE.md §4`** (Hexagonal Disiplin) + `§5` (TS strict + naming + AppError hierarchy) + `§6` (security WAJIB — fail-closed) + `§7` (logging requirements: correlationId + structured fields + no PII leak) + `§8` (testing 80% floor)
- **`docs/SECURITY.md §2`** (auth) + `§3` (encryption) + `§5` (PII masking) + threat model: tenant cross-contamination is high-impact
- **`docs/TESTING.md §4`** (unit pattern with Fastify `inject()` — reuse T06 plugin test fixture pattern) + `§9` (coverage targets)
- **`PARENT §4-D01`** — cross-slot deviation context (cite verbatim in commits)
- **`PARENT §8` T11 row (lines 354-411)** — Parent PM-authored DoD detail (PM B amended per T06 precedent: delegate 401 to upstream, claims-only `req.session`, defer wiring to T07)
- **`src/modules/auth/auth.jwt-context.ts`** + **`auth.types.ts`** + **`auth.token-issuer.ts`** — existing JwtClaims shape (verify: `{ sub, sid, role, hotelId, deptId }`; `role` type `'super_admin' | 'gm_admin' | 'dept_head' | 'staff'`)
- **`src/plugins/must-rotate-password.plugin.ts`** (T06) — pattern reference for factory function + preHandler hook + AppError throw + allowlist handling

#### PM B notes — Acceptance criteria (8 items)

1. Plugin functional via factory pattern `registerTenantGuard(fastify, deps?)` — no new dep, no `register()` call
2. **4-role unit coverage** PASS: super_admin (bypass scope = `{type: 'all-hotels'}`), gm_admin (same-hotel allow / cross-hotel deny), dept_head (same as gm_admin pattern), staff (same as gm_admin pattern). Unauthenticated → skip; invalid JWT → skip; allowlist → skip.
3. Allowlist mechanism works (chosen approach per Open Item #1)
4. Cross-tenant access rejected with **consistent status code** (chosen per Open Item #2 — 403 OR 404, NOT mixed)
5. `make check` green
6. Drift zero T11 territory
7. Coverage ≥ 80% line on plugin + types + new error class; target 90% on plugin (critical security)
8. **APPROVE-PARTIAL convention** — full APPROVE held alongside T05+T06 until T02 ships (batched upgrade)
9. **Cross-slot heritage documented eksplisit** di SUBMIT block header + every commit body dengan `§4-D01` reference

(Item 9 is bonus; canonical AC count = 8.)

#### PM B notes — Sequence + cycle constraint

- **Cycle 4 sequence (PO-ratified)**: T11 (this) → T07 (per-hotel users CRUD)
- **Single-dev cycle still active** — Slot A/C still PARKED. No Parent PM intervention expected.
- **T05+T06 still APPROVE-PARTIAL** — T11 won't unblock their batch full APPROVE (that needs T02 ship). T11 ITSELF will also be APPROVE-PARTIAL pending T02 integration.
- **Branch hygiene per §7**: T11 impl commits on `feat/auth-core`. PM-STATUS commits (this ASSIGNMENT, executor PLAN/SUBMIT, PM B ACK/VERDICT) on `main`.
- **T07 dependency on T11**: T07 SUBMIT can begin AFTER T11 APPROVE-PARTIAL (per PARENT §1 T07 row + §10 cycle-1 sequence). Cycle 5 opens after T11 close.

#### PM B notes — 5 Open items untuk Executor B raise di PLAN

1. **Allowlist mechanism** — 3 options:
   - **(a) Config-driven env array** `TENANT_GUARD_ALLOWLIST=/api/auth/login,/api/auth/refresh,/health` parsed at startup
   - **(b) Plugin register option** `registerTenantGuard(fastify, { allowlist: [...] })` — explicit at boot wiring (when T07 wires the plugin)
   - **(c) Per-route config** `fastify.route({ ..., config: { tenantGuardSkip: true } })` — distributed, granular
   - **PM B recommend (b)** — matches T06 plugin's deps-injection pattern (factory takes config explicitly); avoids env coupling; explicit at boot site. Executor confirm or counter di PLAN.

2. **Status code for tenant-deny** — `403 FORBIDDEN` OR `404 NOT_FOUND` (hide-existence)?
   - 403 = transparent (better DX, worse OPSEC — reveals resource exists)
   - 404 = opaque (better OPSEC, may confuse legit users debugging)
   - **PM B recommend 403** — Qooma is B2B SaaS (not a high-OPSEC public API); transparent error helps tenant admins debug "wrong hotel context" faster. Consistent across all deny cases (no `404 for wrong hotel` + `403 for no claim` mix — single status). Executor confirm or counter.

3. **`super_admin` bypass scope** — global bypass OR per-route opt-in?
   - **(a) Global**: super_admin always passes (sets `{type: 'all-hotels'}`, never throws) regardless of route — matches spec §6 pseudocode (`session.role === 'super_admin' → { type: 'all-hotels' }`)
   - **(b) Per-route opt-in**: route config `{ allowSuperAdminBypass: true }` — granular, more restrictive
   - **PM B recommend (a) global** — Charter intent (`SERVICE-CHARTER §3` + spec §6) = super_admin = cross-hotel oversight. Per-route opt-in adds complexity without proportional security gain (super_admin is already a privileged role gated by RBAC at create-time). Executor confirm.

4. **Resource `hotelId` extraction strategy** — how plugin knows the resource's hotel for compare?
   - **(a) Shallow JWT claim presence only**: plugin verifies `claims.hotelId` exists for non-super_admin; per-route handler enforces row-level scoping via `req.tenantScope` filter. Plugin = preHandler shallow check.
   - **(b) URL params extraction**: plugin extracts `req.params.hotelId` when present; deny if `req.params.hotelId !== claims.hotelId` (non-super_admin)
   - **(c) Hybrid**: shallow claim presence + URL param check + leave row-level to handler
   - **PM B recommend (a)** — simplest, defensible, leaves repo-level scoping to modules (cleaner separation per spec §6 line 388-398 "scopedTickets" pattern). T11 plugin doesn't try to be the row-level enforcer. URL param check is fragile (routes may not have `:hotelId` in path — Auth domain mostly uses `/api/auth/me` self-targeted patterns). Executor confirm or counter with concrete cross-tenant scenario where (a) fails.

5. **Audit logging for deny events** — log shape:
   - Min fields: `correlationId`, `level: 'warn'`, `msg: 'tenant_deny'`, `userId` (masked? hashed? — Executor decide), `role`, `requestedHotelId` (if extractable), `claimHotelId`, `path`, `method`
   - JANGAN log raw token / cookie value
   - Per CLAUDE.md §7 — structured logging via winston, correlation ID propagated
   - **PM B recommend**: log `userId` as-is (it's an opaque UUID, not PII per CLAUDE.md §6.3). Email is the PII concern — and `req.session` doesn't carry email (claims-only). So `userId` raw OK.
   - Executor finalize shape di PLAN.

**Notes for Executor B**:
- **Lighter cycle than T05/T06** — 1 main plugin file + 1 error class + 1 types extension + 2 test files. Foundation already in place (jwt-context helper, AppError pattern, factory-function plugin precedent from T06). NO new package install expected.
- **Estimate**: ~3-5h impl + test + self-validate. Significantly faster than T05 (~6-8h) or T06 (~5-6.5h) because pattern reuse is heavy.
- **Cross-slot ceremony WAJIB**: every commit body references §4-D01 verbatim per pattern above. Audit trail is the deliverable for Slot A handoff later.

Awaiting Executor B PLAN T11 attempt 1.

#### PLAN T11 — exec-B (Nanak) cycle 4 (2026-06-29) attempt 1. CROSS-SLOT execution per §4-D01.

**Cross-slot heritage (audit trail)**
- Canonical owner of record: Slot A (Nathan) — `SERVICE-CHARTER.md §3`
- Execution this cycle: Slot B (Nanak) one-off — `PARENT §4-D01` (PO-ratified 2026-06-29, single-dev constraint, T07 soft-blocks without T11)
- Every commit body footer: `Cross-slot execution per §4-D01 (Slot A canonical territory).`
- SUBMIT + VERDICT headers carry the same marker
- Slot A re-takes future tenant-guard amendments per §4-D01 last sentence

**Scope recap**

Add `src/plugins/tenant-guard.ts` Fastify plugin (factory function — same shape as T06 `must-rotate-password`) that runs as a global `preHandler` hook. Per request: skip on allowlist; reuse `extractJwtClaims(fastify.tokenIssuer, req.cookies.token)` from existing `auth.jwt-context.ts` (T06 helper — no duplication); on missing/invalid token, skip-and-delegate-to-401 (T06 precedent + Amendment 1); for `super_admin`, set `req.session = { userId, role, hotelId, deptId }` + `req.tenantScope = { type: 'all-hotels' }` and pass through (Open Item #3 global bypass); for any other role, require `claims.hotelId !== null` — present → set `req.session` + `req.tenantScope = { type: 'single-hotel', hotelId }`, missing → throw new `TenantScopeViolationError` (403 FORBIDDEN, code `TENANT_SCOPE_VIOLATION`). Per Open Item #4 (a) ruling, plugin does **claim-presence enforcement only** — row-level cross-tenant deny is the handler-side responsibility consuming `req.tenantScope` (spec §6 line 388-398 `scopedTickets` pattern). DoD line 1666 "cross-tenant resource access reject" is satisfied at handler boundary by row-scope filter — flagged explicitly here so PM B audit sees the interpretation. Plugin authored + tested only; NOT wired in `entrypoints/api.ts` (Amendment 3 — T07 wires it). Unit tests cover 4 roles + allowlist + missing claims + super_admin bypass + audit-log shape verification. Integration placeholder `it.todo()` x 3+ gated on T02. APPROVE-PARTIAL convention batches with T05/T06 for T02 ship.

**Session-start gate** (EXECUTOR-PROTOCOL §2)

- Identity confirmed: Executor, Slot B (Nanak) ✓
- CLAUDE.md loaded ✓ (auto-load)
- Task spec read: `01-auth-identity §6` (tenant-guard pseudocode + `scopedTickets` pattern line 388-398); `MVP-AUTH-FIRST §4.1` (critical-correctness, fail-closed); `SERVICE-CHARTER §3` (Slot A canonical reaffirm)
- Parent docs spot-read: `PARENT §4-D01` deviation entry; `PARENT §8` T11 DoD baseline (PM B amended per T06 precedent); `CLAUDE.md §4/§5/§6/§7/§8`; `docs/SECURITY.md §2-§5`; `docs/TESTING.md §4/§9`; `ADR-0001` (middleware ≠ port — factory function correct shape); `ADR-0008` (hotel_id post-H11 semantics)
- Existing T06 surface verified (read-only via `git show origin/feat/auth-core`): `auth.jwt-context.ts` exports `extractJwtClaims(tokenIssuer, token): JwtClaims` (throws `AuthError` on null/empty/invalid); `JwtClaims = { sub, sid, role, hotelId: string | null, deptId: string | null }`; `Role = 'super_admin' | 'gm_admin' | 'dept_head' | 'staff'`; `fastify-augmentation.ts` already exists at `src/shared/types/fastify-augmentation.ts` with `fastify.tokenIssuer` decorator (T06 add)
- `prisma/schema.prisma` confirmed earlier: `User.hotelId String? @db.Uuid` (NULL for super_admin); `Session` row carries no `hotelId` (sourced from User via FK)
- Dependencies: T05 APPROVE-PARTIAL ✓ T06 APPROVE-PARTIAL ✓ — both supply the foundation (JWT issuer, claims shape, error pattern, factory plugin precedent). Cycle 4 IMPL-READY pending PM B ACK.
- `make typecheck` clean ✓ (baseline on `feat/auth-core` already verified during T06 cycle; no `src/` mutations on main since)
- `make lint` clean ✓ (same)
- Scaffolder risk: **none** — no `pnpm create`, no Prisma init. No package install needed; T06 deps cover.

**Files to create** (3 NEW)

```
src/plugins/tenant-guard.ts                                         (factory: registerTenantGuard)
src/modules/auth/__tests__/tenant-guard.plugin.test.ts              (unit — auth __tests__/ per T06 precedent)
src/modules/auth/__tests__/tenant-guard.plugin.integration.test.ts  (3+ it.todo, T02-gated)
```

Test-dir choice: **`src/modules/auth/__tests__/`** per ASSIGNMENT DoD line 1672 + T06 plugin precedent (must-rotate-password.plugin.test.ts already there). Keeps plugin tests near the auth context they depend on (JwtClaims, builders, AppError). Co-locating new tests in `src/plugins/__tests__/` would break T06 symmetry without value. Confirmed.

**Files to modify** (2 EDIT, additive only)

```
src/modules/auth/auth.errors.ts           EXTEND: add `TenantScopeViolationError` class next to BusinessRuleError + PasswordRotationRequiredError (DD5 pattern: not re-exported via barrel)
src/shared/types/fastify-augmentation.ts  EXTEND: add `Session` + `TenantScope` types + augment FastifyRequest with optional `session` + `tenantScope` fields
```

**Files explicitly NOT touched**

- `src/entrypoints/api.ts` — Amendment 3 mandate; wiring deferred to T07
- `src/modules/auth/auth.jwt-context.ts` — reuse `extractJwtClaims` verbatim; helper's `TODO(T11)` comment stays as-is (documentary, refactored later)
- `src/modules/auth/index.ts` — DD5 pattern: `TenantScopeViolationError` internal-only, no barrel export
- `prisma/schema.prisma` — no schema change
- `package.json` / `pnpm-lock.yaml` — no new dep (`fastify-plugin` adoption is `T_AUX_02` cycle-4+ backlog)
- Existing T05/T06 surface (service, repository, routes, must-rotate plugin) — zero touch
- Q-B-02 workarounds — reuse verbatim, do not re-fight

**File count**: **3 CREATE / 2 EDIT** (exact match with ASSIGNMENT baseline)

**Approach**

The plugin is a single function `registerTenantGuard(fastify, deps): void` that calls `fastify.addHook('preHandler', ...)` on the root instance (NOT `register()` — Fastify encapsulation defeats global hooks without `fastify-plugin`; T06 DD1 precedent). `deps` is `{ allowlist: readonly string[] }` per Open Item #1 (b) ruling — allowlist injected at boot via the factory call site (T07's responsibility when it wires). Per request: (1) if `req.routeOptions.url` matches a member of `deps.allowlist` → return immediately (no session/tenantScope set, no JWT inspection — public routes); (2) else read `req.cookies['token']` — if undefined/empty → return (delegate to downstream 401 per Amendment 1); (3) else try `extractJwtClaims(fastify.tokenIssuer, cookie)` — on `AuthError` catch → return (delegate to downstream 401); (4) on success, claims is typed `JwtClaims`. If `claims.role === 'super_admin'` → set `req.session = sessionFromClaims(claims)` + `req.tenantScope = { type: 'all-hotels' }`, return (global bypass per #3 (a)). Else: if `claims.hotelId === null` → log deny event (shape #5) then throw `TenantScopeViolationError('Tenant scope required for non-super_admin')`; if `claims.hotelId !== null` → set `req.session = sessionFromClaims(claims)` + `req.tenantScope = { type: 'single-hotel', hotelId: claims.hotelId }`, return. The plugin **does NOT** compare `req.params.hotelId` or any URL-derived scope — per Open Item #4 (a) ruling, row-level cross-tenant enforcement is handler-side via `req.tenantScope` consumption (spec §6 `scopedTickets` pattern). DoD line 1666 ("cross-tenant resource access reject") is satisfied by handler-boundary scope filters in T07 onwards — flagged explicitly so PM B audit understands the interpretation. The plugin uses `req.routeOptions.url` (Fastify 4.28+ canonical) with `req.url.split('?')[0]` fallback for unmatched paths (T06 plugin precedent — same `isAllowlisted` shape). Fail-closed by construction: every error path either throws an `AppError` subclass (caught by entrypoint setErrorHandler → mapped status code) or skips with a documented delegate-to-401 hand-off. No code path silently sets `tenantScope` for invalid claims — verified by explicit negative test (mock helper throw → assert `tenantScope` and `session` both undefined). The new `TenantScopeViolationError` extends `AppError` from `@core/errors/app-errors.js` with `statusCode = 403; code = 'TENANT_SCOPE_VIOLATION'`. The `fastify-augmentation.ts` additions are: `export interface Session { readonly userId: string; readonly role: Role; readonly hotelId: string | null; readonly deptId: string | null; }`; `export type TenantScope = { readonly type: 'all-hotels' } | { readonly type: 'single-hotel'; readonly hotelId: string };`; and the FastifyRequest module augmentation adds `session?: Session;` + `tenantScope?: TenantScope;` (both optional — handlers consuming them on guarded routes can `if (req.tenantScope === undefined) throw ...` for defense-in-depth, but the plugin guarantees presence post-hook on non-skipped paths).

**5 Open items — stance final**

1. ✅ **Allowlist mechanism** → **(b) Plugin register option `registerTenantGuard(fastify, { allowlist: readonly string[] })`** — per PM B recommendation. Matches T06 factory-injection pattern, explicit at boot, no env coupling. T07 (next cycle) wires with starter set `['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/health']` (canonical public surfaces). T06 plugin's `must-rotate` gate has its own allowlist; T11's is independent. **No GAP.**

2. ✅ **Status code** → **403 FORBIDDEN, code `TENANT_SCOPE_VIOLATION`** — per PM B recommendation. Justify: spec `MVP-AUTH-FIRST §4.1` fail-closed mandate + B2B SaaS context (transparent error helps tenant admins debug `wrong hotel context`). **Consistency**: same status across all deny cases (no `404 for wrong hotel` vs `403 for missing claim` mix — per DoD security floor item line 1688). **No GAP.**

3. ✅ **super_admin bypass** → **(a) Global bypass** — per PM B recommendation. Matches spec §6 pseudocode (`session.role === 'super_admin' → { type: 'all-hotels' }`) + Charter intent (`SERVICE-CHARTER §3` super_admin = cross-hotel oversight). Per-route opt-in adds RBAC complexity without proportional security gain (super_admin gate is at create-time via separate RBAC). **No GAP.**

4. ✅ **hotelId extraction strategy** → **(a) Shallow JWT claim presence only** — per PM B recommendation. Justify: spec §6 line 388-398 `scopedTickets` pattern delegates row-level scoping to module repos (e.g. T07 `UserRepository` will read `req.tenantScope.hotelId` and add `WHERE hotel_id = $1` to queries). Plugin = preHandler shallow gate; not a row-scoping enforcer. **DoD interpretation flag**: DoD line 1666 "Cross-tenant resource access reject: `req.params.hotelId !== claims.hotelId`" reads like option (c) hybrid — but Open Item #4 (a) ruling supersedes (PM B's own recommendation is (a)). My read: line 1666's `req.params.hotelId` check is **delegated to handler-side enforcement** (when T07 lands and routes have `:hotelId` params, handler consumes `req.tenantScope` and filters/rejects). Plugin's contribution = setting the scope context that handlers consume. **Flag for PM B confirm at ACK: if PM B actually wants plugin-side URL param diff (option c hybrid), I'll switch + add a test case.** Default proceed with (a).

5. ✅ **Audit log shape (deny events)** — **finalized**:
   ```ts
   logger.warn({
     msg: 'tenant_deny',
     correlationId: req.id,           // Fastify default req.id
     userId: claims.sub,              // opaque UUID, not PII per CLAUDE.md §6.3
     role: claims.role,
     claimHotelId: claims.hotelId,    // null when violation
     path: req.routeOptions.url ?? req.url.split('?')[0] ?? '',
     method: req.method,
   });
   ```
   No raw token, no cookie value, no email (claims-only — email isn't in JWT). `correlationId` = `req.id` (Fastify auto-assigns per request — no need for a separate correlation-id plugin in T11; if Slot A adds one later, `req.id` continues to work). **No GAP.**

**3 PM B amendments — stance final (all 3 confirmed, no rebuttal)**

- **Amendment 1 — delegate 401 to upstream** ✅ CONFIRM. T06 precedent exactly. Plugin's role is tenant-scope; missing/invalid auth is `@fastify/jwt` + handler responsibility (401 returned by their layer). Plugin's `try { extractJwtClaims(...) } catch { return; }` is the clean delegate.
- **Amendment 2 — `req.session` claims-only, no DB lookup** ✅ CONFIRM. Spec §6 line 376 supports this (`req.session = { user_id, role, hotel_id, dept_id }` — all claims-derivable). Avoids per-request DB hit. If T07 needs the full User row, T07 does `repo.findUserById(req.session.userId)` once at its handler.
- **Amendment 3 — NO `api.ts` wiring this cycle** ✅ CONFIRM. T11 deliverable = plugin authored + tested only. Wiring deferred to T07 (when first scoped route lands). Avoids accidentally guarding T05/T06 routes that weren't designed for it (e.g. `/login` would deny because no claims yet). `src/entrypoints/api.ts` = ZERO touches in T11.

**Auxiliary design notes (intent-stated, not blockers)**

- **Test-dir placement** — `src/modules/auth/__tests__/tenant-guard.plugin.test.ts` per ASSIGNMENT DoD line 1672 + T06 precedent. T06's `must-rotate-password.plugin.test.ts` lives there; matching keeps audit symmetry. (Directive's `src/plugins/__tests__/` proposal not taken — would split plugin tests across two locations without value.)
- **`Session` interface name collision** — T05 already defines `interface SessionContext { userAgent, ipAddress }` in `auth.types.ts` (request-context for session ROW creation). The new T11 `Session` type lives in `fastify-augmentation.ts` (request-decoration). Different namespaces, no collision; both names are accurate to their domain. If PM B prefers rename (e.g. `RequestSessionClaims`), say so at ACK — small mechanical rename.
- **Allowlist matching precision** — uses `routeOptions.url` (the route pattern, e.g. `/api/auth/login`) for matched routes; falls back to `req.url.split('?')[0]` for unmatched paths (404 case). Set-based lookup `O(1)` via `new Set(deps.allowlist)` constructed once at registration.

**GAPs / questions (PLAN-blocking)**

- **(none).** All 5 PM B open items + 3 amendments have stances. No new dep, no schema change, no env var, no cross-team file touch beyond existing Q-B-02 workarounds. The DoD line 1666 interpretation flag (#4 above) is an explicit ask-PM-B-to-confirm at ACK; if PM B amends to (c) hybrid, I'll add one URL-param-mismatch test before SUBMIT — non-blocking for PLAN.

**Test plan summary (per TESTING.md §4 + §11)**

`tenant-guard.plugin.test.ts` — Fastify `inject()` fixture reusing T06 plugin test pattern. Fixture builds a Fastify instance, decorates `tokenIssuer` (mock), registers `@fastify/cookie`, calls `registerTenantGuard(fastify, { allowlist: [...] })`, then registers 3 dummy routes (one allowlisted, one guarded, one health). Inject permutations:

1. **super_admin** with `hotelId: null` claim + guarded route → no throw; `req.tenantScope === { type: 'all-hotels' }`; `req.session` populated
2. **super_admin** with `hotelId: 'h-1'` claim + guarded route → same (super_admin always bypasses; `hotelId` irrelevant)
3. **gm_admin** with `hotelId: 'h-1'` + guarded route → no throw; `req.tenantScope === { type: 'single-hotel', hotelId: 'h-1' }`
4. **dept_head** with `hotelId: 'h-1'` + guarded route → same shape as gm_admin (parametric — covers `role !== super_admin && hotelId !== null` branch)
5. **staff** with `hotelId: 'h-1'` + guarded route → same shape (parametric)
6. **gm_admin** with `hotelId: null` + guarded route → `403 TENANT_SCOPE_VIOLATION`; audit log called with shape (5)
7. **Missing cookie** + guarded route → no throw, skip (route handler runs without `req.session`/`req.tenantScope`); test asserts handler reachable AND `tenantScope === undefined`
8. **Invalid JWT** (tokenIssuer mock throws AuthError) + guarded route → same skip semantic as (7)
9. **Allowlisted route** with no cookie → no throw, route handler runs, `req.session` + `req.tenantScope` both undefined (allowlist skips entirely)
10. **Allowlisted route** with valid super_admin cookie → still skip (allowlist match wins before JWT inspection)
11. **Empty allowlist `{ allowlist: [] }`** + guarded route + no cookie → skip + delegate to downstream 401 (delegate path unchanged when allowlist empty)
12. **Audit log shape verification** — separate test asserts winston `.warn` mock called with exact field keys (#5 shape) on the deny case

**Coverage targets** per file (T11 scope):
- `tenant-guard.ts`: target **≥ 90% line** (critical security surface per TESTING.md §9 + DoD line 1682)
- `auth.errors.ts`: 100% line maintained (additive class covered via the deny test)
- `fastify-augmentation.ts`: types-only file (currently excluded from coverage; new additions also types-only)

**Security checklist (CLAUDE.md §6 + MVP-AUTH-FIRST §4.1)**

- **Fail-closed**: every error path throws an `AppError` subclass (caught by entrypoint setErrorHandler → mapped status) OR skips with documented delegate-to-401. No code path silently sets `tenantScope` for invalid/missing claims. **Verified by negative test** (mock helper throw → assert `tenantScope` + `session` undefined).
- **Status code consistency**: all deny cases produce 403 TENANT_SCOPE_VIOLATION (no 404-for-wrong-hotel vs 403-for-missing-claim mix per DoD line 1688)
- **No JWT secret in error response** — error payload is `{ code: 'TENANT_SCOPE_VIOLATION', message: <generic>, details: {} }` via `AppError.toJson()`
- **No PII in log** — userId is opaque UUID (CLAUDE.md §6.3); claims don't carry email; no raw token logged
- **correlationId** propagated via Fastify's auto-assigned `req.id`
- **Cross-tenant row-level**: NOT plugin's job per Open Item #4 (a); handler enforces via `req.tenantScope` consumption (T07 territory)
- **super_admin global bypass**: explicit branch BEFORE the hotelId-null check (super_admin can have `hotelId === null`; check order matters)

**Risks + assumptions**

- **Risk**: hook ordering — plugin must register AFTER `@fastify/cookie` so `req.cookies` is populated, AND AFTER `fastify.tokenIssuer` decorator (T06 — already in `entrypoints/api.ts`). T07 will sequence registration correctly. T11 itself doesn't wire (Amendment 3) but the file header documents the order requirement for the T07 author.
- **Risk**: `routeOptions.url` undefined for routes registered without a path pattern (e.g. Fastify catch-all). Fallback `req.url.split('?')[0]` covers it. Test #9 + #10 exercise allowlist matching for both shapes.
- **Risk**: future Slot A re-take on tenant-guard may want different shapes (e.g. `req.session` as full User object via DB lookup, OR `req.tenantScope` as a function not a plain object). My cycle-4 impl is the conservative claims-only baseline; refactor surface is single-file + 1 augmentation block.
- **Assumption**: `@fastify/cookie` already registered upstream (T05 wiring, present in `entrypoints/api.ts`). T07 will inherit that wiring.
- **Assumption**: `JwtClaims.hotelId` can be `null` (verified in `auth.types.ts:16` — `hotelId: string | null`). This is the super_admin case; check order in plugin handles it.
- **Assumption**: `fastify.tokenIssuer` decorator (T06 add) is in place. Verified via `git show origin/feat/auth-core:src/shared/types/fastify-augmentation.ts`.

**ETA**

- PLAN ACK cycle: ~15-30 min wall-time
- Implementation (plugin + error class + types extension): ~2-3h
- Unit tests (~12 tests + integration placeholders): ~1.5-2h
- Self-validate (`make check` + drift + coverage): ~20-30 min
- **Total wall-time exec**: **~3.5-5h from ACK to SUBMIT** (matches ASSIGNMENT estimate; significantly faster than T05/T06 because foundation + plugin pattern + error pattern + helper all reused verbatim)

**Status: ready-for-ACK. No PLAN-blocking GAPs. 5 open items + 3 amendments confirmed. 1 ACK-time confirm requested (DoD line 1666 interpretation: shallow-only vs hybrid).**

**Workflow next**:
1. PM B ACK on main
2. `git checkout feat/auth-core`
3. Implement per 6-7 atomic commits (errors class → types extension → plugin → tests; each commit body footer `Cross-slot execution per §4-D01 (Slot A canonical territory).`)
4. `make check` green + coverage + drift scans
5. `git checkout main` per §7
6. Post SUBMIT T11 attempt 1 block — header note `Cross-slot execution per §4-D01`
7. Commit + push to main

**NOT switching to `feat/auth-core` / NOT touching `src/` until PM B ACK posted.**

Awaiting PM B ACK.

##### PM B ACK PLAN T11 attempt 1 — Executor B clear to implement. Open Item #4 ruling confirmed (a). Cycle 4 (2026-06-30). CROSS-SLOT execution per §4-D01.

**Outcome**: ✅ **ACK** — no amendments needed beyond Open Item #4 confirmation. Executor B IMPL-READY. Switch to `feat/auth-core` post-ACK; impl commits land on branch per §7 hygiene, PM-STATUS commits on main.

**Cross-slot heritage carried through** (audit trail confirmation):
- PLAN header marker: `CROSS-SLOT execution per §4-D01.` ✅
- PLAN cross-slot heritage section (PLAN lines 1793-1798): ✅ — canonical Slot A + Slot B execution one-off + commit body template + SUBMIT/VERDICT markers + future amendment trail
- PLAN workflow section commit-body template (line 1944): ✅
- ACK block header marker (this block above): ✅
- All four match ASSIGNMENT §"Cross-slot heritage" mandates verbatim.

---

**PLAN validation per PM-AGENT §2.3** — 8 criteria all PASS:

| Criterion | Verdict | Note |
|---|---|---|
| Consistency vs ASSIGNMENT §"Scope" | ✅ | Plugin shape + factory pattern + preHandler hook + delegate-to-401 + super_admin bypass — exact match |
| Consistency vs ASSIGNMENT §"DoD" (15 items) | ✅ | All 15 mapped; PLAN line 1858 explicitly flags DoD line 1666 interpretation re #4 (handled below) |
| Consistency vs ASSIGNMENT §"AC" (8 items + bonus cross-slot) | ✅ | All 8 covered + AC#9 cross-slot heritage marker integrated |
| File list completeness | ✅ | **3 CREATE / 2 EDIT** exact match: `src/plugins/tenant-guard.ts` + 2 test files + extend `auth.errors.ts` (`TenantScopeViolationError`) + extend `fastify-augmentation.ts` (`Session` + `TenantScope` types) |
| Test plan validity | ✅ | 12 tests planned (4-role × parametric + allowlist + missing cookie/JWT + audit log shape + negative `tenantScope`-undefined verification); mock pattern reuses T06 plugin test fixture; coverage targets `≥90% line` on plugin (critical) per TESTING.md §9 |
| GAP categorization | ✅ | 0 PLAN-blocking GAPs; 1 ACK-time clarification ask (Open Item #4 DoD line 1666 interpretation) — addressed below |
| ETA reasonability | ✅ | ~3.5-5h vs ASSIGNMENT estimate ~3-5h — matches; significantly faster than T05/T06 due to foundation reuse (jwt-context, AppError pattern, factory plugin precedent, test fixture pattern) |
| Cross-slot marker compliance | ✅ | All 4 mandates met (PLAN header, heritage section, workflow commit template, SUBMIT/VERDICT marker plan) |

**Verified Executor claims on existing branch state** (via `git show origin/feat/auth-core` since src/ lives on branch per §7 hygiene):
- `auth.jwt-context.ts` exports `extractJwtClaims(tokenIssuer, token): JwtClaims` ✅ (file content confirmed)
- `JwtClaims = { sub, sid, role, hotelId: string | null, deptId: string | null }` ✅ (type literal confirmed)
- `Role = 'super_admin' | 'gm_admin' | 'dept_head' | 'staff'` ✅ (4-role literal confirmed)
- `fastify.tokenIssuer` decorator present di `fastify-augmentation.ts` (T06 add) ✅
- `prisma/schema.prisma`: `User.hotelId String?` nullable for super_admin ✅
- `must-rotate-password.plugin.ts` factory pattern + `registerMustRotatePasswordGate(fastify, deps)` shape ✅ (T06 precedent for T11 to mirror)

---

**Open Item #4 ruling — CONFIRM (a) shallow JWT claim presence only. NO hybrid (c) switch.**

PLAN line 1858 asked PM B to confirm DoD line 1666 interpretation. PM B ruling:

- ✅ **(a) shallow-only stands** — plugin = preHandler claim-presence gate; row-level cross-tenant enforcement = handler-side responsibility consuming `req.tenantScope`
- ❌ **NOT (c) hybrid** — no plugin-side URL param diff

**Rationale (re-affirm + amplify Executor's interpretation)**:
1. **Spec §6 line 388-398** is canonical: `scopedTickets(req)` pattern explicitly puts row-level scoping at the query helper / repo layer, NOT in middleware. T11 plugin sets `req.tenantScope`; T07 `UserRepository` consumes it via `WHERE hotel_id = $1` (or skips when `type === 'all-hotels'`).
2. **SRP**: plugin = shallow gate (claim presence + super_admin bypass + scope context); handler/repo = row-level enforcement. Mixing them in plugin violates separation of concerns.
3. **Heterogeneous route shapes**: future routes will have different param shapes (`/api/users/:userId/...` where userId belongs to a hotel via FK, NOT via URL — plugin can't compare; vs `/api/admin/hotels/:hotelId/...` where URL has hotelId). Plugin URL-param parsing → brittle, route-coupled, scales poorly.
4. **DoD line 1666 interpretation flag** — the phrasing `Cross-tenant resource access reject: req.params.hotelId !== claims.hotelId` was prescriptive-looking but Open Item #4 ruling supersedes. DoD line 1666 is satisfied **at the handler boundary** in T07 onwards (handler reads `req.tenantScope` and rejects/filters). PM B confirms Executor's PLAN line 1802 interpretation: "DoD line 1666 'cross-tenant resource access reject' is satisfied at handler boundary by row-scope filter".

**Decision**: Executor B proceeds with (a) as PLAN-stated. NO test add needed. NO scope change.

---

**5 open items + 3 amendments — all FINAL (no changes)**

| Item | Final stance | Source |
|---|---|---|
| #1 Allowlist mechanism | (b) plugin register option `{ allowlist: readonly string[] }` injected at boot via factory | PM B recommendation + Executor PLAN |
| #2 Deny status code | **403 FORBIDDEN, code `TENANT_SCOPE_VIOLATION`** consistent across all deny cases | PM B recommendation + Executor PLAN |
| #3 super_admin bypass | (a) global bypass — matches spec §6 + Charter §3 | PM B recommendation + Executor PLAN |
| #4 hotelId extraction | **(a) shallow JWT claim presence only** — confirmed above; NO hybrid (c) | PM B ACK ruling (above) |
| #5 Audit log shape | Finalized: `correlationId/userId/role/claimHotelId/path/method` at `warn` level via `req.id` Fastify auto-correlation | Executor PLAN (no GAP) |
| Amendment 1 | Delegate 401 to upstream (T06 precedent) | Executor PLAN confirm |
| Amendment 2 | `req.session` claims-only (no DB lookup) | Executor PLAN confirm |
| Amendment 3 | NO `entrypoints/api.ts` wiring this cycle (T07 wires) | Executor PLAN confirm |

---

**Auxiliary design notes ruling** (Executor flagged 3 intent-stated; PM B confirms all):

- **Test-dir placement** `src/modules/auth/__tests__/tenant-guard.plugin.test.ts` ✅ APPROVE. Matches T06 precedent (must-rotate-password.plugin.test.ts lives there); keeps plugin tests near auth context. PM B agrees this is cleaner than splitting across `src/plugins/__tests__/`.
- **`Session` interface name** in `fastify-augmentation.ts` ✅ APPROVE as proposed (NO rename). Distinct namespace from T05's `SessionContext` (which is request-context for session ROW creation: `{userAgent, ipAddress}`); T11's `Session` is request-decoration (claims-derived: `{userId, role, hotelId, deptId}`). Different domain, accurate names. If naming collision ever surfaces concretely (e.g. handler imports both), revisit then.
- **Allowlist matching `routeOptions.url` + URL fallback** ✅ APPROVE. Matches T06 plugin's `isAllowlisted` shape exactly. `Set`-based O(1) lookup is correct.

---

**Standing instructions ke Executor B** (post-ACK):

- **Switch branch**: `git checkout feat/auth-core && git rebase main` (sync latest ASSIGNMENT + PLAN + ACK from main onto branch; current main HEAD = `94e7b90` PLAN; rebase will replay 20 impl commits on top of main's PM-STATUS state)
- **Suggested commit sequence** (Executor decide final granularity, ~5-7 atomic commits):
  1. `feat(auth): TenantScopeViolationError extend auth.errors.ts` (additive: 1 class)
  2. `chore(types): TenantScope + Session types in fastify-augmentation.ts` (additive: 2 type exports + FastifyRequest module augmentation)
  3. `feat(plugins): tenant-guard factory + preHandler hook + super_admin bypass + audit log`
  4. `test(plugins): tenant-guard unit suite — 4-role coverage + allowlist + edge cases`
  5. `test(plugins): tenant-guard integration placeholders (it.todo x3+, T02-gated)`
  6. (optional) format/lint fixup if any prettier auto-fix surfaces
- **WAJIB commit body footer** for every T11 commit:
  ```
  Cross-slot execution per §4-D01 (Slot A canonical territory).
  ```
- **WAJIB plugin file header comment** include cross-slot heritage marker + TODO for future fastify-plugin canonical refactor (T_AUX_02 backlog reference).
- **Self-validate gate per EXECUTOR-PROTOCOL §4.4 SEBELUM SUBMIT** (same as T05/T06 standard):
  - `make check` HARUS green (lint + format-check + typecheck + test-unit; NOT test-integration this cycle)
  - **Drift scan zero hits** scoped to T11 files (`src/plugins/tenant-guard.ts` + extended `auth.errors.ts` + extended `fastify-augmentation.ts` + 2 new test files): no `any` / `console.log` / `@ts-ignore` / `throw new Error(`-in-service / default export / forbidden imports / `.skip` / hardcoded URL / `setTimeout()` / wrap-Prisma interface
  - **Coverage** ≥ 80% line floor on plugin file; target **≥ 90% line** for plugin (critical security surface per TESTING.md §9 + DoD line 1682). `auth.errors.ts` should maintain 100% line. `fastify-augmentation.ts` types-only — currently excluded from coverage, OK.
  - **Security floor verify** (CLAUDE.md §6 + MVP-AUTH-FIRST §4.1):
    - Fail-closed: NO code path silently sets `tenantScope` for invalid/missing claims — explicit negative test (mock helper throw → assert `tenantScope` + `session` BOTH undefined)
    - Status code consistency: all deny cases produce 403 TENANT_SCOPE_VIOLATION (no 404 mix)
    - No JWT secret in error response; no PII (userId raw OK — opaque UUID per CLAUDE.md §6.3); no raw token logged
    - super_admin bypass branch BEFORE hotelId-null check (order matters — super_admin can have hotelId=null per User model)
- **Cross-slot marker WAJIB di plugin file header** comment (top of `tenant-guard.ts`): include `// Cross-slot execution per §4-D01` line + audit trail reference
- **Cross-slot marker WAJIB di SUBMIT block header** when posted on main: same `Cross-slot execution per §4-D01` marker
- **Branch hygiene per §7**: impl commits 1-6 land on `feat/auth-core`. SUBMIT block (PM-STATUS-B.md edit only, append-only below this ACK) commits on `main` setelah self-validate green. Then PM B independent verify per PM-AGENT §3 → VERDICT block on main.
- **Pre-existing Q-B-02 workarounds OK to reuse** — jest.config.json + Prisma cast + eslint-disable on adapter import + inline setErrorHandler. Don't re-fight, don't re-document.

**Risks acknowledged from PLAN — no PLAN-blocking concerns**:
- Hook ordering (cookie + tokenIssuer must register before tenant-guard) — Amendment 3 defers wiring to T07; T07 sequences. T11 plugin file header documents the requirement for the T07 author.
- `routeOptions.url` undefined for catch-all routes — fallback `req.url.split('?')[0]` covers; tests #9/#10 exercise both shapes.
- Future Slot A re-take may want different `req.session` shape — claims-only baseline is conservative; refactor surface = single plugin file + 1 augmentation block (low cost).

**Re-engage trigger**: ketika Executor B posts SUBMIT T11 attempt 1 block (PM-STATUS-B.md §2 append below this ACK, on `main` per §7), PM B akan checkout feat/auth-core for independent verify per PM-AGENT §3 Steps 1-7 → VERDICT block on main.

**PM B state**: **WAIT-MODE for SUBMIT T11 attempt 1**. No further action di §2 sampai Executor posts SUBMIT. Cross-slot execution per §4-D01.

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
| Q-B-01        | Bundled blocker for T05 coding-start: (a) `argon2 ^0.41.x` install (preferred per OWASP 2024 + `01-auth-identity §5`) or `bcrypt` fallback (per `SECURITY.md §2` baseline); (b) `@fastify/cookie ^9.x` install (required by `@fastify/jwt` cookie reads — hand-roll fallback is high-friction); (c) `JWT_ACCESS_TTL` default `'8h' → '15m'` in `src/core/config/env.ts:37` (touches Slot A canonical domain — needs Slot A coord clearance + doc-sync decision between `SECURITY.md §2` floor vs `01-auth-identity §3` ratified 15-min). | Executor B PLAN T05 attempt 1 GAPs #1+#2+#4 (PM-STATUS-B.md §2 lines 219-222) | **RESOLVED 2026-06-29 by PO** | PO approved all 3 sub-items (PARENT §4-D02/D03/D04). `docs/SECURITY.md §2` doc-sync edit by Parent PM (lines 25-26). T05 PLAN FULL-ACKED; SUBMIT delivered cycle 2 with all 3 deviations applied. |
| Q-B-02        | 4 pre-existing Slot A foundation gaps surfaced by Executor B during T05 impl (cycle 2, 2026-06-29): (a) `jest.config.ts` needs `ts-node` (devDep absent) — Executor workaround: `jest.config.json` + `--config` flag; (b) `src/core/prisma/prisma-client.ts` exports `{}` placeholder — Executor workaround: entrypoint cast `db as unknown as PrismaClient` with `TODO(slot-A)`; (c) `.eslintrc.cjs` lacks `no-restricted-imports` off-override for `src/entrypoints/*.ts` — Executor workaround: inline `eslint-disable-next-line` di `entrypoints/api.ts:21`; (d) `src/plugins/error-handler.plugin.ts` doesn't exist — Executor workaround: inline `setErrorHandler` mapping `AppError → reply.code(err.statusCode)` di `entrypoints/api.ts:36` with `TODO(slot-A)`. **Also noted**: Yarn cache (~22 GiB) untouched on host — unused (repo is pnpm); future cleanup ask if disk pressure returns (not a blocker now per §6 ENOSPC entry update). | Executor B SUBMIT T05 Notes #1 (cycle 2, PM-STATUS-B.md §2) | **open · cross-dev coord (Slot A territory; no PO action needed)** | Surface untuk Slot A onboarding next cycle via Parent PM coord. PM B request Parent PM consolidation at `PARENT §10` cross-dev coord row (Parent PM authority). All 4 workarounds sound for cycle-1 unit-only scope; do not block T05 APPROVE-PARTIAL. Roll-up to PARENT §2 mentions Q-B-02 for Parent PM pickup. |

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

### 2026-06-29 — Executor B side blocker: disk full (ENOSPC) on host `/private/tmp` during PLAN T05 attempt 1

**What happened**: Executor B reported `pnpm install --frozen-lockfile` failed with ENOSPC on `/private/tmp` before tsc/eslint baselines could run during session-start gate (PLAN line 175-176). PLAN was authored against last-known-clean baseline at `1e32e34 Init project` since no `src/` mutations since.

**Why non-PLAN-blocking**:
- PLAN content (file tree, DoD, GAPs, test plan, approach) is reviewed by PM on textual merit — not gated on local typecheck/lint baseline at PLAN stage (CLAUDE.md §11 `make check` is a CODING gate, not PLAN gate).
- Executor B HOLD on coding pending Q-B-01 anyway; ENOSPC resolution window aligns naturally with PO approval window.
- No `src/` work attempted → no risk of partial commits.

**Action**:
- Executor B: resolve via host-side cleanup (`du -sh /private/tmp/*`, prune stale macOS temp caches, IDE caches, old `node_modules` snapshots) **before** Q-B-01 resolution lands — keeps coding-start unblocked.
- PM B: log here for audit trail; do NOT escalate to Parent PM (single-slot, environmental, not a planning issue).

**Lesson**: at session-start gate, if baseline `make check` is environmentally blocked, Executor MAY proceed to PLAN authoring but **MUST** flag the blocker in PLAN body (Executor B did — PLAN line 175-176 + 272). PM B accepts PLAN on textual merit; ENOSPC cleanup is owner's local-env concern.

---

#### 2026-06-29 cycle 2 — Resolution: ENOSPC cleared via `npm cache clean --force` (reclaimed ~5.3 GiB; 1.3 → 8.4 GiB free)

**Reported by**: Executor B in SUBMIT T05 attempt 1 Notes #8 (cycle 2, PM-STATUS-B.md §2).

**What was reclaimed**: `npm cache` (~5.3 GiB) — host disk back above 5 GiB floor before any `pnpm add` invocation (T05 dep installs argon2 + @fastify/cookie executed cleanly post-cleanup).

**Untouched**: Yarn cache (~22 GiB) — repo is pnpm-managed; left for owner's discretion. Logged at Q-B-02 (§3) as future cleanup ask if disk pressure returns.

**Lesson update**: `npm cache clean --force` is sufficient for typical Node-monorepo dev pressure; only escalate Yarn cache cleanup when sub-5-GiB recurs.

#### 2026-06-29 cycle 2 — Retry log: still ENOSPC at impl-start pre-flight (HOLD on T05 coding)

**Trigger**: PM B FULL-ACK directive §1 pre-flight `df -h /` (≥5 GiB free required before any `pnpm add`).

**Observed** (2026-06-29 cycle 2 pre-flight, before any `pnpm` invocation):

```
Filesystem        Size    Used   Avail Capacity iused ifree %iove %iused  Mounted on
/dev/disk3s1s1   228Gi    11Gi   1.3Gi    90%    451k   14M    3%   /
```

Available = **1.3 GiB**, well below 5 GiB floor (~3.7 GiB shortfall). System partition reports 90% capacity, only 1.3 GiB writable.

**Action taken**:
- **HOLD** on Commit 1 of FULL-ACK sequence (`pnpm add argon2 @fastify/cookie`).
- **NO** `pnpm add` attempted (per PM B directive: "JANGAN attempt `pnpm add` against full disk").
- **NO** `pnpm install` attempted (would also fail and risk partial `node_modules` corruption).
- **NO** branch creation (`feat/auth-core` deferred — branch makes sense only once first commit is queued).
- **NO** edits to `src/`, `prisma/`, `package.json`, `pnpm-lock.yaml`. Working tree on `main` remains identical to last push.
- Only this `PM-STATUS-B.md §6` retry-log + the corresponding standup line will be committed/pushed this session.

**Cycle 1 reminder context**: same ENOSPC observed at PLAN cycle — was non-blocking for PLAN authoring (PM B accepted text-merit). Cycle 2 is the CODING gate, where the rule explicitly says HOLD until disk cleared (FULL-ACK lines 399-402).

**Why non-escalating** (still slot-internal, per PM B FULL-ACK line 581-582):
- Single-slot environmental issue. T05 unblocked from planning side (all 5 GAPs resolved via Q-B-01).
- Not impacting other slots (A, C still PARKED this cycle).
- No risk to repo state — no partial commits, no corrupted lockfile, no half-pushed branch.
- Resolution is owner-local (host disk cleanup), not a planning/coordination ask.

**Resume trigger**: free ≥5 GiB on `/`, re-run `df -h /` at next session-start, then proceed with Commit 1 (`pnpm add argon2 @fastify/cookie`) of FULL-ACK sequence.

**Owner action items** (Nanak, host-side, OUT of repo):
- `du -sh ~/Library/Caches/* | sort -h | tail -10` (find big macOS app caches — IDE indexes, Xcode derived data, simulator data common offenders)
- `du -sh ~/.pnpm-store ~/.npm ~/.cache 2>/dev/null` (Node toolchain caches — `pnpm store prune` if safe)
- `du -sh /private/tmp/* 2>/dev/null | sort -h | tail -10` (system temp — stale build artifacts)
- `docker system prune -a --volumes` if Docker is installed (often the single biggest reclaim)
- Empty Trash + restart if needed.
- Target: free ≥5 GiB; comfortable floor 10 GiB.

**No PARENT §7 escalation**. Audit trail captured here for cycle continuity. Next exec session re-runs pre-flight verbatim per FULL-ACK §1.

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

### Branch hygiene rule (ratified cycle 2 2026-06-29 post-T05 cherry-pick cleanup)

**Rule**: PM-STATUS-*.md (cross-session tracking docs) ALWAYS live on `main` — separate from impl artifacts.

- **Always on `main` (direct commit, no branch)**:
  - `PM-STATUS-B.md` (slot B tracker)
  - `PM-STATUS-PARENT.md` (cross-dev roll-up)
  - Executor B `SUBMIT` block writes → main directly
  - PM B `ASSIGNMENT` / `ACK` / `VERDICT` block writes → main directly
- **On `feat/<modul>-<short>` branch until full APPROVE**:
  - `src/`, `prisma/`, `package.json`, `pnpm-lock.yaml`, `jest.config.*`, env config touches, all impl + build artifacts
- **Mixed-touch commits (impl + PM-STATUS) FORBIDDEN** — split into 2 commits, one per channel
- **Workflow per cycle**:
  1. Executor on `feat/<modul>-<short>`: code + test + self-validate
  2. Executor `git checkout main` → write SUBMIT block in `PM-STATUS-B.md` → commit to main → push
  3. PM B `git checkout feat/<modul>-<short>` → run independent verify (make check, drift, coverage)
  4. PM B `git checkout main` → write VERDICT block + status row + roll-up → commit to main → push
  5. PM B reconcile branch via `git rebase main` + `git push --force-with-lease`
- **Rationale**: Cross-session visibility (Parent PM, future Slot A/C) reads from main; impl-on-branch only merges to main on full APPROVE. Decouples tracking cadence from merge cadence.
- **Cherry-pick precedent**: cycle 2 SUBMIT (`8202e49`→`8ac6db2`/main) + VERDICT (`a4e97c7`→`4c9117e`/main) demonstrated clean migration when rule was retro-applied.

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

### Future-cycle backlog (Slot B PM-internal — not Q-B-02 Slot A territory)

Items deferred from current cycle work, not blocking, candidates for cycle-4+ task authoring. **No PO action needed**; these are Slot B's own deferrals captured for audit + future planning.

| Topic | Deferred from | Estimated scope | Trigger to activate |
|---|---|---|---|
| **Rate-limit lockout state machine** (Redis-backed; covers T05 `/login` + T06 `/me/password`) | T05 PLAN Open Item #5 + T06 PLAN stance #5 (both deferred per PM B ACK rulings) | New task `T_AUX_01` (working title) — implement `5 fail / 15 min per user` lockout per SECURITY.md §6 row 4; uses `@fastify/rate-limit` (already installed) + Redis store; touches login + rotate-password handlers | When G2 surface stabilizes OR when Slot A unparks (whichever first) — rate-limit needs sessions/users tables (T02 dep) for store keying anyway |
| **`fastify-plugin` install + canonical plugin shape refactor** (covers T06 must-rotate-password + T11 tenant-guard) | T06 PLAN DD1 + VERDICT Open Item #2 (factory workaround validated, but canonical Fastify shape requires this dep) | New task `T_AUX_02` (working title) — `pnpm add fastify-plugin`; refactor `must-rotate-password.plugin.ts` from setup-function shape to `FastifyPluginCallback` wrapped with `fp()`; do the same for T11 tenant-guard | When T11 design comes up next cycle — pair both plugins under one refactor to keep cross-plugin patterns consistent |

Both items are **deferred-by-design**, not regressions. Document at SUBMIT/VERDICT trail to avoid re-litigation each cycle.

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM B:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot B)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
