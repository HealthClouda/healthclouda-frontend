import type { Role } from '@/lib/config';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  organization_slug?: string;
  organization_name?: string;
  is_on_duty?: boolean;
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