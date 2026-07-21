# Service 01 — Auth & Identity

> **Bounded context**: who you are, which hotel you belong to, which tier that hotel is on, what you're allowed to do. Issues the session cookie that every other service trusts. **Per H11 2026-06-27 PO ruling**, this service also owns the **hotels** tenant entity and the **tiers** lookup table — the platform-level "who are the tenants" surface lives here, not in Hotel Core.
>
> **Owns**:
> - Identity: login, logout, refresh, current-user profile (`/api/auth/me`), language preference, password change.
> - Per-hotel users: `/api/users` (gm_admin creates dept_head/staff for own hotel; generate-and-return password pattern).
> - Cross-hotel users: `/api/admin/users` (super_admin creates ANY role across ANY hotel; resolves Q-OPS-01).
> - Tenancy: `hotels` table (tenant identity + DND + branding + status + gm_contact + tier FK). `/api/hotels/me` (read), `/api/settings/hotel` (gm_admin per-hotel write), `/api/admin/hotels` (super_admin platform-level CRUD).
> - Tier catalog: `tiers` lookup table (lite/pro/luxury/enterprise + per-tier agent/user caps + feature matrix). Outbound messaging is prepaid top-up (tier-independent) — tiers carry no monthly quota and no minimum-agent floor. `/api/admin/tiers`.
> - RBAC enforcement: tenant-guard middleware + super_admin all-access bypass + PII masking semantic.
>
> **Does NOT own**: per-hotel operational config (departments, tickets, guests, visits, menu, KB, WA templates, feature flags, billing, integrations) — all in Hotel Core. AI agent prompts — in AI service. Channel adapters — in Integration.

---

## 1. Endpoints

### 1.1 Auth core (API-CONTRACT §2.1)

| Method  | Path                    | Purpose                                      | Roles         |
| ------- | ----------------------- | -------------------------------------------- | ------------- |
| `POST`  | `/api/auth/login`       | Email + password login                       | public        |
| `POST`  | `/api/auth/logout`      | Clear cookie                                 | authenticated |
| `POST`  | `/api/auth/refresh`     | Rotate token (idempotent)                    | cookie-bearer |
| `GET`   | `/api/auth/me`          | Current user + csrfToken                     | authenticated |
| `PATCH` | `/api/auth/me`          | Update preferences (language)                | authenticated |
| `POST`  | `/api/auth/me/password` | Change own password (Q-CONTRACT-15, ASSUMED) | authenticated |

#### Login response shape (locked at H3)

```json
{
  "user": {
    "id": "uuid",
    "email": "gm@hotel-example.com",
    "name": "Budi Santoso",
    "role": "gm_admin",
    "hotel_id": "uuid",
    "dept_id": null,
    "language": "id"
  },
  "csrfToken": "<opaque-string>"
}
```

Side effect: `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Lax`.

- `language` is `'id' | 'en'`. Default `id`. FE applies on hydration via `i18n.changeLanguage()`.
- `dept_id` is `null` for `super_admin` and `gm_admin`, required for `dept_head` and `staff`.
- `hotel_id` is `null` for `super_admin` only.
- `csrfToken` rotates on every `GET /api/auth/me` call. FE keeps current value in memory (NOT localStorage).

#### `GET /api/auth/me`

Same response shape. FE calls this on app boot to determine auth state. **Must work with only the cookie** (no body) and must rotate `csrfToken`.

#### `PATCH /api/auth/me`

```json
// request
{ "language": "en" }
```

```json
// response 200
{
  "user": {
    /* updated user */
  }
}
```

Fire-and-forget from FE — local i18n changes immediately; FE does not roll back on 4xx (user can re-toggle).

#### `POST /api/auth/me/password` (Q-CONTRACT-15 — ASSUMED, ratify post-merge)

```json
// request
{ "current_password": "...", "new_password": "..." }
```

```json
// response 200
{ "success": true }
```

Errors:

- `422 BUSINESS_RULE` if current password wrong
- `400 VALIDATION_ERROR` if new password too short / empty

Backend may prefer `PUT` or a different path — FE has it isolated in `services/auth.api.ts` and will adapt.

### 1.2 Per-hotel Users CRUD (API-CONTRACT §2.5a — top-level REST, gm_admin scope)

