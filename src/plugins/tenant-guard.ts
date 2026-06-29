/**
 * Tenant scope guard — Fastify `preHandler` hook.
 *
 * Cross-slot execution per PARENT §4-D01 (Slot A canonical territory;
 * Slot B execution one-off for single-dev cycle). Future amendments
 * return to Slot A.
 *
 * Reference: docs/spec/01-auth-identity.md §6 (tenant-guard pseudocode);
 * docs/spec/MVP-AUTH-FIRST.md §4.1 (critical-correctness: tenant
 * isolation must not fail-open).
 *
 * Shape: factory function (NOT a Fastify plugin via `register()`) per
 * T06 `must-rotate-password.plugin.ts` precedent — Fastify encapsulates
 * `register`-scope hooks, and the only way to break that is the
 * `fastify-plugin` npm dep, which would require PO approval. Direct
 * `addHook` on the root instance gives the same global semantic with
 * zero new deps. File lives under `src/plugins/` per PROJECT_STRUCTURE.md
 * cross-cutting convention.
 *
 * Behavior:
 *   1. Allowlist match → pass-through (public/auth endpoints — no
 *      session/tenantScope set, no JWT inspection).
 *   2. Missing access cookie → pass-through (delegate 401 to upstream
 *      `@fastify/jwt` + route handler per Amendment 1).
 *   3. Invalid/expired JWT → catch `AppError` from `extractJwtClaims`,
 *      pass-through (same 401 delegation).
 *   4. `super_admin` claim → set `req.session` + `req.tenantScope =
 *      { type: 'all-hotels' }`, pass-through (Open Item #3 (a) global
 *      bypass; spec §6 + Charter intent).
 *   5. Non-`super_admin` with `hotelId === null` → log deny audit (per
 *      Open Item #5 shape) then throw `TenantScopeViolationError`
 *      (403 TENANT_SCOPE_VIOLATION).
 *   6. Non-`super_admin` with `hotelId !== null` → set `req.session` +
 *      `req.tenantScope = { type: 'single-hotel', hotelId }`,
 *      pass-through. Row-level cross-tenant rejection is the handler's
 *      responsibility (spec §6 line 388-398 `scopedTickets` pattern;
 *      Open Item #4 (a) shallow-claim-only).
 *
 * Wiring (T07 territory — NOT here per Amendment 3):
 *   Call `registerTenantGuard(fastify, { allowlist: [...] })` AFTER
 *   `@fastify/cookie` is registered AND AFTER `fastify.tokenIssuer`
 *   decorator is set (T06's wiring in `entrypoints/api.ts`).
 *
 * TODO(T_AUX_02): refactor to canonical `FastifyPluginCallback` shape
 * wrapped with `fp()` once `fastify-plugin` install is PO-ratified.
 * Symmetric refactor with `must-rotate-password.plugin.ts`.
 */

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import { ACCESS_COOKIE_NAME } from '@modules/auth/auth.cookie-helpers.js';
import { TenantScopeViolationError } from '@modules/auth/auth.errors.js';
import { extractJwtClaims } from '@modules/auth/auth.jwt-context.js';
import type { JwtClaims } from '@modules/auth/auth.types.js';
import type { Session, TenantScope } from '@shared/types/fastify-augmentation.js';

export interface TenantGuardDeps {
  readonly allowlist: readonly string[];
}

/**
 * Register the tenant-guard gate as a `preHandler` hook on the given
 * Fastify instance. `preHandler` is the earliest hook with both
 * `req.routeOptions.url` (route matched) AND `req.cookies` (@fastify/cookie
 * has parsed); same precedent as T06.
 */
export function registerTenantGuard(fastify: FastifyInstance, deps: TenantGuardDeps): void {
  const allowlist = new Set<string>(deps.allowlist);

  fastify.addHook(
    'preHandler',
    (req: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction) => {
      if (isAllowlisted(req, allowlist)) {
        done();
        return;
      }

      const cookie = req.cookies[ACCESS_COOKIE_NAME];
      if (cookie === undefined || cookie === '') {
        // No auth context — delegate 401 to upstream `@fastify/jwt` + route
        // handler per Amendment 1. Plugin gates tenant scope only.
        done();
        return;
      }

      let claims: JwtClaims;
      try {
        claims = extractJwtClaims(fastify.tokenIssuer, cookie);
      } catch (err) {
        if (err instanceof AppError) {
          // Invalid/expired token — same 401 delegation as missing-cookie.
          done();
          return;
        }
        done(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      if (claims.role === 'super_admin') {
        req.session = sessionFromClaims(claims);
        req.tenantScope = { type: 'all-hotels' };
        done();
        return;
      }

      if (claims.hotelId === null) {
        fastify.log.warn({
          msg: 'tenant_deny',
          correlationId: req.id,
          userId: claims.sub,
          role: claims.role,
          claimHotelId: null,
          path: matchedPath(req),
          method: req.method,
        });
        done(
          new TenantScopeViolationError('Tenant scope required for non-super_admin', {
            userId: claims.sub,
          }),
        );
        return;
      }

      req.session = sessionFromClaims(claims);
      req.tenantScope = { type: 'single-hotel', hotelId: claims.hotelId } satisfies TenantScope;
      done();
    },
  );
}

function sessionFromClaims(claims: JwtClaims): Session {
  return {
    userId: claims.sub,
    role: claims.role,
    hotelId: claims.hotelId,
    deptId: claims.deptId,
  };
}

function isAllowlisted(req: FastifyRequest, allowlist: ReadonlySet<string>): boolean {
  return allowlist.has(matchedPath(req));
}

function matchedPath(req: FastifyRequest): string {
  // `routeOptions.url` is Fastify 4.28+ canonical for the matched route
  // pattern (replaces deprecated `routerPath`); fall back to URL pathname
  // for unmatched (404) paths so the gate doesn't crash before downstream
  // 404 handling.
  return req.routeOptions.url ?? req.url.split('?')[0] ?? '';
}
