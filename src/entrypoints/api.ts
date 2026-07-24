/**
 * Entrypoint: HTTP API server (Fastify).
 *
 * Tanggung jawab:
 * - Register Fastify plugins (cookie, jwt, cors, helmet, rate-limit, error-handler)
 * - Wire up adapter -> port -> service (manual DI per CLAUDE.md §4 + ADR-0001)
 * - Register module routes
 * - Graceful shutdown
 */

import cookiePlugin from '@fastify/cookie';
import corsPlugin from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { createLogger, format, transports } from 'winston';

import { loadConfig, type AppConfig } from '@core/config/env.js';
import { AppError } from '@core/errors/app-errors.js';
import { db } from '@core/prisma/prisma-client.js';

// eslint-disable-next-line no-restricted-imports -- entrypoint is the wiring boundary that instantiates adapters per CLAUDE.md §4 + ADR-0001 (services consume the port).
import { HttpHotelBootstrapNotifier } from '@modules/admin/hotels/adapters/http-hotel-bootstrap-notifier.adapter.js';
import { AdminHotelsRepository } from '@modules/admin/hotels/hotels.repository.js';
import { adminHotelsRoutes } from '@modules/admin/hotels/hotels.routes.js';
import { AdminHotelsService } from '@modules/admin/hotels/hotels.service.js';
import { AdminTiersRepository } from '@modules/admin/tiers/admin-tiers.repository.js';
import { adminTiersRoutes } from '@modules/admin/tiers/admin-tiers.routes.js';
import { AdminTiersService } from '@modules/admin/tiers/admin-tiers.service.js';
import { AdminUsersRepository } from '@modules/admin/users/admin-users.repository.js';
import { adminUsersRoutes } from '@modules/admin/users/admin-users.routes.js';
import { AdminUsersService } from '@modules/admin/users/admin-users.service.js';
// eslint-disable-next-line no-restricted-imports -- entrypoint is the wiring boundary that instantiates adapters per CLAUDE.md §4 + ADR-0001 (services consume the port).
import { Argon2Hasher } from '@modules/auth/adapters/argon2-hasher.adapter.js';
import { AuthRepository } from '@modules/auth/auth.repository.js';
import { authRoutes } from '@modules/auth/auth.routes.js';
import { AuthService } from '@modules/auth/auth.service.js';
import { FastifyJwtTokenIssuer } from '@modules/auth/auth.token-issuer.js';
import { HotelsRepository } from '@modules/hotels/hotels.repository.js';
import { hotelSettingsRoutes, hotelsRoutes } from '@modules/hotels/hotels.routes.js';
import { HotelsService } from '@modules/hotels/hotels.service.js';
import { UsersRepository } from '@modules/users/users.repository.js';
import { usersRoutes } from '@modules/users/users.routes.js';
import { UsersService } from '@modules/users/users.service.js';
import { registerCsrfGuard } from '@plugins/csrf-guard.plugin.js';
import { registerMustRotatePasswordGate } from '@plugins/must-rotate-password.plugin.js';
import { registerTenantGuard } from '@plugins/tenant-guard.js';

// Side-effect: pull Fastify augmentations (fastify.services, fastify.appConfig, cookie + jwt).
import '@shared/types/fastify-augmentation.js';

