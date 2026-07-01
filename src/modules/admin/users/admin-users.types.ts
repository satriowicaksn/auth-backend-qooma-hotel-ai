/**
 * Cross-slot execution per §4-D07 (Slot C canonical territory).
 *
 * Admin users domain types — per docs/spec/01-auth-identity.md §1.3
 * (Q-CONTRACT-24). Cross-hotel user CRUD surface for super_admin scope.
 *
 * Domain separation vs T07 `src/modules/users/` (per-hotel gm_admin
 * scope): this module is cross-hotel — response shape MUST include
 * `hotel_id` (nullable for super_admin per §4.4 mutual-exclusion CHECK).
 */

import type { Role } from '@modules/auth/auth.types.js';

/**
 * All 4 canonical roles per spec §1.1 (line 42). super_admin creation
 * requires hotel_id NULL; other roles require hotel_id NOT NULL
 * (mutual-exclusion enforced at zod refine + DB CHECK from T02).
 */
export const ROLE_VALUES = ['super_admin', 'gm_admin', 'dept_head', 'staff'] as const;

/**
 * AdminUser response shape per spec §1.3 — mirrors SettingsUser from
 * T07 with hotel_id EXPOSED (super_admin cross-hotel view). snake_case
 * field names match spec/FE convention.
 */
export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
  readonly hotel_id: string | null;
  readonly dept_id: string | null;
  readonly is_active: boolean;
  readonly last_login_at: string | null;
  readonly language: 'id' | 'en';
  readonly must_rotate_password: boolean;
}

export interface ListAdminUsersFilters {
  readonly hotelId?: string;
  readonly role?: Role;
}

export interface Pagination {
  readonly limit: number;
  readonly offset: number;
}

export interface ListAdminUsersResult {
  readonly users: AdminUser[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
