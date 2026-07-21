// Smoke integration test for the real PrismaClient singleton (T02 cycle-6).
// Hits a live local Postgres at `config.DATABASE_URL` (host port 5433 per
// docker-compose + .env.example:22) and exercises the 3 surfaces PM B
// ACK Open Item #3 mandates:
//   (a) connection round-trip — proves the singleton + migration land
//   (b) UNIQUE(hotel_id, email) trip — proves the @@unique constraint
//   (c) mutual-exclusion CHECK trip — proves the manual SQL CHECK
//       injection from Commit 2 (per prisma/schema.prisma:141-163 + spec
//       MVP-AUTH-FIRST §4.4) is live in the migrated DB
//
// Cross-slot execution per §4-D05 (Slot A canonical territory).
//
// Idempotency: each sub-test cleans up its own rows via `afterEach` and
// uses UUID-suffixed natural keys to avoid collision with future T03
// seed data (4 tier rows) or parallel CI runs.

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import { db } from '../prisma-client.js';

const TIER_ID = randomUUID();
const HOTEL_ID = randomUUID();
// `tiers.name` is bounded by both VARCHAR(20) AND a CHECK constraint
// limiting values to the spec-canonical 4: `lite | professional | luxury |
// enterprise` (per prisma/schema.prisma:143-144). Use 'lite' for the
// smoke fixture and rely on UUID-suffixed `tiers.id` for idempotent
// cleanup. When T03 (tiers seed) lands and pre-creates the 4 canonical
// rows, this smoke will need to coexist via PK rather than natural key —
// flagged for cycle-7+ refactor.
const TIER_NAME_SMOKE = 'lite';
// `hotels.code` is VARCHAR(20); keep it short.
const HOTEL_CODE_SMOKE = `SMK-${randomUUID().slice(0, 8)}`;

describe('PrismaClient smoke (T02 — REAL Postgres required at localhost:5433)', () => {
  beforeAll(async () => {
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  afterEach(async () => {
    // Best-effort sweep: cleanup any rows created during the test. Some
    // sub-tests fail before creating rows; deleteMany on a missing PK
    // returns count=0 cleanly.
    await db.session.deleteMany({ where: { user: { hotelId: HOTEL_ID } } }).catch(() => undefined);
    await db.user.deleteMany({ where: { hotelId: HOTEL_ID } }).catch(() => undefined);
    await db.user.deleteMany({ where: { email: { contains: 'smoke-' } } }).catch(() => undefined);
    await db.hotel.deleteMany({ where: { id: HOTEL_ID } }).catch(() => undefined);
    await db.tier.deleteMany({ where: { id: TIER_ID } }).catch(() => undefined);
  });

  describe('sub-test (a) — connection round-trip', () => {
    it('should insert + select + delete a tier row cleanly', async () => {
      const created = await db.tier.create({
        data: {
          id: TIER_ID,
          name: TIER_NAME_SMOKE,
          displayName: 'Smoke Tier',
          agentCap: 1,
          userCap: 2,
          departmentCap: 1,
        },
      });
      expect(created.id).toBe(TIER_ID);
      expect(created.name).toBe(TIER_NAME_SMOKE);

      const fetched = await db.tier.findUnique({ where: { id: TIER_ID } });
      expect(fetched).not.toBeNull();
      expect(fetched?.displayName).toBe('Smoke Tier');

      const deleted = await db.tier.delete({ where: { id: TIER_ID } });
      expect(deleted.id).toBe(TIER_ID);

      const afterDelete = await db.tier.findUnique({ where: { id: TIER_ID } });
      expect(afterDelete).toBeNull();
    });
  });

  describe('sub-test (b) — UNIQUE(hotel_id, email) trip', () => {
    it('should raise Prisma P2002 on duplicate (hotel_id, email) insert', async () => {
      // FK satisfaction: tier → hotel → users
      await db.tier.create({
        data: {
          id: TIER_ID,
          name: TIER_NAME_SMOKE,
          displayName: 'UNIQUE Smoke',
          agentCap: 1,
          userCap: 2,
          departmentCap: 1,
        },
      });
      await db.hotel.create({
        data: {
          id: HOTEL_ID,
          code: HOTEL_CODE_SMOKE,
          name: 'Smoke Hotel',
          tierId: TIER_ID,
          gmContact: { name: 'GM', email: 'gm@smoke.example', phone: '+621234' },
        },
      });

      const email = `smoke-dup-${randomUUID()}@example.com`;
      await db.user.create({
        data: {
          hotelId: HOTEL_ID,
          email,
          passwordHash: 'argon2$smoke',
          name: 'First',
          role: 'staff',
        },
      });

      let caught: unknown;
      try {
        await db.user.create({
          data: {
            hotelId: HOTEL_ID,
            email, // duplicate (hotelId, email)
            passwordHash: 'argon2$smoke',
            name: 'Duplicate',
            role: 'staff',
          },
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      const code = (caught as { code?: string }).code;
      expect(code).toBe('P2002');
    });
  });

  describe('sub-test (c) — mutual-exclusion CHECK trip (proves manual SQL CHECK from Commit 2)', () => {
    it('should raise a constraint violation on role=gm_admin with hotelId=null', async () => {
      let caught: unknown;
      try {
        await db.user.create({
          data: {
            hotelId: null,
            email: `smoke-mutex-${randomUUID()}@example.com`,
            passwordHash: 'argon2$smoke',
            name: 'Bad gm_admin',
            role: 'gm_admin', // violates users_role_hotel_mutual_exclusion
          },
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeDefined();
      // The CHECK constraint produces a raw-SQL failure surfaced by Prisma
      // as a `PrismaClientUnknownRequestError` or `PrismaClientKnownRequestError`
      // depending on driver version. Either way, the message references the
      // constraint name `users_role_hotel_mutual_exclusion`.
      const msg = (caught as { message?: string }).message ?? '';
      expect(msg).toMatch(/users_role_hotel_mutual_exclusion|violates check constraint/i);
    });
  });
});
