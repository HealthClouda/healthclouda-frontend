import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';
import { AUTH_COOKIES, getAccessToken, getRefreshToken } from '@/lib/auth';

export async function POST() {
  const [token, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);

  // FLAG-250: DRF's LogoutView needs `{refresh}` in the body. With it, it
  // blacklists that token and ends the session (FLAG-610), so the session's
  // access tokens stop working at once. Without it, it answers 400 and does
  // neither — which is what every sign-out did until this route sent the body.
  // It also needs the access token (IsAuthenticated), so with either one
  // missing there is nothing it can do, and the call is skipped.
  if (token && refresh) {
    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGOUT}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }).catch(() => null);
    // Don't fail the sign-out over it (the cookies still go below), but don't
    // let it go silent again either. Status and path only — never a token or a
    // body, same rule as `logFailure` in server-fetch.ts.
    if (!res?.ok) {
      console.error(`[logout] session not ended server-side status=${res?.status ?? 'network'} path=${ENDPOINTS.LOGOUT}`);
    }
  }

  // This browser is signed out whatever the backend said.
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete(AUTH_COOKIES.ACCESS);
  response.cookies.delete(AUTH_COOKIES.REFRESH);
  response.cookies.delete(AUTH_COOKIES.USER);
  return response;
}
