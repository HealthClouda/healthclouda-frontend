import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

/**
 * Build 5 / FLAG-044 — proxies `POST /auth/me/heartbeat/`.
 *
 * A dedicated route rather than going through `/api/action`: the backend's
 * success response is `204 No Content` (empty body), and the Fetch API
 * forbids constructing a `Response` with a body on a 204 — `/api/action`
 * always calls `Response.json(result, ...)`, which would throw here. On a
 * 401 the body IS forwarded (verbatim, including `code`), so the client's
 * `useHeartbeat` can tell an ordinary 401 apart from an already-expired
 * session without a second round trip.
 */
export async function POST() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.HEARTBEAT}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}
