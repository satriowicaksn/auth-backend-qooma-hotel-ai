// Barrel — public API only. Adapters stay internal per MODULE_TEMPLATE.md +
// ADR-0001 (services consume the port; entrypoint imports the concrete adapter
// directly behind an ESLint exception comment).
export { authRoutes } from './auth.routes.js';
export { AuthService } from './auth.service.js';
export { AuthRepository } from './auth.repository.js';
export { FastifyJwtTokenIssuer } from './auth.token-issuer.js';
export type { PasswordHasherPort } from './ports/password-hasher.port.js';
export type { TokenIssuer } from './auth.token-issuer.js';
export type { AuthUser, JwtClaims, Role, Language } from './auth.types.js';
