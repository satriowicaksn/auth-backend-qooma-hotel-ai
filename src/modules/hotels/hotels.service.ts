/**
 * Cross-slot execution per §4-D09 (Slot C canonical territory).
 *
 * HotelsService — orchestrates GET /api/hotels/me + GET, PUT
 * /api/settings/hotel per docs/spec/01-auth-identity.md §1.5 +
 * docs/spec/MVP-AUTH-FIRST.md §1 rows 8 + 10 + §5 super_admin
 * /hotels/me option (b).
 *
 * Role gating:
 *   - GET /api/hotels/me: any authenticated role (super_admin returns
 *     literal { id: null, tier: null }; others scoped to their hotel)
 *   - GET, PUT /api/settings/hotel: gm_admin ONLY (others 403);
 *     super_admin must use /api/admin/hotels for platform-level edits
 *     (Slot A T09 territory).
 *
 * Tenant scope is consumed (not enforced) here — tenant-guard plugin
 * (src/plugins/tenant-guard.ts) populates req.session + req.tenantScope
 * upstream per §4-D01.
 */

import { ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session, TenantScope } from '@shared/types/fastify-augmentation.js';

import type { HotelsRepository } from './hotels.repository.js';
import type { UpdateSettingsRequestDto } from './hotels.schema.js';
import type { HotelContext, HotelSettings } from './hotels.types.js';

export class HotelsService {
  constructor(private readonly repo: HotelsRepository) {}

  async getHotelContextForSession(
    session: Session | undefined,
    scope: TenantScope | undefined,
  ): Promise<HotelContext> {
    if (session === undefined || scope === undefined) {
      throw new ForbiddenError('Authenticated session required', {
        hasSession: session !== undefined,
        hasScope: scope !== undefined,
      });
    }
    if (scope.type === 'all-hotels') {
      // super_admin → option (b) per MVP-AUTH-FIRST §5 line 92.
      return { id: null, tier: null };
    }
    const hotel = await this.repo.findHotelById(scope.hotelId);
    if (hotel === null) {
      throw new NotFoundError('Hotel', scope.hotelId);
    }
    return hotel;
  }

  async getSettings(
    session: Session | undefined,
    scope: TenantScope | undefined,
  ): Promise<HotelSettings> {
    const hotelId = this.assertGmAdminScope(session, scope);
    const settings = await this.repo.findSettingsByHotelId(hotelId);
    if (settings === null) {
      // Defensive — gm_admin session implies hotel exists. If hotel was
      // suspended/deleted between login and this call, surface as 404.
      throw new NotFoundError('Hotel', hotelId);
    }
    return settings;
  }

  async updateSettings(
    session: Session | undefined,
    scope: TenantScope | undefined,
    patch: UpdateSettingsRequestDto,
  ): Promise<HotelSettings> {
    const hotelId = this.assertGmAdminScope(session, scope);
    return this.repo.updateSettings(hotelId, patch);
  }

  /**
   * Returns the caller's hotelId; throws ForbiddenError for any role
   * other than gm_admin. super_admin gets a redirect message pointing
   * at /api/admin/hotels (Slot A T09 territory) per §4-D09 separation.
   */
  private assertGmAdminScope(
    session: Session | undefined,
    scope: TenantScope | undefined,
  ): string {
    if (session === undefined || session.role !== 'gm_admin') {
      const isSuperAdmin = session?.role === 'super_admin';
      throw new ForbiddenError(
        isSuperAdmin
          ? 'Use /api/admin/hotels for platform-level edits'
          : 'This endpoint requires gm_admin scope',
        { actualRole: session?.role ?? null },
      );
    }
    if (scope === undefined || scope.type !== 'single-hotel') {
      throw new ForbiddenError('gm_admin scope requires single-hotel context', {
        actualScope: scope?.type ?? null,
      });
    }
    return scope.hotelId;
  }
}
