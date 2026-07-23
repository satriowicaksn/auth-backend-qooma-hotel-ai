# API CONTRACT

> **Authority**: this document mirrors the API surface the frontend consumes. It is derived from techspec §8.3, §8.4, the routes table §8.2, and the assumed contracts approved by the product owner during planning (auth, notifications).
>
> Frontend builds MSW (Mock Service Worker, REST) handlers from THIS file during Phase 1. Backend implements the same contract during Phase 2. When the OpenAPI schema is frozen at H10 (Gate G1), this document becomes the human-readable summary; the OpenAPI YAML file is the machine source.
>
> Any deviation between this document and the OpenAPI spec is a bug that must be reconciled before integration window H21–H22.

---

## 1. Conventions

### 1.1 Base URL & versioning

- Base URL (env): `VITE_API_BASE_URL` (e.g. `https://api.qooma.com`)
- No URL versioning prefix on the path (e.g. `/api/tickets`, not `/v1/api/tickets`). The major version is the entire deployment.

### 1.2 Authentication

- **httpOnly cookie** set by backend on login. Frontend never reads the JWT directly.
- Every request from frontend sends `credentials: 'include'`.
- Mutating verbs (POST, PUT, PATCH, DELETE) require a `X-CSRF-Token` header. The token is returned in the login response body and held in memory (NOT localStorage). **CSRF enforcement ships OFF this wave** (T82 Q-INT-AUTH-02): a double-submit `preHandler` (`src/plugins/csrf-guard.plugin.ts`) compares the header against the session's stored `csrf_token` (timing-safe), gated behind the `CSRF_ENFORCE` env flag (default `false`). Enable only after the FE cold-boot csrf-seeding is verified on staging.
- **CORS + rate-limit** are registered in `buildApp()` (T82 D.2/D.4): `@fastify/cors` (credentials, origins from `CORS_ORIGIN`, allows `X-CSRF-Token`), a global `@fastify/rate-limit` (`RATE_LIMIT_GLOBAL_PER_MIN`), and a tighter per-route cap on `POST /api/auth/login` (`RATE_LIMIT_LOGIN_PER_MIN`). The rate-limit 429 error uses code `RATE_LIMIT` (not `RATE_LIMIT_EXCEEDED`).
- 401 from any endpoint → axios interceptor calls `POST /api/auth/refresh` once. If refresh also returns 401, the user is redirected to `/login`. After successful login, redirect always lands on `/dashboard` (no deep-link restoration).
- Hotel context is encoded in the JWT (`hotel_id`). Backend uses it to scope every query. Frontend does NOT pass `hotel_id` as a query param.

### 1.3 Encoding

- All requests and responses are `application/json; charset=utf-8` (file uploads use `multipart/form-data` — only used in menu image upload, which is handled server-side per product-owner instruction; frontend just forwards the multipart form).
- All timestamps are ISO-8601 UTC: `2026-06-11T07:32:14.123Z`. Frontend converts to hotel timezone on render.
- All money fields are integers in IDR cents? **NO** — spec uses `DECIMAL(12,2)`. Frontend treats money fields as `number` IDR (whole rupiah), formats via `Intl.NumberFormat`.
- All IDs are UUIDs (string).
- Booleans are real `true`/`false`, not `0`/`1`.
- Enum fields use the exact lowercase string values from the spec (e.g. `status: 'in_progress'`).

### 1.4 Pagination

List endpoints support cursor-style pagination:

```http
GET /api/tickets?limit=20&cursor=eyJpZCI6Ii4uLiJ9
```

Response envelope:

```json
{
  "data": [ /* items */ ],
  "pageInfo": {
    "nextCursor": "eyJpZCI6Ii4uLiJ9" | null,
    "hasMore": true
  }
}
```

If a list response does NOT have `pageInfo`, treat as single page.

### 1.5 Errors

All error responses follow:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'priority' must be one of: low, normal, high, urgent.",
    "details": { "field": "priority", "received": "extreme" }
  }
}
```

Standard codes the frontend MUST handle:

| HTTP | Code               | Frontend behavior                                                                              |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Show inline form errors (parse `details.field`)                                                |
| 401  | `UNAUTHENTICATED`  | Trigger refresh; on second 401, redirect to `/login`                                           |
| 403  | `FORBIDDEN`        | Route-level: show `/403` page. Action-level: toast "Anda tidak memiliki akses untuk aksi ini." |
| 404  | `NOT_FOUND`        | Route-level: show `/404` page. Resource-level: toast "Data tidak ditemukan."                   |
| 409  | `CONFLICT`         | Toast "Data sudah berubah, silakan refresh." Re-fetch query.                                   |
| 422  | `BUSINESS_RULE`    | Toast with `message` field — server rule violation (e.g. "Jumlah agent melebihi batas paket").  |
| 429  | `RATE_LIMIT`       | Toast "Terlalu banyak permintaan, coba lagi nanti."                                            |
| 500  | `INTERNAL`         | Toast generic, send to Sentry.                                                                 |

---

## 2. Endpoints by domain

### 2.1 Auth (ASSUMED CONTRACT — not in original techspec)

> **Service ownership (PO ruling H11 2026-06-27)** — the Auth service owns **identity + tenancy + tier**. Concretely: §2.1 (Auth core), §2.1a (Hotels — single read), §2.1b (Tiers — NEW), §2.5a (Users — gm_admin scope, was already Auth), §2.5b (Admin Users — NEW super_admin scope), §2.14 (Hotels Admin — moved here from Hotel Core). Hotel Core (`02-hotel-core.md`) now owns operational config only (departments / tickets / guests / visits / menu / KB / WA templates / feature flags / billing / integrations). Endpoint URLs are stable — only the implementing service changes.

| Method | Path                | Purpose                                         | Roles         |
| ------ | ------------------- | ----------------------------------------------- | ------------- |
| POST   | `/api/auth/login`   | Login with email + password                     | public        |
| POST   | `/api/auth/logout`  | Clear cookie                                    | authenticated |
| POST   | `/api/auth/refresh` | Rotate token (idempotent)                       | cookie-bearer |
| GET    | `/api/auth/me`      | Current user profile + language preference      | authenticated |
| PATCH  | `/api/auth/me`      | Update user preferences (currently: `language`) | authenticated |
| POST   | `/api/auth/me/password` | Change own password (Q-CONTRACT-15)         | authenticated |

> **Q-CONTRACT-01 (resolved H3):** `AuthMeResponse` no longer carries `hotel`. Hotel context (id + tier) moved to its own endpoint — see §2.1a. `AuthMeResponse = { user, csrfToken }`; `User` carries `hotel_id` (FK), `dept_id`, and `language`.

#### POST `/api/auth/login`

Request:

```json
{ "email": "gm@hotel-example.com", "password": "..." }
```

Response 200:

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
  "csrfToken": "..."
}
```

