import { NextResponse } from 'next/server';
import {
  AUTH_COOKIES,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  getRefreshToken,
} from '@/lib/auth';
import { refreshSessionTokens } from '@/lib/session-refresh';

/**
 * The client's single-flight recovery after a 401 on `/api/data` or
 * `/api/action` (`client-api.ts`).
 *
 * The backend call itself lives in `lib/session-refresh.ts` because
 * `middleware.ts` now performs the same exchange for server-rendered
 * navigations. Two copies of a rotate-and-blacklist call is exactly the kind of
 * drift that costs sessions, so there is one.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ detail: 'No refresh token.' }, { status: 401 });
  }

  const outcome = await refreshSessionTokens(refreshToken);

  if (!outcome.ok) {
    if (outcome.reason === 'unreachable') {
      // Transient: say so with a 503 and leave the cookies alone. The client
      // treats any non-ok as "refresh failed" and redirects to signin, but the
      // session survives to be resumed on the next attempt.
      return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
    }
    // Refresh expired — clear all cookies so middleware redirects to signin
    const res = NextResponse.json({ detail: 'Session expired. Please sign in again.' }, { status: 401 });
    res.cookies.delete(AUTH_COOKIES.ACCESS);
    res.cookies.delete(AUTH_COOKIES.REFRESH);
    res.cookies.delete(AUTH_COOKIES.USER);
    return res;
  }

  // SimpleJWT rotates refresh tokens and blacklists the old one — the new
  // refresh token MUST be persisted or the next refresh fails with a
  // blacklisted token and the user is logged out.
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set(AUTH_COOKIES.ACCESS, outcome.access, ACCESS_COOKIE_OPTIONS);
  if (outcome.refresh) {
    res.cookies.set(AUTH_COOKIES.REFRESH, outcome.refresh, REFRESH_COOKIE_OPTIONS);
  }
  return res;
}