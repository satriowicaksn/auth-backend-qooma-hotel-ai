/**
 * Entrypoint: HTTP API server (Fastify).
 *
 * Tanggung jawab:
 * - Register Fastify plugins (cookie, jwt, cors, helmet, rate-limit, error-handler)
 * - Wire up adapter -> port -> service (manual DI per CLAUDE.md §4 + ADR-0001)
 * - Register module routes
 * - Graceful shutdown
 */

import type { PrismaClient } from '.prisma/client';
import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { createLogger, format, transports } from 'winston';

import { loadConfig, type AppConfig } from '@core/config/env.js';
import { AppError } from '@core/errors/app-errors.js';
import { db } from '@core/prisma/prisma-client.js';

// eslint-disable-next-line no-restricted-imports -- entrypoint is the wiring boundary that instantiates adapters per CLAUDE.md §4 + ADR-0001 (services consume the port).
import { Argon2Hasher } from '@modules/auth/adapters/argon2-hasher.adapter.js';
import { AuthRepository } from '@modules/auth/auth.repository.js';
import { authRoutes } from '@modules/auth/auth.routes.js';
import { AuthService } from '@modules/auth/auth.service.js';
import { FastifyJwtTokenIssuer } from '@modules/auth/auth.token-issuer.js';
import { registerMustRotatePasswordGate } from '@plugins/must-rotate-password.plugin.js';

// Side-effect: pull Fastify augmentations (fastify.services, fastify.appConfig, cookie + jwt).
import '@shared/types/fastify-augmentation.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  });

  fastify.decorate('appConfig', config);

  // TODO(slot-A): replace with src/plugins/error-handler.plugin.ts when foundation
  // ships. Inline mapping keeps auth routes returning correct status codes today.
  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    if (err.validation !== undefined) {
      void reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.validation },
      });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  await fastify.register(cookiePlugin);
  await fastify.register(jwtPlugin, {
    secret: config.JWT_ACCESS_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
    cookie: { cookieName: 'token', signed: false },
  });

  const logger = createLogger({
    level: config.LOG_LEVEL,
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
  });

  // db is the Prisma singleton from `@core/prisma/prisma-client.js`. The stub
  // currently returns a placeholder until Slot A's T02 foundation lands; cast
  // keeps wiring type-correct so auth surface compiles ahead of foundation.
  const prisma = db as unknown as PrismaClient;
  const authRepo = new AuthRepository(prisma);
  const tokenIssuer = new FastifyJwtTokenIssuer(fastify);

  const authService = new AuthService(authRepo, new Argon2Hasher(), tokenIssuer, config, logger);

  fastify.decorate('tokenIssuer', tokenIssuer);
  fastify.decorate('services', { auth: authService });

  // Register the must-rotate-password gate after JWT plugin + tokenIssuer
  // decoration, before any route registration so it applies to every
  // route via the root-instance `preHandler` hook.
  registerMustRotatePasswordGate(fastify, { repo: authRepo });

  await fastify.register(authRoutes, { prefix: '/api/auth' });

  return fastify;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