Side effect: sets `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Lax`.

#### GET `/api/auth/me`

Response 200: same `{ user, csrfToken }` shape (csrfToken rotates per call). Frontend calls this on app boot to determine auth state. The `user.language` value (`'id' | 'en'`) is applied via `i18n.changeLanguage()` on hydration.

#### PATCH `/api/auth/me`

Request:

```json
{ "language": "en" }
```

Response 200:

```json
{
  "user": {
    /* updated user with new language */
  }
}
```

Used by the language toggle to persist the user's locale preference server-side. Frontend treats this as fire-and-forget — local i18n state changes immediately; PATCH failure logs an error but does NOT roll back the UI (user can retry by toggling again).

---

### 2.1a Hotel (Q-CONTRACT-01 — resolved H3; service ownership Auth per H11 ruling)

| Method | Path             | Purpose                                    | Roles         |
| ------ | ---------------- | ------------------------------------------ | ------------- |
| GET    | `/api/hotels/me` | Hotel context (id + tier) for current user | authenticated |

#### GET `/api/hotels/me`

Response 200:

```json
{ "id": "uuid", "tier": "luxury" }
```

`tier` is one of `'lite' | 'professional' | 'luxury' | 'enterprise'` (the `tiers.name` string, returned FLAT — the scoped context exposes `tier.name` directly, not a `{id,name}` object; T82 D.1 reconciled the repository to this shape). Returns the hotel for the authenticated user (1:1 via `user.hotel_id`). This is the tier source for the `/analytics` route guard (§2.4). Replaces the pre-H10 ASSUMED `hotel` sibling on `AuthMeResponse`. **Implementing service: Auth.** Backed by Auth's `hotels` + `tiers` tables (per H11 service-split ruling — see §2.1 ownership note).

> **super_admin (T82 / Q-INT-AUTH-01):** platform-level admins have no single-hotel scope, so `GET /api/hotels/me` returns `{ "id": null, "tier": null }` for `super_admin` (`HotelsService` short-circuits on the `all-hotels` scope). The FE treats a null tier as all-access, never down-gated to `'lite'`.

---

### 2.1b Tiers (BARU — H11 service-split ruling, ASSUMED CONTRACT Q-CONTRACT-23)

Tier lookup table. Normalizes the per-tier config (agent cap, feature set) that was previously inline in CLAUDE.md §1. Owned by Auth. Outbound messaging is prepaid top-up (tier-independent — see §2.12); tiers carry no monthly quota and no minimum-agent floor.

| Method | Path                  | Purpose                              | Roles         |
| ------ | --------------------- | ------------------------------------ | ------------- |
| GET    | `/api/admin/tiers`    | List all tiers + per-tier config     | `super_admin` |
| GET    | `/api/admin/tiers/:name` | Single tier detail                | `super_admin` |

`Tier` shape:

```json
{
  "id": "uuid",
  "name": "luxury",
  "display_name": "Luxury",
  "agent_cap": 6,
  "user_cap": 6,
  "department_cap": 5,
  "features": {
    "analytics": true,
    "vip_profile": true,
    "privacy_mode": true,
    "voice_groundwork": true,
    "..."
  },
  "is_custom": false
}
```

- `name` ∈ `'lite' | 'professional' | 'luxury' | 'enterprise'` (unique).
- `is_custom: true` for `enterprise` (per-tenant overrides allowed; not in MVP — see §2.14 enterprise note).
- `features` is JSONB (mirrors the feature-flag matrix in `docs/DEVELOPMENT-PLAN.md` + CLAUDE.md §1). Backend authoritative; FE reads as opaque.
- PATCH `/api/admin/tiers/:name` is **OUT OF SCOPE for Phase 2.8 / MVP** — tier config is migration-seeded; mutate at the DB layer if needed before backend write UI exists.

#### GET `/api/admin/tiers`

Response 200:

```json
{ "data": [Tier, ...] }
```

Returns all 4 tier rows. No pagination (fixed set).

#### Error envelopes

- `403 FORBIDDEN` — non-`super_admin` hits any `/api/admin/tiers*` endpoint
- `404 NOT_FOUND` — unknown `:name`

