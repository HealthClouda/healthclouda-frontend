import { type NextRequest } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return Response.json({ error: 'path required' }, { status: 400 });

  const token = await getAccessToken();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}