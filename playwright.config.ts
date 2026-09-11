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
  // One project, deliberately.
  //
  // There used to be a second, `mobile` (Pixel 5), carrying
  // `testIgnore: /e2e\/design\//`. That ignore excluded only the design
  // directory, so `mobile` ran `landing.spec.ts` and `auth.spec.ts` — two
  // desktop-shaped suites — at 393px, where the desktop nav does not render at
  // all and its controls live in the drawer. Two assertions failed every run
  // for that reason alone, which is why `npx playwright test` gave 24/2 while a
  // single-project run gave 13/13.
  //
  // Silencing it by adding those two files to `testIgnore` would have left a
  // project named `mobile` running *zero* tests and reporting green — a name
  // that implies coverage nothing is checking. That is the same shape as a
  // required-checks tick with no checks behind it, so the project is removed
  // instead.
  //
  // Small-viewport behaviour is not lost: `e2e/design/smallscreen.spec.ts` owns
  // it, at the design system's own explicit breakpoints (VIEWPORTS in
  // e2e/design/helpers.ts) rather than a device emulation — which is the more
  // precise predicate for `SmallScreenGate` anyway, since that gate tests the
  // viewport and not the device.
  //
  // Bring a device project back when there are specs written *for* mobile to
  // put in it. See FLAG-025 before writing them: the landing drawer is mounted
  // even when closed, so `toBeVisible()` cannot tell open from shut.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});