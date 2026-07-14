import { describe, expect, it } from '@jest/globals';

import { UpdateSettingsRequestSchema } from '../hotels.schema.js';

describe('UpdateSettingsRequestSchema', () => {
  describe('happy paths', () => {
    it('should accept a partial body with only timezone', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ timezone: 'Asia/Jakarta' });
      expect(result.success).toBe(true);
    });

    it('should accept a full body with all 3 fields', () => {
      const result = UpdateSettingsRequestSchema.safeParse({
        timezone: 'Asia/Singapore',
        branding: { logo: 'https://cdn.example/logo.png', primaryColor: '#ff0000' },
        dnd: { windows: [{ start: '22:00', end: '08:00' }] },
      });
      expect(result.success).toBe(true);
    });

    it('should accept null for branding (clear semantic)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ branding: null });
      expect(result.success).toBe(true);
    });

    it('should accept null for dnd (clear semantic)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ dnd: null });
      expect(result.success).toBe(true);
    });

    it('should accept an empty object for branding (no DND windows yet)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ branding: {} });
      expect(result.success).toBe(true);
    });
  });

  describe('strict reject — unknown fields (per spec §1.5 line 198+205 whitelist)', () => {
    it.each([
      ['code', 'NEW-001'],
      ['tierId', '00000000-0000-0000-0000-000000000000'],
      ['status', 'suspended'],
      ['gmContact', { name: 'GM', email: 'gm@x.example', phone: '+62000' }],
      ['createdAt', '2026-01-01T00:00:00Z'],
      ['updatedAt', '2026-01-01T00:00:00Z'],
    ])('should reject unknown field "%s"', (field, value) => {
      const result = UpdateSettingsRequestSchema.safeParse({ [field]: value });
      expect(result.success).toBe(false);
    });
  });

  describe('name and welcome_message fields', () => {
    it('should accept name as a valid field', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ name: 'Renamed Hotel' });
      expect(result.success).toBe(true);
    });

    it('should accept welcome_message as a valid field', () => {
      const result = UpdateSettingsRequestSchema.safeParse({
        welcome_message: 'Welcome to our hotel!',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null welcome_message (clear semantic)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ welcome_message: null });
      expect(result.success).toBe(true);
    });

    it('should reject name that is empty string', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject welcome_message longer than 280 chars', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ welcome_message: 'a'.repeat(281) });
      expect(result.success).toBe(false);
    });
  });

  describe('refine reject — empty payload', () => {
    it('should reject an empty body (at-least-one-field rule)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('timezone constraints', () => {
    it('should reject an empty timezone string (min(1))', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ timezone: '' });
      expect(result.success).toBe(false);
    });

    it('should reject a timezone longer than the VARCHAR(50) column ceiling', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ timezone: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });
  });

  describe('branding/dnd shape', () => {
    it('should reject a non-object branding (string)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ branding: 'not-an-object' });
      expect(result.success).toBe(false);
    });

    it('should reject a non-object dnd (number)', () => {
      const result = UpdateSettingsRequestSchema.safeParse({ dnd: 42 });
      expect(result.success).toBe(false);
    });
  });
});
