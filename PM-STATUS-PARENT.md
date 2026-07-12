# PM-STATUS-PARENT — Qooma Backend (cross-dev roll-up)

## 🔄 INTEGRATION HANDOVER — 2026-07-13 (Dev A) — full cross-repo board: FE `docs/INTEGRATION-STATUS.md`

**Auth ↔ FE integration: ✅ COMPLETE (Dev A).** Branch `fix/auth-cookie-cross-subdomain` (2 commits, locally green — **318 unit tests** — NOT pushed; PO pushes):

- **`COOKIE_DOMAIN`** (configurable) added to the `token`/`refresh` cookies. Auth already had SameSite=None + CORS for cross-origin staging, but the **host-only cookie never reached core/integration/ai-staging → core 401**. This unblocks cross-origin auth once the env is set.
- **`must_rotate_password`** added to the `AuthUser` response (login/me/refresh) — the FE reads it to force the rotate-password flow.

**🔧 Dev C (Satrio) — staging env BLOCKER:** set `COOKIE_DOMAIN=.sharedisini.com` + ensure `CORS_ORIGIN` includes `https://frontend-qooma-hotel-ai.vercel.app`, then deploy. Without this, core stays 401 even though it is wired. **No open Dev B tasks in this repo.**

---

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
- **Phase**: **Cycle 8+ — Slot C absorption active** (PO ruling 2026-06-30). Slot A foundation closing + Slot B/A admin endpoint execution running in parallel under cross-slot deviations `§4-D07/D08/D09`. Slot B sequence COMPLETE through cycle 7 (T05/T06/T07/T11 + T02-sub-1 all FULL APPROVED on `feat/auth-core`).
- **Active gate**: G1 closing (T03 + T04 pending on Slot A) · **G3 actively in flight via §4-D07/D08/D09** (Slot C admin surface absorbed to A+B).
- **Active devs (this cycle)**:
  - **Slot A (Nathan)** ONLINE — current: T04 finishing, then chain **T09** (cross-slot per `§4-D08`, ~8h). Q-A-04 (`tsc-alias`) queued post-T03/T04, non-blocking T09.
  - **Slot B (Nanak)** ONLINE — Slot B canonical sequence COMPLETE; current: pickup **T10** first (cross-slot per `§4-D09`, ~3h, no blocker), then **T08** (cross-slot per `§4-D07`, ~6h, after Slot A T04 ship).
  - **Slot C (Satrio)** OFFLINE — busy other repo; canonical ownership of T08/T09/T10 preserved via audit-trail footers; re-onboarding inherits absorption history.
- **Progress (global)**: 5 / 11 FULL APPROVED (T05+T06+T07+T11+T02-sub-1 per cycle 7 close batch); 6 in-flight or queued (T01/T02-sign-off/T03/T04 Slot A · T08/T09/T10 cross-slot per absorption).

