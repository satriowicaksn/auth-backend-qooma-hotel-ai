import { randomBytes } from 'node:crypto';

import type { Logger } from 'winston';

import type { AppConfig } from '@core/config/env.js';
import { AuthError } from '@core/errors/app-errors.js';

import { hashToken } from '@shared/utils/crypto.js';
import { maskEmail } from '@shared/utils/masking.js';

import { ttlToSeconds } from './auth.cookie-helpers.js';
import type { AuthRepository, SessionCreateInput, UserRow } from './auth.repository.js';
import type { LoginRequestDto } from './auth.schema.js';
import type { TokenIssuer } from './auth.token-issuer.js';
import type { AuthUser, JwtClaims, SessionContext } from './auth.types.js';
import type { PasswordHasherPort } from './ports/password-hasher.port.js';

export interface LoginResult {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly csrfToken: string;
}

export type RefreshResult = LoginResult;

const REFRESH_TOKEN_BYTES = 32;
const CSRF_TOKEN_BYTES = 32;
const REFRESH_TTL_FALLBACK_SECONDS = 30 * 24 * 60 * 60;

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly tokenIssuer: TokenIssuer,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async login(input: LoginRequestDto, ctx: SessionContext): Promise<LoginResult> {
    const user = await this.repo.findActiveUserByEmail(input.email);
    if (user === null) {
      this.logger.info('auth.login.rejected', {
        email: maskEmail(input.email),
        reason: 'user_not_found',
      });
      throw new AuthError('Invalid credentials');
    }

    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) {
      this.logger.info('auth.login.rejected', {
        email: maskEmail(user.email),
        userId: user.id,
        reason: 'password_mismatch',
      });
      throw new AuthError('Invalid credentials');
    }

    const refreshToken = generateOpaqueToken(REFRESH_TOKEN_BYTES);
    const csrfToken = generateOpaqueToken(CSRF_TOKEN_BYTES);

    const session = await this.repo.createSession(
      this.buildSessionInput(user.id, refreshToken, csrfToken, ctx),
    );
    await this.repo.touchUserLastLogin(user.id);

    const accessToken = this.tokenIssuer.sign(this.claimsFor(user, session.id));

    this.logger.info('auth.login.success', {
      email: maskEmail(user.email),
      userId: user.id,
      sessionId: session.id,
    });

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken,
      csrfToken,
    };
  }

  async logout(accessToken: string | null): Promise<void> {
    if (accessToken === null || accessToken === '') return;
    let claims: JwtClaims;
    try {
      claims = this.tokenIssuer.verify(accessToken);
    } catch {
      // Token invalid/expired — idempotent logout: cookies cleared by route, no row to revoke.
      return;
    }
    await this.repo.revokeSession(claims.sid);
    this.logger.info('auth.logout.success', {
      userId: claims.sub,
      sessionId: claims.sid,
    });
  }

  async refresh(refreshToken: string | null, ctx: SessionContext): Promise<RefreshResult> {
    if (refreshToken === null || refreshToken === '') {
      throw new AuthError('Missing refresh token');
    }

    const session = await this.repo.findActiveSessionByRefreshHash(hashToken(refreshToken));
    if (session === null) {
      throw new AuthError('Invalid or expired refresh token');
    }

    const user = await this.repo.findActiveUserById(session.userId);
    if (user === null) {
      throw new AuthError('User inactive');
    }

    const newRefresh = generateOpaqueToken(REFRESH_TOKEN_BYTES);
    const newCsrf = generateOpaqueToken(CSRF_TOKEN_BYTES);

    const rotated = await this.repo.rotateSession(
      session.id,
      this.buildSessionInput(user.id, newRefresh, newCsrf, ctx),
    );

    const accessToken = this.tokenIssuer.sign(this.claimsFor(user, rotated.id));

    this.logger.info('auth.refresh.success', {
      userId: user.id,
      oldSessionId: session.id,
      newSessionId: rotated.id,
    });

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken: newRefresh,
      csrfToken: newCsrf,
    };
  }

  private buildSessionInput(
    userId: string,
    refreshToken: string,
    csrfToken: string,
    ctx: SessionContext,
  ): SessionCreateInput {
    return {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      csrfToken,
      expiresAt: this.computeRefreshExpiry(),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    };
  }

  private computeRefreshExpiry(): Date {
    const seconds = ttlToSeconds(this.config.JWT_REFRESH_TTL, REFRESH_TTL_FALLBACK_SECONDS);
    return new Date(Date.now() + seconds * 1000);
  }

  private claimsFor(user: UserRow, sessionId: string): JwtClaims {
    return {
      sub: user.id,
      sid: sessionId,
      role: user.role,
      hotelId: user.hotelId,
      deptId: user.deptId,
    };
  }

  private toAuthUser(user: UserRow): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotel_id: user.hotelId,
      dept_id: user.deptId,
      language: user.language,
    };
  }
}

function generateOpaqueToken(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}
