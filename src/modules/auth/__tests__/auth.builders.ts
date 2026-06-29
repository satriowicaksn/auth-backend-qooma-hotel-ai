import type { SessionRow, UserRow } from '../auth.repository.js';
import type { LoginRequestDto } from '../auth.schema.js';

export const aUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  hotelId: '22222222-2222-2222-2222-222222222222',
  deptId: null,
  email: 'gm@hotel-test.example.com',
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
  name: 'Budi Santoso',
  role: 'gm_admin',
  language: 'id',
  isActive: true,
  mustRotatePassword: false,
  ...overrides,
});

export const aSession = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: '33333333-3333-3333-3333-333333333333',
  userId: '11111111-1111-1111-1111-111111111111',
  refreshTokenHash: 'a'.repeat(64),
  csrfToken: 'b'.repeat(64),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  ...overrides,
});

export const aLoginRequest = (overrides: Partial<LoginRequestDto> = {}): LoginRequestDto => ({
  email: 'gm@hotel-test.example.com',
  password: 'CorrectHorseBattery!1',
  ...overrides,
});
