import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  CreateHotelRequestSchema,
  UpdateHotelRequestSchema,
  UpdateStatusRequestSchema,
} from './hotels.schema.js';

export const adminHotelsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/', async (req, reply) => {
    const result = await fastify.services.adminHotels.listHotels(req.session);
    return reply.code(200).send(result);
  });

  fastify.post('/', async (req, reply) => {
    const parsed = CreateHotelRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/hotels create payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminHotels.createHotel(req.session, parsed.data);
    return reply.code(201).send(result);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const result = await fastify.services.adminHotels.getHotel(req.session, req.params.id);
    return reply.code(200).send(result);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const parsed = UpdateHotelRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/hotels update payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminHotels.updateHotel(
      req.session,
      req.params.id,
      parsed.data,
    );
    return reply.code(200).send(result);
  });

  fastify.patch<{ Params: { id: string } }>('/:id/status', async (req, reply) => {
    const parsed = UpdateStatusRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/hotels status payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminHotels.setHotelStatus(
      req.session,
      req.params.id,
      parsed.data,
    );
    return reply.code(200).send(result);
  });

  // Hard-delete — platform-level (super_admin) only. The CRM UI intentionally
  // exposes only suspend/reactivate; this removes the hotel and its auth-owned
  // records permanently. 204 No Content on success.
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await fastify.services.adminHotels.deleteHotel(req.session, req.params.id);
    return reply.code(204).send();
  });

  done();
};
