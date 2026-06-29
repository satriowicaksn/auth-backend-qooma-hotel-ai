# PM-STATUS-PARENT — Qooma Backend (cross-dev roll-up)

> **Parent PM tracker.** Read-only buat Executor & PM A/B/C kecuali bagian roll-up yang explicit dipost oleh PM A/B/C. Parent PM authority untuk section §1, §3, §4, §5, §6, §7, §8. PM A/B/C append baris short ke §2 setelah tiap APPROVE (per `PM-AGENT.md §0.8`).
>
> Detail per-dev assignment (ASSIGNMENT → PLAN → SUBMIT → VERDICT) tinggal di **`PM-STATUS-A.md`** (Nathan), **`PM-STATUS-B.md`** (Nanak), **`PM-STATUS-C.md`** (Satrio).
>
> Komunikasi PO ↔ Parent PM ↔ PM A/B/C ↔ Executor semua via git-synced markdown. Tidak ada DM kecuali eskalasi formal (lihat §9).
>
> **Identity check**: setiap session WAJIB sebut role + slot di response pertama (lihat `KICKOFF.md §4`).

---

## 0. Current focus (global)

- **Pace model**: **criteria-based, no calendar deadlines** (PO ruling 2026-06-29). Gates close when `PM-AGENT.md §5` criteria met, not on date X. Velocity sets cadence.
- **Phase**: Bootstrap / pre-T01 — repo just forked from `core-backend-qooma-hotel-ai` infra + adapted to Auth scope.
- **Active gate**: G1 — Boilerplate ready (default `PM-AGENT.md §5` criteria; no deviations). Includes: `make check` green, `make start` jalan, `seed-super-admin` CLI berfungsi, tier seed migration up.
- **Active devs (this cycle)**: **only B (Nanak) online**. A (Nathan) + C (Satrio) sessions not active — see §10 cross-dev coord. T01..T04 (Slot A foundation) + T08..T10 (Slot C admin surface) PARKED until re-assign.
- **Progress (global)**: 0 / 10 MVP scope items approved (T01..T10 authored §1, scope source `docs/spec/MVP-AUTH-FIRST.md §1`).

> **Canonical task source**: `docs/spec/MVP-AUTH-FIRST.md §1` (10-row endpoint scope table) + `docs/SERVICE-CHARTER.md §3` slot routing. Backend belum punya `docs/DEVELOPMENT-PLAN.md` formal — MVP-AUTH-FIRST.md adalah source-of-truth Phase 1.
>
> **T01..T10 routing recap** (full rows in §1):
> - **T01..T04 → Slot A (foundation)**: pnpm install verify · initial Prisma migration · tiers seed · seed-super-admin CLI
> - **T05..T07 → Slot B (Auth core)**: `/api/auth/*` · `/api/users` (gm_admin)
> - **T08..T10 → Slot C (Auth admin surface)**: `/api/admin/*` · `/api/hotels/me` · `/api/settings/hotel`

---

## 1. Global task tracker (Parent PM authority)

> Otoritas Parent PM untuk edit row in-place. Base status vocabulary: `backlog` | `assigned` | `wip` | `submit-pending` | `approved` | `rejected` | `escalated`.
>
> **Extended flags** (this cycle, per PO H29 2026-06-29 ruling):
> - `PARKED · unowned-this-cycle` — Slot offline, no exec session; will not progress until PO re-assign.
> - `READY-FULL` — Slot online, no dependency blockers; can start full DoD scope.
> - `READY-PARTIAL (unit-only)` — Slot online; service/schema/handler shell + unit-test scope doable now; integration test deferred until upstream dep ships.
> - `BLOCKED-on-A:T0X` — depends on a parked Slot A task; cannot start meaningful work.
>
> Setiap task wajib punya kolom **Slot** untuk routing ke PM A/B/C. **Spec / dependencies / gate / ADR refs** in Notes column.