> **Q-CONTRACT-23 (ASSUMED — Phase 2.8 H11)**: tier lookup shape + super_admin-only read scope. PO ratifies post-merge. If PO directs broader read scope (e.g. gm_admin sees their own tier's full config for upsell UX), MSW + types patch at H21.

---

### 2.2 Tickets (techspec §8.3)

| Method | Path                          | Purpose                                                             | Roles                                          |
| ------ | ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| GET    | `/api/tickets`                | List with filter (dept, status, date, priority), search, pagination | `gm_admin`, `dept_head` (filtered to own dept) |
| GET    | `/api/tickets/:id`            | Detail + updates + messages                                         | `gm_admin`, `dept_head` (only own dept)        |
| PATCH  | `/api/tickets/:id/status`     | Update status from CRM                                              | `gm_admin`, `dept_head`                        |
| PATCH  | `/api/tickets/:id/department` | Reroute ticket to another department (Q-CONTRACT-08)                | `gm_admin`                                     |
| GET    | `/api/tickets/stats`          | Counts by status (open / in_progress / done / escalated)            | `gm_admin`, `dept_head` (filtered to own dept) |
| GET    | `/api/tickets/overdue`        | List of tickets over SLA                                            | `gm_admin`, `dept_head`                        |

#### GET `/api/tickets`

Query params: `status` (csv), `department_id` (csv), `priority` (csv), `date_from` (ISO date), `date_to` (ISO date), `q` (search), `limit`, `cursor`.

Response 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "ticket_number": "#HSK-2606-047",
      "title": "Handuk tambahan kamar 1204",
      "status": "in_progress",
      "priority": "normal",
      "department": { "id": "uuid", "name": "Housekeeping", "code": "HSK" },
      "guest": {
        "id": "uuid",
        "wa_phone_masked": "+62812***6789",
        "name": "Budi",
        "is_vip": false,
        "privacy_mode": "standard"
      },
      "assigned_to": "+62811xxx",
      "sla_deadline": "2026-06-11T08:00:00Z",
      "is_overdue": false,
      "is_high_alert": false,
      "created_at": "2026-06-11T07:32:14Z",
      "updated_at": "2026-06-11T07:35:01Z"
    }
  ],
  "pageInfo": { "nextCursor": "...", "hasMore": true }
}
```

Note on `wa_phone_masked`: the backend masks the phone before sending to non-GM roles AND for any guest with `privacy_mode='vvip'`. Frontend does NOT mask client-side (don't trust the client). Frontend ONLY renders what backend sends.

#### PATCH `/api/tickets/:id/status`

Request:

```json
{ "status": "closed", "note": "Optional staff note" }
```

Allowed transitions are server-enforced per spec §6.2:

- `open` → `in_progress`
- `in_progress` → `awaiting_late_reason` | `done_pending` | `escalated`
- `awaiting_late_reason` → `done_pending`
- `done_pending` → `closed` (auto after 15 min OR via guest reply)
- `done_pending` → `high_alert` (guest says "Belum ada")
- `high_alert` → `in_progress`
- Any open status → `cancelled`

Frontend applies **optimistic update** + rollback on error.

---

### 2.3 Guests (techspec §8.3)

| Method | Path                            | Purpose                                                    | Roles      |
| ------ | ------------------------------- | ---------------------------------------------------------- | ---------- |
| GET    | `/api/guests`                   | List with search                                           | `gm_admin` |
| GET    | `/api/guests/:id`               | Profile + preferences + visit history                      | `gm_admin` |
| PATCH  | `/api/guests/:id`               | Update profile, privacy mode, VIP flag                     | `gm_admin` |
| POST   | `/api/guests/:id/preferences`   | Add or update preference (room/fnb/habits/occasion/travel) | `gm_admin` |
| GET    | `/api/guests/:id/messages`      | Conversation history (paginated)                           | `gm_admin` |
| GET    | `/api/visits`                   | List visits (incl. `?status=pending_verification`)         | `gm_admin` |
| PATCH  | `/api/visits/:id/verify-manual` | Manual evening verification (Q-CONTRACT-03)                | `gm_admin` |
| PATCH  | `/api/visits/:id/checkin`       | System check-in (backend-driven; FE `{}` 200 stub)         | `gm_admin` |

> **Backend-owned visit endpoints (NOT FE-mocked at Phase 1)** — documented for backend reference; the frontend mock layer does not serve them, so they are intentionally excluded from the handler↔contract bijection: `POST /api/visits` (create visit / manual booking entry), `PATCH /api/visits/:id/checkout` (check-out + survey).

#### GET `/api/guests/:id`

Response 200:

```json
{
  "id": "uuid",
  "wa_phone": "+628123456789",
  "wa_phone_masked": null,
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "language": "id",
  "privacy_mode": "standard",
  "is_vip": false,
  "vip_level": null,
  "total_stays": 3,
  "last_visit_at": "2026-05-04T11:00:00Z",
  "notes": "Prefers high floor.",
  "preferences": [
    {
      "id": "uuid",
      "category": "room",
      "key": "floor_preference",
      "value": "high",
      "source": "manual",
      "confidence": 1.0
    }
  ],
  "visits": [
    {
      "id": "uuid",
      "check_in_date": "2026-05-01",
      "check_out_date": "2026-05-04",
      "room_number": "1204",
      "status": "checked_out",
      "booking_source": "booking.com",
      "occasion": "anniversary"
    }
  ]
}
```

#### Pending verification (used by Dashboard card)

Frontend lists pending-verification visits via `GET /api/visits?status=pending_verification` and confirms via `PATCH /api/visits/:id/verify-manual`.

#### PATCH `/api/visits/:id/verify-manual` (Q-CONTRACT-03 — resolved H3; body extended 2026-06-24 for T69)

Request (approve):

```json
{ "guest_name": "Budi Santoso", "room_number": "1204", "nights": 2 }
```

- **`nights`** (integer ≥ 1, added for T69 per techspec §6.9.6 / ADD-01.3): length of stay chosen from the verify dialog dropdown (1–7, with a custom input for >7). The backend derives the **checkout datetime** from `check_in (13:00) + nights → 11:00`; the FE computes the same value ONLY for inline display/preview and does NOT send a checkout field (single source of truth = backend).

Response 200: the updated `PendingVerificationVisit` (`status: "checked_in"`). `422 BUSINESS_RULE` if already verified, `422 VALIDATION_ERROR` on bad input (incl. missing/invalid `nights`). Roles: `gm_admin` only (FE guards via `<Authorized>`; backend enforces too). The separate `/checkin` action is reserved for backend system check-in and is NOT FE-driven (the mock returns `{}` 200).

**Reject action (T69):** the verify dialog's reject `[✗]` dismisses a pending visit. Until the backend confirms a dedicated path, the FE/mock treats reject as `PATCH /api/visits/:id/verify-manual` with `{ "action": "reject" }` → `status: "rejected"` (mock-only; **Q-CONTRACT-15 open** — backend to confirm whether reject is this action flag, a `DELETE`, or a generic status PATCH at H21). FE keeps it isolated behind `visits.api.ts` so the wiring swaps cleanly.

---

### 2.4 Analytics (Luxury tier only — techspec §8.3)

| Method | Path                          | Purpose                                           |
| ------ | ----------------------------- | ------------------------------------------------- |
| GET    | `/api/analytics/overview`     | KPI: response time, completion rate, satisfaction |
| GET    | `/api/analytics/tickets`      | Volume per day (chart data)                       |
| GET    | `/api/analytics/departments`  | Dept performance comparison                       |
| GET    | `/api/analytics/peak-hours`   | Heatmap of active hours                           |
| GET    | `/api/analytics/top-requests` | Most-frequent request categories                  |
| GET    | `/api/analytics/satisfaction` | Satisfaction trend                                |
| GET    | `/api/analytics/export`       | Download Excel/PDF report                         |

#### GET `/api/analytics/export`

Query params: `format` (`xlsx` | `pdf`), `period` (`day` | `week` | `month`), `from`, `to`.

Response: `application/octet-stream`. Frontend triggers download via `window.open` or `<a download>`; **does NOT generate PDF/Excel client-side** (per product-owner — backend produces these files).

#### Tier gating

Frontend checks `tier === 'luxury'` from `hotels.tier` before exposing `/analytics`. If the tier downgrade happens mid-session, the next route load triggers a 403 → show the route-level forbidden page with explanation.

---

### 2.5 Settings (techspec §8.3)

> **Service ownership (H11 ruling)** — these endpoints are owned by **Hotel Core** (operational per-hotel config) EXCEPT `/api/settings/hotel` which moved to Auth (writes to Auth's `hotels` table — see §2.5c below). Users (§2.5a) and admin users (§2.5b) are Auth-owned.

| Method        | Path                                          | Purpose                                                         |
| ------------- | --------------------------------------------- | --------------------------------------------------------------- |
| GET, POST     | `/api/settings/departments`                   | List / create departments                                       |
| PATCH, DELETE | `/api/settings/departments/:id`               | Update / delete department (409 if users assigned)              |
| GET, POST     | `/api/settings/menu`                          | List / create menu items (multipart image)                      |
| PATCH, DELETE | `/api/settings/menu/:id`                      | Update / delete menu item                                       |
| POST          | `/api/settings/menu/categories`               | Create menu category                                            |
| PATCH, DELETE | `/api/settings/menu/categories/:id`           | Update / delete menu category                                   |
| GET, POST     | `/api/settings/knowledge`                     | List / create knowledge entries (CSV import below)              |
| PATCH, DELETE | `/api/settings/knowledge/:id`                 | Update / delete knowledge entry                                 |
| POST          | `/api/settings/knowledge/import`              | CSV bulk import                                                 |
| GET           | `/api/settings/promos`                        | List promos (stub)                                              |
| GET           | `/api/settings/upsells`                       | List upsells (stub)                                             |
| GET           | `/api/settings/agents`                        | List AI agents                                                  |
| PUT           | `/api/settings/agents`                        | Bulk update agents (toggle; upper agent_cap tier-validated server-side) |
| PATCH         | `/api/settings/agents/:id`                    | Update one AI agent                                             |
| GET           | `/api/settings/billing`                       | Billing overview, quota, invoices (Q-CONTRACT-05)               |
| GET           | `/api/settings/billing/invoices/:id/download` | Download invoice                                                |
| GET, PUT      | `/api/settings/voice`                         | PBX config / SIP credentials (Q-CONTRACT-05)                    |
| POST          | `/api/settings/voice/test`                    | Test SIP connection (returns `{ latency_ms }`)                  |

> **Q-CONTRACT-04 (resolved H3):** CRM **users** moved out of settings to top-level REST — see §2.5a. Departments / menu / knowledge / agents stay under `/api/settings/*`.
> **Q-CONTRACT-05 (resolved H3):** `billing` and `voice` URL pattern + shapes ratified as above.
> **Not FE-mocked at Phase 1** (backend-owned): `/api/settings/features` (per-hotel feature flags) — no MSW handler, excluded from the bijection.

#### Knowledge base CSV import

```http
POST /api/settings/knowledge/import
Content-Type: multipart/form-data
```

Body: `file=<knowledge.csv>` with columns `category,question,answer,keywords` (semicolon-separated keywords).

Response: `{ "imported": 47, "skipped": 3, "errors": [{ "row": 12, "reason": "missing question" }] }`.

---

### 2.5a Users (Q-CONTRACT-04 — resolved H3, top-level REST; service: Auth)

| Method | Path                            | Purpose                                                          | Roles      |
| ------ | ------------------------------- | ---------------------------------------------------------------- | ---------- |
| GET    | `/api/users`                    | List CRM users (own hotel only)                                  | `gm_admin` |
| POST   | `/api/users`                    | Create dept_head/staff user for own hotel (gen + return password) | `gm_admin` |
| PATCH  | `/api/users/:id`                | Update user (own hotel)                                          | `gm_admin` |
| POST   | `/api/users/:id/reset-password` | Trigger password reset email (or regen + return — see below)     | `gm_admin` |

`SettingsUser = { id, email, name, role, dept_id, is_active, last_login_at, language, must_rotate_password }`.

- **`POST` body**: `{ email, name, role, dept_id?, language }` where `role ∈ 'dept_head' | 'staff'` (gm_admin cannot create another gm_admin or super_admin via this endpoint — those are super_admin-scoped, see §2.5b).
- **`POST` response 201**: `{ user: SettingsUser, generated_password: string }` — **plaintext password returned ONCE** (16-char alphanumeric+symbols, generated server-side per H11 PO ruling). FE displays it on the create-success toast/modal with a copy button; never persisted client-side. `must_rotate_password: true` is set on the user row → next login forces password change via `POST /api/auth/me/password`.
- **`PATCH` body**: `Partial<{ name, role, dept_id, is_active, language }>` → `200`. `email` immutable post-create (recreate user if needed).
- **`POST /:id/reset-password`**: regenerates password server-side, returns `{ generated_password }` in response (same UX as create — admin reads to user). Email-based reset is OUT OF MVP (no SMTP wired in Phase 2.8).
- `is_active: false` = soft-delete (no hard DELETE — preserve audit-trail FKs). User can't log in, sessions revoked.

Replaces the pre-H10 ASSUMED `GET/PUT /api/settings/users`.

---

### 2.5b Admin Users (BARU — H11 service-split ruling, Q-CONTRACT-24)

Cross-hotel user administration for super_admin. The only way to create a `super_admin` user or to create users in a hotel other than your own. Resolves Q-OPS-01 (super_admin provisioning).

| Method | Path                              | Purpose                                            | Roles         |
| ------ | --------------------------------- | -------------------------------------------------- | ------------- |
| GET    | `/api/admin/users`                | List users across all hotels (filter by hotel_id)  | `super_admin` |
| POST   | `/api/admin/users`                | Create user of ANY role in ANY hotel               | `super_admin` |
| PATCH  | `/api/admin/users/:id`            | Update user (any hotel)                            | `super_admin` |
| POST   | `/api/admin/users/:id/reset-password` | Regenerate + return password (any hotel)       | `super_admin` |

- **`POST` body**: `{ email, name, role, hotel_id?, dept_id?, language }` where `role ∈ 'super_admin' | 'gm_admin' | 'dept_head' | 'staff'`. `hotel_id` is **required for non-super_admin**, **must be omitted/null for super_admin** (platform-level user).
- **`POST` response 201**: `{ user: SettingsUser & { hotel_id: string | null }, generated_password: string }` — same generate-and-return semantic as §2.5a.
- **`GET` query params**: `?hotel_id=<uuid>` (filter to one hotel), `?role=<role>`, `?is_active=<bool>`. No pagination in MVP (≤ a few hundred users platform-wide expected; add when needed).
- First super_admin is **seeded via DB migration / CLI bootstrap**, NOT via this endpoint (chicken-and-egg). Document the seed mechanism in `shared/open-questions.md` Q-OPS-01 (now RESOLVED) so support team can rotate.

#### Errors

- `403 FORBIDDEN` — non-`super_admin` hits any `/api/admin/users*` endpoint
- `400 VALIDATION_ERROR` — `role: 'super_admin'` with non-null `hotel_id`, OR `role !== 'super_admin'` with null `hotel_id`, OR malformed email/role
- `409 CONFLICT` — `email` already exists within target hotel (or platform-wide for super_admin)
- `422 BUSINESS_RULE` — attempting to demote the last super_admin (must keep at least one)

> **Q-CONTRACT-24 (ASSUMED — Phase 2.8 H11)**: cross-hotel admin user surface + role/hotel_id mutual-exclusion validation. PO ratifies post-merge.

---

### 2.5c Hotel settings (service: Auth — moved from §2.5 per H11 ruling)

The "hotel profile" page in the CRM (timezone, DND windows, branding hints). Writes to Auth's `hotels` table — that's why it moved.

| Method   | Path                  | Purpose                                                         | Roles      |
| -------- | --------------------- | --------------------------------------------------------------- | ---------- |
| GET, PUT | `/api/settings/hotel` | Hotel info & config (timezone, branding hint, DND windows)      | `gm_admin` |

Shape: subset of the `hotels` row visible to gm_admin (excludes platform-level fields like `code`, `status`, `tier`, `gm_contact` — those mutate via §2.14 super_admin endpoints). DND embedding per Q-CONTRACT-10.

---

### 2.6 Notifications (ASSUMED CONTRACT — product-owner Q7 = B)

| Method | Path                               | Purpose                                     |
| ------ | ---------------------------------- | ------------------------------------------- |
| GET    | `/api/notifications`               | List notifications, filterable by `is_read` |
| GET    | `/api/notifications/unread-count`  | Unread badge count for header bell          |
| PATCH  | `/api/notifications/:id/read`      | Mark single as read                         |
| POST   | `/api/notifications/mark-all-read` | Mark all as read                            |

> **Q-CONTRACT-02 (resolved H3):** the 4 notification shapes are ratified verbatim as locked at T15 (PM-HISTORY §T15).

Server persists notifications generated by socket events (new ticket, escalation, message). Frontend bell dropdown calls `GET /api/notifications?limit=20` and merges with socket-pushed events for real-time UX.

Notification object:

```json
{
  "id": "uuid",
  "type": "ticket_created" | "ticket_escalated" | "message_new" | "high_alert",
  "title": "Tiket baru #HSK-2606-048",
  "body": "Handuk tambahan kamar 1204",
  "link": "/tickets/uuid",
  "is_read": false,
  "created_at": "2026-06-11T07:32:14Z"
}
```

---

### 2.7 Integrations (BARU — gap-closure batch, ASSUMED CONTRACT Q-CONTRACT-07)

WA account + Telegram bot + QR code + Claude API health. Used by `/settings/integrations` page.

| Method | Path                                              | Purpose                                                    |
| ------ | ------------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/integrations`                               | Full integration state (WA, Telegram, Claude API, QR)      |
| PUT    | `/api/integrations/whatsapp`                      | Update WA config (BSP, phone_number, access_token)         |
| POST   | `/api/integrations/whatsapp/verify-webhook`       | Test WA webhook (server pings configured URL)              |
| PUT    | `/api/integrations/telegram`                      | Update Telegram bot config (bot_token, gm_telegram_id)     |
| PUT    | `/api/integrations/telegram/departments/:dept_id` | Set per-dept `telegram_chat_id` + `supervisor_telegram_id` |
| POST   | `/api/integrations/qr/regenerate`                 | Re-generate QR PNG (returns new URL + PNG download path)   |
| GET    | `/api/integrations/qr/download`                   | Stream QR PNG file (1024x1024 high-res)                    |
| GET    | `/api/integrations/health`                        | Claude API + WA + Telegram status snapshot                 |

#### Shape: `IntegrationState`

```json
{
  "whatsapp": {
    "is_configured": true,
    "phone_number": "+6281xxxxxxxx",
    "bsp": "1engage",
    "webhook_url": "https://api.qooma.com/webhook/whatsapp/the-ritz",
    "access_token_set": true,
    "last_message_at": "2026-06-18T05:12:33Z"
  },
  "telegram": {
    "is_configured": true,
    "bot_username": "@ritz_qooma_bot",
    "gm_telegram_id": 123456,
    "departments": [
      { "dept_id": "uuid", "dept_code": "HSK", "telegram_chat_id": "-100xxx", "supervisor_telegram_id": 234567 }
    ]
  },
  "qr_code": {
    "url": "https://wa.me/6281xxx?text=Halo",
    "png_url": "https://s3.../hotel_qr_the-ritz.png",
    "generated_at": "2026-06-15T10:00:00Z"
  },
  "claude_api": {
    "status": "healthy" | "degraded" | "down",
    "last_check_at": "2026-06-18T05:14:01Z",
    "uptime_30d": 99.7,
    "avg_response_ms": 1284
  }
}
```

Health is polled by `/settings/integrations` page (TanStack Query `refetchInterval: 60_000`). On `down`, show toast destructive + integration status badge `<HealthBadge status="down">`.

---

### 2.8 Feature Flags (BARU — Appendix C, ASSUMED CONTRACT Q-CONTRACT-08)

| Method | Path                       | Purpose                                             |
| ------ | -------------------------- | --------------------------------------------------- |
| GET    | `/api/feature-flags`       | List all 19 flags with current state + tier minimum |
| PATCH  | `/api/feature-flags/:flag` | Toggle one flag (server enforces tier check)        |

#### Shape: `FeatureFlagListItem`

```json
{
  "flag": "menu_ordering",
  "category": "addon",
  "min_tier": "addon",
  "is_enabled": true,
  "is_tier_locked": false,
  "config": { "whatsapp_catalog_id": "...", "departments": ["FNB"] },
  "depends_on_active_data": { "campaigns_count": 0, "menu_items_count": 12 }
}
```

`is_tier_locked: true` when `hotel.tier < min_tier` → FE renders toggle disabled with upgrade prompt. PATCH body: `{ is_enabled: bool, config?: object }`. On 422 BUSINESS_RULE → toast with reason (e.g. "Tidak bisa nonaktifkan: ada 3 campaign aktif").

> Replaces the pre-H10 ASSUMED `/api/settings/features` (Q-CONTRACT-08 supersedes Q-CONTRACT-05's feature-flag part).

---

### 2.9 WhatsApp Templates (BARU — ADD-08, ASSUMED CONTRACT Q-CONTRACT-09)

For `/settings/wa-templates` page. Meta-mandated approval workflow.

| Method | Path                             | Purpose                                               |
| ------ | -------------------------------- | ----------------------------------------------------- |
| GET    | `/api/wa-templates`              | List all templates (global + hotel-specific)          |
| POST   | `/api/wa-templates`              | Submit a new template for Meta approval               |
| PATCH  | `/api/wa-templates/:id`          | Edit pending template content (locked after approved) |
| DELETE | `/api/wa-templates/:id`          | Cancel pending or archive rejected/approved           |
| POST   | `/api/wa-templates/:id/resubmit` | Resubmit rejected after editing                       |

#### Shape: `WaTemplate`

```json
{
  "id": "uuid",
  "template_name": "qooma_pre_arrival",
  "is_global": false,
  "template_id_meta": "12345678",
  "status": "pending" | "approved" | "rejected" | "archived",
  "language": "id",
  "content": "Halo {{guest_name}}! Kami senang Anda akan menginap di {{hotel_name}} besok...",
  "variables": ["guest_name", "hotel_name", "checkin_date"],
  "rejection_reason": null,
  "submitted_at": "2026-06-15T10:00:00Z",
  "approved_at": "2026-06-15T18:42:11Z"
}
```

8 standard template names (per ADD-08.2): `qooma_pre_arrival`, `qooma_welcome`, `qooma_survey`, `qooma_campaign`, `qooma_upsell`, `qooma_daily_brief`, `qooma_outbound_limit`, `qooma_session_expired`. Global templates (is_global=true) are pre-approved and read-only at hotel level.

---

### 2.10 Operating Hours & DND (BARU — ADD-07, departments embedded + hotel-level DND)

Per-department operating hours embedded in department object (extension to existing `/api/settings/departments`):

```json
{
  "id": "uuid",
  "name": "Housekeeping",
  "code": "HSK",
  "operating_hours": {
    "is_24h": false,
    "open_time": "08:00",
    "close_time": "22:00",
    "operational_days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    "timezone": "Asia/Jakarta"
  },
  "escalation_chain": {
    /* see 2.11 */
  },
  "telegram_chat_id": "...",
  "supervisor_telegram_id": 123456
}
```

DND window is hotel-level config in `GET/PUT /api/settings/hotel` response extended:

```json
{
  "dnd": {
    "start_time": "23:00",
    "end_time": "07:00",
    "exception_inbound": true,
    "exception_vvip": true
  }
}
```

---

### 2.11 Escalation Tree (BARU — ADD-12.3, embedded in department)

Per-department escalation chain config in department object:

```json
{
  "escalation_chain": {
    "l1_sla_minutes": 5,
    "l2_user_id": "uuid",
    "l2_sla_minutes": 5,
    "l3_user_id": "uuid",
    "skip_to_l3_categories": ["vvip", "urgent", "complaint"]
  }
}
```

Updated via `PATCH /api/settings/departments/:id { escalation_chain: {...} }`. L2/L3 user dropdown sourced from `/api/users?role=dept_head&dept_id=:dept_id` (L2) and `/api/users?role=gm_admin` (L3).

---

### 2.12 Billing (BARU — ADD-13, full shape)

Replaces stub `/api/settings/billing` with full ADD-13 shape:

```json
{
  "tier": "professional",
  "tier_started_at": "2026-01-01",
  "outbound_quota": {
    "balance_total": 7000,
    "balance_remaining": 1400,
    "percent_remaining": 20,
    "threshold_alerts": [{ "at": 20, "alerted_at": "2026-06-15T10:00:00Z" }]
  },
  "active_agents": ["receptionist", "request_complaint", "fnb"],
  "active_users_count": 4,
  "extra_addons": [{ "type": "outbound_topup", "package": "M", "added_messages": 7000 }],
  "invoices": [
    {
      "id": "uuid",
      "month": "2026-05",
      "amount": 0,
      "currency": "IDR",
      "status": "paid",
      "pdf_url": "..."
    }
  ],
  "daily_brief_pdf_url_latest": "..."
}
```

**Outbound is prepaid, not tier-included.** `outbound_quota` is a **prepaid balance** (`balance_total` purchased, `balance_remaining` left, `percent_remaining` derived) — there is NO monthly allotment and NO monthly reset; the balance only refills when a top-up is purchased. `threshold_alerts[].at` is a **remaining** percentage; low-balance alerts fire at **20%** and **5%** remaining.

`POST /api/billing/outbound-topup { package: 'S'|'M'|'L' }` — tier-independent prepaid top-up (S=3000, M=7000, L=14000 messages). Backend confirms via tim Qooma; returns `pending_confirmation` status. `POST /api/billing/invoices/:id/download` streams PDF.

> **Mandatory invoice/offer clause** — every top-up invoice/offer MUST display: "Harga kuota pesan dapat berubah sewaktu-waktu mengikuti perubahan tarif dari Meta."

---

### 2.13 Conversations & Human Handover (BARU — ADD-20, top-level)

| Method | Path                                  | Purpose                                                                                            |
| ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/api/conversations/:id`              | Conversation detail with mode + handover info                                                      |
| POST   | `/api/conversations/:id/handover`     | Mark conversation human-handover (staff initiated; usually from Telegram, but FE can also trigger) |
| POST   | `/api/conversations/:id/end-handover` | Return to AI mode                                                                                  |

