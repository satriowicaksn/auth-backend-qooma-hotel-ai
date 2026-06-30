/**
 * AES-256-GCM encryption helper untuk secrets at rest.
 *
 * Envelope format: v<version>:<iv_hex>:<ciphertext_hex>:<authTag_hex>
 *
 * Key rotation: support multi-version key (ENCRYPTION_KEY = current,
 * ENCRYPTION_KEY_RETIRED_<vN> = retired). Decrypt by version prefix.
 *
 * Lihat docs/SECURITY.md §3.
 */

import { randomBytes, createHash } from 'node:crypto';

// TODO(qooma): implementasi dengan node:crypto.

export function encrypt(_plaintext: string): string {
  // const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
  // const iv = crypto.randomBytes(12);
  // const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  // const tag = cipher.getAuthTag();
  // return `${config.ENCRYPTION_KEY_VERSION}:${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
  throw new Error('crypto.encrypt not implemented');
}

export function decrypt(_envelope: string): string {
  // const [version, ivHex, ctHex, tagHex] = envelope.split(':');
  // const key = resolveKeyForVersion(version);
  // ...
  throw new Error('crypto.decrypt not implemented');
}

/** Convenience: encrypt connection string */
export function encryptDsn(dsn: string): string {
  return encrypt(dsn);
}

export function decryptDsn(envelope: string): string {
  return decrypt(envelope);
}

/**
 * SHA-256 hex digest. Used for refresh-token at-rest hashing per SECURITY.md §3.
 * Refresh token stays plaintext in the cookie + transient memory; only the hash
 * is persisted in `sessions.refresh_token`. Pre-image resistance protects against
 * DB compromise without breaking the rotation contract.
 */
export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

const PASSWORD_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
const LOWERCASE_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_CHARSET = '0123456789';
const SYMBOL_CHARSET = '!@#$%^&*';
const REJECTION_SAMPLE_CAP = 10;
const DEFAULT_PASSWORD_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 4; // floor to fit one char per required class

/**
 * Cryptographically-strong random password generator for the admin
 * generate-and-return flow per docs/spec/01-auth-identity.md §1.2
 * (used by `POST /api/users` + `POST /api/users/:id/reset-password`).
 *
 * Charset = `[a-zA-Z!@#$%^&*0-9]` (alphanumeric + 8 symbols per
 * SECURITY.md §2.4 floor: ≥ 1 digit, ≥ 1 symbol; this helper also
 * guarantees ≥ 1 lowercase + ≥ 1 uppercase for defense-in-depth).
 *
 * Generation strategy:
 *   1. Rejection-sample up to `REJECTION_SAMPLE_CAP` iterations: build
 *      a random `length`-char string; accept if all 4 character classes
 *      are present.
 *   2. If the cap is hit (rare — for length >= 12 the class-coverage
 *      probability is > 95%), fall back to a DETERMINISTIC scheme:
 *      seed the first 4 positions with one char from each required
 *      class, then fill the remainder randomly, then shuffle in place.
 *      This guarantees termination + class coverage even under
 *      pathological RNG output.
 *
 * Uses `crypto.randomBytes` (CSPRNG) for all randomness — no Math.random.
 */
export function generatePassword(length: number = DEFAULT_PASSWORD_LENGTH): string {
  if (length < MIN_PASSWORD_LENGTH) {
    throw new RangeError(`generatePassword length must be >= ${MIN_PASSWORD_LENGTH}`);
  }

  for (let attempt = 0; attempt < REJECTION_SAMPLE_CAP; attempt++) {
    const candidate = randomString(length, PASSWORD_CHARSET);
    if (hasAllClasses(candidate)) return candidate;
  }

  // Deterministic fallback: seed one char from each required class,
  // fill the rest randomly, then Fisher-Yates shuffle so the seeded
  // positions are not predictable.
  const seeded = [
    pickChar(LOWERCASE_CHARSET),
    pickChar(UPPERCASE_CHARSET),
    pickChar(DIGIT_CHARSET),
    pickChar(SYMBOL_CHARSET),
  ];
  for (let i = seeded.length; i < length; i++) {
    seeded.push(pickChar(PASSWORD_CHARSET));
  }
  return shuffleInPlace(seeded).join('');
}

function randomString(length: number, charset: string): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += charset[byte % charset.length];
  }
  return out;
}

function hasAllClasses(value: string): boolean {
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  for (const ch of value) {
    if (LOWERCASE_CHARSET.includes(ch)) hasLower = true;
    else if (UPPERCASE_CHARSET.includes(ch)) hasUpper = true;
    else if (DIGIT_CHARSET.includes(ch)) hasDigit = true;
    else if (SYMBOL_CHARSET.includes(ch)) hasSymbol = true;
    if (hasLower && hasUpper && hasDigit && hasSymbol) return true;
  }
  return false;
}

function pickChar(charset: string): string {
  const byte = randomBytes(1)[0] ?? 0;
  return charset[byte % charset.length] ?? '';
}

function shuffleInPlace(arr: string[]): string[] {
  // Fisher-Yates with CSPRNG indices.
  for (let i = arr.length - 1; i > 0; i--) {
    const r = randomBytes(1)[0] ?? 0;
    const j = r % (i + 1);
    const tmp = arr[i] as string;
    arr[i] = arr[j] as string;
    arr[j] = tmp;
  }
  return arr;
}
