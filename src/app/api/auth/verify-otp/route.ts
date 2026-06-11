import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.VERIFY_OTP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}