Conversation shape (extends what Ticket Detail loads in `<TicketMessageThread>`):

```json
{
  "id": "uuid",
  "mode": "ai" | "human_handover",
  "handover_to_telegram_user_id": 123456,
  "handover_to_staff_name": "Budi",
  "handover_at": "2026-06-18T14:35:00Z",
  "handover_reason": "guest_frustrated"
}
```

---

### 2.14 Hotels Admin (BARU — Phase 2.7, ASSUMED CONTRACT Q-CONTRACT-22; service: Auth per H11 ruling)

Super-admin-only platform endpoints for managing hotel tenants across the platform. NOT visible to `gm_admin` / `dept_head` / `staff`. Separate from §2.1a `/api/hotels/me` (single-tenant context, all-roles). Raised by T75 (Dev A) per PO directive H10 2026-06-26.

> **ASSUMED-lock convention** — same pattern as Q-CONTRACT-13 (handover), Q-CONTRACT-15 (password-change), Q-CONTRACT-17 (complaint_type), Q-CONTRACT-19 (failed-3x), Q-CONTRACT-20 (manual visit), Q-CONTRACT-21 (high-alert). Shape proposed by Planning Agent at T75 ASSIGNMENT; locked at T75 SUBMIT; PO ratifies post-merge. If PO directs alternate verb/path/shape (e.g. DELETE for suspend, additional `billing_override` field, agent_quota override per tenant), MSW handler + types + i18n + fixtures update at T23 integration.

