// Unit tests for the csrf-guard plugin (T82 D.3). Mirrors the tenant-guard /
// must-rotate harness: a Fastify instance with a mocked tokenIssuer + AuthRepo,
// @fastify/cookie registered, registerCsrfGuard called, then injected
// mutating/non-mutating requests with/without the X-CSRF-Token header.

import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import { csrfTokenMatches, registerCsrfGuard } from '../../../plugins/csrf-guard.plugin.js';
import type { AuthRepository } from '../auth.repository.js';
import type { TokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims } from '../auth.types.js';

const SID = '33333333-3333-3333-3333-333333333333';
const CSRF = 'b'.repeat(64);
const WRONG_CSRF = 'c'.repeat(64);
const ALLOWLIST = ['/api/auth/login'];

function claimsFor(overrides: Partial<JwtClaims> = {}): JwtClaims {
  return { sub: 'u-1', sid: SID, role: 'gm_admin', hotelId: 'h-1', deptId: null, ...overrides };
}

interface BuildOpts {
  readonly enabled?: boolean;
  readonly storedCsrf?: string | null;
}

interface Harness {
  readonly app: FastifyInstance;
  readonly findCsrf: jest.Mock<AuthRepository['findCsrfTokenBySessionId']>;
}

async function buildApp(opts: BuildOpts = {}): Promise<Harness> {
  const fastify = Fastify({ logger: false });

  const verify = jest.fn(() => claimsFor());
  fastify.decorate('tokenIssuer', { sign: jest.fn(), verify } as unknown as TokenIssuer);

  const findCsrf = jest
    .fn<AuthRepository['findCsrfTokenBySessionId']>()
    .mockResolvedValue(opts.storedCsrf === undefined ? CSRF : opts.storedCsrf);
  const repo = { findCsrfTokenBySessionId: findCsrf } as unknown as AuthRepository;

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  await fastify.register(cookiePlugin);
  registerCsrfGuard(fastify, { repo, enabled: opts.enabled ?? true, allowlist: ALLOWLIST });

  fastify.post('/api/protected', () => ({ ok: true }));
  fastify.get('/api/protected', () => ({ ok: true }));
  fastify.post('/api/auth/login', () => ({ ok: true }));

  return { app: fastify, findCsrf };
}

function errorCode(body: string): string {
  return (JSON.parse(body) as { error: { code: string } }).error.code;
}

describe('csrfTokenMatches', () => {
  it('should return true for identical fixed-length tokens', () => {
    expect(csrfTokenMatches(CSRF, CSRF)).toBe(true);
  });
  it('should return false for different tokens of equal length', () => {
    expect(csrfTokenMatches(WRONG_CSRF, CSRF)).toBe(false);
  });
  it('should return false on a length mismatch', () => {
    expect(csrfTokenMatches('short', CSRF)).toBe(false);
  });
  it('should return false when the provided token is undefined', () => {
    expect(csrfTokenMatches(undefined, CSRF)).toBe(false);
  });
  it('should return false when the expected token is empty', () => {
    expect(csrfTokenMatches('', '')).toBe(false);
  });
});

describe('registerCsrfGuard', () => {
  it('should NOT enforce when disabled (mutation passes with no token)', async () => {
    const { app, findCsrf } = await buildApp({ enabled: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/protected',
      cookies: { token: 'jwt' },
    });
    expect(res.statusCode).toBe(200);
    expect(findCsrf).not.toHaveBeenCalled();
    await app.close();
  });

  it('should pass a mutating request with a matching X-CSRF-Token', async () => {
    const { app, findCsrf } = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/protected',
      cookies: { token: 'jwt' },
      headers: { 'x-csrf-token': CSRF },
    });
    expect(res.statusCode).toBe(200);
    expect(findCsrf).toHaveBeenCalledWith(SID);
    await app.close();
  });

  it('should 403 a mutating request with a wrong X-CSRF-Token', async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/protected',
      cookies: { token: 'jwt' },
      headers: { 'x-csrf-token': WRONG_CSRF },
    });
    expect(res.statusCode).toBe(403);
    expect(errorCode(res.body)).toBe('FORBIDDEN');
    await app.close();
  });

  it('should 403 a mutating request with a missing X-CSRF-Token', async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/protected',
      cookies: { token: 'jwt' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('should skip non-mutating (GET) requests', async () => {
    const { app, findCsrf } = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      cookies: { token: 'jwt' },
    });
    expect(res.statusCode).toBe(200);
    expect(findCsrf).not.toHaveBeenCalled();
    await app.close();
  });

  it('should skip allowlisted routes (login) without a token', async () => {
    const { app, findCsrf } = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      cookies: { token: 'jwt' },
    });
    expect(res.statusCode).toBe(200);
    expect(findCsrf).not.toHaveBeenCalled();
    await app.close();
  });

  it('should pass through (delegate 401 downstream) when no auth cookie is present', async () => {
    const { app, findCsrf } = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/protected' });
    expect(res.statusCode).toBe(200);
    expect(findCsrf).not.toHaveBeenCalled();
    await app.close();
  });
});
