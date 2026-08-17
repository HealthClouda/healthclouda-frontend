import { defineConfig, devices } from '@playwright/test';

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