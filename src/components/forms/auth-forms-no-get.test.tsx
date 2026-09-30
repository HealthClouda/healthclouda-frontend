import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SigninForm } from './SigninForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { CheckEmailForm } from './CheckEmailForm';
import { ResetPasswordForm } from './ResetPasswordForm';

/**
 * FLAG-057 — before the page's JavaScript has loaded (slow network, a JS chunk
 * that failed to fetch), a click on the submit button is handled by the
 * BROWSER, not React. A `<form>` with no `method` submits as GET, so the email
 * and password landed in the address bar, the browser history and every proxy
 * and CDN log: `/demo-clinic/signin?email=…&password=…` was seen twice on dev.
 *
 * Two independent guards, both asserted on the SERVER-RENDERED HTML — the only
 * markup that exists before hydration, and the thing jsdom's `render()` never
 * shows (it is always "hydrated"):
 *   1. every auth form declares `method="post"`, so even a native submit puts
 *      nothing in the URL;
 *   2. the submit button is `disabled` until hydration, so a native submit
 *      cannot happen at all (a disabled default button also blocks Enter).
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('email=doctor@demo.test&code=123456'),
  useRouter: () => ({ push: vi.fn() }),
}));

const forms: Array<[string, () => React.ReactElement]> = [
  ['SigninForm (org)', () => <SigninForm loginType="org" orgSlug="demo-clinic" orgName="Demo Clinic" />],
  ['SigninForm (admin)', () => <SigninForm loginType="admin" />],
  ['ForgotPasswordForm', () => <ForgotPasswordForm orgSlug="demo-clinic" />],
  ['CheckEmailForm', () => <CheckEmailForm orgSlug="demo-clinic" />],
  ['ResetPasswordForm', () => <ResetPasswordForm orgSlug="demo-clinic" />],
];

function parse(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return { forms: [...doc.querySelectorAll('form')], submits: [...doc.querySelectorAll('button[type="submit"]')] };
}

describe('FLAG-057 — auth forms never submit credentials in the URL', () => {
  it.each(forms)('%s: every form in the server HTML is method="post"', (_name, el) => {
    const { forms: fs } = parse(renderToString(el()));
    expect(fs.length).toBeGreaterThan(0);
    for (const f of fs) expect(f.getAttribute('method')?.toLowerCase()).toBe('post');
  });

  it.each(forms)('%s: the submit button is disabled until the page has loaded', (_name, el) => {
    const { submits } = parse(renderToString(el()));
    expect(submits.length).toBeGreaterThan(0);
    for (const b of submits) expect(b.hasAttribute('disabled')).toBe(true);
  });
});
