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
- **Progress (global)**: 0 / 11 tasks approved (T01..T10 from MVP-AUTH-FIRST.md §1 10-row scope + T11 tenant-guard middleware per Q-PARENT-01 resolution).

> **Canonical task source**: `docs/spec/MVP-AUTH-FIRST.md §1` (10-row endpoint scope table) + `docs/SERVICE-CHARTER.md §3` slot routing. T11 added as cross-cutting infra task (Q-PARENT-01 resolution). Backend belum punya `docs/DEVELOPMENT-PLAN.md` formal — MVP-AUTH-FIRST.md adalah source-of-truth Phase 1.
>
> **T01..T11 routing recap** (full rows in §1):
> - **T01..T04 → Slot A (foundation)**: pnpm install verify · initial Prisma migration · tiers seed · seed-super-admin CLI
> - **T05..T07 → Slot B (Auth core)**: `/api/auth/*` · `/api/users` (gm_admin)
> - **T08..T10 → Slot C (Auth admin surface)**: `/api/admin/*` · `/api/hotels/me` · `/api/settings/hotel`
> - **T11 → Slot A canonical, Slot B execution this cycle (per §4 deviation)**: tenant-guard middleware. T07 depends.

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
| T05 | Auth core endpoints: `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` + sessions/JWT/CSRF plumbing | B    | exec-B | `assigned · READY-PARTIAL (unit scope, PO-cleared)` | —           | Spec: `MVP-AUTH-FIRST §1` row 1 + `01-auth-identity §1.1`+§3 sessions table + §6 tenant-guard. Deps: T01 (install) for typecheck; T02 (migration) for integration tests. ADR-0001 (port for password-hash + JWT lib if external), 0006 (Fastify), 0007 (Prisma direct, no repo interface). Gate: **G2/G3**. Audit: schema + service + route shell + unit tests can ship now; integration deferred. PLAN attempt 1 PARTIAL-ACKED 2026-06-29 (PM-STATUS-B.md §2): 2 GAPs PM-internal-approved. Q-B-01 **RESOLVED 2026-06-29** (§3b) — PO approved `argon2`, `@fastify/cookie`, TTL 15m (deviations `§4-D02`/`D03`/`D04`). Executor B unblocked; awaits PM B FULL-ACK + ENOSPC cleanup. |
| T06 | Auth current-user: `GET/PATCH /api/auth/me` + `POST /api/auth/me/password` + `must_rotate_password` per-request gate | B    | —     | `backlog · READY-PARTIAL (unit-only)`           | —           | Spec: `MVP-AUTH-FIRST §1` rows 2–3 + §4.2 + `01-auth-identity §1.1` + §3 must-rotate enforcement. Deps: T01; logical dep on T05 (session lookup); runtime dep on T02. ADR-0001 (password hash port), 0003. Gate: **G2/G3**. Audit: rotation-gate plugin + route shells + service unit tests doable now; e2e flow deferred. |
| T07 | Per-hotel users CRUD: `GET/POST/PATCH /api/users` + `POST /api/users/:id/reset-password` (gm_admin scope) | B    | —     | `backlog · READY-PARTIAL (unit-only) — gated by T11` | —           | Spec: `MVP-AUTH-FIRST §1` row 6 + `01-auth-identity §1.2` + §4.7 email uniqueness + §1.2 server-enforced constraints (role∉{gm_admin,super_admin}, last-gm guard, soft-delete only). Deps: T01; **T11 (tenant-guard) before SUBMIT-APPROVE**; runtime dep on T02 + T03. ADR-0001, 0008. Gate: **G3**. Audit: service + zod schemas + generate-password helper + unit tests doable now with stubbed tenantScope; full SUBMIT needs T11 wired. |
| T08 | Cross-hotel admin users CRUD + Tier catalog read: `/api/admin/users` family + `GET /api/admin/tiers[:name]` | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T04) | —           | Spec: `MVP-AUTH-FIRST §1` rows 5 + 7 + `01-auth-identity §1.3` + §1.4 + §4.6 last-super_admin guard + §4.4 mutual-exclusion. Deps: T01, T02, T03 (tiers exist), T04 (first super_admin to test). ADR-0001, 0008. Gate: **G3**. |
| T09 | Admin hotels CRUD + atomic GM-create + suspend cascade: `/api/admin/hotels` family + `/:id/status`        | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T03) | —           | Spec: `MVP-AUTH-FIRST §1` row 9 + §4.3 suspend cascade + §4.5 atomic GM-create + `01-auth-identity §1.5` + `SERVICE-CHARTER §2`. Single-transaction insert(hotels)+insert(users[gm]) + generate-and-return password. Deps: T01, T02, T03. ADR-0001, 0007 (tx). Gate: **G3**. |
| T10 | Hotel context + settings: `GET /api/hotels/me` + `GET/PUT /api/settings/hotel`                            | C    | —     | `PARKED · unowned-this-cycle` (also depends T02..T03) | —           | Spec: `MVP-AUTH-FIRST §1` rows 8 + 10 + `01-auth-identity §1.5` + §5 super_admin `/hotels/me` open behavior Q (recommend option (b) `{ id:null, tier:null }` per spec). Deps: T01, T02, T03. ADR-0001, 0007. Gate: **G3**. |
| T11 | tenant-guard middleware (Fastify plugin) — inject `req.tenantScope` from JWT + enforce row-level isolation | A    | —     | `backlog · READY-FULL (Slot B execution per §4-D01)` | —           | Spec: `01-auth-identity §6` + `MVP-AUTH-FIRST §4.1` + `SERVICE-CHARTER §3` (Slot A canonical owner). Lives in `src/plugins/` (cross-cutting infra). Deps: T01 (typecheck); full SUBMIT needs T02 (hotel_id columns exist in DB for integration test). ADR-0001 (middleware ≠ port — direct Fastify plugin), 0008 (multi-hotel scoping intent). Gate: **G2**. **Resolves Q-PARENT-01**. **Ownership of record = Slot A**; execution = Slot B this cycle (see `§4-D01`). **T07 depends on T11** ship before SUBMIT-APPROVE. |

