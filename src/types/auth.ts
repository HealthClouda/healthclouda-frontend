import type { Role } from '@/lib/config';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  organization_slug?: string;
  organization_name?: string;
  // Present on /auth/me/ for DOCTOR/NURSE only (GLOBAL-4, shipped 2026-07-09);
  // keys omitted entirely for other roles.
  is_on_duty?: boolean;
  duty_toggled_at?: string | null;
}

// Public org branding/profile — GET /org/by-slug/<slug>/ (verified live
// 2026-07-13 against the seeded local backend; the prod schema docstring is
// stale). Real response has logo_url (NOT logo), clinic contact fields
// (nullable until the org fills them in), and NO id/is_active.
export interface Organization {
  name: string;
  slug: string;
  org_id: string;
  org_type: string;
  city: string | null;
  state: string | null;
  country_name: string | null;
  logo_url: string | null;
  page_title: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_hours: string | null;
  clinic_phone: string | null;
  clinic_email: string | null;
  emergency_phone: string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiError {
  detail?: string;
  org_slug?: string;
  redirect_url?: string;
  [key: string]: unknown;
}