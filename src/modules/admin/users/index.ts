// Public API barrel for the admin/users module. External consumers
// (src/entrypoints/api.ts) import from here; internal files use relative
// paths. Schemas/repo/service/routes land in subsequent commits.

export { AdminUsersRepository } from './admin-users.repository.js';
export {
  CreateAdminUserRequestSchema,
  ListAdminUsersQuerySchema,
  UpdateAdminUserRequestSchema,
} from './admin-users.schema.js';
export type {
  CreateAdminUserRequestDto,
  ListAdminUsersQueryDto,
  UpdateAdminUserRequestDto,
} from './admin-users.schema.js';
export type {
  AdminUser,
  ListAdminUsersFilters,
  ListAdminUsersResult,
  Pagination,
} from './admin-users.types.js';
export { ROLE_VALUES } from './admin-users.types.js';
