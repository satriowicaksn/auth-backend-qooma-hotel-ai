import type { PrismaClient } from '.prisma/client';

// ADD-25: subscription tiers include 0 outbound (prepaid top-up only) and there
// is no minimum-agent floor. `agentCap` = TOTAL agents incl the Receptionist AI
// (Lite 2 / Professional 4 / Luxury 6; Enterprise custom = -1).
interface TierSeed {
  readonly name: 'lite' | 'professional' | 'luxury' | 'enterprise';
  readonly displayName: string;
  readonly agentCap: number;
  readonly userCap: number;
  readonly departmentCap: number;
  readonly isCustom: boolean;
}

const TIER_SEEDS: readonly TierSeed[] = [
  {
    name: 'lite',
    displayName: 'Lite',
    agentCap: 2,
    userCap: 2,
    departmentCap: 1,
    isCustom: false,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    agentCap: 4,
    userCap: 4,
    departmentCap: 3,
    isCustom: false,
  },
  {
    name: 'luxury',
    displayName: 'Luxury',
    agentCap: 6,
    userCap: 6,
    departmentCap: 5,
    isCustom: false,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    agentCap: -1,
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
      agentCap: tier.agentCap,
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
