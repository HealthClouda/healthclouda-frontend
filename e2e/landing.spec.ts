import { test, expect } from '@playwright/test';

/**
 * FLAG-024: every assertion below was re-derived from the RENDERED page, not from
 * the source and not from the previous version of this file. The old specs
 * described the pre-redesign landing page — headline "Modern EHR Built for…",
 * nav items "Home"/"About Us"/"Contact Us", a "Send Message" button and LinkedIn
 * and X footer links, none of which exist any more. They had never run in CI, so
 * nothing reported it.
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows main headline', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /One patient record/i }),
    ).toBeVisible();
  });

  test('shows navbar with navigation links', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    for (const label of ['How it works', 'Features', 'About', 'Security', 'Contact']) {
      await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole('button', { name: 'For organisations' })).toBeVisible();
  });

  test('has a working patient sign-in link', async ({ page }) => {
    // Scoped to the nav: "/signin" is also linked from the footer ("Patient sign
    // in") and from inside the mobile drawer, so an unscoped locator is ambiguous.
    const link = page.getByRole('navigation').getByRole('link', { name: 'Sign in', exact: true });
    await expect(link).toHaveAttribute('href', '/signin');
  });

  test('shows features section', async ({ page }) => {
    await expect(page.getByText('Unified patient records')).toBeVisible();
    await expect(page.getByText('Referrals & transfers')).toBeVisible();
    await expect(page.getByText('Wards, beds & admissions')).toBeVisible();
    // "Prescriptions" appears three times on the page (feature card, role copy,
    // security copy), so it needs .first() rather than a strict-mode violation.
    await expect(page.getByText('Prescriptions').first()).toBeVisible();
  });

  test('shows about section content', async ({ page }) => {
    // Sentence case, not Title Case — "Our mission" / "Our vision".
    await expect(page.getByText('Our mission')).toBeVisible();
    await expect(page.getByText('Our vision')).toBeVisible();
  });

  test('shows contact form with all fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByPlaceholder('Work email')).toBeVisible();
    await expect(page.getByPlaceholder('Organisation name')).toBeVisible();
    await expect(page.getByPlaceholder('Phone number')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
  });

  test('contact form shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Full name is required')).toBeVisible();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Organisation name is required')).toBeVisible();
    await expect(page.getByText('Phone number is required')).toBeVisible();
  });

  test('footer shows brand and key links', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('HealthClouda');
    // The old spec asserted LinkedIn and X (Twitter) links. There are no social
    // links in the footer at all — it carries section links plus patient sign-in.
    await expect(footer.getByRole('link', { name: /patient sign in/i })).toHaveAttribute(
      'href',
      '/signin',
    );
  });

  test('mobile menu opens and closes', async ({ page }) => {
    const width = 375;
    await page.setViewportSize({ width, height: 812 });

    const menuLabel = page.getByText('Menu', { exact: true });
    const openBox = async () => (await menuLabel.boundingBox())!;

    // ⚠️ Asserted by POSITION, not by visibility, and that is deliberate.
    //
    // The drawer is always mounted (LandingNav.tsx:102) and is hidden only by
    // `translate-x-full`. Playwright therefore reports it "visible" whether open
    // or closed — an element translated off-screen still has a box and is not
    // display:none. `expect(...).not.toBeVisible()` can never pass here, which is
    // why the old test failed, and clicking the hamburger a second time to close
    // fails differently: the open drawer intercepts the pointer event.
    //
    // This is structurally the same pattern as FLAG-203 (hidden visually, present
    // functionally). Logged as FLAG-025 — the closed drawer's controls stay in the
    // accessibility tree and in tab order. Not fixed here: this PR fixes the
    // specs, and CLAUDE.md §6 puts the fix in its own change.
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(menuLabel).toBeVisible();
    expect((await openBox()).x).toBeLessThan(width);

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(async () => {
      expect((await openBox()).x).toBeGreaterThanOrEqual(width);
    }).toPass({ timeout: 5_000 });
  });
});
