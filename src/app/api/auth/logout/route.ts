import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';
import { AUTH_COOKIES, getAccessToken } from '@/lib/auth';

export async function POST() {
  const token = await getAccessToken();

  // Best-effort call to DRF to blacklist the token — don't fail if it errors
  if (token) {
    await fetch(`${API_BASE_URL}${ENDPOINTS.LOGOUT}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => null);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete(AUTH_COOKIES.ACCESS);
  response.cookies.delete(AUTH_COOKIES.REFRESH);
  response.cookies.delete(AUTH_COOKIES.USER);
  return response;
}