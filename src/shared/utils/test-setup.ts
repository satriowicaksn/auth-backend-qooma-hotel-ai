/**
 * Jest global setup — runs once before any test suite (via
 * `setupFilesAfterEnv` in jest.config.json).
 *
 * Loads a local `.env` file (developer machine + CI runner copy
 * `.env.example` → `.env` as the documented bootstrap step) into
 * `process.env` so the singleton at `src/core/prisma/prisma-client.ts`
 * (which calls `loadConfig()` at module import time) and any
 * test that touches `loadConfig()` directly can resolve the required
 * env vars. Minimal manual KEY=VALUE parser — no `dotenv` dep needed.
 *
 * If `.env` is absent, tests that don't touch loadConfig still pass;
 * smoke tests against the live Postgres need `.env` present.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');

function loadEnvFile(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return; // .env missing — tests that need it will surface their own errors
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip inline trailing `# comment` (after stripping quoted values).
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    } else {
      const hashIdx = value.indexOf(' #');
      if (hashIdx > -1) value = value.slice(0, hashIdx).trimEnd();
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(ENV_PATH);

// Jest sets NODE_ENV='test' by default but env.ts only accepts the
// runtime triplet ('development' | 'staging' | 'production'). Coerce to
// 'development' for tests — config consumers branch on this for log
// verbosity + cookie `secure` flag, both safe to treat as dev under jest.
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = 'development';
}

// `.env.example` ships a placeholder ENCRYPTION_KEY shorter than 64
// chars; env.ts requires exactly 64. Supply a deterministic dummy hex
// for tests if the loaded value is invalid. Dummy is well-known +
// committed to tests only — no production use.
if ((process.env.ENCRYPTION_KEY ?? '').length !== 64) {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
}

export {};
