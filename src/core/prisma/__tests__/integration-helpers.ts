// Shared fixture helpers for integration tests (cycle-7 T02-sub-1).
//
// Pattern reference: `src/core/prisma/__tests__/prisma-client.smoke.test.ts`
// (cycle-6 T02 smoke). Each consumer file imports `db` (the real PrismaClient
// singleton at `@core/prisma/prisma-client.js`), wraps suites with
// `beforeAll(connectPrisma)` + `afterAll(disconnectPrisma)`, and per-test
// `afterEach` cleanup via `sweepByHotel` / `sweepByTier` (or manual targeted
// deletes). Factory builders produce row inputs with UUID-suffixed natural
// keys for idempotency across re-runs.
//
// Conventions:
//   - `tiers.name` is VARCHAR(20) AND CHECK-constrained to spec 4 (`lite`/
//     `professional`/`luxury`/`enterprise`). Builder uses 'lite' as default;
//     callers can override only to another canonical value. UUID-suffixed
//     `tiers.id` (UUID PK) keeps cleanup idempotent.
//   - `hotels.code` is VARCHAR(20) — builder prefixes `HOT-` + 8-char UUID
//     suffix = 12 chars total.
//   - `users.email` is VARCHAR(255) — builder generates `test-<uuid>@<domain>`.

import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '.prisma/client';

import { db } from '../prisma-client.js';

export { db };

export async function connectPrisma(): Promise<void> {
  await db.$connect();
}

export async function disconnectPrisma(): Promise<void> {
  await db.$disconnect();
}

/**
 * Generate a short UUID-derived suffix for natural-key fixtures.
 * Default 8 chars from the start of a UUID hex; collision probability for
 * cycle-7 test volume is negligible.
 */
export function uuidSuffix(length = 8): string {
  return randomUUID().slice(0, length);
}

// --- Tier factory ----------------------------------------------------------

export interface TierFixtureInput {
  readonly id?: string;
  readonly name?: 'lite' | 'professional' | 'luxury' | 'enterprise';
  readonly displayName?: string;
  readonly outboundQuotaMonthly?: number;
  readonly agentCap?: number;
  readonly userCap?: number;
  readonly departmentCap?: number;
}

export interface TierFixture {
  readonly id: string;
  readonly name: 'lite' | 'professional' | 'luxury' | 'enterprise';
}

export async function createTestTier(overrides: TierFixtureInput = {}): Promise<TierFixture> {
  const id = overrides.id ?? randomUUID();
  const name = overrides.name ?? 'lite';
  await db.tier.create({
    data: {
      id,
      name,
      displayName: overrides.displayName ?? `Test ${name}`,
      outboundQuotaMonthly: overrides.outboundQuotaMonthly ?? 1000,
      agentCap: overrides.agentCap ?? 1,
      userCap: overrides.userCap ?? 2,
      departmentCap: overrides.departmentCap ?? 1,
    },
  });
  return { id, name };
}

// --- Hotel factory ---------------------------------------------------------

export interface HotelFixtureInput {
  readonly id?: string;
  readonly code?: string;
  readonly name?: string;
  readonly tierId: string;
}

export interface HotelFixture {
  readonly id: string;
  readonly code: string;
  readonly tierId: string;
}

export async function createTestHotel(overrides: HotelFixtureInput): Promise<HotelFixture> {
  const id = overrides.id ?? randomUUID();
  const code = overrides.code ?? `HOT-${uuidSuffix()}`;
  await db.hotel.create({
    data: {
      id,
      code,
      name: overrides.name ?? 'Test Hotel',
      tierId: overrides.tierId,
      gmContact: { name: 'GM', email: 'gm@test.example', phone: '+62000' },
    },
  });
  return { id, code, tierId: overrides.tierId };
}

// --- User factory ----------------------------------------------------------

export interface UserFixtureInput {
  readonly id?: string;
  readonly hotelId: string | null;
  readonly email?: string;
  readonly name?: string;
  readonly role?: string;
  readonly passwordHash?: string;
  readonly isActive?: boolean;
  readonly mustRotatePassword?: boolean;
  readonly language?: 'id' | 'en';
}

export interface UserFixture {
  readonly id: string;
  readonly email: string;
  readonly hotelId: string | null;
}

export async function createTestUser(overrides: UserFixtureInput): Promise<UserFixture> {
  const id = overrides.id ?? randomUUID();
  const email = overrides.email ?? `test-${uuidSuffix(10)}@example.com`;
  await db.user.create({
    data: {
      id,
      hotelId: overrides.hotelId,
      email,
      passwordHash: overrides.passwordHash ?? 'argon2$test-stub',
      name: overrides.name ?? 'Test User',
      role: overrides.role ?? 'staff',
      isActive: overrides.isActive ?? true,
      mustRotatePassword: overrides.mustRotatePassword ?? false,
      language: overrides.language ?? 'id',
    },
  });
  return { id, email, hotelId: overrides.hotelId };
}

// --- Cleanup sweeps --------------------------------------------------------

/**
 * Cascade-delete a hotel's session + user + hotel rows. Use in `afterEach`
 * to keep each integration test isolated. Best-effort — failures swallowed
 * so a single dangling row doesn't block the next test's setup.
 */
export async function sweepByHotel(hotelId: string): Promise<void> {
  await db.session.deleteMany({ where: { user: { hotelId } } }).catch(() => undefined);
  await db.passwordResetToken
    .deleteMany({ where: { user: { hotelId } } })
    .catch(() => undefined);
  await db.user.deleteMany({ where: { hotelId } }).catch(() => undefined);
  await db.hotel.deleteMany({ where: { id: hotelId } }).catch(() => undefined);
}

/**
 * Delete a tier by id. Cascades via Restrict — caller must sweep dependent
 * hotels first (use `sweepByHotel` before this).
 */
export async function sweepTier(tierId: string): Promise<void> {
  await db.tier.deleteMany({ where: { id: tierId } }).catch(() => undefined);
}

/**
 * Delete a single user by id (for super_admin users with hotelId=null that
 * `sweepByHotel` cannot reach). Cascades sessions + password-reset tokens
 * via FK ON DELETE CASCADE.
 */
export async function sweepUser(userId: string): Promise<void> {
  await db.user.deleteMany({ where: { id: userId } }).catch(() => undefined);
}

// Re-export PrismaClient type for consumers that need to type explicit
// transaction callbacks etc.
export type { PrismaClient };
