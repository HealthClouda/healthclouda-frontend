import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SigninForm } from './SigninForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { CheckEmailForm } from './CheckEmailForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { SetPasswordForm } from './SetPasswordForm';

/**
 * w5-b6 walk (23 Nov): after a SUCCESSFUL sign-in the button went back to
 * "Sign In" while the dashboard was still loading. `isSubmitting` ends when
 * onSubmit returns, and onSubmit returns as soon as router.push() is called,
 * long before the next page shows. On a slow connection the form looked idle
 * and invited a second click. Every auth form that navigates on success had
 * the same gap; each must stay busy until the page actually changes.
 */

// Sign-in navigates with replace (group 3c: keeps the sign-in page out of history); the rest push.
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams('email=doctor@demo.test&otp=123456&token=tok'),
}));

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).startsWith('/api/auth/login')) {
      return ok({ user: { id: 'u1', email: 'superadmin@demo.test', role: 'SUPERADMIN' } });
    }
    if (String(url).startsWith('/api/auth/setup-password?token=')) {
      return ok({ valid: true, email: 'doctor@demo.test', first_name: 'Emeka', last_name: 'Okafor', role: 'DOCTOR', organization_name: null, organization_logo: null });
    }
    return ok({ message: 'ok' });
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function expectStillBusy(busyLabel: RegExp) {
  await waitFor(() => expect(push.mock.calls.length + replace.mock.calls.length).toBeGreaterThan(0));
  const btn = screen.getByRole('button', { name: busyLabel });
  expect(btn).toBeDisabled();
}

const GOOD_PW = 'Str0ng!pass';

describe('auth forms stay busy after success, until the next page loads', () => {
  it('SigninForm', async () => {
    render(<SigninForm loginType="admin" />);
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'superadmin@demo.test' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'whatever-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await expectStillBusy(/signing in/i);
  });

  it('ForgotPasswordForm', async () => {
    render(<ForgotPasswordForm orgSlug="demo-clinic" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'doctor@demo.test' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await expectStillBusy(/sending/i);
  });

  it('CheckEmailForm', async () => {
    render(<CheckEmailForm orgSlug="demo-clinic" />);
    const first = screen.getAllByRole('textbox')[0];
    fireEvent.paste(first, { clipboardData: { getData: () => '123456' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /^verify$/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
    await expectStillBusy(/verifying/i);
  });

  it('ResetPasswordForm', async () => {
    render(<ResetPasswordForm orgSlug="demo-clinic" />);
    fireEvent.change(screen.getByPlaceholderText(/^enter your password$/i), { target: { value: GOOD_PW } });
    fireEvent.change(screen.getByPlaceholderText(/re-enter your password/i), { target: { value: GOOD_PW } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    await expectStillBusy(/saving/i);
  });

  it('SetPasswordForm', async () => {
    render(<SetPasswordForm />);
    await waitFor(() => expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: GOOD_PW } });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: GOOD_PW } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await expectStillBusy(/setting password/i);
  });
});

// Review of #226: the busy state is for SUCCESS only. A failed sign-in must
// hand the button straight back, or one wrong password locks the form.
describe('a failed submit leaves the button usable', () => {
  it('SigninForm: wrong password → "Sign In" again, enabled, no navigation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Invalid email or password.' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })));
    render(<SigninForm loginType="admin" />);
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'superadmin@demo.test' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'wrong-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^sign in$/i })).not.toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });
});

// Review of #226 (pre-existing): a staff member on the general portal gets a
// 5-second "Redirecting…" countdown. The button stayed clickable, and every
// extra click started another countdown and another redirect.
describe('staff redirect countdown on the general portal', () => {
  it('disables the button for the countdown, so a second click cannot start another', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Staff members cannot log in here', org_slug: 'demo-clinic' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })));
    render(<SigninForm loginType="general" />);
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'nurse@demo.test' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'whatever-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByText(/redirecting in/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
