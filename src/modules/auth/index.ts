// Barrel — public API only. Adapters stay internal per MODULE_TEMPLATE.md +
// ADR-0001 (services consume the port; entrypoint imports the concrete adapter
// directly behind an ESLint exception comment).
export type { AuthUser, JwtClaims, Role, Language } from './auth.types.js';
