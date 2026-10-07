import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, getAccessToken: vi.fn().mockResolvedValue('an-access-token') };
});

import { GET } from './route';
import { BACKGROUND_HEADER } from '@/lib/config';

/**
 * FLAG-073 — the read proxy forwards the background marker, and nothing else
 * new: a live-update poll must reach the backend marked as one, or it counts
 * as activity and an unattended tab never idles out (backend FLAG-625).
 */
describe('GET /api/data — background marker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function sentHeaders(extra: Record<string, string>): Promise<Record<string, string>> {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await GET(new NextRequest('http://localhost/api/data?path=/auth/me/updates/', { headers: extra }));
    return fetchMock.mock.calls[0][1].headers as Record<string, string>;
  }

  it('forwards it when the browser sent it', async () => {
    const headers = await sentHeaders({ [BACKGROUND_HEADER]: '1' });
    expect(headers[BACKGROUND_HEADER]).toBe('1');
    expect(headers.Authorization).toBe('Bearer an-access-token');
  });

  it('leaves an ordinary read unmarked, and ignores any other value', async () => {
    expect((await sentHeaders({}))[BACKGROUND_HEADER]).toBeUndefined();
    expect((await sentHeaders({ [BACKGROUND_HEADER]: 'yes' }))[BACKGROUND_HEADER]).toBeUndefined();
  });

  it('does not forward the browser’s other headers', async () => {
    const headers = await sentHeaders({ Cookie: 'x=y', 'X-Forwarded-For': '1.2.3.4' });
    expect(Object.keys(headers).sort()).toEqual(['Authorization', 'Content-Type']);
  });
});
