// Canonical tier definitions live in `src/modules/admin/tiers/tier-catalog.ts`
// so the API entrypoint bootstrap and this manual seed share ONE source of
// truth and can never drift. Re-exported here to keep `prisma/seeds/index.ts`
// and `pnpm seed` working unchanged.
export {
  CANONICAL_TIER_NAMES as SEEDED_TIER_NAMES,
  ensureTierCatalog as seedTiers,
} from '@modules/admin/tiers/tier-catalog.js';
