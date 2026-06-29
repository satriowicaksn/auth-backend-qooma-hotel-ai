import { describe, expect, it } from '@jest/globals';

import { Argon2Hasher } from '../adapters/argon2-hasher.adapter.js';

describe('Argon2Hasher', () => {
  const hasher = new Argon2Hasher();

  it('should round-trip: verify returns true for the original plaintext', async () => {
    const hash = await hasher.hash('CorrectHorseBattery!1');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(hasher.verify(hash, 'CorrectHorseBattery!1')).resolves.toBe(true);
  }, 15000);

  it('should reject when verifying a different plaintext', async () => {
    const hash = await hasher.hash('CorrectHorseBattery!1');
    await expect(hasher.verify(hash, 'wrong-password-xx')).resolves.toBe(false);
  }, 15000);

  it('should return false (not throw) when the hash envelope is malformed', async () => {
    await expect(hasher.verify('not-a-valid-argon2-envelope', 'anything')).resolves.toBe(false);
  });
});
