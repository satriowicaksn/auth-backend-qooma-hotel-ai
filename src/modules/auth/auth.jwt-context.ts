// Shared JWT claims extractor — single source of truth for `cookie -> claims`
// translation across `auth.routes.ts` (`GET /api/auth/me`) + the
// `must-rotate-password.plugin.ts` gate. Pure function (no port; matches
// ADR-0001 anti-port-everywhere rule for in-process crypto).
//
// TODO(T11): when tenant-guard middleware lands (spec 01-auth-identity §6),
// it will populate `request.session.user` upstream and this helper becomes
// vestigial — replace consumer call sites with `req.session.user.<x>` and
// retire this file.
import { AuthError } from '@core/errors/app-errors.js';

import type { TokenIssuer } from './auth.token-issuer.js';
import type { JwtClaims } from './auth.types.js';

export function extractJwtClaims(
  tokenIssuer: TokenIssuer,
  token: string | null | undefined,
): JwtClaims {
  if (token === null || token === undefined || token === '') {
    throw new AuthError('Missing access token');
  }
  return tokenIssuer.verify(token);
}
