# ADR-0008: Repo scope = Auth & Identity service (boilerplate fork)

- **Status**: accepted
- **Tanggal**: 2026-06-27
- **Pengambil keputusan**: PO + Planning Agent (forked from `core-backend-qooma-hotel-ai` ADR-0008 yang ratify Hotel Core scope)

## Konteks

Service split antara backend Qooma microservices menelurkan repo terpisah per service. Repo ini di-fork dari `@qooma/backend-service-template` (lewat `core-backend-qooma-hotel-ai`) untuk service **Auth & Identity**. Sibling Hotel Core sudah hidup di repo terpisah dengan ADR-0008-nya sendiri (scope: Hotel Core).

H11 2026-06-27 PO ruling rebalanced Auth boundary:

- **Sebelumnya** (asumsi pre-H11): Auth = identitas saja (users, sessions, RBAC). Hotels table + tier catalog di Hotel Core.
- **Sekarang** (H11 PO ruling): Auth absorb `hotels` (tenant entity) + `tiers` (catalog lookup) + cross-hotel admin user surface (`/api/admin/users`). Hotel Core shrinks ke per-hotel operational config saja (departments, tickets, guests, visits, dll).

Rationale ruling: single writer per table (cleaner RBAC boundary), tier reads via shared-DB JOIN bukan RPC, MVP shipable sebagai satu coherent backend-first slice (lihat `docs/spec/MVP-AUTH-FIRST.md`). FE handover `docs/spec/01-auth-identity.md` dan `docs/spec/data-model.md` adalah canonical reference.

## Opsi yang dipertimbangkan

### Opsi A: Auth tetap minimal (identitas saja), Hotel Core own hotels + tiers
- **Pros**: Boundary clean per definisi awal (Auth = identity).
- **Cons**: Two services both write to `hotels` table (Auth via session middleware, Hotel Core via settings) — race conditions, RBAC blur, suspend-cascade jadi cross-service RPC.

### Opsi B (pilihan): Auth own hotels + tiers + all user roles + all tenant CRUD
- **Pros**: Single writer per table. Tier reads via JOIN (no RPC). MVP shippable as Auth-first slice (full backend-first deployable independently). Suspend cascade intra-service. RBAC boundary explicit (Auth = identity + tenancy + tier).
- **Cons**: Auth service grows beyond "pure identity" — name slightly inaccurate. Hotel Core jadi consumer-only untuk `hotels` table (read-only via JOIN). Trade-off accepted per PO H11.

### Opsi C: Monorepo (Auth + Hotel Core + AI + Integration jadi satu repo)
- **Pros**: 1 PR review surface.
- **Cons**: Off-spec ADR-0004 (1 service = 1 DB). pnpm workspaces + multi-schema Prisma bukan default. Rejected (sama dengan ADR-0008 core-backend).

## Keputusan

**Opsi B.** Repo ini adalah service **Auth & Identity** dengan scope expanded per H11 ruling.

Konsekuensi langsung:

- `README.md`, `KICKOFF.md`, `docs/SERVICE-CHARTER.md` di-frame untuk Auth scope (commit ini).
- `prisma/schema.prisma` di-replace dari boilerplate ExampleResource → Auth schema (`tiers`, `hotels`, `users`, `sessions`, `password_reset_tokens`) per `docs/spec/01-auth-identity.md` §3.
- `package.json#name`: `@qooma/backend-service-template` → `@qooma/auth-backend`.
- `docs/decisions/0008-repo-scope-hotel-core.md` (inherited dari fork) → di-rename `0008-repo-scope-auth.md` (ADR ini).
- Spec source-of-truth ada di `docs/spec/` — synced dari FE handover (`frontend-qooma-hotel-ai/docs/backend-handover/`). Resync periodik bila FE planning amends contract.
- Slot routing di KICKOFF.md / SERVICE-CHARTER.md di-update untuk Auth domain split.
- Sibling Hotel Core repo (`core-backend-qooma-hotel-ai`) sudah ratify Auth boundary di ADR-0008-nya sendiri.

### Cross-service identifier pattern (inherit dari core-backend ADR-0008)

Kolom yang merujuk entity milik sibling service **WAJIB** disimpan sebagai opaque `uuid` di Postgres **tanpa** klausa `REFERENCES` ketika cross-service-boundary.

**Exception** (intra-Auth-Hotel-Core DB shared): `users.hotel_id → hotels.id` dan `users.dept_id → departments.id` boleh real FK karena Auth + Hotel Core share same DB instance per `docs/spec/data-model.md` §1. Bila DB di-split di masa depan, demote ke opaque UUID + eventual consistency check.

Cross-service (sibling AI / Integration) tetap opaque:

- AI's `conversations.user_id` → Auth's `users.id` — opaque UUID
- Integration's `outbound_dispatch_queue.hotel_id` → Auth's `hotels.id` — opaque UUID

### Resolve "Auth grows" tension

Service name tetap "Auth & Identity" walaupun scope include hotels + tiers, karena:

1. **Identity boundary** masih primary concern — tenant entity = part of "who am I" semantics (user.hotel_id determines scope).
2. **Tier = identity-adjacent**: tier governs WHO can do WHAT (RBAC + feature gating) — natural fit dengan identity service.
3. **Hotel as tenant** vs **hotel as operational config**: Auth owns tenant identity (id, code, name, tier, status, gm_contact, DND/branding/timezone columns), Hotel Core owns operational data scoped by tenant.

Tidak rename service. ADR-0001..0007 tetap berlaku (architecture, packaging, coding standards).

## Konsekuensi

### Positif

- Bounded context Auth jelas untuk 3 dev paralel.
- MVP shippable as Auth-first slice — backend deployable & demoable independently (`MVP-AUTH-FIRST.md` §5 AC).
- Single writer per table — no race conditions on `hotels` table.
- Tier reads via shared-DB JOIN — zero RPC latency.
- Suspend cascade intra-service — atomic transaction.

### Negatif (yang kami terima)

- Service name slightly inaccurate ("Auth" doing tenant management) — di-mitigate via charter line "Auth = identity + tenancy + tier boundary".
- Hotel Core jadi read-only consumer untuk `hotels` table — bila FE later butuh dynamic `hotels.dnd` write dari Hotel Core's settings page, route via Auth's `/api/settings/hotel` (sudah explicit di MVP scope).
- Shared DB Auth + Hotel Core = single point of failure pada Postgres instance. Mitigated by standard HA Postgres setup (out of scope ADR ini).
- Spec corpus tergantung sync periodik dari FE handover (`docs/spec/`) — bila FE planning amends contract, backend planner ulangi sync (per `docs/spec/MVP-AUTH-FIRST.md` §8 reading order).

## Trigger untuk revisit

- Saat backend ≥2 service ready rilis → extract reusable patterns ke npm internal package.
- Saat `hotels.dnd` JSONB writes butuh dispatch ke multiple consumers (notifications, dispatch worker) → introduce domain event bus.
- Saat compliance audit menuntut hard-delete (GDPR) → escalate ke PO; current soft-delete-only ruling H11 boleh di-supersede.
- Saat tier config butuh runtime edit tanpa redeploy → ship `PATCH /api/admin/tiers/:name` (out of MVP).
- Saat Auth + Hotel Core perlu split ke DB terpisah (scaling) → demote `users.hotel_id` ke opaque UUID + tambah cross-service RPC layer untuk dept lookup.
