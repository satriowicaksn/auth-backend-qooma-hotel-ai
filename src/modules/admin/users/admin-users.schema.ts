import { z } from 'zod';

import { ROLE_VALUES } from './admin-users.types.js';

const LANGUAGE_VALUES = ['id', 'en'] as const;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

// --- request schemas ---------------------------------------------------

/**
 * GET /api/admin/users query params — spec §1.3 line 144. Optional
 * hotel_id + role filters for cross-hotel scoping. Coerced pagination
 * for query-string safety.
 */
export const ListAdminUsersQuerySchema = z
  .object({
    hotel_id: z.string().uuid().optional(),
    role: z.enum(ROLE_VALUES).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LIST_LIMIT)
      .optional()
      .default(DEFAULT_LIST_LIMIT),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();
export type ListAdminUsersQueryDto = z.infer<typeof ListAdminUsersQuerySchema>;

/**
 * POST /api/admin/users body — spec §1.3 lines 149-154. Mutual-exclusion
 * enforced via `.refine()`: `role='super_admin'` requires `hotel_id`
 * NULL/omitted; other roles require `hotel_id` NOT NULL. Zod parse
 * failure returns 400 VALIDATION_ERROR upstream in the route handler.
 * Defense-in-depth: DB CHECK constraint from T02 rejects violating rows
 * regardless of application-layer validation.
 */
export const CreateAdminUserRequestSchema = z
  .object({
    email: z.string().email().max(255),
    name: z.string().min(1).max(100),
    role: z.enum(ROLE_VALUES),
    hotel_id: z.string().uuid().nullable().optional(),
    dept_id: z.string().uuid().nullable().optional(),
    language: z.enum(LANGUAGE_VALUES).optional().default('id'),
  })
  .strict()
  .refine(mutuallyExclusiveRoleAndHotelId, {
    message:
      'role="super_admin" requires hotel_id to be null/omitted; other roles require hotel_id',
    path: ['hotel_id'],
  });
export type CreateAdminUserRequestDto = z.infer<typeof CreateAdminUserRequestSchema>;

/**
 * PATCH /api/admin/users/:id body — partial patch; email is immutable
 * per T07 precedent + spec §1.2 line 103. Mutual-exclusion re-check
 * applies whenever role OR hotel_id is present (both to allow atomic
 * promotion/demotion transitions).
 */
export const UpdateAdminUserRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    hotel_id: z.string().uuid().nullable().optional(),
    dept_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
    language: z.enum(LANGUAGE_VALUES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateAdminUserRequestDto = z.infer<typeof UpdateAdminUserRequestSchema>;

// --- refine helper -----------------------------------------------------

function mutuallyExclusiveRoleAndHotelId(data: {
  role: string;
  hotel_id?: string | null | undefined;
}): boolean {
  const hasHotelId = data.hotel_id !== null && data.hotel_id !== undefined;
  if (data.role === 'super_admin') {
    return !hasHotelId;
  }
  return hasHotelId;
}