> **PO ratifications H11 2026-06-27** (Q-22 sub-questions):
> - **Service ownership**: Auth (was Hotel Core in T75-era draft; moved per H11 ruling).
> - **Hard delete**: NOT supported in MVP. Only `status: 'suspended'` (soft).
> - **Suspend semantic**: ratified as `403 SUSPENDED` on login + immediate session revocation across the tenant.
> - **Atomic GM-user creation**: `POST /api/admin/hotels` atomically writes a `users` row for the GM (role=`gm_admin`, email/name from `gm_contact`, hotel_id=new) AND returns the generated plaintext password ONCE in the response body (same generate-and-return semantic as §2.5a/§2.5b). GM rotates via `POST /api/auth/me/password` on first login (forced via `must_rotate_password: true` flag).
> - **`tiers` table** (NEW §2.1b): `hotels.tier` is now `hotels.tier_id` FK → `tiers.id`. AdminHotel response shape keeps a flat `tier: 'luxury'` string (the `tiers.name` value) for FE compatibility — backend joins on read.

| Method | Path                           | Purpose                                    | Roles         |
| ------ | ------------------------------ | ------------------------------------------ | ------------- |
| GET    | `/api/admin/hotels`            | List all hotel tenants on the platform     | `super_admin` |
| POST   | `/api/admin/hotels`            | Create new hotel tenant                    | `super_admin` |
| GET    | `/api/admin/hotels/:id`        | Hotel tenant detail                        | `super_admin` |
| PATCH  | `/api/admin/hotels/:id`        | Update tenant metadata + plan (NOT status) | `super_admin` |
| PATCH  | `/api/admin/hotels/:id/status` | Suspend / reactivate hotel tenant          | `super_admin` |
| DELETE | `/api/admin/hotels/:id`        | Hard-delete tenant (platform-only)         | `super_admin` |

