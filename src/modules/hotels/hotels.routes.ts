/**
 * Cross-slot execution per §4-D09 (Slot C canonical territory).
 *
 * Hotels routes — two Fastify plugins sharing one HotelsService:
 *   - hotelsRoutes: GET /me (mounted under /api/hotels)
 *   - hotelSettingsRoutes: GET /hotel, PUT /hotel (mounted under /api/settings)
 *
 * Both consume the same HotelsService via fastify.services.hotels.
 * Tenant scope + session are populated upstream by tenant-guard plugin
 * (src/plugins/tenant-guard.ts) per §4-D01. Body validation uses manual
 * zod safeParse per Fastify 4 AJV-on-zod precedent (T05/T07).
 */

import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import { UpdateSettingsRequestSchema } from './hotels.schema.js';

export const hotelsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/me', async (req, reply) => {
    const result = await fastify.services.hotels.getHotelContextForSession(
      req.session,
      req.tenantScope,
    );
    return reply.code(200).send(result);
  });
  done();
};

export const hotelSettingsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/hotel', async (req, reply) => {
    const result = await fastify.services.hotels.getSettings(req.session, req.tenantScope);
    return reply.code(200).send(result);
  });

  fastify.put('/hotel', async (req, reply) => {
    const parsed = UpdateSettingsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/settings/hotel update payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.hotels.updateSettings(
      req.session,
      req.tenantScope,
      parsed.data,
    );
    return reply.code(200).send(result);
  });

  done();
};
