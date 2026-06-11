import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIES } from '@/lib/auth';
import { ROLES } from '@/lib/config';
import type { Role } from '@/lib/config';

// Role → dashboard path (mirrors roleDashboardPath from lib/router — duplicated
// here because middleware runs on the edge and cannot import from lib/router safely)
const ROLE_PATHS: Record<Role, string> = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.ORG_ADMIN]: 'org-admin',
  [ROLES.DOCTOR]: 'doctor',
  [ROLES.NURSE]: 'nurse',
  [ROLES.RECEPTIONIST]: 'receptionist',
  [ROLES.PATIENT]: 'patient',
};

// URL segments that are dashboard routes (not org slugs)
const DASHBOARD_SEGMENTS = new Set(['doctor', 'nurse', 'receptionist', 'patient', 'org-admin', 'superadmin']);

function isDashboardRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  // /superadmin or /superadmin/*
  if (parts[0] === 'superadmin') return true;
  // /[slug]/doctor, /[slug]/nurse, etc.
  if (parts.length >= 2 && DASHBOARD_SEGMENTS.has(parts[1])) return true;
  return false;
}

function isSigninRoute(pathname: string): boolean {
  return pathname === '/signin' ||
    pathname === '/superadmin/signin' ||
    pathname.endsWith('/signin');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS)?.value;
  const userRaw = request.cookies.get(AUTH_COOKIES.USER)?.value;

  // Let Next.js internals, static files, and API routes through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.\w+$/)
  ) {
    return NextResponse.next();
  }

  // Guard dashboard routes — redirect to signin if no token
  if (isDashboardRoute(pathname) && !accessToken) {
    const parts = pathname.split('/').filter(Boolean);
    const isOrgScoped = parts.length >= 2 && !DASHBOARD_SEGMENTS.has(parts[0]) && parts[0] !== 'superadmin';
    const signinUrl = isOrgScoped
      ? new URL(`/${parts[0]}/signin`, request.url)
      : new URL('/signin', request.url);
    return NextResponse.redirect(signinUrl);
  }

  // Redirect authenticated users away from signin pages to their dashboard
  if (accessToken && userRaw && isSigninRoute(pathname)) {
    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as { role: Role; organization_slug?: string };
      const roleBase = ROLE_PATHS[user.role];
      if (roleBase) {
        const dest = user.role === ROLES.SUPERADMIN
          ? '/superadmin'
          : `/${user.organization_slug}/${roleBase}`;
        return NextResponse.redirect(new URL(dest, request.url));
      }
    } catch {
      // Malformed user cookie — let them through to sign in again
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets).*)'],
};