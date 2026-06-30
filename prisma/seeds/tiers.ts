import type { PrismaClient } from '.prisma/client';

interface TierSeed {
  readonly name: 'lite' | 'professional' | 'luxury' | 'enterprise';
  readonly displayName: string;
  readonly outboundQuotaMonthly: number;
  readonly agentCap: number;
  readonly agentMinimum: number;
  readonly userCap: number;
  readonly departmentCap: number;
  readonly isCustom: boolean;
}

const TIER_SEEDS: readonly TierSeed[] = [
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

export const SEEDED_TIER_NAMES: readonly string[] = TIER_SEEDS.map((tier) => tier.name);

export async function seedTiers(db: PrismaClient): Promise<void> {
  for (const tier of TIER_SEEDS) {
    const data = {
      displayName: tier.displayName,
      outboundQuotaMonthly: tier.outboundQuotaMonthly,
      agentCap: tier.agentCap,
      agentMinimum: tier.agentMinimum,
      userCap: tier.userCap,
      departmentCap: tier.departmentCap,
      isCustom: tier.isCustom,
    };
    await db.tier.upsert({
      where: { name: tier.name },
      update: data,
      create: { name: tier.name, ...data },
    });
  }
}