| T## | Title                                                                                                    | Slot | Owner | Status                                          | Verified by | Notes |
| --- | -------------------------------------------------------------------------------------------------------- | ---- | ----- | ----------------------------------------------- | ----------- | ----- |
| T01 | pnpm install verify + `make check` green on bootstrap                                                    | A    | —     | `PARKED · unowned-this-cycle`                   | —           | Spec: pre-G1 foundation (no §1 row — environment task). Deps: none. ADR-0002 (pnpm), 0003 (TS strict + ESLint). Gate: **G1**. |
| T02 | Initial Prisma migration: tiers + hotels + users + sessions + password_reset_tokens (mutual-exclusion CHECK + UNIQUE(hotel_id,email)) | A    | —     | `PARKED · unowned-this-cycle`                   | —           | Spec: `MVP-AUTH-FIRST §3` steps 1–5 + `01-auth-identity §3` SQL. Deps: T01. ADR-0004 (1 svc=1 DB), 0007 (Prisma). Gate: **G1**. Schema already authored at `prisma/schema.prisma`; this task = generate first migration via `prisma migrate dev` + apply locally. |
| T03 | Tiers seed (4 rows: lite/professional/luxury/enterprise per config table)                                | A    | —     | `PARKED · unowned-this-cycle`                   | —           | Spec: `MVP-AUTH-FIRST §3` step 1 + `01-auth-identity §1.4` Tier shape (outbound_quota / agent_cap / user_cap / department_cap / features JSONB). Deps: T01, T02. ADR-0007. Gate: **G1**. Idempotent migration or `prisma/seeds/index.ts` invocation — Slot A's call. |
| T04 | `seed-super-admin` CLI (`pnpm seed:super-admin`)                                                         | A    | —     | `PARKED · unowned-this-cycle`                   | —           | Spec: `MVP-AUTH-FIRST §3` step 6 + `01-auth-identity §1.3` last paragraph. Reads `SEED_SUPER_ADMIN_EMAIL` + `SEED_SUPER_ADMIN_PASSWORD` env; idempotent INSERT one row (`role='super_admin'`, `hotel_id=NULL`). Deps: T01, T02. Gate: **G1**. |
| T05 | Auth core endpoints: `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` + sessions/JWT/CSRF plumbing | B    | —     | `backlog · READY-PARTIAL (unit-only)`           | —           | Spec: `MVP-AUTH-FIRST §1` row 1 + `01-auth-identity §1.1`+§3 sessions table + §6 tenant-guard. Deps: T01 (install) for typecheck; T02 (migration) for integration tests. ADR-0001 (port for password-hash + JWT lib if external), 0006 (Fastify), 0007 (Prisma direct, no repo interface). Gate: **G2/G3**. Audit: schema + service + route shell + unit tests can ship now; integration deferred. **Open Q**: tenant-guard ownership (see §3c Q-PARENT-01). |
| T06 | Auth current-user: `GET/PATCH /api/auth/me` + `POST /api/auth/me/password` + `must_rotate_password` per-request gate | B    | —     | `backlog · READY-PARTIAL (unit-only)`           | —           | Spec: `MVP-AUTH-FIRST §1` rows 2–3 + §4.2 + `01-auth-identity §1.1` + §3 must-rotate enforcement. Deps: T01; logical dep on T05 (session lookup); runtime dep on T02. ADR-0001 (password hash port), 0003. Gate: **G2/G3**. Audit: rotation-gate plugin + route shells + service unit tests doable now; e2e flow deferred. |
| T07 | Per-hotel users CRUD: `GET/POST/PATCH /api/users` + `POST /api/users/:id/reset-password` (gm_admin scope) | B    | —     | `backlog · READY-PARTIAL (unit-only)`           | —           | Spec: `MVP-AUTH-FIRST §1` row 6 + `01-auth-identity §1.2` + §4.7 email uniqueness + §1.2 server-enforced constraints (role∉{gm_admin,super_admin}, last-gm guard, soft-delete only). Deps: T01; runtime dep on T02 + T03; **needs tenant-guard middleware (see Q-PARENT-01)**. ADR-0001, 0008. Gate: **G3**. Audit: service + zod schemas + generate-password helper + unit tests doable with mocked Prisma + stubbed tenantScope. |
| T08 | Cross-hotel admin users CRUD + Tier catalog read: `/api/admin/users` family + `GET /api/admin/tiers[:name]` | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T04) | —           | Spec: `MVP-AUTH-FIRST §1` rows 5 + 7 + `01-auth-identity §1.3` + §1.4 + §4.6 last-super_admin guard + §4.4 mutual-exclusion. Deps: T01, T02, T03 (tiers exist), T04 (first super_admin to test). ADR-0001, 0008. Gate: **G3**. |
| T09 | Admin hotels CRUD + atomic GM-create + suspend cascade: `/api/admin/hotels` family + `/:id/status`        | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T03) | —           | Spec: `MVP-AUTH-FIRST §1` row 9 + §4.3 suspend cascade + §4.5 atomic GM-create + `01-auth-identity §1.5` + `SERVICE-CHARTER §2`. Single-transaction insert(hotels)+insert(users[gm]) + generate-and-return password. Deps: T01, T02, T03. ADR-0001, 0007 (tx). Gate: **G3**. |
| T10 | Hotel context + settings: `GET /api/hotels/me` + `GET/PUT /api/settings/hotel`                            | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T03) | —           | Spec: `MVP-AUTH-FIRST §1` rows 8 + 10 + `01-auth-identity §1.5` + §5 super_admin `/hotels/me` open behavior Q (recommend option (b) `{ id:null, tier:null }` per spec). Deps: T01, T02, T03. ADR-0001, 0007. Gate: **G3**. |

