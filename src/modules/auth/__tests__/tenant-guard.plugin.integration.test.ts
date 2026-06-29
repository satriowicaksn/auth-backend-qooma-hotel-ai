// Integration tests for tenant-guard plugin deferred until Slot A T02 ships
// the initial Prisma migration (testcontainers PG + Redis + real migrations).
// PM B convention: cycle-4 SUBMIT is APPROVE-PARTIAL; T11 re-opened together
// with T05+T06 once T02 lands.
//
// Cross-slot execution per §4-D01 (Slot A canonical territory).
//
// Pattern mirrors `auth.repository.integration.test.ts` (T05+T06 placeholder)
// and follows `docs/TESTING.md §5` (testcontainers fixture). Real integration
// surfaces here will exercise: (1) end-to-end JWT cookie + tenant-guard +
// downstream handler row-level filter; (2) cross-tenant URL param rejection
// at handler boundary; (3) super_admin cross-hotel oversight.
import { describe, it } from '@jest/globals';

describe('tenant-guard plugin (integration — DEFERRED until T02 ships)', () => {
  it.todo(
    'should reject a non-super_admin request whose JWT claims.hotelId mismatches a downstream row-scope filter (handler-side enforcement consuming req.tenantScope)',
  );
  it.todo(
    'should let a super_admin request pass through to a multi-hotel listing endpoint and return rows across all tenants',
  );
  it.todo(
    'should compose cleanly with @fastify/jwt: invalid token → 401 from @fastify/jwt layer, NOT 403 from tenant-guard (delegate semantic per Amendment 1)',
  );
  it.todo(
    'should rotate scope context on JWT refresh: stale cookie pre-rotation hits 401; fresh cookie post-rotation sets the new req.tenantScope',
  );
});
