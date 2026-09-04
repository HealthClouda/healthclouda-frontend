import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

// POST — request a fresh invite link from an expired/used one (backend #68).
// Body: { token } or { email }. Backend always answers a generic 200
// (anti-enumeration), so any non-503 result is safe to show verbatim.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.SETUP_PW_RESEND}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}
