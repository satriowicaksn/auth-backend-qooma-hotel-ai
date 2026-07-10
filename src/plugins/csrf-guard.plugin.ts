/**
 * CSRF double-submit guard — Fastify `preHandler` hook (T82 D.3).
 *
 * On mutating verbs (POST/PUT/PATCH/DELETE) for authenticated routes, compares
 * the `X-CSRF-Token` request header against the session's stored `csrf_token`
 * (looked up by the JWT `sid` claim) with a timing-safe compare, and throws
 * `ForbiddenError` (403) on mismatch.
 *
 * SHIPS OFF: gated behind the `CSRF_ENFORCE` env flag (default false) per
 * Q-INT-AUTH-02. When disabled, the hook is never registered — zero overhead
 * and behavior is unchanged. Enable only after the FE cold-boot csrf-seeding
 * (docs/INTEGRATION-AUTH.md §5.4) is verified on staging, else every mutation
 * 403s after a page reload.
 *
 * Shape: factory function (NOT a `register()` plugin) mirroring
 * `tenant-guard.ts` / `must-rotate-password.plugin.ts` — a direct `addHook` on
 * the root instance gives the same global gate with zero new deps.
 */

import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AppError, ForbiddenError } from '@core/errors/app-errors.js';

import { ACCESS_COOKIE_NAME } from '@modules/auth/auth.cookie-helpers.js';
import { extractJwtClaims } from '@modules/auth/auth.jwt-context.js';
import type { AuthRepository } from '@modules/auth/auth.repository.js';
import type { JwtClaims } from '@modules/auth/auth.types.js';

const MUTATING_METHODS = new Set<string>(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CsrfGuardDeps {
  readonly repo: AuthRepository;
  readonly enabled: boolean;
  readonly allowlist: readonly string[];
}

/**
 * Constant-time CSRF token compare. Tokens are fixed-length hex (32 bytes → 64
 * chars), so a length mismatch is a definite non-match; the byte compare stays
 * timing-safe for equal-length inputs (`timingSafeEqual` throws on unequal
 * lengths, hence the guard).
 */
export function csrfTokenMatches(provided: string | undefined, expected: string): boolean {
  if (provided === undefined || expected.length === 0 || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function registerCsrfGuard(fastify: FastifyInstance, deps: CsrfGuardDeps): void {
  // Ships OFF (Q-INT-AUTH-02): when disabled, register nothing.
  if (!deps.enabled) return;

  const allowlist = new Set<string>(deps.allowlist);

  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    if (!MUTATING_METHODS.has(req.method)) return;
    if (allowlist.has(matchedPath(req))) return;

    const cookie = req.cookies[ACCESS_COOKIE_NAME];
    if (cookie === undefined || cookie === '') {
      // No auth context — delegate 401 to the jwt/route layer, same as
      // tenant-guard. The csrf gate only protects authenticated mutations.
      return;
    }

    let claims: JwtClaims;
    try {
      claims = extractJwtClaims(fastify.tokenIssuer, cookie);
    } catch (err) {
      // Invalid/expired token — let the downstream auth path produce the 401.
      if (err instanceof AppError) return;
      throw err instanceof Error ? err : new Error(String(err));
    }

    const expected = await deps.repo.findCsrfTokenBySessionId(claims.sid);
    const provided = headerToken(req.headers['x-csrf-token']);
    if (expected === null || !csrfTokenMatches(provided, expected)) {
      throw new ForbiddenError('Invalid or missing CSRF token', { reason: 'csrf_mismatch' });
    }
  });
}

function headerToken(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

function matchedPath(req: FastifyRequest): string {
  // `routeOptions.url` (Fastify 4.28+) is the matched route pattern; fall back
  // to the URL pathname for unmatched (404) paths.
  return req.routeOptions.url ?? req.url.split('?')[0] ?? '';
}
