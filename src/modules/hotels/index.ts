// Public API barrel for the hotels module. External consumers (e.g.
// src/entrypoints/api.ts) import from here; internal files use relative
// paths. Routes/service/repository land in subsequent scaffold commits.

export { HotelsRepository } from './hotels.repository.js';
export { HotelsService } from './hotels.service.js';
export { UpdateSettingsRequestSchema } from './hotels.schema.js';

export type { UpdateSettingsRequestDto } from './hotels.schema.js';
export type {
  HotelContext,
  HotelContextScoped,
  HotelContextSuperAdmin,
  HotelSettings,
  HotelSettingsPatch,
  HotelStatus,
  HotelTierRef,
} from './hotels.types.js';
