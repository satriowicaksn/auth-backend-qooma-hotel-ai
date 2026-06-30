import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import { BusinessRuleError } from '@modules/auth/auth.errors.js';
import type { Session } from '@shared/types/fastify-augmentation.js';

import { usersRoutes } from '../users.routes.js';
import type { UsersService } from '../users.service.js';
import type { SettingsUser } from '../users.types.js';

const HOTEL_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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

interface BuildOpts {
  readonly session?: Session;
}

async function buildTestApp(
  usersMock: Partial<UsersService>,
  opts: BuildOpts = {},
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  const session: Session | undefined = opts.session ?? {
    userId: USER_ID,
    role: 'gm_admin',
    hotelId: HOTEL_ID,
    deptId: null,
  };

  fastify.decorate('services', {
    auth: {} as never,
    users: usersMock as UsersService,
  });

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  // Inject the session decoration into every request — simulates what
  // tenant-guard would populate after T11 wiring on a guarded path.
  fastify.addHook('preHandler', (req, _reply, done) => {
    req.session = session;
    done();
  });

  await fastify.register(cookiePlugin);
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  return fastify;
}

describe('GET /api/users', () => {
  it('should return 200 with paginated list on happy path', async () => {
    const listUsers = jest.fn<UsersService['listUsers']>().mockResolvedValue({
      users: [aSettingsUser()],
      total: 1,
      limit: 50,
      offset: 0,
    });
    const app = await buildTestApp({ listUsers });

    const res = await app.inject({ method: 'GET', url: '/api/users' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { users: unknown[]; total: number };
    expect(body.users).toHaveLength(1);
    expect(body.total).toBe(1);
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR when query has invalid pagination', async () => {
    const listUsers = jest.fn<UsersService['listUsers']>();
    const app = await buildTestApp({ listUsers });

    const res = await app.inject({ method: 'GET', url: '/api/users?limit=999&offset=-1' });

    expect(res.statusCode).toBe(400);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_ERROR',
    );
    await app.close();
  });

  it('should propagate 403 FORBIDDEN when service rejects super_admin caller', async () => {
    const listUsers = jest
      .fn<UsersService['listUsers']>()
      .mockRejectedValue(new ForbiddenError('Use /api/admin/users instead'));
    const app = await buildTestApp({ listUsers });

    const res = await app.inject({ method: 'GET', url: '/api/users' });

    expect(res.statusCode).toBe(403);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    await app.close();
  });
});

describe('POST /api/users', () => {
  const validPayload = {
    email: 'new@hotel.example',
    name: 'New Staff',
    role: 'staff',
    language: 'id',
  };

  it('should return 201 with spec-shaped { user, generated_password } body', async () => {
    const createUser = jest.fn<UsersService['createUser']>().mockResolvedValue({
      user: aSettingsUser({ email: validPayload.email }),
      generated_password: 'P@ssw0rd-Random-1!',
    });
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { user: { email: string }; generated_password: string };
    expect(body.user.email).toBe(validPayload.email);
    expect(body.generated_password).toBe('P@ssw0rd-Random-1!');
    await app.close();
  });

  it('should propagate 409 CONFLICT on duplicate email', async () => {
    const createUser = jest
      .fn<UsersService['createUser']>()
      .mockRejectedValue(new ConflictError('dup', { email: 'm***@hotel.example' }));
    const app = await buildTestApp({ createUser });

    const res = await app.inject({ method: 'POST', url: '/api/users', payload: validPayload });

    expect(res.statusCode).toBe(409);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe('CONFLICT');
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR when role is gm_admin (promoted role rejected)', async () => {
    const createUser = jest.fn<UsersService['createUser']>();
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: { ...validPayload, role: 'gm_admin' },
    });

    expect(res.statusCode).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('PATCH /api/users/:id', () => {
  it('should return 200 with updated user on happy path', async () => {
    const updateUser = jest
      .fn<UsersService['updateUser']>()
      .mockResolvedValue({ user: aSettingsUser({ name: 'Renamed' }) });
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/users/${OTHER_USER_ID}`,
      payload: { name: 'Renamed' },
    });

    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { user: { name: string } }).user.name).toBe('Renamed');
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when target user does not exist', async () => {
    const updateUser = jest
      .fn<UsersService['updateUser']>()
      .mockRejectedValue(new NotFoundError('User', OTHER_USER_ID));
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/users/${OTHER_USER_ID}`,
      payload: { name: 'X' },
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('should propagate 422 BUSINESS_RULE with LAST_GM_ADMIN_PROTECTED reason', async () => {
    const updateUser = jest.fn<UsersService['updateUser']>().mockRejectedValue(
      new BusinessRuleError('Cannot demote last gm_admin', {
        reason: 'LAST_GM_ADMIN_PROTECTED',
        hotelId: HOTEL_ID,
      }),
    );
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/users/${OTHER_USER_ID}`,
      payload: { role: 'staff' },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as {
      error: { code: string; details: { reason: string } };
    };
    expect(body.error.code).toBe('BUSINESS_RULE');
    expect(body.error.details.reason).toBe('LAST_GM_ADMIN_PROTECTED');
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR when attempting to elevate via role: gm_admin', async () => {
    const updateUser = jest.fn<UsersService['updateUser']>();
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/users/${OTHER_USER_ID}`,
      payload: { role: 'gm_admin' },
    });

    expect(res.statusCode).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR when patch body is empty', async () => {
    const updateUser = jest.fn<UsersService['updateUser']>();
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/users/${OTHER_USER_ID}`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('POST /api/users/:id/reset-password', () => {
  it('should return 200 with spec-shaped { user, generated_password } body', async () => {
    const resetUserPassword = jest.fn<UsersService['resetUserPassword']>().mockResolvedValue({
      user: aSettingsUser({ must_rotate_password: true }),
      generated_password: 'Reset-Random-Pw1!',
    });
    const app = await buildTestApp({ resetUserPassword });

    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${OTHER_USER_ID}/reset-password`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { generated_password: string; user: { must_rotate_password: boolean } };
    expect(body.generated_password).toBe('Reset-Random-Pw1!');
    expect(body.user.must_rotate_password).toBe(true);
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when target user does not exist', async () => {
    const resetUserPassword = jest
      .fn<UsersService['resetUserPassword']>()
      .mockRejectedValue(new NotFoundError('User', OTHER_USER_ID));
    const app = await buildTestApp({ resetUserPassword });

    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${OTHER_USER_ID}/reset-password`,
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('handler → service session forwarding', () => {
  it('should forward the populated req.session to service.listUsers', async () => {
    const listUsers = jest
      .fn<UsersService['listUsers']>()
      .mockResolvedValue({ users: [], total: 0, limit: 50, offset: 0 });
    const app = await buildTestApp({ listUsers });

    await app.inject({ method: 'GET', url: '/api/users' });

    expect(listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'gm_admin', hotelId: HOTEL_ID }),
      expect.objectContaining({ limit: 50, offset: 0 }),
    );
    await app.close();
  });
});

// Silence unused import warning — ValidationError used by typechecker via service path.
void ValidationError;