> **Canonical task source**: `docs/spec/MVP-AUTH-FIRST.md §1` (10-row endpoint scope table) + `docs/SERVICE-CHARTER.md §3` slot routing. T11 added as cross-cutting infra task (Q-PARENT-01 resolution). Backend belum punya `docs/DEVELOPMENT-PLAN.md` formal — MVP-AUTH-FIRST.md adalah source-of-truth Phase 1.
>
> **T01..T11 routing recap (post Slot C absorption 2026-06-30 — full rows in §1)**:
> - **T01..T04 → Slot A (foundation, canonical)**: pnpm install verify · initial Prisma migration (T02 exec by Slot B via §4-D05, Slot A adopt as canonical) · tiers seed · seed-super-admin CLI
> - **T05..T07 → Slot B (Auth core, canonical)**: `/api/auth/*` · `/api/users` (gm_admin) — all FULL APPROVED
> - **T08..T10 → Slot C canonical, A+B execution via Slot C absorption 2026-06-30**:
>   - T08 → Slot B exec (per `§4-D07`, ~6h)
>   - T09 → Slot A exec (per `§4-D08`, ~8h)
>   - T10 → Slot B exec (per `§4-D09`, ~3h)
> - **T11 → Slot A canonical, Slot B execution (per `§4-D01`)**: tenant-guard middleware — FULL APPROVED.

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
| T01 | pnpm install verify + `make check` green on bootstrap                                                    | A    | exec-A | ✅ `approved` (PM A, 2026-06-30, attempt 1) | **PM A** | Spec: pre-G1 foundation. Deps: none. ADR-0002/0003. Gate: **G1**. Verified on `feat/auth-core` @ `25d2007`: install frozen/no-churn · 5 tables migrated (PM A independent psql check) · make-equiv check green (155 tests incl live smoke). **GAP T01-#1**: `make` binary absent on host → ratified Option A (underlying recipe ≡; CI runs literal make). |
| T02 | Initial Prisma migration: tiers + hotels + users + sessions + password_reset_tokens (mutual-exclusion CHECK + UNIQUE(hotel_id,email)) | A (canonical) · B (execution per §4-D05) | exec-B | `assigned · READY-FULL (cross-slot per §4-D05, Slot B execution)` | —           | Spec: `MVP-AUTH-FIRST §3` steps 1–5 + `01-auth-identity §3` SQL. Deps: T01 (implicitly satisfied via cycle 2 `pnpm add` work). ADR-0004 (1 svc=1 DB), 0007 (Prisma). Gate: **G1**. Schema already authored at `prisma/schema.prisma`; this task = generate first migration via `prisma migrate dev` + apply locally. **Cross-slot deviation `§4-D05` (PO 2026-06-30)**: Slot A canonical, Slot B execution one-off — **T02 ship unblocks batch FULL APPROVE of quartet T05+T06+T11+T07** (all APPROVE-PARTIAL after cycle 5 close). Resolves Q-B-02(b) (`prisma-client.ts` placeholder) inline. Full scope + DoD in §8 T02 detail block. **Slot A canonical ADOPTED 2026-06-30 (PM A)** — ownership-of-record affirmed; all constraints verified (UNIQUE/FK ON DELETE/mutual-exclusion CHECK proven live); NO re-exec. PM B retains execution-status for batch FULL APPROVE + merge. |
| T03 | Tiers seed (4 rows: lite/professional/luxury/enterprise per config table)                                | A    | exec-A | ✅ `approved` (PM A, 2026-06-30) — **MERGE-READY** | **PM A** | Spec: `MVP-AUTH-FIRST §3` step 1 + `01-auth-identity §1.4`. PM A independently re-verified: seed 4 exact rows + idempotent (DB-queried) · typecheck+lint clean · 152 unit + 35 integ · dev:api LISTENING :3000. `features:{}` per Q-A-02. **Detour**: GAP T03-#2 (`.prisma/client` ESM crash) → fix = Option A tsconfig path (my @prisma/client ruling withdrawn on exec rebuttal). **Merge branch `fix/prisma-client-tsx-resolve`** (Nathan merges). Prod-dist boot = Q-A-04 (`tsc-alias`, queued). T04 active. |
| T04 | `seed-super-admin` CLI (`pnpm seed:super-admin`)                                                         | A    | exec-A | ✅ `approved` (PM A, 2026-06-30) — **MERGE-READY** | **PM A** | PM A independently verified: CLI exit 0 · 1 row (super_admin/hotel_id NULL/must_rotate=false) · argon2 login-compat (verify=true) · idempotent (Q-OPS-01) · fail-clean (exit 1, no pw leak) · 152 unit + 37 integ. must_rotate=false ruled (Q-OPS-01 break-glass). **Merge branch `feat/seed-super-admin` @ `c7a7e76`** (Nathan merges). **CLOSES Slot A foundation (T01–T04 + adopt-T02/T11).** |
| T05 | Auth core endpoints: `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` + sessions/JWT/CSRF plumbing | B    | exec-B | `assigned · READY-PARTIAL (unit scope, PO-cleared)` | —           | Spec: `MVP-AUTH-FIRST §1` row 1 + `01-auth-identity §1.1`+§3 sessions table + §6 tenant-guard. Deps: T01 (install) for typecheck; T02 (migration) for integration tests. ADR-0001 (port for password-hash + JWT lib if external), 0006 (Fastify), 0007 (Prisma direct, no repo interface). Gate: **G2/G3**. Audit: schema + service + route shell + unit tests can ship now; integration deferred. PLAN attempt 1 PARTIAL-ACKED 2026-06-29 (PM-STATUS-B.md §2): 2 GAPs PM-internal-approved. Q-B-01 **RESOLVED 2026-06-29** (§3b) — PO approved `argon2`, `@fastify/cookie`, TTL 15m (deviations `§4-D02`/`D03`/`D04`). Executor B unblocked; awaits PM B FULL-ACK + ENOSPC cleanup. |
| T06 | Auth current-user: `GET/PATCH /api/auth/me` + `POST /api/auth/me/password` + `must_rotate_password` per-request gate | B    | —     | `backlog · READY-PARTIAL (unit-only)`           | —           | Spec: `MVP-AUTH-FIRST §1` rows 2–3 + §4.2 + `01-auth-identity §1.1` + §3 must-rotate enforcement. Deps: T01; logical dep on T05 (session lookup); runtime dep on T02. ADR-0001 (password hash port), 0003. Gate: **G2/G3**. Audit: rotation-gate plugin + route shells + service unit tests doable now; e2e flow deferred. |
| T07 | Per-hotel users CRUD: `GET/POST/PATCH /api/users` + `POST /api/users/:id/reset-password` (gm_admin scope) | B    | —     | `backlog · READY-PARTIAL (unit-only) — gated by T11` | —           | Spec: `MVP-AUTH-FIRST §1` row 6 + `01-auth-identity §1.2` + §4.7 email uniqueness + §1.2 server-enforced constraints (role∉{gm_admin,super_admin}, last-gm guard, soft-delete only). Deps: T01; **T11 (tenant-guard) before SUBMIT-APPROVE**; runtime dep on T02 + T03. ADR-0001, 0008. Gate: **G3**. Audit: service + zod schemas + generate-password helper + unit tests doable now with stubbed tenantScope; full SUBMIT needs T11 wired. |
| T08 | Cross-hotel admin users CRUD + Tier catalog read: `/api/admin/users` family + `GET /api/admin/tiers[:name]` | C (canonical) · B (execution per §4-D07) | exec-B | `assigned · READY-PARTIAL (unit-only, full SUBMIT pending T04 ship)` | — | Spec: `MVP-AUTH-FIRST §1` rows 5 + 7 + `01-auth-identity §1.3` + §1.4 + §4.6 last-super_admin guard + §4.4 mutual-exclusion. Deps: T01 (implicit), T02 (cross-slot via §4-D05 — done by Slot B), T03 (tiers exist — Slot A pickup), T04 (first super_admin — Slot A pickup, gates full SUBMIT). ADR-0001, 0008. Gate: **G3**. **Cross-slot deviation `§4-D07` (PO 2026-06-30)**: Slot C canonical, Slot B execution one-off — Slot C (Satrio) offline, T07 pattern extension. ~6h ETA. Slot B sequencing recommendation: T10 first (READY-FULL, no blocker), T08 second (after T04 ship). |
| T09 | Admin hotels CRUD + atomic GM-create + suspend cascade: `/api/admin/hotels` family + `/:id/status`        | C (canonical) · A (execution per §4-D08) | exec-A | ✅ `approved` (PM A, 2026-07-01) — **MERGE-READY** `feat/admin-hotels` @ `b8af385` | **PM A** | Spec: `MVP-AUTH-FIRST §1` row 9 + §4.3 suspend cascade + §4.5 atomic GM-create + `01-auth-identity §1.5` + `SERVICE-CHARTER §2`. Single-transaction insert(hotels)+insert(users[gm]) + generate-and-return password + same-tx `UPDATE sessions SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE hotel_id = $1)` on suspend. Deps: T01 (Slot A own), T02 (cross-slot via §4-D05 — Slot A adopts as canonical), T03 (tiers — Slot A own), T04 (Slot A own — closes first; T09 chains after). ADR-0001, 0007 (Prisma `$transaction`). Gate: **G3**. **Cross-slot deviation `§4-D08` (PO 2026-06-30)**: Slot C canonical, Slot A execution one-off — Slot C (Satrio) offline, foundation/tx expertise match (aligns with Nathan's T02/T03 pattern). ~8h ETA. Queue after Slot A T04 close. Q-A-04 (tsc-alias) NOT blocking. |
| T10 | Hotel context + settings: `GET /api/hotels/me` + `GET/PUT /api/settings/hotel`                            | C (canonical) · B (execution per §4-D09) | exec-B | `assigned · READY-FULL (no upstream blocker)` | — | Spec: `MVP-AUTH-FIRST §1` rows 8 + 10 + `01-auth-identity §1.5` + §5 super_admin `/hotels/me` open-Q (recommend option (b) `{ id:null, tier:null }` per spec). Deps: T01 (implicit), T02 (cross-slot via §4-D05 — done by Slot B), T11 (tenant-guard — Slot B canonical exec done). ADR-0001, 0007. Gate: **G3**. **Cross-slot deviation `§4-D09` (PO 2026-06-30)**: Slot C canonical, Slot B execution one-off — Slot C (Satrio) offline, mirrors T06 `/me` pattern. ~3h ETA. **Slot B START HERE FIRST** (no blocker; warm-up before T08). |
| T11 | tenant-guard middleware (Fastify plugin) — inject `req.tenantScope` from JWT + enforce row-level isolation | A    | —     | `backlog · READY-FULL (Slot B execution per §4-D01)` | —           | Spec: `01-auth-identity §6` + `MVP-AUTH-FIRST §4.1` + `SERVICE-CHARTER §3` (Slot A canonical owner). Lives in `src/plugins/` (cross-cutting infra). Deps: T01 (typecheck); full SUBMIT needs T02 (hotel_id columns exist in DB for integration test). ADR-0001 (middleware ≠ port — direct Fastify plugin), 0008 (multi-hotel scoping intent). Gate: **G2**. **Resolves Q-PARENT-01**. **Ownership of record = Slot A**; execution = Slot B this cycle (see `§4-D01`). **T07 depends on T11** ship before SUBMIT-APPROVE. **Slot A canonical ADOPTED 2026-06-30 (PM A)** — code clean (AppError/structured-log/role-scopes verified); **invariant recorded**: pass-through-on-missing-cookie requires upstream jwt-auth on protected routes else fail-open (see §3c Q-A-01 + PM-STATUS-A §6). NO re-exec. |

---

## 2. Per-dev short-status roll-up (PM A/B/C append, latest di atas)

> Setiap PM A/B/C post **1-2 baris** summary ke sini setelah tiap VERDICT atau end-of-session. Parent PM scan ini untuk daily report. JANGAN paste full SUBMIT/VERDICT di sini — itu tetap di PM-STATUS-{slot}.md.
>
> Format:
> ```
> [YYYY-MM-DD H{N}] [PM <SLOT> <NAME>] <T## status — 1 liner>
> ```

[2026-07-01 cycle 9 close] [PM B Nanak] T08 FULL APPROVE direct — 🏁 SLOT C ABSORPTION 3/3 COMPLETE. CROSS-SLOT execution per §4-D07 (LAST Slot C absorption); 16/16 cross-slot footer audit + JSDoc §4-D07 di 5 files; make check 305 unit + 65 integration pass; coverage T08 aggregate ~92% line (routes 100%, service 94.02%, schema 100%, repo 86.79% via integration); schema-diff EMPTY; boundary zero violations; spec-pinned (assertSuperAdminScope all 6 endpoints, $transaction last-super_admin guard mirror T07, zod.refine mutual-exclusion at parse, handler-level email pre-check for NULL uniqueness). 3 ACK-sequence deviations acked (types+api-wire combined per T10, hasher-mock lint fix per T09 precedent, +1 repo integration coverage lift per T10 precedent). Slot C absorption progress: 3/3 COMPLETE (T09 ✓ Slot A PR#6, T10 ✓ Slot B PR#7, T08 ✓ Slot B this VERDICT). Branch feat/slot-c-absorption-b-t08 (16 commits) READY for PR#8 merge to main. **Slot B ALL MANDATORY TASKS DONE per current PARENT §1 queue**. Optional: Q-A-07 login suspended-hotel check (non-urgent future scope; auth.service T05 territory). PM B recommend `git merge --no-ff` per PR#6/PR#7 established pattern (preserve 16 commits + 16 §4-D07 footers + 5 JSDoc markers).
[2026-07-01 cycle 9] [PM B Nanak] T08 PLAN ACKED — CROSS-SLOT per §4-D07 LAST Slot C absorption. 0 GAPs, 5 open items confirmed verbatim (SEPARATE modules admin/users + admin/tiers, INLINE assertSuperAdminScope helper per-service, $transaction last-super_admin guard mirror T07 pattern, zod.refine mutual-exclusion at parse time, handler-level findByEmailForSuperAdminCheck pre-check for NULL uniqueness). File list 19 CREATE + 2 EDIT (admin/tiers 9 files — no integration test needed on read-only T03 seed; sound consolidation). 5-file JSDoc §4-D07 extension: admin-users.routes/service/repo/types + admin-tiers.routes (mirror T10 4-file precedent extended for 2-module scope). ETA ~6-8h impl→SUBMIT. Executor B moves to NEW `feat/slot-c-absorption-b-t08`. FULL APPROVE convention direct. Next event: SUBMIT block on main.
[2026-07-01 cycle 9 open] [PM B Nanak] T08 ASSIGNMENT issued — CROSS-SLOT execution per §4-D07 (Slot C canonical, Slot B exec one-off; **LAST Slot C absorption 3/3** per PO ruling 2026-06-30). Scope: 6 endpoints (admin users CRUD × 4 per spec §1.3 + tier catalog GET × 2 per spec §1.4) + new `src/modules/admin/users/` + `src/modules/admin/tiers/` modules. **T04 shipped (PR#4 merged) → dependency SATISFIED → FULL APPROVE convention direct** (no PARTIAL holding pattern needed per PARENT §4-D07 note). Heavy pattern reuse: T07 users module scaffold + T09 admin/* naming + T07 last-gm-admin tx guard mirrored for last-super_admin + generatePassword + AppError inventory (zero new subclasses). 5 open items for PLAN (module split admin/users vs admin/tiers, super_admin scope helper location, last-super_admin tx atomicity, mutual-exclusion validation location, email uniqueness NULL hotel_id behavior). ETA ~6-8h. Branch: NEW `feat/slot-c-absorption-b-t08` from main HEAD `fc4e257` (post PR#7 T10 merge). Cross-slot ceremony §4-D07 footer every commit + JSDoc header markers (mirror T10 §4-D09 4-file extension precedent). Next event: Executor B PLAN T08 attempt 1.
[2026-07-01 cycle 8 close] [PM B Nanak] T10 FULL APPROVE direct — CROSS-SLOT execution per §4-D09 complete; 8/8 cross-slot footer audit + JSDoc §4-D09 di 4 files (routes mandatory + service+repo+types bonus extensions); make check 225 unit + 48 integration pass; coverage hotels aggregate 96.87% line (routes 100%, service 95.83%, schema 100%, repo 94.44%); schema-diff EMPTY; boundary zero violations; spec-pinned (super_admin option (b) literal, zod.strict PUT whitelist, gm_admin gating service-layer both GET+PUT, wiring order preserved Q-A-01 invariant). 3 ACK-sequence deviations acked (types-before-routes, routes+wiring combined, +1 integration commit for coverage floor). **Slot C absorption progress: 2/3 COMPLETE** (T10 ✓ Slot B, T09 ✓ Slot A merged PR#6, T08 Slot B next cycle 9). Branch feat/slot-c-absorption-b (8 commits) READY for PR merge to main. PM B recommend `git merge --no-ff` per BATCH VERDICT cycle 7 pattern (preserve 8 commits + §4-D09 footer evidence). Next event: PR#7 creation + T08 ASSIGNMENT cycle 9 setup.
[2026-07-01 cycle 8] [PM B Nanak] T10 PLAN ACKED — CROSS-SLOT per §4-D09. 0 GAPs, 4 open items confirmed (Hotel direct cols PRE-RESOLVED, super_admin option (b), zod.strict PUT whitelist, simple PUT no ETag). Bonus: Executor probed GET /settings/hotel role gating → gm_admin only per spec §1.5 line 200 (matches PUT). Cross-slot ceremony: §4-D09 footer every impl commit + JSDoc on hotels.routes.ts (Executor extends to service + repo for clarity). Acknowledged main moved during PLAN authoring (Slot A T09 PR#6 + tsc-alias PR#5 merged); Executor branches from CURRENT main (cac8d6e) not PLAN-snapshot 64470a4. ETA ~3-5h impl→SUBMIT. Executor B moves to NEW `feat/slot-c-absorption-b`. Next event: SUBMIT block on main. FULL APPROVE convention direct.
[2026-07-01 cycle 1·A] [PM A Nathan] **🏁 SLOT A COMPLETE — Dev A IDLE/STANDBY.** Verified git: **all 6 PRs merged to main** (PR#1 auth-core · PR#2/#3 T03 · PR#4 T04 · PR#5 TF-01 tsc-alias · PR#6 T09 admin-hotels). Slot A queue EMPTY. **Reconciled stale planning-agent feedback** (2026-07-01): it assumed tsc-alias still TODO (→ merged PR#5), T03/T04/T09 merge-ready-on-HOLD (→ all merged PR#2–6), HOLD-until-feat/auth-core-lands (→ landed PR#1 day 1). All corrected. T08/T10 = Slot B (untouched by A, agreed). Dev A standby for next assignment after Slot B done. Open to PO: Q-A-02/06/07 (not Slot A tasks). 2 non-blocking chores noted (dup-email rollback test; `test:coverage --runInBand`).
[2026-07-01 cycle 1·A] [PM A Nathan] **T09 APPROVED** (admin hotels CRUD, §4-D08 cross-slot) — PM A verified atomic-tx by code+tests: interactive `$transaction` (pw-before-tx §4.5), genuine forced-rollback test (no orphan hotel/GM), same-tx suspend cascade revoke (§4.3); 175 unit + 41 integ / 0 fail; coverage routes/schema 100% service 98% (repo excluded per convention). `agent_count:0` (Q-A-06)/user_count real; email-collision→409. **MERGE-READY** `feat/admin-hotels` @ `b8af385` (Nathan merges — LAST Slot A item). **🏁 SLOT A SCOPE COMPLETE** (T01–T04 + adopt-T02/T11 + TF-01 + T09). Ownership-of-record T09 stays Slot C. Minor follow-ups (non-blocking): dup-email rollback test (hardening); `test:coverage --runInBand` chore (shared jest config → Parent/Slot B). Open to PO: Q-A-02/06, Q-A-07 (not Slot A tasks).
[2026-06-30 cycle 1·A] [PM A Nathan] **T09 PLAN ACKED** (admin hotels CRUD, §4-D08 cross-slot) — shapes verified vs `API-CONTRACT §2.14` (list `{data,meta}`, POST `{hotel,gm_user,generated_password}`, gm_contact JSONB, atomic tx §4.5, suspend cascade §4.3). GAP rulings: #1 `agent_count=0` MVP (**Q-A-06** → PO; user_count real) · #2 tier-FK-only no cap-enforce · #3 §4.6 N/A to T09 (correct). **⚠️ Flagged Q-A-07** (→ Parent/Slot B): auth login has NO suspended-hotel check (grepped, 0 hits) → AC §5 "re-login→403 SUSPENDED" unmet; NOT T09 scope (auth.service/T05) — needs small Slot B login addition. T09 = cascade only, correct. Highest-risk = atomic tx commit/rollback (integration-tested both). Awaiting SUBMIT. Cross-slot footer §4-D08 on all blocks/commits.
[2026-06-30 cycle 1·A] [PM A Nathan] **TF-01 APPROVED** (tsc-alias prod-boot fix, Q-A-04 §4-D06) — PM A verified: `pnpm build` clean, **0 bare aliases in dist**, `.prisma/client`→explicit `index.js` (`--resolve-full-paths`), **`node dist/entrypoints/api.js` BOOTS :3000** (prod-boot defect GONE), no dev regression, 152 unit + 37 integ. **🎯 Q-A-04 prod-boot CLOSED** (dev=T03 tsconfig path + prod=TF-01 tsc-alias). **MERGE-READY** branch `fix/tsc-alias-dist-boot` @ `cacbb69`. **T04 MERGED** by Nathan (PR#4). **ASSIGNMENT T09 issued** (§4-D08 cross-slot, admin hotels CRUD, G3 ~8h) per Nathan's order (tsc-alias→T09). **⚠️ Cross-slot infra flag**: Slot B HALTED T10 (`disk<5GB + Postgres down`); Slot A env read healthy (32GB, DB Up) so unaffected this moment — but if **shared-disk fluctuation**, may hit Slot A's T09 integration tests. Parent: monitor.
[2026-06-30 cycle 8 open] [PM B Nanak] T10 ASSIGNMENT issued — CROSS-SLOT execution per §4-D09 (Slot C canonical, Slot B exec one-off; first Slot C absorption 3/3 per PO ruling 2026-06-30). Scope: 3 endpoints (GET /hotels/me + GET/PUT /settings/hotel) + new src/modules/hotels/ module. Super_admin /hotels/me → option (b) `{id:null,tier:null}` per spec §5. PUT whitelist: timezone/branding/dnd (spec §1.5). Schema verified at ASSIGNMENT (Hotel direct columns OK; no schema change). 4 open items for PLAN (settings storage pre-resolved, super_admin behavior spec-pinned, PUT whitelist, idempotency). No upstream blocker. ETA ~3-5h. Branch: NEW `feat/slot-c-absorption-b`. Cross-slot ceremony mandate: §4-D09 footer every commit + JSDoc header marker `hotels.routes.ts`. FULL APPROVE convention direct. Next event: Executor B PLAN T10 attempt 1.
[2026-06-30 cycle 1·A] [PM A Nathan] **T04 APPROVED** (seed-super-admin, attempt 1) — PM A independently verified: CLI exit 0 · 1 row super_admin/hotel_id NULL/must_rotate=false · **argon2 login-compat (verify=true)** · idempotent no-op (Q-OPS-01) · fail-clean exit 1 no-pw-leak · 152 unit + 37 integ. must_rotate=false ruled per Q-OPS-01 (break-glass recovery acct). **MERGE-READY** branch `feat/seed-super-admin` @ `c7a7e76` → notifying Nathan. **🎯 SLOT A FOUNDATION CLOSED (T01–T04 + adopt-T02/T11).** Acknowledged Parent ruling `d40264e`: **T09 → Slot A** (§4-D08 Slot C absorption) now READY (T04 closed); + queued tsc-alias (§4-D06). Slot A next: tsc-alias + T09. §4-D06 collision OK (Parent preserved my tsc-alias D06, shifted Slot C to D07/D08).
[2026-06-30 cycle 1·A] [PM A Nathan] **T03 APPROVED** (tiers seed, attempt 1) — PM A independently re-verified on `fix/prisma-client-tsx-resolve` @ `22009e8`: `pnpm seed` 4 exact §1.4 rows + idempotent (DB-queried) · typecheck+lint clean · 152 unit + 35 integ · **dev:api LISTENING :3000** (closes G1 api-boot). Fix = Option A (1-line tsconfig path). `features:{}` per Q-A-02. **MERGE-READY** → PM A notifying Nathan (per his workflow: code→branch, Nathan merges; docs→main direct). **ASSIGNMENT T04** (seed-super-admin CLI) issued = last Slot A foundation task. Non-blocking obs: integration fixtures (`createTestTier` 'lite') collide with seed data on shared DB → §10/Slot B test-hygiene note. 4/5 Slot A signed-off.
[2026-06-30 cycle 1·A] [PM A Nathan] **CORRECTION to Q-A-04 fix (rebuttal upheld)** — my prior `→ '@prisma/client'` ruling was WRONG (exec-A rebutted with evidence; PM A re-verified). `@prisma/client` throws `new PrismaClient(): did not initialize` under `node-linker=isolated` (ADR-0002) + types→`any`. **DEV fix = `tsconfig.json` path `.prisma/client`→real client** (verified instantiates + real types) → unblocks T03. **PROD `node dist` boot = pre-existing alias defect** (`@core/*` etc. emitted verbatim by tsc; crashes on `@core/config` before Prisma) → needs `tsc-alias` (new dep, **needs PO approval**), separate task, deploy-readiness not G1. Detail §3c Q-A-04 + PM-STATUS-A §2 RE-RULING. Lesson: resolve≠instantiate≠types-ok.
[2026-06-30 cycle 1·A] [PM A Nathan] **🚨 ESCALATE P0 — Q-A-04**: service cannot boot on `main`. `prisma-client.ts:25` runtime **value** import `from '.prisma/client'` = invalid ESM specifier → `ERR_INVALID_MODULE_SPECIFIER`; breaks `dev:api`/prod `start:api`/`pnpm seed`. Latent (187 tests green, jest resolver lenient) until exec-A T03 `pnpm seed` exposed it; on main via PR#1+#2. **PM A reproduced.** Authorized 1-line root fix (`→ '@prisma/client'`, Slot A canonical T02 hotfix) under bootstrap delegation — exec-A implementing w/ 4-pt verify (incl `node dist` boot). **For PO/Parent**: (a) G1 "make start/api boots" never actually validated (T01 = deps-up only; PM A owns gap; add api-boot to foundation sign-off); (b) PR#2 merged blocked/unapproved T03 WIP to main (process gap; forward-fixed). T03 BLOCKED→unblocks on hotfix. Detail PARENT §3c Q-A-04 + PM-STATUS-A §2.
[2026-06-30 cycle 7 close] [PM B Nanak] **BATCH VERDICT** — Slot B sequence COMPLETE. 5 tasks transition to FULL APPROVE in single event: **T02-sub-1 FULL direct** (27 it.todo → 30 real integration assertions; all 3 critical repos ≥80% line: auth.repo 85.18% / users.repo 82.5% / tenant-guard 88.88%; mixed-scope ceremony 2/6 §4-D01 both T11-file-touches per extended rule); **quartet T05+T06+T07 PARTIAL→FULL** (canonical Slot B); **T11 PARTIAL→FULL** (cross-slot per §4-D01 preserved — 7 §4-D01 footer commits total = 5 cycle-4 + 2 cycle-7 + plugin file JSDoc + integration test line-6 marker; canonical record COMPLETE for Slot A audit). All upgrade conditions (a)-(e) ALL SATISFIED. 17/17 verifications match Executor klaim. **Slot B work loop summary**: 50 commits feat/auth-core, 185 total tests pass (155 unit + 30 integration), 1 PO escalation handled (Q-B-01), 2 cross-slot deviations executed clean (§4-D01 + §4-D05), 1 REQUEST-FIX round (T06 spec compliance), Q-B-02(b) inline resolved (3 other gaps Slot A future pickup), ZERO branch hygiene violation, 100% ceremony compliance. **Acknowledging PM A ONLINE + adopt-T02/adopt-T11 sign-off + Q-A-01 T11 fail-open invariant flagged** — Slot B coordinates with Slot A on merge timing (per Slot A authority decision: T03/T04 branch from feat/auth-core, not waiting merge). Branch `feat/auth-core` READY for merge **once Slot A foundation closes** (T03 + T04). PM B recommend `git merge --no-ff` (option b) to preserve 50-commit history + 12 cross-slot footer evidence (7 §4-D01 + 5 §4-D05). PO/Parent PM coordinates final merge sequence. Next event: PM B idle pending merge coordination signal or new Slot B task.
[2026-06-30 cycle 1·A] [PM A Nathan] **T03 PLAN ACKED** (tiers seed) — values verified vs §1.4; idempotent upsert. **GAP T03-#1 → Option A** (seed `features:{}` = schema default; nothing in auth scope reads it) + **raised Q-A-02 to PO** (PARENT §3a: per-tier feature matrix undocumented in-repo, needed before T08/G3, **non-blocking** T03; consolidate w/ Q-CONTRACT-08). Env amendment: rejected `--env-file-if-exists` (Node 22.9+ vs Node-20 baseline) → no-dep loader. Awaiting SUBMIT (test:unit + test:integration).
[2026-06-30 cycle 1·A] [PM A Nathan] **T01 APPROVED** (attempt 1) — foundation sign-off green on `feat/auth-core` @ `25d2007`: install frozen/no-churn · 5 tables migrated (PM A independent psql verify) · check green 155 tests incl live smoke. **GAP T01-#1** (`make` binary absent on host, CLT) ratified **Option A** (underlying pnpm/docker recipe ≡ make; CI runs literal make) — slot-internal, no PO escalation. **adopt-T02 + adopt-T11 ADOPTED** (PM A canonical sign-off, NO re-exec; ownership-of-record affirmed Slot A). T11 fail-open invariant recorded → §3c Q-A-01 (Parent: propagate to §10 + Slot B T07 wiring). **T03 (tiers seed) ASSIGNMENT issued** (un-blocked), T04 next. Slot A foundation G1 near-closed (3/5 signed-off). Open Qs slot A: 0.
[2026-06-30 cycle 1·A] [PM A Nathan] **Slot A ONLINE** (Nathan hadir). Last approved: none. Active: T01 (foundation sign-off) — ASSIGNMENT issued PM-STATUS-A §2, awaiting Executor A PLAN. Un-parked PARENT §1 rows T01/T03/T04 (exec-A). T02 + T11 = **adopt/sign-off only, NO re-exec** (sudah exec by Slot B §4-D05/§4-D01 di `feat/auth-core`). **Sequencing decision (slot-A authority, Parent PM offline)**: Slot A foundation (T03/T04) branches dari `feat/auth-core` BUKAN tunggu merge — verified ground-truth: init migration + real PrismaClient + argon2 hanya ada di `feat/auth-core`, `main` tak bisa run seed. File seed-only → rebase-onto-main trivial saat merge. Detail §2 PM-STATUS-A. Open Qs slot A: 0. Next-up: adopt-T02 + adopt-T11 → T03 → T04.
[2026-06-30 cycle 7] [PM B Nanak] T02-sub-1 PLAN ACKED — 0 GAPs, 5 open items confirmed (extract fixtures, afterEach UUID-suffix, negative-lookbehind regex Node 20 viable, T02 CHECK ext defer T_AUX_05, --runInBand acceptable). 1 aux ruled: `collectCoverageFrom` Option (a) approved (temporary inclusion via `test:integration` script CLI flag override; Path α recommended, Path β fallback as separate `jest.integration.config.json`). File list revised: **4 EDIT + 1 CREATE** (Executor includes package.json regex tighten as mandatory). Mixed-scope 5-commit ceremony: only commit #4 (tenant-guard plugin) §4-D01 footer; commits #1+#2+#3+#5 PLAIN canonical Slot B. ETA ~6-7h impl→SUBMIT. Executor B moves to feat/auth-core. Next event: SUBMIT block on main. After cycle 7 SUBMIT → batch VERDICT (T02-sub-1 FULL + quartet T05+T06+T11+T07 FULL) → merge feat/auth-core to main.
[2026-06-30 cycle 7 open] [PM B Nanak] T02-sub-1 ASSIGNMENT issued — quartet integration backfill (**27 it.todo** across 3 files: 16 auth.repository [T05+T06 consolidated] + 4 tenant-guard.plugin [T11 CROSS-SLOT per §4-D01] + 7 users.repository [T07]; PM B corrected count from ~24 estimate to actual 27 via grep). Mixed-scope ceremony: T11 file commit(s) carry §4-D01 footer; T05/T06/T07 file commits PLAIN canonical Slot B. Satisfies quartet upgrade conditions (b)-(e): integration tests fill + repo coverage ≥80% line + drift re-scan + re-issue VERDICT. **FULL APPROVE convention** (not PARTIAL). 3 EDIT + 1 optional CREATE (shared fixture helpers per Open #1). 5 open items for PLAN (fixture sharing, isolation strategy, coverage measurement + jest config tightening, CHECK extension scope, execution speed). After cycle 7 APPROVE → quartet T05+T06+T11+T07 batch FULL APPROVE → merge feat/auth-core to main (single merge event for entire Slot B work: T02 + T05 + T06 + T11 + T07 + T02-sub-1). Next event: Executor B PLAN T02-sub-1 attempt 1.
[2026-06-30 cycle 6 close] [PM B Nanak] T02 FULL APPROVE — FIRST FULL APPROVE in repo. CROSS-SLOT execution per §4-D05 complete; 5/5 commit footer audit + bonus code-header verified; 155 unit tests pass (3 smoke added, zero regression); smoke (c) CHECK trip CONFIRMED Postgres `23514` mutual-exclusion fires live; schema-diff EMPTY; Q-B-02(b) inline resolution complete (cast + comment block cleared; Q-B-02(d) error-handler gap preserved per scope). 5 DDs accepted (incl DD2 test-setup.ts env loader bootstrap-style, no new dep). 4 open items resolved (Prisma log noise → T_AUX_03 backlog / smoke `.smoke.test.ts` naming / env loader scope / cycle-7 boundary). Quartet upgrade condition (a) satisfied; (b)-(e) cycle 7 pending. Cycle 7 opens next: chained T02-sub-1 batch backfill ~24 it.todo across T05/T06/T11/T07 integration test files → batch FULL APPROVE quartet → merge feat/auth-core to main.
[2026-06-30 cycle 6] [PM B Nanak] T02 PLAN ACKED — CROSS-SLOT per §4-D05. 0 GAPs, 4 open items confirmed (init name, port 5433 verified, smoke 3 sub-tests, singleton template). 1 aux APPROVED: single coherent init migration via `--create-only` + manual CHECK append (industry pattern; future `migrate dev` creates new files, no overwrite risk). Pre-flight verifications green (port 5433 confirmed `.env.example:22` + `docker-compose.yml:24`; deps `prisma`+`@prisma/client ^5.22.0` present; first init confirmed via empty `prisma/migrations/`). Executor B moves to feat/auth-core. Next event: SUBMIT block on main. T02 = FULL APPROVE direct convention; quartet batch FULL upgrade trigger cycle 7.
[2026-06-30 cycle 6 open] [PM B Nanak] T02 ASSIGNMENT issued — CROSS-SLOT execution per §4-D05 (Slot A canonical, Slot B execution one-off; T02-ONLY scope: T01 implicitly done cycle 2, T03/T04 PARKED). Scope: Prisma migration generation + Q-B-02(b) inline resolution (`prisma-client.ts` placeholder → real singleton) + ≥1 smoke integration test (constraint trigger). ~3 CREATE / 2 EDIT. Cross-slot ceremony mirror §4-D01 T11 precedent (commit footers + SUBMIT/VERDICT headers + plugin header markers). 4 open items for PLAN (migration command name, DB URL port verify, smoke scope, singleton pattern). Single blocker for quartet batch FULL APPROVE. After T02 APPROVE → cycle 7 chained T02-sub-1 (~24 it.todo backfill) → batch FULL → merge feat/auth-core to main. Next event: Executor B PLAN T02 attempt 1.
[2026-06-30 cycle 5 close] [PM B Nanak] T07 APPROVE-PARTIAL — FINAL Slot B sequence item. Coverage critical files ≥90% line; overall 94.62% line; drift zero; 6 DDs accepted; 5 open items ruled (#1 crypto fallback ACCEPT-as-is mirror T11, #2 dead-code role check KEEP defense-in-depth, #3-5 acks). Canonical Slot B verified (0 §4-D01 hits in 14 commits). Quartet T05+T06+T11+T07 all APPROVE-PARTIAL; batch FULL APPROVE pending T02 ship. Slot B sequence COMPLETE. Branch feat/auth-core 39 commits ahead of main (no merge). Next: PO direction needed — idle wait T02, atau Slot B picks up T02 cross-slot deviation, atau Slot B picks up T01-T04 mega-deviation. PM B recommendation: (b) T02 cross-slot deviation per §4-D01 precedent.
[2026-06-30 cycle 5] [PM B Nanak] T07 PLAN ACKED — 0 GAPs, 3 ACK rulings (file 10/3, BusinessRuleError discriminator reuse no new class, wiring order AMENDED tenant-guard-FIRST per cost asymmetry + audit log correlation). 1 aux boundary (super_admin handler reject via ForbiddenError) acked. 7 open items all confirmed. ETA ~5-7h impl→SUBMIT. Executor B moves to feat/auth-core. Next event: SUBMIT block on main. After APPROVE-PARTIAL → Slot B sequence COMPLETE.
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
| Q-A-02        | Per-tier `tiers.features` JSONB unlock map — exact 19-key matrix × 4 tiers (lite/professional/luxury/enterprise). In-repo sources absent: `src/mocks/fixtures/feature-flags.ts` (FE fixture) + `docs/DEVELOPMENT-PLAN.md`. Cross-ref `open-questions.md` Q-CONTRACT-08 (feature-flags shape / 19 names). Needed before **T08** (`GET /api/admin/tiers` returns `features`, Slot C, G3). | PM A (Nathan), from GAP T03-#1 (exec-A) | `01-auth-identity §1.4:190` + `API-CONTRACT §2.1b:208` + `prisma/schema.prisma` Tier.features | **open → PO** 2026-06-30 | **Non-blocking for T03**: seed ships `features: {}` (= schema DDL default `'{}'::jsonb`; nothing in auth scope reads it; `open-questions.md:205` hints MVP tier-gate = "row exists"). PO to supply matrix (or confirm `{}` until Hotel Core ships flags); backfill via upsert re-run before T08/G3. **Parent PM**: consolidate to PO with Q-CONTRACT-08. |
| Q-A-06        | `agent_count` in `GET /api/admin/hotels` (`API-CONTRACT §2.14`) — Auth service has **no agents table** (agents = Hotel Core domain, not shipped). What to return? | PM A (Nathan), from GAP T09-#1 (exec-A) | `API-CONTRACT §2.14` + `SERVICE-CHARTER` (agents=Hotel Core) | **open → PO** 2026-06-30 | **Ruled non-blocking**: T09 ships `agent_count: 0` (placeholder — §2.14 says "default 0 on create"; `user_count` computed real). PO confirm whether a cross-service agent count is required before Hotel Core ships, else `0` stands. |
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
| Q-A-01 (note) | **tenant-guard fail-open invariant** (surfaced during PM A adopt-T11, 2026-06-30). `src/plugins/tenant-guard.ts` PASSES THROUGH on missing/invalid access cookie (delegates 401 to upstream `@fastify/jwt` + handler — design "Amendment 1"). Spec-compliant & NOT fail-open **only if** every protected route also has jwt-auth wired upstream. Fail-open boundary = a protected route wired with tenant-guard but WITHOUT jwt-auth (would let missing-cookie through → violates `MVP-AUTH-FIRST §4.1` "must not fail-open"). | PM A (Nathan), adopt-T11 | `src/plugins/tenant-guard.ts` + `01-auth §6` + `MVP §4.1` | **noted** 2026-06-30 (PM A) — not a defect; informational heads-up | No action needed on T11 itself (ADOPTED). **Ask of Parent PM**: propagate to §10 cross-dev + ensure **Slot B T07 route-wiring** (which wires tenant-guard) verifies jwt-auth precedes the guard on every protected route. Slot A (canonical owner) will enforce this invariant on all future tenant-guard amendments. |
| Q-A-03 (coord) | **Cross-slot merge strategy** — Slot B sequence COMPLETE (BATCH VERDICT 2026-06-30); `feat/auth-core` frozen + merge gated on Slot A closing T03+T04. Slot A's `feat/seed-foundation` is branched off `feat/auth-core` `d1cf477`, so it is a strict superset. Decision needed: **(1)** merge `feat/seed-foundation → main` in ONE event (subsumes all 50 Slot B commits + Slot A seeds; `feat/auth-core` becomes ancestor, no separate merge); or **(2)** merge `feat/auth-core → main` first, then rebase + merge `feat/seed-foundation`. | PM A (Nathan), post-BATCH-VERDICT | PM B BATCH VERDICT §2 + Slot A §2 sequencing decision | **open → Parent/PO** 2026-06-30 (NOT blocking T03/T04 exec) | PM A **recommends Option (1)** — single `--no-ff` merge of `feat/seed-foundation` preserves the full 50-commit + 12 cross-slot-footer history AND lands Slot A seeds atomically; avoids a redundant interim `feat/auth-core` merge + a Slot A rebase. **Affects both slots** → Parent/PO ratify final sequence when T03+T04 sign off. Coordinate w/ PM B recommendation (`git merge --no-ff`, their §2 line). **UPDATE 2026-06-30**: superseded — **both** PRs already merged to main (PR#1 `feat/auth-core` `12f9c4d`; PR#2 `feat/seed-foundation` `2482d38`). Recommendation moot; note PR#2 merged **blocked/unapproved T03 WIP** → see Q-A-04. |
| Q-A-04 (P0) | **🚨 P0 — service cannot boot on `main` (runtime ESM crash).** `src/core/prisma/prisma-client.ts:25` does a runtime **value** import `from '.prisma/client'` — invalid Node-ESM specifier → `ERR_INVALID_MODULE_SPECIFIER` at first import. Breaks `dev:api` (tsx), prod `start:api` (`node dist`), `pnpm seed`. Latent (jest resolver lenient; 187 tests green) until exec-A's T03 `pnpm seed` (first standalone Node-ESM import of singleton) surfaced it. **On `main`** via PR#1+PR#2. **PM A reproduced** (`node --import tsx/esm`). Blast radius verified: only `prisma-client.ts:25` is a value import (repos use `import type` = erased/safe). | PM A (Nathan), from exec-A BLOCKED T03 | `prisma-client.ts:25` + `api.ts:18` + reproduced crash | **escalated → Parent/PO** 2026-06-30; **RE-RULED (rebuttal upheld); split dev/prod** | **CORRECTION (rebuttal upheld 2026-06-30)**: my first ruling (`→ '@prisma/client'`) was **WRONG** — PM A verified `new PrismaClient()` from `@prisma/client` THROWS "did not initialize" under `.npmrc node-linker=isolated` (ADR-0002) + types→`any`. **DEV fix (authorized, Slot A canonical)** = `tsconfig.json` path `.prisma/client`→`node_modules/.prisma/client` (verified: instantiates under tsx + real types); code change → branch, **Nathan merges**. **PROD fix (Q-A-04 proper)** = prod `node dist` is broken by ALL path aliases (`@core/*` etc. emitted verbatim by `tsc` → `ERR_MODULE_NOT_FOUND` on `@core/config`, *before* Prisma) — pre-existing, NOT Prisma-specific. Needs **`tsc-alias` build step → new dev dep, requires Nathan's PO approval** (CLAUDE.md §11). Separate Slot A foundation task; deploy-readiness (not G1-dev-blocking). **For PO/Parent**: (a) **G1 "make start/api boots" never actually validated** — T01 `make start` = DB+Redis deps only (PM A owns gap; add api-boot to foundation sign-off); (b) **PR#2 merged blocked/unapproved T03 WIP to main** — process gap; forward-fixed. **UPDATE 2026-06-30: PROD fix `tsc-alias` PO-APPROVED (Nathan, §4-D06), queued as Slot A foundation task AFTER T03+T04.** **✅ RESOLVED 2026-06-30**: dev fix shipped (T03 tsconfig path, merged PR#3); prod fix shipped (**TF-01** `tsc-alias --resolve-full-paths`, PM A verified `node dist` boots :3000, merge-ready `fix/tsc-alias-dist-boot` @ `cacbb69`). Both boot paths (tsx dev + node dist prod) green. |
| Q-A-07 (cross-task) | **AC §5 suspend incomplete**: `auth` login has **no `hotel.status='suspended'` check** (PM A grepped `src/modules/auth/**` on main — 0 hits, no `SuspendedError`). T09's suspend cascade revokes existing sessions, but a suspended-hotel GM can **re-login** (creates a fresh session) → AC §5 "re-login → 403 SUSPENDED" (`MVP §5` line 87) unmet. | PM A (Nathan), from T09 GAP #3 boundary (exec-A) | `MVP-AUTH-FIRST §5` AC + `src/modules/auth` login path | **open → Parent/Slot B/PO** 2026-06-30 (NOT blocking T09) | **NOT T09 scope** — login-time guard belongs in `auth.service` (T05, already merged without it). T09 ships the cascade correctly. **Ask of Parent**: assign Slot B a small auth-login addition (reject login when `user.hotel.status='suspended'` → 403 `SUSPENDED`) to complete AC §5, OR PO schedules. Cross-ref T09 cascade. |

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
| **§4-D05** | 2026-06-30 | `prisma/migrations/*` + `src/core/prisma/prisma-client.ts`         | **T02 cross-slot execution deviation**: initial Prisma migration canonical-owned by Slot A per `SERVICE-CHARTER §3` foundation; Slot A PARKED cycles 1–5. Slot B (Nanak) absorbs T02 **execution** as one-off because T02 is the SINGLE blocker for batch FULL APPROVE of the Slot B quartet (T05+T06+T11+T07, all APPROVE-PARTIAL after cycle 5 close 2026-06-30). Without T02: ~24 integration-test `it.todo()` placeholders cannot fill; `feat/auth-core` branch (~39 commits ahead of main) cannot merge; FE integration window stays closed. **Scope of deviation: T02 ONLY.** T01 (pnpm install verify) is implicitly satisfied via Executor B successfully running `pnpm add argon2 @fastify/cookie` in cycle 2 — formal sign-off remains Slot A pickup, non-blocking. T03 (tiers seed) + T04 (`seed-super-admin` CLI) remain `PARKED · unowned-this-cycle` for Slot A canonical pickup; Slot B integration tests self-seed via test fixtures + factory builders (per `docs/TESTING.md §11`). **Mega-deviation absorbing T01+T03+T04 rejected** — premature foundation absorption, wastes cycles on non-blocking tasks. **Ownership of record stays Slot A**; Slot B SUBMIT carries footer "Cross-slot execution per §4-D05 (Slot A canonical territory)." on ASSIGNMENT, PLAN, SUBMIT, VERDICT, and every impl commit (mirrors §4-D01 ceremony for T11). Also resolves Q-B-02(b) (`prisma-client.ts` placeholder workaround) inline — the real `PrismaClient` singleton replaces the `{}` placeholder as part of T02 impl. | T02 (quartet T05+T06+T11+T07 batch FULL APPROVE unlock) | PO             |
| **§4-D06** | 2026-06-30 | `package.json` (devDeps) + `tsconfig.build.json`/build script | **`tsc-alias` dev-dep approved** (PO Nathan, direct 2026-06-30) to fix the prod `node dist` boot defect (Q-A-04): `tsc` emits TS path aliases (`@core/*`/`@modules/*`/`@plugins/*`/`@shared/*` + `.prisma/client`) verbatim → `node dist` crashes `ERR_MODULE_NOT_FOUND`. Pre-existing latent defect (not Prisma-specific). `tsc-alias` rewrites aliases in `dist` post-build. **Scope**: separate Slot A foundation task, **queued AFTER T03+T04** (not G1-dev-blocking; dev/tsx works via tsconfig path). New devDep → recorded here per `CLAUDE.md §11`. NOT to be confused with the **dev** fix (tsconfig path `.prisma/client`, no dep — see Q-A-04). | Q-A-04 (prod boot) | PO (Nathan, direct) |
| **§4-D07** | 2026-06-30 | `src/modules/admin/users/` + cross-modul wiring (`src/entrypoints/api.ts`, optional `src/shared/`) | **T08 cross-slot execution deviation — Slot C absorption (1/3)**: cross-hotel admin users CRUD + Tier catalog read canonical-owned by Slot C per `SERVICE-CHARTER §3` (Auth admin surface). Slot C (Satrio) OFFLINE this cycle (busy other repo); Slot C tasks PARKED too long; PO ruling 2026-06-30 = absorption split across Slot A + Slot B. **T08 → Slot B (Nanak) execution** because it extends T07 pattern (per-hotel users CRUD) — super_admin scope reuses argon2 + generate-password helper + AppError set + tenant-guard scope-bypass; Auth-adjacent skill match. Estimated ~6h pattern reuse from T07. **Spec deps note**: T08 depends on T04 (first super_admin via `seed-super-admin` CLI per `01-auth-identity §1.3` last paragraph) for integration test; **PARTIAL APPROVE OK for unit scope** before T04 ship (Slot B integration tests stub via factory builder). **Ownership of record stays Slot C**; future amendments return to Satrio when re-onboarded. Audit trail footer mandate: every ASSIGNMENT/PLAN/SUBMIT/VERDICT/impl commit carries "Cross-slot execution per §4-D07 (Slot C canonical territory)." (mirrors §4-D01/§4-D05 ceremony). **Note**: PO directive literal numbering said "§4-D06"; existing §4-D06 already claimed by `tsc-alias` dev-dep approval — shifted to D07 to preserve audit-trail durability. Flag for PO acknowledgment. | T08, batch G3 unlock | PO |
| **§4-D08** | 2026-06-30 | `src/modules/admin/hotels/` + cross-modul wiring | **T09 cross-slot execution deviation — Slot C absorption (2/3)**: admin hotels CRUD + atomic GM-create + suspend cascade canonical-owned by Slot C per `SERVICE-CHARTER §3`. **T09 → Slot A (Nathan) execution** because atomic `INSERT hotels + INSERT users[gm]` in Prisma `$transaction` + FK cascade on status flip = foundation/transaction expertise; aligns with Nathan's T02/T03 work pattern. Estimated ~8h (atomic tx + cascade + generate-password reuse from §4-D05's PrismaClient singleton). **Spec deps note**: T09 depends on Slot A T04 close (uses `seed-super-admin`-created super_admin in integration test). Q-A-04 follow-up (tsc-alias prod boot fix per §4-D06) is **NOT blocking T09** — separate concern, runs parallel. **Ownership of record stays Slot C**; future amendments return to Satrio. Audit trail footer mandate: every ASSIGNMENT/PLAN/SUBMIT/VERDICT/impl commit carries "Cross-slot execution per §4-D08 (Slot C canonical territory)." (PO literal numbering said "§4-D07"; shifted because of D06 collision — see §4-D07 note). | T09, batch G3 unlock | PO |
| **§4-D09** | 2026-06-30 | `src/modules/hotels/me/` + `src/modules/settings/hotel/` (or merged module per Slot B PLAN) | **T10 cross-slot execution deviation — Slot C absorption (3/3)**: hotel context + settings (`GET /api/hotels/me` + `GET/PUT /api/settings/hotel`) canonical-owned by Slot C per `SERVICE-CHARTER §3`. **T10 → Slot B (Nanak) execution** because it mirrors T06's `/me` pattern (read + settings PUT with own-hotel tenant scope); Auth-adjacent skill match. Estimated ~3h (simple read + gm_admin PUT writes; tenant-guard middleware T11 already wired). **No upstream blocker** — does not depend on T04; can start in parallel with Slot A foundation work. Spec note: super_admin `/hotels/me` open-Q recommends option (b) `{ id: null, tier: null }` per `MVP-AUTH-FIRST §5`. **Slot B sequencing recommendation: T10 FIRST as warm-up (no blocker, simpler), THEN T08 after Slot A ships T04.** **Ownership of record stays Slot C**; future amendments return to Satrio. Audit trail footer mandate: every ASSIGNMENT/PLAN/SUBMIT/VERDICT/impl commit carries "Cross-slot execution per §4-D09 (Slot C canonical territory)." (PO literal numbering said "§4-D08"; shifted because of D06 collision — see §4-D07 note). | T10, batch G3 unlock | PO |

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

### T02 — Initial Prisma migration (cross-slot Slot B execution per §4-D05)

- **Slot**: A (canonical, per `SERVICE-CHARTER §3` foundation row)
- **Execution this cycle**: B (Nanak) per `§4-D05` deviation 2026-06-30
- **Owner**: TBD (PM B claims via PM-STATUS-B.md §2 ASSIGNMENT with cross-slot execution note)
- **Started**: —
- **Status**: `assigned · READY-FULL (cross-slot per §4-D05, Slot B execution)`
- **Spec**: `docs/spec/MVP-AUTH-FIRST.md §3` steps 1–5 (DB migration order) + `docs/spec/01-auth-identity.md §3` (SQL DDL) + `prisma/schema.prisma` (already authored, no schema edits)
- **Dependencies**: T01 implicitly satisfied (Executor B ran `pnpm add argon2 @fastify/cookie` successfully cycle 2 — toolchain proven). No other hard deps.
- **ADR refs**: ADR-0004 (1 service = 1 DB), ADR-0007 (Prisma as ORM)
- **Gate**: **G1** (foundation) — closing T02 lights up batch FULL APPROVE pathway for G2 (auth module ready)
- **Resolves inline**: Q-B-02(b) (`prisma-client.ts` placeholder `{}` → real `PrismaClient` singleton)
- **Unblocks**: batch FULL APPROVE of T05+T06+T11+T07 (~24 integration-test `it.todo()` placeholders fill); `feat/auth-core` merge to main

#### Scope

- Generate first Prisma migration via `pnpm prisma migrate dev --name init` (or equivalent) against the local Docker Postgres (ports per pre-T01 fix: 5433 host).
- Migration covers schema-authored entities: `tiers`, `hotels`, `users`, `sessions`, `password_reset_tokens` (per `prisma/schema.prisma`).
- Constraints enforced at DB level (per spec):
  - Mutual-exclusion CHECK on `users` — `(role='super_admin' AND hotel_id IS NULL) OR (role<>'super_admin' AND hotel_id IS NOT NULL)` per `MVP-AUTH-FIRST §4.4`
  - UNIQUE(`hotel_id`, `email`) on `users` per `MVP-AUTH-FIRST §4.7`
  - FK `hotels.tier_id → tiers.id ON DELETE RESTRICT`
  - FK `users.hotel_id → hotels.id ON DELETE RESTRICT`
  - FK `sessions.user_id → users.id ON DELETE CASCADE`
  - FK `password_reset_tokens.user_id → users.id ON DELETE CASCADE`
- Apply migration locally + verify via `pnpm db:migrate` (or whatever Makefile target wraps it).
- Replace `src/core/prisma/prisma-client.ts` placeholder export `{}` with real `PrismaClient` singleton (Q-B-02(b) inline resolution). Standard singleton pattern: instantiate once at module load, export the instance, register graceful shutdown via Fastify `onClose` hook (Slot B picks exact wiring at PLAN).
- Backfill the ~24 `it.todo()` integration-test placeholders left across cycles 2–5 in T05/T06/T11/T07 repository integration test files — convert to real assertions running against the migrated DB. **Scope inside T02 = at minimum 1 smoke integration test** proving the migration applied; **full it.todo() backfill** can be split across T02 sub-cycles per PM B judgement (smoke test in T02 SUBMIT mandatory; full backfill OK in chained sub-cycle).

#### Files (suggested — Slot B finalizes in PLAN)

- `prisma/migrations/<timestamp>_init/migration.sql` — CREATE (generated)
- `prisma/migrations/migration_lock.toml` — CREATE or UPDATE (generated)
- `src/core/prisma/prisma-client.ts` — EDIT (replace `{}` placeholder with real `PrismaClient` singleton + lifecycle hook)
- `src/core/prisma/__tests__/prisma-client.smoke.test.ts` — CREATE (1+ smoke integration test against the migrated DB, e.g. round-trip a `tiers` row or assert UNIQUE constraint trips on duplicate `(hotel_id, email)`)
- `prisma/schema.prisma` — **DO NOT EDIT** (already authored across cycles 2–5; T02 = migration generation only, not schema authoring)
- (Optional, PM B judgment) `src/modules/auth/__tests__/auth.repository.integration.test.ts`, `src/modules/users/__tests__/...`, `src/plugins/__tests__/tenant-guard.integration.test.ts` — convert `it.todo()` to real assertions in T02 SUBMIT or chained sub-cycle

#### T02 DoD (full)

- [ ] Migration file generated at `prisma/migrations/<timestamp>_init/migration.sql`
- [ ] Schema applied locally — `pnpm prisma migrate dev` (or equivalent) exits 0 against running Docker Postgres
- [ ] `prisma/migrations/migration_lock.toml` present + committed
- [ ] Prisma client regenerated (auto via `migrate dev`) — `pnpm prisma generate` artifact picked up; no TS errors at app boot
- [ ] `src/core/prisma/prisma-client.ts` exports real `PrismaClient` singleton (no more `{}` placeholder); Q-B-02(b) resolved inline
- [ ] At least **1 smoke integration test** runs against migrated DB and passes (verify a table exists + a constraint trips, e.g. inserting duplicate `(hotel_id, email)` errors with the expected Postgres unique-violation code)
- [ ] All existing T05+T06+T11+T07 **unit tests still pass** post-PrismaClient swap-in (`make check` green) — singleton replacement must not break mocks/decorators
- [ ] Cross-slot SUBMIT commit footer: every T02 impl commit + PLAN + SUBMIT carries "Cross-slot execution per §4-D05 (Slot A canonical territory)." (mirrors §4-D01 ceremony for T11)
- [ ] `prisma/schema.prisma` **untouched** in T02 commits (verify via `git diff` in SUBMIT)
- [ ] No new packages without §4 deviation (use `prisma` + `@prisma/client` already in `package.json`)
- [ ] Drift floor: no `any`, no `console.log`, no `throw new Error('string')`, no default export outside entrypoints (per `PM-AGENT §3 Step 2`)

#### Parent PM notes for PM B

- **Cross-slot execution per §4-D05 (PO 2026-06-30)** — note this verbatim in ASSIGNMENT block when claiming. Ownership of record stays Slot A; Slot B execution one-off (mirrors `§4-D01` ceremony for T11).
- **Smoke vs full integration backfill**: minimum 1 smoke test in T02 SUBMIT — full `it.todo()` backfill across T05/T06/T11/T07 repository integration tests can either land in T02 or in a chained sub-cycle, PM B picks at PLAN ACK based on Executor B ETA. Recommend **smoke in T02 + full backfill in T02-sub-1** to keep T02 SUBMIT tight and allow batch FULL APPROVE of the quartet to happen on T02 APPROVED rather than T02-sub-1 APPROVED.
- **Q-B-02(b) inline resolution**: prisma-client singleton replaces the `{}` placeholder. Q-B-02(a)/(c)/(d) (other 3 foundation gaps from cycle 2 — Slot A territory, no PO ruling needed per PM B cycle 2 close) remain slot-internal; if any of those gaps are touched by T02 PLAN, surface at PM B → Parent PM for review.
- **Database connection**: `DATABASE_URL` env should point at the Docker Postgres host port 5433 per pre-T01 docker port fix (PARENT §4 pre-D01 entry). `.env.example` should already reflect this — verify in PLAN.
- **No `prisma/schema.prisma` edits in T02**: cycles 2–5 have iterated the schema thoroughly. T02 = migration GENERATION only. If Executor B finds a schema bug while generating the migration, raise as GAP, do not silently amend.
- **Batch FULL APPROVE pathway**: after T02 APPROVED, PM B re-opens T05/T06/T11/T07 SUBMIT for integration validation (per PM B re-open trigger noted across cycles). Each quartet item gets a focused integration-only addendum; if all pass, quartet flips to FULL APPROVED in one consolidated cycle. Coordinate at PM-STATUS-B.md §2 then roll up to PARENT §2.

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
| 2026-06-30 | T02 cross-slot Slot B execution per `§4-D05` approved by PO          | B (execution) · A (canonical) | Slot B quartet (T05+T06+T11+T07) all APPROVE-PARTIAL after cycle 5 close (2026-06-30). T02 = SINGLE blocker for batch FULL APPROVE + `feat/auth-core` merge to main. PO ruling: Slot B picks up T02 ONLY (~2-3h work). T01 implicitly done (cycle 2 `pnpm add` proved toolchain); T03 (tiers seed) + T04 (`seed-super-admin` CLI) remain canonical Slot A pickup later — Slot B integration tests self-seed via fixtures + factory builders. **Mega-deviation (absorb T01+T03+T04) rejected** — premature foundation absorption. Q-B-02(b) (`prisma-client.ts` placeholder) resolved inline as part of T02 impl (`PrismaClient` singleton). Slot A future onboarding inherits: T02 done by Slot B; T01/T03/T04 canonical Slot A pickup. Full scope + DoD in §8 T02 detail block. |
| 2026-06-30 | Slot C absorption split A+B (PO ruling, Satrio offline)              | A · B · (C canonical) | Slot C (Satrio) OFFLINE busy other repo; PARKED T08+T09+T10 split equal-by-effort between A+B per PO ruling: **T08 → Slot B** (~6h, T07 pattern extension, per `§4-D07`); **T09 → Slot A** (~8h, atomic tx + cascade, foundation expertise, per `§4-D08`); **T10 → Slot B** (~3h, mirrors T06 `/me`, per `§4-D09`). Effort balance ~9h B vs ~8h A — near-equal. Canonical ownership stays Slot C for all 3; future Satrio re-onboarding inherits audit trail via §4-D07/D08/D09 footers on every commit. **PO directive literal numbering** asked for `§4-D06/D07/D08`; existing `§4-D06` already claimed by `tsc-alias` dev-dep approval (PO Nathan direct) — Parent PM shifted to D07/D08/D09 to preserve audit-trail durability. Flagged for PO acknowledgment. **Sequencing**: Slot B starts **T10 first** (no blocker, warm-up) → T08 after Slot A ships T04. Slot A queues T09 **after T04 close**. Q-A-04 (tsc-alias prod boot) NOT blocking T09. |

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
