import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';
import {
  AUTH_COOKIES,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  USER_COOKIE_OPTIONS,
} from '@/lib/auth';
import type { LoginResponse } from '@/types/auth';

// Simple in-memory rate limiter.
// Resets on server restart — upgrade to Redis in Phase 5 if needed.
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function getKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

function checkLimit(key: string): { allowed: boolean; waitSeconds: number } {
  const now = Date.now();
  const s = attempts.get(key);
  if (!s) return { allowed: true, waitSeconds: 0 };
  if (s.lockedUntil > now) return { allowed: false, waitSeconds: Math.ceil((s.lockedUntil - now) / 1000) };
  return { allowed: true, waitSeconds: 0 };
}

function recordFail(key: string) {
  const now = Date.now();
  const s = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const count = s.count + 1;
  const lockedUntil = count >= 10 ? now + 60_000 : count >= 5 ? now + 30_000 : 0;
  attempts.set(key, { count, lockedUntil });
}

function clearLimit(key: string) {
  attempts.delete(key);
}

export async function POST(req: NextRequest) {
  const key = getKey(req);
  const { allowed, waitSeconds } = checkLimit(key);
  if (!allowed) {
    return NextResponse.json(
      { detail: `Too many attempts. Try again in ${waitSeconds} seconds.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ detail: 'Email and password are required.' }, { status: 400 });
  }

  const { email, password, loginType, orgSlug } = body as {
    email: string;
    password: string;
    loginType: 'general' | 'org' | 'admin';
    orgSlug?: string;
  };

  let endpoint: string;
  if (loginType === 'admin') {
    endpoint = `${API_BASE_URL}${ENDPOINTS.LOGIN_ADMIN}`;
  } else if (loginType === 'org' && orgSlug) {
    endpoint = `${API_BASE_URL}${ENDPOINTS.LOGIN_ORG(orgSlug)}`;
  } else {
    endpoint = `${API_BASE_URL}${ENDPOINTS.LOGIN}`;
  }

  let drfRes: Response;
  try {
    drfRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json(
      { detail: 'Unable to reach the server. Please try again.' },
      { status: 503 },
    );
  }

  const data = await drfRes.json().catch(() => ({}));

  if (!drfRes.ok) {
    recordFail(key);
    // Pass DRF errors through as-is (includes org_slug redirect hint for staff on wrong portal)
    return NextResponse.json(data, { status: drfRes.status });
  }

  const { access, refresh, user } = data as LoginResponse;
  clearLimit(key);

  // The login response user has no organization info and no duty state —
  // enrich from /auth/me/ so redirects can build /{slug}/... paths (AUTH-4)
  // and DutyToggle starts from the real is_on_duty (GLOBAL-4; the fields are
  // only present for DOCTOR/NURSE — preserve their absence for other roles).
  let fullUser = user;
  try {
    const meRes = await fetch(`${API_BASE_URL}${ENDPOINTS.ME}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        organization?: { slug?: string; name?: string } | null;
        is_on_duty?: boolean;
        duty_toggled_at?: string | null;
      };
      fullUser = {
        ...user,
        organization_slug: me.organization?.slug ?? orgSlug,
        organization_name: me.organization?.name,
        ...('is_on_duty' in me ? { is_on_duty: me.is_on_duty } : {}),
        ...('duty_toggled_at' in me ? { duty_toggled_at: me.duty_toggled_at } : {}),
      };
    }
  } catch {
    // Enrichment is best-effort — fall back to the portal slug for org logins.
    fullUser = { ...user, organization_slug: orgSlug };
  }

  const response = NextResponse.json({ user: fullUser }, { status: 200 });
  response.cookies.set(AUTH_COOKIES.ACCESS, access, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(AUTH_COOKIES.REFRESH, refresh, REFRESH_COOKIE_OPTIONS);
  response.cookies.set(
    AUTH_COOKIES.USER,
    encodeURIComponent(JSON.stringify(fullUser)),
    USER_COOKIE_OPTIONS,
  );

  return response;
}