---

## 2. Per-dev short-status roll-up (PM A/B/C append, latest di atas)

> Setiap PM A/B/C post **1-2 baris** summary ke sini setelah tiap VERDICT atau end-of-session. Parent PM scan ini untuk daily report. JANGAN paste full SUBMIT/VERDICT di sini — itu tetap di PM-STATUS-{slot}.md.
>
> Format:
> ```
> [YYYY-MM-DD H{N}] [PM <SLOT> <NAME>] <T## status — 1 liner>
> ```

_(kosong — belum ada activity)_

<!-- TEMPLATE:
[2026-06-25 H3] [PM A Nathan] T01 boilerplate scaffold APPROVED (attempt 2) — make check green, 0 drift hits.
[2026-06-25 H3] [PM B Nanak]  T02 auth module wip — PLAN ACK'd, executor implementing JWT issuance.
[2026-06-25 H3] [PM C Satrio] T03 webhook plugin REJECT (attempt 1) — HMAC verify di middle of handler, harus plugin-level.
-->

---

## 3. Open questions register (consolidated)

> Parent PM consolidate dari PM A/B/C. PM A/B/C juga boleh edit row mereka sendiri (status update). Resolve = PO action.

### 3a. Contract questions (target: resolved sebelum G2; frozen setelah G3)

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| —             | —        | —         | —              | —      | —          |

### 3b. Package / tooling questions

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| —             | —        | —         | —              | —      | —          |

### 3c. Architecture / planning questions

| ID            | Question                                                                                                                                                                                                  | Raised by | Source                                                  | Status | Resolution |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- | ------ | ---------- |
| Q-PARENT-01   | Tenant-guard middleware ownership + sequencing. `SERVICE-CHARTER §3` lists it under Slot A foundation, but PO's explicit T01..T04 list does not include it. T05/T06/T07 (Slot B) all need it at runtime. Should it be (a) added as T0_aux Slot A foundation task, (b) absorbed into T05 (first Slot B endpoint), or (c) inlined as a util in T07 since that's the first hotel-scoped read? | Parent PM | `SERVICE-CHARTER §3` + `MVP-AUTH-FIRST §4.1` + `01-auth §6` | open   | —          |

---

## 4. Approved deviations & planning updates (PO-approved)

> Parent PM mencatat tiap perubahan ke planning docs yang dilakukan untuk sync (per `PM-AGENT.md §0.6`), serta deviasi one-off yang di-approve PO. PM A/B/C tidak edit row di sini — propose via §3 atau direct ke Parent PM.

| Tanggal    | Doc / lokasi                                                       | Perubahan singkat                                                                                 | Driver task    | Disetujui oleh |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 2026-06-12 | docker-compose.yml, .env.example, README.md, .claude/settings.json | Shift host port Postgres 5432→5433 & Redis 6379→6380 untuk hindari bentrok dengan service lokal | (pre-T01 fix)  | PO             |
| —          | —                                                                  | —                                                                                                 | —              | —              |

