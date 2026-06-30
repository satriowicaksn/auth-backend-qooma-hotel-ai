import { z } from 'zod';

// Whitelist per docs/spec/01-auth-identity.md §1.5 line 198+205+207 —
// gm_admin can edit timezone / DND / branding ONLY. Other Hotel columns
// (name/code/tierId/status/gmContact) require super_admin scope via
// /api/admin/hotels (Slot A T09 territory). `.strict()` rejects unknown
// keys with a 400; `.refine()` rejects the empty-patch no-op.
const TIMEZONE_MAX_LENGTH = 50;

export const UpdateSettingsRequestSchema = z
  .object({
    timezone: z.string().min(1).max(TIMEZONE_MAX_LENGTH).optional(),
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
