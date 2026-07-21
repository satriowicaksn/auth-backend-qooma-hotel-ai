import { z } from 'zod';

import { TIER_NAMES } from './admin-tiers.types.js';

// Path param validator for GET /api/admin/tiers/:name — enum-restricted
// to the 4 canonical tier names. Non-canonical values short-circuit at
// zod parse (400 VALIDATION_ERROR) before touching the repo.
export const TierNameParamSchema = z.object({
  name: z.enum(TIER_NAMES),
});
export type TierNameParamDto = z.infer<typeof TierNameParamSchema>;

// Response shape (declared for typechecker + future outbound validation
// if Fastify serializer is switched on). Matches AdminTier interface.
const FeaturesSchema = z.record(z.boolean());

export const AdminTierSchema = z.object({
  id: z.string().uuid(),
  name: z.enum(TIER_NAMES),
  display_name: z.string(),
  agent_cap: z.number().int(),
  user_cap: z.number().int(),
  department_cap: z.number().int(),
  features: FeaturesSchema,
  is_custom: z.boolean(),
});

export const ListTiersResponseSchema = z.object({
  tiers: AdminTierSchema.array(),
});
export type ListTiersResponseDto = z.infer<typeof ListTiersResponseSchema>;
