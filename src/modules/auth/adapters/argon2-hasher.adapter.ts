import { argon2id, hash as argonHash, verify as argonVerify } from 'argon2';

import type { PasswordHasherPort } from '../ports/password-hasher.port.js';

export class Argon2Hasher implements PasswordHasherPort {
  async hash(plaintext: string): Promise<string> {
    return argonHash(plaintext, { type: argon2id });
  }

  async verify(passwordHash: string, plaintext: string): Promise<boolean> {
    try {
      return await argonVerify(passwordHash, plaintext);
    } catch {
      // argon2.verify throws on malformed hash envelope; treat as verification failure.
      return false;
    }
  }
}
