import type { Page } from '@playwright/test';

/**
 * T5 design-fidelity harness (docs/DESIGN-VERIFICATION.md). Signs in for
 * real against whatever NEXT_PUBLIC_API_URL points at — no mocked auth —
 * so credentials must come from the environment, never this repo.
 *
 * Set in .env.local (gitignored) before running:
 *   E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD   e.g. E2E_SUPERADMIN_EMAIL
 *   E2E_ORG_SLUG   (defaults to demo-clinic) — used for every staff role
 *   except superadmin, which signs in at /superadmin/signin.
 *
 * Three portals, not one (CLAUDE.md §8), and `signinPathFor` below is where
 * that contract is encoded:
 *   - superadmin → /superadmin/signin
 *   - patient    → /signin, the general portal, which is patients ONLY. A
 *                  patient has no organisation (FLAG-210), so there is no slug
 *                  to put in the path — that is the whole reason #100 moved the
 *                  portal to a slug-less /patient.
 *   - all other staff → /<E2E_ORG_SLUG>/signin
 */

export type E2ERole = 'superadmin' | 'org-admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient';

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }, // proves SmallScreenGate on DASH-1..5, responsive layout on DASH-6
] as const;

function envKeyFor(role: E2ERole): string {
  return role.toUpperCase().replace(/-/g, '_');
}

function signinPathFor(role: E2ERole): string {
  if (role === 'superadmin') return '/superadmin/signin';
  if (role === 'patient') return '/signin';
  const slug = process.env.E2E_ORG_SLUG ?? 'demo-clinic';
  return `/${slug}/signin`;
}

export async function signInAs(page: Page, role: E2ERole): Promise<void> {
  const key = envKeyFor(role);
  const email = process.env[`E2E_${key}_EMAIL`];
  const password = process.env[`E2E_${key}_PASSWORD`];
  if (!email || !password) {
    throw new Error(
      `Missing E2E_${key}_EMAIL / E2E_${key}_PASSWORD. The design screenshot harness signs in for ` +
        `real against api-dev — set these in .env.local (never committed) before running it. ` +
        `See docs/DESIGN-VERIFICATION.md.`,
    );
  }

  await page.goto(signinPathFor(role));
  await page.getByPlaceholder(/enter your email/i).fill(email);
  await page.getByPlaceholder(/enter your password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // 45s, not 15s: against `next dev` each route compiles on first request
  // (~11s observed), and the parallel workers all hit cold routes at once. The
  // old 15s was fine against a warm server and flaked on a cold one.
  const navigated = page
    .waitForURL((url) => !url.pathname.includes('signin'), { timeout: 45_000 })
    .then(() => 'signed-in' as const);

  // A REJECTED sign-in used to present as a bare 45s `waitForURL` timeout,
  // which reads as "the dashboard never loaded" — so you go looking at the
  // dashboard. It cost a diagnostic cycle on the very first nurse run
  // (2026-09-04): the backend had answered "Invalid email or password" in
  // under a second and the harness sat there for the full 45s not saying so.
  // Race the form error against the navigation and name what actually
  // happened.
  const rejected = page
    .getByText(/invalid email or password|no active account/i)
    .waitFor({ state: 'visible', timeout: 45_000 })
    .then(() => 'rejected' as const);

  // Both branches need a handler or whichever loses the race surfaces as an
  // unhandled rejection when it later times out.
  navigated.catch(() => {});
  rejected.catch(() => {});

  const outcome = await Promise.race([
    navigated,
    // Absence of an error message is not an outcome — if none appears, this
    // branch must never settle, leaving the race to the navigation.
    rejected.catch(() => new Promise<never>(() => {})),
  ]);

  if (outcome === 'rejected') {
    throw new Error(
      `Sign-in as "${role}" was REJECTED by the backend — the credentials reaching the browser ` +
        `are wrong. Before re-requesting them, check how they are written in .env.local: a value ` +
        `containing "#" MUST be quoted (E2E_..._PASSWORD="a#b"), because dotenv treats an ` +
        `unquoted "#" as the start of a comment and silently truncates the rest. That is exactly ` +
        `what happened to E2E_NURSE_PASSWORD on 2026-09-04 — the credential was correct and only ` +
        `its first four characters were ever sent.`,
    );
  }
}