> **Q-CONTRACT-14 (resolved H3)**: users are top-level `/api/users`, NOT nested under `/api/settings/users`. Departments / menu / KB / agents stay under `/api/settings/*` (Hotel Core).

| Method  | Path                            | Purpose                                                                  | Roles      |
| ------- | ------------------------------- | ------------------------------------------------------------------------ | ---------- |
| `GET`   | `/api/users`                    | List users for THIS hotel only                                           | `gm_admin` |
| `POST`  | `/api/users`                    | Create dept_head/staff for own hotel (gen + return password)             | `gm_admin` |
| `PATCH` | `/api/users/:id`                | Update user (name, role, dept_id, is_active, language); email immutable  | `gm_admin` |
| `POST`  | `/api/users/:id/reset-password` | Regenerate + return password (NO email in MVP — display in UI for admin) | `gm_admin` |

`SettingsUser` shape:

```ts
{
  id: string
  email: string
  name: string
  role: Role                     // 'dept_head' | 'staff' only via this endpoint
  dept_id: string | null
  is_active: boolean
  last_login_at: string | null   // ISO-8601 UTC
  language: 'id' | 'en'
  must_rotate_password: boolean  // true after admin-create or admin-reset; cleared after own POST /api/auth/me/password
}
```

Query params on list: `?role=`, `?dept_id=`, `?is_active=`. Used by FE for the escalation tree L2/L3 user dropdowns (see Hotel Core §Departments).

**Generate-and-return password (PO ruling H11 2026-06-27)**:

- `POST /api/users` response 201: `{ user: SettingsUser, generated_password: string }` — 16-char alphanumeric+symbols generated server-side, returned plaintext ONCE in the response body. FE displays in a copy-modal on success then drops from state. Backend stores only the bcrypt/argon2id hash.
- `POST /api/users/:id/reset-password` response 200: same `{ generated_password }` shape. Admin reads the new password to the user (out-of-band — call, in-person, etc.).
- `must_rotate_password: true` is set on the user row → next login forces password change via `POST /api/auth/me/password` before any other action is allowed (Auth-side gate).
- SMTP-based reset email is **OUT OF MVP** (no email service wired in Phase 2.8). Add when SES/Mailgun is provisioned.

**Server-enforced constraints**:

- Email unique per hotel (`UNIQUE(hotel_id, email)`); cross-hotel email reuse is allowed but discouraged.
- `POST /api/users` rejects `role ∈ 'gm_admin' | 'super_admin'` with 400 VALIDATION_ERROR — those require super_admin scope via §1.3.
- `PATCH /:id` cannot demote yourself out of `gm_admin` if you're the only `gm_admin` for the hotel (422 BUSINESS_RULE).
- `is_active: false` must not break referential integrity (tickets/escalation tree FKs) — soft-delete only, never hard DELETE.

### 1.3 Cross-hotel Admin Users CRUD (API-CONTRACT §2.5b — super_admin scope, Q-CONTRACT-24)

The only way to create a `super_admin` user, or to create users in a hotel other than your own. **Resolves Q-OPS-01** (super_admin provisioning).

| Method  | Path                                  | Purpose                                                | Roles         |
| ------- | ------------------------------------- | ------------------------------------------------------ | ------------- |
| `GET`   | `/api/admin/users`                    | List users across all hotels (filter by hotel_id/role) | `super_admin` |
| `POST`  | `/api/admin/users`                    | Create user of ANY role in ANY hotel                   | `super_admin` |
| `PATCH` | `/api/admin/users/:id`                | Update user (any hotel)                                | `super_admin` |
| `POST`  | `/api/admin/users/:id/reset-password` | Regenerate + return password (any hotel)               | `super_admin` |

**`POST` body**: `{ email, name, role, hotel_id?, dept_id?, language }` where:

- `role ∈ 'super_admin' | 'gm_admin' | 'dept_head' | 'staff'`.
- `hotel_id` **required** for non-super_admin roles.
- `hotel_id` **MUST be omitted (or null)** for `role: 'super_admin'` — platform-level user.
- 400 VALIDATION_ERROR on the mutual-exclusion violation.

