import type { FastifyPluginCallback } from 'fastify';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAccessCookie,
  clearRefreshCookie,
  setAccessCookie,
  setRefreshCookie,
} from './auth.cookie-helpers.js';
import { LoginRequestSchema } from './auth.schema.js';
import type { SessionContext } from './auth.types.js';

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

  done();
};
