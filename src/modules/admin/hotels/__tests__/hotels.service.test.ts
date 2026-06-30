import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Logger } from 'winston';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import type { PasswordHasherPort } from '@modules/auth/ports/password-hasher.port.js';
import type { Session } from '@shared/types/fastify-augmentation.js';

import { type AdminHotelsRepository, UniqueConstraintError } from '../hotels.repository.js';
import { AdminHotelsService } from '../hotels.service.js';
import type { AdminHotel, GmUserSummary } from '../hotels.types.js';

function aSuperAdmin(): Session {
  return { userId: 'sa-1', role: 'super_admin', hotelId: null, deptId: null };
}

function aGmAdmin(): Session {
  return { userId: 'gm-1', role: 'gm_admin', hotelId: 'hotel-1', deptId: null };
}

function anAdminHotel(overrides: Partial<AdminHotel> = {}): AdminHotel {
  return {
    id: 'hotel-1',
    name: 'Aurora Bali Resort',
    code: 'ABR-001',
    tier: 'luxury',
    status: 'active',
    gm_contact: { name: 'Budi', email: 'gm@aurora.com', phone: '+628123456789' },
    created_at: '2026-01-15T08:00:00.000Z',
    agent_count: 0,
    user_count: 1,
    ...overrides,
  };
}

function aGmUser(): GmUserSummary {
  return {
    id: 'u-1',
    email: 'gm@aurora.com',
    name: 'Budi',
    role: 'gm_admin',
    hotel_id: 'hotel-1',
    must_rotate_password: true,
  };
}

function build(): {
  service: AdminHotelsService;
  repo: {
    findTierIdByName: jest.Mock<(name: string) => Promise<string | null>>;
    list: jest.Mock<() => Promise<AdminHotel[]>>;
    findById: jest.Mock<(id: string) => Promise<AdminHotel | null>>;
    createHotelWithGm: jest.Mock<() => Promise<{ hotel: AdminHotel; gmUser: GmUserSummary }>>;
    updateHotel: jest.Mock<() => Promise<AdminHotel>>;
    suspendWithSessionCascade: jest.Mock<(id: string) => Promise<AdminHotel>>;
    reactivate: jest.Mock<(id: string) => Promise<AdminHotel>>;
  };
  hasher: { hash: jest.Mock<(plain: string) => Promise<string>> };
} {
  const repo = {
    findTierIdByName: jest.fn<(name: string) => Promise<string | null>>(),
    list: jest.fn<() => Promise<AdminHotel[]>>(),
    findById: jest.fn<(id: string) => Promise<AdminHotel | null>>(),
    createHotelWithGm: jest.fn<() => Promise<{ hotel: AdminHotel; gmUser: GmUserSummary }>>(),
    updateHotel: jest.fn<() => Promise<AdminHotel>>(),
    suspendWithSessionCascade: jest.fn<(id: string) => Promise<AdminHotel>>(),
    reactivate: jest.fn<(id: string) => Promise<AdminHotel>>(),
  };
  const hasher = { hash: jest.fn<(plain: string) => Promise<string>>() };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const service = new AdminHotelsService(
    repo as unknown as AdminHotelsRepository,
    hasher as unknown as PasswordHasherPort,
    logger as unknown as Logger,
  );
  return { service, repo, hasher };
}

const VALID_CREATE = {
  name: 'Aurora Bali Resort',
  code: 'ABR-001',
  tier: 'luxury' as const,
  gm_contact: { name: 'Budi', email: 'gm@aurora.com', phone: '+628123456789' },
};