**`POST` response 201**: same `{ user, generated_password }` shape as §1.2.

**First super_admin bootstrap**: seeded via DB migration / CLI script — NOT via this endpoint (chicken-and-egg). Backend ships a one-off `seed-super-admin` migration or `npm run seed:super-admin` CLI that reads from env (`SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`) and INSERTs a single super_admin row if none exists. Document the mechanism in `shared/open-questions.md` Q-OPS-01 (RESOLVED) so support team knows how to recover.

**Last-super_admin guard**: PATCH/soft-delete that would leave the platform with zero active super_admins → 422 BUSINESS_RULE.

### 1.4 Tiers (API-CONTRACT §2.1b — NEW H11, Q-CONTRACT-23)

Tier lookup table. Normalizes the per-tier config (agent cap, user cap, feature matrix) that was previously inline in CLAUDE.md §1 + scattered through MSW fixtures. `hotels.tier_id` is an FK into this table. Outbound messaging is **prepaid top-up** (tier-independent — see billing top-up in API-CONTRACT §2.12); tiers carry **no** monthly outbound allotment and **no** minimum-agent floor.

| Method | Path                       | Purpose                              | Roles         |
| ------ | -------------------------- | ------------------------------------ | ------------- |
| `GET`  | `/api/admin/tiers`         | List all 4 tier rows + config        | `super_admin` |
| `GET`  | `/api/admin/tiers/:name`   | Single tier detail                   | `super_admin` |

`Tier` shape:

```ts
{
  id: string                       // UUID
  name: 'lite' | 'professional' | 'luxury' | 'enterprise'  // unique
  display_name: string
  agent_cap: number                // 2 / 4 / 6 / -1  — TOTAL agents incl the Receptionist AI (enterprise -1 = custom)
  user_cap: number                 // 2 / 4 / 6 / -1  (1 GM + N dept_heads)
  department_cap: number           // 1 / 3 / 5 / -1
  features: Record<string, boolean>  // JSONB; per-feature unlock map
  is_custom: boolean               // true only for 'enterprise'
}
```

- 4 rows seeded via migration; never deleted at runtime.
- `agent_cap: -1` = "custom / unlimited" (enterprise only). All tiers include **zero** outbound messages — outbound is prepaid top-up (see API-CONTRACT §2.12). There is **no** `agent_minimum` floor; only the per-tier upper `agent_cap` is enforced (agents beyond the cap bill as a +Agent add-on).
- `features` JSONB keys mirror feature-flag names in `src/mocks/fixtures/feature-flags.ts` — 19 keys at last count, evolves as flags are added.
- **PATCH `/api/admin/tiers/:name` is OUT OF SCOPE for Phase 2.8** — tier config is migration-managed in MVP. Add write UI in a later wave when product needs per-tier config edits without redeploy.

### 1.5 Hotels (API-CONTRACT §2.1a + §2.5c + §2.14 — service: Auth per H11 ruling)

Per H11 PO ruling, the **hotels** table is Auth-owned. Three endpoint groups:

| Endpoint group              | Scope                                                | Roles                                     |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `GET /api/hotels/me`        | Single-hotel read for the current user (id + tier)   | authenticated                             |
| `GET, PUT /api/settings/hotel` | gm_admin per-hotel write (timezone/DND/branding)  | `gm_admin` (own hotel)                    |
| `/api/admin/hotels` family  | Platform-level CRUD (5 endpoints — §2.14)            | `super_admin` only                        |

**Key flows**:

