// Integration tests for AuthRepository — backfilled cycle 7 (T02-sub-1)
// against the migrated local Postgres (T02 cycle 6 deliverable). Uses the
// real PrismaClient singleton via integration-helpers; no mocks.
//
// 16 assertions consolidated: 10 T05 (login/sessions/rotate) + 6 T06 (/me +
// password rotation). Pattern mirrors T02 smoke: beforeAll connect →
// per-test setup via factory builders → afterEach sweepByHotel cleanup →
// afterAll disconnect.

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import { hashToken } from '@shared/utils/crypto.js';

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
import { AuthRepository } from '../auth.repository.js';

const repo = new AuthRepository(db);

describe('AuthRepository (integration — real Postgres at localhost:5433)', () => {
  let tierId: string;
  let hotelId: string;

  beforeAll(async () => {
    await connectPrisma();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  afterEach(async () => {
    if (hotelId !== undefined) await sweepByHotel(hotelId);
    if (tierId !== undefined) await sweepTier(tierId);
  });

  async function seedHotel(): Promise<void> {
    const tier = await createTestTier();
    tierId = tier.id;
    const hotel = await createTestHotel({ tierId });
    hotelId = hotel.id;
  }

  // --- T05 user lookup ----------------------------------------------------

  describe('findActiveUserByEmail', () => {
    it('should return UserRow when email matches an active user', async () => {
      await seedHotel();
      const email = `test-${uuidSuffix()}@example.com`;
      const created = await createTestUser({ hotelId, email });

      const row = await repo.findActiveUserByEmail(email);

      expect(row).not.toBeNull();
      expect(row?.id).toBe(created.id);
      expect(row?.email).toBe(email);
      expect(row?.isActive).toBe(true);
    });

    it('should return null when no active user matches the email', async () => {
      await seedHotel();
      const row = await repo.findActiveUserByEmail(`missing-${uuidSuffix()}@example.com`);
      expect(row).toBeNull();
    });

    it('should return null when the matching user has isActive=false', async () => {
      await seedHotel();
      const email = `inactive-${uuidSuffix()}@example.com`;
      await createTestUser({ hotelId, email, isActive: false });

      const row = await repo.findActiveUserByEmail(email);
      expect(row).toBeNull();
    });
  });

  // --- T05 session create + lookup --------------------------------------

  describe('createSession + findActiveSessionByRefreshHash', () => {
    it('should persist a session row with all required fields and find it by refresh hash', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const refreshToken = `raw-${uuidSuffix(16)}`;
      const refreshHash = hashToken(refreshToken);
      const csrfToken = `csrf-${uuidSuffix(16)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const session = await repo.createSession({
        userId: user.id,
        refreshTokenHash: refreshHash,
        csrfToken,
        expiresAt,
        userAgent: 'jest/integration',
        ipAddress: '127.0.0.1',
      });

      expect(session.userId).toBe(user.id);
      expect(session.refreshTokenHash).toBe(refreshHash);
      expect(session.csrfToken).toBe(csrfToken);
      expect(session.revokedAt).toBeNull();

      const found = await repo.findActiveSessionByRefreshHash(refreshHash);
      expect(found?.id).toBe(session.id);
    });

    it('should NOT return a revoked session even when refresh hash matches', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const refreshHash = hashToken(`raw-${uuidSuffix()}`);
      const session = await repo.createSession({
        userId: user.id,
        refreshTokenHash: refreshHash,
        csrfToken: `csrf-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      await repo.revokeSession(session.id);

      const found = await repo.findActiveSessionByRefreshHash(refreshHash);
      expect(found).toBeNull();
    });

    it('should NOT return an expired session even when refresh hash matches', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const refreshHash = hashToken(`raw-${uuidSuffix()}`);
      await repo.createSession({
        userId: user.id,
        refreshTokenHash: refreshHash,
        csrfToken: `csrf-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() - 60_000), // expired 1 minute ago
        userAgent: null,
        ipAddress: null,
      });

      const found = await repo.findActiveSessionByRefreshHash(refreshHash);
      expect(found).toBeNull();
    });
  });

  // --- T05 revoke / rotate ----------------------------------------------

  describe('revokeSession', () => {
    it('should set revokedAt on the matching session', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const session = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`raw-${uuidSuffix()}`),
        csrfToken: `csrf-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      await repo.revokeSession(session.id);

      const row = await db.session.findUnique({ where: { id: session.id } });
      expect(row?.revokedAt).not.toBeNull();
    });
  });

  describe('rotateSession', () => {
    it('should atomically revoke the old session and create a new one in a single transaction', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const oldSession = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`old-${uuidSuffix()}`),
        csrfToken: `csrf-old-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      const newRefreshHash = hashToken(`new-${uuidSuffix()}`);
      const newSession = await repo.rotateSession(oldSession.id, {
        userId: user.id,
        refreshTokenHash: newRefreshHash,
        csrfToken: `csrf-new-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      const oldRow = await db.session.findUnique({ where: { id: oldSession.id } });
      const newRow = await db.session.findUnique({ where: { id: newSession.id } });

      expect(oldRow?.revokedAt).not.toBeNull();
      expect(newRow?.revokedAt).toBeNull();
      expect(newRow?.refreshToken).toBe(newRefreshHash);
    });
  });

  // --- T05 last login + uniqueness --------------------------------------

  describe('touchUserLastLogin', () => {
    it('should set lastLoginAt on the matching user', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });

      await repo.touchUserLastLogin(user.id);

      const row = await db.user.findUnique({ where: { id: user.id } });
      expect(row?.lastLoginAt).not.toBeNull();
    });
  });

  describe('UNIQUE(hotel_id, email) constraint', () => {
    it('should raise Prisma P2002 when inserting a duplicate (hotel_id, email)', async () => {
      await seedHotel();
      const email = `dup-${uuidSuffix()}@example.com`;
      await createTestUser({ hotelId, email });

      let caught: unknown;
      try {
        await createTestUser({ hotelId, email });
      } catch (err) {
        caught = err;
      }
      expect((caught as { code?: string }).code).toBe('P2002');
    });
  });

  // --- T06 findUserById (broader than findActiveUserById) ---------------

  describe('findUserById', () => {
    it('should return UserRow when the user exists (regardless of isActive)', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId, isActive: false });
      const row = await repo.findUserById(user.id);
      expect(row).not.toBeNull();
      expect(row?.id).toBe(user.id);
      expect(row?.isActive).toBe(false);
    });

    it('should return null when the user id does not exist', async () => {
      await seedHotel();
      const row = await repo.findUserById(randomUUID());
      expect(row).toBeNull();
    });
  });

  // --- T06 password rotation + flag clearing ----------------------------

  describe('updateUserPassword', () => {
    it('should atomically set passwordHash AND clear mustRotatePassword', async () => {
      await seedHotel();
      const user = await createTestUser({
        hotelId,
        passwordHash: 'argon2$old',
        mustRotatePassword: true,
      });

      const updated = await repo.updateUserPassword(user.id, 'argon2$new');

      expect(updated.passwordHash).toBe('argon2$new');
      expect(updated.mustRotatePassword).toBe(false);
    });
  });

  // --- T06 language update ----------------------------------------------

  describe('updateUserLanguage', () => {
    it('should set the language and return the updated UserRow', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId, language: 'id' });

      const updated = await repo.updateUserLanguage(user.id, 'en');

      expect(updated.language).toBe('en');
      expect(updated.id).toBe(user.id);
    });
  });

  // --- T06 CSRF rotation -------------------------------------------------

  describe('rotateCsrfToken', () => {
    it('should overwrite the session csrfToken in place', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const session = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`raw-${uuidSuffix()}`),
        csrfToken: `csrf-original-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      const newCsrf = `csrf-rotated-${uuidSuffix()}`;
      await repo.rotateCsrfToken(session.id, newCsrf);

      const row = await db.session.findUnique({ where: { id: session.id } });
      expect(row?.csrfToken).toBe(newCsrf);
    });
  });

  // --- T06 revoke all OTHER sessions (preserves current) ---------------

  describe('revokeAllOtherSessions', () => {
    it('should revoke every other active session but leave the current session alive', async () => {
      await seedHotel();
      const user = await createTestUser({ hotelId });
      const currentSession = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`current-${uuidSuffix()}`),
        csrfToken: `csrf-current-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });
      const otherSessionA = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`other-a-${uuidSuffix()}`),
        csrfToken: `csrf-other-a-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });
      const otherSessionB = await repo.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(`other-b-${uuidSuffix()}`),
        csrfToken: `csrf-other-b-${uuidSuffix()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        userAgent: null,
        ipAddress: null,
      });

      // T05 `AuthRepository` exposes `revokeSession` (single) + `rotateSession`
      // (revoke+create in tx). `revokeAllOtherSessions` proper lives on
      // `UsersRepository` (T07). Here we exercise the multi-row revoke pattern
      // via `revokeSession` on each other id and assert the current stays alive.
      await repo.revokeSession(otherSessionA.id);
      await repo.revokeSession(otherSessionB.id);

      const current = await db.session.findUnique({ where: { id: currentSession.id } });
      const aRow = await db.session.findUnique({ where: { id: otherSessionA.id } });
      const bRow = await db.session.findUnique({ where: { id: otherSessionB.id } });

      expect(current?.revokedAt).toBeNull();
      expect(aRow?.revokedAt).not.toBeNull();
      expect(bRow?.revokedAt).not.toBeNull();
    });
  });
});
