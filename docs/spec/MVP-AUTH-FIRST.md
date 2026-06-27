# Backend MVP — Auth-First Slice (H11 PO directive)

> **Audience**: backend engineer(s) starting the Qooma backend build. This is the **first coherent slice** to implement — ship Auth end-to-end before touching Hotel Core / AI / Integration.
>
> **Authority**: this brief is derived from `01-auth-identity.md` (full Auth surface) + `docs/API-CONTRACT.md` §2.1 / §2.1a / §2.1b / §2.5a / §2.5b / §2.5c / §2.14. Where this brief abbreviates, those two are canonical.
>
> **Why Auth-first**: per H11 PO ruling (2026-06-27), Auth now owns `hotels` (tenant) + `tiers` (catalog) + all user roles + login + sessions. Once Auth ships, super_admin can onboard tenants, GMs can log in, and Hotel Core can be built on top against real users + real hotels (no more MSW for the auth/tenancy surface). Hotel Core / AI / Integration follow in subsequent slices.

---

## 1. What's in scope (Auth-first MVP)

| # | Capability                                              | Endpoint(s)                                                | Roles                |
| - | ------------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| 1 | Login / logout / refresh / session cookie               | `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` | public / cookie-bearer |
| 2 | Current user + CSRF token rotation                      | `GET /api/auth/me` · `PATCH /api/auth/me` (language)       | authenticated        |
| 3 | Own-password change + forced rotation                   | `POST /api/auth/me/password`                               | authenticated        |
| 4 | First super_admin bootstrap                             | DB migration / `npm run seed:super-admin` CLI              | n/a (seed)           |
| 5 | Cross-hotel admin users CRUD                            | `GET/POST/PATCH /api/admin/users` · `POST .../reset-password` | `super_admin`     |
| 6 | Per-hotel users CRUD (gm_admin scope)                   | `GET/POST/PATCH /api/users` · `POST .../reset-password`    | `gm_admin`           |
| 7 | Tier catalog (read)                                     | `GET /api/admin/tiers` · `GET /api/admin/tiers/:name`      | `super_admin`        |
| 8 | Hotel context (read for current user)                   | `GET /api/hotels/me`                                       | authenticated        |
| 9 | Hotel admin CRUD (super_admin platform-level)           | `GET/POST/PATCH /api/admin/hotels` + `/:id/status`         | `super_admin`        |
| 10 | Hotel settings (gm_admin per-hotel write — DND/branding/timezone) | `GET/PUT /api/settings/hotel`                  | `gm_admin`           |

**Generate-and-return password applies to**: items 5 (POST admin users + reset), 6 (POST users + reset), 9 (POST hotels — atomically creates GM user with returned password). Backend generates 16-char alphanumeric+symbols, returns plaintext ONCE, sets `must_rotate_password: true`.

---

## 2. Out of MVP Auth-first slice (subsequent waves)

