import { z } from 'zod';

const ROLE_VALUES = ['super_admin', 'gm_admin', 'dept_head', 'staff'] as const;
const LANGUAGE_VALUES = ['id', 'en'] as const;

// SECURITY.md §2.4 password policy: min 12 char, 1 angka, 1 simbol.
const PASSWORD_MIN_LENGTH = 12;

export const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(PASSWORD_MIN_LENGTH),
  })
  .strict();
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const AuthUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(ROLE_VALUES),
  hotel_id: z.string().uuid().nullable(),
  dept_id: z.string().uuid().nullable(),
  language: z.enum(LANGUAGE_VALUES),
});

export const LoginResponseSchema = z.object({
  user: AuthUserResponseSchema,
  csrfToken: z.string(),
});
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

export const LogoutResponseSchema = z.object({ success: z.literal(true) });
export type LogoutResponseDto = z.infer<typeof LogoutResponseSchema>;

export const RefreshResponseSchema = LoginResponseSchema;
export type RefreshResponseDto = LoginResponseDto;
