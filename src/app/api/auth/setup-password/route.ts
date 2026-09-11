import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

// GET — validate invite token before showing the form
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ detail: 'Token is required.' }, { status: 400 });

  const drfRes = await fetch(
    `${API_BASE_URL}${ENDPOINTS.SETUP_PW_VALIDATE}?token=${encodeURIComponent(token)}`,
  ).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}

// POST — set password with validated invite token
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.SETUP_PW}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}