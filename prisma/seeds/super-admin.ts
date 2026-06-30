import './load-env.js';

import { db } from '@core/prisma/prisma-client.js';

import { maskEmail } from '@shared/utils/masking.js';

import { seedSuperAdmin } from './super-admin.seed.js';

const email = process.env.SEED_SUPER_ADMIN_EMAIL;
const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

if (email === undefined || email === '' || password === undefined || password === '') {
  console.error(
    '[seed:super-admin] SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set (non-empty).',
  );
  process.exit(1);
}

try {
  const result = await seedSuperAdmin(db, {
    email,
    password,
    name: 'Super Admin',
    language: 'id',
    mustRotatePassword: false,
  });
  console.warn(
    result.created
      ? `[seed:super-admin] created super_admin ${maskEmail(result.email)}`
      : `[seed:super-admin] super_admin already exists (${maskEmail(result.email)}) — no-op`,
  );
} catch (err) {
  console.error('[seed:super-admin] failed:', err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
