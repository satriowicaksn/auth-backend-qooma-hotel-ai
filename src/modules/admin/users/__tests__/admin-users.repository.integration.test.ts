// Integration tests for AdminUsersRepository — T08 cross-slot per §4-D07.
// Uses the real PrismaClient singleton via integration-helpers (T02-sub-1
// cycle 7 pattern). Covers repo-layer invariants that can't be asserted
// without a real DB:
//   - countActiveSuperAdmins semantics (excludingUserId)
//   - Last-super_admin guard tx atomicity + rollback on zero
//   - Mutual-exclusion CHECK constraint trip (T02 defense-in-depth)
//   - Email uniqueness UNIQUE(hotel_id, email) NULL-hotel-id behavior
//     (the specific SQL-standard NULL semantics that necessitates
//     the handler-level findSuperAdminByEmail pre-check per Open Item #5)
//
// Run via `pnpm test:integration` (--runInBand) per T02-sub-1 convention.

import { randomUUID } from 'node:crypto';

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
  sweepUser,
  uuidSuffix,
} from '../../../../core/prisma/__tests__/integration-helpers.js';
import { AdminUsersRepository, LastSuperAdminError } from '../admin-users.repository.js';

const repo = new AdminUsersRepository(db);

describe('AdminUsersRepository (integration — real Postgres at localhost:5433)', () => {
  let tierId: string | undefined;
  let hotelId: string | undefined;
  const seededSuperAdminIds: string[] = [];

  beforeAll(async () => {
    await connectPrisma();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  afterEach(async () => {
    // Sweep super_admins created by tests (hotelId=null so sweepByHotel
    // does not cover them).
    for (const id of seededSuperAdminIds.splice(0)) {
      await sweepUser(id);
    }
    if (hotelId !== undefined) {
      await sweepByHotel(hotelId);
      hotelId = undefined;
    }
    if (tierId !== undefined) {
      await sweepTier(tierId);
      tierId = undefined;
    }
  });

  async function seedHotel(): Promise<void> {
    const tier = await createTestTier();
    tierId = tier.id;
    const hotel = await createTestHotel({ tierId });
    hotelId = hotel.id;
  }

  async function seedSuperAdmin(
    overrides: { email?: string; isActive?: boolean } = {},
  ): Promise<string> {
    const user = await createTestUser({
      hotelId: null,
      role: 'super_admin',
      email: overrides.email ?? `sa-${uuidSuffix()}@platform.example`,
      isActive: overrides.isActive ?? true,
    });
    seededSuperAdminIds.push(user.id);
    return user.id;
  }

  // --- findSuperAdminByEmail --------------------------------------------

  describe('findSuperAdminByEmail', () => {
    it('should return the super_admin row when a matching email exists', async () => {
      const email = `sa-${uuidSuffix()}@platform.example`;
      await seedSuperAdmin({ email });

      const found = await repo.findSuperAdminByEmail(email);

      expect(found).not.toBeNull();
      expect(found?.role).toBe('super_admin');
      expect(found?.email).toBe(email);
    });

    it('should return null when no super_admin has that email', async () => {
      const found = await repo.findSuperAdminByEmail('missing@platform.example');
      expect(found).toBeNull();
    });

    it('should NOT return a non-super_admin user even when the email matches', async () => {
      await seedHotel();
      const email = `gm-${uuidSuffix()}@hotel.example`;
      // Ensure hotelId is set before typed reference below.
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      await createTestUser({ hotelId, role: 'gm_admin', email });

      const found = await repo.findSuperAdminByEmail(email);
      expect(found).toBeNull();
    });
  });

  // --- Last-super_admin guard tx atomicity ------------------------------

  describe('updateUserWithLastSuperAdminGuard', () => {
    it('should throw LastSuperAdminError when the patch would leave zero active super_admins', async () => {
      const onlySuperAdminId = await seedSuperAdmin();

      let caught: unknown;
      try {
        await repo.updateUserWithLastSuperAdminGuard(onlySuperAdminId, { isActive: false });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(LastSuperAdminError);
      // Row UNCHANGED — tx rolled back.
      const row = await db.user.findUnique({ where: { id: onlySuperAdminId } });
      expect(row?.isActive).toBe(true);
    });

    it('should successfully deactivate one of two super_admins (count predicate passes)', async () => {
      const targetId = await seedSuperAdmin();
      await seedSuperAdmin(); // second super_admin keeps count >= 1 after target flip

      const updated = await repo.updateUserWithLastSuperAdminGuard(targetId, { isActive: false });

      expect(updated.is_active).toBe(false);
    });

    it('should demote role from super_admin → staff when another active super_admin exists (with hotel_id assignment)', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const targetId = await seedSuperAdmin();
      await seedSuperAdmin(); // keeps count >= 1

      const updated = await repo.updateUserWithLastSuperAdminGuard(targetId, {
        role: 'staff',
        hotelId,
      });

      expect(updated.role).toBe('staff');
      expect(updated.hotel_id).toBe(hotelId);
      // Track the demoted user as no-longer-super_admin — cleanup via
      // seededSuperAdminIds still safely sweeps it by id.
    });
  });

  // --- Mutual-exclusion CHECK trip (T02 defense-in-depth) --------------

  describe('mutual-exclusion CHECK constraint (users_role_hotel_mutual_exclusion)', () => {
    it('should REJECT direct create of role="super_admin" WITH hotel_id set (DB CHECK backstop)', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');

      let caught: unknown;
      try {
        await db.user.create({
          data: {
            id: randomUUID(),
            hotelId,
            email: `bad-sa-${uuidSuffix()}@x.example`,
            passwordHash: 'argon2$stub',
            name: 'Bad SA',
            role: 'super_admin',
            language: 'id',
          },
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect((caught as { message: string }).message).toMatch(
        /users_role_hotel_mutual_exclusion|check constraint/i,
      );
    });

    it('should REJECT direct create of role="gm_admin" WITHOUT hotel_id (DB CHECK backstop)', async () => {
      let caught: unknown;
      try {
        await db.user.create({
          data: {
            id: randomUUID(),
            hotelId: null,
            email: `bad-gm-${uuidSuffix()}@x.example`,
            passwordHash: 'argon2$stub',
            name: 'Bad GM',
            role: 'gm_admin',
            language: 'id',
          },
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
    });
  });

  // --- Email uniqueness NULL-hotel-id behavior -------------------------

  describe('email uniqueness for super_admin (NULL hotel_id)', () => {
    it('should ALLOW 2 super_admins with the SAME email at the DB layer (NULL-in-UNIQUE = distinct per SQL standard)', async () => {
      const email = `shared-${uuidSuffix()}@platform.example`;
      await seedSuperAdmin({ email });
      // Second insert with same email + hotelId=null should succeed at
      // DB level — this is exactly why the handler-level
      // findSuperAdminByEmail pre-check exists (Open Item #5).
      const secondId = await seedSuperAdmin({ email });

      const rows = await db.user.findMany({ where: { email, role: 'super_admin' } });
      expect(rows).toHaveLength(2);
      expect(rows.some((r) => r.id === secondId)).toBe(true);
    });
  });

  // --- listUsersFiltered ------------------------------------------------

  describe('listUsersFiltered', () => {
    it('should scope by hotel_id when filter provided', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      await createTestUser({ hotelId, role: 'staff' });
      await createTestUser({ hotelId, role: 'gm_admin' });

      const result = await repo.listUsersFiltered({ hotelId }, { limit: 50, offset: 0 });

      expect(result.rows ?? result.users).toBeDefined();
      expect(result.users.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
      for (const u of result.users) {
        expect(u.hotel_id).toBe(hotelId);
      }
    });

    it('should filter by role', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      await createTestUser({ hotelId, role: 'staff' });
      await createTestUser({ hotelId, role: 'gm_admin' });

      const result = await repo.listUsersFiltered(
        { hotelId, role: 'gm_admin' },
        { limit: 50, offset: 0 },
      );

      expect(result.users.every((u) => u.role === 'gm_admin')).toBe(true);
    });

    it('should honor pagination (limit + offset)', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      await createTestUser({ hotelId, role: 'staff' });
      await createTestUser({ hotelId, role: 'staff' });
      await createTestUser({ hotelId, role: 'staff' });

      const page1 = await repo.listUsersFiltered({ hotelId }, { limit: 2, offset: 0 });
      const page2 = await repo.listUsersFiltered({ hotelId }, { limit: 2, offset: 2 });

      expect(page1.users.length).toBeLessThanOrEqual(2);
      expect(page1.limit).toBe(2);
      expect(page2.offset).toBe(2);
      expect(page1.total).toBe(page2.total);
    });
  });

  // --- insertUser + updateUser + setPassword + revokeAllSessions ------

  describe('write methods', () => {
    it('insertUser should persist a new user and mark must_rotate_password=true', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const email = `new-${uuidSuffix()}@hotel.example`;

      const created = await repo.insertUser({
        email,
        name: 'Fresh',
        role: 'staff',
        hotelId,
        deptId: null,
        passwordHash: 'argon2$stub',
        language: 'id',
      });

      expect(created.email).toBe(email);
      expect(created.must_rotate_password).toBe(true);
      expect(created.hotel_id).toBe(hotelId);
    });

    it('insertUser should throw UniqueConstraintError on duplicate (hotel_id, email)', async () => {
      const { UniqueConstraintError } = await import('../admin-users.repository.js');
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const email = `dup-${uuidSuffix()}@hotel.example`;

      await repo.insertUser({
        email,
        name: 'First',
        role: 'staff',
        hotelId,
        deptId: null,
        passwordHash: 'argon2$stub',
        language: 'id',
      });

      let caught: unknown;
      try {
        await repo.insertUser({
          email,
          name: 'Dup',
          role: 'staff',
          hotelId,
          deptId: null,
          passwordHash: 'argon2$stub',
          language: 'id',
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UniqueConstraintError);
    });

    it('updateUser should update fields on a non-super_admin row without touching the guard path', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const target = await createTestUser({ hotelId, role: 'staff' });

      const updated = await repo.updateUser(target.id, { name: 'Renamed', language: 'en' });

      expect(updated.name).toBe('Renamed');
      expect(updated.language).toBe('en');
    });

    it('setPassword should atomically update passwordHash + mustRotatePassword and return the row', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const target = await createTestUser({
        hotelId,
        mustRotatePassword: false,
        passwordHash: 'argon2$old',
      });

      const updated = await repo.setPassword(target.id, 'argon2$new', true);

      expect(updated.must_rotate_password).toBe(true);
      const raw = await db.user.findUnique({ where: { id: target.id } });
      expect(raw?.passwordHash).toBe('argon2$new');
    });

    it('revokeAllSessions should revoke every active session for the target user (no except filter)', async () => {
      await seedHotel();
      if (hotelId === undefined) throw new Error('hotelId not seeded');
      const target = await createTestUser({ hotelId });

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
      const rowA = await db.session.findUnique({ where: { id: sessionA.id } });
      const rowB = await db.session.findUnique({ where: { id: sessionB.id } });
      expect(rowA?.revokedAt).not.toBeNull();
      expect(rowB?.revokedAt).not.toBeNull();
    });
  });
});