describe('AdminHotelsService', () => {
  let m: ReturnType<typeof build>;
  beforeEach(() => {
    m = build();
  });

  describe('authorization', () => {
    it('should throw ForbiddenError when caller is not super_admin', async () => {
      await expect(m.service.listHotels(aGmAdmin())).rejects.toBeInstanceOf(ForbiddenError);
      await expect(m.service.getHotel(aGmAdmin(), 'hotel-1')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(m.service.createHotel(aGmAdmin(), VALID_CREATE)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('should throw ForbiddenError when session is undefined', async () => {
      await expect(m.service.listHotels(undefined)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('listHotels', () => {
    it('should return data + meta.total for super_admin', async () => {
      m.repo.list.mockResolvedValue([anAdminHotel(), anAdminHotel({ id: 'hotel-2' })]);
      const result = await m.service.listHotels(aSuperAdmin());
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getHotel', () => {
    it('should return the hotel when found', async () => {
      m.repo.findById.mockResolvedValue(anAdminHotel());
      await expect(m.service.getHotel(aSuperAdmin(), 'hotel-1')).resolves.toMatchObject({
        id: 'hotel-1',
      });
    });
    it('should throw NotFoundError when absent', async () => {
      m.repo.findById.mockResolvedValue(null);
      await expect(m.service.getHotel(aSuperAdmin(), 'nope')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('createHotel', () => {
    it('should generate+hash a password, create atomically, and return generated_password once', async () => {
      m.repo.findTierIdByName.mockResolvedValue('tier-luxury');
      m.hasher.hash.mockResolvedValue('argon2$hashed');
      m.repo.createHotelWithGm.mockResolvedValue({ hotel: anAdminHotel(), gmUser: aGmUser() });

      const result = await m.service.createHotel(aSuperAdmin(), VALID_CREATE);

      expect(m.hasher.hash).toHaveBeenCalledTimes(1);
      expect(result.generated_password).toHaveLength(16);
      expect(result.gm_user.must_rotate_password).toBe(true);
      expect(result.hotel.code).toBe('ABR-001');
    });

    it('should throw ValidationError for an unknown tier', async () => {
      m.repo.findTierIdByName.mockResolvedValue(null);
      await expect(m.service.createHotel(aSuperAdmin(), VALID_CREATE)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(m.repo.createHotelWithGm).not.toHaveBeenCalled();
    });

    it('should map repo UniqueConstraintError to ConflictError', async () => {
      m.repo.findTierIdByName.mockResolvedValue('tier-luxury');
      m.hasher.hash.mockResolvedValue('argon2$hashed');
      m.repo.createHotelWithGm.mockRejectedValue(new UniqueConstraintError('dup'));
      await expect(m.service.createHotel(aSuperAdmin(), VALID_CREATE)).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe('updateHotel', () => {
    it('should throw NotFoundError when hotel absent', async () => {
      m.repo.findById.mockResolvedValue(null);
      await expect(
        m.service.updateHotel(aSuperAdmin(), 'nope', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should reject an unknown tier on update', async () => {
      m.repo.findById.mockResolvedValue(anAdminHotel());
      m.repo.findTierIdByName.mockResolvedValue(null);
      await expect(
        m.service.updateHotel(aSuperAdmin(), 'hotel-1', { tier: 'luxury' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should resolve tier + update when valid', async () => {
      m.repo.findById.mockResolvedValue(anAdminHotel());
      m.repo.findTierIdByName.mockResolvedValue('tier-pro');
      m.repo.updateHotel.mockResolvedValue(anAdminHotel({ tier: 'professional' }));
      const updated = await m.service.updateHotel(aSuperAdmin(), 'hotel-1', {
        name: 'New',
        tier: 'professional',
      });
      expect(updated.tier).toBe('professional');
      expect(m.repo.updateHotel).toHaveBeenCalledTimes(1);
    });
  });

  describe('setHotelStatus', () => {
    it('should call suspendWithSessionCascade on suspend', async () => {
      m.repo.findById.mockResolvedValue(anAdminHotel());
      m.repo.suspendWithSessionCascade.mockResolvedValue(anAdminHotel({ status: 'suspended' }));
      const result = await m.service.setHotelStatus(aSuperAdmin(), 'hotel-1', {
        status: 'suspended',
      });
      expect(result.status).toBe('suspended');
      expect(m.repo.suspendWithSessionCascade).toHaveBeenCalledWith('hotel-1');
      expect(m.repo.reactivate).not.toHaveBeenCalled();
    });

    it('should call reactivate on active', async () => {
      m.repo.findById.mockResolvedValue(anAdminHotel({ status: 'suspended' }));
      m.repo.reactivate.mockResolvedValue(anAdminHotel({ status: 'active' }));
      const result = await m.service.setHotelStatus(aSuperAdmin(), 'hotel-1', { status: 'active' });
      expect(result.status).toBe('active');
      expect(m.repo.reactivate).toHaveBeenCalledWith('hotel-1');
      expect(m.repo.suspendWithSessionCascade).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when hotel absent', async () => {
      m.repo.findById.mockResolvedValue(null);
      await expect(
        m.service.setHotelStatus(aSuperAdmin(), 'nope', { status: 'suspended' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
