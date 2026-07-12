import '@fastify/cookie';

import type { FastifyReply } from 'fastify';

import type { AppConfig } from '@core/config/env.js';

export const ACCESS_COOKIE_NAME = 'token';
export const REFRESH_COOKIE_NAME = 'refresh';
export const REFRESH_COOKIE_PATH = '/api/auth/refresh';

const ACCESS_TTL_FALLBACK_SECONDS = 15 * 60;
const REFRESH_TTL_FALLBACK_SECONDS = 30 * 24 * 60 * 60;

const TTL_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export function ttlToSeconds(ttl: string, fallback: number): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (match === null) return fallback;
  const value = Number(match[1]);
  const unit = match[2] ?? '';
  const factor = TTL_UNIT_SECONDS[unit] ?? 0;
  if (factor === 0 || !Number.isFinite(value)) return fallback;
  return value * factor;
}

function isSecureEnv(config: AppConfig): boolean {
  return config.NODE_ENV !== 'development';
}

interface CookieFlags {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax' | 'none';
  readonly path: string;
  readonly maxAge: number;
  readonly domain?: string;
}

// Shared parent domain (e.g. `.sharedisini.com`) so the cookie reaches sibling
// backends (core/integration/ai) cross-subdomain. Omitted when unset → host-only
// (dev/localhost). Must be applied to set AND clear so the browser matches them.
function domainOpt(config: AppConfig): { domain?: string } {
  return config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {};
}

function accessCookieFlags(config: AppConfig): CookieFlags {
  const secure = isSecureEnv(config);
  return {
    httpOnly: true,
    secure,
    // SameSite=None required for cross-origin withCredentials requests (staging/prod).
    // Dev uses Lax because the Vite proxy makes requests same-origin.
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: ttlToSeconds(config.JWT_ACCESS_TTL, ACCESS_TTL_FALLBACK_SECONDS),
    ...domainOpt(config),
  };
}

function refreshCookieFlags(config: AppConfig): CookieFlags {
  const secure = isSecureEnv(config);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: ttlToSeconds(config.JWT_REFRESH_TTL, REFRESH_TTL_FALLBACK_SECONDS),
    ...domainOpt(config),
  };
}

// reply.setCookie / clearCookie return the chained FastifyReply (thenable);
// `void` marks the chain as intentionally ignored at this layer.
export function setAccessCookie(reply: FastifyReply, jwt: string, config: AppConfig): void {
  void reply.setCookie(ACCESS_COOKIE_NAME, jwt, accessCookieFlags(config));
}

export function setRefreshCookie(reply: FastifyReply, token: string, config: AppConfig): void {
  void reply.setCookie(REFRESH_COOKIE_NAME, token, refreshCookieFlags(config));
}

export function clearAccessCookie(reply: FastifyReply, config: AppConfig): void {
  const secure = isSecureEnv(config);
  void reply.clearCookie(ACCESS_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...domainOpt(config),
  });
}

export function clearRefreshCookie(reply: FastifyReply, config: AppConfig): void {
  const secure = isSecureEnv(config);
  void reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...domainOpt(config),
  });
}
