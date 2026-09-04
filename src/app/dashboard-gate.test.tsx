import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * FLAG-001 / A5 — authorization must NOT be decided from `hc_user`.
 *
 * `hc_user` is set `httpOnly: false` so the UI can read the user's name, but it
 * is also what every dashboard page gate reads. A user can edit
 * `document.cookie` and set any role or organization they like.
 *
 * These tests are written from the flag's own "Done when": a tampered `hc_user`
 * must not render another role's OR another org's dashboard. They therefore
 * always describe the cookie and the SERVER's answer disagreeing — which is
 * exactly what tampering looks like from the server's side.
 *
 * Both of the first two FAIL against the pre-fix pages, which trust the cookie.
 */

const redirectMock = vi.fn((path: string) => {
  // Next's redirect() throws to halt rendering; emulate that so a page which
  // redirects cannot also fall through and return markup.
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

// The tampered cookie: claims DOCTOR at demo-clinic, always.
const tamperedCookie = encodeURIComponent(JSON.stringify({
  id: 'u-1', email: 'nurse@demo.test', first_name: 'Ngozi', last_name: 'Eze',
  role: 'DOCTOR', organization_slug: 'demo-clinic',
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'hc_user' ? { value: tamperedCookie } : { value: 'a-real-access-token' },
  }),
}));

// What the SERVER says, via /auth/me/ — the source of truth.
const serverFetchMock = vi.fn();
vi.mock('@/lib/server-fetch', () => ({ serverFetch: (p: string) => serverFetchMock(p) }));

const ME = (role: string, slug: string | null) => ({
  id: 'u-1', email: 'nurse@demo.test', first_name: 'Ngozi', last_name: 'Eze',
  role,
  organization: slug ? { id: 'o-1', name: 'Demo Clinic', slug } : null,
});

beforeEach(() => {
  redirectMock.mockClear();
  serverFetchMock.mockReset();
});

/** Route the call through whichever endpoint the page asks for. */
function serverAnswers(me: unknown, stats: unknown = {}) {
  serverFetchMock.mockImplementation((path: string) =>
    Promise.resolve(path === '/auth/me/' ? me : stats),
  );
}

describe('FLAG-001 — a tampered hc_user cookie cannot escalate role', () => {
  it('redirects when the cookie claims DOCTOR but the server says NURSE', async () => {
    serverAnswers(ME('NURSE', 'demo-clinic'));
    const { default: DoctorPage } = await import('./[slug]/doctor/page');

    await expect(
      DoctorPage({ params: Promise.resolve({ slug: 'demo-clinic' }) }),
    ).rejects.toThrow('REDIRECT:/demo-clinic/signin');

    expect(redirectMock).toHaveBeenCalledWith('/demo-clinic/signin');
  });
});

describe('FLAG-001 — tenant isolation: the route slug must match the user org', () => {
  it("redirects a real DOCTOR of demo-clinic away from another org's dashboard", async () => {
    // Nothing is tampered here at all — this is a legitimate doctor simply
    // typing another org's slug into the URL. The pre-fix gate checks only the
    // role, so it lets them straight into other-clinic's dashboard shell.
    serverAnswers(ME('DOCTOR', 'demo-clinic'));
    const { default: DoctorPage } = await import('./[slug]/doctor/page');

    await expect(
      DoctorPage({ params: Promise.resolve({ slug: 'other-clinic' }) }),
    ).rejects.toThrow('REDIRECT:/other-clinic/signin');
  });
});

describe('FLAG-001 — the legitimate case still works', () => {
  it('renders for a real DOCTOR on their own org', async () => {
    serverAnswers(ME('DOCTOR', 'demo-clinic'), { total_patients: 3 });
    const { default: DoctorPage } = await import('./[slug]/doctor/page');

    const el = await DoctorPage({ params: Promise.resolve({ slug: 'demo-clinic' }) });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });

  it('denies when the server cannot confirm the user (fail closed)', async () => {
    // serverFetch returns null on ANY failure (FLAG-005). For an auth gate that
    // must mean DENY, never "assume the cookie was right".
    serverAnswers(null);
    const { default: DoctorPage } = await import('./[slug]/doctor/page');

    await expect(
      DoctorPage({ params: Promise.resolve({ slug: 'demo-clinic' }) }),
    ).rejects.toThrow('REDIRECT:/demo-clinic/signin');
  });
});
