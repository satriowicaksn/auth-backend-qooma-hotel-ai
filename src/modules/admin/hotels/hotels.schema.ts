import { z } from 'zod';

const TIER_VALUES = ['lite', 'professional', 'luxury', 'enterprise'] as const;
const STATUS_VALUES = ['active', 'suspended'] as const;
const E164_PHONE = /^\+[1-9]\d{1,14}$/;

const GmContactSchema = z
  .object({
    name: z.string().min(1).max(80),
    email: z.string().email().max(255),
    phone: z.string().regex(E164_PHONE, 'phone must be E.164 format, e.g. +628123456789'),
  })
  .strict();

export const CreateHotelRequestSchema = z
  .object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(20),
    tier: z.enum(TIER_VALUES),
    gm_contact: GmContactSchema,
  })
  .strict();
export type CreateHotelRequestDto = z.infer<typeof CreateHotelRequestSchema>;

export const UpdateHotelRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    tier: z.enum(TIER_VALUES).optional(),
    gm_contact: GmContactSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateHotelRequestDto = z.infer<typeof UpdateHotelRequestSchema>;

export const UpdateStatusRequestSchema = z
  .object({
    status: z.enum(STATUS_VALUES),
  })
  .strict();
export type UpdateStatusRequestDto = z.infer<typeof UpdateStatusRequestSchema>;

const GmContactResponseSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
});

export const AdminHotelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  tier: z.enum(TIER_VALUES),
  status: z.enum(STATUS_VALUES),
  gm_contact: GmContactResponseSchema,
  created_at: z.string(),
  agent_count: z.number().int().nonnegative(),
  user_count: z.number().int().nonnegative(),
});

export const ListHotelsResponseSchema = z.object({
  data: AdminHotelSchema.array(),
  meta: z.object({ total: z.number().int().nonnegative() }),
});
export type ListHotelsResponseDto = z.infer<typeof ListHotelsResponseSchema>;

export const CreateHotelResponseSchema = z.object({
  hotel: AdminHotelSchema,
  gm_user: z.object({
    id: z.string().uuid(),
    email: z.string(),
    name: z.string(),
    role: z.literal('gm_admin'),
    hotel_id: z.string().uuid(),
    must_rotate_password: z.boolean(),
  }),
  generated_password: z.string(),
});
export type CreateHotelResponseDto = z.infer<typeof CreateHotelResponseSchema>;
