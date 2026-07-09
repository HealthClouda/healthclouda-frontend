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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  domain?: string;
  is_active: boolean;
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