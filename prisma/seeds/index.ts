import './load-env.js';

import { db } from '@core/prisma/prisma-client.js';

import { SEEDED_TIER_NAMES, seedTiers } from './tiers.js';

try {
  await seedTiers(db);
  console.warn(`[seed] tiers: ${SEEDED_TIER_NAMES.length} canonical rows upserted (idempotent)`);
} catch (err) {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
