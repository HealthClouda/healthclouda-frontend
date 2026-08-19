import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// The design harness reads E2E_<ROLE>_EMAIL / _PASSWORD from the environment
// and its docs say to put them in `.env.local` — but Playwright is not Next, so
// nothing was loading that file into this process and the documented setup
// could never have worked. `@next/env` is what Next itself uses, so the same
// file resolves the same way for both. No new dependency.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // e2e/design sets its own explicit viewports per VIEWPORTS in
    // e2e/design/helpers.ts (the design system's fixed breakpoints, not a
    // device emulation) — running it again under Pixel 5 would just double
    // every screenshot for no signal.
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testIgnore: /e2e\/design\// },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});