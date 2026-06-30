import type { PrismaClient } from '.prisma/client';
import { argon2id, hash as argonHash } from 'argon2';

export interface SeedSuperAdminParams {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly language: string;
  readonly mustRotatePassword: boolean;
}

export interface SeedSuperAdminResult {
  readonly created: boolean;
  readonly email: string;
}

export async function seedSuperAdmin(
  db: PrismaClient,
  params: SeedSuperAdminParams,
): Promise<SeedSuperAdminResult> {
  const existing = await db.user.findFirst({ where: { role: 'super_admin' } });
  if (existing) {
    return { created: false, email: existing.email };
  }

  const passwordHash = await argonHash(params.password, { type: argon2id });
  await db.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: params.name,
      role: 'super_admin',
      hotelId: null,
      language: params.language,
      mustRotatePassword: params.mustRotatePassword,
    },
  });

  return { created: true, email: params.email };
}
