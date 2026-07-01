import { describe, expect, it, jest } from '@jest/globals';

import { ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { Session } from '@shared/types/fastify-augmentation.js';

import type { AdminTiersRepository } from '../admin-tiers.repository.js';
import { AdminTiersService } from '../admin-tiers.service.js';
import type { AdminTier } from '../admin-tiers.types.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function aSuperAdminSession(): Session {
  return { userId: USER_ID, role: 'super_admin', hotelId: null, deptId: null };
}

function aTier(overrides: Partial<AdminTier> = {}): AdminTier {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'lite',
    display_name: 'Lite',
    outbound_quota_monthly: 2000,
    agent_cap: 1,
    agent_minimum: 3,
    user_cap: 2,
    department_cap: 1,
    features: {},
    is_custom: false,
    ...overrides,
  };
}

interface RepoMock {
  readonly listTiers: jest.Mock<AdminTiersRepository['listTiers']>;
  readonly findTierByName: jest.Mock<AdminTiersRepository['findTierByName']>;
}

function buildRepoMock(overrides: Partial<RepoMock> = {}): {
  repo: AdminTiersRepository;
  mock: RepoMock;
} {
  const mock: RepoMock = {
    listTiers: overrides.listTiers ?? jest.fn<AdminTiersRepository['listTiers']>(),
    findTierByName: overrides.findTierByName ?? jest.fn<AdminTiersRepository['findTierByName']>(),
  };
  return { repo: mock as unknown as AdminTiersRepository, mock };
}

describe('AdminTiersService.listTiers', () => {
  it('should return { tiers: [...] } for super_admin', async () => {
    const tiers = [aTier(), aTier({ name: 'professional' })];
    const { repo, mock } = buildRepoMock({
      listTiers: jest.fn<AdminTiersRepository['listTiers']>().mockResolvedValue(tiers),
    });
    const svc = new AdminTiersService(repo);

    const result = await svc.listTiers(aSuperAdminSession());

    expect(result).toEqual({ tiers });
    expect(mock.listTiers).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['gm_admin', 'gm_admin' as const, '33333333-3333-3333-3333-333333333333'],
    ['dept_head', 'dept_head' as const, '33333333-3333-3333-3333-333333333333'],
    ['staff', 'staff' as const, '33333333-3333-3333-3333-333333333333'],
  ])('should throw ForbiddenError for role="%s"', async (_label, role, hotelId) => {
    const { repo } = buildRepoMock();
    const svc = new AdminTiersService(repo);

    await expect(
      svc.listTiers({ userId: USER_ID, role, hotelId, deptId: null }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should throw ForbiddenError when session is undefined', async () => {
    const { repo } = buildRepoMock();
    const svc = new AdminTiersService(repo);

    await expect(svc.listTiers(undefined)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('AdminTiersService.getTierByName', () => {
  it('should return the tier row for super_admin when found', async () => {
    const tier = aTier({ name: 'luxury' });
    const { repo, mock } = buildRepoMock({
      findTierByName: jest.fn<AdminTiersRepository['findTierByName']>().mockResolvedValue(tier),
    });
    const svc = new AdminTiersService(repo);

    const result = await svc.getTierByName(aSuperAdminSession(), 'luxury');

    expect(result).toEqual(tier);
    expect(mock.findTierByName).toHaveBeenCalledWith('luxury');
  });

  it('should throw NotFoundError when repo returns null', async () => {
    const { repo } = buildRepoMock({
      findTierByName: jest.fn<AdminTiersRepository['findTierByName']>().mockResolvedValue(null),
    });
    const svc = new AdminTiersService(repo);

    await expect(svc.getTierByName(aSuperAdminSession(), 'lite')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should throw ForbiddenError for non-super_admin role', async () => {
    const { repo, mock } = buildRepoMock();
    const svc = new AdminTiersService(repo);

    await expect(
      svc.getTierByName(
        { userId: USER_ID, role: 'gm_admin', hotelId: '333', deptId: null },
        'lite',
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mock.findTierByName).not.toHaveBeenCalled();
  });
});
