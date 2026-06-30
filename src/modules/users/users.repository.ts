// Import from the generated `.prisma/client` path (NOT `@prisma/client`)
// for the same reason as `auth.repository.ts`: pnpm hoists the
// `@prisma/client` package whose default.d.ts is a stub without model
// types. Direct generated-path import picks up the real shapes.
import type { Prisma, PrismaClient, User as PrismaUser } from '.prisma/client';

import type { ListUsersFilters, Pagination, SettingsUser } from './users.types.js';

export interface RevokeOthersResult {
  readonly revokedCount: number;
}

export interface InsertUserInput {
  readonly hotelId: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly deptId: string | null;
  readonly passwordHash: string;
  readonly language: 'id' | 'en';
}

export interface UpdateUserPatch {
  readonly name?: string;
  readonly role?: string;
  readonly deptId?: string | null;
  readonly isActive?: boolean;
  readonly language?: 'id' | 'en';
}

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

/**
 * Sentinel raised by `insertUser` on Prisma `P2002` unique-violation so
 * the service can map cleanly to a `ConflictError`. Service catches
 * specifically this constructor type; other Prisma errors bubble through.
 */
export class UniqueConstraintError extends Error {
  override readonly name = 'UniqueConstraintError';
}

export class UsersRepository {
  constructor(private readonly db: PrismaClient) {}

  async listByHotel(
    hotelId: string,
    filters: ListUsersFilters,
    pagination: Pagination,
  ): Promise<{ rows: SettingsUser[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      hotelId,
      ...(filters.role !== undefined && { role: filters.role }),
      ...(filters.deptId !== undefined && { deptId: filters.deptId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.db.user.count({ where }),
    ]);
    return {
      rows: rows.map(toSettingsUser),
      total,
    };
  }

  async findById(hotelId: string, userId: string): Promise<SettingsUser | null> {
    const row = await this.db.user.findFirst({ where: { id: userId, hotelId } });
    return row === null ? null : toSettingsUser(row);
  }

  async insertUser(input: InsertUserInput): Promise<SettingsUser> {
    try {
      const row = await this.db.user.create({
        data: {
          hotelId: input.hotelId,
          email: input.email,
          name: input.name,
          role: input.role,
          deptId: input.deptId,
          passwordHash: input.passwordHash,
          language: input.language,
          isActive: true,
          mustRotatePassword: true,
        },
      });
      return toSettingsUser(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new UniqueConstraintError('unique violation on (hotel_id, email)');
      }
      throw err;
    }
  }

  async updateUser(hotelId: string, userId: string, patch: UpdateUserPatch): Promise<SettingsUser> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.role !== undefined && { role: patch.role }),
        ...(patch.deptId !== undefined && { deptId: patch.deptId }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
        ...(patch.language !== undefined && { language: patch.language }),
      },
    });
    // Defense-in-depth: throw if the updated row drifts out of the
    // caller's hotel — should never happen given findById pre-check
    // by service, but the explicit check prevents tenant cross-contamination
    // if a stale userId somehow points to another hotel.
    if (row.hotelId !== hotelId) {
      throw new RepoInvariantError('updateUser produced a row outside caller hotel');
    }
    return toSettingsUser(row);
  }

  async setPassword(userId: string, passwordHash: string, mustRotate: boolean): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash, mustRotatePassword: mustRotate },
    });
  }

  async countActiveGmAdmins(hotelId: string, excludingUserId?: string): Promise<number> {
    return this.db.user.count({
      where: {
        hotelId,
        role: 'gm_admin',
        isActive: true,
        ...(excludingUserId !== undefined && { NOT: { id: excludingUserId } }),
      },
    });
  }

  /**
   * Revoke ALL active sessions for the target user (no `except` filter,
   * unlike T11's `revokeAllOtherSessions`). Used by admin-initiated
   * reset-password per Open Item #6 (admin = actor ≠ target user; full
   * re-login required everywhere).
   */
  async revokeAllSessions(userId: string): Promise<RevokeOthersResult> {
    const result = await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count };
  }

  /**
   * Atomic last-gm guard + update wrap. Service calls this when patch
   * could reduce the active gm_admin count for the hotel: read count
   * within the same transaction as the update, throw `LastGmAdminError`
   * if the operation would drop the count to 0. Prisma rolls back the
   * un-executed update on throw.
   */
  async updateUserWithLastGmGuard(
    hotelId: string,
    userId: string,
    patch: UpdateUserPatch,
  ): Promise<SettingsUser> {
    const row = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const remainingGmAdmins = await tx.user.count({
        where: {
          hotelId,
          role: 'gm_admin',
          isActive: true,
          NOT: { id: userId },
        },
      });
      if (remainingGmAdmins === 0) {
        throw new LastGmAdminError('PATCH would leave the hotel with zero active gm_admins');
      }
      return tx.user.update({
        where: { id: userId },
        data: {
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.role !== undefined && { role: patch.role }),
          ...(patch.deptId !== undefined && { deptId: patch.deptId }),
          ...(patch.isActive !== undefined && { isActive: patch.isActive }),
          ...(patch.language !== undefined && { language: patch.language }),
        },
      });
    });
    if (row.hotelId !== hotelId) {
      throw new RepoInvariantError('updateUserWithLastGmGuard produced a row outside caller hotel');
    }
    return toSettingsUser(row);
  }
}

/**
 * Repository invariant violation — should never trigger in normal flow
 * (defense-in-depth against a stale userId pointing to another hotel).
 * setErrorHandler maps unknown errors to 500 INTERNAL; that is the
 * correct semantic for a programming-bug surface.
 */
export class RepoInvariantError extends Error {
  override readonly name = 'RepoInvariantError';
}

/**
 * Sentinel for the last-gm guard tx — service catches this specific type
 * and maps to a `BusinessRuleError` with the `LAST_GM_ADMIN_PROTECTED`
 * details discriminator per ACK Ruling #2.
 */
export class LastGmAdminError extends Error {
  override readonly name = 'LastGmAdminError';
}

function isPrismaUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === PRISMA_UNIQUE_CONSTRAINT_CODE;
}

function toSettingsUser(row: PrismaUser): SettingsUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as SettingsUser['role'],
    dept_id: row.deptId,
    is_active: row.isActive,
    last_login_at: row.lastLoginAt === null ? null : row.lastLoginAt.toISOString(),
    language: row.language as 'id' | 'en',
    must_rotate_password: row.mustRotatePassword,
  };
}
