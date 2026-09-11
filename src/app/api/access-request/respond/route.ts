import { NextResponse } from 'next/server';
import { API_BASE_URL, ENDPOINTS } from '@/lib/config';

// Public patient-facing access-request respond flow (verified live 2026-07-17
// against the seeded local backend @ develop 4356140):
//   GET  ?token=<uuid> → { organization, patient_name, status, expired }
//        (reason + requested_at asked for in backend #71 — render when present)
//   POST { token, action: "accept"|"deny" } → { message } on 200
// The GET is read-only by backend design (their FLAG-241): the decision only
// ever happens on POST, so email scanners prefetching the link can't mutate.

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token is required.' }, { status: 400 });

  const drfRes = await fetch(
    `${API_BASE_URL}${ENDPOINTS.REC_ACCESS_RESPOND}?token=${encodeURIComponent(token)}`,
  ).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const drfRes = await fetch(`${API_BASE_URL}${ENDPOINTS.REC_ACCESS_RESPOND}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!drfRes) return NextResponse.json({ detail: 'Unable to reach the server.' }, { status: 503 });
  const data = await drfRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: drfRes.status });
}
