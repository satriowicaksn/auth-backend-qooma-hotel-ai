import { describe, expect, it } from '@jest/globals';

import { LoginRequestSchema } from '../auth.schema.js';

describe('LoginRequestSchema', () => {
  it('should accept a valid login payload', () => {
    const parsed = LoginRequestSchema.safeParse({
      email: 'gm@hotel.example',
      password: 'CorrectHorseBattery!1',
    });
    expect(parsed.success).toBe(true);
  });

  it('should reject when email is invalid format', () => {
    const parsed = LoginRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'CorrectHorseBattery!1',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject when password is shorter than 12 chars', () => {
    const parsed = LoginRequestSchema.safeParse({
      email: 'gm@hotel.example',
      password: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject when email is missing', () => {
    const parsed = LoginRequestSchema.safeParse({
      password: 'CorrectHorseBattery!1',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject when password is missing', () => {
    const parsed = LoginRequestSchema.safeParse({
      email: 'gm@hotel.example',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject unknown fields when strict', () => {
    const parsed = LoginRequestSchema.safeParse({
      email: 'gm@hotel.example',
      password: 'CorrectHorseBattery!1',
      extra: 'rejected',
    });
    expect(parsed.success).toBe(false);
  });
});
