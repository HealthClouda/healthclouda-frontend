import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetPasswordForm } from './SetPasswordForm';

/**
 * Token-state tests for the staff-invite set-password screen (design screen 7).
 * Validate shapes verified live 2026-07-17 (org fields shipped in backend #67
 * for our #66):
 *
 *   200 → {valid, email, first_name, last_name, role,
 *          organization_name|null, organization_logo|null}
 *   400 → {error: "This setup link has expired or already been used. …"}
 *
 * The expired state offers self-service re-request (backend #68): POST
 * /auth/setup-password/resend/ {token} → always a generic 200 {message}.
 */

const push = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const validInfo = {
  valid: true,
  email: 'doctor@demo.test',
  first_name: 'Emeka',
  last_name: 'Okafor',
  role: 'DOCTOR',
  organization_name: 'Demo Clinic',
  organization_logo: null,
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SetPasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('renders the welcome header with name, org, and role from the validate response', async () => {
    search = 'token=t1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes(validInfo)));

    render(<SetPasswordForm />);

    expect(await screen.findByText('Emeka Okafor')).toBeInTheDocument();
    expect(screen.getByText('Demo Clinic')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument(); // DOCTOR → label
    const email = screen.getByDisplayValue('doctor@demo.test');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Set Password' })).toBeDisabled();
  });

  it('omits the org phrase when organization_name is null (org-less invite)', async () => {
    search = 'token=t1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonRes({ ...validInfo, organization_name: null })),
    );

    render(<SetPasswordForm />);

    expect(await screen.findByText('Emeka Okafor')).toBeInTheDocument();
    expect(screen.queryByText(/at\s/)).not.toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });

  it('shows the error state with a resend button on a 400, and requests a new link', async () => {
    search = 'token=t1';
    const resendMsg =
      'If a matching account exists and has not been set up yet, a new setup link has been emailed.';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes({ error: 'This setup link has expired or already been used. Contact your administrator.' }, 400),
      )
      .mockResolvedValueOnce(jsonRes({ message: resendMsg }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SetPasswordForm />);

    expect(await screen.findByText('Invalid or expired link')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText(resendMsg)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toBe('/api/auth/setup-password/resend');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ token: 't1' });
  });

  it('shows the error state WITHOUT a resend button when the token is missing', async () => {
    search = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<SetPasswordForm />);

    expect(await screen.findByText('Invalid or expired link')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request a new link' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
