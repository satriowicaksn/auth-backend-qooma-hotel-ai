import type { Logger } from 'winston';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';
import { BusinessRuleError } from '@modules/auth/auth.errors.js';
import { generatePassword } from '@shared/utils/crypto.js';
import { maskEmail } from '@shared/utils/masking.js';
import type { Session } from '@shared/types/fastify-augmentation.js';

import type { PasswordHasherPort } from '@modules/auth/ports/password-hasher.port.js';

import type {
  CreateUserRequestDto,
  GetUsersQueryDto,
  UpdateUserRequestDto,
} from './users.schema.js';
import {
  LastGmAdminError,
  UniqueConstraintError,
  type UpdateUserPatch,
  type UsersRepository,
} from './users.repository.js';
import type { ListUsersResult, SettingsUser } from './users.types.js';

export interface CreateUserResult {
  readonly user: SettingsUser;
  readonly generated_password: string;
}

export type ResetPasswordResult = CreateUserResult;

export interface UpdateUserResult {
  readonly user: SettingsUser;
}

const GENERATED_PASSWORD_LENGTH = 16;
const PROMOTED_ROLES_REJECTED = ['gm_admin', 'super_admin'] as const;

export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly logger: Logger,
  ) {}

  async listUsers(session: Session | undefined, query: GetUsersQueryDto): Promise<ListUsersResult> {
    const hotelId = this.assertGmAdminScope(session);
    const result = await this.repo.listByHotel(
      hotelId,
      {
        ...(query.role !== undefined && { role: query.role }),
        ...(query.dept_id !== undefined && { deptId: query.dept_id }),
        ...(query.is_active !== undefined && { isActive: query.is_active }),
      },
      { limit: query.limit, offset: query.offset },
    );
    return {
      users: result.rows,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async createUser(
    session: Session | undefined,
    input: CreateUserRequestDto,
  ): Promise<CreateUserResult> {
    const hotelId = this.assertGmAdminScope(session);

    // Defense-in-depth — zod already restricts to ManagedRole, but rejecting
    // here too keeps the security invariant local to the service.
    if ((PROMOTED_ROLES_REJECTED as readonly string[]).includes(input.role)) {
      throw new ValidationError('Promoted roles must be created via /api/admin/users', {
        role: input.role,
      });
    }

    const generated = generatePassword(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.hasher.hash(generated);

    let user: SettingsUser;
    try {
      user = await this.repo.insertUser({
        hotelId,
        email: input.email,
        name: input.name,
        role: input.role,
        deptId: input.dept_id ?? null,
        passwordHash,
        language: input.language,
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictError('Email already exists for this hotel', {
          email: maskEmail(input.email),
          hotelId,
        });
      }
      throw err;
    }

    this.logger.info('users.created', {
      hotelId,
      userId: user.id,
      role: user.role,
      email: maskEmail(user.email),
    });

    return { user, generated_password: generated };
  }

  async updateUser(
    session: Session | undefined,
    userId: string,
    patch: UpdateUserRequestDto,
  ): Promise<UpdateUserResult> {
    const hotelId = this.assertGmAdminScope(session);

    const current = await this.repo.findById(hotelId, userId);
    if (current === null) {
      throw new NotFoundError('User', userId);
    }

    if (patch.role !== undefined && (PROMOTED_ROLES_REJECTED as readonly string[]).includes(patch.role)) {
      throw new ValidationError('Cannot elevate user to gm_admin or super_admin via this endpoint', {
        role: patch.role,
      });
    }

    const repoPatch: UpdateUserPatch = {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.role !== undefined && { role: patch.role }),
      ...(patch.dept_id !== undefined && { deptId: patch.dept_id }),
      ...(patch.is_active !== undefined && { isActive: patch.is_active }),
      ...(patch.language !== undefined && { language: patch.language }),
    };

    // zod whitelists `patch.role` to managed roles only ('dept_head' | 'staff'),
    // so any provided `patch.role` on a current gm_admin is a demotion by
    // construction. `is_active: false` on a current gm_admin is a deactivation.
    const wouldRemoveGmAdmin =
      current.role === 'gm_admin' &&
      (patch.role !== undefined || patch.is_active === false);

    let updated: SettingsUser;
    if (wouldRemoveGmAdmin) {
      try {
        updated = await this.repo.updateUserWithLastGmGuard(hotelId, userId, repoPatch);
      } catch (err) {
        if (err instanceof LastGmAdminError) {
          throw new BusinessRuleError(
            'Cannot demote or deactivate the last active gm_admin for this hotel',
            { reason: 'LAST_GM_ADMIN_PROTECTED', hotelId, userId },
          );
        }
        throw err;
      }
    } else {
      updated = await this.repo.updateUser(hotelId, userId, repoPatch);
    }

    this.logger.info('users.updated', {
      hotelId,
      userId: updated.id,
      role: updated.role,
      isActive: updated.is_active,
    });

    return { user: updated };
  }

  async resetUserPassword(
    session: Session | undefined,
    userId: string,
  ): Promise<ResetPasswordResult> {
    const hotelId = this.assertGmAdminScope(session);

    const user = await this.repo.findById(hotelId, userId);
    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    const generated = generatePassword(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.hasher.hash(generated);

    await this.repo.setPassword(user.id, passwordHash, true);

    try {
      const { revokedCount } = await this.repo.revokeAllSessions(user.id);
      this.logger.info('users.password_reset', {
        hotelId,
        userId: user.id,
        actorRole: session?.role,
        email: maskEmail(user.email),
        revokedSessions: revokedCount,
      });
    } catch (err) {
      // Best-effort per Open Item #6 — password rotation must succeed even
      // if the session sweep hits a DB hiccup (max 15min access TTL +
      // 30d refresh per D04 caps the stale-token window). T07 differs
      // from T11's revokeAllOtherSessions only in scope (ALL not OTHER);
      // failure semantics identical.
      this.logger.warn('users.password_reset.sweep_failed', {
        hotelId,
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }

    // Re-read the user row so the response reflects must_rotate_password=true.
    const refreshed = await this.repo.findById(hotelId, userId);
    return {
      user: refreshed ?? user,
      generated_password: generated,
    };
  }

  /**
   * Returns the caller's hotelId; throws ForbiddenError otherwise.
   *
   * `super_admin` is explicitly rejected per ACK aux boundary: this surface
   * is gm_admin-scope only (spec §1.2 line 100). `super_admin` admin
   * surface is `/api/admin/users` (Slot C T08 territory). tenant-guard
   * (T11) globally bypasses super_admin; the role-gate is enforced here
   * at the handler/service boundary.
   */
  private assertGmAdminScope(session: Session | undefined): string {
    if (session === undefined || session.role !== 'gm_admin') {
      throw new ForbiddenError(
        'This endpoint is for gm_admin scope; super_admin use /api/admin/users instead',
        { actualRole: session?.role ?? null },
      );
    }
    if (session.hotelId === null) {
      // gm_admin without hotelId violates the User CHECK constraint per
      // schema (mutual-exclusion). Should never happen — defense.
      throw new ForbiddenError('gm_admin session missing hotelId claim', {
        actualRole: session.role,
      });
    }
    return session.hotelId;
  }
}
