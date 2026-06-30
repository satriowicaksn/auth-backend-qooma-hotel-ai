// Integration tests for tenant-guard plugin — backfilled cycle 7 (T02-sub-1)
// against the migrated local Postgres (T02 cycle 6 deliverable). The T11
// plugin itself was authored under PARENT §4-D01 cross-slot deviation;
// this backfill carries the same heritage marker on line 6.
//
// Cross-slot execution per §4-D01 (Slot A canonical territory).
//
// Pattern: spin up a minimal Fastify instance per test with `@fastify/cookie`
// + `@fastify/jwt` + `fastify.tokenIssuer` decorator + tenant-guard plugin +
// a small test route that exposes the resolved `req.session` /
// `req.tenantScope` to the response. Seed real PG users via
// `integration-helpers` factories; sign JWTs via `FastifyJwtTokenIssuer`;
// inject requests; assert observable handler state.

import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { loadConfig } from '@core/config/env.js';
import { AppError } from '@core/errors/app-errors.js';

import {
  connectPrisma,
  createTestHotel,
  createTestTier,
  createTestUser,
  disconnectPrisma,
  sweepByHotel,
  sweepTier,
  sweepUser,
  uuidSuffix,
} from '../../../core/prisma/__tests__/integration-helpers.js';
import { registerTenantGuard } from '../../../plugins/tenant-guard.js';
import { FastifyJwtTokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims, Role } from '../auth.types.js';
import '@shared/types/fastify-augmentation.js';

const config = loadConfig();

interface InjectedScope {
  readonly session: { userId: string; role: Role; hotelId: string | null } | null;
  readonly tenantScope: { type: string; hotelId?: string } | null;
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookiePlugin);
  await app.register(jwtPlugin, {
    secret: config.JWT_ACCESS_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
    cookie: { cookieName: 'token', signed: false },
  });

  const tokenIssuer = new FastifyJwtTokenIssuer(app);
  app.decorate('tokenIssuer', tokenIssuer);

  // Mirror entrypoint setErrorHandler so AppError subclasses (e.g.,
  // TenantScopeViolationError) map to their statusCode + JSON body.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: err.message } });
  });

  registerTenantGuard(app, { allowlist: ['/api/auth/login', '/health'] });

  app.get('/scope-probe', (req) => {
    const result: InjectedScope = {
      session: req.session
        ? { userId: req.session.userId, role: req.session.role, hotelId: req.session.hotelId }
        : null,
      tenantScope: req.tenantScope ? { ...req.tenantScope } : null,
    };
    return result;
  });

  app.get('/health', () => ({ ok: true }));

  return app;
}

describe('tenant-guard plugin (integration — real Postgres at localhost:5433)', () => {
  let app: FastifyInstance;
  let tierId: string;
  const tenantA = { hotelId: '', userId: '' };
  const tenantB = { hotelId: '', userId: '' };
  let superAdminId: string;

  beforeAll(async () => {
    await connectPrisma();
    app = await buildApp();

    const tier = await createTestTier();
    tierId = tier.id;

    const hotelA = await createTestHotel({ tierId });
    const userA = await createTestUser({ hotelId: hotelA.id, role: 'gm_admin' });
    tenantA.hotelId = hotelA.id;
    tenantA.userId = userA.id;

    const hotelB = await createTestHotel({ tierId });
    const userB = await createTestUser({ hotelId: hotelB.id, role: 'gm_admin' });
    tenantB.hotelId = hotelB.id;
    tenantB.userId = userB.id;

    const superAdmin = await createTestUser({ hotelId: null, role: 'super_admin' });
    superAdminId = superAdmin.id;
  });

  afterAll(async () => {
    await sweepByHotel(tenantA.hotelId);
    await sweepByHotel(tenantB.hotelId);
    await sweepUser(superAdminId);
    await sweepTier(tierId);
    await app.close();
    await disconnectPrisma();
  });

  afterEach(() => {
    // No per-test mutations — fixtures are read-only across the suite.
  });

  function signJwt(claims: JwtClaims): string {
    return app.jwt.sign({
      sub: claims.sub,
      sid: claims.sid,
      role: claims.role,
      hotelId: claims.hotelId,
      deptId: claims.deptId,
    });
  }

  it('should bind req.session.hotelId to the tenant claimed in the JWT (handler-side row-scope filter consumes this)', async () => {
    const token = signJwt({
      sub: tenantA.userId,
      sid: `sid-${uuidSuffix()}`,
      role: 'gm_admin',
      hotelId: tenantA.hotelId,
      deptId: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as InjectedScope;
    expect(body.session?.hotelId).toBe(tenantA.hotelId);
    expect(body.tenantScope).toEqual({ type: 'single-hotel', hotelId: tenantA.hotelId });
    expect(body.session?.hotelId).not.toBe(tenantB.hotelId);
  });

  it('should let a super_admin request pass through with tenantScope = { type: "all-hotels" }', async () => {
    const token = signJwt({
      sub: superAdminId,
      sid: `sid-${uuidSuffix()}`,
      role: 'super_admin',
      hotelId: null,
      deptId: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as InjectedScope;
    expect(body.tenantScope).toEqual({ type: 'all-hotels' });
    expect(body.session?.role).toBe('super_admin');
    expect(body.session?.hotelId).toBeNull();
  });

  it('should skip enforcement on invalid JWT (delegate 401 to upstream auth, NOT 403 from tenant-guard)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token: 'definitely.not.a.valid.jwt' },
    });

    // Plugin delegates — handler runs without session/tenantScope set.
    // The 401 path would fire if a downstream auth layer required the cookie;
    // here we assert the plugin itself does NOT respond with 403.
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as InjectedScope;
    expect(body.session).toBeNull();
    expect(body.tenantScope).toBeNull();
  });

  it('should respond 403 TENANT_SCOPE_VIOLATION when a non-super_admin JWT carries hotelId=null (deny path)', async () => {
    const token = signJwt({
      sub: tenantA.userId,
      sid: `sid-${uuidSuffix()}`,
      role: 'gm_admin',
      hotelId: null, // illegal for non-super_admin per tenant-guard
      deptId: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { error?: { code?: string } };
    expect(body.error?.code).toBe('TENANT_SCOPE_VIOLATION');
  });

  it('should skip enforcement entirely on allow-listed routes (no JWT inspection, no scope set)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('should rotate scope context across two distinct JWTs (different tenants in sequence)', async () => {
    const tokenA = signJwt({
      sub: tenantA.userId,
      sid: `sid-${uuidSuffix()}`,
      role: 'gm_admin',
      hotelId: tenantA.hotelId,
      deptId: null,
    });
    const tokenB = signJwt({
      sub: tenantB.userId,
      sid: `sid-${uuidSuffix()}`,
      role: 'gm_admin',
      hotelId: tenantB.hotelId,
      deptId: null,
    });

    const resA = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token: tokenA },
    });
    const bodyA = JSON.parse(resA.body) as InjectedScope;
    expect(bodyA.tenantScope).toEqual({ type: 'single-hotel', hotelId: tenantA.hotelId });

    const resB = await app.inject({
      method: 'GET',
      url: '/scope-probe',
      cookies: { token: tokenB },
    });
    const bodyB = JSON.parse(resB.body) as InjectedScope;
    expect(bodyB.tenantScope).toEqual({ type: 'single-hotel', hotelId: tenantB.hotelId });
    expect(bodyA.tenantScope).not.toEqual(bodyB.tenantScope);
  });
});
