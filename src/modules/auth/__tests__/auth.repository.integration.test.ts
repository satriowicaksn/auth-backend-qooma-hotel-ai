// Integration tests for AuthRepository deferred until Slot A T02 ships the
// initial Prisma migration (testcontainers + `prisma migrate deploy`). PM B
// FULL-ACK convention (PM-STATUS-B.md §2 line 149-150): cycle-1 SUBMIT is
// APPROVE-PARTIAL; T05 is re-opened with an integration addendum after T02
// APPROVED.
//
// Pattern mirrors `src/modules/_template/__tests__/_template.repository.integration.test.ts`
// and `docs/TESTING.md §5` (testcontainers PG + Redis, beforeAll start, real
// migrations applied before any spec runs).
import { describe, it } from '@jest/globals';

describe('AuthRepository (integration — DEFERRED until T02 ships)', () => {
  it.todo('should persist a user lookup and return UserRow when email + isActive match');
  it.todo('should return null when no active user matches the email');
  it.todo('should persist a session row with hashed refresh + csrf + expires_at + ua + ip');
  it.todo('should find an unrevoked, unexpired session by refresh hash');
  it.todo('should NOT return a revoked session even when refresh hash matches');
  it.todo('should NOT return an expired session even when refresh hash matches');
  it.todo('should mark session revoked_at when revokeSession is called');
  it.todo('should rotate session atomically (revoke old + create new) in a single transaction');
  it.todo('should set last_login_at when touchUserLastLogin is called');
  it.todo('should enforce UNIQUE(hotel_id, email) on user create paths exercised here');
});
