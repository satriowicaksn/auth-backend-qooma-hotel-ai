// Public API barrel for the admin/tiers module. External consumers
// (src/entrypoints/api.ts) import from here; internal files use relative
// paths. Routes/service/repository/schemas land in subsequent commits.

export type { AdminTier, TierName } from './admin-tiers.types.js';
export { TIER_NAMES } from './admin-tiers.types.js';
