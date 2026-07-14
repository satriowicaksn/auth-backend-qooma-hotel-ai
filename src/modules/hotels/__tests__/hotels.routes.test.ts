import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session, TenantScope } from '@shared/types/fastify-augmentation.js';

import { hotelSettingsRoutes, hotelsRoutes } from '../hotels.routes.js';
import type { HotelsService } from '../hotels.service.js';
import type { HotelContextScoped, HotelSettings } from '../hotels.types.js';

const HOTEL_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

function aGmSession(): Session {
  return { userId: USER_ID, role: 'gm_admin', hotelId: HOTEL_ID, deptId: null };
}

function aSuperAdminSession(): Session {
  return { userId: USER_ID, role: 'super_admin', hotelId: null, deptId: null };
}

function aDeptHeadSession(): Session {
  return { userId: USER_ID, role: 'dept_head', hotelId: HOTEL_ID, deptId: null };
}

function aStaffSession(): Session {
  return { userId: USER_ID, role: 'staff', hotelId: HOTEL_ID, deptId: null };
}

function aScopedContext(): HotelContextScoped {
  return {
    id: HOTEL_ID,
    name: 'Test Hotel',
    tier: { id: 'tier-1', name: 'lite' },
    status: 'active',
    timezone: 'Asia/Jakarta',
    branding: null,
    dnd: null,
  };
}

function aSettings(overrides: Partial<HotelSettings> = {}): HotelSettings {
  return { timezone: 'Asia/Jakarta', branding: null, dnd: null, ...overrides };
}

interface BuildOpts {
  readonly session?: Session;
  readonly tenantScope?: TenantScope;
}

async function buildTestApp(
  hotelsMock: Partial<HotelsService>,
  opts: BuildOpts = {},
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  const session: Session | undefined = opts.session ?? aGmSession();
  const tenantScope: TenantScope | undefined = opts.tenantScope ?? {
    type: 'single-hotel',
    hotelId: HOTEL_ID,
  };

  fastify.decorate('services', {
    auth: {} as never,
    users: {} as never,
    hotels: hotelsMock as HotelsService,
    adminHotels: {} as never,
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
    req.tenantScope = tenantScope;
    done();
  });

  await fastify.register(cookiePlugin);
  await fastify.register(hotelsRoutes, { prefix: '/api/hotels' });
  await fastify.register(hotelSettingsRoutes, { prefix: '/api/settings' });
  return fastify;
}

// --- GET /api/hotels/me --------------------------------------------------

describe('GET /api/hotels/me', () => {
  it('should return 200 with the scoped hotel context for gm_admin', async () => {
    const getHotelContextForSession = jest
      .fn<HotelsService['getHotelContextForSession']>()
      .mockResolvedValue(aScopedContext());
    const app = await buildTestApp({ getHotelContextForSession });

    const res = await app.inject({ method: 'GET', url: '/api/hotels/me' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { id: string; tier: { name: string } };
    expect(body.id).toBe(HOTEL_ID);
    expect(body.tier.name).toBe('lite');
    await app.close();
  });

  it('should return 200 with literal {id:null, tier:null} for super_admin (option (b))', async () => {
    const getHotelContextForSession = jest
      .fn<HotelsService['getHotelContextForSession']>()
      .mockResolvedValue({ id: null, tier: null });
    const app = await buildTestApp(
      { getHotelContextForSession },
      { session: aSuperAdminSession(), tenantScope: { type: 'all-hotels' } },
    );

    const res = await app.inject({ method: 'GET', url: '/api/hotels/me' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ id: null, tier: null });
    await app.close();
  });

  it('should propagate 404 NOT_FOUND when service surfaces hotel-missing', async () => {
    const getHotelContextForSession = jest
      .fn<HotelsService['getHotelContextForSession']>()
      .mockRejectedValue(new NotFoundError('Hotel', HOTEL_ID));
    const app = await buildTestApp({ getHotelContextForSession });

    const res = await app.inject({ method: 'GET', url: '/api/hotels/me' });

    expect(res.statusCode).toBe(404);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
    await app.close();
  });

  it('should forward populated req.session + req.tenantScope to the service', async () => {
    const getHotelContextForSession = jest
      .fn<HotelsService['getHotelContextForSession']>()
      .mockResolvedValue(aScopedContext());
    const app = await buildTestApp({ getHotelContextForSession });

    await app.inject({ method: 'GET', url: '/api/hotels/me' });

    expect(getHotelContextForSession).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'gm_admin', hotelId: HOTEL_ID }),
      expect.objectContaining({ type: 'single-hotel', hotelId: HOTEL_ID }),
    );
    await app.close();
  });
});

// --- GET /api/settings/hotel ---------------------------------------------