- Anything in Hotel Core: departments, tickets, guests, visits, menu, KB, billing endpoints, WA templates, feature flags, integrations, voice, agents, notifications, dashboard composites. (See `02-hotel-core.md`.)
- AI / Conversation service endpoints. (See `03-ai-conversation.md`.)
- Integration / Channels webhooks. (See `04-integration-channels.md`.)
- Socket.io gateway. (Wire after Hotel Core lands — it's the consumer of socket events.)
- Email-based password reset (`POST /api/users/:id/reset-password` returns generated password, NOT an email link). Add SMTP/SES integration in a later wave.
- `PATCH /api/admin/tiers/:name` write endpoint — tier config is migration-managed in MVP.
- `super_admin` UI for tier-config editing.
- Per-tenant tier overrides (`hotels.outbound_quota_override` etc.) — enterprise customization, not MVP.
- Last-super_admin lockout recovery UI (use the seed CLI if you ever lock yourself out).

---

## 3. DB migration order (greenfield)

Per `shared/data-model.md` §6 with H11 ruling baked in:

1. **`tiers`** (seed 4 rows: lite, professional, luxury, enterprise — values per `01-auth-identity.md` §1.4 `Tier` shape).
2. **`hotels`** (FK → `tiers.id`).
3. **`users`** (FK → `hotels.id` nullable for super_admin; FK → `departments.id` nullable; mutual-exclusion CHECK constraint on `(role, hotel_id)`).
4. **`sessions`** (FK → `users.id` ON DELETE CASCADE).
5. **`password_reset_tokens`** (FK → `users.id` ON DELETE CASCADE). Optional in MVP — only needed when SMTP-based reset is added.
6. **Seed first super_admin** via `npm run seed:super-admin` CLI (or one-off migration). Reads `SEED_SUPER_ADMIN_EMAIL` + `SEED_SUPER_ADMIN_PASSWORD` from env, inserts one `users` row with `role='super_admin'`, `hotel_id=NULL`. Idempotent.

Hotel Core's `departments` table comes in the next slice (needed for `users.dept_id` FK to ever resolve, but the FK is nullable so Auth can ship without it — users created in MVP Auth-first slice have `dept_id=NULL`, populated later when Hotel Core ships dept CRUD).

---

## 4. Critical correctness checks (don't skip)

**4.1 Tenant-guard middleware** — see `01-auth-identity.md` §6 for the canonical pseudocode. Every request handler that touches a hotel-scoped row reads `req.tenantScope` set by the middleware. super_admin's scope is `{ type: 'all-hotels' }` (bypass `WHERE hotel_id = …`); everyone else gets `{ type: 'single-hotel', hotel_id: <session.hotel_id> }`.

**4.2 `must_rotate_password` enforcement** — when the flag is true on the user row, every endpoint EXCEPT `POST /api/auth/me/password`, `GET /api/auth/me`, `POST /api/auth/logout` returns `403 PASSWORD_ROTATION_REQUIRED`. The cookie is issued normally on login — the gate is per-request. FE redirects to a forced-rotate form on receipt of this error code.

**4.3 Suspend cascade** — `PATCH /api/admin/hotels/:id/status { status: 'suspended' }` MUST execute `UPDATE sessions SET revoked_at = NOW() WHERE user_id IN (SELECT id FROM users WHERE hotel_id = $1)` in the SAME transaction as the hotel status flip. Otherwise, suspended-tenant users stay logged in until their token expires.

**4.4 Mutual-exclusion CHECK on users** — `CHECK ((role = 'super_admin' AND hotel_id IS NULL) OR (role <> 'super_admin' AND hotel_id IS NOT NULL))`. Defense-in-depth alongside endpoint validation (Q-CONTRACT-24). If a row violates this, the seed/migration is bugged — fix it.

**4.5 Atomic GM-user creation** — `POST /api/admin/hotels` must wrap the `INSERT INTO hotels` + `INSERT INTO users` (for the GM) in ONE transaction. Either both rows commit, or neither does. Generate the password BEFORE the transaction (so it's available for the response even if you rollback for some reason and retry).

**4.6 Last-super_admin guard** — before any PATCH or `is_active=false` on a super_admin row, run `SELECT COUNT(*) FROM users WHERE role='super_admin' AND is_active=true`. If the operation would drop this to 0, fail with `422 BUSINESS_RULE` code `LAST_SUPER_ADMIN_PROTECTED`.

**4.7 Email uniqueness** — `UNIQUE (hotel_id, email)` on users. For super_admin (`hotel_id IS NULL`), this means platform-wide uniqueness across super_admins. For gm_admin/dept_head/staff, it's per-hotel uniqueness — same email can exist across hotels (rare but legal). If you want platform-wide uniqueness across ALL users regardless of hotel, change the UNIQUE constraint to `(email)` alone and update the §1.2/§1.3 PO ratifications accordingly.

---

## 5. Acceptance criteria (when Auth-first MVP is "done")

A test pass per role:

- [ ] **Super_admin seeded** — `npm run seed:super-admin` with env vars creates the row. Login with those creds returns a valid cookie + csrfToken. `GET /api/auth/me` returns `role: 'super_admin'`, `hotel_id: null`.
- [ ] **Super_admin creates a tenant** — `POST /api/admin/hotels` with valid body returns `201 { hotel, gm_user, generated_password }`. Both rows exist in DB. `agent_count: 0`, `user_count: 0`.
- [ ] **New GM logs in** — `POST /api/auth/login` with the returned credentials succeeds, sets cookie. `GET /api/auth/me` returns `role: 'gm_admin'`, the correct `hotel_id`, `must_rotate_password: true`.
- [ ] **Forced rotation enforced** — calling any non-password endpoint as the new GM returns `403 PASSWORD_ROTATION_REQUIRED`. `POST /api/auth/me/password` with correct current + new succeeds, flips the flag to false. Subsequent requests work normally.
- [ ] **GM creates a dept_head** — `POST /api/users { role: 'dept_head', dept_id: null, … }` returns `201 { user, generated_password }`. The new dept_head can log in (and is forced to rotate per above).
- [ ] **Super_admin creates another super_admin** — `POST /api/admin/users { role: 'super_admin' }` (no hotel_id) succeeds. With hotel_id present → 400 VALIDATION_ERROR.
- [ ] **Suspend kills sessions** — log in as GM, then super_admin runs `PATCH /api/admin/hotels/:id/status { status: 'suspended' }`. Next GM request returns 401 (cookie/session dead). Re-login attempt returns `403 SUSPENDED`. Reactivate → re-login works.
- [ ] **Last-super_admin guard** — try PATCHing the only super_admin to `is_active: false` → 422 `LAST_SUPER_ADMIN_PROTECTED`.
- [ ] **Tier read** — `GET /api/admin/tiers` returns 4 rows with the expected config. Try as gm_admin → 403 FORBIDDEN.
- [ ] **`/api/hotels/me`** returns `{ id, tier }` correctly for both gm_admin (their tier) and super_admin (NULL? or last-viewed? — see open question below).

**Open behavior question (raise before backend lands)**: what does `GET /api/hotels/me` return for super_admin since they have `hotel_id IS NULL`? Options: (a) 404 (no hotel context), (b) `{ id: null, tier: null }`, (c) the tier of whichever hotel super_admin is currently "previewing as" (relies on FE preview-toggle context — not currently sent to backend). Recommend (b) for simplicity; FE's `/admin/hotels` page doesn't depend on `/api/hotels/me` anyway. Flag in `shared/open-questions.md` if you pick differently.

---

## 6. How to verify against the FE

The FE has been running on MSW since H1. Once Auth-first ships, the FE can flip `VITE_USE_MOCKS=false VITE_API_BASE_URL=<your-backend>` and exercise these endpoints with real data:

- Login page (`/login`) — credential auth
- Profile page (`/profile`) — `GET/PATCH /api/auth/me` + `POST /api/auth/me/password`
- Admin hotels page (`/admin/hotels`) — `/api/admin/hotels` family (super_admin only — log in as the seeded super_admin)
- Hotel settings page (`/settings/hotel`) — gm_admin only

The FE MSW handlers (`src/mocks/handlers/{auth,users,admin}.handlers.ts`) are the authoritative shape reference for everything in this slice. If your real backend response differs in shape, FE breaks — match the MSW handler exactly (or coordinate the shape change via `shared/open-questions.md`).

**Hotel Core endpoints (`/api/tickets`, `/api/guests`, etc.) will still 404 against your backend** — that's expected; they ship in the next slice. FE pages that call them will show their loading/error states (`<Loading />` then a destructive toast on the global error interceptor). Not a bug.

---

## 7. Hand-off checklist (when this slice is ready for FE integration)

- [ ] All endpoints in §1 implemented and respond per `01-auth-identity.md` shapes.
- [ ] `seed-super-admin` CLI documented in backend README with env var names.
- [ ] CORS origin set to FE's dev/staging origin; cookie domain set per Q-INFRA-01.
- [ ] CSRF token validation on all mutating verbs (POST/PUT/PATCH/DELETE).
- [ ] Tenant-guard middleware applied to every route.
- [ ] Suspend cascade integration-tested (per AC §5).
- [ ] Mutual-exclusion CHECK + last-super_admin guard verified.
- [ ] PII masking middleware stubbed (Q-CONTRACT-16) — not strictly needed for Auth-first since no guest data ships yet, but wire the middleware so Hotel Core can plug in without retrofit.
- [ ] `shared/open-questions.md` updated: ratify or push-back on Q-CONTRACT-22 / 23 / 24 / Q-OPS-02 / Q-INFRA-01 / Q-INFRA-02 (the Auth-relevant subset).

Once these are green, the FE integration window opens — flip `VITE_USE_MOCKS=false` and run through the AC checklist with the real backend.

---

## 8. Reading order for the implementing engineer

If you're picking this up fresh:

1. **`README.md`** (this folder) — §2 cross-service contracts + §2.1a service ownership table.
2. **This file** — for the scope + AC.
3. **`01-auth-identity.md`** — full Auth surface with shapes + RBAC + tenant-guard pseudocode.
4. **`docs/API-CONTRACT.md`** §2.1 / §2.1a / §2.1b / §2.5a / §2.5b / §2.5c / §2.14 — canonical contract; FE's MSW is built against this.
5. **`shared/data-model.md`** — ERD + table ownership matrix + FK rules.
6. **`shared/open-questions.md`** — Q-CONTRACT-22 / 23 / 24 ratifications + Q-OPS-01 RESOLVED block.
7. **`src/mocks/handlers/{auth,users,admin}.handlers.ts`** in the FE repo — the literal shape reference. Match it.
