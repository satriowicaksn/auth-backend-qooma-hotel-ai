// Per-hotel users management module — gm_admin scope per
// docs/spec/01-auth-identity.md §1.2. Domain separation from `auth`
// module: `auth` owns identity self-service (login/me/rotate-own);
// `users` owns admin-on-others (gm_admin manages dept_head/staff for
// own hotel).

import type { Role } from '@modules/auth/auth.types.js';

/**
 * Roles a gm_admin caller may CREATE or assign via PATCH on this surface.
 * Spec §1.2 line 113 + line 134: gm_admin + super_admin EXCLUDED — those
 * require super_admin scope via `/api/admin/users` (Slot C T08).
 */
export type ManagedRole = Extract<Role, 'dept_head' | 'staff'>;

/**
 * SettingsUser per spec docs/spec/01-auth-identity.md §1.2 lines 108-119
 * VERBATIM. Snake_case field names matched for FE compatibility.
 */
export interface SettingsUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
  readonly dept_id: string | null;
  readonly is_active: boolean;
  readonly last_login_at: string | null;
  readonly language: 'id' | 'en';
  readonly must_rotate_password: boolean;
}

export interface ListUsersFilters {
  readonly role?: Role;
  readonly deptId?: string | null;
  readonly isActive?: boolean;
}

export interface Pagination {
  readonly limit: number;
  readonly offset: number;
}

export interface ListUsersResult {
  readonly users: SettingsUser[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