---

## 5. Gates (Parent PM enforce, PO define)

> Default kriteria di `PM-AGENT.md §5`. **PO ruling 2026-06-29**: pace = **criteria-based, no calendar deadlines**. Gate closes when criteria met, not on date X. Velocity sets cadence.

| Gate | Target           | Criteria (recap)                                                                                                                  | Status      | Notes                                                                                                  |
| ---- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| G1   | criteria, no date | Boilerplate ready: `make check` hijau, `make start` jalan, `_template` jalan, ADR lengkap. + seed-super-admin CLI + tiers migration | not started | Covers T01..T04 (Slot A foundation). PARKED this cycle.                                                |
| G2   | criteria, no date | Modul auth + 1 modul business jalan (CRUD lengkap + 1 external integration). Coverage ≥ 80%                                       | not started | Auth-first MVP has no external integration in slice — modul auth (T05+T06) lands here; "1 external integration" criterion reads as N/A for this slice (no webhook/vendor in Auth scope). Confirm wording with PO when G2 approaches. |
| G3   | criteria, no date | Semua endpoint kontrak terimplementasi. Webhook HMAC tervalidasi. CI hijau                                                        | not started | T05..T10 collectively. **Webhook HMAC criterion N/A** for Auth-first (no webhook endpoints — those live in sibling Integration service per `SERVICE-CHARTER §1`). Auth-equivalent: CSRF token validation on all mutating verbs + tenant-guard on every route (per MVP §7 hand-off checklist). |
| G4   | criteria, no date | Feature freeze — hanya bugfix                                                                                                     | not started | —                                                                                                      |
| G5   | criteria, no date | UAT pass. AC P0 = 100%. Migrasi prod siap. Runbook lengkap di `docs/runbooks/`                                                    | not started | AC P0 = `MVP-AUTH-FIRST §5` acceptance criteria checklist (10 checkboxes).                              |

---

## 6. Parent standup log (latest di atas)

> Parent PM consolidate dari 3 standup PM A/B/C (yang masing-masing tinggal di PM-STATUS-{slot}.md §6).
>
> Format:
> ```
> QOOMA BE PARENT — Standup — H{N}/{total}
>
> Dev A (Nathan) — <1-2 baris ringkas dari PM A standup>
> Dev B (Nanak)  — <1-2 baris ringkas dari PM B standup>
> Dev C (Satrio) — <1-2 baris ringkas dari PM C standup>
>
> 📅 Gate status
> - Next gate: G{N} di H{X} — <on track | at risk | slipping>
>
> 🚨 Eskalasi ke PO
> - <satu baris ask>
>
> 🎯 Fokus besok (cross-dev)
> - <re-balance / dependency unblock / shared-infra ship>
> ```

### H0 — 2026-06-12 (bootstrap, pre-multi-dev kickoff)

```
QOOMA BE PARENT — Standup — H0 (bootstrap)

Dev A (Nathan) — belum onboard, awaiting kickoff
Dev B (Nanak)  — belum onboard, awaiting kickoff
Dev C (Satrio) — belum onboard, awaiting kickoff

📅 Gate status
- Next gate: G1 (Boilerplate ready) — kriteria default; PO konfirmasi timeline
- Open contract questions: 0
- Open package questions: 0

🚨 Eskalasi ke PO
- Konfirmasi timeline + gate definition (G1..G5 default vs custom)
- Konfirmasi roadmap awal (T01–T##) untuk distribute ke 3 dev

🎯 Fokus besok / next session
- Setelah PO konfirmasi: Parent PM post first ASSIGNMENT batch,
  PM A/B/C onboard + identitas confirmed, executor session start.
```

---

## 7. Cross-dev incidents / lessons (Parent PM scope — affects >1 dev)

### 2026-06-12 — Docker port collision (pre-T01)

**What happened**: `make start` gagal — port 5432 host sudah dipakai service Postgres lokal user. Error: `Bind for 0.0.0.0:5432 failed: port is already allocated`.

