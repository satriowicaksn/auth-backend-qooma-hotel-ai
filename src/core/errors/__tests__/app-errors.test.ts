import { describe, expect, it } from '@jest/globals';

import { RateLimitError } from '../app-errors.js';

describe('RateLimitError', () => {
  it('should expose code RATE_LIMIT (T82 Q-INT-AUTH-03 — matches FE map + API-CONTRACT §1.5)', () => {
    const err = new RateLimitError('Too many requests');
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.toJson()).toEqual({
      code: 'RATE_LIMIT',
      message: 'Too many requests',
      details: {},
    });
  });
});
