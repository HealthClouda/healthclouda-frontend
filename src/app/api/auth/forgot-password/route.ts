import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.email) return NextResponse.json({ detail: 'Email is required.' }, { status: 400 });

  const drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.FORGOT_PW}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email }),
  }).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}