import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Logger } from 'winston';

import type { AppConfig } from '@core/config/env.js';
import { AuthError } from '@core/errors/app-errors.js';

import { hashToken } from '@shared/utils/crypto.js';

import type { AuthRepository, SessionCreateInput } from '../auth.repository.js';
import { AuthService } from '../auth.service.js';
import type { TokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims, SessionContext } from '../auth.types.js';
import type { PasswordHasherPort } from '../ports/password-hasher.port.js';

import { aLoginRequest, aSession, aUser } from './auth.builders.js';

const testConfig = {
  JWT_REFRESH_TTL: '30d',
  JWT_ACCESS_TTL: '15m',
  NODE_ENV: 'test',
} as unknown as AppConfig;

const ctx: SessionContext = {
  userAgent: 'jest/test',
  ipAddress: '127.0.0.1',
};

interface Mocks {
  findActiveUserByEmail: jest.Mock;
  findActiveUserById: jest.Mock;
  createSession: jest.Mock;
  findActiveSessionByRefreshHash: jest.Mock;
  revokeSession: jest.Mock;
  rotateSession: jest.Mock;
  touchUserLastLogin: jest.Mock;
  hash: jest.Mock;
  verify: jest.Mock;
  sign: jest.Mock;
  verifyToken: jest.Mock;
  service: AuthService;
}

function buildService(): Mocks {
  const findActiveUserByEmail = jest.fn();
  const findActiveUserById = jest.fn();
  const createSession = jest.fn();
  const findActiveSessionByRefreshHash = jest.fn();
  const revokeSession = jest.fn();
  const rotateSession = jest.fn();
  const touchUserLastLogin = jest.fn();

  const hash = jest.fn();
  const verify = jest.fn();

  const sign = jest.fn();
  const verifyToken = jest.fn();

  const repo = {
    findActiveUserByEmail,
    findActiveUserById,
    createSession,
    findActiveSessionByRefreshHash,
    revokeSession,
    rotateSession,
    touchUserLastLogin,
  } as unknown as AuthRepository;

  const hasher = { hash, verify } as unknown as PasswordHasherPort;

  const tokenIssuer = {
    sign,
    verify: verifyToken,
  } as unknown as TokenIssuer;

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const service = new AuthService(repo, hasher, tokenIssuer, testConfig, logger);

  return {
    findActiveUserByEmail,
    findActiveUserById,
    createSession,
    findActiveSessionByRefreshHash,
    revokeSession,
    rotateSession,
    touchUserLastLogin,
    hash,
    verify,
    sign,
    verifyToken,
    service,
  };
}

