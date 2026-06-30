// Barrel — public API only. UsersRepository stays internal (entrypoint
// imports it directly behind the standard wiring boundary per CLAUDE.md §4;
// downstream modules consume the service via fastify.services.users).
export { usersRoutes } from './users.routes.js';
export { UsersService } from './users.service.js';
export { UsersRepository } from './users.repository.js';
export type { SettingsUser, ManagedRole, ListUsersResult } from './users.types.js';
