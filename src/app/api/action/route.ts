import { type NextRequest } from 'next/server';
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
    const result = await res.json().catch(() => null);
    return Response.json(result, { status: res.status });
  } catch {
    return Response.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}