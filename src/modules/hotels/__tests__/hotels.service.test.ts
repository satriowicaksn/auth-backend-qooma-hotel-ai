import { describe, expect, it, jest } from '@jest/globals';

import { ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session, TenantScope } from '@shared/types/fastify-augmentation.js';

import type { HotelsRepository } from '../hotels.repository.js';
import { HotelsService } from '../hotels.service.js';
import type { HotelContextScoped, HotelSettings } from '../hotels.types.js';

const HOTEL_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

function aSession(overrides: Partial<Session> = {}): Session {
  return {
    userId: USER_ID,
    role: 'gm_admin',
    hotelId: HOTEL_ID,
    deptId: null,
    ...overrides,
  };
}

function aHotelContextScoped(overrides: Partial<HotelContextScoped> = {}): HotelContextScoped {
  return {
    id: HOTEL_ID,
    name: 'Test Hotel',
    tier: { id: 'tier-1', name: 'lite' },
    status: 'active',
    timezone: 'Asia/Jakarta',
    branding: null,
    dnd: null,
    ...overrides,
  };
}

function aSettings(overrides: Partial<HotelSettings> = {}): HotelSettings {
  return {
    timezone: 'Asia/Jakarta',
    branding: null,
    dnd: null,
    ...overrides,
  };
}

interface RepoMock {
  readonly findHotelById: jest.Mock<HotelsRepository['findHotelById']>;
  readonly findSettingsByHotelId: jest.Mock<HotelsRepository['findSettingsByHotelId']>;
  readonly updateSettings: jest.Mock<HotelsRepository['updateSettings']>;
}

function buildRepoMock(overrides: Partial<RepoMock> = {}): {
  repo: HotelsRepository;
  mock: RepoMock;
} {
  const mock: RepoMock = {
    findHotelById: overrides.findHotelById ?? jest.fn<HotelsRepository['findHotelById']>(),
    findSettingsByHotelId:
      overrides.findSettingsByHotelId ?? jest.fn<HotelsRepository['findSettingsByHotelId']>(),
    updateSettings: overrides.updateSettings ?? jest.fn<HotelsRepository['updateSettings']>(),
  };
  return { repo: mock as unknown as HotelsRepository, mock };
}

// --- getHotelContextForSession ------------------------------------------