describe('GET /api/settings/hotel', () => {
  it('should return 200 with settings for gm_admin', async () => {
    const getSettings = jest
      .fn<HotelsService['getSettings']>()
      .mockResolvedValue(aSettings({ timezone: 'Asia/Singapore' }));
    const app = await buildTestApp({ getSettings });

    const res = await app.inject({ method: 'GET', url: '/api/settings/hotel' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      timezone: 'Asia/Singapore',
      branding: null,
      dnd: null,
    });
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for dept_head (role-gate)', async () => {
    const getSettings = jest
      .fn<HotelsService['getSettings']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires gm_admin scope'));
    const app = await buildTestApp({ getSettings }, { session: aDeptHeadSession() });

    const res = await app.inject({ method: 'GET', url: '/api/settings/hotel' });

    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for staff (role-gate)', async () => {
    const getSettings = jest
      .fn<HotelsService['getSettings']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires gm_admin scope'));
    const app = await buildTestApp({ getSettings }, { session: aStaffSession() });

    const res = await app.inject({ method: 'GET', url: '/api/settings/hotel' });

    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN with /api/admin/hotels redirect message for super_admin', async () => {
    const getSettings = jest
      .fn<HotelsService['getSettings']>()
      .mockRejectedValue(new ForbiddenError('Use /api/admin/hotels for platform-level edits'));
    const app = await buildTestApp(
      { getSettings },
      { session: aSuperAdminSession(), tenantScope: { type: 'all-hotels' } },
    );

    const res = await app.inject({ method: 'GET', url: '/api/settings/hotel' });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { error: { message: string } };
    expect(body.error.message).toContain('/api/admin/hotels');
    await app.close();
  });
});

// --- PUT /api/settings/hotel ---------------------------------------------

describe('PUT /api/settings/hotel', () => {
  it('should return 200 with updated settings for gm_admin (whitelisted body)', async () => {
    const updated = aSettings({ timezone: 'Asia/Singapore' });
    const updateSettings = jest.fn<HotelsService['updateSettings']>().mockResolvedValue(updated);
    const app = await buildTestApp({ updateSettings });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { timezone: 'Asia/Singapore' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(updated);
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR for empty body (refine at-least-one rule)', async () => {
    const updateSettings = jest.fn<HotelsService['updateSettings']>();
    const app = await buildTestApp({ updateSettings });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(updateSettings).not.toHaveBeenCalled();
    await app.close();
  });

  it('should return 200 when name is provided (now a valid field)', async () => {
    const updated = aSettings({ name: 'Renamed Hotel' });
    const updateSettings = jest.fn<HotelsService['updateSettings']>().mockResolvedValue(updated);
    const app = await buildTestApp({ updateSettings });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { name: 'Renamed Hotel' },
    });

    expect(res.statusCode).toBe(200);
    expect(updateSettings).toHaveBeenCalled();
    await app.close();
  });

  it('should return 400 VALIDATION_ERROR for unknown field "tierId" (strict reject)', async () => {
    const updateSettings = jest.fn<HotelsService['updateSettings']>();
    const app = await buildTestApp({ updateSettings });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { tierId: '00000000-0000-0000-0000-000000000000' },
    });

    expect(res.statusCode).toBe(400);
    expect(updateSettings).not.toHaveBeenCalled();
    await app.close();
  });

  it('should propagate 403 FORBIDDEN with /api/admin/hotels redirect for super_admin', async () => {
    const updateSettings = jest
      .fn<HotelsService['updateSettings']>()
      .mockRejectedValue(new ForbiddenError('Use /api/admin/hotels for platform-level edits'));
    const app = await buildTestApp(
      { updateSettings },
      { session: aSuperAdminSession(), tenantScope: { type: 'all-hotels' } },
    );

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { timezone: 'Asia/Singapore' },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { error: { message: string } };
    expect(body.error.message).toContain('/api/admin/hotels');
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for dept_head (role-gate)', async () => {
    const updateSettings = jest
      .fn<HotelsService['updateSettings']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires gm_admin scope'));
    const app = await buildTestApp({ updateSettings }, { session: aDeptHeadSession() });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { timezone: 'Asia/Singapore' },
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('should propagate 403 FORBIDDEN for staff (role-gate)', async () => {
    const updateSettings = jest
      .fn<HotelsService['updateSettings']>()
      .mockRejectedValue(new ForbiddenError('This endpoint requires gm_admin scope'));
    const app = await buildTestApp({ updateSettings }, { session: aStaffSession() });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { timezone: 'Asia/Singapore' },
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('should accept branding:null body (clear semantic) and forward to service', async () => {
    const updateSettings = jest
      .fn<HotelsService['updateSettings']>()
      .mockResolvedValue(aSettings());
    const app = await buildTestApp({ updateSettings });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings/hotel',
      payload: { branding: null },
    });

    expect(res.statusCode).toBe(200);
    expect(updateSettings).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      branding: null,
    });
    await app.close();
  });
});
