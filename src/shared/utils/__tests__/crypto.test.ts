import { describe, expect, it } from '@jest/globals';

import { generatePassword, hashToken } from '../crypto.js';

describe('hashToken', () => {
  it('should produce a 64-char hex SHA-256 digest for a non-empty string', () => {
    const hash = hashToken('refresh-token-value');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic for the same input', () => {
    const a = hashToken('same');
    const b = hashToken('same');
    expect(a).toBe(b);
  });

  it('should differ for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('generatePassword', () => {
  it('should produce a string of the requested length (default 16)', () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(16);
  });

  it('should produce a string of the explicit length', () => {
    expect(generatePassword(20)).toHaveLength(20);
    expect(generatePassword(12)).toHaveLength(12);
  });

  it('should throw RangeError when length < 4 (cannot fit one char per required class)', () => {
    expect(() => generatePassword(3)).toThrow(RangeError);
    expect(() => generatePassword(0)).toThrow(RangeError);
  });

  it('should guarantee at least one digit, one symbol, one lowercase, one uppercase across 100 samples', () => {
    const samples = Array.from({ length: 100 }, () => generatePassword(16));
    for (const pw of samples) {
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%^&*]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
    }
  });

  it('should only emit characters from the allowed charset [a-zA-Z0-9!@#$%^&*]', () => {
    const pw = generatePassword(32);
    expect(pw).toMatch(/^[a-zA-Z0-9!@#$%^&*]+$/);
  });

  it('should produce non-equal outputs across calls (entropy sanity)', () => {
    const a = generatePassword(16);
    const b = generatePassword(16);
    expect(a).not.toBe(b);
  });

  it('should satisfy the deterministic fallback path when length = 4 (minimum)', () => {
    // Length-4 with 4 required classes means the rejection-sample loop is
    // unlikely to succeed (78-char alphabet must hit every class in exactly
    // 4 draws ≈ 4!/78^4 ≈ 6e-7 per attempt). The fallback seeds one char
    // per class and shuffles, so length=4 still satisfies class coverage.
    const pw = generatePassword(4);
    expect(pw).toHaveLength(4);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[!@#$%^&*]/);
  });
});
