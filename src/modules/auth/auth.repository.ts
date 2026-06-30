// Import from generated path (`.prisma/client`) instead of `@prisma/client` to
// pick up model types (`User`, `Session`) — pnpm hoists `@prisma/client` to an
// isolated location whose default.d.ts is a stub without model types.
import type {
  Prisma,
  PrismaClient,
  Session as PrismaSession,
  User as PrismaUser,
} from '.prisma/client';

import type { Language, Role } from './auth.types.js';

export interface RevokeOthersResult {
  readonly revokedCount: number;
}

export interface UserRow {
  readonly id: string;
  readonly hotelId: string | null;
  readonly deptId: string | null;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly role: Role;
  readonly language: Language;
  readonly isActive: boolean;
  readonly mustRotatePassword: boolean;
}

export interface SessionRow {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly csrfToken: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface SessionCreateInput {
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly csrfToken: string;
  readonly expiresAt: Date;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findActiveUserByEmail(email: string): Promise<UserRow | null> {
    const row = await this.db.user.findFirst({ where: { email, isActive: true } });
    return row === null ? null : this.toUserRow(row);
  }

  async findActiveUserById(id: string): Promise<UserRow | null> {
    const row = await this.db.user.findFirst({ where: { id, isActive: true } });
    return row === null ? null : this.toUserRow(row);
  }

  async createSession(input: SessionCreateInput): Promise<SessionRow> {
    const row = await this.db.session.create({
      data: {
        userId: input.userId,
        refreshToken: input.refreshTokenHash,
        csrfToken: input.csrfToken,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });
    return this.toSessionRow(row);
  }

  async findActiveSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRow | null> {
    const row = await this.db.session.findFirst({
      where: {
        refreshToken: refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return row === null ? null : this.toSessionRow(row);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotateSession(oldSessionId: string, next: SessionCreateInput): Promise<SessionRow> {
    const row = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.session.update({
        where: { id: oldSessionId },
        data: { revokedAt: new Date() },
      });
      return tx.session.create({
        data: {
          userId: next.userId,
          refreshToken: next.refreshTokenHash,
          csrfToken: next.csrfToken,
          expiresAt: next.expiresAt,
          userAgent: next.userAgent,
          ipAddress: next.ipAddress,
        },
      });
    });
    return this.toSessionRow(row);
  }

  async touchUserLastLogin(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row === null ? null : this.toUserRow(row);
  }

  /**
   * Atomic password rotation: write new hash AND clear `must_rotate_password`
   * in one query. Used by `POST /api/auth/me/password`; the flag-clear is the
   * gate's release per spec MVP-AUTH-FIRST §4.2.
   */
  async updateUserPassword(userId: string, newHash: string): Promise<UserRow> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustRotatePassword: false },
    });
    return this.toUserRow(row);
  }

  async updateUserLanguage(userId: string, language: Language): Promise<UserRow> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: { language },
    });
    return this.toUserRow(row);
  }

  async rotateCsrfToken(sessionId: string, newCsrfToken: string): Promise<void> {
    await this.db.session.update({
      where: { id: sessionId },
      data: { csrfToken: newCsrfToken },
    });
  }

  /**
   * Best-effort sweep: revoke every active session for the user EXCEPT the
   * `exceptSessionId` (the current request's session). Caller logs + ignores
   * failures — password rotation must not fail because the sweep hit a hiccup
   * (max 15min access TTL per D04 caps the stale-token window).
   */
  async revokeAllOtherSessions(
    userId: string,
    exceptSessionId: string,
  ): Promise<RevokeOthersResult> {
    const result = await this.db.session.updateMany({
      where: {
        userId,
        id: { not: exceptSessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count };
  }

  private toUserRow(row: PrismaUser): UserRow {
    return {
      id: row.id,
      hotelId: row.hotelId,
      deptId: row.deptId,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      role: row.role as Role,
      language: row.language as Language,
      isActive: row.isActive,
      mustRotatePassword: row.mustRotatePassword,
    };
  }

  private toSessionRow(row: PrismaSession): SessionRow {
    return {
      id: row.id,
      userId: row.userId,
      refreshTokenHash: row.refreshToken,
      csrfToken: row.csrfToken,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    };
  }
}
