// must-rotate-password gate per docs/spec/MVP-AUTH-FIRST.md §4.2.
//
// When `users.must_rotate_password = true`, every endpoint EXCEPT the allow-list
// returns `403 PASSWORD_ROTATION_REQUIRED`. The cookie is issued normally on
// login — the gate is per-request, FE catches 403 + redirects to forced-rotate
// form.
//
// Shape note: this is exposed as a setup function (NOT a Fastify plugin via
// `register()`) because Fastify encapsulates `register`-scope hooks and the
// only way to break encapsulation is `fastify-plugin` (npm), which would be a
// new dependency requiring PO approval. Direct `addHook` on the root instance
// achieves the same global-gate semantic with zero new deps. File still lives
// under `src/plugins/` per `PROJECT_STRUCTURE.md` cross-cutting convention.
//
// TODO(T11): tenant-guard middleware will populate `request.session.user`
// upstream. When it lands, replace the inline JWT-verify + repo lookup here
// with `request.session.user.mustRotatePassword`. Until then, plugin does its
// own verify + lookup (1 DB hit per gated request — acceptable for cycle-3).

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import { ACCESS_COOKIE_NAME } from '@modules/auth/auth.cookie-helpers.js';
import { PasswordRotationRequiredError } from '@modules/auth/auth.errors.js';
import { extractJwtClaims } from '@modules/auth/auth.jwt-context.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';

// Allow-list verbatim per spec §4.2. Matched against `req.routerPath` (Fastify's
// normalized route pattern) with a URL fallback for unmatched routes.
const ALLOWLIST = new Set<string>(['/api/auth/me', '/api/auth/me/password', '/api/auth/logout']);

export interface MustRotatePasswordGateDeps {
  readonly repo: AuthRepository;
}

/**
 * Register the must-rotate-password gate as a `preHandler` hook on the given
 * Fastify instance. `preHandler` is the earliest hook that has both:
 *   - `req.routerPath` populated (route matched)
 *   - `req.cookies` populated by @fastify/cookie's own `onRequest` hook
 * Call this once at app boot, after `@fastify/cookie` + `@fastify/jwt` are
 * registered and after `fastify.tokenIssuer` is decorated.
 */
export function registerMustRotatePasswordGate(
  fastify: FastifyInstance,
  deps: MustRotatePasswordGateDeps,
): void {
  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    if (isAllowlisted(req)) return;

    const cookie = req.cookies[ACCESS_COOKIE_NAME];
    if (cookie === undefined || cookie === '') {
      // No auth context to enforce against — let downstream auth handle 401
      // if the route actually requires it. Plugin only gates rotation.
      return;
    }

    let claims;
    try {
      claims = extractJwtClaims(fastify.tokenIssuer, cookie);
    } catch (err) {
      if (err instanceof AppError) {
        // Invalid/expired token — let downstream auth path produce its own
        // 401. Plugin must not surface auth errors itself.
        return;
      }
      throw err;
    }

    const user = await deps.repo.findUserById(claims.sub);
    if (user === null || !user.isActive) {
      // User vanished or got deactivated — downstream auth path handles it.
      return;
    }

    if (user.mustRotatePassword) {
      throw new PasswordRotationRequiredError('Password rotation required before further access', {
        userId: user.id,
      });
    }
  });
}

function isAllowlisted(req: FastifyRequest): boolean {
  // Use `routeOptions.url` (Fastify 4.28+) for the matched route pattern;
  // fall back to the URL's pathname for unmatched (404) paths so the gate
  // doesn't crash before downstream 404 handling.
  const matched = req.routeOptions.url;
  const path = matched ?? req.url.split('?')[0] ?? '';
  return ALLOWLIST.has(path);
}
