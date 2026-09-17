import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SigninForm } from './SigninForm';

/**
 * Build 5 / FLAG-044 — `?reason=idle|max_age` is the marker `middleware.ts`
 * and `client-api.ts` land on this page with after ending a lapsed session.
 * It must show the SPECIFIC plain-language message, and an ordinary visit
 * (no `reason`) must show neither.
 */

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn() }),
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
