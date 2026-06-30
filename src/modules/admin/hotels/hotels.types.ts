export type TierName = 'lite' | 'professional' | 'luxury' | 'enterprise';
export type HotelStatus = 'active' | 'suspended';

export interface GmContact {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

export interface AdminHotel {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly tier: TierName;
  readonly status: HotelStatus;
  readonly gm_contact: GmContact;
  readonly created_at: string;
  readonly agent_count: number;
  readonly user_count: number;
}

export interface GmUserSummary {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'gm_admin';
  readonly hotel_id: string;
  readonly must_rotate_password: boolean;
}
