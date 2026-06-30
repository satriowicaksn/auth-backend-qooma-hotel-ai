import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { Session } from '@shared/types/fastify-augmentation.js';

import { adminHotelsRoutes } from '../hotels.routes.js';
import type { AdminHotel } from '../hotels.types.js';

const SUPER_ADMIN: Session = { userId: 'sa-1', role: 'super_admin', hotelId: null, deptId: null };

const HOTEL: AdminHotel = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Aurora',
  code: 'ABR-001',
  tier: 'luxury',
  status: 'active',
  gm_contact: { name: 'Budi', email: 'gm@aurora.com', phone: '+628123456789' },
  created_at: '2026-01-15T08:00:00.000Z',
  agent_count: 0,
  user_count: 1,
};

const svc = {
  listHotels: jest.fn(),
  createHotel: jest.fn(),
  getHotel: jest.fn(),
  updateHotel: jest.fn(),
  setHotelStatus: jest.fn(),
};

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: 'err' } });
  });
  app.decorate('services', { adminHotels: svc } as never);
  app.addHook('preHandler', (req, _reply, done) => {
    req.session = SUPER_ADMIN;
    done();
  });
  await app.register(adminHotelsRoutes, { prefix: '/api/admin/hotels' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('adminHotels routes', () => {
  it('GET /api/admin/hotels → 200 with list envelope', async () => {
    svc.listHotels.mockResolvedValue({ data: [HOTEL], meta: { total: 1 } } as never);
    const res = await app.inject({ method: 'GET', url: '/api/admin/hotels' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ meta: { total: 1 } });
  });

  it('POST /api/admin/hotels with valid body → 201', async () => {
    svc.createHotel.mockResolvedValue({
      hotel: HOTEL,
      gm_user: {
        id: 'u1',
        email: 'gm@aurora.com',
        name: 'Budi',
        role: 'gm_admin',
        hotel_id: HOTEL.id,
        must_rotate_password: true,
      },
      generated_password: 'Xa9$kPq2!mNz7vRw',
    } as never);
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/hotels',
      payload: {
        name: 'Aurora',
        code: 'ABR-001',
        tier: 'luxury',
        gm_contact: { name: 'Budi', email: 'gm@aurora.com', phone: '+628123456789' },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toHaveProperty('generated_password');
  });

  it('POST /api/admin/hotels with invalid body → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/hotels',
      payload: { name: 'Aurora' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST rejects a non-E.164 phone → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/hotels',
      payload: {
        name: 'Aurora',
        code: 'ABR-002',
        tier: 'luxury',
        gm_contact: { name: 'Budi', email: 'gm@aurora.com', phone: '08123' },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /:id → 200', async () => {
    svc.getHotel.mockResolvedValue(HOTEL as never);
    const res = await app.inject({ method: 'GET', url: `/api/admin/hotels/${HOTEL.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: HOTEL.id });
  });

  it('PATCH /:id with valid metadata → 200', async () => {
    svc.updateHotel.mockResolvedValue({ ...HOTEL, name: 'Renamed' } as never);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/hotels/${HOTEL.id}`,
      payload: { name: 'Renamed', tier: 'professional' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: 'Renamed' });
  });

  it('PATCH /:id with empty body → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/hotels/${HOTEL.id}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /:id/status with valid status → 200', async () => {
    svc.setHotelStatus.mockResolvedValue({ ...HOTEL, status: 'suspended' } as never);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/hotels/${HOTEL.id}/status`,
      payload: { status: 'suspended' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'suspended' });
  });

  it('PATCH /:id/status with invalid status → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/hotels/${HOTEL.id}/status`,
      payload: { status: 'deleted' },
    });
    expect(res.statusCode).toBe(400);
  });
});
