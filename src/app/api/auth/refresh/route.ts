import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';
import {
  AUTH_COOKIES,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  getRefreshToken,
} from '@/lib/auth';

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ detail: 'No refresh token.' }, { status: 401 });
  }

  let drfRes: Response;
  try {
    drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  } catch {
    return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  }

  if (!drfRes.ok) {
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
  const { access, refresh } = await drfRes.json();
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set(AUTH_COOKIES.ACCESS, access, ACCESS_COOKIE_OPTIONS);
  if (refresh) {
    res.cookies.set(AUTH_COOKIES.REFRESH, refresh, REFRESH_COOKIE_OPTIONS);
  }
  return res;
}