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
  await page.waitForURL((url) => !url.pathname.includes('signin'), { timeout: 15_000 });
}
