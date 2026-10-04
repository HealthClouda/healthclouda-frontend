import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * FLAG-611 — a user the backend has flagged `force_password_change` gets 403
 * `FORCE_PASSWORD_CHANGE` from every endpoint but change-password, including
 * `/auth/me/`. The gate used to read that as "signed out" and redirect to sign
 * in; sign-in succeeds (login is exempt), the dashboard 403s again, and the user
 * loops for ever. The gate now sends them to the change-password page.
 */

const redirectMock = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const resultMock = vi.fn();
vi.mock('@/lib/server-fetch', () => ({
  serverFetch: async (p: string) => { const r = await resultMock(p); return r.ok ? r.data : null; },
  serverFetchResult: (p: string) => resultMock(p),
}));

beforeEach(() => {
  redirectMock.mockClear();
  resultMock.mockReset();
});

describe('FLAG-611 — the dashboard gate and a forced password change', () => {
  it('sends a flagged user to /change-password, not back to sign in', async () => {
    resultMock.mockResolvedValue({ ok: false, status: 403, reason: 'forbidden', code: 'FORCE_PASSWORD_CHANGE' });
    const { requireDashboardUser } = await import('@/lib/auth-server');
    await expect(requireDashboardUser('DOCTOR', 'demo-clinic')).rejects.toThrow('REDIRECT:/change-password');
  });

  it('control: a signed-out user still goes to their own sign-in', async () => {
    resultMock.mockResolvedValue({ ok: false, status: 401, reason: 'unauthorized' });
    const { requireDashboardUser } = await import('@/lib/auth-server');
    await expect(requireDashboardUser('DOCTOR', 'demo-clinic')).rejects.toThrow('REDIRECT:/demo-clinic/signin');
  });

  it('control: any other 403 is still a deny to sign-in', async () => {
    resultMock.mockResolvedValue({ ok: false, status: 403, reason: 'forbidden', code: 'FORBIDDEN' });
    const { requireDashboardUser } = await import('@/lib/auth-server');
    await expect(requireDashboardUser('DOCTOR', 'demo-clinic')).rejects.toThrow('REDIRECT:/demo-clinic/signin');
  });
});