> **DELETE `/api/admin/hotels/:id`** — platform-level hard delete → `204 No Content` (`404` if the hotel does not exist). The CRM UI intentionally exposes only suspend/reactivate (`:id/status`); day-to-day deactivation stays soft (`status: 'suspended'`). This DELETE permanently removes the hotel and its **auth-owned** records — its users, and (via `onDelete: Cascade`) their sessions + password-reset tokens — in one transaction. It does **NOT** touch data owned by other services keyed by the same hotel id (core: tickets/guests/departments, integration, ai); there is no cross-database FK, so a full tenant wipe must purge those separately. Irreversible — no audit-trail preservation, unlike the `is_active: false` soft-delete used for users (§2.5c).

#### `AdminHotel` shape

```json
{
  "id": "uuid",
  "name": "Aurora Bali Resort",
  "code": "ABR-001",
  "tier": "luxury",
  "status": "active",
  "gm_contact": {
    "name": "Budi Santoso",
    "email": "gm@aurorabali.com",
    "phone": "+628123456789"
  },
  "created_at": "2026-01-15T08:00:00Z",
  "agent_count": 5,
  "user_count": 6
}
```

- `tier` ∈ `'lite' | 'professional' | 'luxury' | 'enterprise'` (4 tiers per CLAUDE.md §1)
- `status` ∈ `'active' | 'suspended'` (suspend = soft-disable; hard-delete NOT supported in MVP)
- `agent_count` + `user_count` are read-only telemetry fields (backend-computed)
- `gm_contact` is a flat sub-object; `phone` is E.164 format
- `code` is unique across all hotels (used internally for support tickets / billing references)