describe('AuthService.login', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should return spec-shaped user + tokens and persist session when credentials valid', async () => {
    const user = aUser();
    m.findActiveUserByEmail.mockResolvedValue(user);
    m.verify.mockResolvedValue(true);
    const session = aSession();
    m.createSession.mockResolvedValue(session);
    m.sign.mockReturnValue('signed.jwt.value');

    const result = await m.service.login(aLoginRequest(), ctx);

    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotel_id: user.hotelId,
      dept_id: user.deptId,
      language: user.language,
    });
    expect(result.accessToken).toBe('signed.jwt.value');
    expect(result.refreshToken).toHaveLength(64);
    expect(result.csrfToken).toHaveLength(64);

    expect(m.createSession).toHaveBeenCalledTimes(1);
    const sessionInput = m.createSession.mock.calls[0]?.[0] as SessionCreateInput;
    expect(sessionInput.userId).toBe(user.id);
    expect(sessionInput.refreshTokenHash).toBe(hashToken(result.refreshToken));
    expect(sessionInput.csrfToken).toBe(result.csrfToken);
    expect(sessionInput.userAgent).toBe(ctx.userAgent);
    expect(sessionInput.ipAddress).toBe(ctx.ipAddress);
    expect(sessionInput.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(m.touchUserLastLogin).toHaveBeenCalledWith(user.id);

    expect(m.sign).toHaveBeenCalledWith({
      sub: user.id,
      sid: session.id,
      role: user.role,
      hotelId: user.hotelId,
      deptId: user.deptId,
    });
  });

  it('should throw AuthError when user is not found', async () => {
    m.findActiveUserByEmail.mockResolvedValue(null);
    await expect(m.service.login(aLoginRequest(), ctx)).rejects.toThrow(AuthError);
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it('should throw AuthError when password verify fails', async () => {
    m.findActiveUserByEmail.mockResolvedValue(aUser());
    m.verify.mockResolvedValue(false);
    await expect(m.service.login(aLoginRequest(), ctx)).rejects.toThrow(AuthError);
    expect(m.createSession).not.toHaveBeenCalled();
    expect(m.touchUserLastLogin).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should revoke session by claims.sid when access token is valid', async () => {
    const claims: JwtClaims = {
      sub: 'user-1',
      sid: 'sess-1',
      role: 'gm_admin',
      hotelId: 'h-1',
      deptId: null,
    };
    m.verifyToken.mockReturnValue(claims);

    await m.service.logout('valid.jwt.value');

    expect(m.revokeSession).toHaveBeenCalledWith('sess-1');
  });

  it('should no-op when access token is null', async () => {
    await m.service.logout(null);
    expect(m.revokeSession).not.toHaveBeenCalled();
    expect(m.verifyToken).not.toHaveBeenCalled();
  });

  it('should no-op when access token is empty string', async () => {
    await m.service.logout('');
    expect(m.revokeSession).not.toHaveBeenCalled();
  });

  it('should no-op (idempotent) when access token is invalid', async () => {
    m.verifyToken.mockImplementation(() => {
      throw new AuthError('Invalid');
    });
    await expect(m.service.logout('garbage')).resolves.toBeUndefined();
    expect(m.revokeSession).not.toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  let m: Mocks;

  beforeEach(() => {
    m = buildService();
  });

  it('should rotate session and return new tokens when refresh cookie valid', async () => {
    const refreshCookieValue = 'opaque.refresh.value';
    const oldSession = aSession({ id: 'sess-old' });
    m.findActiveSessionByRefreshHash.mockResolvedValue(oldSession);
    const user = aUser();
    m.findActiveUserById.mockResolvedValue(user);
    const newSession = aSession({ id: 'sess-new' });
    m.rotateSession.mockResolvedValue(newSession);
    m.sign.mockReturnValue('new.jwt.value');

    const result = await m.service.refresh(refreshCookieValue, ctx);

    expect(m.findActiveSessionByRefreshHash).toHaveBeenCalledWith(hashToken(refreshCookieValue));
    expect(m.rotateSession).toHaveBeenCalledTimes(1);
    expect(m.rotateSession.mock.calls[0]?.[0]).toBe('sess-old');
    expect(result.accessToken).toBe('new.jwt.value');
    expect(result.refreshToken).not.toBe(refreshCookieValue);
    expect(result.refreshToken).toHaveLength(64);
    expect(result.csrfToken).toHaveLength(64);
    expect(result.user.id).toBe(user.id);

    expect(m.sign).toHaveBeenCalledWith({
      sub: user.id,
      sid: newSession.id,
      role: user.role,
      hotelId: user.hotelId,
      deptId: user.deptId,
    });
  });

  it('should throw AuthError when refresh token is null', async () => {
    await expect(m.service.refresh(null, ctx)).rejects.toThrow(AuthError);
  });

  it('should throw AuthError when refresh token is empty string', async () => {
    await expect(m.service.refresh('', ctx)).rejects.toThrow(AuthError);
  });

  it('should throw AuthError when session not found (expired or revoked)', async () => {
    m.findActiveSessionByRefreshHash.mockResolvedValue(null);
    await expect(m.service.refresh('opaque-value', ctx)).rejects.toThrow(AuthError);
    expect(m.rotateSession).not.toHaveBeenCalled();
  });

  it('should throw AuthError when user is inactive', async () => {
    m.findActiveSessionByRefreshHash.mockResolvedValue(aSession());
    m.findActiveUserById.mockResolvedValue(null);
    await expect(m.service.refresh('opaque-value', ctx)).rejects.toThrow(AuthError);
  });
});
