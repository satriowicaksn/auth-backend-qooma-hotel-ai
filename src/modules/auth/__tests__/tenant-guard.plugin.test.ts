// Unit tests for tenant-guard plugin (T11).
//
// Cross-slot execution per §4-D01 (Slot A canonical territory).
//
// Fixture pattern mirrors T06 `must-rotate-password.plugin.test.ts`:
// Fastify app instance, decorate `tokenIssuer` mock, register
// `@fastify/cookie`, call `registerTenantGuard(fastify, { allowlist })`,
// then register dummy routes that capture `req.session` + `req.tenantScope`
// for assertion. Inject permutations cover 4 roles + allowlist + missing
// cookie + invalid JWT + audit-log shape.

import cookiePlugin from '@fastify/cookie';
import { describe, expect, it, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import { registerTenantGuard } from '../../../plugins/tenant-guard.js';
import type { TokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims, Role } from '../auth.types.js';

interface Harness {
  readonly app: FastifyInstance;
  readonly verify: jest.Mock;
  readonly logWarn: jest.Mock;
  readonly captured: { session?: unknown; tenantScope?: unknown; touched: boolean };
}

const SAMPLE_USER_ID = '11111111-1111-1111-1111-111111111111';
const SAMPLE_SESSION_ID = '33333333-3333-3333-3333-333333333333';
const SAMPLE_HOTEL_ID = '22222222-2222-2222-2222-222222222222';

function claimsFor(overrides: Partial<JwtClaims> = {}): JwtClaims {
  return {
    sub: SAMPLE_USER_ID,
    sid: SAMPLE_SESSION_ID,
    role: 'gm_admin',
    hotelId: SAMPLE_HOTEL_ID,
    deptId: null,
    ...overrides,
  };
}

interface BuildOpts {
  readonly allowlist?: readonly string[];
  readonly verify?: () => JwtClaims;
}

async function buildApp(opts: BuildOpts = {}): Promise<Harness> {
  const fastify = Fastify({ logger: false });

  const verify = jest.fn(() => {
    if (opts.verify !== undefined) return opts.verify();
    return claimsFor();
  });
  const tokenIssuer = { sign: jest.fn(), verify } as unknown as TokenIssuer;
  fastify.decorate('tokenIssuer', tokenIssuer);

  // Spy on fastify.log.warn — replace with a jest mock so the audit-log
  // shape assertion can inspect call arguments.
  const logWarn = jest.fn();
  (fastify.log as unknown as { warn: jest.Mock }).warn = logWarn;

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  await fastify.register(cookiePlugin);
  registerTenantGuard(fastify, { allowlist: opts.allowlist ?? ['/api/auth/login'] });

  const captured: { session?: unknown; tenantScope?: unknown; touched: boolean } = {
    touched: false,
  };

  // Dummy routes covering: gated, allow-listed (declared in default opts),
  // a second guarded route, and a multi-segment guarded path.
  fastify.get('/api/protected', (req) => {
    captured.touched = true;
    captured.session = req.session;
    captured.tenantScope = req.tenantScope;
    return { ok: true };
  });
  fastify.get('/api/auth/login', (req) => {
    captured.touched = true;
    captured.session = req.session;
    captured.tenantScope = req.tenantScope;
    return { ok: true };
  });
  fastify.get('/api/hotels/:hotelId/users', (req) => {
    captured.touched = true;
    captured.session = req.session;
    captured.tenantScope = req.tenantScope;
    return { ok: true };
  });

  return { app: fastify, verify, logWarn, captured };
}

describe('registerTenantGuard', () => {
  describe('super_admin role', () => {
    it('should set tenantScope = { type: "all-hotels" } and pass through when claims.hotelId is null', async () => {
      const h = await buildApp({
        verify: () => claimsFor({ role: 'super_admin', hotelId: null }),
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: 'valid.jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.touched).toBe(true);
      expect(h.captured.tenantScope).toEqual({ type: 'all-hotels' });
      expect(h.captured.session).toEqual({
        userId: SAMPLE_USER_ID,
        role: 'super_admin',
        hotelId: null,
        deptId: null,
      });
      await h.app.close();
    });

    it('should still bypass with type = "all-hotels" when super_admin happens to carry a hotelId claim', async () => {
      const h = await buildApp({
        verify: () => claimsFor({ role: 'super_admin', hotelId: SAMPLE_HOTEL_ID }),
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: 'valid.jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.tenantScope).toEqual({ type: 'all-hotels' });
      await h.app.close();
    });
  });

  describe.each<Role>(['gm_admin', 'dept_head', 'staff'])(
    'non-super_admin role %s with valid hotelId claim',
    (role) => {
      it(`should set tenantScope = { type: "single-hotel", hotelId } and pass through`, async () => {
        const h = await buildApp({
          verify: () => claimsFor({ role, hotelId: SAMPLE_HOTEL_ID }),
        });
        const res = await h.app.inject({
          method: 'GET',
          url: '/api/protected',
          cookies: { token: 'valid.jwt' },
        });

        expect(res.statusCode).toBe(200);
        expect(h.captured.touched).toBe(true);
        expect(h.captured.tenantScope).toEqual({
          type: 'single-hotel',
          hotelId: SAMPLE_HOTEL_ID,
        });
        expect(h.captured.session).toEqual({
          userId: SAMPLE_USER_ID,
          role,
          hotelId: SAMPLE_HOTEL_ID,
          deptId: null,
        });
        await h.app.close();
      });
    },
  );

  describe('non-super_admin role with missing hotelId claim', () => {
    it('should throw TenantScopeViolationError (403 TENANT_SCOPE_VIOLATION)', async () => {
      const h = await buildApp({
        verify: () => claimsFor({ role: 'gm_admin', hotelId: null }),
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: 'valid.jwt' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('TENANT_SCOPE_VIOLATION');
      expect(h.captured.touched).toBe(false); // handler never reached
      await h.app.close();
    });

    it('should emit audit log with the canonical 7-field shape on deny', async () => {
      const h = await buildApp({
        verify: () => claimsFor({ role: 'gm_admin', hotelId: null }),
      });
      await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: 'valid.jwt' },
      });

      expect(h.logWarn).toHaveBeenCalledTimes(1);
      const logArg = h.logWarn.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(logArg).toEqual(
        expect.objectContaining({
          msg: 'tenant_deny',
          correlationId: expect.any(String),
          userId: SAMPLE_USER_ID,
          role: 'gm_admin',
          claimHotelId: null,
          path: '/api/protected',
          method: 'GET',
        }),
      );
      await h.app.close();
    });
  });

  describe('upstream auth delegation', () => {
    it('should skip enforcement (no throw, no scope set) when access cookie is absent', async () => {
      const h = await buildApp();
      const res = await h.app.inject({ method: 'GET', url: '/api/protected' });

      expect(res.statusCode).toBe(200);
      expect(h.captured.touched).toBe(true);
      expect(h.captured.tenantScope).toBeUndefined();
      expect(h.captured.session).toBeUndefined();
      expect(h.verify).not.toHaveBeenCalled();
      await h.app.close();
    });

    it('should skip enforcement when access cookie is empty string', async () => {
      const h = await buildApp();
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: '' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.tenantScope).toBeUndefined();
      await h.app.close();
    });

    it('should skip enforcement when tokenIssuer.verify throws AppError (invalid/expired)', async () => {
      const h = await buildApp({
        verify: () => {
          throw new (class extends AppError {
            readonly statusCode = 401;
            readonly code = 'INVALID';
          })('expired');
        },
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/protected',
        cookies: { token: 'garbage.jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.touched).toBe(true);
      expect(h.captured.tenantScope).toBeUndefined();
      await h.app.close();
    });
  });

  describe('allowlist behavior', () => {
    it('should skip entirely on allowlisted route (no JWT inspection, no scope set, even with cookie present)', async () => {
      const h = await buildApp({
        allowlist: ['/api/auth/login'],
        verify: () => claimsFor({ role: 'gm_admin', hotelId: SAMPLE_HOTEL_ID }),
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/auth/login',
        cookies: { token: 'valid.jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.touched).toBe(true);
      expect(h.captured.tenantScope).toBeUndefined();
      expect(h.captured.session).toBeUndefined();
      expect(h.verify).not.toHaveBeenCalled();
      await h.app.close();
    });

    it('should guard every route when allowlist is empty', async () => {
      const h = await buildApp({
        allowlist: [],
        verify: () => claimsFor({ role: 'gm_admin', hotelId: SAMPLE_HOTEL_ID }),
      });
      const res = await h.app.inject({
        method: 'GET',
        url: '/api/auth/login',
        cookies: { token: 'valid.jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(h.captured.tenantScope).toEqual({
        type: 'single-hotel',
        hotelId: SAMPLE_HOTEL_ID,
      });
      await h.app.close();
    });
  });

  describe('route pattern matching', () => {
    it('should resolve req.routeOptions.url for matched routes (param route)', async () => {
      const h = await buildApp({
        verify: () => claimsFor({ role: 'gm_admin', hotelId: null }),
      });
      await h.app.inject({
        method: 'GET',
        url: `/api/hotels/${SAMPLE_HOTEL_ID}/users`,
        cookies: { token: 'valid.jwt' },
      });

      // Audit log should record the route PATTERN, not the concrete URL —
      // pattern stability is what allowlists rely on.
      const logArg = h.logWarn.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(logArg.path).toBe('/api/hotels/:hotelId/users');
      await h.app.close();
    });
  });
});