**Fix**: Shift host port di `docker-compose.yml` — Postgres 5432→5433, Redis 6379→6380. Container internal port tetap default (5432/6379) supaya service di compose network tidak butuh perubahan. Updated: `docker-compose.yml`, `.env.example`, `.env` user, `README.md` quick-start note, `.claude/settings.json` MCP postgres DATABASE_URL.

**Tidak diubah**: `.github/workflows/ci.yml` (CI runner fresh, no collision), `docs/TESTING.md` (testcontainers pakai `getMappedPort()` random ephemeral).

**Lesson for tim**: bila task touch local dev port, cek dulu via `lsof -i :<port>` apakah ada bentrok sebelum tetap pakai default.

---

## 8. Next-up queue (Parent PM authority)

> Parent PM rewrite list ini ketika roadmap berubah. Each task **wajib** kolom Slot (A/B/C) untuk routing. PM A/B/C baca queue ini untuk lihat upcoming work — PM A/B/C tidak edit queue.

### Unblock audit — Slot B (cycle 1, 2026-06-29)

Per PO ruling: only Slot B (Nanak) online this cycle. Audited T05..T07 against parked T01..T04 (Slot A foundation):

```
Unblock audit Slot B (cycle 1):
  T05 (auth core endpoints)        — READY-PARTIAL (unit scope: schema + service + route shell + JWT/CSRF plumbing unit tests)
  T06 (auth current-user + rotate) — READY-PARTIAL (unit scope: rotation-gate plugin + service unit tests; e2e deferred)
  T07 (users CRUD gm_admin)        — READY-PARTIAL (unit scope: service + zod + generate-password helper + unit tests; needs tenant-guard stub — see Q-PARENT-01)
```

**Integration-test scope deferred** for all 3 until T02 (initial migration) ships. **Tenant-guard middleware** (Q-PARENT-01 in §3c) blocks T07 full-DoD; Slot B can stub it in unit tests but cannot complete T07 SUBMIT without resolution.

Slot C (T08..T10): not audited this cycle — no Slot C exec/PM session online (`PARKED · unowned-this-cycle`).

If Slot B exhausts READY-PARTIAL scope on T05/T06/T07 before T01..T04 unparks, escalate back to PO for deviation decision (Slot B absorbs T01..T04 as one-off, recorded in §4 with reason "single-dev cycle; foundation bootstrap absorbed by Slot B").

---

### T05 — Auth core endpoints (login / logout / refresh)

- **Slot**: B (Nanak)
- **Owner**: TBD (PM B pick up via PM-STATUS-B.md §2 ASSIGNMENT)
- **Started**: —
- **Status**: `READY-PARTIAL (unit-only)` — see audit above
- **Spec**: `docs/spec/MVP-AUTH-FIRST.md §1` row 1 + `docs/spec/01-auth-identity.md §1.1` + §3 sessions table + §6 tenant-guard sketch + `SERVICE-CHARTER §2` cookie/JWT/CSRF contract
- **Dependencies**: T01 (install — exec session must `pnpm install` for typecheck even if T01 not "approved"); runtime T02 for integration
- **ADR refs**: 0001 (port for password hash + JWT signing if external lib), 0003 (TS strict), 0006 (Fastify), 0007 (Prisma direct — no `IUserRepository`)
- **Gate**: G2 / G3

#### Scope
- `POST /api/auth/login` — email + password → set httpOnly cookie (`token=<jwt>`) + return `{ user, csrfToken }` shape locked at H3 (see `01-auth-identity §1.1`).
- `POST /api/auth/logout` — clear cookie, revoke session row.
- `POST /api/auth/refresh` — rotate JWT idempotently; consume refresh token cookie.
- Sessions table writes (refresh_token + csrf_token + expires_at + user_agent + ip_address).
- JWT plumbing: short-lived access (15 min recommended per spec §3), long-lived refresh.
- CSRF token rotation on `/me` (lands in T06 — coordinate handoff).

#### Files (suggested — Slot B finalizes in PLAN)
- `src/modules/auth/auth.routes.ts`, `auth.service.ts`, `auth.schema.ts`, `auth.types.ts`
- `src/modules/auth/ports/password-hash.port.ts` + `adapters/argon2-hash.adapter.ts` (or bcrypt — Slot B picks per spec §5)
- `src/modules/auth/index.ts` (barrel)

