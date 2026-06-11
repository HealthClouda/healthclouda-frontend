import { ROLES, RESERVED_PATHS } from './config';
import type { Role } from './config';

export function roleDashboardPath(role: Role, orgSlug?: string): string {
  switch (role) {
    case ROLES.SUPERADMIN:
      return '/superadmin';
    case ROLES.ORG_ADMIN:
      return `/${orgSlug}/org-admin`;
    case ROLES.DOCTOR:
      return `/${orgSlug}/doctor`;
    case ROLES.NURSE:
      return `/${orgSlug}/nurse`;
    case ROLES.RECEPTIONIST:
      return `/${orgSlug}/receptionist`;
    case ROLES.PATIENT:
      return `/${orgSlug}/patient`;
    default:
      return '/signin';
  }
}

export function signinPath(orgSlug?: string, role?: Role): string {
  if (role === ROLES.SUPERADMIN) return '/superadmin/signin';
  if (orgSlug) return `/${orgSlug}/signin`;
  return '/signin';
}

export function isReservedPath(segment: string): boolean {
  return RESERVED_PATHS.has(segment.toLowerCase());
}

export function getOrgSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  if (isReservedPath(first)) return null;
  return first;
}

export function passwordFlowPath(
  step: 'forgot-password' | 'check-email' | 'reset-password' | 'password-success',
  orgSlug?: string,
): string {
  return orgSlug ? `/${orgSlug}/${step}` : `/${step}`;
}