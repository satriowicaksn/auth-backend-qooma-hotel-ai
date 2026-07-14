/**
 * Cross-slot execution per §4-D09 (Slot C canonical territory).
 *
 * HotelsRepository — Prisma-direct per CLAUDE.md §4 hexagonal disiplin
 * (no port wrap for DB). Consumed by HotelsService; instantiated at the
 * wiring boundary (src/entrypoints/api.ts) per ADR-0001.
 */

// Import from the generated `.prisma/client` path (NOT `@prisma/client`)
// for the same reason as auth.repository.ts + users.repository.ts: pnpm
// hoists the `@prisma/client` package whose default.d.ts is a stub;
// direct generated-path import picks up the real shapes (T02 cycle-6
// Q-B-02(b) inline resolution).
import { Prisma, type PrismaClient } from '.prisma/client';

import type {
  HotelContextScoped,
  HotelSettings,
  HotelSettingsPatch,
  HotelStatus,
} from './hotels.types.js';

type HotelWithTier = Prisma.HotelGetPayload<{ include: { tier: true } }>;
type HotelSettingsRow = {
  readonly name: string;
  readonly timezone: string;
  readonly welcomeMessage: string | null;
  readonly branding: Prisma.JsonValue | null;
  readonly dnd: Prisma.JsonValue | null;
};

export class HotelsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findHotelById(id: string): Promise<HotelContextScoped | null> {
    const row = await this.db.hotel.findUnique({
      where: { id },
      include: { tier: true },
    });
    return row === null ? null : toHotelContextScoped(row);
  }

  async findSettingsByHotelId(id: string): Promise<HotelSettings | null> {
    const row = await this.db.hotel.findUnique({
      where: { id },
      select: { name: true, timezone: true, welcomeMessage: true, branding: true, dnd: true },
    });
    return row === null ? null : toHotelSettings(row);
  }

  async updateSettings(id: string, patch: HotelSettingsPatch): Promise<HotelSettings> {
    const data: Prisma.HotelUpdateInput = {};
    if (patch.timezone !== undefined) {
      data.timezone = patch.timezone;
    }
    if (patch.branding !== undefined) {
      // Prisma.DbNull sets the SQL column to NULL; passing a plain object
      // writes the JSON value. Mirrors admin/hotels gmContact handling
      // pattern at admin/hotels/hotels.repository.ts:125.
      data.branding =
        patch.branding === null ? Prisma.DbNull : (patch.branding as Prisma.InputJsonValue);
    }
    if (patch.dnd !== undefined) {
      data.dnd = patch.dnd === null ? Prisma.DbNull : (patch.dnd as Prisma.InputJsonValue);
    }
    if (patch.name !== undefined) {
      data.name = patch.name;
    }
    if (patch.welcome_message !== undefined) {
      data.welcomeMessage = patch.welcome_message === null ? null : patch.welcome_message;
    }
    const row = await this.db.hotel.update({
      where: { id },
      data,
      select: { name: true, timezone: true, welcomeMessage: true, branding: true, dnd: true },
    });
    return toHotelSettings(row);
  }
}

function toHotelContextScoped(row: HotelWithTier): HotelContextScoped {
  return {
    id: row.id,
    name: row.name,
    tier: { id: row.tier.id, name: row.tier.name },
    status: row.status as HotelStatus,
    timezone: row.timezone,
    branding: row.branding as unknown as Record<string, unknown> | null,
    dnd: row.dnd as unknown as Record<string, unknown> | null,
  };
}

function toHotelSettings(row: HotelSettingsRow): HotelSettings {
  return {
    name: row.name,
    timezone: row.timezone,
    welcome_message: row.welcomeMessage ?? null,
    branding: row.branding as unknown as Record<string, unknown> | null,
    dnd: row.dnd as unknown as Record<string, unknown> | null,
  };
}
