import { test, expect } from '@playwright/test';

test.describe('General Signin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  test('renders the sign-in form', async ({ page }) => {
    // FLAG-024: the heading reads "Login to HealthClouda", not "Sign in". The
    // BUTTON is "Sign In" — which is why only this assertion failed and the rest
    // of the file passed.
    await expect(page.getByRole('heading', { name: /Login to HealthClouda/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

test.describe('Org Portal Splash (/[slug])', () => {
  test('returns 404 for reserved paths', async ({ page }) => {
    const res = await page.goto('/signin');
    // /signin is a reserved path — it goes to the signin page, not the org splash
    expect(page.url()).not.toContain('[slug]');
    expect(res?.status()).not.toBe(404);
  });

  test('returns 404 for unknown org slugs', async ({ page }) => {
    const res = await page.goto('/this-org-does-not-exist-xyz123');
    expect(res?.status()).toBe(404);
  });
});