#### GET `/api/admin/hotels`

Response 200:

```json
{
  "data": [AdminHotel, ...],
  "meta": { "total": 12 }
}
```

Standard list envelope per §1.4 (no filter / search / pagination in MVP; full list ≤ 100 tenants expected; pagination added later if scale demands).

#### POST `/api/admin/hotels`

Request body:

```json
{
  "name": "string (1-100)",
  "code": "string (1-20, unique across platform)",
  "tier": "lite | professional | luxury | enterprise",
  "gm_contact": {
    "name": "string (1-80)",
    "email": "string (RFC-5322 email)",
    "phone": "string (E.164 format, e.g. +628123456789)"
  }
}
```

Response 201:

```json
{
  "hotel": AdminHotel,
  "gm_user": { "id": "uuid", "email": "gm@aurorabali.com", "name": "Budi Santoso", "role": "gm_admin", "hotel_id": "<new-hotel-id>", "must_rotate_password": true },
  "generated_password": "Xa9$kPq2!mNz7vRw"
}
```

`status` defaults to `'active'`; `agent_count` + `user_count` default to 0 on create.

**Atomic semantics**: the new hotel row + the new gm_admin user row are written in a single transaction. If either fails, both roll back (no orphan tenants, no orphan users).

**Generated password**: 16-character alphanumeric+symbols, generated server-side, returned ONCE in plaintext (NEVER persisted client-side — FE shows in a copy-modal on the create-success view, then drops from state). Backend stores only the bcrypt/argon2id hash. `must_rotate_password: true` is set on the user → first login redirects to `POST /api/auth/me/password` before allowing any other action.

**`gm_contact.email` collision**: if the email already exists on the platform (any tenant), POST fails with 409 CONFLICT — admin must use a different email or recover the existing user via §2.5b.

#### GET `/api/admin/hotels/:id`

Response 200: full `AdminHotel`.

#### PATCH `/api/admin/hotels/:id`

Request body: any subset of `{ name, code, tier, gm_contact }`. `status` is NOT mutable here (dedicated endpoint). Partial update — only provided fields are changed.

Response 200: full `AdminHotel`.

#### PATCH `/api/admin/hotels/:id/status`

Request body:

```json
{ "status": "active" | "suspended" }
```

Response 200: full `AdminHotel`.

**Suspend semantic (RATIFIED H11 PO ruling)**: when `status === 'suspended'`, all login attempts under the tenant return `403 SUSPENDED`; existing sessions for users with `hotel_id === <suspended hotel id>` are **revoked immediately** (backend cascades a session-delete on suspend). FE sees standard 401 on next request → refresh-loop-fail → `/login` per §1.2. Reactivation (`PATCH .../status { status: 'active' }`) restores login eligibility but does NOT auto-resurrect old sessions — users re-login.

#### Error envelopes (per §1.5)

- 400 `VALIDATION_ERROR` — missing or invalid field (name < 1 char, code > 20 chars, invalid tier value, invalid email format, invalid E.164 phone)
- 403 `FORBIDDEN` — non-`super_admin` attempts any `/api/admin/*` endpoint
- 404 `NOT_FOUND` — unknown hotel `id` (PATCH or GET detail)
- 409 `CONFLICT` — `code` already taken on POST (or PATCH attempting to change to a taken code)
- 422 `BUSINESS_RULE` — e.g. attempting `tier: 'enterprise'` without backend feature flag; attempting `status: 'suspended'` on a hotel with active billing dispute (TBD at backend implementation)
- 500 — `?simulate=error` per T18 envelope

---

## 3. Real-time (Socket.io — techspec §8.4)

### 3.1 Connection

```ts
import { io } from 'socket.io-client'
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
})
```

Backend joins the socket to the room `hotel:${hotelId}` based on the cookie. Frontend does NOT emit any join — server-side authoritative.

### 3.2 Events (server → client)

