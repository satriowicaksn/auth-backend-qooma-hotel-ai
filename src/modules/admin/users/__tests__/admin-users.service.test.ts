import { describe, expect, it, jest } from '@jest/globals';
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

import {
  type AdminUsersRepository,
  LastSuperAdminError,
  UniqueConstraintError,
} from '../admin-users.repository.js';
import { AdminUsersService } from '../admin-users.service.js';
import type { AdminUser } from '../admin-users.types.js';

const ACTOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TARGET_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const HOTEL_ID = '11111111-1111-1111-1111-111111111111';

function aSuperAdminSession(): Session {
  return { userId: ACTOR_ID, role: 'super_admin', hotelId: null, deptId: null };
}

function anAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: TARGET_ID,
    email: 'target@hotel.example',
    name: 'Target User',
    role: 'staff',
    hotel_id: HOTEL_ID,
    dept_id: null,
    is_active: true,
    last_login_at: null,
    language: 'id',
    must_rotate_password: false,
    ...overrides,
  };
}

interface RepoMock {
  readonly listUsersFiltered: jest.Mock<AdminUsersRepository['listUsersFiltered']>;
  readonly findUserById: jest.Mock<AdminUsersRepository['findUserById']>;
  readonly findSuperAdminByEmail: jest.Mock<AdminUsersRepository['findSuperAdminByEmail']>;
  readonly insertUser: jest.Mock<AdminUsersRepository['insertUser']>;
  readonly updateUser: jest.Mock<AdminUsersRepository['updateUser']>;
  readonly updateUserWithLastSuperAdminGuard: jest.Mock<
    AdminUsersRepository['updateUserWithLastSuperAdminGuard']
  >;
  readonly setPassword: jest.Mock<AdminUsersRepository['setPassword']>;
  readonly revokeAllSessions: jest.Mock<AdminUsersRepository['revokeAllSessions']>;
}

