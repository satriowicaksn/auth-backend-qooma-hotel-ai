import type { Prisma, PrismaClient } from '.prisma/client';

import type {
  AdminHotel,
  GmContact,
  GmUserSummary,
  HotelStatus,
  TierName,
} from './hotels.types.js';

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

export class UniqueConstraintError extends Error {
  override readonly name = 'UniqueConstraintError';
}

export interface CreateHotelWithGmInput {
  readonly hotel: {
    readonly name: string;
    readonly code: string;
    readonly tierId: string;
    readonly gmContact: GmContact;
  };
  readonly gm: {
    readonly email: string;
    readonly name: string;
    readonly passwordHash: string;
  };
}

export interface CreateHotelWithGmResult {
  readonly hotel: AdminHotel;
  readonly gmUser: GmUserSummary;
}

export interface UpdateHotelPatch {
  readonly name?: string;
  readonly tierId?: string;
  readonly gmContact?: GmContact;
}

type HotelWithRelations = Prisma.HotelGetPayload<{
  include: { tier: true; _count: { select: { users: true } } };
}>;

const HOTEL_INCLUDE = { tier: true, _count: { select: { users: true } } } as const;

export class AdminHotelsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findTierIdByName(name: string): Promise<string | null> {
    const tier = await this.db.tier.findUnique({ where: { name } });
    return tier === null ? null : tier.id;
  }

  async list(): Promise<AdminHotel[]> {
    const rows = await this.db.hotel.findMany({
      include: HOTEL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdminHotel);
  }

  async findById(id: string): Promise<AdminHotel | null> {
    const row = await this.db.hotel.findUnique({ where: { id }, include: HOTEL_INCLUDE });
    return row === null ? null : toAdminHotel(row);
  }

  async createHotelWithGm(input: CreateHotelWithGmInput): Promise<CreateHotelWithGmResult> {
    try {
      const result = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.hotel.create({
          data: {
            name: input.hotel.name,
            code: input.hotel.code,
            tierId: input.hotel.tierId,
            status: 'active',
            gmContact: { ...input.hotel.gmContact },
          },
        });
        const gmUser = await tx.user.create({
          data: {
            hotelId: created.id,
            email: input.gm.email,
            name: input.gm.name,
            role: 'gm_admin',
            passwordHash: input.gm.passwordHash,
            isActive: true,
            mustRotatePassword: true,
            language: 'id',
          },
        });

        const hotel = await tx.hotel.findUniqueOrThrow({
          where: { id: created.id },
          include: HOTEL_INCLUDE,
        });
        return { hotel, gmUser };
      });
      return {
        hotel: toAdminHotel(result.hotel),
        gmUser: {
          id: result.gmUser.id,
          email: result.gmUser.email,
          name: result.gmUser.name,
          role: 'gm_admin',
          hotel_id: result.hotel.id,
          must_rotate_password: result.gmUser.mustRotatePassword,
        },
      };
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new UniqueConstraintError('unique violation on hotels.code or users(hotel_id,email)');
      }
      throw err;
    }
  }

  async updateHotel(id: string, patch: UpdateHotelPatch): Promise<AdminHotel> {
    const row = await this.db.hotel.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.tierId !== undefined && { tierId: patch.tierId }),
        ...(patch.gmContact !== undefined && { gmContact: { ...patch.gmContact } }),
      },
      include: HOTEL_INCLUDE,
    });
    return toAdminHotel(row);
  }

  async suspendWithSessionCascade(id: string): Promise<AdminHotel> {
    const row = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.hotel.update({
        where: { id },
        data: { status: 'suspended' },
        include: HOTEL_INCLUDE,
      });
      await tx.session.updateMany({
        where: { user: { hotelId: id }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
    return toAdminHotel(row);
  }

  async reactivate(id: string): Promise<AdminHotel> {
    const row = await this.db.hotel.update({
      where: { id },
      data: { status: 'active' },
      include: HOTEL_INCLUDE,
    });
    return toAdminHotel(row);
  }

  /**
   * Hard-delete a hotel and everything the auth DB owns for it. The
   * Hotel→User FK is `onDelete: Restrict`, so the hotel cannot be removed while
   * users reference it — its users are deleted first, which cascades their
   * sessions + password-reset tokens (`onDelete: Cascade`). Wrapped in one
   * transaction so a hotel is never left with a partially-purged user set.
   *
   * NOTE (cross-service): auth owns only hotels/users/sessions here. Data in
   * other services keyed by this hotel id (core: tickets/guests/departments,
   * integration, ai) is NOT touched — there is no cross-database FK. Purge those
   * separately if a full tenant wipe is required.
   */
  async deleteHotel(id: string): Promise<void> {
    await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.deleteMany({ where: { hotelId: id } });
      await tx.hotel.delete({ where: { id } });
    });
  }
}

function isPrismaUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === PRISMA_UNIQUE_CONSTRAINT_CODE;
}

function toAdminHotel(row: HotelWithRelations): AdminHotel {
  const gm = row.gmContact as unknown as GmContact;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    tier: row.tier.name as TierName,
    status: row.status as HotelStatus,
    gm_contact: { name: gm.name, email: gm.email, phone: gm.phone },
    created_at: row.createdAt.toISOString(),
    agent_count: 0,
    user_count: row._count.users,
  };
}
