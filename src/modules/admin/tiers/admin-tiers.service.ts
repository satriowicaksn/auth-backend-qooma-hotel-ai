import { ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session } from '@shared/types/fastify-augmentation.js';

import type { AdminTiersRepository } from './admin-tiers.repository.js';
import type { AdminTier, TierName } from './admin-tiers.types.js';

export interface ListTiersResult {
  readonly tiers: AdminTier[];
}

export class AdminTiersService {
  constructor(private readonly repo: AdminTiersRepository) {}

  async listTiers(session: Session | undefined): Promise<ListTiersResult> {
    this.assertSuperAdminScope(session);
    const tiers = await this.repo.listTiers();
    return { tiers };
  }

  async getTierByName(session: Session | undefined, name: TierName): Promise<AdminTier> {
    this.assertSuperAdminScope(session);
    const tier = await this.repo.findTierByName(name);
    if (tier === null) {
      // Defensive — name is zod-enum-restricted at route level; would only
      // hit if a canonical tier row was deleted (schema forbids).
      throw new NotFoundError('Tier', name);
    }
    return tier;
  }

  /**
   * Inline super_admin scope helper — mirrors T10 assertGmAdminScope
   * pattern. Deferred shared extraction (src/shared/utils/auth-scope.ts)
   * to a T_AUX task when a 4th admin module surfaces.
   */
  private assertSuperAdminScope(session: Session | undefined): void {
    if (session === undefined || session.role !== 'super_admin') {
      throw new ForbiddenError('This endpoint requires super_admin scope', {
        actualRole: session?.role ?? null,
      });
    }
  }
}
