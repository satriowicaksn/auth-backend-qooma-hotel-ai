import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { SEEDED_TIER_NAMES, seedTiers } from '../../../../prisma/seeds/tiers.js';

import { connectPrisma, db, disconnectPrisma } from './integration-helpers.js';

interface ExpectedTier {
  readonly name: string;
  readonly displayName: string;
  readonly outboundQuotaMonthly: number;
  readonly agentCap: number;
  readonly agentMinimum: number;
  readonly userCap: number;
  readonly departmentCap: number;
  readonly isCustom: boolean;
}

const EXPECTED: readonly ExpectedTier[] = [
  {
    name: 'lite',
    displayName: 'Lite',
    outboundQuotaMonthly: 2000,
    agentCap: 1,
    agentMinimum: 3,
    userCap: 2,
    departmentCap: 1,
    isCustom: false,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    outboundQuotaMonthly: 4000,
    agentCap: 3,
    agentMinimum: 3,
    userCap: 4,
    departmentCap: 3,
    isCustom: false,
  },
  {
    name: 'luxury',
    displayName: 'Luxury',
    outboundQuotaMonthly: 8000,
    agentCap: 5,
    agentMinimum: 3,
    userCap: 6,
    departmentCap: 5,
    isCustom: false,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    outboundQuotaMonthly: -1,
    agentCap: -1,
    agentMinimum: 3,
    userCap: -1,
    departmentCap: -1,
    isCustom: true,
  },
];

async function cleanCanonicalTiers(): Promise<void> {
  await db.tier.deleteMany({ where: { name: { in: [...SEEDED_TIER_NAMES] } } });
}

describe('seedTiers (T03 — real Postgres at localhost:5433)', () => {
  beforeAll(async () => {
    await connectPrisma();
    await cleanCanonicalTiers();
  });

  afterAll(async () => {
    await cleanCanonicalTiers();
    await disconnectPrisma();
  });

  it('should upsert exactly the 4 canonical tiers with spec values', async () => {
    await seedTiers(db);

    const count = await db.tier.count({ where: { name: { in: [...SEEDED_TIER_NAMES] } } });
    expect(count).toBe(4);

    for (const expected of EXPECTED) {
      const row = await db.tier.findUnique({ where: { name: expected.name } });
      expect(row).not.toBeNull();
      expect(row?.displayName).toBe(expected.displayName);
      expect(row?.outboundQuotaMonthly).toBe(expected.outboundQuotaMonthly);
      expect(row?.agentCap).toBe(expected.agentCap);
      expect(row?.agentMinimum).toBe(expected.agentMinimum);
      expect(row?.userCap).toBe(expected.userCap);
      expect(row?.departmentCap).toBe(expected.departmentCap);
      expect(row?.isCustom).toBe(expected.isCustom);
      expect(row?.features).toEqual({});
    }
  });

  it('should be idempotent — re-running keeps exactly 4 rows, no duplicate or error', async () => {
    await seedTiers(db);
    await seedTiers(db);

    const count = await db.tier.count({ where: { name: { in: [...SEEDED_TIER_NAMES] } } });
    expect(count).toBe(4);
  });
});
