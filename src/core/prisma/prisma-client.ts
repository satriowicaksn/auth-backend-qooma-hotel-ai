/**
 * Prisma client singleton.
 *
 * 1 service = 1 DB = 1 Prisma schema (ADR-0004).
 *
 * Cross-slot execution per PARENT §4-D05 (Slot A canonical territory;
 * Slot B execution one-off for single-dev cycle). Future amendments
 * return to Slot A.
 *
 * Q-B-02(b) inline resolution — placeholder `{}` replaced with the real
 * `PrismaClient` singleton. Lifecycle: SIGTERM/SIGINT shutdown via
 * process-level hooks (Fastify `onClose` integration deferred to a
 * future refactor when a worker process needs its own DB lifecycle).
 *
 * Usage:
 *   import { db } from '@core/prisma/prisma-client.js';
 *   const items = await db.tier.findMany();
 */

// Import from the generated `.prisma/client` path (NOT `@prisma/client`)
// for the same reason as `auth.repository.ts` + `users.repository.ts`:
// pnpm hoists `@prisma/client` to an isolated location whose default.d.ts
// is a stub with `PrismaClient` typed as `any`. The generated path carries
// the real typed constructor.
import { PrismaClient } from '.prisma/client';

import { loadConfig } from '@core/config/env.js';

const config = loadConfig();

export const db = new PrismaClient({
  datasources: { db: { url: config.DATABASE_URL } },
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

function shutdown(): void {
  // Fire-and-forget — process is exiting; awaiting would just delay SIGTERM
  // propagation. PrismaClient handles in-flight queries gracefully.
  void db.$disconnect();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
