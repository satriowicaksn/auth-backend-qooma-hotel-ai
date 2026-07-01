/**
 * Cross-slot execution per §4-D07 (Slot C canonical territory).
 *
 * Admin users routes — 4 endpoints per docs/spec/01-auth-identity.md §1.3
 * (Q-CONTRACT-24). Cross-hotel user CRUD surface for super_admin scope.
 *
 * - GET /api/admin/users — list users across all hotels (filters)
 * - POST /api/admin/users — create user of any role in any hotel
 * - PATCH /api/admin/users/:id — update user (any hotel)
 * - POST /api/admin/users/:id/reset-password — admin-triggered reset
 *
 * super_admin role gate enforced at service-layer via
 * assertSuperAdminScope inline helper. Body/query validation via manual
 * zod safeParse per Fastify 4 AJV-on-zod precedent (T05/T07/T09/T10).
 */

import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  CreateAdminUserRequestSchema,
  ListAdminUsersQuerySchema,
  UpdateAdminUserRequestSchema,
} from './admin-users.schema.js';

export const adminUsersRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/', async (req, reply) => {
    const parsed = ListAdminUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/users query params', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminUsers.listUsers(req.session, parsed.data);
    return reply.code(200).send(result);
  });

  fastify.post('/', async (req, reply) => {
    const parsed = CreateAdminUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/users create payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminUsers.createUser(req.session, parsed.data);
    return reply.code(201).send(result);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const parsed = UpdateAdminUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/admin/users update payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.adminUsers.updateUser(
      req.session,
      req.params.id,
      parsed.data,
    );
    return reply.code(200).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/:id/reset-password', async (req, reply) => {
    const result = await fastify.services.adminUsers.resetUserPassword(req.session, req.params.id);
    return reply.code(200).send(result);
  });

  done();
};
