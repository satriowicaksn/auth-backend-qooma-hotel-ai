/**
 * Cross-slot execution per §4-D07 (Slot C canonical territory).
 *
 * Admin tiers routes — 2 GET endpoints per docs/spec/01-auth-identity.md
 * §1.4 (Q-CONTRACT-23). Read-only tier catalog surface over the 4-row
 * T03 seed. Consumed by super_admin only.
 *
 * - GET /api/admin/tiers — list all 4 tier rows
 * - GET /api/admin/tiers/:name — single tier by canonical name
 *
 * super_admin scope enforced at service layer via assertSuperAdminScope
 * inline helper. Path param `name` enum-validated via
 * TierNameParamSchema — non-canonical values return 400 VALIDATION_ERROR
 * before touching the repo.
 */

import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import { TierNameParamSchema } from './admin-tiers.schema.js';

export const adminTiersRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/', async (req, reply) => {
    const result = await fastify.services.adminTiers.listTiers(req.session);
    return reply.code(200).send(result);
  });

  fastify.get<{ Params: { name: string } }>('/:name', async (req, reply) => {
    const parsed = TierNameParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new ValidationError('Invalid tier name path param', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminTiers.getTierByName(req.session, parsed.data.name);
    return reply.code(200).send(result);
  });

  done();
};
