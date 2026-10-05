import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ContactForm } from './ContactForm';
import { OrgContactForm } from './OrgContactForm';

/**
 * FLAG-248 — FLAG-057's bug class on the two public contact forms. Before the
 * page's JavaScript has loaded, a click (or Enter) is handled by the BROWSER,
 * and a `<form>` with no `method` submits as GET: a prospect's name, email and
 * phone would land in the address bar, the browser history and every proxy and
 * CDN log. react-hook-form's `register()` gives every input a `name`, so a
 * native submit carries all of them.
 *
 * Same two guards as the auth forms (`auth-forms-no-get.test.tsx`), asserted on
 * the SERVER-RENDERED HTML — the only markup that exists before hydration:
 *   1. the form declares `method="post"`, so even a native submit puts nothing
 *      in the URL;
 *   2. the submit button is `disabled` until hydration, so a native submit
 *      cannot happen at all.
 */

const forms: Array<[string, () => React.ReactElement]> = [
  ['ContactForm (apex landing)', () => <ContactForm />],
  ['OrgContactForm (org landing)', () => <OrgContactForm slug="demo-clinic" />],
];

function parse(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return {
    forms: [...doc.querySelectorAll('form')],
    submits: [...doc.querySelectorAll('button[type="submit"]')],
    named: [...doc.querySelectorAll('input[name], textarea[name]')],
  };
}

describe('FLAG-248 — public contact forms never submit a visitor\'s details in the URL', () => {
  it.each(forms)('%s: the inputs are named, so a native submit WOULD carry them', (_name, el) => {
    // Guards the premise: if a refactor drops the names, this test says why
    // the other two exist rather than passing for the wrong reason.
    expect(parse(renderToString(el())).named.length).toBeGreaterThan(0);
  });

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