function buildDeps(): { svc: AdminUsersService; repo: RepoMock; hasher: PasswordHasherPort } {
  const repo: RepoMock = {
    listUsersFiltered: jest.fn<AdminUsersRepository['listUsersFiltered']>(),
    findUserById: jest.fn<AdminUsersRepository['findUserById']>(),
    // Default null so the super_admin email pre-check passes; tests that
    // want a collision override with .mockResolvedValueOnce(...).
    findSuperAdminByEmail: jest
      .fn<AdminUsersRepository['findSuperAdminByEmail']>()
      .mockResolvedValue(null),
    insertUser: jest.fn<AdminUsersRepository['insertUser']>(),
    updateUser: jest.fn<AdminUsersRepository['updateUser']>(),
    updateUserWithLastSuperAdminGuard: jest.fn<
      AdminUsersRepository['updateUserWithLastSuperAdminGuard']
    >(),
    setPassword: jest.fn<AdminUsersRepository['setPassword']>(),
    revokeAllSessions: jest.fn<AdminUsersRepository['revokeAllSessions']>(),
  };
  const hasher: PasswordHasherPort = {
    hash: jest.fn<PasswordHasherPort['hash']>().mockResolvedValue('argon2$stub'),
    verify: jest.fn<PasswordHasherPort['verify']>().mockResolvedValue(true),
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;
  const svc = new AdminUsersService(repo as unknown as AdminUsersRepository, hasher, logger);
  return { svc, repo, hasher };
}

// --- listUsers --------------------------------------------------------

describe('AdminUsersService.listUsers', () => {
  it('should forward query filters + pagination to repo for super_admin', async () => {
    const { svc, repo } = buildDeps();
    repo.listUsersFiltered.mockResolvedValue({
      users: [anAdminUser()],
      total: 1,
      limit: 50,
      offset: 0,
    });

    const result = await svc.listUsers(aSuperAdminSession(), {
      hotel_id: HOTEL_ID,
      role: 'gm_admin',
      limit: 50,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(repo.listUsersFiltered).toHaveBeenCalledWith(
      { hotelId: HOTEL_ID, role: 'gm_admin' },
      { limit: 50, offset: 0 },
    );
  });

  it.each([
    ['gm_admin', 'gm_admin' as const, HOTEL_ID],
    ['dept_head', 'dept_head' as const, HOTEL_ID],
    ['staff', 'staff' as const, HOTEL_ID],
  ])('should throw ForbiddenError for role="%s"', async (_label, role, hotelId) => {
    const { svc } = buildDeps();
    await expect(
      svc.listUsers(
        { userId: ACTOR_ID, role, hotelId, deptId: null },
        { limit: 50, offset: 0 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should throw ForbiddenError when session is undefined', async () => {
    const { svc } = buildDeps();
    await expect(svc.listUsers(undefined, { limit: 50, offset: 0 })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

// --- createUser -------------------------------------------------------

describe('AdminUsersService.createUser', () => {
  it('should generate password + hash + insert user + return { user, generated_password }', async () => {
    const { svc, repo, hasher } = buildDeps();
    const created = anAdminUser({ role: 'gm_admin', must_rotate_password: true });
    repo.insertUser.mockResolvedValue(created);

    const result = await svc.createUser(aSuperAdminSession(), {
      email: 'new-gm@hotel.example',
      name: 'New GM',
      role: 'gm_admin',
      hotel_id: HOTEL_ID,
      language: 'id',
    });

    expect(result.user).toEqual(created);
    expect(result.generated_password).toEqual(expect.any(String));
    expect(result.generated_password.length).toBeGreaterThanOrEqual(16);
    expect(hasher.hash).toHaveBeenCalledWith(result.generated_password);
    expect(repo.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-gm@hotel.example', role: 'gm_admin', hotelId: HOTEL_ID }),
    );
  });

  it('should PRE-CHECK super_admin email uniqueness before insert', async () => {
    const { svc, repo } = buildDeps();
    repo.findSuperAdminByEmail.mockResolvedValue(anAdminUser({ role: 'super_admin', hotel_id: null }));

    await expect(
      svc.createUser(aSuperAdminSession(), {
        email: 'existing-sa@platform.example',
        name: 'New SA',
        role: 'super_admin',
        language: 'id',
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(repo.findSuperAdminByEmail).toHaveBeenCalledWith('existing-sa@platform.example');
    expect(repo.insertUser).not.toHaveBeenCalled();
  });

  it('should NOT pre-check super_admin email uniqueness for non-super_admin roles', async () => {
    const { svc, repo } = buildDeps();
    repo.insertUser.mockResolvedValue(anAdminUser({ role: 'gm_admin' }));

    await svc.createUser(aSuperAdminSession(), {
      email: 'new-gm@hotel.example',
      name: 'GM',
      role: 'gm_admin',
      hotel_id: HOTEL_ID,
      language: 'id',
    });

    expect(repo.findSuperAdminByEmail).not.toHaveBeenCalled();
    expect(repo.insertUser).toHaveBeenCalled();
  });

  it('should normalize super_admin hotelId to null when passed', async () => {
    const { svc, repo } = buildDeps();
    repo.insertUser.mockResolvedValue(anAdminUser({ role: 'super_admin', hotel_id: null }));

    await svc.createUser(aSuperAdminSession(), {
      email: 'new-sa@platform.example',
      name: 'New SA',
      role: 'super_admin',
      language: 'id',
    });

    expect(repo.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'super_admin', hotelId: null }),
    );
  });

  it('should map repo UniqueConstraintError to ConflictError 409', async () => {
    const { svc, repo } = buildDeps();
    repo.insertUser.mockRejectedValue(new UniqueConstraintError('dup'));

    await expect(
      svc.createUser(aSuperAdminSession(), {
        email: 'dup@hotel.example',
        name: 'Person',
        role: 'staff',
        hotel_id: HOTEL_ID,
        language: 'id',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should reject non-super_admin caller', async () => {
    const { svc, repo } = buildDeps();
    await expect(
      svc.createUser(
        { userId: ACTOR_ID, role: 'gm_admin', hotelId: HOTEL_ID, deptId: null },
        {
          email: 'x@y.example',
          name: 'x',
          role: 'staff',
          hotel_id: HOTEL_ID,
          language: 'id',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.insertUser).not.toHaveBeenCalled();
  });
});

// --- updateUser -------------------------------------------------------

describe('AdminUsersService.updateUser', () => {
  it('should update happy path for non-role/is_active-touching patch', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(anAdminUser());
    repo.updateUser.mockResolvedValue(anAdminUser({ name: 'Renamed' }));

    const result = await svc.updateUser(aSuperAdminSession(), TARGET_ID, { name: 'Renamed' });

    expect(result.user.name).toBe('Renamed');
    expect(repo.updateUser).toHaveBeenCalledWith(TARGET_ID, { name: 'Renamed' });
    expect(repo.updateUserWithLastSuperAdminGuard).not.toHaveBeenCalled();
  });

  it('should route through the last-super_admin guard when demoting a super_admin role', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(
      anAdminUser({ role: 'super_admin', hotel_id: null, email: 'sa@platform.example' }),
    );
    repo.updateUserWithLastSuperAdminGuard.mockResolvedValue(
      anAdminUser({ role: 'staff', hotel_id: HOTEL_ID }),
    );

    await svc.updateUser(aSuperAdminSession(), TARGET_ID, { role: 'staff', hotel_id: HOTEL_ID });

    expect(repo.updateUserWithLastSuperAdminGuard).toHaveBeenCalled();
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('should route through the last-super_admin guard when deactivating a super_admin', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(
      anAdminUser({ role: 'super_admin', hotel_id: null, is_active: true }),
    );
    repo.updateUserWithLastSuperAdminGuard.mockResolvedValue(
      anAdminUser({ role: 'super_admin', hotel_id: null, is_active: false }),
    );

    await svc.updateUser(aSuperAdminSession(), TARGET_ID, { is_active: false });

    expect(repo.updateUserWithLastSuperAdminGuard).toHaveBeenCalledWith(
      TARGET_ID,
      expect.objectContaining({ isActive: false }),
    );
  });

  it('should map LastSuperAdminError to BusinessRuleError with reason discriminator', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(
      anAdminUser({ role: 'super_admin', hotel_id: null, is_active: true }),
    );
    repo.updateUserWithLastSuperAdminGuard.mockRejectedValue(
      new LastSuperAdminError('would drop to zero'),
    );

    let caught: unknown;
    try {
      await svc.updateUser(aSuperAdminSession(), TARGET_ID, { is_active: false });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BusinessRuleError);
    expect((caught as BusinessRuleError).details.reason).toBe('LAST_SUPER_ADMIN_PROTECTED');
  });

  it('should surface 404 when target user does not exist', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(null);

    await expect(
      svc.updateUser(aSuperAdminSession(), TARGET_ID, { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should RE-VALIDATE mutual-exclusion: promoting to super_admin with hotel_id set → 400', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(anAdminUser({ role: 'gm_admin', hotel_id: HOTEL_ID }));

    await expect(
      svc.updateUser(aSuperAdminSession(), TARGET_ID, { role: 'super_admin' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('should RE-VALIDATE mutual-exclusion: setting hotel_id=null on non-super_admin → 400', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(anAdminUser({ role: 'gm_admin', hotel_id: HOTEL_ID }));

    await expect(
      svc.updateUser(aSuperAdminSession(), TARGET_ID, { hotel_id: null }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('should pre-check super_admin email uniqueness on promotion to super_admin', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(
      anAdminUser({ role: 'gm_admin', hotel_id: HOTEL_ID, email: 'shared@x.example' }),
    );
    repo.findSuperAdminByEmail.mockResolvedValue(
      anAdminUser({ id: 'other-sa', role: 'super_admin', hotel_id: null, email: 'shared@x.example' }),
    );

    await expect(
      svc.updateUser(aSuperAdminSession(), TARGET_ID, { role: 'super_admin', hotel_id: null }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('should reject non-super_admin caller', async () => {
    const { svc, repo } = buildDeps();
    await expect(
      svc.updateUser(
        { userId: ACTOR_ID, role: 'gm_admin', hotelId: HOTEL_ID, deptId: null },
        TARGET_ID,
        { name: 'X' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.findUserById).not.toHaveBeenCalled();
  });
});

// --- resetUserPassword -----------------------------------------------

describe('AdminUsersService.resetUserPassword', () => {
  it('should generate + hash + set password + sweep sessions + return { user, generated_password }', async () => {
    const { svc, repo, hasher } = buildDeps();
    const target = anAdminUser();
    repo.findUserById.mockResolvedValue(target);
    repo.setPassword.mockResolvedValue({ ...target, must_rotate_password: true });
    repo.revokeAllSessions.mockResolvedValue({ revokedCount: 2 });

    const result = await svc.resetUserPassword(aSuperAdminSession(), TARGET_ID);

    expect(result.generated_password.length).toBeGreaterThanOrEqual(16);
    expect(hasher.hash).toHaveBeenCalledWith(result.generated_password);
    expect(repo.setPassword).toHaveBeenCalledWith(TARGET_ID, 'argon2$stub', true);
    expect(repo.revokeAllSessions).toHaveBeenCalledWith(TARGET_ID);
    expect(result.user.must_rotate_password).toBe(true);
  });

  it('should surface 404 when target user does not exist', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(null);

    await expect(svc.resetUserPassword(aSuperAdminSession(), TARGET_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should tolerate revokeAllSessions failure (best-effort log-and-continue)', async () => {
    const { svc, repo } = buildDeps();
    repo.findUserById.mockResolvedValue(anAdminUser());
    repo.setPassword.mockResolvedValue(anAdminUser({ must_rotate_password: true }));
    repo.revokeAllSessions.mockRejectedValue(new Error('DB hiccup'));

    // Should NOT throw — best-effort per T07 pattern.
    const result = await svc.resetUserPassword(aSuperAdminSession(), TARGET_ID);

    expect(result.generated_password.length).toBeGreaterThanOrEqual(16);
  });

  it('should reject non-super_admin caller', async () => {
    const { svc } = buildDeps();
    await expect(
      svc.resetUserPassword(
        { userId: ACTOR_ID, role: 'gm_admin', hotelId: HOTEL_ID, deptId: null },
        TARGET_ID,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
