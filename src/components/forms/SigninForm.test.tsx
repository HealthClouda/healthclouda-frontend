import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SigninForm } from './SigninForm';

/**
 * Build 5 / FLAG-044 — `?reason=idle|max_age` is the marker `middleware.ts`
 * and `client-api.ts` land on this page with after ending a lapsed session.
 * It must show the SPECIFIC plain-language message, and an ordinary visit
 * (no `reason`) must show neither.
 */

let search = '';
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => router,
}));

describe('SigninForm — session-expiry message', () => {
  beforeEach(() => {
    search = '';
  });

  it('shows the 15-minute idle message for ?reason=idle', () => {
    search = 'reason=idle';
    render(<SigninForm loginType="general" />);
    expect(screen.getByText(/15 minutes of inactivity/i)).toBeInTheDocument();
  });

  it('shows the 12-hour cap message for ?reason=max_age', () => {
    search = 'reason=max_age';
    render(<SigninForm loginType="general" />);
    expect(screen.getByText(/12-hour session ended/i)).toBeInTheDocument();
  });

  // A `?reason=` value is an UNTRUSTED query param. Indexing the message
  // record directly meant `?reason=__proto__` handed React `Object.prototype`
  // ("Objects are not valid as a React child" — the signin page dies) and
  // `?reason=constructor` rendered an empty banner. Anyone could put either in
  // a link to an org's signin URL. Raised by @Qeeyat reviewing #155.
  it.each(['__proto__', 'constructor', 'toString', 'nonsense'])(
    'renders no banner and does not crash for ?reason=%s',
    (value) => {
      search = `reason=${value}`;
      expect(() => render(<SigninForm loginType="general" />)).not.toThrow();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('shows neither message on an ordinary visit with no reason', () => {
    search = '';
    render(<SigninForm loginType="general" />);
    expect(screen.queryByText(/inactivity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/session ended/i)).not.toBeInTheDocument();
  });

  it('ignores an unrecognised reason value rather than showing a blank/broken message', () => {
    search = 'reason=something-unexpected';
    render(<SigninForm loginType="general" />);
    expect(screen.queryByText(/inactivity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/session ended/i)).not.toBeInTheDocument();
  });
});

/**
 * w5-b6 group 3c: after signing in, browser Back showed the sign-in form to a
 * signed-in admin. `push` left the sign-in page in history, and Back restores
 * it from the browser's cache without asking middleware. `replace` swaps it out.
 */
describe('SigninForm — after a successful sign-in', () => {
  afterEach(() => { vi.unstubAllGlobals(); router.push.mockClear(); router.replace.mockClear(); });

  it('replaces the sign-in page in history instead of adding the dashboard after it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ user: { role: 'SUPERADMIN' } }), { status: 200 })));
    render(<SigninForm loginType="admin" />);
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'sa@demo.test' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'pw-for-test' } });
    const submit = screen.getByRole('button', { name: /sign in/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/superadmin'));
    expect(router.push).not.toHaveBeenCalled();
  });
});