---

## 2. Per-dev short-status roll-up (PM A/B/C append, latest di atas)

> Setiap PM A/B/C post **1-2 baris** summary ke sini setelah tiap VERDICT atau end-of-session. Parent PM scan ini untuk daily report. JANGAN paste full SUBMIT/VERDICT di sini — itu tetap di PM-STATUS-{slot}.md.
>
> Format:
> ```
> [YYYY-MM-DD H{N}] [PM <SLOT> <NAME>] <T## status — 1 liner>
> ```

[2026-06-30 cycle 5 open] [PM B Nanak] T07 ASSIGNMENT issued — final Slot B sequence item. Per-hotel users CRUD + tenant-guard FIRST WIRING di api.ts (T11 Amendment 3 deferred wiring now executed). 4 endpoints + last-gm guard + generate-password + email uniqueness. 7 open items for PLAN (module placement, helper placement, soft-delete pre-resolved, pagination, allowlist starter set, reset session handling, response shape). Schema verified at ASSIGNMENT: `User.isActive` + `UNIQUE(hotel_id, email)` exist; AppError reuse heavy (ValidationError/ConflictError/NotFoundError/BusinessRuleError cover all error cases). Single-dev cycle continues. Next event: Executor B PLAN T07 attempt 1. After APPROVE-PARTIAL → Slot B sequence COMPLETE; await T02 batch FULL upgrade.
[2026-06-30 cycle 4 close] [PM B Nanak] T11 APPROVE-PARTIAL — CROSS-SLOT execution per §4-D01 complete; 5/5 commit cross-slot marker compliance verified; coverage 98.9% line overall (plugin 94.44% line target 90% MET); drift zero; 4 DDs accepted; 4 open items resolved (Option A on #1 — defensive branch accept). T05+T06+T11 trio APPROVE-PARTIAL; full APPROVE batch-pending T02. Cycle 5 opens next: T07 (per-hotel users CRUD, wires tenant-guard). Next event: PM B ASSIGNMENT T07 atau Executor B PLAN T07 after pickup.
[2026-06-30 cycle 4] [PM B Nanak] T11 PLAN ACKED — CROSS-SLOT per §4-D01. 0 GAPs, Open #4 ruling confirmed (a) shallow claim only (NO hybrid (c) — handler-side row enforcement per spec §6 scopedTickets pattern). 5 open items + 3 amendments all stances final. File list 3 CREATE + 2 EDIT additive. ETA ~3.5-5h impl→SUBMIT. Executor B moves to feat/auth-core. Next event: SUBMIT block on main.
[2026-06-29 cycle 4 open] [PM B Nanak] T11 ASSIGNMENT issued — CROSS-SLOT execution per §4-D01 (Slot A canonical, Slot B exec one-off). Scope: `src/plugins/tenant-guard.ts` factory plugin + 4-role unit coverage + `TenantScopeViolationError` AppError + types extension. 5 open items for PLAN (allowlist mechanism, deny status code, super_admin bypass scope, hotelId extraction strategy, audit log shape). Wiring deferred to T07. Single-dev cycle continues. Next event: Executor B PLAN T11 attempt 1.
[2026-06-29 cycle 3 close] [PM B Nanak] T06 APPROVE-PARTIAL — 14/14 verify match attempt 2; fix BusinessRuleError 422 applied per spec §1.1; coverage 99.57% line; drift zero; 6 DDs accepted; 3 open items resolved/deferred (2 future-cycle backlog T_AUX_01/02). T05+T06 both APPROVE-PARTIAL; full APPROVE batch-pending T02 ship. Cycle 4 opens next: T11 tenant-guard (cross-slot per §4-D01). Next event: PM B ASSIGNMENT T11 atau Executor B PLAN T11 after pickup.
[2026-06-29 cycle 3] [PM B Nanak] T06 REQUEST-FIX attempt 1 — make check green + coverage 99.56% line + drift zero; spec compliance fix needed (422 BUSINESS_RULE per `01-auth-identity §1.1` line 90 vs impl 401 AuthError). 6 DDs accepted, 3 open items ruled (#1 REQUEST-FIX, #2 DEFER fastify-plugin, #3 CONFIRMED-DEFERRED rate-limit). Executor B to push fix commit on feat/auth-core for attempt 2 (~30-45 min). Next event: SUBMIT T06 attempt 2.
[2026-06-29 cycle 3] [PM B Nanak] T06 PLAN ACKED — 0 GAPs, 2 aux Qs ruled (auth.errors.ts module-scoped + auth.jwt-context.ts helper). File list 4 CREATE + 9 EDIT. ETA ~5-6.5h impl→SUBMIT. Executor B moves to feat/auth-core. Next event: SUBMIT block on main.
[2026-06-29 cycle 3] [PM B Nanak] T06 ASSIGNMENT issued — auth `/me` family + password rotation + `must_rotate_password` per-request gate plugin, unit-only scope, single-dev cycle continues. Branch `feat/auth-core` extends (T06 stacks on T05). Foundation gaps Q-B-02 still parked (workarounds OK). Next event: Executor B PLAN T06 attempt 1.
[2026-06-29 cycle 2] [PM B Nanak] T05 APPROVE-PARTIAL — unit-scope complete (98.56% stmt, 100% line, drift zero, 5 DD accepted, 13/13 independent verifications match). 4 foundation gaps surfaced as Q-B-02 (Slot A territory, no PO needed). Full APPROVE held until T02 ships. Branch `feat/auth-core`, 11 commits ahead of `main` (no merge). Next: Executor B pickup T06 per PM B ruling.
[2026-06-29 cycle 2] [PM B Nanak] T05 FULL-ACK — PLAN attempt 1 cleared, Executor B IMPL-READY. Implementation start pending ENOSPC host-side cleanup. Next event: SUBMIT block in PM-STATUS-B.md §2.
[2026-06-29 cycle 1] [PM B Nanak] T05 ESCALATED — PLAN T05 attempt 1 PARTIAL-ACKED (2 GAPs PM-internal-approved); 3 GAPs need PO ruling (deps install: `argon2` + `@fastify/cookie`; TTL change `JWT_ACCESS_TTL '8h'→'15m'` in `core/config/env.ts` touches Slot A). Raised at PARENT §3b Q-B-01. Executor B HOLD on coding.

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
| Q-B-01        | T05 coding-start blocker bundle (3 sub-items). **(a) Hash lib install**: prefer `argon2 ^0.41.x` (OWASP 2024 + `01-auth-identity §5`); fallback `bcrypt` (per `SECURITY.md §2` baseline cost=12). PO pick. **(b) Cookie plugin install**: `@fastify/cookie ^9.x` (required by `@fastify/jwt ^8` cookie reads — confirmed via `package.json:37`). Hand-roll fallback is high-friction repeated boilerplate; recommend approve. **(c) `JWT_ACCESS_TTL` default `'8h' → '15m'`** in `src/core/config/env.ts:37` — `01-auth-identity §3` ratifies 15-min access vs `SECURITY.md §2` generic 8h floor. Touches Slot A canonical `core/config/` domain (per `SERVICE-CHARTER §3` + `PROJECT_STRUCTURE.md` layer rules) — needs (i) Slot A coord clearance, (ii) doc-sync decision (which spec wins → PM update one of two per `PM-AGENT §0.6`). Cross-ref §3c. | PM B (consolidated from Executor B PLAN T05 attempt 1 GAPs #1+#2+#4) | PM-STATUS-B.md §2 lines 219-222; PM-STATUS-B.md §3 row Q-B-01 | **RESOLVED** 2026-06-29 by PO | (a) **APPROVE** `argon2 ^0.41.x` (bcrypt cost=12 documented fallback). (b) **APPROVE** `@fastify/cookie ^9.x`. (c) **APPROVE** TTL `'8h'→'15m'` in `env.ts:37` + `SECURITY.md §2` doc-sync (`CLAUDE.md §6.4` stays "8 jam" — intentional, boilerplate generic floor for downstream non-auth services). Deviations recorded `§4-D02`, `§4-D03`, `§4-D04`. Executor B unblocked. |

#### Parent PM consolidation + recommendation — Q-B-01 (2026-06-29, awaiting PO ruling)

Verified Executor B's claims independently: `@fastify/jwt ^8.0.1` + `@fastify/rate-limit ^9.1.0` present in `package.json`; `argon2`, `bcrypt`, `@fastify/cookie` absent. PM B PARTIAL-ACK is well-scoped — GAPs #3 (hashToken in `shared/utils/crypto.ts`) + #5 (no JWT hex port — internal `TokenIssuer` only, ADR-0001 alignment) PM-internal-approved cleanly; the escalated three are genuine PO authority items per `CLAUDE.md §11` (package deps) + `SERVICE-CHARTER §3` (cross-slot domain touch).

**Parent PM recommendations to PO** — one ruling unblocks all three:

1. **Sub-item (a) — Hash lib**: ✅ approve `argon2 ^0.41.x` (argon2id default).
   - `01-auth-identity §5` lists `argon2id OR bcrypt(cost=12+)` — both acceptable; spec doesn't force the choice.
   - argon2id is OWASP 2024 top recommendation (memory-hard → GPU/ASIC-resistant); bcrypt remains industry-mature with 14yr track record.
   - Lock-in risk is **low** — PM B's PLAN puts hash behind `PasswordHashPort` (per ADR-0001), so adapter swap is one-file later if argon2 native compile ever breaks an arch.
   - **Fallback option** if PO prefers operational simplicity over forward-looking security: `bcrypt ^5.x` cost=12 — ratify as §4 deviation footnote, same port surface.

2. **Sub-item (b) — Cookie plugin**: ✅ approve `@fastify/cookie ^9.x`.
   - Required by `@fastify/jwt ^8` cookie reads (verified). Ecosystem-standard official Fastify plugin.
   - Hand-roll fallback = `reply.header('Set-Cookie', ...)` × 3 endpoints × 2 cookies (`token`+`refresh`) with manual `Max-Age`/`Path`/`SameSite` parsing — bug magnet, no upside.
   - Zero lock-in concern; pure HTTP plumbing.

3. **Sub-item (c) — TTL change + doc-sync**: ✅ approve `JWT_ACCESS_TTL: '8h' → '15m'` in `src/core/config/env.ts:37`, **as a §4 deviation** (Slot B touches Slot A canonical `core/config/`; ownership of record stays Slot A — same pattern as T11). After PO ruling, **Parent PM updates `docs/SECURITY.md §2`** (per `PM-AGENT §0.6` planning-sync authority) to clarify: "8h access TTL is a generic floor for non-auth services; auth-spec services follow `docs/spec/01-auth-identity.md §3` (15-min access + 30-day refresh)." This resolves the floor-vs-ratification conflict at single source of truth without contradicting either doc.

**If PO approves all 3**: Executor B resumes T05 coding immediately (after ENOSPC cleanup at slot-internal §6); estimated wall-time to SUBMIT per PLAN line 277-280 = ~6-8h. **If PO declines (a)** → swap argon2 → bcrypt, no schedule impact. **If PO declines (b)** → recommend Parent PM push back; T05 effectively blocked on rewrite. **If PO declines (c)** → `JWT_ACCESS_TTL` stays `'8h'`, T05 ships with override via `.env` instead — adds a tiny env-discipline burden but no code-rewrite.

Once ruling lands: §3b Resolution column fills (sub-item by sub-item), §4 deviation row appended for (c) and possibly (a-fallback), Parent PM commits `docs:` planning-sync edit per (c), §1 T05 row status flips back to `READY-PARTIAL (unit-only)`, short roll-up at §2 from PM B after FULL-ACK.

### 3c. Architecture / planning questions

| ID            | Question                                                                                                                                                                                                  | Raised by | Source                                                  | Status | Resolution |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- | ------ | ---------- |
| Q-PARENT-01   | Tenant-guard middleware ownership + sequencing. `SERVICE-CHARTER §3` lists it under Slot A foundation, but PO's explicit T01..T04 list does not include it. T05/T06/T07 (Slot B) all need it at runtime. Should it be (a) added as T0_aux Slot A foundation task, (b) absorbed into T05 (first Slot B endpoint), or (c) inlined as a util in T07 since that's the first hotel-scoped read? | Parent PM | `SERVICE-CHARTER §3` + `MVP-AUTH-FIRST §4.1` + `01-auth §6` | **resolved** 2026-06-29 | **PO ruling**: option (1) — author **T11** as Slot A canonical task (see §1 T11 row); Slot B executes this cycle via §4 deviation (2026-06-29). Rationale: preserve Charter ownership of record, avoid cross-modul leak from inlining, keep tenant-guard as single source of truth for security review (CLAUDE.md §6). |
| Q-PARENT-02   | Doc-sync conflict surfaced by Q-B-01(c): `docs/SECURITY.md §2` (generic 8h JWT access floor) vs `docs/spec/01-auth-identity.md §3` (15-min access ratification for Auth service). Which is canonical, and how do future services know which TTL applies? Cross-cutting because any new sibling service consulting SECURITY.md will inherit the 8h default unless we add the floor-vs-spec-override clarification. | Parent PM (consolidated from Q-B-01(c)) | `SECURITY.md §2` + `01-auth-identity §3` + Q-B-01(c) | **RESOLVED** 2026-06-29 by PO ruling on Q-B-01(c) | Parent PM `docs:` sync edit applied to `docs/SECURITY.md §2` (after line 23): explicit note that 8h is generic non-auth floor; auth-spec services override per `01-auth-identity §3` (15-min + 30-day). Deviation reference `§4-D04` cited inline. `CLAUDE.md §6.4` intentionally NOT amended (boilerplate floor preserved). Single source of truth restored. |

---

## 4. Approved deviations & planning updates (PO-approved)

> Parent PM mencatat tiap perubahan ke planning docs yang dilakukan untuk sync (per `PM-AGENT.md §0.6`), serta deviasi one-off yang di-approve PO. PM A/B/C tidak edit row di sini — propose via §3 atau direct ke Parent PM.

| ID         | Tanggal    | Doc / lokasi                                                       | Perubahan singkat                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Driver task    | Disetujui oleh |
| ---------- | ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------- |
| (pre-D01)  | 2026-06-12 | docker-compose.yml, .env.example, README.md, .claude/settings.json | Shift host port Postgres 5432→5433 & Redis 6379→6380 untuk hindari bentrok dengan service lokal                                                                                                                                                                                                                                                                                                                                                                          | (pre-T01 fix)  | PO             |
| **§4-D01** | 2026-06-29 | PM-STATUS-PARENT.md §1 row T11                                     | **T11 cross-slot execution deviation**: tenant-guard middleware canonical-owned by Slot A per `SERVICE-CHARTER §3`; Slot A PARKED this cycle. Slot B (Nanak) absorbs T11 **execution** as one-off foundation contribution because T07 soft-blocks without it. **Ownership of record stays Slot A**; Slot B SUBMIT carries note "cross-slot execution per §4 deviation §4-D01". Slot A re-takes future tenant-guard amendments. Resolves Q-PARENT-01.                       | T07, T11       | PO             |
| **§4-D02** | 2026-06-29 | `package.json` + `pnpm-lock.yaml`                                  | **`argon2 ^0.41.x` install** (argon2id default per OWASP 2024). Resolves Q-B-01(a). Touched: `package.json` (Slot A territory) — Slot B execution per cycle 1 single-dev constraint. **Fallback recorded**: `bcrypt ^5.x` cost=12 (port surface identical via `PasswordHashPort`; single-file adapter swap if argon2 native compile ever breaks an arch). Implementation: Executor B `pnpm add argon2`.                                                                      | T05            | PO             |
| **§4-D03** | 2026-06-29 | `package.json` + `pnpm-lock.yaml`                                  | **`@fastify/cookie ^9.x` install** — hard dep for `@fastify/jwt ^8` cookie-mode + `reply.setCookie()` ergonomics. Resolves Q-B-01(b). Touched: `package.json` (Slot A territory) — Slot B execution. Hand-roll fallback rejected (boilerplate × 3 endpoints × 2 cookies = bug magnet, no upside). Implementation: Executor B `pnpm add @fastify/cookie`.                                                                                                                       | T05            | PO             |
| **§4-D04** | 2026-06-29 | `src/core/config/env.ts:37`                                        | **`JWT_ACCESS_TTL` default `'8h' → '15m'`**. Resolves Q-B-01(c). Reason: spec `MVP-AUTH-FIRST §3` + `01-auth-identity §3` ratify 15-min access for Auth service; default-restrictive per `CLAUDE.md §14`. Touched: `src/core/config/env.ts` (Slot A foundation territory) — Slot B execution per cycle 1 single-dev constraint, mirrors §4-D01 cross-slot pattern. `CLAUDE.md §6.4` (8h wording) **NOT amended** — intentional, boilerplate generic floor preserved for downstream non-auth services in the Qooma ecosystem. `docs/SECURITY.md §2` clarification appended per Parent PM §0.6 planning-sync (separate `docs:` commit if not bundled). Resolves Q-PARENT-02 simultaneously. | T05            | PO             |

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

### Cycle 1 close — 2026-06-29 (Q-B-01 resolved, T05 unblocked)

```
[2026-06-29 cycle 1] Parent PM: Q-B-01 PO-resolved (all 3 sub-items approve).
  3 deviations logged §4-D02/D03/D04. SECURITY.md §2 doc-sync executed.
  T05 unblocked, Executor B can resume pending ENOSPC cleanup host-side.
  PM B will issue FULL-ACK PLAN T05 next cycle.

📅 Gate status
- G2 in motion — T05 now READY-PARTIAL (PO-cleared); ENOSPC cleanup host-side is gating coding-start, not planning.
- Open contract questions: 0
- Open package questions: 0 (Q-B-01 RESOLVED)
- Open architecture questions: 0 (Q-PARENT-01 + Q-PARENT-02 both RESOLVED)

🎯 Fokus next cycle (Parent PM)
- Idle — await PM B FULL-ACK signal at PARENT §2 roll-up.
- On FULL-ACK: §1 T05 row flips to `wip`; monitor for SUBMIT cadence.
- T06/T11/T07 queued behind T05 per ratified sequence (PARENT §10).
```

### Cycle 1 — 2026-06-29 (single-dev cycle: Slot B only)

```
QOOMA BE PARENT — Standup — cycle 1

Dev A (Nathan) — OFFLINE this cycle. T01..T04 (foundation) PARKED. T11 ownership-of-record stays Slot A; Slot B executes T11 per §4 deviation 2026-06-29.
Dev B (Nanak)  — T05 ASSIGNMENT issued + PLAN attempt 1 PARTIAL-ACKED in same cycle. 2 GAPs PM-internal-approved, 3 GAPs escalated as Q-B-01 (deps + TTL). Executor HOLD pending PO ruling.
Dev C (Satrio) — OFFLINE this cycle. T08..T10 (admin surface) PARKED.

📅 Gate status
- Next gate: G2 (Auth module ready) — depends on T05+T06+T11 ship. T05 in flight; gate status: in motion, no calendar pressure (criteria-based per PO ruling 2026-06-29).
- Open contract questions: 0
- Open package questions: 1 (Q-B-01, escalated to PO 2026-06-29)
- Open architecture questions: 1 (Q-PARENT-02, gated on Q-B-01(c))

🚨 Eskalasi ke PO
- Q-B-01 ruling — 3 sub-items (deps install ×2 + TTL change). See §3b for Parent PM consolidation + 3 recommendations. One PO pass unblocks Executor B for ~6-8h T05 implementation runway.

🎯 Fokus besok (cross-dev)
- PO ruling lands → PM B FULL-ACK PLAN T05 → Executor B resumes coding (post-ENOSPC cleanup).
- If PO declines (a)+(b) → revisit; if PO declines only (c) → unblock with `.env` override path, no rewrite.
- Cadence note: 1 ASSIGNMENT → 1 PLAN → ESCALATION inside cycle 1 = healthy. Multi-PM file-based protocol holding under load.
```

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

### Unblock audit — Slot B (cycle 1, 2026-06-29, updated post-Q-PARENT-01 resolve)

Per PO ruling: only Slot B (Nanak) online this cycle. Audited T05..T07 + T11 against parked T01..T04 (Slot A foundation):

```
Unblock audit Slot B (cycle 1):
  T05 (auth core endpoints)        — READY-PARTIAL (unit scope: schema + service + route shell + JWT/CSRF plumbing unit tests)
  T06 (auth current-user + rotate) — READY-PARTIAL (unit scope: rotation-gate plugin + service unit tests; e2e deferred)
  T11 (tenant-guard middleware)    — READY-FULL (Slot B via §4 deviation; plugin shell + unit tests doable now; integration test placeholder until T02)
  T07 (users CRUD gm_admin)        — READY-PARTIAL (unit scope: gated by T11 ship — Slot B sequences T11 before T07 full SUBMIT)
```

**Slot B cycle 1 sequence (PO-ratified)**: **T05 → T06 → T11 → T07**.

**Integration-test scope deferred** for all four until T02 (initial migration) ships. Q-PARENT-01 RESOLVED — T11 added as canonical Slot A task, Slot B executes per §4 deviation.

Slot C (T08..T10): not audited this cycle — no Slot C exec/PM session online (`PARKED · unowned-this-cycle`).

If Slot B exhausts READY-PARTIAL scope on T05/T06/T07 + T11 before T01..T04 unparks, escalate back to PO for further deviation decision (Slot B absorbs T01..T04 as one-off, recorded in §4 with reason "single-dev cycle; foundation bootstrap absorbed by Slot B").

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

### T11 — tenant-guard middleware (Fastify plugin)

- **Slot**: A (canonical, per `SERVICE-CHARTER §3`)
- **Execution this cycle**: B (Nanak) per §4 deviation 2026-06-29
- **Owner**: TBD (PM B claims via PM-STATUS-B.md §2 ASSIGNMENT with cross-slot execution note)
- **Started**: —
- **Status**: `READY-FULL (Slot B execution per §4 deviation)`
- **Spec**: `docs/spec/01-auth-identity.md §6` (pseudocode) + `docs/spec/MVP-AUTH-FIRST.md §4.1` (critical-correctness check) + `SERVICE-CHARTER §3` (ownership)
- **Dependencies**: T01 (typecheck environment). **No hard dep** — plugin shell + unit tests authorable now against typed JWT claim shape. Integration test needs T02 (`hotels` + `users` tables exist).
- **ADR refs**: 0001 (middleware is **NOT** a port — direct Fastify plugin per Hexagonal Disiplin "TIDAK pakai port" list), 0008 (multi-hotel scoping intent — `hotel_id` is intra-service FK after H11)
- **Gate**: **G2**
- **Resolves**: Q-PARENT-01

#### Scope
- Fastify plugin at `src/plugins/tenant-guard.ts` (or `src/plugins/tenant-guard/` if it grows). Registered globally in `src/entrypoints/api.ts`.
- Reads JWT from httpOnly cookie (delegate verify to T05's auth plumbing — coordinate at PLAN; if T05 hasn't shipped JWT verify util, T11 ships its own lightweight verify and T05 reuses).
- Sets `req.session = { user_id, role, hotel_id, dept_id }` per `01-auth-identity §6`.
- Sets `req.tenantScope`:
  - `super_admin` → `{ type: 'all-hotels' }` (bypass `WHERE hotel_id = ...`)
  - else → `{ type: 'single-hotel', hotel_id: session.hotel_id }`
- **Deny-by-default**: missing/invalid cookie → `401 UNAUTHENTICATED` per `AppError` hierarchy.
- Route-opt-out mechanism for public endpoints (`POST /api/auth/login` should NOT trip the guard) — Fastify per-route hook OR plugin `excludeRoutes` config. Slot B picks pattern in PLAN.

#### Files (suggested — Slot B finalizes in PLAN)
- `src/plugins/tenant-guard.ts` — the plugin
- `src/plugins/__tests__/tenant-guard.test.ts` — unit tests
- `src/entrypoints/api.ts` — wire plugin (modify)
- (optional) `src/shared/types/session.ts` — `Session` + `TenantScope` types if not yet defined

#### T11 DoD (full)
- [ ] Plugin authored + registered in `api.ts`
- [ ] `req.session` + `req.tenantScope` populated correctly for all 4 roles (super_admin, gm_admin, dept_head, staff)
- [ ] Public routes (login, healthcheck) bypass the guard cleanly
- [ ] Unit tests cover: valid cookie → next() · invalid cookie → 401 · missing cookie → 401 · super_admin bypass scope · gm_admin/dept_head/staff single-hotel scope
- [ ] Integration test placeholder file exists with `it.todo()` referencing T02 dependency (so T02 ship triggers fill-in)
- [ ] Security floor (CLAUDE.md §6): deny-by-default, no PII in logs, correlation ID propagated
- [ ] `make check` green
- [ ] No `any`, no `console.log`, `throw AppError` (UnauthorizedError / AuthError)

#### Parent PM notes for PM B
- **Cross-slot execution per §4 deviation 2026-06-29** — note this verbatim in ASSIGNMENT block when claiming. Ownership of record stays Slot A; Slot B execution only this cycle.
- **Sequence**: T05 → T06 → T11 → T07. T05/T06 don't require T11 for their endpoints (login is public; `/me` authenticates via session cookie directly, can read user from JWT without scoped queries). T07 absolutely needs T11.
- Coordinate JWT verify util with T05 — duplication is worse than tight coupling here. If T05 already shipped a `verifyJwt()` helper, T11 imports it; otherwise T11 ships first and T05 imports.
- Plugin registration order in `api.ts`: tenant-guard AFTER cookie parser, BEFORE route plugins.

---

### T07 — Per-hotel users CRUD (gm_admin scope)

- **Slot**: B (Nanak)
- **Owner**: TBD
- **Started**: —
- **Status**: `READY-PARTIAL (unit-only) — gated by T11`
- **Spec**: `MVP-AUTH-FIRST §1` row 6 + `01-auth-identity §1.2` + §4.7 email uniqueness + §1.2 server-enforced constraints
- **Dependencies**: T11 (must ship before T07 SUBMIT-APPROVE); runtime T02 + T03
- **ADR refs**: 0001, 0008 (`users.dept_id` opaque UUID — Hotel Core's `departments` table not yet shipped, treat as nullable+unenforced)
- **Gate**: G3

#### Scope
- `GET /api/users` — list within own hotel; query params `role`, `dept_id`, `is_active`
- `POST /api/users` — create dept_head/staff; reject `role ∈ {gm_admin, super_admin}` with 400; generate-and-return password (16-char alphanumeric+symbols); set `must_rotate_password: true`
- `PATCH /api/users/:id` — update name/role/dept_id/is_active/language; email immutable; last-gm guard
- `POST /api/users/:id/reset-password` — regenerate + return; set `must_rotate_password: true`
- `users.dept_id` validation: opaque UUID, nullable, no FK check at this layer (Hotel Core owns departments)

#### Parent PM notes for PM B
- Generate-password helper: 16-char alphanumeric+symbols, crypto-secure. Add to `src/shared/utils/password.ts` or modul-scoped helper — PLAN decides. Coordinate with T05 (logout/refresh uses session table) and T08 (`/api/admin/users` reuses helper).
- Tenant-guard: ships in **T11** (Q-PARENT-01 resolved). T07 routes WIRE the T11 plugin; unit tests stub `req.tenantScope = { type: 'single-hotel', hotel_id: '<uuid>' }` for handler-level testing. **T11 must SUBMIT-APPROVE before T07 SUBMIT** — sequence enforced.

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
| 2026-06-29 | Single-dev cycle 1: only Slot B (Nanak) online                       | A, B, C     | T01..T04 (Slot A foundation) + T08..T10 (Slot C admin surface) marked `PARKED · unowned-this-cycle` in §1. Slot B runs unblock audit on T05..T07 + T11 — see §8. If Slot B exhausts READY-PARTIAL scope, escalate to PO for further deviation (Slot B absorbs T01..T04).                                                                |
| 2026-06-29 | Tenant-guard middleware ownership (Q-PARENT-01)                      | A, B, C     | **RESOLVED**: PO ruling option (1) — T11 authored as Slot A canonical task (see §1). Slot B executes T11 this cycle per §4 deviation. Charter ownership preserved.                                                                                                                                                                       |
| 2026-06-29 | Slot B cycle 1 execution sequence (PO-ratified)                      | B           | **T05 → T06 → T11 → T07**. T05/T06 don't need T11 (login public, `/me` reads user from JWT directly). T11 before T07 because T07 wires tenant-guard. Integration tests across all four deferred until T02 ships. T07 SUBMIT-APPROVE blocked until T11 APPROVED.                                                                          |
| 2026-06-29 | Q-B-01 in flight: T05 coding-start blocked on PO ruling (deps + TTL) | B (+ A doc sync) | Executor B HOLD; PM B PARTIAL-ACKED PLAN T05 attempt 1, 3 GAPs bundled to §3b Q-B-01 + cross-ref §3c Q-PARENT-02 (doc-sync). Parent PM recommendations posted under §3b table — single PO ruling unblocks all three (approve `argon2`+`@fastify/cookie` install, approve TTL 8h→15m as §4 deviation, then Parent PM `docs:` sync edit on `SECURITY.md §2`). Side blocker (ENOSPC) logged at PM-STATUS-B.md §6 — slot-internal, no escalation. |
| 2026-06-29 | Q-B-01 RESOLVED + Q-PARENT-02 RESOLVED                               | B (+ A doc sync) | PO approved all 3 sub-items: `argon2 ^0.41.x` (§4-D02), `@fastify/cookie ^9.x` (§4-D03), `JWT_ACCESS_TTL '8h'→'15m'` (§4-D04). `docs/SECURITY.md §2` doc-sync edit applied by Parent PM (after line 23 — 8h floor + auth-spec override note). `CLAUDE.md §6.4` intentionally untouched. T05 row status `READY-PARTIAL (PO-cleared)`. Executor B unblocked pending PM B FULL-ACK + host ENOSPC cleanup. |

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
