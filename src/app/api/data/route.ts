import { type NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL, BACKGROUND_HEADER } from '@/lib/config';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return Response.json({ error: 'path required' }, { status: 400 });

  const token = await getAccessToken();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    // FLAG-073: a background poll must reach the backend marked as one, or it
    // counts as activity and an unattended tab never idles out (backend FLAG-625).
    if (req.headers.get(BACKGROUND_HEADER) === '1') headers[BACKGROUND_HEADER] = '1';
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}