describe('HotelsService.getHotelContextForSession', () => {
  it('should return literal {id:null, tier:null} for super_admin (all-hotels scope, option (b))', async () => {
    const { repo, mock } = buildRepoMock();
    const svc = new HotelsService(repo);

    const result = await svc.getHotelContextForSession(
      aSession({ role: 'super_admin', hotelId: null }),
      { type: 'all-hotels' },
    );

    expect(result).toEqual({ id: null, tier: null });
    expect(mock.findHotelById).not.toHaveBeenCalled();
  });

  it('should call repo.findHotelById with scope.hotelId for gm_admin (single-hotel)', async () => {
    const ctx = aHotelContextScoped();
    const { repo, mock } = buildRepoMock({
      findHotelById: jest.fn<HotelsRepository['findHotelById']>().mockResolvedValue(ctx),
    });
    const svc = new HotelsService(repo);

    const result = await svc.getHotelContextForSession(aSession(), {
      type: 'single-hotel',
      hotelId: HOTEL_ID,
    });

    expect(result).toEqual(ctx);
    expect(mock.findHotelById).toHaveBeenCalledWith(HOTEL_ID);
  });

  it('should call repo.findHotelById for dept_head (single-hotel scope passes)', async () => {
    const { repo, mock } = buildRepoMock({
      findHotelById: jest
        .fn<HotelsRepository['findHotelById']>()
        .mockResolvedValue(aHotelContextScoped()),
    });
    const svc = new HotelsService(repo);

    await svc.getHotelContextForSession(aSession({ role: 'dept_head' }), {
      type: 'single-hotel',
      hotelId: HOTEL_ID,
    });

    expect(mock.findHotelById).toHaveBeenCalledWith(HOTEL_ID);
  });

  it('should call repo.findHotelById for staff (single-hotel scope passes)', async () => {
    const { repo, mock } = buildRepoMock({
      findHotelById: jest
        .fn<HotelsRepository['findHotelById']>()
        .mockResolvedValue(aHotelContextScoped()),
    });
    const svc = new HotelsService(repo);

    await svc.getHotelContextForSession(aSession({ role: 'staff' }), {
      type: 'single-hotel',
      hotelId: HOTEL_ID,
    });

    expect(mock.findHotelById).toHaveBeenCalledWith(HOTEL_ID);
  });

  it('should throw ForbiddenError when session is undefined', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(
      svc.getHotelContextForSession(undefined, { type: 'all-hotels' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should throw ForbiddenError when tenantScope is undefined', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(svc.getHotelContextForSession(aSession(), undefined)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('should throw NotFoundError when repo returns null (hotel missing)', async () => {
    const { repo } = buildRepoMock({
      findHotelById: jest.fn<HotelsRepository['findHotelById']>().mockResolvedValue(null),
    });
    const svc = new HotelsService(repo);

    await expect(
      svc.getHotelContextForSession(aSession(), { type: 'single-hotel', hotelId: HOTEL_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// --- getSettings ---------------------------------------------------------

describe('HotelsService.getSettings', () => {
  const scope: TenantScope = { type: 'single-hotel', hotelId: HOTEL_ID };

  it('should return settings for gm_admin caller', async () => {
    const settings = aSettings({ timezone: 'Asia/Singapore' });
    const { repo, mock } = buildRepoMock({
      findSettingsByHotelId: jest
        .fn<HotelsRepository['findSettingsByHotelId']>()
        .mockResolvedValue(settings),
    });
    const svc = new HotelsService(repo);

    const result = await svc.getSettings(aSession(), scope);

    expect(result).toEqual(settings);
    expect(mock.findSettingsByHotelId).toHaveBeenCalledWith(HOTEL_ID);
  });

  it('should throw ForbiddenError for dept_head', async () => {
    const { repo, mock } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(svc.getSettings(aSession({ role: 'dept_head' }), scope)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(mock.findSettingsByHotelId).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError for staff', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(svc.getSettings(aSession({ role: 'staff' }), scope)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('should throw ForbiddenError with /api/admin/hotels redirect message for super_admin', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    let caught: unknown;
    try {
      await svc.getSettings(aSession({ role: 'super_admin', hotelId: null }), {
        type: 'all-hotels',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ForbiddenError);
    expect((caught as ForbiddenError).message).toContain('/api/admin/hotels');
  });

  it('should throw NotFoundError when repo returns null (hotel missing)', async () => {
    const { repo } = buildRepoMock({
      findSettingsByHotelId: jest
        .fn<HotelsRepository['findSettingsByHotelId']>()
        .mockResolvedValue(null),
    });
    const svc = new HotelsService(repo);

    await expect(svc.getSettings(aSession(), scope)).rejects.toBeInstanceOf(NotFoundError);
  });
});

// --- updateSettings ------------------------------------------------------

describe('HotelsService.updateSettings', () => {
  const scope: TenantScope = { type: 'single-hotel', hotelId: HOTEL_ID };

  it('should call repo.updateSettings and return its result for gm_admin', async () => {
    const updated = aSettings({ timezone: 'Asia/Singapore', branding: { logo: 'x' } });
    const { repo, mock } = buildRepoMock({
      updateSettings: jest.fn<HotelsRepository['updateSettings']>().mockResolvedValue(updated),
    });
    const svc = new HotelsService(repo);

    const result = await svc.updateSettings(aSession(), scope, {
      timezone: 'Asia/Singapore',
      branding: { logo: 'x' },
    });

    expect(result).toEqual(updated);
    expect(mock.updateSettings).toHaveBeenCalledWith(HOTEL_ID, {
      timezone: 'Asia/Singapore',
      branding: { logo: 'x' },
    });
  });

  it('should throw ForbiddenError with /api/admin/hotels redirect message for super_admin', async () => {
    const { repo, mock } = buildRepoMock();
    const svc = new HotelsService(repo);

    let caught: unknown;
    try {
      await svc.updateSettings(
        aSession({ role: 'super_admin', hotelId: null }),
        { type: 'all-hotels' },
        { timezone: 'Asia/Singapore' },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ForbiddenError);
    expect((caught as ForbiddenError).message).toContain('/api/admin/hotels');
    expect(mock.updateSettings).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError for dept_head', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(
      svc.updateSettings(aSession({ role: 'dept_head' }), scope, { timezone: 'Asia/Jakarta' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should throw ForbiddenError for staff', async () => {
    const { repo } = buildRepoMock();
    const svc = new HotelsService(repo);

    await expect(
      svc.updateSettings(aSession({ role: 'staff' }), scope, { timezone: 'Asia/Jakarta' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should pass branding:null through to repo (clear semantic)', async () => {
    const { repo, mock } = buildRepoMock({
      updateSettings: jest.fn<HotelsRepository['updateSettings']>().mockResolvedValue(aSettings()),
    });
    const svc = new HotelsService(repo);

    await svc.updateSettings(aSession(), scope, { branding: null });

    expect(mock.updateSettings).toHaveBeenCalledWith(HOTEL_ID, { branding: null });
  });
});
