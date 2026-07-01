import { describe, expect, it } from '@jest/globals';

import {
  CreateAdminUserRequestSchema,
  ListAdminUsersQuerySchema,
  UpdateAdminUserRequestSchema,
} from '../admin-users.schema.js';

const HOTEL_ID = '11111111-1111-1111-1111-111111111111';

describe('ListAdminUsersQuerySchema', () => {
  it('should accept an empty query (defaults populated)', () => {
    const result = ListAdminUsersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should coerce string limit/offset from query string', () => {
    const result = ListAdminUsersQuerySchema.safeParse({ limit: '100', offset: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
      expect(result.data.offset).toBe(20);
    }
  });

  it('should reject limit above ceiling (>200)', () => {
    const result = ListAdminUsersQuerySchema.safeParse({ limit: '999' });
    expect(result.success).toBe(false);
  });

  it('should accept optional hotel_id + role filters', () => {
    const result = ListAdminUsersQuerySchema.safeParse({ hotel_id: HOTEL_ID, role: 'gm_admin' });
    expect(result.success).toBe(true);
  });

  it('should reject unknown query key (strict)', () => {
    const result = ListAdminUsersQuerySchema.safeParse({ unknown_key: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('CreateAdminUserRequestSchema — mutual-exclusion .refine', () => {
  it('should accept role="super_admin" without hotel_id', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'admin@platform.example',
      name: 'Platform Admin',
      role: 'super_admin',
    });
    expect(result.success).toBe(true);
  });

  it('should accept role="super_admin" with hotel_id=null', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'admin@platform.example',
      name: 'Platform Admin',
      role: 'super_admin',
      hotel_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('should REJECT role="super_admin" with hotel_id set (mutual-exclusion)', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'admin@platform.example',
      name: 'Platform Admin',
      role: 'super_admin',
      hotel_id: HOTEL_ID,
    });
    expect(result.success).toBe(false);
  });

  it('should accept role="gm_admin" with hotel_id present', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'gm@hotel.example',
      name: 'GM',
      role: 'gm_admin',
      hotel_id: HOTEL_ID,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['gm_admin', 'gm@hotel.example'],
    ['dept_head', 'dh@hotel.example'],
    ['staff', 'staff@hotel.example'],
  ])(
    'should REJECT role="%s" without hotel_id (mutual-exclusion)',
    (role, email) => {
      const result = CreateAdminUserRequestSchema.safeParse({
        email,
        name: 'Person',
        role,
      });
      expect(result.success).toBe(false);
    },
  );

  it('should REJECT role="dept_head" with hotel_id=null explicitly', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'dh@hotel.example',
      name: 'DH',
      role: 'dept_head',
      hotel_id: null,
    });
    expect(result.success).toBe(false);
  });

  it('should default language to "id" when omitted', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'admin@platform.example',
      name: 'Platform Admin',
      role: 'super_admin',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('id');
    }
  });

  it('should reject unknown body key (strict)', () => {
    const result = CreateAdminUserRequestSchema.safeParse({
      email: 'admin@platform.example',
      name: 'Platform Admin',
      role: 'super_admin',
      is_active: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateAdminUserRequestSchema', () => {
  it('should accept a partial patch with just name', () => {
    const result = UpdateAdminUserRequestSchema.safeParse({ name: 'Renamed' });
    expect(result.success).toBe(true);
  });

  it('should accept role + hotel_id partial patch (mutual-exclusion re-check in service)', () => {
    const result = UpdateAdminUserRequestSchema.safeParse({
      role: 'gm_admin',
      hotel_id: HOTEL_ID,
    });
    expect(result.success).toBe(true);
  });

  it('should reject an empty patch (at-least-one refine)', () => {
    const result = UpdateAdminUserRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject unknown field (strict — e.g. email attempt)', () => {
    const result = UpdateAdminUserRequestSchema.safeParse({ email: 'new@x.example' });
    expect(result.success).toBe(false);
  });
});
