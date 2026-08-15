import { test, expect } from '@playwright/test';
import { signInAs, VIEWPORTS } from './helpers';

/**
 * T5 design fidelity — Superadmin (DASH-1). Requires real credentials via
 * env vars (see helpers.ts) — skips itself when they're absent rather than
 * failing CI on missing secrets.
 */

const hasCreds = !!process.env.E2E_SUPERADMIN_EMAIL && !!process.env.E2E_SUPERADMIN_PASSWORD;
test.skip(!hasCreds, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD not set — see docs/DESIGN-VERIFICATION.md');

const PAGES = [
  { nav: 'Dashboard', name: 'overview' },
  { nav: 'Organisations', name: 'organisations' },
  { nav: 'Users', name: 'users' },
  { nav: 'Audit Logs', name: 'audit' },
];

test.describe('Superadmin — desktop structure', () => {
  test.use({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'superadmin');
  });

  for (const p of PAGES) {
    test(`${p.name} @ desktop`, async ({ page }) => {
      if (p.nav !== 'Dashboard') {
        await page.getByRole('button', { name: p.nav }).click();
      }
      // level: 1 — the page body repeats the same text as an h2, which would
      // otherwise make this an ambiguous strict-mode match.
      await expect(page.getByRole('heading', { level: 1, name: p.nav })).toBeVisible();
      await expect(page).toHaveScreenshot(`superadmin-${p.name}-desktop.png`, {
        fullPage: true,
        mask: [
          page.locator('text=/\\d+ (second|minute|hour|day)s? ago/i'),
          page.locator('text=/Today,/i'),
        ],
      });
    });
  }
});

test.describe('Superadmin — mobile shows SmallScreenGate, not the shell', () => {
  test.use({ viewport: { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height } });

  test('gate renders below 768px; sidebar/table do not', async ({ page }) => {
    await signInAs(page, 'superadmin');
    await expect(page.getByText('This dashboard needs a bigger screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Organisations' })).not.toBeVisible();
    await expect(page).toHaveScreenshot('superadmin-gate-mobile.png');
  });
});
