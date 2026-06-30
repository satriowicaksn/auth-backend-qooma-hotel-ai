import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import { registerMustRotatePasswordGate } from '../../../plugins/must-rotate-password.plugin.js';
import type { AuthRepository, UserRow } from '../auth.repository.js';
import type { TokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims } from '../auth.types.js';

import { aUser } from './auth.builders.js';

interface Harness {
  app: FastifyInstance;
  findUserById: jest.Mock;
  verify: jest.Mock;
}

async function buildApp(
  overrides: { user?: UserRow | null; verify?: () => JwtClaims } = {},
): Promise<Harness> {
  const fastify = Fastify({ logger: false });

  const findUserById = jest.fn();
  if (overrides.user === null) {
    findUserById.mockResolvedValue(null);
  } else {
    findUserById.mockResolvedValue(overrides.user ?? aUser());
  }
  const repo = { findUserById } as unknown as AuthRepository;

  const verify = jest.fn(() => {
    if (overrides.verify !== undefined) return overrides.verify();
    return {
      sub: 'user-1',
      sid: 'sess-1',
      role: 'gm_admin',
      hotelId: 'h-1',
      deptId: null,
    } satisfies JwtClaims;
  });
  const tokenIssuer = { sign: jest.fn(), verify } as unknown as TokenIssuer;

  fastify.decorate('tokenIssuer', tokenIssuer);
  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  await fastify.register(cookiePlugin);
  registerMustRotatePasswordGate(fastify, { repo });

  // Routes covering: gated, allow-listed, no-auth. Sync handlers (no body
  // I/O) keep `require-await` happy without sacrificing inject() coverage.
  fastify.get('/api/protected', () => ({ ok: true }));
  fastify.get('/api/auth/me', () => ({ ok: true }));
  fastify.post('/api/auth/me/password', () => ({ ok: true }));
  fastify.post('/api/auth/logout', () => ({ ok: true }));

  return { app: fastify, findUserById, verify };
}

describe('mustRotatePasswordPlugin', () => {
  it('should pass through when must_rotate_password=false', async () => {
    const { app } = await buildApp({ user: aUser({ mustRotatePassword: false }) });
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('should return 403 PASSWORD_ROTATION_REQUIRED when flag=true on non-allowlist route', async () => {
    const { app } = await buildApp({ user: aUser({ mustRotatePassword: true }) });
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(403);
    expect((JSON.parse(res.body) as { error: { code: string } }).error.code).toBe(
      'PASSWORD_ROTATION_REQUIRED',
    );
    await app.close();
  });

  it('should pass through allow-listed route GET /api/auth/me even when flag=true', async () => {
    const { app } = await buildApp({ user: aUser({ mustRotatePassword: true }) });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('should pass through allow-listed route POST /api/auth/me/password even when flag=true', async () => {
    const { app } = await buildApp({ user: aUser({ mustRotatePassword: true }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/me/password',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('should pass through allow-listed route POST /api/auth/logout even when flag=true', async () => {
    const { app } = await buildApp({ user: aUser({ mustRotatePassword: true }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('should skip (no enforcement) when access cookie absent', async () => {
    const { app, findUserById } = await buildApp({ user: aUser({ mustRotatePassword: true }) });
    const res = await app.inject({ method: 'GET', url: '/api/protected' });
    expect(res.statusCode).toBe(200);
    expect(findUserById).not.toHaveBeenCalled();
    await app.close();
  });

  it('should skip (no enforcement) when JWT verify throws AuthError', async () => {
    const { app, findUserById } = await buildApp({
      verify: () => {
        // Bypass the early TS narrowing — never returns
        throw new (class extends AppError {
          readonly statusCode = 401;
          readonly code = 'INVALID';
        })('Invalid token');
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      cookies: { token: 'garbage.jwt' },
    });
    expect(res.statusCode).toBe(200);
    expect(findUserById).not.toHaveBeenCalled();
    await app.close();
  });

  it('should skip enforcement when user not found or inactive', async () => {
    const { app } = await buildApp({ user: null });
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      cookies: { token: 'valid.jwt.value' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
