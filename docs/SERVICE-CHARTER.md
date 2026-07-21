# Service Charter — Auth & Identity

- **Status**: accepted
- **Tanggal**: 2026-06-27
- **Ratified by**: [ADR-0008](./decisions/0008-repo-scope-auth.md)
- **Canonical implementation scope**: [docs/spec/MVP-AUTH-FIRST.md](./spec/MVP-AUTH-FIRST.md)

## 1. Bounded context

Repo ini = service **Auth & Identity**. Pattern boilerplate (`_template/`, `MODULE_TEMPLATE.md`, ADR-0001..0007) tetap reusable dari `@qooma/backend-service-template`. Scope expanded per H11 2026-06-27 PO ruling — Auth absorbed tenant entity + tier catalog dari sibling Hotel Core.

### Owns

- **Identity**: login, logout, refresh, sessions (httpOnly cookie + CSRF), current-user profile, language preference, password change, forced-rotation enforcement (`must_rotate_password`).
- **Per-hotel users CRUD** (gm_admin scope): `/api/users` — gm_admin creates dept_head/staff for own hotel; generate-and-return password.
- **Cross-hotel admin users CRUD** (super_admin scope, NEW H11): `/api/admin/users` — only path untuk create `super_admin` atau create users across hotels. Resolves Q-OPS-01.
- **Tier catalog** (NEW H11): `tiers` lookup table + `/api/admin/tiers` read endpoint. Per-tier config (agent/user/dept caps + feature matrix; `agent_cap` = 2/4/6/-1 TOTAL agents incl Receptionist). Outbound messaging is prepaid top-up (tier-independent) — no per-tier quota, no minimum-agent floor. 4 rows seeded via migration; PATCH write surface OUT OF MVP.
- **Hotels (tenant entity)** (MOVED H11): `hotels` table + 3 endpoint groups: `GET /api/hotels/me` (single-tenant read, all auth roles), `GET/PUT /api/settings/hotel` (gm_admin per-hotel write — DND/branding/timezone), `/api/admin/hotels` (super_admin platform-level CRUD with atomic GM-user creation + generated password).
- **RBAC enforcement**: tenant-guard middleware + super_admin all-access bypass + PII masking helper (Q-CONTRACT-16 semantic — masking applied at serialization; helper consumed by sibling services).
- **First super_admin bootstrap**: `seed-super-admin` migration / CLI reading from env vars.

### Does NOT own (sibling services — separate repos)

| Sibling                | Owns                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Hotel Core (02)        | Departments · tickets · guests · visits · menu · KB · WA templates · feature flags · billing · integrations config · notifications · agents · voice config · operating hours · escalation tree |
| AI Orchestration (03)  | Claude API · agent prompts · conversation state · handover state machine · KB retrieval         |
| Integration (04)       | WA Cloud API · Telegram Bot · OTA email · QR · webhook ingestion · outbound dispatch queue      |

> **Sibling repo names / git URLs**: `core-backend-qooma-hotel-ai` exists (Hotel Core). Auth depends on no sibling at runtime — siblings depend on Auth's JWT + session middleware.

## 2. Cross-service contracts

- **Persistence boundary**: Auth + Hotel Core share **one Postgres instance** (per `docs/spec/data-model.md` §1). `users.dept_id` cross-references Hotel Core's `departments.id` — works as a real FK because shared DB; if DBs are later split, demote to opaque UUID per ADR-0008.
- **Cross-service identifiers consumed by siblings**: Hotel Core / AI / Integration store opaque `users.id`, `hotels.id` UUIDs without Postgres `REFERENCES` (cross-service-boundary pattern per ADR-0008).
- **Tier authority**: `tiers` lookup + `hotels.tier_id` lives here. Hotel Core JOINS via shared DB (`SELECT t.name, t.features FROM hotels h JOIN tiers t ON h.tier_id = t.id WHERE h.id = $1`) — NOT via RPC. Tier value also surfaces in JWT claim untuk FE route guards (see `docs/spec/01-auth-identity.md` §1.5 + `MVP-AUTH-FIRST.md` §4.1).
- **Suspend cascade**: `PATCH /api/admin/hotels/:id/status { status: 'suspended' }` MUST execute `UPDATE sessions SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE hotel_id = $1)` dalam SAME transaction sebagai status flip. PO-ratified H11.
- **Generate-and-return password pattern** (PO ruling H11): admin-created users (POST hotels, POST users, POST admin users, reset-password) selalu return plaintext password ONCE di response body. Plus `must_rotate_password: true` flag → next login forces rotation via `POST /api/auth/me/password`. No SMTP / email reset in MVP.

