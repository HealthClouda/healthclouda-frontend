import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_COOKIES,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/auth';
import { ROLES } from '@/lib/config';
import type { Role } from '@/lib/config';
import { refreshSessionTokens } from '@/lib/session-refresh';

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
  // A signin page is never a dashboard. This has to be checked first because
  // `/superadmin/signin` sits UNDER the `/superadmin` dashboard prefix — without
  // it, the guard below redirected the superadmin portal to `/signin` whenever
  // there was no session, i.e. exactly when someone needs to sign in. The
  // superadmin portal was unreachable and superadmins could not log in at all.
  if (isSigninRoute(pathname)) return false;

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  // /superadmin or /superadmin/*
  if (parts[0] === 'superadmin') return true;
  // /patient or /patient/* — slug-less, like superadmin (FLAG-210). Without
  // this, `patient` was read as an ORG SLUG and a logged-out visitor was sent
  // to `/patient/signin`, a portal for an organisation that does not exist.
  if (parts[0] === 'patient') return true;
  // /[slug]/doctor, /[slug]/nurse, etc.
  if (parts.length >= 2 && DASHBOARD_SEGMENTS.has(parts[1])) return true;
  return false;
}

function isSigninRoute(pathname: string): boolean {
  return pathname === '/signin' ||
    pathname === '/superadmin/signin' ||
    pathname.endsWith('/signin');
}

/** The signin portal that belongs to this path — never the general one for staff. */
function signinUrlFor(pathname: string, request: NextRequest): URL {
  const parts = pathname.split('/').filter(Boolean);
  const isOrgScoped = parts.length >= 2 && !DASHBOARD_SEGMENTS.has(parts[0]) && parts[0] !== 'superadmin';
  // Send each portal to its OWN signin. A superadmin used to be bounced to
  // the general portal, which is patients-only — the backend rejects staff
  // there, so an expired session stranded them on a page that cannot log
  // them in.
  return parts[0] === 'superadmin'
    ? new URL('/superadmin/signin', request.url)
    : isOrgScoped
      ? new URL(`/${parts[0]}/signin`, request.url)
      : new URL('/signin', request.url);
}

/**
 * Marks a signin redirect that came from a session we could not resume.
 *
 * It exists to break a redirect loop, not to decorate the URL: the
 * "already signed in → go to your dashboard" rule below reads the same cookies
 * that just failed to resume. Without this marker, an unreachable backend would
 * send dashboard → signin → dashboard → signin without end.
 */
const EXPIRED_MARKER = 'session=expired';

function expiredSigninRedirect(pathname: string, request: NextRequest) {
  const url = signinUrlFor(pathname, request);
  url.search = EXPIRED_MARKER;
  return NextResponse.redirect(url);
}

/**
 * Resume a session whose access cookie has expired — the hourly-logout fix.
 *
 * The access cookie lives one hour (`ACCESS_COOKIE_OPTIONS.maxAge`) and so does
 * the token inside it; the refresh cookie lives seven days. Middleware has
 * always let a request through on the refresh cookie alone and left recovery to
 * `client-api.ts`'s single-flight refresh on the first API call. That stopped
 * being enough with A5/FLAG-001: `requireDashboardUser()` runs during the
 * server render, *before* any client code, and it needs a live access token to
 * ask `/auth/me/` who the visitor is. Without one it fails closed and redirects
 * to signin — logging every user out every hour despite six days of refresh
 * token left.
 *
 * A Server Component cannot set cookies in Next, so the gate cannot repair this
 * itself. Middleware can, and it already owns the invariant, so the refresh
 * happens here and the new token is handed to the render on the same request.
 *
 * ⚠️ This does NOT replace the client's single-flight refresh — that still owns
 * the 401-on-XHR path, and `/api/*` returns above before reaching this. Two
 * refreshes genuinely in flight at once will still cost a session (SimpleJWT
 * blacklists the old token); see FLAG-020 for the residual window.
 */
async function resumeSession(request: NextRequest, refreshToken: string) {
  const { pathname } = request.nextUrl;
  const outcome = await refreshSessionTokens(refreshToken);

  if (!outcome.ok) {
    const res = expiredSigninRedirect(pathname, request);
    // `unreachable` says nothing about whether the session is alive, so the
    // cookies stay and the next navigation retries. Only an outright refusal
    // clears them.
    if (outcome.reason === 'rejected') {
      res.cookies.delete(AUTH_COOKIES.ACCESS);
      res.cookies.delete(AUTH_COOKIES.REFRESH);
      res.cookies.delete(AUTH_COOKIES.USER);
    }
    return res;
  }

  // Hand the new token to THIS request's render. Mutating the request cookies
  // and passing the request back through `next()` is what puts it in front of
  // `requireDashboardUser()` now, rather than one navigation later.
  request.cookies.set(AUTH_COOKIES.ACCESS, outcome.access);
  if (outcome.refresh) request.cookies.set(AUTH_COOKIES.REFRESH, outcome.refresh);

  const res = NextResponse.next({ request });
  res.cookies.set(AUTH_COOKIES.ACCESS, outcome.access, ACCESS_COOKIE_OPTIONS);
  // SimpleJWT rotated and blacklisted the token we just sent. Persisting the
  // new one is not optional — skip it and the next refresh presents a dead
  // token and logs the user out.
  if (outcome.refresh) {
    res.cookies.set(AUTH_COOKIES.REFRESH, outcome.refresh, REFRESH_COOKIE_OPTIONS);
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.REFRESH)?.value;
  const userRaw = request.cookies.get(AUTH_COOKIES.USER)?.value;
  // The access cookie expires hourly; a present refresh cookie means the
  // session is still alive (client refreshes on first API call).
  const hasSession = Boolean(accessToken || refreshToken);

  // Let Next.js internals, static files, and API routes through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.\w+$/)
  ) {
    return NextResponse.next();
  }

  // Guard dashboard routes — redirect to signin if no live session
  if (isDashboardRoute(pathname) && !hasSession) {
    return NextResponse.redirect(signinUrlFor(pathname, request));
  }

  // The session is alive but its access token has aged out. Renew it here, on
  // the server, so the page's own gate can resolve identity on this very
  // request instead of bouncing the user to signin every hour.
  if (isDashboardRoute(pathname) && !accessToken && refreshToken) {
    return resumeSession(request, refreshToken);
  }

  // Redirect authenticated users away from signin pages to their dashboard.
  // Skipped when we just failed to resume this session, or the two rules
  // redirect at each other forever.
  const cameFromFailedResume = request.nextUrl.searchParams.get('session') === 'expired';
  if (hasSession && userRaw && isSigninRoute(pathname) && !cameFromFailedResume) {
    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as { role: Role; organization_slug?: string };
      const roleBase = ROLE_PATHS[user.role];
      // Never build /undefined/... — only redirect when the destination is known.
      // SUPERADMIN and PATIENT are both slug-less: the superadmin sits above
      // orgs, the patient outside them (FLAG-210).
      const isSlugless = user.role === ROLES.SUPERADMIN || user.role === ROLES.PATIENT;
      if (roleBase && (isSlugless || user.organization_slug)) {
        const dest = user.role === ROLES.SUPERADMIN
          ? '/superadmin'
          : user.role === ROLES.PATIENT
            ? '/patient'
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