// Aggregates Fastify module augmentations across the service:
// - `@fastify/cookie` adds `request.cookies`, `reply.setCookie`/`clearCookie`
// - `@fastify/jwt` adds `fastify.jwt`, `request.jwtVerify`, `reply.jwtSign`
// - Project-local additions: `fastify.services`, `fastify.appConfig`
import '@fastify/cookie';
import '@fastify/jwt';

import type { AppConfig } from '../../core/config/env.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { TokenIssuer } from '../../modules/auth/auth.token-issuer.js';
import type { Role } from '../../modules/auth/auth.types.js';
import type { UsersService } from '../../modules/users/users.service.js';

/**
 * Claims-derived request session populated by `tenant-guard.ts` plugin per
 * spec docs/spec/01-auth-identity.md §6 (line 376). Distinct namespace from
 * `auth.types.ts SessionContext` (which carries user-agent + IP for session
 * ROW creation). Both are session-related but address different concerns.
 *
 * Optional on FastifyRequest because: (a) the plugin skips allowlisted paths
 * + paths with missing/invalid cookie (delegates 401 upstream), and (b) the
 * field is undefined until the preHandler hook completes.
 */
export interface Session {
  readonly userId: string;
  readonly role: Role;
  readonly hotelId: string | null;
  readonly deptId: string | null;
}

/**
 * Tenant scope context consumed by handler-side row-level filters per
 * spec §6 line 388-398 `scopedTickets` pattern. `super_admin` gets
 * `all-hotels` (downstream queries skip `WHERE hotel_id = ?`); everyone
 * else gets `single-hotel` with concrete `hotelId` (downstream filters by it).
 */
export type TenantScope =
  | { readonly type: 'all-hotels' }
  | { readonly type: 'single-hotel'; readonly hotelId: string };

declare module 'fastify' {
  interface FastifyInstance {
    services: AppServices;
    appConfig: AppConfig;
    tokenIssuer: TokenIssuer;
  }

  interface FastifyRequest {
    session?: Session;
    tenantScope?: TenantScope;
  }
}

export interface AppServices {
  auth: AuthService;
  users: UsersService;
}
