import { describe, expect, it } from '@jest/globals';

import { AdminTierSchema, ListTiersResponseSchema, TierNameParamSchema } from '../admin-tiers.schema.js';

describe('TierNameParamSchema', () => {
  it.each(['lite', 'professional', 'luxury', 'enterprise'])(
    'should accept canonical tier name "%s"',
    (name) => {
      const result = TierNameParamSchema.safeParse({ name });
      expect(result.success).toBe(true);
    },
  );

  it('should reject non-canonical tier name (unknown enum)', () => {
    const result = TierNameParamSchema.safeParse({ name: 'starter' });
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = TierNameParamSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('AdminTierSchema', () => {
  it('should parse a full tier row shape', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'lite',
      display_name: 'Lite',
      outbound_quota_monthly: 2000,
      agent_cap: 1,
      agent_minimum: 3,
      user_cap: 2,
      department_cap: 1,
      features: { hotel_settings: true, admin_users: false },
      is_custom: false,
    };
    const result = AdminTierSchema.safeParse(row);
    expect(result.success).toBe(true);
  });
});

describe('ListTiersResponseSchema', () => {
  it('should require the tiers array key', () => {
    const result = ListTiersResponseSchema.safeParse({ tiers: [] });
    expect(result.success).toBe(true);
  });
});
