import type { Logger } from 'winston';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import type { PasswordHasherPort } from '@modules/auth/ports/password-hasher.port.js';
import type { Session } from '@shared/types/fastify-augmentation.js';
import { generatePassword } from '@shared/utils/crypto.js';
import { maskEmail } from '@shared/utils/masking.js';

import {
  type AdminHotelsRepository,
  UniqueConstraintError,
  type UpdateHotelPatch,
} from './hotels.repository.js';
import type {
  CreateHotelRequestDto,
  UpdateHotelRequestDto,
  UpdateStatusRequestDto,
} from './hotels.schema.js';
import type { AdminHotel, GmUserSummary } from './hotels.types.js';
import type { HotelBootstrapNotifierPort } from './ports/hotel-bootstrap-notifier.port.js';

const GENERATED_PASSWORD_LENGTH = 16;

export interface ListHotelsResult {
  readonly data: AdminHotel[];
  readonly meta: { readonly total: number };
}

export interface CreateHotelResult {
  readonly hotel: AdminHotel;
  readonly gm_user: GmUserSummary;
  readonly generated_password: string;
}

export class AdminHotelsService {
  constructor(
    private readonly repo: AdminHotelsRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly logger: Logger,
    private readonly bootstrapNotifier?: HotelBootstrapNotifierPort,
  ) {}

  async listHotels(session: Session | undefined): Promise<ListHotelsResult> {
    this.assertSuperAdmin(session);
    const data = await this.repo.list();
    return { data, meta: { total: data.length } };
  }

  async getHotel(session: Session | undefined, id: string): Promise<AdminHotel> {
    this.assertSuperAdmin(session);
    const hotel = await this.repo.findById(id);
    if (hotel === null) {
      throw new NotFoundError('Hotel', id);
    }
    return hotel;
  }

  async createHotel(
    session: Session | undefined,
    input: CreateHotelRequestDto,
  ): Promise<CreateHotelResult> {
    this.assertSuperAdmin(session);

    const tierId = await this.repo.findTierIdByName(input.tier);
    if (tierId === null) {
      throw new ValidationError('Unknown tier', { tier: input.tier });
    }

    // Generate + hash the GM password BEFORE the transaction (per
    // MVP-AUTH-FIRST §4.5) so it is available for the response regardless of
    // tx retries.
    const generated = generatePassword(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.hasher.hash(generated);

    let created: { hotel: AdminHotel; gmUser: GmUserSummary };
    try {
      created = await this.repo.createHotelWithGm({
        hotel: {
          name: input.name,
          code: input.code,
          tierId,
          gmContact: input.gm_contact,
        },
        gm: {
          email: input.gm_contact.email,
          name: input.gm_contact.name,
          passwordHash,
        },
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictError('Hotel code or GM email already exists', {
          code: input.code,
          email: maskEmail(input.gm_contact.email),
        });
      }
      throw err;
    }

    this.logger.info('admin.hotels.created', {
      hotelId: created.hotel.id,
      code: created.hotel.code,
      tier: created.hotel.tier,
      gmEmail: maskEmail(created.gmUser.email),
    });

    if (this.bootstrapNotifier !== undefined) {
      try {
        await this.bootstrapNotifier.notify(created.hotel.id);
      } catch (err) {
        this.logger.warn('admin.hotels.bootstrap_notify_failed', {
          hotelId: created.hotel.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { hotel: created.hotel, gm_user: created.gmUser, generated_password: generated };
  }

  async updateHotel(
    session: Session | undefined,
    id: string,
    patch: UpdateHotelRequestDto,
  ): Promise<AdminHotel> {
    this.assertSuperAdmin(session);

    const existing = await this.repo.findById(id);
    if (existing === null) {
      throw new NotFoundError('Hotel', id);
    }

    let tierId: string | undefined;
    if (patch.tier !== undefined) {
      const resolved = await this.repo.findTierIdByName(patch.tier);
      if (resolved === null) {
        throw new ValidationError('Unknown tier', { tier: patch.tier });
      }
      tierId = resolved;
    }

    const repoPatch: UpdateHotelPatch = {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(tierId !== undefined && { tierId }),
      ...(patch.gm_contact !== undefined && { gmContact: patch.gm_contact }),
    };

    const updated = await this.repo.updateHotel(id, repoPatch);
    this.logger.info('admin.hotels.updated', { hotelId: id, fields: Object.keys(patch) });
    return updated;
  }

  async setHotelStatus(
    session: Session | undefined,
    id: string,
    input: UpdateStatusRequestDto,
  ): Promise<AdminHotel> {
    this.assertSuperAdmin(session);

    const existing = await this.repo.findById(id);
    if (existing === null) {
      throw new NotFoundError('Hotel', id);
    }

    const updated =
      input.status === 'suspended'
        ? await this.repo.suspendWithSessionCascade(id)
        : await this.repo.reactivate(id);

    this.logger.info('admin.hotels.status_changed', { hotelId: id, status: input.status });
    return updated;
  }

  /**
   * Hard-delete a hotel (super_admin only). The CRM surfaces only suspend/
   * reactivate; this platform-level endpoint permanently removes the hotel and
   * its auth-owned records. Irreversible — see the repository note on
   * cross-service data that is intentionally left untouched.
   */
  async deleteHotel(session: Session | undefined, id: string): Promise<void> {
    this.assertSuperAdmin(session);

    const existing = await this.repo.findById(id);
    if (existing === null) {
      throw new NotFoundError('Hotel', id);
    }

    await this.repo.deleteHotel(id);
    this.logger.info('admin.hotels.deleted', { hotelId: id, code: existing.code });
  }

  private assertSuperAdmin(session: Session | undefined): void {
    if (session === undefined || session.role !== 'super_admin') {
      throw new ForbiddenError('This endpoint requires super_admin scope', {
        actualRole: session?.role ?? null,
      });
    }
  }
}
