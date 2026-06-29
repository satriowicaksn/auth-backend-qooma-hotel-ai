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

import { createHash } from 'node:crypto';

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
