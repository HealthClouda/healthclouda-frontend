import { test, expect } from '@playwright/test';
import { signInAs, VIEWPORTS } from './helpers';

/**
 * FLAG-203 in a real browser — the layer jsdom structurally cannot reach.
 *
 * The unit tests in `src/components/dashboard/small-screen-gate.test.tsx` assert
 * that the dashboard does not MOUNT below 768px. They cannot assert anything
 * about the media query itself: jsdom does not evaluate one, which is exactly
 * why the CSS-only gate survived a green suite for two weeks (FLAG-221).
 *
 * This spec closes that gap by using a real viewport and real CSS. It is the
 * "span two layers" test FLAG-221 asks for, for this control.
 *
 * ⚠️ Signs in for real against `NEXT_PUBLIC_API_URL` — needs `E2E_SUPERADMIN_*`
 * in `.env.local`. See `docs/DESIGN-VERIFICATION.md`.
 */

const MOBILE = VIEWPORTS.find((v) => v.name === 'mobile')!;
const DESKTOP = VIEWPORTS.find((v) => v.name === 'desktop')!;

test.describe('FLAG-203 — the small-screen gate, with real CSS', () => {
  test(`${MOBILE.width}px: the notice, and no dashboard in the DOM`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE.width, height: MOBILE.height });
    await signInAs(page, 'superadmin');
    await page.goto('/superadmin');

    await expect(page.getByText('This dashboard needs a bigger screen')).toBeVisible();

    // Not hidden — ABSENT. Before the fix both the notice and the entire
    // dashboard were in the DOM together, and `display:none` hid the records
    // without preventing them being fetched into this device.
    await expect(page.getByRole('navigation')).toHaveCount(0);
    expect(await page.content()).not.toContain('Organisations');
  });

  test(`${DESKTOP.width}px: the dashboard renders normally`, async ({ page }) => {
    // Pairs with the above so the assertion is not vacuous: a component that
    // rendered nothing at any width would pass the security test perfectly.
    await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
    await signInAs(page, 'superadmin');
    await page.goto('/superadmin');

    await expect(page.getByText('This dashboard needs a bigger screen')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
