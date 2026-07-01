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

import { adminUsersRoutes } from '../admin-users.routes.js';
import type { AdminUsersService } from '../admin-users.service.js';
import type { AdminUser } from '../admin-users.types.js';

const ACTOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TARGET_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const HOTEL_ID = '11111111-1111-1111-1111-111111111111';

function aSuperAdminSession(): Session {
  return { userId: ACTOR_ID, role: 'super_admin', hotelId: null, deptId: null };
}

function aGmAdminSession(): Session {
  return { userId: ACTOR_ID, role: 'gm_admin', hotelId: HOTEL_ID, deptId: null };
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

async function buildTestApp(
  usersMock: Partial<AdminUsersService>,
  session: Session | undefined = aSuperAdminSession(),
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  fastify.decorate('services', {
    auth: {} as never,
    users: {} as never,
    hotels: {} as never,
    adminHotels: {} as never,
    adminUsers: usersMock as AdminUsersService,
    adminTiers: {} as never,
  });

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  fastify.addHook('preHandler', (req, _reply, done) => {
    req.session = session;
    done();
  });

  await fastify.register(cookiePlugin);
  await fastify.register(adminUsersRoutes, { prefix: '/api/admin/users' });
  return fastify;
}

// --- GET /api/admin/users --------------------------------------------

describe('GET /api/admin/users', () => {
  it('should return 200 with paginated list for super_admin', async () => {
    const listUsers = jest.fn<AdminUsersService['listUsers']>().mockResolvedValue({
      users: [anAdminUser()],
      total: 1,
      limit: 50,
      offset: 0,
    });
    const app = await buildTestApp({ listUsers });

    const res = await app.inject({ method: 'GET', url: '/api/admin/users' });

    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { total: number }).total).toBe(1);
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR for invalid query (limit above ceiling)', async () => {
    const listUsers = jest.fn<AdminUsersService['listUsers']>();
    const app = await buildTestApp({ listUsers });

    const res = await app.inject({ method: 'GET', url: '/api/admin/users?limit=999' });

    expect(res.statusCode).toBe(400);
    expect(listUsers).not.toHaveBeenCalled();
    await app.close();
  });

  it('should propagate 403 FORBIDDEN when service rejects non-super_admin', async () => {
    const listUsers = jest
      .fn<AdminUsersService['listUsers']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires super_admin scope'));
    const app = await buildTestApp({ listUsers }, aGmAdminSession());

    const res = await app.inject({ method: 'GET', url: '/api/admin/users' });

    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// --- POST /api/admin/users -------------------------------------------

describe('POST /api/admin/users', () => {
  it('should return 201 with { user, generated_password } for happy super_admin create', async () => {
    const createUser = jest.fn<AdminUsersService['createUser']>().mockResolvedValue({
      user: anAdminUser({ role: 'gm_admin' }),
      generated_password: 'GeneratedPw-1!',
    });
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: {
        email: 'new@hotel.example',
        name: 'New',
        role: 'gm_admin',
        hotel_id: HOTEL_ID,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { generated_password: string };
    expect(body.generated_password).toBe('GeneratedPw-1!');
    await app.close();
  });

  it('should return 400 for mutual-exclusion violation (super_admin + hotel_id)', async () => {
    const createUser = jest.fn<AdminUsersService['createUser']>();
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: {
        email: 'admin@platform.example',
        name: 'Bad SA',
        role: 'super_admin',
        hotel_id: HOTEL_ID,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
    await app.close();
  });

  it('should return 400 for non-super_admin without hotel_id', async () => {
    const createUser = jest.fn<AdminUsersService['createUser']>();
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: { email: 'gm@x.example', name: 'GM', role: 'gm_admin' },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('should propagate 409 CONFLICT from service (duplicate email)', async () => {
    const createUser = jest
      .fn<AdminUsersService['createUser']>()
      .mockRejectedValue(new ConflictError('dup', { email: 'x***@x.example' }));
    const app = await buildTestApp({ createUser });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: {
        email: 'dup@x.example',
        name: 'Dup',
        role: 'staff',
        hotel_id: HOTEL_ID,
      },
    });

    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for non-super_admin caller', async () => {
    const createUser = jest
      .fn<AdminUsersService['createUser']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires super_admin scope'));
    const app = await buildTestApp({ createUser }, aGmAdminSession());

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: {
        email: 'x@y.example',
        name: 'X',
        role: 'staff',
        hotel_id: HOTEL_ID,
      },
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// --- PATCH /api/admin/users/:id --------------------------------------

describe('PATCH /api/admin/users/:id', () => {
  it('should return 200 with updated user on happy path', async () => {
    const updateUser = jest
      .fn<AdminUsersService['updateUser']>()
      .mockResolvedValue({ user: anAdminUser({ name: 'Renamed' }) });
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${TARGET_ID}`,
      payload: { name: 'Renamed' },
    });

    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { user: { name: string } }).user.name).toBe('Renamed');
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR for empty patch', async () => {
    const updateUser = jest.fn<AdminUsersService['updateUser']>();
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${TARGET_ID}`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
    await app.close();
  });

  it('should propagate 422 BUSINESS_RULE with LAST_SUPER_ADMIN_PROTECTED reason', async () => {
    const updateUser = jest.fn<AdminUsersService['updateUser']>().mockRejectedValue(
      new BusinessRuleError('Cannot demote last super_admin', {
        reason: 'LAST_SUPER_ADMIN_PROTECTED',
        userId: TARGET_ID,
      }),
    );
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${TARGET_ID}`,
      payload: { role: 'staff', hotel_id: HOTEL_ID },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as {
      error: { code: string; details: { reason: string } };
    };
    expect(body.error.code).toBe('BUSINESS_RULE');
    expect(body.error.details.reason).toBe('LAST_SUPER_ADMIN_PROTECTED');
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when target user does not exist', async () => {
    const updateUser = jest
      .fn<AdminUsersService['updateUser']>()
      .mockRejectedValue(new NotFoundError('User', TARGET_ID));
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${TARGET_ID}`,
      payload: { name: 'X' },
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('should propagate 400 ValidationError from mutual-exclusion re-check', async () => {
    const updateUser = jest
      .fn<AdminUsersService['updateUser']>()
      .mockRejectedValue(new ValidationError('role="super_admin" requires hotel_id null'));
    const app = await buildTestApp({ updateUser });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${TARGET_ID}`,
      payload: { role: 'super_admin' },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

// --- POST /api/admin/users/:id/reset-password ------------------------

describe('POST /api/admin/users/:id/reset-password', () => {
  it('should return 200 with { user, generated_password }', async () => {
    const resetUserPassword = jest.fn<AdminUsersService['resetUserPassword']>().mockResolvedValue({
      user: anAdminUser({ must_rotate_password: true }),
      generated_password: 'Reset-Pw-1!',
    });
    const app = await buildTestApp({ resetUserPassword });

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${TARGET_ID}/reset-password`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      generated_password: string;
      user: { must_rotate_password: boolean };
    };
    expect(body.generated_password).toBe('Reset-Pw-1!');
    expect(body.user.must_rotate_password).toBe(true);
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when target user does not exist', async () => {
    const resetUserPassword = jest
      .fn<AdminUsersService['resetUserPassword']>()
      .mockRejectedValue(new NotFoundError('User', TARGET_ID));
    const app = await buildTestApp({ resetUserPassword });

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${TARGET_ID}/reset-password`,
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for non-super_admin caller', async () => {
    const resetUserPassword = jest
      .fn<AdminUsersService['resetUserPassword']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires super_admin scope'));
    const app = await buildTestApp({ resetUserPassword }, aGmAdminSession());

    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${TARGET_ID}/reset-password`,
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
