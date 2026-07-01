import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session } from '@shared/types/fastify-augmentation.js';

import { adminTiersRoutes } from '../admin-tiers.routes.js';
import type { AdminTiersService } from '../admin-tiers.service.js';
import type { AdminTier } from '../admin-tiers.types.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function aSuperAdminSession(): Session {
  return { userId: USER_ID, role: 'super_admin', hotelId: null, deptId: null };
}

function aTier(overrides: Partial<AdminTier> = {}): AdminTier {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'lite',
    display_name: 'Lite',
    outbound_quota_monthly: 2000,
    agent_cap: 1,
    agent_minimum: 3,
    user_cap: 2,
    department_cap: 1,
    features: {},
    is_custom: false,
    ...overrides,
  };
}

async function buildTestApp(
  tiersMock: Partial<AdminTiersService>,
  session: Session | undefined = aSuperAdminSession(),
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  fastify.decorate('services', {
    auth: {} as never,
    users: {} as never,
    hotels: {} as never,
    adminHotels: {} as never,
    adminUsers: {} as never,
    adminTiers: tiersMock as AdminTiersService,
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
  await fastify.register(adminTiersRoutes, { prefix: '/api/admin/tiers' });
  return fastify;
}

describe('GET /api/admin/tiers', () => {
  it('should return 200 with list for super_admin', async () => {
    const listTiers = jest
      .fn<AdminTiersService['listTiers']>()
      .mockResolvedValue({ tiers: [aTier(), aTier({ name: 'professional' })] });
    const app = await buildTestApp({ listTiers });

    const res = await app.inject({ method: 'GET', url: '/api/admin/tiers' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { tiers: AdminTier[] };
    expect(body.tiers).toHaveLength(2);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for non-super_admin', async () => {
    const listTiers = jest
      .fn<AdminTiersService['listTiers']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires super_admin scope'));
    const app = await buildTestApp(
      { listTiers },
      { userId: USER_ID, role: 'gm_admin', hotelId: '333', deptId: null },
    );

    const res = await app.inject({ method: 'GET', url: '/api/admin/tiers' });

    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('GET /api/admin/tiers/:name', () => {
  it('should return 200 with single tier for super_admin', async () => {
    const getTierByName = jest
      .fn<AdminTiersService['getTierByName']>()
      .mockResolvedValue(aTier({ name: 'enterprise', is_custom: true }));
    const app = await buildTestApp({ getTierByName });

    const res = await app.inject({ method: 'GET', url: '/api/admin/tiers/enterprise' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as AdminTier;
    expect(body.name).toBe('enterprise');
    expect(body.is_custom).toBe(true);
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR for non-canonical name (zod enum reject)', async () => {
    const getTierByName = jest.fn<AdminTiersService['getTierByName']>();
    const app = await buildTestApp({ getTierByName });

    const res = await app.inject({ method: 'GET', url: '/api/admin/tiers/starter' });

    expect(res.statusCode).toBe(400);
    expect(getTierByName).not.toHaveBeenCalled();
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when service surfaces missing tier row', async () => {
    const getTierByName = jest
      .fn<AdminTiersService['getTierByName']>()
      .mockRejectedValue(new NotFoundError('Tier', 'lite'));
    const app = await buildTestApp({ getTierByName });

    const res = await app.inject({ method: 'GET', url: '/api/admin/tiers/lite' });

    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
