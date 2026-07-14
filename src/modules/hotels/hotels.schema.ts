import { z } from 'zod';

const TIMEZONE_MAX_LENGTH = 50;

export const UpdateSettingsRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    timezone: z.string().min(1).max(TIMEZONE_MAX_LENGTH).optional(),
    welcome_message: z.string().max(280).nullable().optional(),
    // JSONB columns — accept any object shape (spec §1.5 does not pin a
    // shape) plus null (intent: clear the column).
    branding: z.record(z.unknown()).nullable().optional(),
    dnd: z.record(z.unknown()).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateSettingsRequestDto = z.infer<typeof UpdateSettingsRequestSchema>;
