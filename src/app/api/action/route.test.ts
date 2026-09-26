/**
 * `/api/action` — the proxy every write goes through.
 *
 * The case that matters here is **204 No Content**, which DRF returns from
 * `destroy`. The Fetch API forbids constructing a `Response` with a body on a
 * 204, so `Response.json(result, { status: 204 })` throws
 * `TypeError: Invalid response status code 204`. That throw was caught by the
 * route's own `catch` and returned as `502 {error: 'Upstream unreachable'}`.
 *
 * On the ward that meant: an org admin removes a shift from the rota, the
 * shift **is** deleted on the server, and she is told *"Could not remove this
 * shift"* — then the row stays on screen, because the failure path never
 * refetches. Retrying gives her a 404 on an already-deleted row.
 *
 * Raised by @Qeeyat reviewing #159. Fixed in the proxy rather than in the
 * caller so every DELETE is covered, present and future.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ getAccessToken: vi.fn().mockResolvedValue('test-token') }));
vi.mock('@/lib/config', () => ({ API_BASE_URL: 'https://api.test' }));

function request(body: unknown) {
  return { json: async () => body } as unknown as Parameters<
    typeof import('./route').POST
  >[0];
}

describe('/api/action proxy', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('passes a 204 straight through instead of turning a successful DELETE into a 502', async () => {
    const { POST } = await import('./route');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const res = await POST(request({ method: 'DELETE', path: '/ward/shifts/abc/' }));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  it('still returns a JSON body and its status for an ordinary response', async () => {
    const { POST } = await import('./route');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await POST(request({ method: 'POST', path: '/ward/shifts/', data: {} }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'abc' });
  });

  it('still forwards an error status and its body', async () => {
    const { POST } = await import('./route');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'nope' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await POST(request({ method: 'POST', path: '/ward/shifts/', data: {} }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'nope' });
  });

  it('still reports a genuinely unreachable upstream as 502', async () => {
    const { POST } = await import('./route');
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(request({ method: 'DELETE', path: '/ward/shifts/abc/' }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Upstream unreachable' });
  });
});