- **`POST /api/admin/hotels` is atomic**: writes BOTH the hotel tenant row AND a `users` row for the GM (role=gm_admin, email/name/phone from `gm_contact`, hotel_id=new) in one transaction, then returns the AdminHotel + the new GM user + a one-time `generated_password` for the GM. See API-CONTRACT §2.14 for the response shape.
- **No hard delete**: `PATCH /api/admin/hotels/:id/status { status: 'suspended' }` is the only "delete" semantic — soft-disables logins, cascades session-revoke for users in that hotel.
- **`/api/settings/hotel` writes** are still gm_admin-scoped (GM edits their own hotel's DND/branding). The endpoint moved to Auth because it writes to Auth's `hotels` table; the UX is unchanged.

For the full AdminHotel shape, error envelopes, suspend semantic, and tier-FK details, read API-CONTRACT §2.14 — it's canonical and contains the H11 PO ratifications inline.

---

## 2. RBAC enforcement (CRITICAL — security boundary)

### 2.1 The matrix

| Action                                   | super_admin | gm_admin  | dept_head                         | staff |
| ---------------------------------------- | ----------- | --------- | --------------------------------- | ----- |
| Login to CRM                             | ✅          | ✅        | ✅                                | ❌    |
| Read any hotel's data                    | ✅          | own hotel | own hotel                         | n/a   |
| Read own-dept tickets                    | ✅          | ✅        | ✅                                | n/a   |
| Read other-dept tickets                  | ✅          | ✅        | ❌ → 403                          | n/a   |
| See unmasked PII (wa_phone, name, email) | ✅          | ✅        | masked when `privacy_mode='vvip'` | n/a   |
| Manage users                             | ✅          | ✅        | ❌ → 403                          | n/a   |
| Toggle feature flags                     | ✅          | ✅        | ❌ → 403                          | n/a   |
| Approve billing changes                  | ✅          | ✅        | ❌ → 403                          | n/a   |
| View analytics                           | ✅          | ✅        | ❌ → 403                          | n/a   |
| Manage dept menu/KB/promo                | ✅          | ✅        | own-dept only                     | n/a   |

### 2.2 super_admin all-access

The PO ruling 2026-06-24 made super_admin a **superset** of gm_admin, not a separate cone. Implementation:

- Tenant filter middleware: if `session.role === 'super_admin'`, **skip `WHERE hotel_id = :session.hotel_id`** clause. Every list endpoint becomes cross-hotel.
- RBAC middleware: every check of the form `requireRole('gm_admin')` must **pass for super_admin too**. Easiest pattern: `requireRole(...roles)` checks `session.role === 'super_admin' || roles.includes(session.role)`.
- super_admin's `hotel_id` is `NULL` in the `users` table. When super_admin writes to a hotel-scoped resource, the resource needs an explicit `hotel_id` from the request body or path — NOT from session. (e.g. super_admin creating a ticket needs `hotel_id` in the body. Or, more likely, super_admin uses the "Lihat sebagai" preview toggle to assume a gm_admin's hotel context — see FE `Authorized.tsx` for the preview pattern.)

The FE shipped super_admin handling in **T65 (merged H8)**. Match FE's behavior — when in doubt, grep `src/components/common/Authorized.tsx` and `src/features/auth/hooks/useAuth.ts`.

### 2.3 PII masking (Q-CONTRACT-16 — ASSUMED, locked at T-FIX-07)

Backend masks `wa_phone`, `name`, and `email` when:

```
privacy_mode === 'vvip' AND viewer.role !== 'gm_admin'
```

(super_admin counts as gm_admin for this check via the all-access rule above.)

Masking format:

- `wa_phone` → `wa_phone_masked: "+62812***6789"`, `wa_phone: null`
- `name` → `name: "B***"` (first letter + asterisks)
- `email` → `email: "b***@example.com"`

**FE never masks client-side** — it renders what backend sends. If backend leaks unmasked PII for a `vvip` guest to a `dept_head`, the leak is permanent (no FE safety net).

API-CONTRACT §2.2 has slightly ambiguous wording on this. The T-FIX-07 implementation (compound `vvip AND non-gm`) is canonical per PO Q3 GM-bypass intent. PO will ratify post-merge — if PO directs alternate policy (e.g. dept_head masked for ALL guests, not just vvip), MSW handler updates at H21 (T23 integration window).

---

## 3. Data model (this service owns)

Full ERD + table-ownership matrix in `shared/data-model.md`. Auth-owned tables (after H11 ruling):

