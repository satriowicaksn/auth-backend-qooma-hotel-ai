import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  CreateUserRequestSchema,
  GetUsersQuerySchema,
  UpdateUserRequestSchema,
} from './users.schema.js';

export const usersRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/', async (req, reply) => {
    const parsed = GetUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/users query params', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.users.listUsers(req.session, parsed.data);
    return reply.code(200).send(result);
  });

  fastify.post('/', async (req, reply) => {
    const parsed = CreateUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/users create payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.users.createUser(req.session, parsed.data);
    return reply.code(201).send(result);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const parsed = UpdateUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /api/users update payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.users.updateUser(req.session, req.params.id, parsed.data);
    return reply.code(200).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/:id/reset-password', async (req, reply) => {
    const result = await fastify.services.users.resetUserPassword(req.session, req.params.id);
    return reply.code(200).send(result);
  });

  done();
};
