import '@fastify/jwt';

import type { FastifyInstance } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { JwtClaims, Role } from './auth.types.js';

export interface TokenIssuer {
  sign(claims: JwtClaims): string;
  verify(token: string): JwtClaims;
}

interface SignedPayload {
  readonly sub: string;
  readonly sid: string;
  readonly role: Role;
  readonly hotelId: string | null;
  readonly deptId: string | null;
}

export class FastifyJwtTokenIssuer implements TokenIssuer {
  constructor(private readonly fastify: Pick<FastifyInstance, 'jwt'>) {}

  sign(claims: JwtClaims): string {
    const payload: SignedPayload = {
      sub: claims.sub,
      sid: claims.sid,
      role: claims.role,
      hotelId: claims.hotelId,
      deptId: claims.deptId,
    };
    return this.fastify.jwt.sign(payload);
  }

  verify(token: string): JwtClaims {
    try {
      const decoded = this.fastify.jwt.verify<SignedPayload>(token);
      return {
        sub: decoded.sub,
        sid: decoded.sid,
        role: decoded.role,
        hotelId: decoded.hotelId,
        deptId: decoded.deptId,
      };
    } catch {
      throw new AuthError('Invalid or expired access token');
    }
  }
}