const TENANT_GUARD_ALLOWLIST: readonly string[] = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/health',
  '/healthz',
];

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
    // Traefik ingress normalises paths to have a trailing slash before forwarding
    // to Fastify; without this flag GET /api/settings/hotel/ would 404 against
    // the /hotel route.
    ignoreTrailingSlash: true,
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

  // CORS (T82 D.2): consumes CORS_ORIGIN (never '*' with credentials:true).
  // Harmless under the dev proxy (same-origin); required for staging/prod
  // cross-origin. X-CSRF-Token must be allowed so the double-submit header
  // survives a cross-origin preflight.
  await fastify.register(corsPlugin, {
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Correlation-Id'],
  });

  // Global rate limit (T82 D.4). In-memory store — single-instance MVP. A
  // tighter per-route cap on POST /api/auth/login lives in auth.routes.ts.
  await fastify.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_GLOBAL_PER_MIN,
    timeWindow: '1 minute',
  });

  const logger = createLogger({
    level: config.LOG_LEVEL,
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
  });

  // `db` is the typed PrismaClient singleton from `@core/prisma/prisma-client.js`
  // (T02 cycle-6 Q-B-02(b) inline resolution). Repositories consume it directly.
  const authRepo = new AuthRepository(db);
  const usersRepo = new UsersRepository(db);
  const hotelsRepo = new HotelsRepository(db);
  const adminHotelsRepo = new AdminHotelsRepository(db);
  const adminUsersRepo = new AdminUsersRepository(db);
  const adminTiersRepo = new AdminTiersRepository(db);
  const tokenIssuer = new FastifyJwtTokenIssuer(fastify);
  const hasher = new Argon2Hasher();

  const authService = new AuthService(authRepo, hasher, tokenIssuer, config, logger);
  const usersService = new UsersService(usersRepo, hasher, logger);
  const hotelsService = new HotelsService(hotelsRepo);
  const hotelBootstrapNotifier = new HttpHotelBootstrapNotifier(
    {
      aiServiceBaseUrl: config.AI_SERVICE_BASE_URL,
      integrationBaseUrl: config.INTEGRATION_BASE_URL,
      coreBaseUrl: config.CORE_BASE_URL,
      authToAiHmacSecret: config.AUTH_TO_AI_HMAC_SECRET,
      internalRpcSecret: config.INTERNAL_RPC_SECRET,
    },
    logger,
  );
  const adminHotelsService = new AdminHotelsService(
    adminHotelsRepo,
    hasher,
    logger,
    hotelBootstrapNotifier,
  );
  const adminUsersService = new AdminUsersService(adminUsersRepo, hasher, logger);
  const adminTiersService = new AdminTiersService(adminTiersRepo);

  fastify.decorate('tokenIssuer', tokenIssuer);
  fastify.decorate('services', {
    auth: authService,
    users: usersService,
    hotels: hotelsService,
    adminHotels: adminHotelsService,
    adminUsers: adminUsersService,
    adminTiers: adminTiersService,
  });

  // Plugin order (PM B ACK T07 Ruling #3 — tenant-guard FIRST):
  //   1. tenant-guard — cheap claims-only filter; sets req.session +
  //      req.tenantScope on every guarded request. Short-circuits
  //      missing-hotelId requests BEFORE the must-rotate DB hit.
  //   2. must-rotate-password — DB lookup (TODO(T_AUX_02) refactor when
  //      fastify-plugin install ratified). 403s rotation-required users.
  // Both run as `preHandler`; Fastify executes registered hooks in
  // registration order. Route registration follows so the hooks apply
  // to every route registered after this point.
  registerTenantGuard(fastify, { allowlist: TENANT_GUARD_ALLOWLIST });
  registerMustRotatePasswordGate(fastify, { repo: authRepo });

  // CSRF double-submit guard (T82 D.3) — SHIPS OFF (config.CSRF_ENFORCE=false).
  // When disabled, registers no hook. Login/refresh/logout stay allowlisted so
  // the pre-session endpoints are never csrf-gated.
  registerCsrfGuard(fastify, {
    repo: authRepo,
    enabled: config.CSRF_ENFORCE,
    allowlist: TENANT_GUARD_ALLOWLIST,
  });

  fastify.get('/healthz', async () => ({ status: 'ok qooma ready' }));

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(hotelsRoutes, { prefix: '/api/hotels' });
  await fastify.register(hotelSettingsRoutes, { prefix: '/api/settings' });
  await fastify.register(adminHotelsRoutes, { prefix: '/api/admin/hotels' });
  await fastify.register(adminUsersRoutes, { prefix: '/api/admin/users' });
  await fastify.register(adminTiersRoutes, { prefix: '/api/admin/tiers' });

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
