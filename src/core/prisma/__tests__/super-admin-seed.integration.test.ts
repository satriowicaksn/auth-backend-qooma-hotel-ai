import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { Argon2Hasher } from '@modules/auth/adapters/argon2-hasher.adapter.js';

import { seedSuperAdmin } from '../../../../prisma/seeds/super-admin.seed.js';

import { connectPrisma, db, disconnectPrisma } from './integration-helpers.js';

const EMAIL = 'founder-test@example.com';
const PASSWORD = 'S3edTest!Passw0rd';

async function cleanSuperAdmins(): Promise<void> {
  await db.user.deleteMany({ where: { role: 'super_admin' } });
}

describe('seedSuperAdmin (T04 — real Postgres at localhost:5433)', () => {
  beforeAll(async () => {
    await connectPrisma();
  });

  beforeEach(async () => {
    await cleanSuperAdmins();
  });

  afterAll(async () => {
    await cleanSuperAdmins();
    await disconnectPrisma();
  });

  it('should create one super_admin (hotelId NULL) with a login-verifiable password', async () => {
    const result = await seedSuperAdmin(db, {
      email: EMAIL,
      password: PASSWORD,
      name: 'Super Admin',
      language: 'id',
      mustRotatePassword: false,
    });
    expect(result.created).toBe(true);

    const rows = await db.user.findMany({ where: { role: 'super_admin' } });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.hotelId).toBeNull();
    expect(row?.email).toBe(EMAIL);
    expect(row?.name).toBe('Super Admin');
    expect(row?.language).toBe('id');
    expect(row?.mustRotatePassword).toBe(false);

    const hasher = new Argon2Hasher();
    expect(await hasher.verify(row?.passwordHash ?? '', PASSWORD)).toBe(true);
    expect(await hasher.verify(row?.passwordHash ?? '', 'wrong-password')).toBe(false);
  });

  it('should be idempotent — re-run is a no-op, still exactly one super_admin', async () => {
    await seedSuperAdmin(db, {
      email: EMAIL,
      password: PASSWORD,
      name: 'Super Admin',
      language: 'id',
      mustRotatePassword: false,
    });
    const second = await seedSuperAdmin(db, {
      email: 'other-founder@example.com',
      password: 'Different!Pass1',
      name: 'Other',
      language: 'en',
      mustRotatePassword: false,
    });
    expect(second.created).toBe(false);

    const count = await db.user.count({ where: { role: 'super_admin' } });
    expect(count).toBe(1);
  });
});
