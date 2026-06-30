/**
 * Cross-slot execution per §4-D09 (Slot C canonical territory).
 *
 * Hotel context + settings domain types — per docs/spec/01-auth-identity.md
 * §1.5 + docs/spec/MVP-AUTH-FIRST.md §1 rows 8 + 10 + §5 super_admin
 * /hotels/me option (b). Owns the authenticated /hotels/me read and
 * gm_admin /settings/hotel read+write surface.
 *
 * Domain separation from `src/modules/admin/hotels` (Slot A T09 territory):
 * this module is per-hotel scope (single-hotel reads via tenant scope);
 * `admin/hotels` is platform-level CRUD (super_admin only). Both modules
 * coexist cleanly on Auth's `hotels` table.
 */

export type HotelStatus = 'active' | 'suspended';

export interface HotelTierRef {
  readonly id: string;
  readonly name: string;
}

/**
 * Response shape for GET /api/hotels/me when the caller is super_admin.
 * Spec MVP-AUTH-FIRST §5 line 92 recommended option (b) — literal nulls
 * so the FE doesn't depend on a previewed hotel context for the platform
 * admin view (FE /admin/hotels page uses /api/admin/hotels separately).
 */
export interface HotelContextSuperAdmin {
  readonly id: null;
  readonly tier: null;
}

/**
 * Response shape for GET /api/hotels/me when the caller has a concrete
 * tenant scope (gm_admin / dept_head / staff). Full hotel context per
 * ASSIGNMENT scope 1 — spec §1.5 line 197 minimum "id + tier" extended
 * to the FULL hotels.* row shape so FE can render hotel headers without
 * a second roundtrip.
 */
export interface HotelContextScoped {
  readonly id: string;
  readonly name: string;
  readonly tier: HotelTierRef;
  readonly status: HotelStatus;
  readonly timezone: string;
  readonly branding: Record<string, unknown> | null;
  readonly dnd: Record<string, unknown> | null;
}

export type HotelContext = HotelContextSuperAdmin | HotelContextScoped;

/**
 * Settings sub-shape for GET /api/settings/hotel — gm_admin per-hotel
 * read (spec §1.5 line 200). Whitelisted subset of HotelContextScoped:
 * the three direct columns on hotels.* row gm_admin is allowed to edit
 * per spec §1.5 line 198+205.
 */
export interface HotelSettings {
  readonly timezone: string;
  readonly branding: Record<string, unknown> | null;
  readonly dnd: Record<string, unknown> | null;
}

/**
 * Patch shape for PUT /api/settings/hotel — all fields optional; branding
 * and dnd accept null to clear the JSONB column. Whitelist enforced
 * upstream by zod `.strict()` in hotels.schema.ts.
 *
 * `| undefined` on each field matches the zod-inferred Dto shape under
 * `exactOptionalPropertyTypes: true` (tsconfig strict) — zod outputs
 * `field?: T | undefined` for `.optional()`, and this interface must
 * accept that shape to flow through the service → repo layer.
 */
export interface HotelSettingsPatch {
  readonly timezone?: string | undefined;
  readonly branding?: Record<string, unknown> | null | undefined;
  readonly dnd?: Record<string, unknown> | null | undefined;
}
