import { randomBytes } from 'node:crypto';

import type { Logger } from 'winston';

import type { AppConfig } from '@core/config/env.js';
import { AuthError, ValidationError } from '@core/errors/app-errors.js';

import { hashToken } from '@shared/utils/crypto.js';
import { maskEmail } from '@shared/utils/masking.js';

import { ttlToSeconds } from './auth.cookie-helpers.js';
import { BusinessRuleError } from './auth.errors.js';
import type { AuthRepository, SessionCreateInput, UserRow } from './auth.repository.js';
import { evaluatePasswordPolicy, type LoginRequestDto } from './auth.schema.js';
import type { TokenIssuer } from './auth.token-issuer.js';
import type { AuthUser, JwtClaims, Language, SessionContext } from './auth.types.js';
import type { PasswordHasherPort } from './ports/password-hasher.port.js';

export interface LoginResult {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly csrfToken: string;
}

export type RefreshResult = LoginResult;

export interface MeResult {
  readonly user: AuthUser;
  readonly csrfToken: string;
}

export interface UpdateMeLanguageResult {
  readonly user: AuthUser;
}

export interface RotatePasswordResult {
  readonly success: true;
}

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

  async getMe(claims: JwtClaims): Promise<MeResult> {
    const user = await this.repo.findUserById(claims.sub);
    if (user === null || !user.isActive) {
      throw new AuthError('Invalid session');
    }
    const csrfToken = generateOpaqueToken(CSRF_TOKEN_BYTES);
    await this.repo.rotateCsrfToken(claims.sid, csrfToken);
    return { user: this.toAuthUser(user), csrfToken };
  }

  async updateMeLanguage(claims: JwtClaims, language: Language): Promise<UpdateMeLanguageResult> {
    const user = await this.repo.updateUserLanguage(claims.sub, language);
    return { user: this.toAuthUser(user) };
  }

  async rotatePassword(
    claims: JwtClaims,
    currentPassword: string,
    newPassword: string,
  ): Promise<RotatePasswordResult> {
    const user = await this.repo.findUserById(claims.sub);
    if (user === null || !user.isActive) {
      throw new AuthError('Invalid session');
    }

    const ok = await this.hasher.verify(user.passwordHash, currentPassword);
    if (!ok) {
      this.logger.info('auth.rotatePassword.rejected', {
        email: maskEmail(user.email),
        userId: user.id,
        reason: 'wrong_current',
      });
      // 422 BUSINESS_RULE per spec 01-auth-identity §1.1 line 90. NOT 401 —
      // the session JWT already authenticated; this is an authorized user
      // failing a business rule, not an auth failure.
      throw new BusinessRuleError('Invalid current password');
    }

    const failedRules = evaluatePasswordPolicy(newPassword);
    if (failedRules.length > 0) {
      throw new ValidationError('new_password fails policy', { failed: failedRules });
    }

    const newHash = await this.hasher.hash(newPassword);
    await this.repo.updateUserPassword(user.id, newHash);

    try {
      const { revokedCount } = await this.repo.revokeAllOtherSessions(user.id, claims.sid);
      this.logger.info('auth.rotatePassword.success', {
        email: maskEmail(user.email),
        userId: user.id,
        sessionId: claims.sid,
        revokedSessions: revokedCount,
      });
    } catch (err) {
      // Best-effort sweep per ACK ruling: log + continue. Password rotation
      // must succeed even if the sweep hiccups; max access-TTL caps stale
      // tokens at 15min per D04.
      this.logger.warn('auth.rotatePassword.sweep_failed', {
        userId: user.id,
        sessionId: claims.sid,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }

    return { success: true };
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
      must_rotate_password: user.mustRotatePassword,
    };
  }
}

function generateOpaqueToken(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}
