/**
 * Cross-slot execution per §4-D07 (Slot C canonical territory).
 *
 * AdminUsersService — orchestrator for cross-hotel super_admin user
 * CRUD per docs/spec/01-auth-identity.md §1.3 (Q-CONTRACT-24). Owns:
 *   - 4-role write endpoints (list, create, patch, reset-password)
 *   - super_admin scope gate via inline assertSuperAdminScope
 *   - Mutual-exclusion re-check on PATCH role/hotel_id transitions
 *     (defense-in-depth beyond zod refine on POST/PATCH bodies)
 *   - Last-super_admin guard via prisma.$transaction (spec §4.6)
 *   - Platform-wide super_admin email uniqueness pre-check (spec §4.7)
 *   - Password generation + argon2 hash + must_rotate_password flag
 *   - Best-effort revokeAllSessions on reset-password
 */

import type { Logger } from 'winston';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import { BusinessRuleError } from '@modules/auth/auth.errors.js';
import type { PasswordHasherPort } from '@modules/auth/ports/password-hasher.port.js';
import type { Session } from '@shared/types/fastify-augmentation.js';
import { generatePassword } from '@shared/utils/crypto.js';
import { maskEmail } from '@shared/utils/masking.js';

import {
  type AdminUsersRepository,
  LastSuperAdminError,
  UniqueConstraintError,
  type UpdateAdminUserPatch,
} from './admin-users.repository.js';
import type {
  CreateAdminUserRequestDto,
  ListAdminUsersQueryDto,
  UpdateAdminUserRequestDto,
} from './admin-users.schema.js';
import type { AdminUser, ListAdminUsersResult } from './admin-users.types.js';

export interface CreateAdminUserResult {
  readonly user: AdminUser;
  readonly generated_password: string;
}

export type ResetPasswordResult = CreateAdminUserResult;

export interface UpdateAdminUserResult {
  readonly user: AdminUser;
}

const GENERATED_PASSWORD_LENGTH = 16;

export class AdminUsersService {
  constructor(
    private readonly repo: AdminUsersRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly logger: Logger,
  ) {}

  async listUsers(
    session: Session | undefined,
    query: ListAdminUsersQueryDto,
  ): Promise<ListAdminUsersResult> {
    this.assertSuperAdminScope(session);
    return this.repo.listUsersFiltered(
      {
        ...(query.hotel_id !== undefined && { hotelId: query.hotel_id }),
        ...(query.role !== undefined && { role: query.role }),
      },
      { limit: query.limit, offset: query.offset },
    );
  }

