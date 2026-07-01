// Import from the generated `.prisma/client` path (NOT `@prisma/client`)
// for the same reason as auth.repository.ts + users.repository.ts:
// pnpm hoists the `@prisma/client` package whose default.d.ts is a
// stub; direct generated-path import picks up the real shapes
// (T02 cycle-6 Q-B-02(b) inline resolution).
import type { PrismaClient, Tier as PrismaTier } from '.prisma/client';

import type { AdminTier, TierName } from './admin-tiers.types.js';

export class AdminTiersRepository {
  constructor(private readonly db: PrismaClient) {}

  async listTiers(): Promise<AdminTier[]> {
    const rows = await this.db.tier.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toAdminTier);
  }

  async findTierByName(name: TierName): Promise<AdminTier | null> {
    const row = await this.db.tier.findUnique({ where: { name } });
    return row === null ? null : toAdminTier(row);
  }
}

function toAdminTier(row: PrismaTier): AdminTier {
  return {
    id: row.id,
    name: row.name as TierName,
    display_name: row.displayName,
    outbound_quota_monthly: row.outboundQuotaMonthly,
    agent_cap: row.agentCap,
    agent_minimum: row.agentMinimum,
    user_cap: row.userCap,
    department_cap: row.departmentCap,
    features: row.features as unknown as Record<string, boolean>,
    is_custom: row.isCustom,
  };
}
