import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAccessCookie,
  clearRefreshCookie,
  setAccessCookie,
  setRefreshCookie,
} from './auth.cookie-helpers.js';
import { extractJwtClaims } from './auth.jwt-context.js';
import {
  LoginRequestSchema,
  PatchMeRequestSchema,
  RotatePasswordRequestSchema,
} from './auth.schema.js';
import type { JwtClaims, SessionContext } from './auth.types.js';

function sessionContextFromRequest(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  ip: string | undefined,
): SessionContext {
  const ua = headers['user-agent'];
  return {
    userAgent: typeof ua === 'string' ? ua : null,
    ipAddress: typeof ip === 'string' && ip.length > 0 ? ip : null,
  };
}

function claimsFromRequest(req: FastifyRequest): JwtClaims {
  return extractJwtClaims(req.server.tokenIssuer, req.cookies[ACCESS_COOKIE_NAME]);
}

export const authRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/login', async (req, reply) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid login payload', { issues: parsed.error.issues });
    }
    const ctx = sessionContextFromRequest(req.headers, req.ip);
    const result = await fastify.services.auth.login(parsed.data, ctx);
    setAccessCookie(reply, result.accessToken, fastify.appConfig);
    setRefreshCookie(reply, result.refreshToken, fastify.appConfig);
    return reply.code(200).send({ user: result.user, csrfToken: result.csrfToken });
  });

  fastify.post('/logout', async (req, reply) => {
    const accessToken = req.cookies[ACCESS_COOKIE_NAME] ?? null;
    await fastify.services.auth.logout(accessToken);
    clearAccessCookie(reply, fastify.appConfig);
    clearRefreshCookie(reply, fastify.appConfig);
    return reply.code(200).send({ success: true });
  });

  fastify.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] ?? null;
    const ctx = sessionContextFromRequest(req.headers, req.ip);
    const result = await fastify.services.auth.refresh(refreshToken, ctx);
    setAccessCookie(reply, result.accessToken, fastify.appConfig);
    setRefreshCookie(reply, result.refreshToken, fastify.appConfig);
    return reply.code(200).send({ user: result.user, csrfToken: result.csrfToken });
  });

  fastify.get('/me', async (req, reply) => {
    const claims = claimsFromRequest(req);
    const result = await fastify.services.auth.getMe(claims);
    return reply.code(200).send({ user: result.user, csrfToken: result.csrfToken });
  });

  fastify.patch('/me', async (req, reply) => {
    const claims = claimsFromRequest(req);
    const parsed = PatchMeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid /me payload', { issues: parsed.error.issues });
    }
    const result = await fastify.services.auth.updateMeLanguage(claims, parsed.data.language);
    return reply.code(200).send({ user: result.user });
  });

  fastify.post('/me/password', async (req, reply) => {
    const claims = claimsFromRequest(req);
    const parsed = RotatePasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      // 422 when current-password verification ends up failing belongs to AuthError
      // (mapped by service). Here we only return 400 for shape/policy failures.
      throw new ValidationError('Invalid password rotation payload', {
        issues: parsed.error.issues,
      });
    }
    const result = await fastify.services.auth.rotatePassword(
      claims,
      parsed.data.current_password,
      parsed.data.new_password,
    );
    return reply.code(200).send(result);
  });

  done();
};
