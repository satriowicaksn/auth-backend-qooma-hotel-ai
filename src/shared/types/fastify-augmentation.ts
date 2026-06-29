// Aggregates Fastify module augmentations across the service:
// - `@fastify/cookie` adds `request.cookies`, `reply.setCookie`/`clearCookie`
// - `@fastify/jwt` adds `fastify.jwt`, `request.jwtVerify`, `reply.jwtSign`
// - Project-local additions: `fastify.services`, `fastify.appConfig`
import '@fastify/cookie';
import '@fastify/jwt';

import type { AppConfig } from '../../core/config/env.js';
import type { AuthService } from '../../modules/auth/auth.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    services: AppServices;
    appConfig: AppConfig;
  }
}

export interface AppServices {
  auth: AuthService;
}
