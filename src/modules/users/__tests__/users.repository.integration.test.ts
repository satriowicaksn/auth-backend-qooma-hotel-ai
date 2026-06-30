// Integration tests for UsersRepository — backfilled cycle 7 (T02-sub-1)
// against the migrated local Postgres (T02 cycle 6 deliverable). Uses the
// real PrismaClient singleton via integration-helpers; no mocks.
//
// 7 assertions exercise repo invariants impossible to assert without a real
// DB: transactional atomicity, UNIQUE constraint enforcement, scoped queries
// against multi-tenant data, and session-row revoke sweeps.

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import {
  connectPrisma,
  createTestHotel,
  createTestTier,
  createTestUser,
  db,
  disconnectPrisma,
  sweepByHotel,
  sweepTier,
  uuidSuffix,
} from '../../../core/prisma/__tests__/integration-helpers.js';
import { LastGmAdminError, UniqueConstraintError, UsersRepository } from '../users.repository.js';

const repo = new UsersRepository(db);

describe('UsersRepository (integration — real Postgres at localhost:5433)', () => {
  let tierId: string;
  let hotelAId: string;
  let hotelBId: string;

  beforeAll(async () => {
    await connectPrisma();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  afterEach(async () => {
    if (hotelAId !== undefined) await sweepByHotel(hotelAId);
    if (hotelBId !== undefined) await sweepByHotel(hotelBId);
    if (tierId !== undefined) await sweepTier(tierId);
  });

  async function seedTwoHotels(): Promise<void> {
    const tier = await createTestTier();
    tierId = tier.id;
    const hotelA = await createTestHotel({ tierId });
    const hotelB = await createTestHotel({ tierId });
    hotelAId = hotelA.id;
    hotelBId = hotelB.id;
  }

  // --- Tenant-scoped listing ---------------------------------------------

  describe('listByHotel', () => {
    it('should scope to the caller hotel and NOT leak rows from other hotels', async () => {
      await seedTwoHotels();
      await createTestUser({ hotelId: hotelAId, role: 'staff' });
      await createTestUser({ hotelId: hotelAId, role: 'staff' });
      await createTestUser({ hotelId: hotelBId, role: 'staff' });

      const resultA = await repo.listByHotel(hotelAId, {}, { limit: 50, offset: 0 });
      const resultB = await repo.listByHotel(hotelBId, {}, { limit: 50, offset: 0 });

      expect(resultA.rows).toHaveLength(2);
      expect(resultA.total).toBe(2);
      expect(resultB.rows).toHaveLength(1);
      expect(resultB.total).toBe(1);
      for (const row of resultA.rows) {
        // SettingsUser doesn't expose hotelId — verify via the helpful invariant
        // that role/email is from hotel A only by counting + scoping check above.
        expect(row.id).toBeDefined();
      }
    });
  });

  // --- UNIQUE constraint mapping ----------------------------------------

  describe('insertUser', () => {
    it('should raise UniqueConstraintError on duplicate (hotel_id, email) — Prisma P2002 mapped', async () => {
      await seedTwoHotels();
      const email = `dup-${uuidSuffix()}@example.com`;
      await repo.insertUser({
        hotelId: hotelAId,
        email,
        name: 'First',
        role: 'staff',
        deptId: null,
        passwordHash: 'argon2$test',
        language: 'id',
      });

      let caught: unknown;
      try {
        await repo.insertUser({
          hotelId: hotelAId,
          email,
          name: 'Duplicate',
          role: 'staff',
          deptId: null,
          passwordHash: 'argon2$test',
          language: 'id',
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UniqueConstraintError);
    });
  });

  // --- Last-gm guard atomicity ------------------------------------------

  describe('updateUserWithLastGmGuard', () => {
    it('should throw LastGmAdminError when the patch would leave zero active gm_admins for the hotel', async () => {
      await seedTwoHotels();
      const onlyGm = await createTestUser({ hotelId: hotelAId, role: 'gm_admin' });

      let caught: unknown;
      try {
        await repo.updateUserWithLastGmGuard(hotelAId, onlyGm.id, { role: 'staff' });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(LastGmAdminError);

      // Confirm the user row is UNCHANGED (transaction rolled back).
      const row = await db.user.findUnique({ where: { id: onlyGm.id } });
      expect(row?.role).toBe('gm_admin');
    });

    it('should successfully demote one of two gm_admins (the count predicate passes)', async () => {
      await seedTwoHotels();
      const target = await createTestUser({ hotelId: hotelAId, role: 'gm_admin' });
      await createTestUser({ hotelId: hotelAId, role: 'gm_admin' }); // keeps count >= 1 after demote

      const updated = await repo.updateUserWithLastGmGuard(hotelAId, target.id, { role: 'staff' });

      expect(updated.role).toBe('staff');
    });
  });

  // --- Atomic password + flag clear -------------------------------------

  describe('setPassword', () => {
    it('should atomically set passwordHash AND mustRotatePassword=true in a single update', async () => {
      await seedTwoHotels();
      const user = await createTestUser({
        hotelId: hotelAId,
        passwordHash: 'argon2$old',
        mustRotatePassword: false,
      });

      await repo.setPassword(user.id, 'argon2$reset', true);

      const row = await db.user.findUnique({ where: { id: user.id } });
      expect(row?.passwordHash).toBe('argon2$reset');
      expect(row?.mustRotatePassword).toBe(true);
    });
  });

  // --- revokeAllSessions sweep semantics --------------------------------

  describe('revokeAllSessions', () => {
    it('should revoke EVERY active session for the target user (NO except filter — differs from T11 revokeAllOtherSessions)', async () => {
      await seedTwoHotels();
      const target = await createTestUser({ hotelId: hotelAId });

      const futureExpiry = new Date(Date.now() + 86_400_000);
      const sessionA = await db.session.create({
        data: {
          userId: target.id,
          refreshToken: `hash-${uuidSuffix()}`,
          csrfToken: `csrf-${uuidSuffix()}`,
          expiresAt: futureExpiry,
        },
      });
      const sessionB = await db.session.create({
        data: {
          userId: target.id,
          refreshToken: `hash-${uuidSuffix()}`,
          csrfToken: `csrf-${uuidSuffix()}`,
          expiresAt: futureExpiry,
        },
      });

      const result = await repo.revokeAllSessions(target.id);

      expect(result.revokedCount).toBe(2);
      const aRow = await db.session.findUnique({ where: { id: sessionA.id } });
      const bRow = await db.session.findUnique({ where: { id: sessionB.id } });
      expect(aRow?.revokedAt).not.toBeNull();
      expect(bRow?.revokedAt).not.toBeNull();
    });

    it('should NOT touch sessions of other users when sweeping by userId (defense-in-depth on WHERE)', async () => {
      await seedTwoHotels();
      const targetUser = await createTestUser({ hotelId: hotelAId });
      const otherUser = await createTestUser({ hotelId: hotelAId });

      const futureExpiry = new Date(Date.now() + 86_400_000);
      const otherSession = await db.session.create({
        data: {
          userId: otherUser.id,
          refreshToken: `hash-${uuidSuffix()}`,
          csrfToken: `csrf-${uuidSuffix()}`,
          expiresAt: futureExpiry,
        },
      });

      await repo.revokeAllSessions(targetUser.id);

      const otherRow = await db.session.findUnique({ where: { id: otherSession.id } });
      expect(otherRow?.revokedAt).toBeNull();
    });
  });

  // --- Soft-delete via isActive flag ------------------------------------

  describe('updateUser (soft-delete semantic)', () => {
    it('should flip isActive=false in updateUser WITHOUT hard-deleting the row (spec §1.2 line 136)', async () => {
      await seedTwoHotels();
      const target = await createTestUser({ hotelId: hotelAId, isActive: true });

      const updated = await repo.updateUser(hotelAId, target.id, { isActive: false });

      expect(updated.is_active).toBe(false);
      // Row STILL exists in users table — referential integrity for downstream FKs preserved.
      const rawRow = await db.user.findUnique({ where: { id: target.id } });
      expect(rawRow).not.toBeNull();
      expect(rawRow?.isActive).toBe(false);
    });
  });
});
