// Integration tests for UsersRepository deferred until Slot A T02 ships
// the initial Prisma migration (testcontainers PG + Redis + real migrations).
// PM B convention: cycle-5 SUBMIT is APPROVE-PARTIAL; T07 re-opened together
// with T05+T06+T11 once T02 lands.
//
// Pattern mirrors `auth.repository.integration.test.ts` (T05/T06 placeholder)
// + `tenant-guard.plugin.integration.test.ts` (T11 placeholder). Surfaces
// here exercise repo invariants impossible to assert without a real DB:
// transactional atomicity, UNIQUE constraint enforcement, scoped queries
// against multi-tenant data, and session-row revoke sweeps.
import { describe, it } from '@jest/globals';

describe('UsersRepository (integration — DEFERRED until T02 ships)', () => {
  it.todo(
    'should scope listByHotel correctly — rows from other hotels MUST NOT appear in the result even with matching role/dept_id filters',
  );
  it.todo(
    'should respect UNIQUE(hotel_id, email) at insert — duplicate insert raises P2002 → UniqueConstraintError → ConflictError 409',
  );
  it.todo(
    'should atomically count active gm_admins + update inside updateUserWithLastGmGuard — concurrent PATCH from two sessions cannot both observe count=1 then both succeed',
  );
  it.todo(
    'should atomically set passwordHash AND must_rotate_password=true in setPassword — partial write impossible',
  );
  it.todo(
    'should revoke EVERY active session for the user in revokeAllSessions — including the actor session (admin-initiated reset differs from T11 revokeAllOtherSessions which preserves current)',
  );
  it.todo(
    'should NOT touch sessions of other users when revokeAllSessions(targetUserId) executes — defense-in-depth against the WHERE userId=? filter being mis-applied',
  );
  it.todo(
    'should soft-delete via UPDATE isActive=false in updateUser — row remains in users table; downstream tickets/escalation tree FKs preserved (spec §1.2 line 136)',
  );
});
