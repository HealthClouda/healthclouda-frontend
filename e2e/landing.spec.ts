import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows main headline', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Modern EHR Built for/i })).toBeVisible();
  });

  test('shows navbar with navigation links', async ({ page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About Us' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contact Us' })).toBeVisible();
  });

  test('has a working patient sign-in link', async ({ page }) => {
    const link = page.getByRole('link', { name: /Login to Your Account/i }).first();
    await expect(link).toHaveAttribute('href', '/signin');
  });

  test('shows features section', async ({ page }) => {
    await expect(page.getByText('Patient Records')).toBeVisible();
    await expect(page.getByText('Lab Integration')).toBeVisible();
    await expect(page.getByText('Prescriptions')).toBeVisible();
    await expect(page.getByText('Secure Messaging')).toBeVisible();
  });

  test('shows about section content', async ({ page }) => {
    await expect(page.getByText('Our Mission')).toBeVisible();
    await expect(page.getByText('Our Vision')).toBeVisible();
  });

  test('shows contact form with all fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Jane')).toBeVisible();
    await expect(page.getByPlaceholder('Doe')).toBeVisible();
    await expect(page.getByPlaceholder('jane@hospital.ng')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  test('contact form shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('footer shows brand and social links', async ({ page }) => {
    await expect(page.getByRole('contentinfo')).toContainText('HealthClouda');
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'X (Twitter)' })).toBeVisible();
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const hamburger = page.getByRole('button', { name: 'Toggle menu' });
    await hamburger.click();
    await expect(page.getByText('Menu')).toBeVisible();
    await hamburger.click();
    await expect(page.getByText('Menu')).not.toBeVisible();
  });
});