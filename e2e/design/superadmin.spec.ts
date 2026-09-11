import { test, expect } from '@playwright/test';
import { signInAs, VIEWPORTS } from './helpers';

/**
 * T5 design fidelity — Superadmin (DASH-1). Requires real credentials via
 * env vars (see helpers.ts) — skips itself when they're absent rather than
 * failing CI on missing secrets.
 */

const hasCreds = !!process.env.E2E_SUPERADMIN_EMAIL && !!process.env.E2E_SUPERADMIN_PASSWORD;
test.skip(!hasCreds, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD not set — see docs/DESIGN-VERIFICATION.md');

// Serial, deliberately. Every test here signs in as the SAME account, and the
// backend rotates and blacklists refresh tokens (CLAUDE.md §5), so concurrent
// logins for one user interfere with each other: under the repo default of
// fullyParallel the suite failed 2/5 then 5/5, and passed 5/5 the moment it ran
// one worker. Screenshot fidelity doesn't benefit from parallelism anyway.
test.describe.configure({ mode: 'serial' });

const PAGES = [
  { nav: 'Dashboard', name: 'overview' },
  { nav: 'Organisations', name: 'organisations' },
  { nav: 'Users', name: 'users' },
  // maskRows: the audit log grows on every sign-in — including the sign-ins
  // this suite performs — so its rows can never match a committed baseline.
  // Masking the body keeps what this harness is actually for (layout, spacing,
  // tokens, table chrome) while dropping the one part that is unstable by
  // design. Row *content* is covered by unit tests, not by pixels.
  { nav: 'Audit Logs', name: 'audit', maskRows: true },
];

test.describe('Superadmin — desktop structure', () => {
  test.use({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'superadmin');
  });

  for (const p of PAGES) {
    test(`${p.name} @ desktop`, async ({ page }) => {
      if (p.nav !== 'Dashboard') {
        // exact: true — role-name matching is substring by default, so
        // 'Audit Logs' also matched the overview's "View audit logs" button and
        // failed strict mode.
        await page.getByRole('button', { name: p.nav, exact: true }).click();
      }
      // level: 1 — the page body repeats the same text as an h2, which would
      // otherwise make this an ambiguous strict-mode match.
      await expect(page.getByRole('heading', { level: 1, name: p.nav })).toBeVisible();

      // Wait for the DATA, not just the heading. Without this the screenshots
      // captured loading skeletons — the first baselines committed here were
      // all skeleton frames, which verifies nothing about the design and would
      // flip to real content on any timing change. `.animate-pulse` is the
      // skeleton marker; `detached` rather than `hidden` because DataTable
      // removes the placeholder rows outright once data lands.
      await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 30_000 })
        .catch(() => {}); // a page that never showed a skeleton is fine
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await expect(page).toHaveScreenshot(`superadmin-${p.name}-desktop.png`, {
        fullPage: true,
        mask: [
          // Next's dev-tools indicator renders bottom-left, on top of the
          // sidebar avatar. It is a dev-build artifact, not our UI — and it
          // reads as an avatar showing the wrong initial until you spot it.
          page.locator('nextjs-portal'),
          page.locator('text=/\\d+ (second|minute|hour|day)s? ago/i'),
          page.locator('text=/Today,/i'),
          // Everything on this page that counts audit rows, because the count
          // grows with every sign-in — including the ones this suite performs:
          // the rows, the "N entries" subtitle, and the "1–20 of N" footer.
          ...(p.maskRows
            ? [
                page.locator('tbody'),
                page.locator('text=/\\d+ entries/'),
                page.locator('text=/\\d+–\\d+ of \\d+/'),
              ]
            : []),
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
    await expect(page).toHaveScreenshot('superadmin-gate-mobile.png', {
      mask: [page.locator('nextjs-portal')],
    });
  });
});
