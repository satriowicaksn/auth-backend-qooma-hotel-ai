import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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
  LastGmAdminError,
  UniqueConstraintError,
  type UsersRepository,
} from '../users.repository.js';
import { UsersService } from '../users.service.js';
import type { SettingsUser } from '../users.types.js';

const HOTEL_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function aGmAdminSession(overrides: Partial<Session> = {}): Session {
  return {
    userId: USER_ID,
    role: 'gm_admin',
    hotelId: HOTEL_ID,
    deptId: null,
    ...overrides,
  };
}

function aSettingsUser(overrides: Partial<SettingsUser> = {}): SettingsUser {
  return {
    id: OTHER_USER_ID,
    email: 'staff@hotel.example',
    name: 'Staff Member',
    role: 'staff',
    dept_id: null,
    is_active: true,
    last_login_at: null,
    language: 'id',
    must_rotate_password: true,
    ...overrides,
  };
}

interface Mocks {
  listByHotel: jest.Mock;
  findById: jest.Mock;
  insertUser: jest.Mock;
  updateUser: jest.Mock;
  setPassword: jest.Mock;
  countActiveGmAdmins: jest.Mock;
  revokeAllSessions: jest.Mock;
  updateUserWithLastGmGuard: jest.Mock;
  hash: jest.Mock;
  verify: jest.Mock;
  logger: Logger;
  service: UsersService;
}

function buildService(): Mocks {
  const listByHotel = jest.fn();
  const findById = jest.fn();
  const insertUser = jest.fn();
  const updateUser = jest.fn();
  const setPassword = jest.fn();
  const countActiveGmAdmins = jest.fn();
  const revokeAllSessions = jest.fn();
  const updateUserWithLastGmGuard = jest.fn();
  const hash = jest.fn();
  const verify = jest.fn();

  const repo = {
    listByHotel,
    findById,
    insertUser,
    updateUser,
    setPassword,
    countActiveGmAdmins,
    revokeAllSessions,
    updateUserWithLastGmGuard,
  } as unknown as UsersRepository;

  const hasher = { hash, verify } as unknown as PasswordHasherPort;

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const service = new UsersService(repo, hasher, logger);

  return {
    listByHotel,
    findById,
    insertUser,
    updateUser,
    setPassword,
    countActiveGmAdmins,
    revokeAllSessions,
    updateUserWithLastGmGuard,
    hash,
    verify,
    logger,
    service,
  };
}

