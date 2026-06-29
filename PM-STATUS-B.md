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
- **Active task**: T05 — Auth core endpoints (login/logout/refresh) · `assigned · BLOCKED-on-Q-B-01 (deps + TTL)` — PARTIAL-ACK posted; Executor B HOLD on coding
- **Branch**: `feat/auth-core` (deferred — Executor B NOT to create branch until Q-B-01 resolved)
- **Next gate (global)**: G2 untuk T05 (modul auth) — lihat `PM-STATUS-PARENT.md §5`
- **Cycle 1 sequence (PO-ratified)**: **T05 → T06 → T11 → T07**. Don't pick T06 sampai T05 APPROVED.
- **Single-dev cycle**: hanya Slot B (Nanak) online; T01..T04 (Slot A foundation) `PARKED` — integration test deferred sampai T02 ships.

---

## 1. Task tracker (slot B — PM B authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=B. PM B update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status                                   | Verified by PM | Notes                                                                                                  |
| --- | ---------------------------------- | ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| T05 | Auth core endpoints (login/logout/refresh) + sessions/JWT/CSRF plumbing | `assigned · BLOCKED-on-Q-B-01`           | —              | Cycle 1 task #1. PLAN attempt 1 PARTIAL-ACKED 2026-06-29; 2 GAPs PM-internal-approved, 3 escalated as Q-B-01 (deps + TTL). Executor HOLD. |
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
| Q-B-01        | Bundled blocker for T05 coding-start: (a) `argon2 ^0.41.x` install (preferred per OWASP 2024 + `01-auth-identity §5`) or `bcrypt` fallback (per `SECURITY.md §2` baseline); (b) `@fastify/cookie ^9.x` install (required by `@fastify/jwt` cookie reads — hand-roll fallback is high-friction); (c) `JWT_ACCESS_TTL` default `'8h' → '15m'` in `src/core/config/env.ts:37` (touches Slot A canonical domain — needs Slot A coord clearance + doc-sync decision between `SECURITY.md §2` floor vs `01-auth-identity §3` ratified 15-min). | Executor B PLAN T05 attempt 1 GAPs #1+#2+#4 (PM-STATUS-B.md §2 lines 219-222) | **open · escalated to Parent PM** | Awaiting PO ruling. PM B mirror to `PARENT §3b` package-question (deps primary) + cross-ref §3c for TTL config touch. Roll-up posted to PARENT §2. |

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
