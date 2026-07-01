/**
 * Cross-slot execution per §4-D07 (Slot C canonical territory).
 *
 * AdminUsersRepository — Prisma-direct per CLAUDE.md §4 hexagonal disiplin
 * (no port wrap for DB). Consumed by AdminUsersService; instantiated at
 * the wiring boundary (src/entrypoints/api.ts) per ADR-0001.
 */

// Import from `.prisma/client` (NOT `@prisma/client`) — see rationale in
// auth.repository.ts + users.repository.ts (T02 cycle-6 Q-B-02(b)).
import type { Prisma, PrismaClient, User as PrismaUser } from '.prisma/client';

import type {
  AdminUser,
  ListAdminUsersFilters,
  ListAdminUsersResult,
  Pagination,
} from './admin-users.types.js';

export interface InsertAdminUserInput {
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly hotelId: string | null;
  readonly deptId: string | null;
  readonly passwordHash: string;
  readonly language: 'id' | 'en';
}

export interface UpdateAdminUserPatch {
  readonly name?: string;
  readonly role?: string;
  readonly hotelId?: string | null;
  readonly deptId?: string | null;
  readonly isActive?: boolean;
  readonly language?: 'id' | 'en';
}

export interface RevokeAllSessionsResult {
  readonly revokedCount: number;
}

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

/**
 * Sentinel raised by insertUser on Prisma `P2002` unique-violation so
 * the service can map cleanly to `ConflictError`. Mirrors T07
 * UsersRepository.UniqueConstraintError pattern.
 */
export class UniqueConstraintError extends Error {
  override readonly name = 'UniqueConstraintError';
}

/**
 * Sentinel raised inside updateUserWithLastSuperAdminGuard when the
 * atomic count check finds 0 remaining active super_admins. Service
 * catches this specific type + maps to BusinessRuleError with
 * discriminator `LAST_SUPER_ADMIN_PROTECTED`. Mirrors T07
 * LastGmAdminError pattern per PLAN Open Item #3.
 */
export class LastSuperAdminError extends Error {
  override readonly name = 'LastSuperAdminError';
}

export class AdminUsersRepository {
  constructor(private readonly db: PrismaClient) {}

  async listUsersFiltered(
    filters: ListAdminUsersFilters,
    pagination: Pagination,
  ): Promise<ListAdminUsersResult> {
    const where: Prisma.UserWhereInput = {
      ...(filters.hotelId !== undefined && { hotelId: filters.hotelId }),
      ...(filters.role !== undefined && { role: filters.role }),
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
      users: rows.map(toAdminUser),
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async findUserById(userId: string): Promise<AdminUser | null> {
    const row = await this.db.user.findUnique({ where: { id: userId } });
    return row === null ? null : toAdminUser(row);
  }

  /**
   * Handler-level pre-check for platform-wide super_admin email
   * uniqueness per Open Item #5. Postgres UNIQUE(hotel_id, email) with
   * NULL-in-UNIQUE treats each NULL as distinct — the constraint alone
   * does NOT enforce cross-super_admin email uniqueness (spec §4.7 line
   * 73 intent). This method returns any active-or-inactive super_admin
   * row matching the email so the service can 409 before insert.
   */
  async findSuperAdminByEmail(email: string): Promise<AdminUser | null> {
    const row = await this.db.user.findFirst({
      where: { email, role: 'super_admin' },
    });
    return row === null ? null : toAdminUser(row);
  }

  async insertUser(input: InsertAdminUserInput): Promise<AdminUser> {
    try {
      const row = await this.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          hotelId: input.hotelId,
          deptId: input.deptId,
          passwordHash: input.passwordHash,
          language: input.language,
          isActive: true,
          mustRotatePassword: true,
        },
      });
      return toAdminUser(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new UniqueConstraintError('unique violation on (hotel_id, email)');
      }
      throw err;
    }
  }

  async updateUser(userId: string, patch: UpdateAdminUserPatch): Promise<AdminUser> {
    try {
      const row = await this.db.user.update({
        where: { id: userId },
        data: buildUpdateData(patch),
      });
      return toAdminUser(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new UniqueConstraintError('unique violation on (hotel_id, email)');
      }
      throw err;
    }
  }

  /**
   * Atomic last-super_admin guard + update wrap per Open Item #3. Reads
   * remaining active super_admin count within the same transaction as
   * the update; throws LastSuperAdminError if the operation would drop
   * the count to 0 (Prisma rolls back the un-executed update on throw).
   *
   * Service calls this whenever a PATCH could reduce the active
   * super_admin count for the platform (role demotion from super_admin
   * OR is_active: false on a current super_admin).
   */
  async updateUserWithLastSuperAdminGuard(
    userId: string,
    patch: UpdateAdminUserPatch,
  ): Promise<AdminUser> {
    try {
      const row = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
        const remaining = await tx.user.count({
          where: {
            role: 'super_admin',
            isActive: true,
            NOT: { id: userId },
          },
        });
        if (remaining === 0) {
          throw new LastSuperAdminError(
            'PATCH would leave the platform with zero active super_admins',
          );
        }
        return tx.user.update({
          where: { id: userId },
          data: buildUpdateData(patch),
        });
      });
      return toAdminUser(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new UniqueConstraintError('unique violation on (hotel_id, email)');
      }
      throw err;
    }
  }

  async setPassword(userId: string, passwordHash: string, mustRotate: boolean): Promise<AdminUser> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: { passwordHash, mustRotatePassword: mustRotate },
    });
    return toAdminUser(row);
  }

  /**
   * Best-effort revoke of ALL active sessions for the target user.
   * Called by reset-password flow (mirror T07 revokeAllSessions). No
   * `except` filter — admin is the actor, target is a different user
   * who must re-login everywhere.
   */
  async revokeAllSessions(userId: string): Promise<RevokeAllSessionsResult> {
    const result = await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count };
  }
}

function buildUpdateData(patch: UpdateAdminUserPatch): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.hotelId !== undefined) {
    // Prisma nullable FK: pass null via `disconnect: true` or explicit
    // `null`. For scalar FK column-id updates, plain null works.
    data.hotel = patch.hotelId === null ? { disconnect: true } : { connect: { id: patch.hotelId } };
  }
  if (patch.deptId !== undefined) data.deptId = patch.deptId;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.language !== undefined) data.language = patch.language;
  return data;
}

function isPrismaUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === PRISMA_UNIQUE_CONSTRAINT_CODE;
}

function toAdminUser(row: PrismaUser): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as AdminUser['role'],
    hotel_id: row.hotelId,
    dept_id: row.deptId,
    is_active: row.isActive,
    last_login_at: row.lastLoginAt === null ? null : row.lastLoginAt.toISOString(),
    language: row.language as 'id' | 'en',
    must_rotate_password: row.mustRotatePassword,
  };
}