  async createUser(
    session: Session | undefined,
    input: CreateAdminUserRequestDto,
  ): Promise<CreateAdminUserResult> {
    this.assertSuperAdminScope(session);

    // Platform-wide super_admin email uniqueness pre-check per Open Item
    // #5 — Postgres UNIQUE(hotel_id, email) treats NULL hotel_id as
    // distinct, so we enforce this at the application layer.
    if (input.role === 'super_admin') {
      const existing = await this.repo.findSuperAdminByEmail(input.email);
      if (existing !== null) {
        throw new ConflictError('A super_admin with this email already exists', {
          email: maskEmail(input.email),
        });
      }
    }

    const generated = generatePassword(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.hasher.hash(generated);

    // hotel_id nullable per zod refine: super_admin → null, others →
    // uuid. Normalize to null for repo signature clarity.
    const hotelId = input.role === 'super_admin' ? null : (input.hotel_id ?? null);

    let user: AdminUser;
    try {
      user = await this.repo.insertUser({
        email: input.email,
        name: input.name,
        role: input.role,
        hotelId,
        deptId: input.dept_id ?? null,
        passwordHash,
        language: input.language,
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictError('Email already exists for this hotel', {
          email: maskEmail(input.email),
          hotel_id: hotelId,
        });
      }
      throw err;
    }

    this.logger.info('admin.users.created', {
      actorId: session?.userId,
      newUserId: user.id,
      role: user.role,
      hotelId: user.hotel_id,
      email: maskEmail(user.email),
    });

    return { user, generated_password: generated };
  }

  async updateUser(
    session: Session | undefined,
    userId: string,
    patch: UpdateAdminUserRequestDto,
  ): Promise<UpdateAdminUserResult> {
    this.assertSuperAdminScope(session);

    const current = await this.repo.findUserById(userId);
    if (current === null) {
      throw new NotFoundError('User', userId);
    }

    // Mutual-exclusion re-check when role or hotel_id changes — spec
    // §4.4 CHECK constraint requires (role='super_admin' AND hotel_id
    // IS NULL) OR (role<>'super_admin' AND hotel_id IS NOT NULL). We
    // compute the effective post-patch role + hotel_id and reject
    // invalid transitions at the service boundary (400) before hitting
    // the DB CHECK (which would surface as 500). Zod handled the POST
    // body; PATCH allows partial input so this recheck IS necessary.
    const nextRole = patch.role ?? current.role;
    const hotelIdInPatch = 'hotel_id' in patch;
    const nextHotelId = hotelIdInPatch ? (patch.hotel_id ?? null) : current.hotel_id;
    if (nextRole === 'super_admin' && nextHotelId !== null) {
      throw new ValidationError('role="super_admin" requires hotel_id to be null', {
        role: nextRole,
        hotel_id: nextHotelId,
      });
    }
    if (nextRole !== 'super_admin' && nextHotelId === null) {
      throw new ValidationError(`role="${nextRole}" requires hotel_id to be set`, {
        role: nextRole,
        hotel_id: nextHotelId,
      });
    }

    // Platform-wide super_admin email uniqueness re-check on promotion
    // — the pre-check applies whenever the PATCH would result in a
    // super_admin whose email is already held by another super_admin.
    // (Skip if the target is already a super_admin — implies same
    // email/id row.)
    if (nextRole === 'super_admin' && current.role !== 'super_admin') {
      const existing = await this.repo.findSuperAdminByEmail(current.email);
      if (existing !== null && existing.id !== userId) {
        throw new ConflictError('A super_admin with this email already exists', {
          email: maskEmail(current.email),
        });
      }
    }

    const repoPatch: UpdateAdminUserPatch = {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.role !== undefined && { role: patch.role }),
      ...(hotelIdInPatch && { hotelId: patch.hotel_id ?? null }),
      ...(patch.dept_id !== undefined && { deptId: patch.dept_id }),
      ...(patch.is_active !== undefined && { isActive: patch.is_active }),
      ...(patch.language !== undefined && { language: patch.language }),
    };

    // Last-super_admin guard per spec §4.6 + Open Item #3: any change
    // that would REDUCE the active super_admin count for the platform
    // triggers the tx-atomic guard path. Covers:
    //   (a) role demotion from super_admin to anything else
    //   (b) is_active: false on a current super_admin
    const wouldReduceSuperAdmins =
      current.role === 'super_admin' &&
      ((patch.role !== undefined && patch.role !== 'super_admin') ||
        patch.is_active === false);

    let updated: AdminUser;
    try {
      updated = wouldReduceSuperAdmins
        ? await this.repo.updateUserWithLastSuperAdminGuard(userId, repoPatch)
        : await this.repo.updateUser(userId, repoPatch);
    } catch (err) {
      if (err instanceof LastSuperAdminError) {
        throw new BusinessRuleError(
          'Cannot demote or deactivate the last active super_admin',
          { reason: 'LAST_SUPER_ADMIN_PROTECTED', userId },
        );
      }
      if (err instanceof UniqueConstraintError) {
        throw new ConflictError('Email would conflict with an existing user', {
          userId,
        });
      }
      throw err;
    }

    this.logger.info('admin.users.updated', {
      actorId: session?.userId,
      userId: updated.id,
      role: updated.role,
      hotelId: updated.hotel_id,
      isActive: updated.is_active,
    });

    return { user: updated };
  }

  async resetUserPassword(
    session: Session | undefined,
    userId: string,
  ): Promise<ResetPasswordResult> {
    this.assertSuperAdminScope(session);

    const user = await this.repo.findUserById(userId);
    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    const generated = generatePassword(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.hasher.hash(generated);

    const updated = await this.repo.setPassword(user.id, passwordHash, true);

    // Best-effort session sweep — T07 pattern: reset must succeed even
    // if session revocation hits a DB hiccup (bounded stale-token window
    // per JWT_ACCESS_TTL + refresh cap per D04). Log the failure but
    // don't propagate.
    try {
      const { revokedCount } = await this.repo.revokeAllSessions(user.id);
      this.logger.info('admin.users.password_reset', {
        actorId: session?.userId,
        userId: user.id,
        email: maskEmail(user.email),
        revokedSessions: revokedCount,
      });
    } catch (err) {
      this.logger.warn('admin.users.password_reset.sweep_failed', {
        actorId: session?.userId,
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }

    return { user: updated, generated_password: generated };
  }

  /**
   * Inline super_admin scope helper — mirrors T10 assertGmAdminScope
   * pattern. Deferred shared extraction (src/shared/utils/auth-scope.ts)
   * to a T_AUX task when a 4th admin module surfaces (currently only
   * admin/hotels + admin/users + admin/tiers = 3 callsites).
   */
  private assertSuperAdminScope(session: Session | undefined): void {
    if (session === undefined || session.role !== 'super_admin') {
      throw new ForbiddenError('This endpoint requires super_admin scope', {
        actualRole: session?.role ?? null,
      });
    }
  }
}