```sql
-- Tier catalog (NEW H11 — Q-CONTRACT-23). 4 rows seeded via migration.
tiers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     VARCHAR NOT NULL UNIQUE,        -- 'lite' | 'professional' | 'luxury' | 'enterprise'
  display_name             VARCHAR NOT NULL,
  agent_cap                INTEGER NOT NULL,               -- 2 / 4 / 6 / -1  (TOTAL agents incl Receptionist; -1 = enterprise custom)
  user_cap                 INTEGER NOT NULL,               -- 2 / 4 / 6 / -1
  department_cap           INTEGER NOT NULL,               -- 1 / 3 / 5 / -1
  features                 JSONB   NOT NULL DEFAULT '{}'::jsonb,  -- per-feature unlock map
  is_custom                BOOLEAN NOT NULL DEFAULT FALSE, -- true only for 'enterprise'
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (name IN ('lite', 'professional', 'luxury', 'enterprise'))
)

-- Hotel tenant entity (MOVED from Hotel Core per H11 ruling).
hotels (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                     VARCHAR NOT NULL UNIQUE,        -- platform-wide unique (e.g. 'ABR-001')
  name                     VARCHAR NOT NULL,
  tier_id                  UUID    NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
  status                   VARCHAR NOT NULL DEFAULT 'active',  -- 'active' | 'suspended'
  timezone                 VARCHAR NOT NULL DEFAULT 'Asia/Jakarta',
  branding                 JSONB   NULL,                   -- logo url, primary color (Q-CONTRACT-10 surface)
  dnd                      JSONB   NULL,                   -- DND windows + exceptions (Q-CONTRACT-10)
  gm_contact               JSONB   NOT NULL,               -- { name, email, phone }; informational, real FK is users.hotel_id
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('active', 'suspended'))
)

users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                 UUID    NULL REFERENCES hotels(id) ON DELETE RESTRICT,  -- NULL only for super_admin
  dept_id                  UUID    NULL REFERENCES departments(id) ON DELETE SET NULL,  -- Hotel Core's table; nullable
  email                    VARCHAR NOT NULL,
  password_hash            VARCHAR NOT NULL,
  name                     VARCHAR NOT NULL,
  role                     VARCHAR NOT NULL,               -- enum: super_admin | gm_admin | dept_head | staff
  language                 VARCHAR NOT NULL DEFAULT 'id',  -- enum: id | en
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  must_rotate_password     BOOLEAN NOT NULL DEFAULT FALSE, -- set true on admin-create / admin-reset; cleared on own change
  last_login_at            TIMESTAMPTZ NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, email),
  CHECK (role IN ('super_admin', 'gm_admin', 'dept_head', 'staff')),
  CHECK ((role = 'super_admin' AND hotel_id IS NULL) OR (role <> 'super_admin' AND hotel_id IS NOT NULL))  -- mutual-exclusion
)

sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR NOT NULL,
  csrf_token    VARCHAR NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ NULL,
  user_agent    VARCHAR NULL,
  ip_address    INET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

password_reset_tokens (
  token         VARCHAR PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ NULL
)
```

**Suspend cascade**: when `hotels.status` changes `'active' → 'suspended'`, backend MUST `UPDATE sessions SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE hotel_id = $1)`. This is the H11-ratified suspend semantic — existing sessions die immediately, not on expiry.

**FK note**: `users.hotel_id → hotels.id` is now an intra-service FK (both in Auth). `users.dept_id → departments.id` still crosses into Hotel Core; works because Auth + Hotel Core share the same DB per the original split (see `shared/data-model.md` §1). If you later split DBs, `dept_id` becomes opaque and validation moves to RPC on create.

**Session rotation strategy** is yours — JWT + refresh token, opaque session ID, doesn't matter to FE. FE only sees the cookie and the csrfToken. Recommended: short-lived access token in cookie (15 min), long-lived refresh token in the same cookie or a sibling cookie, refresh via `POST /api/auth/refresh`.

**Must-rotate-password enforcement**: after successful login (`POST /api/auth/login`), if `users.must_rotate_password === true`, backend issues the session cookie normally BUT every endpoint except `POST /api/auth/me/password`, `GET /api/auth/me`, and `POST /api/auth/logout` returns `403 PASSWORD_ROTATION_REQUIRED` with `{ "error": { "code": "PASSWORD_ROTATION_REQUIRED" } }`. FE catches this on the global error interceptor → redirects to a forced-rotate form. On successful password change, `must_rotate_password` is cleared and normal access resumes.

---

## 4. Socket events