describe('UsersService — assertGmAdminScope (super_admin reject boundary)', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it.each(['super_admin', 'dept_head', 'staff'] as const)(
    'should throw ForbiddenError when caller role is %s',
    async (role) => {
      const session = aGmAdminSession({
        role,
        hotelId: role === 'super_admin' ? null : HOTEL_ID,
      });
      await expect(m.service.listUsers(session, { limit: 50, offset: 0 })).rejects.toThrow(
        ForbiddenError,
      );
    },
  );

  it('should throw ForbiddenError when session is undefined', async () => {
    await expect(m.service.listUsers(undefined, { limit: 50, offset: 0 })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('should throw ForbiddenError when gm_admin session has null hotelId', async () => {
    const session = aGmAdminSession({ hotelId: null });
    await expect(m.service.listUsers(session, { limit: 50, offset: 0 })).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe('UsersService.listUsers', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should return tenant-scoped list when caller is gm_admin', async () => {
    m.listByHotel.mockResolvedValue({ rows: [aSettingsUser()], total: 1 });
    const result = await m.service.listUsers(aGmAdminSession(), { limit: 50, offset: 0 });
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(m.listByHotel).toHaveBeenCalledWith(HOTEL_ID, {}, { limit: 50, offset: 0 });
  });

  it('should pass filters through to the repository', async () => {
    m.listByHotel.mockResolvedValue({ rows: [], total: 0 });
    await m.service.listUsers(aGmAdminSession(), {
      role: 'staff',
      dept_id: 'd-1',
      is_active: true,
      limit: 25,
      offset: 50,
    });
    expect(m.listByHotel).toHaveBeenCalledWith(
      HOTEL_ID,
      { role: 'staff', deptId: 'd-1', isActive: true },
      { limit: 25, offset: 50 },
    );
  });

  it('should accept the pagination max edge (limit = 200)', async () => {
    m.listByHotel.mockResolvedValue({ rows: [], total: 0 });
    const result = await m.service.listUsers(aGmAdminSession(), { limit: 200, offset: 0 });
    expect(result.limit).toBe(200);
  });
});

describe('UsersService.createUser', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should generate a password, hash it, and persist with must_rotate_password = true', async () => {
    m.hash.mockResolvedValue('argon2hash');
    m.insertUser.mockResolvedValue(aSettingsUser());

    const result = await m.service.createUser(aGmAdminSession(), {
      email: 'new@hotel.example',
      name: 'New Member',
      role: 'staff',
      language: 'id',
    });

    expect(result.generated_password).toHaveLength(16);
    expect(m.hash).toHaveBeenCalledWith(result.generated_password);
    expect(m.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: HOTEL_ID,
        email: 'new@hotel.example',
        passwordHash: 'argon2hash',
        role: 'staff',
        language: 'id',
      }),
    );
  });

  it('should throw ConflictError when repository surfaces a unique-violation', async () => {
    m.hash.mockResolvedValue('argon2hash');
    m.insertUser.mockRejectedValue(new UniqueConstraintError('dup'));

    await expect(
      m.service.createUser(aGmAdminSession(), {
        email: 'dup@hotel.example',
        name: 'Dup',
        role: 'staff',
        language: 'id',
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('UsersService.updateUser', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should patch allowed fields without invoking the last-gm guard for non-gm_admin targets', async () => {
    m.findById.mockResolvedValue(aSettingsUser({ role: 'staff' }));
    m.updateUser.mockResolvedValue(aSettingsUser({ role: 'staff', name: 'Renamed' }));

    const result = await m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, {
      name: 'Renamed',
    });

    expect(result.user.name).toBe('Renamed');
    expect(m.updateUser).toHaveBeenCalledWith(HOTEL_ID, OTHER_USER_ID, { name: 'Renamed' });
    expect(m.updateUserWithLastGmGuard).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when target user does not exist for this hotel', async () => {
    m.findById.mockResolvedValue(null);
    await expect(
      m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, { name: 'X' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should invoke the last-gm tx wrap when demoting a current gm_admin target', async () => {
    m.findById.mockResolvedValue(aSettingsUser({ role: 'gm_admin' }));
    m.updateUserWithLastGmGuard.mockResolvedValue(aSettingsUser({ role: 'staff' }));

    await m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, { role: 'staff' });

    expect(m.updateUserWithLastGmGuard).toHaveBeenCalledWith(HOTEL_ID, OTHER_USER_ID, {
      role: 'staff',
    });
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it('should map LastGmAdminError to BusinessRuleError with LAST_GM_ADMIN_PROTECTED discriminator', async () => {
    m.findById.mockResolvedValue(aSettingsUser({ role: 'gm_admin' }));
    m.updateUserWithLastGmGuard.mockRejectedValue(new LastGmAdminError('last gm'));

    let thrown: unknown;
    try {
      await m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, { role: 'staff' });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(BusinessRuleError);
    const err = thrown as BusinessRuleError;
    expect(err.details).toEqual(
      expect.objectContaining({ reason: 'LAST_GM_ADMIN_PROTECTED', hotelId: HOTEL_ID }),
    );
  });

  it('should invoke the last-gm tx wrap when deactivating a current gm_admin (is_active: false)', async () => {
    m.findById.mockResolvedValue(aSettingsUser({ role: 'gm_admin' }));
    m.updateUserWithLastGmGuard.mockResolvedValue(
      aSettingsUser({ role: 'gm_admin', is_active: false }),
    );

    await m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, { is_active: false });

    expect(m.updateUserWithLastGmGuard).toHaveBeenCalledWith(HOTEL_ID, OTHER_USER_ID, {
      isActive: false,
    });
  });

  it('should not invoke the tx wrap when reactivating a previously-deactivated user', async () => {
    m.findById.mockResolvedValue(aSettingsUser({ role: 'staff', is_active: false }));
    m.updateUser.mockResolvedValue(aSettingsUser({ role: 'staff', is_active: true }));

    await m.service.updateUser(aGmAdminSession(), OTHER_USER_ID, { is_active: true });

    expect(m.updateUserWithLastGmGuard).not.toHaveBeenCalled();
    expect(m.updateUser).toHaveBeenCalled();
  });
});

describe('UsersService.resetUserPassword', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should generate a fresh password, hash + persist + revoke ALL sessions, then return cleartext', async () => {
    m.findById.mockResolvedValue(aSettingsUser());
    m.hash.mockResolvedValue('new-hash');
    m.revokeAllSessions.mockResolvedValue({ revokedCount: 3 });

    const result = await m.service.resetUserPassword(aGmAdminSession(), OTHER_USER_ID);

    expect(result.generated_password).toHaveLength(16);
    expect(m.hash).toHaveBeenCalledWith(result.generated_password);
    expect(m.setPassword).toHaveBeenCalledWith(OTHER_USER_ID, 'new-hash', true);
    expect(m.revokeAllSessions).toHaveBeenCalledWith(OTHER_USER_ID);
  });

  it('should throw NotFoundError when target user does not exist', async () => {
    m.findById.mockResolvedValue(null);
    await expect(m.service.resetUserPassword(aGmAdminSession(), OTHER_USER_ID)).rejects.toThrow(
      NotFoundError,
    );
    expect(m.setPassword).not.toHaveBeenCalled();
  });

  it('should still succeed when revokeAllSessions throws (best-effort sweep)', async () => {
    m.findById.mockResolvedValue(aSettingsUser());
    m.hash.mockResolvedValue('new-hash');
    m.revokeAllSessions.mockRejectedValue(new Error('db hiccup'));

    const result = await m.service.resetUserPassword(aGmAdminSession(), OTHER_USER_ID);

    expect(result.generated_password).toHaveLength(16);
    expect(m.setPassword).toHaveBeenCalled();
  });

  it('should reject ValidationError-leaning input early via assertGmAdminScope when caller is not gm_admin', async () => {
    await expect(
      m.service.resetUserPassword(aGmAdminSession({ role: 'staff' }), OTHER_USER_ID),
    ).rejects.toThrow(ForbiddenError);
  });

  it('should reject promoted-role inputs during create even if zod somehow lets them through (defense-in-depth)', async () => {
    // simulate a service-level guard test: cast to bypass zod typing
    const badInput = {
      email: 'admin@hotel.example',
      name: 'Sneaky',
      role: 'gm_admin' as const,
      language: 'id' as const,
    } as unknown as Parameters<UsersService['createUser']>[1];

    await expect(m.service.createUser(aGmAdminSession(), badInput)).rejects.toThrow(
      ValidationError,
    );
  });
});
