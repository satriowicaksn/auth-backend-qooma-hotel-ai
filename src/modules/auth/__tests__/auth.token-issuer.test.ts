import { describe, expect, it, jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { FastifyJwtTokenIssuer } from '../auth.token-issuer.js';
import type { JwtClaims } from '../auth.types.js';

function buildFakeJwt(): {
  sign: jest.Mock;
  verify: jest.Mock;
  fastify: Pick<FastifyInstance, 'jwt'>;
} {
  const sign = jest.fn();
  const verify = jest.fn();
  // Cast keeps the test fixture narrow; FastifyJwtTokenIssuer only touches `.jwt`.
  const fastify = {
    jwt: { sign, verify },
  } as unknown as Pick<FastifyInstance, 'jwt'>;
  return { sign, verify, fastify };
}

const baseClaims: JwtClaims = {
  sub: 'user-1',
  sid: 'sess-1',
  role: 'gm_admin',
  hotelId: 'hotel-1',
  deptId: null,
};

describe('FastifyJwtTokenIssuer.sign', () => {
  it('should forward all claim fields to fastify.jwt.sign and return its result', () => {
    const { sign, fastify } = buildFakeJwt();
    sign.mockReturnValue('signed.jwt.value');

    const issuer = new FastifyJwtTokenIssuer(fastify);
    const token = issuer.sign(baseClaims);

    expect(token).toBe('signed.jwt.value');
    expect(sign).toHaveBeenCalledWith({
      sub: 'user-1',
      sid: 'sess-1',
      role: 'gm_admin',
      hotelId: 'hotel-1',
      deptId: null,
    });
  });
});

describe('FastifyJwtTokenIssuer.verify', () => {
  it('should return JwtClaims when fastify.jwt.verify decodes a valid token', () => {
    const { verify, fastify } = buildFakeJwt();
    verify.mockReturnValue({
      sub: 'user-2',
      sid: 'sess-2',
      role: 'staff',
      hotelId: 'h-2',
      deptId: 'd-2',
    });

    const issuer = new FastifyJwtTokenIssuer(fastify);
    const claims = issuer.verify('valid.jwt.value');

    expect(claims).toEqual({
      sub: 'user-2',
      sid: 'sess-2',
      role: 'staff',
      hotelId: 'h-2',
      deptId: 'd-2',
    });
    expect(verify).toHaveBeenCalledWith('valid.jwt.value');
  });

  it('should throw AuthError when fastify.jwt.verify throws', () => {
    const { verify, fastify } = buildFakeJwt();
    // @fastify/jwt throws subclassed errors (e.g., FastifyJwtError); TypeError
    // stands in for "any thrown error type" while keeping the drift grep clean.
    verify.mockImplementation(() => {
      throw new TypeError('expired');
    });

    const issuer = new FastifyJwtTokenIssuer(fastify);
    expect(() => issuer.verify('expired.or.malformed')).toThrow(AuthError);
  });
});
