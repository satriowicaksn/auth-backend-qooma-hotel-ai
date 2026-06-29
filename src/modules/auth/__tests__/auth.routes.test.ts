import cookiePlugin from '@fastify/cookie';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AppConfig } from '@core/config/env.js';
import { AppError, AuthError } from '@core/errors/app-errors.js';

import { authRoutes } from '../auth.routes.js';
import type { AuthService } from '../auth.service.js';

const testConfig = {
  NODE_ENV: 'development',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '30d',
} as unknown as AppConfig;

const SUCCESS_LOGIN_PAYLOAD = {
  user: {
    id: 'u-1',
    email: 'gm@hotel.example',
    name: 'A',
    role: 'gm_admin' as const,
    hotel_id: 'h-1',
    dept_id: null,
    language: 'id' as const,
  },
  accessToken: 'jwt-here',
  refreshToken: 'refresh-here',
  csrfToken: 'csrf-here',
};

async function buildTestApp(authMock: Partial<AuthService>): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  fastify.decorate('appConfig', testConfig);
  fastify.decorate('services', { auth: authMock as AuthService });
  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });
  await fastify.register(cookiePlugin);
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  return fastify;
}

describe('POST /api/auth/login', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    // recreated per test
  });

  it('should set token + refresh cookies and return spec-shaped body on success', async () => {
    const login = jest.fn<AuthService['login']>().mockResolvedValue(SUCCESS_LOGIN_PAYLOAD);
    app = await buildTestApp({ login });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'gm@hotel.example', password: 'CorrectHorseBattery!1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { csrfToken: string; user: Record<string, unknown> };
    expect(body.csrfToken).toBe('csrf-here');
    expect(body.user).toEqual(SUCCESS_LOGIN_PAYLOAD.user);

    const setCookieHeader = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    expect(cookies.some((c) => c.startsWith('token=jwt-here'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh=refresh-here'))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.toLowerCase().includes('samesite=lax'))).toBe(true);

    expect(login).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('should return 400 VALIDATION_ERROR when payload is malformed', async () => {
    const login = jest.fn();
    app = await buildTestApp({ login: login as unknown as AuthService['login'] });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_ERROR',
    );
    expect(login).not.toHaveBeenCalled();

    await app.close();
  });

  it('should return 401 AUTH_ERROR when service throws AuthError', async () => {
    const login = jest
      .fn<AuthService['login']>()
      .mockRejectedValue(new AuthError('Invalid credentials'));
    app = await buildTestApp({ login });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'gm@hotel.example', password: 'CorrectHorseBattery!1' },
    });

    expect(res.statusCode).toBe(401);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe('AUTH_ERROR');

    await app.close();
  });
});

describe('POST /api/auth/logout', () => {
  it('should clear cookies and call service.logout with cookie value', async () => {
    const logout = jest.fn<AuthService['logout']>().mockResolvedValue(undefined);
    const app = await buildTestApp({ logout });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: { token: 'cookie-jwt-value' },
    });

    expect(res.statusCode).toBe(200);
    expect(logout).toHaveBeenCalledWith('cookie-jwt-value');
    const cookies = res.headers['set-cookie'];
    const list = Array.isArray(cookies) ? cookies : [cookies ?? ''];
    expect(list.some((c) => c.startsWith('token=') && c.includes('Expires='))).toBe(true);
    expect(list.some((c) => c.startsWith('refresh=') && c.includes('Expires='))).toBe(true);

    await app.close();
  });

  it('should still clear cookies and call logout(null) when no cookie present', async () => {
    const logout = jest.fn<AuthService['logout']>().mockResolvedValue(undefined);
    const app = await buildTestApp({ logout });

    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });

    expect(res.statusCode).toBe(200);
    expect(logout).toHaveBeenCalledWith(null);

    await app.close();
  });
});

describe('POST /api/auth/refresh', () => {
  it('should set fresh cookies and return new csrfToken on rotation', async () => {
    const refresh = jest.fn<AuthService['refresh']>().mockResolvedValue({
      ...SUCCESS_LOGIN_PAYLOAD,
      accessToken: 'rotated.jwt',
      refreshToken: 'rotated.refresh',
      csrfToken: 'rotated.csrf',
    });
    const app = await buildTestApp({ refresh });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refresh: 'old-refresh' },
    });

    expect(res.statusCode).toBe(200);
    expect(refresh).toHaveBeenCalledWith('old-refresh', expect.objectContaining({}));
    const body = JSON.parse(res.body) as { csrfToken: string };
    expect(body.csrfToken).toBe('rotated.csrf');
    const cookies = res.headers['set-cookie'];
    const list = Array.isArray(cookies) ? cookies : [cookies ?? ''];
    expect(list.some((c) => c.startsWith('token=rotated.jwt'))).toBe(true);
    expect(list.some((c) => c.startsWith('refresh=rotated.refresh'))).toBe(true);

    await app.close();
  });

  it('should return 401 AUTH_ERROR when refresh cookie missing', async () => {
    const refresh = jest
      .fn<AuthService['refresh']>()
      .mockRejectedValue(new AuthError('Missing refresh token'));
    const app = await buildTestApp({ refresh });

    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });

    expect(res.statusCode).toBe(401);
    expect(refresh).toHaveBeenCalledWith(null, expect.objectContaining({}));

    await app.close();
  });
});