## 3. Slot routing (supersedes KICKOFF.md §1 defaults — sesuaikan dengan auth scope)

| Slot       | Old default                       | New default (auth scope)                                                                                          |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A (Nathan) | Foundation / shared infra         | Foundation: core/, plugins, entrypoints, migrations, tenant-guard middleware, seed-super-admin CLI, ADR tasks    |
| B (Nanak)  | Hotel Core core                   | Auth core: login/sessions/refresh, `/api/auth/*`, password rotation, `/api/users` (gm_admin scope), JWT plumbing  |
| C (Satrio) | Hotel Core comms                  | Auth admin surface: `/api/admin/users`, `/api/admin/hotels` (atomic GM-create), `/api/admin/tiers` read, `/api/hotels/me`, `/api/settings/hotel`, suspend-cascade |

`KICKOFF.md §1` table di-update di commit terpisah (`chore(planning):` prefix) supaya slot rewrite reviewable in isolation. Charter ini ratify split di atas.

## 4. Open contract questions

- **Q-CONTRACT-15** (password change verb) — ASSUMED `POST /api/auth/me/password`, backend free to deviate.
- **Q-CONTRACT-16** (PII masking — compound `vvip AND non-gm`) — locked at T-FIX-07 SUBMIT; backend ratifies post-H17.
- **Q-CONTRACT-22** (Hotels Admin) — ⭐ **PO-ratified H11** (atomic GM-create + generated password + soft-delete-only + suspend cascade + Auth ownership). Sub-question OPEN: tier='enterprise' gating semantic.
- **Q-CONTRACT-23** (Tiers lookup table) — NEW H11. 4 tier rows config values + read scope ratification pending.
- **Q-CONTRACT-24** (Cross-hotel Admin Users) — NEW H11. 4-endpoint surface + mutual-exclusion validation pending ratification.
- **Q-OPS-01** (super_admin provisioning) — ✅ **RESOLVED H11**: first via `seed-super-admin` CLI/migration, subsequent via `POST /api/admin/users`.
- **Q-OPS-02** (session timeout / sliding refresh policy) — OPEN.
- **Q-INFRA-01** (CORS origin + cookie domain) — OPEN, backend's call based on FE prod domain.

Full register: `docs/spec/open-questions.md`. PM A/B/C mirror actionable rows ke `PM-STATUS-PARENT.md §3` saat tasks claim Q-related work.

## 5. Out-of-scope-by-design (Auth-first MVP)

- Hotel Core operational endpoints (departments, tickets, guests, visits, menu, KB, etc.) — sibling repo.
- AI orchestration, prompt engineering — sibling repo.
- Channel adapters (WA / Telegram / OTA email) — sibling repo.
- Socket.io gateway — wired after Hotel Core ships (it's the consumer of socket events).
- SMTP-based password reset — generate-and-return password is the MVP UX; SMTP wave 2.
- `PATCH /api/admin/tiers/:name` write UI / endpoint — migration-managed in MVP.
- Per-tenant tier overrides (`hotels.agent_cap_override`) — enterprise customization, not MVP.
- OAuth / SSO providers — out of scope per CLAUDE.md §11.5.
- Cross-service DB JOIN beyond shared Auth↔Hotel-Core DB — sibling services use opaque UUIDs.
