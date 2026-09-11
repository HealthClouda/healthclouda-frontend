import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';
import { ENDPOINTS } from '@/lib/config';

// Org landing contact form → POST /org/<slug>/contact/ (public; verified
// live against the prod schema 2026-07-13). Body: {name, email, phone, message}.
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.ORG_CONTACT(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
