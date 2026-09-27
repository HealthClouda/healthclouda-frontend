import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { method?: string; path: string; data?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { method = 'POST', path, data } = body;
  if (!path) return Response.json({ error: 'path required' }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: data != null ? JSON.stringify(data) : undefined,
      cache: 'no-store',
    });
    // A 204 carries no body, and the Fetch API FORBIDS constructing a
    // Response with one on a 204 — `Response.json(null, {status: 204})`
    // throws `TypeError: Invalid response status code 204`. That throw
    // lands in the catch below and becomes a 502, so a DELETE that actually
    // succeeded was reported to the user as a failure (and, because it threw,
    // nothing refetched, leaving the deleted row on screen). Raised by
    // @Qeeyat reviewing #159; same fix as `auth/heartbeat/route.ts` (#155).
    // Handled here rather than per-caller so every current and future
    // no-content response is covered at once.
    if (res.status === 204) return new NextResponse(null, { status: 204 });

    const result = await res.json().catch(() => null);
    return Response.json(result, { status: res.status });
  } catch {
    return Response.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}