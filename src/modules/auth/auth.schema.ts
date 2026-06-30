import { z } from 'zod';

const ROLE_VALUES = ['super_admin', 'gm_admin', 'dept_head', 'staff'] as const;
const LANGUAGE_VALUES = ['id', 'en'] as const;

// SECURITY.md §2.4 password policy: min 12 char, ≥1 digit, ≥1 symbol.
const PASSWORD_MIN_LENGTH = 12;
const DIGIT_RE = /[0-9]/;
const SYMBOL_RE = /[^a-zA-Z0-9]/;

export type PasswordPolicyRule = 'min_length' | 'missing_digit' | 'missing_symbol';

export function evaluatePasswordPolicy(value: string): PasswordPolicyRule[] {
  const failed: PasswordPolicyRule[] = [];
  if (value.length < PASSWORD_MIN_LENGTH) failed.push('min_length');
  if (!DIGIT_RE.test(value)) failed.push('missing_digit');
  if (!SYMBOL_RE.test(value)) failed.push('missing_symbol');
  return failed;
}

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

// --- T06 /me family --------------------------------------------------------

export const GetMeResponseSchema = LoginResponseSchema;
export type GetMeResponseDto = LoginResponseDto;

export const PatchMeRequestSchema = z
  .object({
    language: z.enum(LANGUAGE_VALUES),
  })
  .strict();
export type PatchMeRequestDto = z.infer<typeof PatchMeRequestSchema>;

export const PatchMeResponseSchema = z.object({
  user: AuthUserResponseSchema,
});
export type PatchMeResponseDto = z.infer<typeof PatchMeResponseSchema>;

export const RotatePasswordRequestSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const failed = evaluatePasswordPolicy(data.new_password);
    for (const rule of failed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_password'],
        params: { rule },
        message: `new_password fails policy: ${rule}`,
      });
    }
  });
export type RotatePasswordRequestDto = z.infer<typeof RotatePasswordRequestSchema>;

export const PasswordChangeResponseSchema = z.object({ success: z.literal(true) });
export type PasswordChangeResponseDto = z.infer<typeof PasswordChangeResponseSchema>;
