import type { PrismaClient } from '.prisma/client';

/**
 * Canonical subscription-tier catalog — the SINGLE source of truth for the four
 * fixed tiers (ADD-25). Consumed by:
 *   - the API entrypoint bootstrap (`ensureTierCatalog` on startup), so a
 *     freshly-migrated database can never be missing a tier row. That gap was
 *     the root cause of the "Unknown tier" validation error on hotel
 *     create/update when only `professional` had been manually seeded.
 *   - `prisma/seeds/tiers.ts` (manual `pnpm seed` / `make db-seed`), which
 *     re-exports from here so the two paths never drift.
 *
 * `agentCap` = TOTAL agents incl. the Receptionist AI (Lite 2 / Professional 4 /
 * Luxury 6; Enterprise custom = -1 sentinel for "unlimited"). Enterprise is the
 * only custom tier. Values mirror the DB CHECK constraint on `tiers.name`.
 */
export interface TierCatalogEntry {
  readonly name: 'lite' | 'professional' | 'luxury' | 'enterprise';
  readonly displayName: string;
  readonly agentCap: number;
  readonly userCap: number;
  readonly departmentCap: number;
  readonly isCustom: boolean;
}

export const TIER_CATALOG: readonly TierCatalogEntry[] = [
  { name: 'lite', displayName: 'Lite', agentCap: 2, userCap: 2, departmentCap: 1, isCustom: false },
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

export const CANONICAL_TIER_NAMES: readonly string[] = TIER_CATALOG.map((tier) => tier.name);

/**
 * Idempotently upsert the canonical tiers. Safe to run on every boot and across
 * concurrent replicas: each row is keyed by the unique `name` column, so Prisma
 * compiles this to a native `INSERT ... ON CONFLICT DO UPDATE` (atomic, no
 * lost-update or duplicate-key race). Values are rewritten to the canonical caps
 * every time, so a drifted row self-heals.
 */
export async function ensureTierCatalog(db: PrismaClient): Promise<void> {
  for (const tier of TIER_CATALOG) {
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
