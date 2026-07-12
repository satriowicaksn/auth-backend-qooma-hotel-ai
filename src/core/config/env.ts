/**
 * Validated environment loader via zod.
 * Single source of truth untuk semua config runtime.
 *
 * Usage:
 *   import { loadConfig } from '@core/config/env.js';
 *   const config = loadConfig(); // throws kalau invalid
 *
 * Tambah field service-specific di bawah section "Service-specific".
 */

import { z } from 'zod';

const EnvSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('UTC'),

  // HTTP Server
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url(),
  // Comma-separated CORS allowlist consumed by @fastify/cors (T82 D.2 —
  // previously dead). Never '*' — credentials:true forbids a wildcard origin.
  CORS_ORIGIN: z.string(),

  // Session cookie domain. Leave EMPTY in dev (host-only localhost). In staging/
  // prod set to the shared parent (e.g. `.sharedisini.com`) so the httpOnly
  // `token`/`refresh` cookies are sent cross-subdomain — the FE calls
  // core-staging / integration-staging / ai-staging directly (withCredentials),
  // and a host-only cookie would never reach them → 401. Requires SameSite=None.
  COOKIE_DOMAIN: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),
  REDIS_QUEUE_DB: z.coerce.number().int().nonnegative().default(0),
  REDIS_CACHE_DB: z.coerce.number().int().nonnegative().default(1),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),

  // Security
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'), // '15m' override per spec MVP-AUTH-FIRST §3 + PARENT §4-D04
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.string().default('v1'),

  // CSRF double-submit enforcement. Ships OFF this wave (T82 Q-INT-AUTH-02) —
  // the guard is wired but disabled; enable only after the FE cold-boot
  // csrf-seeding is verified on staging, else every mutation 403s after a reload.
  CSRF_ENFORCE: z.coerce.boolean().default(false),

  // Rate limit
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WEBHOOK_PER_MIN: z.coerce.number().int().positive().default(300),
  // Tighter per-route cap on POST /api/auth/login — brute-force protection (T82 D.4).
  RATE_LIMIT_LOGIN_PER_MIN: z.coerce.number().int().positive().default(10),

  // Observability
  SENTRY_DSN: z.string().optional().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_ENV: z.string().default('development'),

  // Worker
  WORKER_CONCURRENCY_DEFAULT: z.coerce.number().int().positive().default(5),

  // ====================================================================
  // Service-specific (tambah field service di sini, contoh):
  // ====================================================================
  // ANTHROPIC_API_KEY: z.string().min(1),
  // S3_BUCKET: z.string().min(1),
  // UPSTREAM_API_BASE: z.string().url(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Untuk test — reset cache supaya re-validate */
export function resetConfigCache(): void {
  cached = null;
}
