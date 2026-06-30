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
  readonly sameSite: 'lax';
  readonly path: string;
  readonly maxAge: number;
}

function accessCookieFlags(config: AppConfig): CookieFlags {
  return {
    httpOnly: true,
    secure: isSecureEnv(config),
    sameSite: 'lax',
    path: '/',
    maxAge: ttlToSeconds(config.JWT_ACCESS_TTL, ACCESS_TTL_FALLBACK_SECONDS),
  };
}

function refreshCookieFlags(config: AppConfig): CookieFlags {
  return {
    httpOnly: true,
    secure: isSecureEnv(config),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: ttlToSeconds(config.JWT_REFRESH_TTL, REFRESH_TTL_FALLBACK_SECONDS),
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
  void reply.clearCookie(ACCESS_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isSecureEnv(config),
    sameSite: 'lax',
  });
}

export function clearRefreshCookie(reply: FastifyReply, config: AppConfig): void {
  void reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure: isSecureEnv(config),
    sameSite: 'lax',
  });
}
