import { cookies } from 'next/headers';
import type { User } from '@/types/auth';

export const AUTH_COOKIES = {
  ACCESS: 'hc_access_token',
  REFRESH: 'hc_refresh_token',
  USER: 'hc_user',
} as const;

const BASE = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export const ACCESS_COOKIE_OPTIONS = {
  ...BASE,
  httpOnly: true,
  maxAge: 60 * 60, // 1 hour — matches DRF default access token lifetime
};

export const REFRESH_COOKIE_OPTIONS = {
  ...BASE,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * ⚠️ DISPLAY ONLY — never authorize from this cookie.
 *
 * `httpOnly: false` is deliberate: the client reads it for UI state (a name in
 * the header, which nav to show). It carries no token. But because the browser
 * can read it, the browser can also WRITE it — so anything it says about role
 * or organisation is a user-supplied claim, not a fact.
 *
 * Authorization decisions belong in `requireDashboardUser()`
 * (`lib/auth-server.ts`), which asks `/auth/me/` using the httpOnly access
 * token. That is FLAG-001; the gates used to read this cookie instead, and a
 * tampered value rendered another role's or another org's dashboard.
 */
export const USER_COOKIE_OPTIONS = {
  ...BASE,
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 7,
};

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIES.ACCESS)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIES.REFRESH)?.value ?? null;
}

/**
 * The DISPLAY user, straight from the client-writable cookie.
 *
 * ⚠️ Do not use this to decide what someone may see — see
 * `requireDashboardUser()` in `lib/auth-server.ts` (FLAG-001). Safe for
 * rendering a name; unsafe for anything that grants access.
 */
export async function getUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIES.USER)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as User;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAccessToken()) !== null;
}