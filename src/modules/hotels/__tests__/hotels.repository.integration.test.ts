// Integration tests for HotelsRepository — T10 cross-slot per §4-D09.
// Uses the real PrismaClient singleton via integration-helpers (T02-sub-1
// cycle 7 pattern). 7 assertions cover the 3 repo methods + the DbNull
// branch on updateSettings (which is invisible at the unit layer).
//
// Run via `pnpm test:integration` (uses --runInBand to avoid cross-suite
// tier.name UNIQUE collisions per the existing T02-sub-1 convention).

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import {
  connectPrisma,
  createTestHotel,
  createTestTier,
  db,
  disconnectPrisma,
  sweepByHotel,
  sweepTier,
} from '../../../core/prisma/__tests__/integration-helpers.js';
import { HotelsRepository } from '../hotels.repository.js';

const repo = new HotelsRepository(db);

describe('HotelsRepository (integration — real Postgres at localhost:5433)', () => {
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

  // --- findHotelById ------------------------------------------------------

  describe('findHotelById', () => {
    it('should return the scoped context with the joined tier when the row exists', async () => {
      await seedHotel();

      const row = await repo.findHotelById(hotelId);

      expect(row).not.toBeNull();
      expect(row?.id).toBe(hotelId);
      expect(row?.tier.id).toBe(tierId);
      expect(row?.tier.name).toBe('lite');
      expect(row?.timezone).toBe('Asia/Jakarta');
    });

    it('should return null when no hotel matches the id', async () => {
      await seedHotel();
      const missing = '00000000-0000-0000-0000-000000000000';

      const row = await repo.findHotelById(missing);

      expect(row).toBeNull();
    });
  });

  // --- findSettingsByHotelId ---------------------------------------------

  describe('findSettingsByHotelId', () => {
    it('should return only the whitelisted timezone/branding/dnd subset', async () => {
      await seedHotel();

      const settings = await repo.findSettingsByHotelId(hotelId);

      expect(settings).not.toBeNull();
      expect(Object.keys(settings ?? {}).sort()).toEqual(['branding', 'dnd', 'timezone']);
      expect(settings?.timezone).toBe('Asia/Jakarta');
    });

    it('should return null when no hotel matches the id', async () => {
      await seedHotel();
      const missing = '11111111-2222-3333-4444-555555555555';

      const settings = await repo.findSettingsByHotelId(missing);

      expect(settings).toBeNull();
    });
  });

  // --- updateSettings ----------------------------------------------------

  describe('updateSettings', () => {
    it('should persist a timezone change and return the updated row', async () => {
      await seedHotel();

      const updated = await repo.updateSettings(hotelId, { timezone: 'Asia/Singapore' });

      expect(updated.timezone).toBe('Asia/Singapore');
      const row = await db.hotel.findUnique({ where: { id: hotelId } });
      expect(row?.timezone).toBe('Asia/Singapore');
    });

    it('should persist a JSON branding object and surface it on read', async () => {
      await seedHotel();

      const branding = { logo: 'https://cdn.example/logo.png', primaryColor: '#ff0000' };
      const updated = await repo.updateSettings(hotelId, { branding });

      expect(updated.branding).toEqual(branding);
    });

    it('should map branding:null to Prisma.DbNull so the JSONB column becomes SQL NULL', async () => {
      await seedHotel();
      // First set a non-null branding so the clear is observable.
      await repo.updateSettings(hotelId, { branding: { logo: 'seed' } });

      const updated = await repo.updateSettings(hotelId, { branding: null });

      expect(updated.branding).toBeNull();
      const row = await db.hotel.findUnique({ where: { id: hotelId } });
      expect(row?.branding).toBeNull();
    });
  });
});