| Event                         | Payload                                                   | Frontend action                                                                                                    |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ticket:created`              | `Ticket`                                                  | Insert into tickets-list query cache; toast "Tiket baru #..."; bell badge +1                                       |
| `ticket:updated`              | `Ticket`                                                  | Replace in tickets-list and detail query cache; no toast unless status changed                                     |
| `ticket:escalated`            | `Ticket`                                                  | Replace; toast destructive variant; bell badge +1                                                                  |
| `ticket:rerouted`             | `{ ticket, from_dept, to_dept, staff_name }`              | Replace ticket in cache; toast info; on detail page, append re-route to audit timeline                             |
| `message:new`                 | `{ conversation_id, message }`                            | Append to messages query cache for that conversation; bell badge +1 only if currently NOT viewing the conversation |
| `verification:pending`        | `PendingVerificationVisit`                                | Insert into dashboard pending-list cache; if user is on /dashboard, toast info                                     |
| `verification:resolved`       | `{ visit_id, status: 'checked_in' \| 'rejected' }`        | Remove from pending-list cache; close any open verify dialog                                                       |
| `verification:failed_3x`      | `{ visit_id, attempts: 3 }`                               | Insert into failed-3x list cache; if user is on /dashboard, toast warning                                          |
| `conversation:handover_start` | `{ conversation_id, staff_name, mode: 'human_handover' }` | Update conversation mode in cache; show banner if on ticket detail viewing this conv                               |
| `conversation:handover_end`   | `{ conversation_id, mode: 'ai' }`                         | Update conversation mode in cache; dismiss banner                                                                  |
| `integration:health_changed`  | `{ provider: 'claude'\|'wa'\|'telegram', status }`        | Update integrations health cache; toast destructive if `status === 'down'`                                         |
| `billing:low_balance`         | `{ remaining_percent: 20 \| 5 }`                          | Update billing cache; toast warning at 20% remaining, destructive at 5% remaining                                  |

Cache invalidation strategy: use `queryClient.setQueryData` for in-place updates rather than `invalidateQueries` for these 4 events — saves a round-trip and provides instant feel.

### 3.3 Connection lifecycle UX

- Initial connecting: silent
- Connected: silent
- Disconnect (server) or reconnect: show inline banner "Koneksi real-time terputus, mencoba menyambung ulang…"
- Reconnect success: dismiss banner, refetch `tickets/list` and `notifications/unread-count` once to catch up missed events

---

## 4. Service layer mapping (frontend code)

Each API domain has a `services/<domain>.ts` file exposing TanStack Query hooks. Components NEVER call axios directly.

```
src/services/
├── auth.api.ts            ← raw fetchers: loginUser, logoutUser, refreshToken, getMe, updateMe
│                            + hooks: useLogin, useLogout, useMe, useUpdateMe (incl. language)
├── tickets.api.ts         ← getTickets, getTicket, updateTicketStatus, getTicketStats, getOverdueTickets
│                            + useTickets, useTicket, useUpdateTicketStatus, useTicketStats
├── guests.api.ts          ← getGuests, getGuest, updateGuest, addGuestPreference, getGuestMessages...
│                            + hooks
├── visits.api.ts          ← BARU: createVisit, verifyManual, getPendingVerifications, getFailedVerifications
│                            + useVisits, useVerifyManual, usePendingVerifications, useFailedVerifications
├── analytics.api.ts       ← + useAnalyticsOverview, useExportAnalytics
├── settings.api.ts        ← settings/hotel, departments, agents, menu, knowledge, promos, upsells, voice
├── integrations.api.ts    ← BARU: getIntegrations, updateWhatsapp, updateTelegram, regenerateQR, getHealth
│                            + useIntegrations, useUpdateWhatsapp, useUpdateTelegramBot, useRegenerateQR, useIntegrationHealth
├── feature-flags.api.ts   ← BARU: getFeatureFlags, toggleFlag
│                            + useFeatureFlags, useToggleFlag
├── wa-templates.api.ts    ← BARU: getTemplates, submitTemplate, editTemplate, deleteTemplate, resubmitTemplate
│                            + hooks
├── users.api.ts           ← BARU: getUsers, createUser, updateUser, resetPassword (top-level, ≠ settings.api.ts)
│                            + useUsers, useCreateUser, useUpdateUser, useResetPassword
├── billing.api.ts         ← BARU: getBilling, getInvoices, downloadInvoice, requestOutboundTopup
│                            + useBilling, useDownloadInvoice, useOutboundTopup
├── conversations.api.ts   ← BARU: getConversation, startHandover, endHandover
│                            + useConversation, useStartHandover, useEndHandover
├── admin.api.ts           ← BARU (Phase 2.7 T75): getAdminHotels, getAdminHotel, createAdminHotel,
│                            updateAdminHotel, updateAdminHotelStatus
│                            + useAdminHotels, useAdminHotel, useCreateAdminHotel,
│                              useUpdateAdminHotel, useUpdateAdminHotelStatus (super_admin only)
├── notifications.api.ts
└── http.ts                ← axios instance with interceptors (CSRF, 401-refresh)
```

Each hook returns `{ data, isPending, isError, error }` directly from TanStack Query — components destructure as-is.

### 4.1 Query key conventions

```ts
;['tickets', 'list', filters][('tickets', 'detail', ticketId)][('tickets', 'stats', filters)][ // list with filters // detail
  ('tickets', 'overdue')
][('guests', 'list', filters)][('guests', 'detail', guestId)][
  ('guests', 'messages', guestId, filters)
][('visits', 'pending-verification')][('visits', 'failed-verification')][ // BARU — dashboard pending card // BARU — dashboard failed 3x card
  ('analytics', 'overview', dateRange)
][('settings', 'hotel')][('settings', 'departments')][('settings', 'agents')][
  ('settings', 'menu', filters)
][('settings', 'knowledge', filters)][('settings', 'voice')][('integrations', 'state')][ // BARU
  ('integrations', 'health')
][('feature-flags', 'list')][('wa-templates', 'list')][('users', 'list')][('billing', 'overview')][ // BARU — refetchInterval 60s // BARU // BARU // BARU (top-level) // BARU
  ('billing', 'invoices')
][('conversations', 'detail', conversationId)][('auth', 'me')][('notifications', 'list', filters)][ // BARU // BARU
  ('notifications', 'unread-count')
][('admin', 'hotels', 'list')][('admin', 'hotels', 'detail', hotelId)] // BARU (Phase 2.7 T75 — super_admin only)
```

Hierarchical so `queryClient.invalidateQueries({ queryKey: ['tickets'] })` clears all ticket data.

---

## 5. Contract change control

- Until **H10 (Gate G1)**, contract changes are made by consensus of the 3 devs + product owner.
- After H10, contract is **frozen**. Any change requires explicit product-owner approval and a written change request.
- This document and the OpenAPI YAML file (when produced) must stay in sync. If they conflict, the OpenAPI file wins; this document is updated to match.
- MSW handlers are derived from the contract; if a handler is needed that has no contract, the contract gets the endpoint first, then the handler is implemented.
