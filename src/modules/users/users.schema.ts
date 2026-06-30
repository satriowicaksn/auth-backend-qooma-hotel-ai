import { z } from 'zod';

const ROLE_VALUES = ['super_admin', 'gm_admin', 'dept_head', 'staff'] as const;
const MANAGED_ROLE_VALUES = ['dept_head', 'staff'] as const;
const LANGUAGE_VALUES = ['id', 'en'] as const;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

// --- request schemas ----------------------------------------------------

export const GetUsersQuerySchema = z
  .object({
    role: z.enum(ROLE_VALUES).optional(),
    dept_id: z.string().uuid().nullable().optional(),
    is_active: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional().default(DEFAULT_LIST_LIMIT),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();
export type GetUsersQueryDto = z.infer<typeof GetUsersQuerySchema>;

export const CreateUserRequestSchema = z
  .object({
    email: z.string().email().max(255),
    name: z.string().min(1).max(100),
    // Spec §1.2 line 134: gm_admin + super_admin REJECTED here — that scope
    // lives at /api/admin/users (Slot C T08).
    role: z.enum(MANAGED_ROLE_VALUES),
    dept_id: z.string().uuid().nullable().optional(),
    language: z.enum(LANGUAGE_VALUES).optional().default('id'),
  })
  .strict();
export type CreateUserRequestDto = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    // Spec §1.2 line 113 + 134: PATCH may only assign managed roles —
    // promotions to gm_admin/super_admin require Slot C surface.
    role: z.enum(MANAGED_ROLE_VALUES).optional(),
    dept_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
    language: z.enum(LANGUAGE_VALUES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateUserRequestDto = z.infer<typeof UpdateUserRequestSchema>;

// --- response schemas ---------------------------------------------------

export const SettingsUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(ROLE_VALUES),
  dept_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  last_login_at: z.string().nullable(),
  language: z.enum(LANGUAGE_VALUES),
  must_rotate_password: z.boolean(),
});

export const ListUsersResponseSchema = z.object({
  users: SettingsUserSchema.array(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type ListUsersResponseDto = z.infer<typeof ListUsersResponseSchema>;

export const CreateUserResponseSchema = z.object({
  user: SettingsUserSchema,
  generated_password: z.string(),
});
export type CreateUserResponseDto = z.infer<typeof CreateUserResponseSchema>;

export const ResetPasswordResponseSchema = CreateUserResponseSchema;
export type ResetPasswordResponseDto = CreateUserResponseDto;
