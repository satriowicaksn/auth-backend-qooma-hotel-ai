export type Role = 'super_admin' | 'gm_admin' | 'dept_head' | 'staff';
export type Language = 'id' | 'en';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
  readonly hotel_id: string | null;
  readonly dept_id: string | null;
  readonly language: Language;
}

export interface JwtClaims {
  readonly sub: string;
  readonly sid: string;
  readonly role: Role;
  readonly hotelId: string | null;
  readonly deptId: string | null;
}

export interface SessionContext {
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}
