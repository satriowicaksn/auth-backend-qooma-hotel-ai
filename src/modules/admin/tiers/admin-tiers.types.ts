// Admin tier catalog domain types — per docs/spec/01-auth-identity.md §1.4
// (Q-CONTRACT-23). Read-only lookup surface over the 4-row tier seed
// data (T03) — no writes in MVP (spec §1.4 line 191 "PATCH ... OUT OF
// SCOPE for Phase 2.8"). Consumed by super_admin only.

export const TIER_NAMES = ['lite', 'professional', 'luxury', 'enterprise'] as const;
export type TierName = (typeof TIER_NAMES)[number];

/**
 * Tier response shape per spec §1.4 (lines 173-183). snake_case field
 * names match spec/FE convention.
 */
export interface AdminTier {
  readonly id: string;
  readonly name: TierName;
  readonly display_name: string;
  readonly outbound_quota_monthly: number;
  readonly agent_cap: number;
  readonly agent_minimum: number;
  readonly user_cap: number;
  readonly department_cap: number;
  readonly features: Record<string, boolean>;
  readonly is_custom: boolean;
}
