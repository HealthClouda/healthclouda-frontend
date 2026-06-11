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

export const USER_COOKIE_OPTIONS = {
  ...BASE,
  httpOnly: false, // Client needs to read this for UI state (no token, just user info)
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