#### T05 DoD (full)
- [ ] 3 endpoints implemented + zod request/response schemas
- [ ] Cookie + CSRF response shape matches `01-auth-identity §1.1`
- [ ] Sessions row created on login, revoked on logout, rotated on refresh
- [ ] Unit tests: password hash port mocked, sessions repo via integration (deferred), service-level happy + 4xx paths covered
- [ ] Integration tests: deferred until T02 lands — note in SUBMIT
- [ ] `make check` green
- [ ] No `any`, no `console.log`, `throw AppError` subclasses

#### Parent PM notes for PM B
- Audit allows partial: ship structure + unit tests now; reopen for integration after T02
- Tenant-guard not yet needed for these endpoints (login is public; logout/refresh authenticate via cookie only) — defer Q-PARENT-01 surface
- ADR-0001: password hash IS external IO (argon2/bcrypt is a library, but per ADR-0001 "external HTTP API call" — debate whether hash port is required. Recommend port-then-adapter pattern here because tests benefit from in-memory hash fake; raise in PLAN if disagreeing)

---

### T06 — Auth current-user + password rotation

- **Slot**: B (Nanak)
- **Owner**: TBD
- **Started**: —
- **Status**: `READY-PARTIAL (unit-only)`
- **Spec**: `MVP-AUTH-FIRST §1` rows 2–3 + §4.2 rotation enforcement + `01-auth-identity §1.1` + §3 must-rotate-password block
- **Dependencies**: T05 (session lookup machinery); runtime T02
- **ADR refs**: 0001 (password hash port — shared with T05), 0003, 0006
- **Gate**: G2 / G3

#### Scope
- `GET /api/auth/me` — return current user + rotate `csrfToken`
- `PATCH /api/auth/me` — update `language` only (whitelist)
- `POST /api/auth/me/password` — verify current, hash new, update user row, **clear `must_rotate_password`**, optionally revoke other sessions
- **`must_rotate_password` per-request gate**: Fastify plugin that returns `403 PASSWORD_ROTATION_REQUIRED` for every endpoint EXCEPT this trio + logout when `req.session.user.must_rotate_password === true`

#### Parent PM notes for PM B
- The rotation gate is cross-cutting (plugin-level) — wire in `src/plugins/` or `src/modules/auth/plugins/`. Keep it separate from tenant-guard.
- Unit tests for plugin: pass a fake `req.session` with both flag states, assert next() vs 403.

---

### T07 — Per-hotel users CRUD (gm_admin scope)

