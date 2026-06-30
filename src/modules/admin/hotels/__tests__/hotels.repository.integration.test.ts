import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import { Argon2Hasher } from '@modules/auth/adapters/argon2-hasher.adapter.js';

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
} from '../../../../core/prisma/__tests__/integration-helpers.js';
import { AdminHotelsRepository, UniqueConstraintError } from '../hotels.repository.js';

const repo = new AdminHotelsRepository(db);
const hasher = new Argon2Hasher();

const createdHotelIds = new Set<string>();
const createdTierIds = new Set<string>();

function gmContact(): { name: string; email: string; phone: string } {
  return { name: 'GM', email: `gm-${uuidSuffix(10)}@example.com`, phone: '+628123456789' };
}

async function freshTierId(): Promise<string> {
  const existing = await db.tier.findUnique({ where: { name: 'luxury' } });
  if (existing !== null) return existing.id;
  const tier = await createTestTier({ name: 'luxury' });
  createdTierIds.add(tier.id);
  return tier.id;
}

describe('AdminHotelsRepository (T09 — real Postgres at localhost:5433)', () => {
  beforeAll(async () => {
    await connectPrisma();
  });

  afterEach(async () => {
    for (const id of createdHotelIds) await sweepByHotel(id);
    for (const id of createdTierIds) await sweepTier(id);
    createdHotelIds.clear();
    createdTierIds.clear();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('createHotelWithGm — atomic', () => {
    it('should commit hotel + gm_admin with a login-verifiable password', async () => {
      const tierId = await freshTierId();
      const password = 'Gm$Test1Passw0rd';
      const passwordHash = await hasher.hash(password);
      const gm = gmContact();
      const code = `ABR-${uuidSuffix(6)}`;

      const result = await repo.createHotelWithGm({
        hotel: { name: 'Aurora', code, tierId, gmContact: gm },
        gm: { email: gm.email, name: gm.name, passwordHash },
      });
      createdHotelIds.add(result.hotel.id);

      expect(result.hotel.code).toBe(code);
      expect(result.hotel.tier).toBe('luxury');
      expect(result.hotel.status).toBe('active');
      expect(result.hotel.agent_count).toBe(0);
      expect(result.hotel.user_count).toBe(1);
      expect(result.gmUser.role).toBe('gm_admin');
      expect(result.gmUser.hotel_id).toBe(result.hotel.id);
      expect(result.gmUser.must_rotate_password).toBe(true);

      const gmRow = await db.user.findFirst({ where: { hotelId: result.hotel.id } });
      expect(gmRow?.role).toBe('gm_admin');
      expect(await hasher.verify(gmRow?.passwordHash ?? '', password)).toBe(true);
    });

    it('should roll back fully on a duplicate code (no orphan hotel or GM)', async () => {
      const tierId = await freshTierId();
      const seeded = await createTestHotel({ tierId, code: `DUP-${uuidSuffix(6)}` });
      createdHotelIds.add(seeded.id);

      const gm = gmContact();
      await expect(
        repo.createHotelWithGm({
          hotel: { name: 'Dup', code: seeded.code, tierId, gmContact: gm },
          gm: { email: gm.email, name: gm.name, passwordHash: 'argon2$stub' },
        }),
      ).rejects.toBeInstanceOf(UniqueConstraintError);

      expect(await db.user.count({ where: { email: gm.email } })).toBe(0);
      expect(await db.hotel.count({ where: { code: seeded.code } })).toBe(1);
    });
  });

  describe('suspendWithSessionCascade', () => {
    it('should flip status + revoke all active sessions for the hotel in one tx', async () => {
      const tierId = await freshTierId();
      const hotel = await createTestHotel({ tierId });
      createdHotelIds.add(hotel.id);
      const gm = await createTestUser({ hotelId: hotel.id, role: 'gm_admin' });
      const session = await db.session.create({
        data: {
          userId: gm.id,
          refreshToken: `rt-${uuidSuffix(12)}`,
          csrfToken: `csrf-${uuidSuffix(8)}`,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      const suspended = await repo.suspendWithSessionCascade(hotel.id);
      expect(suspended.status).toBe('suspended');

      const after = await db.session.findUnique({ where: { id: session.id } });
      expect(after?.revokedAt).not.toBeNull();

      const reactivated = await repo.reactivate(hotel.id);
      expect(reactivated.status).toBe('active');

      const stillRevoked = await db.session.findUnique({ where: { id: session.id } });
      expect(stillRevoked?.revokedAt).not.toBeNull();
    });
  });

  describe('list / findById', () => {
    it('should return user_count + agent_count=0 + flat tier name', async () => {
      const tierId = await freshTierId();
      const hotel = await createTestHotel({ tierId });
      createdHotelIds.add(hotel.id);
      await createTestUser({ hotelId: hotel.id, role: 'gm_admin' });
      await createTestUser({ hotelId: hotel.id, role: 'staff' });

      const detail = await repo.findById(hotel.id);
      expect(detail?.user_count).toBe(2);
      expect(detail?.agent_count).toBe(0);
      expect(detail?.tier).toBe('luxury');

      const list = await repo.list();
      const found = list.find((h) => h.id === hotel.id);
      expect(found?.user_count).toBe(2);
    });
  });
});