Auth service does NOT emit socket events directly. Two events it indirectly causes (emitted by Hotel Core on its behalf):

- `user:created` / `user:updated` / `user:deactivated` — optional, if you want the users-list page to live-update. Not currently consumed by FE; safe to skip in v1.

---

## 5. External dependencies

| Dependency                           | Purpose                       | Notes                                                                                                   |
| ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Password hashing library             | argon2id or bcrypt(cost=12+)  | Cost factor is your call.                                                                               |
| Email service (SMTP / SES / Mailgun) | Password reset emails         | Backend-owned config. FE just calls `POST /api/users/:id/reset-password` and trusts the email goes out. |
| (Optional) OAuth providers           | Future — Google/Microsoft SSO | Out of scope for MVP per CLAUDE.md §11.5.                                                               |

---

## 6. Tenant guard implementation notes

The single most important piece of code in this service is the tenant guard middleware. Pseudocode:

```ts
async function tenantGuard(req, res, next) {
  const session = await verifyCookie(req)
  if (!session) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: '...' } })

  req.session = session // { user_id, role, hotel_id, dept_id }

  // super_admin bypass — sets up a flag downstream queries respect
  req.tenantScope =
    session.role === 'super_admin'
      ? { type: 'all-hotels' }
      : { type: 'single-hotel', hotel_id: session.hotel_id }

  next()
}
```

Then every query helper consumes `req.tenantScope`:

```ts
function scopedTickets(req) {
  const q = db.tickets()
  if (req.tenantScope.type === 'single-hotel') {
    q.where('hotel_id', req.tenantScope.hotel_id)
  }
  return q
}
```

**Anti-pattern to avoid**: passing `hotel_id` as a function argument from handler code. It's too easy to forget. Make it a property of the request context that queries read implicitly.

---

## 7. Open questions

See `shared/open-questions.md`:

- **Q-CONTRACT-15**: password-change endpoint shape (ASSUMED).
- **Q-CONTRACT-16**: PII masking semantic (ASSUMED — compound `vvip AND non-gm`).
- **Q-CONTRACT-22**: Hotels Admin shape + suspend semantic + atomic GM-user creation (PO-ratified H11 — see `shared/open-questions.md` Q-22 resolved block).
- **Q-CONTRACT-23**: Tiers lookup shape + read scope (NEW H11; super_admin-only read in MVP).
- **Q-CONTRACT-24**: Cross-hotel Admin Users surface (NEW H11; role/hotel_id mutual-exclusion validation).
- **Q-OPS-01**: super_admin provisioning (RESOLVED H11 — first super_admin via migration / CLI `seed-super-admin`; subsequent via `POST /api/admin/users`).
- **Q-OPS-02**: session timeout / sliding refresh policy?

---

## 8. Phase 1 MSW reference

| What                | File                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handlers            | `src/mocks/handlers/{auth,users,hotels,admin}.handlers.ts`                                                                                                                 |
| Fixtures            | `src/mocks/fixtures/{auth,users,admin-hotels,...}.ts` (tiers fixture TBD when MSW catches up to H11 contract)                                                              |
| FE services         | `src/services/{auth,users,hotels,admin}.api.ts`                                                                                                                            |
| Types               | `src/types/api.ts` (`User`, `AuthMeResponse`, `SettingsUser`, `AdminHotel`, `Tier`)                                                                                        |
| RBAC guard          | `src/components/common/Authorized.tsx`                                                                                                                                     |
| Login form          | `src/features/auth/components/LoginForm.tsx`                                                                                                                               |
| Profile page        | `src/pages/_auth/profile.tsx` + `src/features/profile/*`                                                                                                                   |
| Admin hotels page   | `src/pages/_auth/admin/hotels.tsx` (T75 super_admin-only list)                                                                                                             |

Diff your implementation against `src/mocks/handlers/{auth,users,admin}.handlers.ts` — those are the literal shapes FE expects today. **Note**: as of H11, the MSW fixtures still reflect the pre-H11 service split (hotels in Hotel Core's `hotels.handlers.ts`). When backend implements per this doc, the FE-side reshuffle is a small MSW-only move; no runtime FE code changes (URL paths stable).

If you need to deviate from any shape, raise it in `shared/open-questions.md`.