- **Slot**: B (Nanak)
- **Owner**: TBD
- **Started**: —
- **Status**: `READY-PARTIAL (unit-only)` — **soft-blocked on Q-PARENT-01 (tenant-guard)**
- **Spec**: `MVP-AUTH-FIRST §1` row 6 + `01-auth-identity §1.2` + §4.7 email uniqueness + §1.2 server-enforced constraints
- **Dependencies**: runtime T02 + T03; Q-PARENT-01 resolution before SUBMIT
- **ADR refs**: 0001, 0008 (`users.dept_id` opaque UUID — Hotel Core's `departments` table not yet shipped, treat as nullable+unenforced)
- **Gate**: G3

#### Scope
- `GET /api/users` — list within own hotel; query params `role`, `dept_id`, `is_active`
- `POST /api/users` — create dept_head/staff; reject `role ∈ {gm_admin, super_admin}` with 400; generate-and-return password (16-char alphanumeric+symbols); set `must_rotate_password: true`
- `PATCH /api/users/:id` — update name/role/dept_id/is_active/language; email immutable; last-gm guard
- `POST /api/users/:id/reset-password` — regenerate + return; set `must_rotate_password: true`
- `users.dept_id` validation: opaque UUID, nullable, no FK check at this layer (Hotel Core owns departments)

#### Parent PM notes for PM B
- Generate-password helper: 16-char alphanumeric+symbols, crypto-secure. Add to `src/shared/utils/password.ts` or modul-scoped helper — PLAN decides.
- Tenant-guard: needed at runtime. For unit tests, stub `req.tenantScope = { type: 'single-hotel', hotel_id: '<uuid>' }`. **Cannot SUBMIT for APPROVE until Q-PARENT-01 resolved** — file structure + service + zod can ship; routes wiring tenant-guard blocked.

---

### T08 — Cross-hotel admin users CRUD + Tier catalog read

- **Slot**: C (Satrio)
- **Owner**: TBD
- **Started**: —
- **Status**: `PARKED · unowned-this-cycle` (also depends T02..T04)
- **Spec**: `MVP-AUTH-FIRST §1` rows 5 + 7 + `01-auth-identity §1.3` + §1.4 + §4.6 last-super_admin guard + §4.4 mutual-exclusion CHECK
- **Dependencies**: T01..T04 (foundation); tenant-guard (Q-PARENT-01); T07's generate-password helper for reuse
- **ADR refs**: 0001, 0008
- **Gate**: G3

#### Scope
- `GET /api/admin/users` — list all users across hotels; filter by `hotel_id`, `role`
- `POST /api/admin/users` — create user of ANY role in ANY hotel; **mutual-exclusion**: `hotel_id` required for non-super_admin, MUST be null for super_admin (400 on violation)
- `PATCH /api/admin/users/:id` — update any user; enforce last-super_admin guard (422 `LAST_SUPER_ADMIN_PROTECTED`)
- `POST /api/admin/users/:id/reset-password` — regenerate + return
- `GET /api/admin/tiers` — list 4 tier rows (super_admin only — 403 for gm_admin per `MVP-AUTH-FIRST §5` AC)
- `GET /api/admin/tiers/:name` — single tier detail

---

### T09 — Admin hotels CRUD + atomic GM-create + suspend cascade

- **Slot**: C (Satrio)
- **Owner**: TBD
- **Started**: —
- **Status**: `PARKED · unowned-this-cycle` (also depends T02..T03)
- **Spec**: `MVP-AUTH-FIRST §1` row 9 + §4.3 suspend cascade + §4.5 atomic GM-create + `01-auth-identity §1.5` + `SERVICE-CHARTER §2` cross-service contract
- **Dependencies**: T01..T03; tenant-guard (Q-PARENT-01) for status reads from non-super-admin perspective; T07's password helper
- **ADR refs**: 0001, 0007 (Prisma `$transaction`)
- **Gate**: G3

#### Scope
- `GET /api/admin/hotels` — list with tier JOIN, agent_count, user_count
- `POST /api/admin/hotels` — **atomic transaction**: `INSERT hotels` + `INSERT users (role='gm_admin', hotel_id=new.id, must_rotate_password=true)`; generate password BEFORE tx (per spec §4.5)
- `PATCH /api/admin/hotels/:id` — update name/tier/etc.
- `PATCH /api/admin/hotels/:id/status { status: 'suspended' }` — **same-transaction suspend cascade**: `UPDATE sessions SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE hotel_id = $1)` per `MVP-AUTH-FIRST §4.3`
- No hard delete — soft suspend only

---

### T10 — Hotel context + settings

- **Slot**: C (Satrio)
- **Owner**: TBD
- **Started**: —
- **Status**: `PARKED · unowned-this-cycle` (also depends T02..T03)
- **Spec**: `MVP-AUTH-FIRST §1` rows 8 + 10 + `01-auth-identity §1.5` + §5 open-Q (super_admin `/hotels/me` response)
- **Dependencies**: T01..T03; tenant-guard (Q-PARENT-01); T09 (`hotels` writes — read-side here)
- **ADR refs**: 0001, 0007
- **Gate**: G3

#### Scope
- `GET /api/hotels/me` — current user's hotel context `{ id, tier }`. For super_admin (`hotel_id IS NULL`): return `{ id: null, tier: null }` per spec §5 recommended option (b); flag deviation in `docs/spec/open-questions.md` if Slot C disagrees
- `GET /api/settings/hotel` — gm_admin reads own hotel settings (DND, branding, timezone)
- `PUT /api/settings/hotel` — gm_admin updates same fields; tenant-guard prevents cross-hotel writes

<!-- TEMPLATE — copy untuk task baru di queue:

### T## — <Title>

- **Slot**: A | B | C (Parent PM assign)
- **Owner**: TBD (PM <SLOT> pick up via PM-STATUS-<SLOT>.md §2 ASSIGNMENT)
- **Started**: —
- **Status**: queued

#### Scope (dari roadmap / DEVELOPMENT-PLAN bila ada)
- ...

#### Files yang harus dibuat
- ...

#### Files yang akan dimodifikasi
- ...

#### T## DoD
- [ ] ...
- [ ] ...

#### Parent PM notes untuk PM <SLOT>
- Rasionalisasi slot pick: <kenapa A/B/C>
- Dependency: T## (slot X, status)
- Shared-infra risk: <none | flags file/folder shared dengan slot lain>
- Coordination needed with: <slot> for <reason>

-->

---

## 9. Eskalasi rules (recap)

DM PO langsung HANYA bila:

1. Gate (G1..G5) akan miss dalam 24 jam — Parent PM call
2. Open contract Q blocking > 48 jam — consolidated
3. Executor (via PM A/B/C) propose scope/architecture change — Parent PM ratify dulu
4. Forbidden package / pattern muncul di PR (CLAUDE.md §6 / §11)
5. Drift sistemik (>5 hits sejenis di banyak file lintas dev)
6. Security WAJIB (CLAUDE.md §6) tersentuh — Parent PM eskalasi instan

Routine miss / single drift / daily standup → PM-STATUS-{slot} → roll-up
ke §2 / §6 di sini, **bukan** ke PO langsung.

---

## 10. Cross-dev coordination notes

> Parent PM catat hal yang affect > 1 dev: file collision, shared-infra ship sequence, re-balance proposal, dependency unblocking. PM A/B/C boleh propose via §3c (architecture Q).

| Tanggal    | Topic                                                                | Affects     | Action / decision                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-29 | Single-dev cycle 1: only Slot B (Nanak) online                       | A, B, C     | T01..T04 (Slot A foundation) + T08..T10 (Slot C admin surface) marked `PARKED · unowned-this-cycle` in §1. Slot B runs unblock audit on T05..T07 — see §8. If Slot B exhausts READY-PARTIAL scope, escalate to PO for deviation (Slot B absorbs T01..T04). |
| 2026-06-29 | Tenant-guard middleware ownership (Q-PARENT-01)                      | A, B, C     | Charter §3 puts it under Slot A; PO's T01..T04 explicit list excludes it. T05/T06/T07 need it at runtime; T07 soft-blocks SUBMIT-APPROVE without it. Pending PO resolution — see §3c Q-PARENT-01.                                                              |

<!-- Contoh:
2026-06-30 | core/queue/ Bull factory pattern decision | B, C | A ship dulu (T05), B & C unblocked H+1
2026-07-02 | shared/utils/crypto.ts signature change | A, B          | A coord with B; B re-test webhook (T11)
-->

---

## 11. Quick reference — file ownership matrix

| File / Folder                                            | Edit authority                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PM-STATUS-PARENT.md`                                    | Parent PM (full) · PM A/B/C (only append to §2 roll-up & §6 standup; status update for own row in §1)      |
| `PM-STATUS-A.md`                                         | PM A (Nathan) + Executor A (assignment/PLAN/CHECKPOINT/SUBMIT only — append-only)                          |
| `PM-STATUS-B.md`                                         | PM B (Nanak) + Executor B (same)                                                                           |
| `PM-STATUS-C.md`                                         | PM C (Satrio) + Executor C (same)                                                                          |
| `CLAUDE.md`, `PM-AGENT.md`, `EXECUTOR-PROTOCOL.md`, `KICKOFF.md`, `README.md`, `docs/*`, `docs/decisions/*` | Planning agent (with PO ack) · Parent PM (sync update per `PM-AGENT.md §0.6`)                              |
| `src/`, `prisma/migrations/`                             | Executor A/B/C (each in own task scope) — never PM/Parent PM                                               |
| `prisma/schema.prisma`                                   | Executor (in task that touches schema) — never PM (kecuali typo non-semantik)                              |
| `package.json` deps                                      | PO approval via Parent PM eskalasi — no executor adds deps unilaterally                                    |
| `docker-compose.yml`, `Makefile`, env templates          | Executor (in task that touches them); Parent PM consolidate via §4 deviation log                           |
