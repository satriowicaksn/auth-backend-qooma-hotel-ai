import { describe, expect, it } from '@jest/globals';

import {
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  GetUsersQuerySchema,
  ListUsersResponseSchema,
  ResetPasswordResponseSchema,
  SettingsUserSchema,
  UpdateUserRequestSchema,
} from '../users.schema.js';

const SAMPLE_UUID = '11111111-1111-1111-1111-111111111111';

describe('GetUsersQuerySchema', () => {
  it('should accept empty query and apply defaults', () => {
    const parsed = GetUsersQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(50);
      expect(parsed.data.offset).toBe(0);
    }
  });

  it('should accept limit at the upper bound (200)', () => {
    const parsed = GetUsersQuerySchema.safeParse({ limit: 200 });
    expect(parsed.success).toBe(true);
  });

  it('should reject limit > 200', () => {
    const parsed = GetUsersQuerySchema.safeParse({ limit: 201 });
    expect(parsed.success).toBe(false);
  });

  it('should reject negative offset', () => {
    const parsed = GetUsersQuerySchema.safeParse({ offset: -1 });
    expect(parsed.success).toBe(false);
  });

  it('should reject unknown query params (strict)', () => {
    const parsed = GetUsersQuerySchema.safeParse({ sort: 'created_at' });
    expect(parsed.success).toBe(false);
  });
});

describe('CreateUserRequestSchema', () => {
  const valid = {
    email: 'new@hotel.example',
    name: 'New Staff',
    role: 'staff',
    language: 'id',
  };

  it('should accept a valid dept_head create payload', () => {
    const parsed = CreateUserRequestSchema.safeParse({ ...valid, role: 'dept_head' });
    expect(parsed.success).toBe(true);
  });

  it('should accept a valid staff create payload', () => {
    const parsed = CreateUserRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('should reject role = gm_admin (promoted role disallowed)', () => {
    const parsed = CreateUserRequestSchema.safeParse({ ...valid, role: 'gm_admin' });
    expect(parsed.success).toBe(false);
  });

  it('should reject role = super_admin (promoted role disallowed)', () => {
    const parsed = CreateUserRequestSchema.safeParse({ ...valid, role: 'super_admin' });
    expect(parsed.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const parsed = CreateUserRequestSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(parsed.success).toBe(false);
  });

  it('should reject extra unknown fields (strict)', () => {
    const parsed = CreateUserRequestSchema.safeParse({ ...valid, hint: 'bad' });
    expect(parsed.success).toBe(false);
  });
});

describe('UpdateUserRequestSchema', () => {
  it('should accept a single-field patch', () => {
    const parsed = UpdateUserRequestSchema.safeParse({ name: 'Renamed' });
    expect(parsed.success).toBe(true);
  });

  it('should reject an empty patch body', () => {
    const parsed = UpdateUserRequestSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('should reject role = gm_admin', () => {
    const parsed = UpdateUserRequestSchema.safeParse({ role: 'gm_admin' });
    expect(parsed.success).toBe(false);
  });

  it('should reject extra fields (strict)', () => {
    const parsed = UpdateUserRequestSchema.safeParse({ name: 'X', sneaky: true });
    expect(parsed.success).toBe(false);
  });

  it('should accept dept_id = null (unassign)', () => {
    const parsed = UpdateUserRequestSchema.safeParse({ dept_id: null });
    expect(parsed.success).toBe(true);
  });
});

describe('SettingsUserSchema (response shape)', () => {
  it('should accept the canonical SettingsUser shape per spec §1.2 lines 108-119', () => {
    const parsed = SettingsUserSchema.safeParse({
      id: SAMPLE_UUID,
      email: 'staff@hotel.example',
      name: 'Staff',
      role: 'staff',
      dept_id: null,
      is_active: true,
      last_login_at: null,
      language: 'id',
      must_rotate_password: false,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('CreateUserResponseSchema', () => {
  it('should require snake_case generated_password field', () => {
    const parsed = CreateUserResponseSchema.safeParse({
      user: {
        id: SAMPLE_UUID,
        email: 'staff@hotel.example',
        name: 'Staff',
        role: 'staff',
        dept_id: null,
        is_active: true,
        last_login_at: null,
        language: 'id',
        must_rotate_password: true,
      },
      generated_password: 'P@ssw0rd-1234567!',
    });
    expect(parsed.success).toBe(true);
  });

  it('should reject camelCase generatedPassword (spec mandates snake_case)', () => {
    const parsed = CreateUserResponseSchema.safeParse({
      user: {
        id: SAMPLE_UUID,
        email: 'staff@hotel.example',
        name: 'Staff',
        role: 'staff',
        dept_id: null,
        is_active: true,
        last_login_at: null,
        language: 'id',
        must_rotate_password: true,
      },
      generatedPassword: 'wrong-key',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('ResetPasswordResponseSchema', () => {
  it('should mirror CreateUserResponseSchema shape', () => {
    const parsed = ResetPasswordResponseSchema.safeParse({
      user: {
        id: SAMPLE_UUID,
        email: 'staff@hotel.example',
        name: 'Staff',
        role: 'staff',
        dept_id: null,
        is_active: true,
        last_login_at: null,
        language: 'id',
        must_rotate_password: true,
      },
      generated_password: 'Reset-Pw0rd!1234',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('ListUsersResponseSchema', () => {
  it('should accept a paginated response', () => {
    const parsed = ListUsersResponseSchema.safeParse({
      users: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    expect(parsed.success).toBe(true);
  });
});
