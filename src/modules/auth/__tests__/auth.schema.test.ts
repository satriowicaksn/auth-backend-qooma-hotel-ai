import { describe, expect, it } from '@jest/globals';

import {
  LoginRequestSchema,
  PatchMeRequestSchema,
  RotatePasswordRequestSchema,
  evaluatePasswordPolicy,
} from '../auth.schema.js';

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

describe('PatchMeRequestSchema', () => {
  it('should accept { language: "en" }', () => {
    const parsed = PatchMeRequestSchema.safeParse({ language: 'en' });
    expect(parsed.success).toBe(true);
  });

  it('should accept { language: "id" }', () => {
    const parsed = PatchMeRequestSchema.safeParse({ language: 'id' });
    expect(parsed.success).toBe(true);
  });

  it('should reject when language is missing', () => {
    const parsed = PatchMeRequestSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('should reject when language is not in whitelist', () => {
    const parsed = PatchMeRequestSchema.safeParse({ language: 'fr' });
    expect(parsed.success).toBe(false);
  });

  it('should reject extra fields beyond language (strict whitelist)', () => {
    const parsed = PatchMeRequestSchema.safeParse({ language: 'en', name: 'attempted' });
    expect(parsed.success).toBe(false);
  });
});

describe('RotatePasswordRequestSchema', () => {
  const valid = {
    current_password: 'OldPassword!1234',
    new_password: 'BrandNewSecret!1',
  };

  it('should accept a valid current + policy-compliant new password', () => {
    const parsed = RotatePasswordRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('should reject when new_password is shorter than 12 chars', () => {
    const parsed = RotatePasswordRequestSchema.safeParse({ ...valid, new_password: 'Short1!' });
    expect(parsed.success).toBe(false);
  });

  it('should reject when new_password is missing a digit', () => {
    const parsed = RotatePasswordRequestSchema.safeParse({
      ...valid,
      new_password: 'NoNumbersHere!',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject when new_password is missing a symbol', () => {
    const parsed = RotatePasswordRequestSchema.safeParse({
      ...valid,
      new_password: 'NoSymbolsHere1',
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject when current_password is empty', () => {
    const parsed = RotatePasswordRequestSchema.safeParse({ ...valid, current_password: '' });
    expect(parsed.success).toBe(false);
  });

  it('should reject extra fields (strict)', () => {
    const parsed = RotatePasswordRequestSchema.safeParse({ ...valid, hint: 'no leaks' });
    expect(parsed.success).toBe(false);
  });
});

describe('evaluatePasswordPolicy', () => {
  it('should return an empty array for a policy-compliant password', () => {
    expect(evaluatePasswordPolicy('BrandNewSecret!1')).toEqual([]);
  });

  it('should flag min_length when shorter than 12 chars', () => {
    expect(evaluatePasswordPolicy('S1!')).toContain('min_length');
  });

  it('should flag missing_digit when no digit present', () => {
    expect(evaluatePasswordPolicy('NoNumbersHere!')).toContain('missing_digit');
  });

  it('should flag missing_symbol when no symbol present', () => {
    expect(evaluatePasswordPolicy('NoSymbolsHere1')).toContain('missing_symbol');
  });

  it('should flag every failing rule simultaneously', () => {
    expect(evaluatePasswordPolicy('short')).toEqual(
      expect.arrayContaining(['min_length', 'missing_digit', 'missing_symbol']),
    );
  });
});
