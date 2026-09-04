import { test, expect, type Page } from '@playwright/test';
import { signInAs, VIEWPORTS, type E2ERole } from './helpers';

/**
 * T5 design fidelity — DASH-2 Org Admin, DASH-4 Receptionist, DASH-5 Doctor.
 *
 * Superadmin (DASH-1) keeps its own spec because its audit log needs bespoke
 * masking. These three are structurally alike enough to share one table.
 *
 * ⚠️ **Why this file exists, and what it is actually for.**
 * Gate 2 recorded that the first time anyone rendered a dashboard in a browser,
 * the first screenshot found FLAG-222: three of four Superadmin stat tiles read
 * fields the API has never returned, so the Organisations tile showed an em dash
 * directly above a table listing three organisations.
 *
 * That bug class is invisible to every other layer we have:
 *   - unit tests assert our own fixtures, typed from the same wrong interface,
 *     so they agree with the bug (FLAG-221, four times now);
 *   - the schema documents `200: No response body` for all eleven dashboard
 *     stats endpoints (FLAG-225), so it cannot adjudicate either.
 *
 * Only a live render can see it. `StatCard` renders `{value ?? '—'}`, so an em
 * dash in a tile IS the signature of reading a field the backend never sent.
 * `assertTilesCarryValues` below is therefore the assertion with teeth here —
 * the screenshots are the secondary benefit, not the point.
 *
 * Signs in for real against `NEXT_PUBLIC_API_URL`; credentials come from
 * `.env.local` and never from this repo. See `docs/DESIGN-VERIFICATION.md`.
 */

interface RoleSpec {
  role: E2ERole;
  /**
   * `nav` is the sidebar button; `title` is the <h1> in the header. They are
   * NOT always the same string — the receptionist's "Check-ins" button opens a
   * page titled "Today's Check-ins". Modelling them as one field silently
   * skipped that page when this was first written.
   */
  pages: readonly { nav: string; title: string }[];
  /** Every StatCard label on the overview, exactly as it appears in the DOM. */
  tiles: readonly string[];
  /**
   * Set when this role's tiles are KNOWN to be reading fields the API does not
   * send, with the flag that records it. The tile test is then marked
   * `test.fail()`: it stays green while the bug is present and turns RED the
   * moment someone fixes the source — which is the signal to delete this field.
   *
   * Deliberate, per CLAUDE.md §6: a finding during verification becomes a flag,
   * not a source edit in the same PR. The alternative — committing a
   * permanently-red test — trains people to ignore a red suite, which is how
   * FLAG-221 survived two weeks.
   */
  knownStatBug?: string;
}

const ROLES: readonly RoleSpec[] = [
  {
    role: 'org-admin',
    pages: [
      { nav: 'Dashboard', title: 'Dashboard' },
      { nav: 'Staff', title: 'Staff' },
      { nav: 'Patients', title: 'Patients' },
      { nav: 'Wards & Beds', title: 'Wards & Beds' },
      { nav: 'Access Requests', title: 'Access Requests' },
      { nav: 'Referrals', title: 'Referrals' },
      // 'Notifications' and 'Settings' carry `soon: true` in the nav and render
      // a placeholder rather than a page. Nothing to verify.
    ],
    tiles: ['Total Staff', 'Active Patients', 'Bed Occupancy', 'Pending Access'],
  },
  {
    role: 'receptionist',
    pages: [
      { nav: 'Overview', title: 'Overview' },
      { nav: 'Check-ins', title: "Today's Check-ins" },
      { nav: 'Appointments', title: 'Appointments' },
      { nav: 'Patient Search', title: 'Patient Search' },
      { nav: 'Referrals', title: 'Referrals' },
    ],
    tiles: ['Check-ins Today', 'Pending Assignment', 'Avail. Beds', 'Pending Referrals'],
  },
  {
    role: 'doctor',
    pages: [
      { nav: 'Overview', title: 'Overview' },
      { nav: 'My Patients', title: 'My Patients' },
      { nav: 'Episodes', title: 'Episodes' },
      { nav: 'Appointments', title: 'Appointments' },
      { nav: 'Referrals', title: 'Referrals' },
      { nav: 'Prescriptions', title: 'Prescriptions' },
    ],
    tiles: ['Active Episodes', 'Appointments Today', 'Pending Referrals', 'Prescriptions'],
    knownStatBug: 'FLAG-227',
  },
];

/**
 * Skeletons carry `.animate-pulse`; DataTable removes its placeholder rows
 * outright once data lands, hence `detached` rather than `hidden`. A page that
 * never showed a skeleton is fine — hence the swallowed timeout.
 */
async function waitForData(page: Page): Promise<void> {
  await page
    .locator('.animate-pulse')
    .first()
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {});
}

/**
 * The FLAG-222 check. `StatCard` renders `{value ?? '—'}`, so an em dash means
 * the component read a key the payload does not carry.
 *
 * `NaN` is checked too, and is not hypothetical: the receptionist's "Avail.
 * Beds" tile computes `total_beds - occupied_beds`, so a missing field there
 * renders the string "NaN" rather than an em dash — the same contract fault
 * wearing a different mask, which an em-dash-only assertion would wave through.
 */
async function assertTilesCarryValues(page: Page, tiles: readonly string[]): Promise<void> {
  const broken: string[] = [];

  for (const label of tiles) {
    // StatCard's root is a <div>, or a <button> when it is clickable. It holds
    // `> div > span` for the label and `> p` for the value.
    //
    // `p.tabular-nums`, not `p`: a tile with a `delta` renders a SECOND <p> as a
    // direct child, so a bare `> p` matched two elements and failed on the
    // receptionist's "Pending Assignment" — which is a correct tile. Only the
    // value carries `tabular-nums`.
    const value = page.locator(
      `:is(div,button):has(> div > span:text-is("${label}")) > p.tabular-nums`,
    );
    await expect(value, `stat tile "${label}" should exist exactly once`).toHaveCount(1);

    const text = (await value.innerText()).trim();
    if (/^(—|NaN)$/.test(text)) broken.push(`${label} → "${text}"`);
  }

  // Collected, not thrown per tile. Asserting inside the loop stops at the first
  // bad tile, which under-reports: the doctor dashboard failed on "Appointments
  // Today" and that masked "Prescriptions" being broken the same way. One run
  // should tell you the full extent of the damage.
  expect(
    broken,
    `${broken.length} stat tile(s) are reading fields this endpoint does not return ` +
      `(the FLAG-222 class): ${broken.join(', ')}. Capture the live payload and ` +
      `retype the interface — do not add the field to the fixture, which is how ` +
      `this survives a green unit suite (FLAG-221).`,
  ).toEqual([]);
}

function masksFor(page: Page) {
  return [
    // Next's dev-tools indicator sits bottom-left, over the sidebar avatar. It
    // is a dev-build artifact, not our UI.
    page.locator('nextjs-portal'),
    page.locator('text=/\\d+ (second|minute|hour|day)s? ago/i'),
    page.locator('text=/Today,/i'),
  ];
}

function baselineName(role: string, nav: string, viewport: string): string {
  return `${role}-${nav.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${viewport}.png`;
}

for (const spec of ROLES) {
  const key = spec.role.toUpperCase().replace(/-/g, '_');
  const hasCreds = !!process.env[`E2E_${key}_EMAIL`] && !!process.env[`E2E_${key}_PASSWORD`];
  const skipReason = `E2E_${key}_EMAIL / E2E_${key}_PASSWORD not set — see docs/DESIGN-VERIFICATION.md`;

  test.describe(`${spec.role} — desktop structure`, () => {
    // Skip rather than fail: CI holds no secrets, and a suite that goes red for
    // a missing credential trains people to ignore red suites.
    test.skip(!hasCreds, skipReason);

    // Serial, deliberately — every test here signs in as the SAME account, and
    // SimpleJWT rotates and blacklists refresh tokens (CLAUDE.md §5), so
    // concurrent logins for one user log each other out. Same reasoning as
    // superadmin.spec.ts, where it was found the hard way.
    test.describe.configure({ mode: 'serial' });
    test.use({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });

    test.beforeEach(async ({ page }) => {
      // 150s, not the 30s default. `signInAs` alone allows 45s — against
      // `next dev` each route compiles on first request — so the default test
      // timeout fired BEFORE the sign-in helper's own wait, and every test in
      // this file failed looking exactly like broken credentials.
      test.setTimeout(150_000);
      await signInAs(page, spec.role);
    });

    test('overview stat tiles read fields the API actually returns', async ({ page }) => {
      if (spec.knownStatBug) {
        test.fail(
          true,
          `${spec.knownStatBug}: known to read fields this endpoint does not send. ` +
            `When this test starts PASSING, the source is fixed — delete ` +
            `\`knownStatBug\` from this role rather than leaving the annotation.`,
        );
      }
      await waitForData(page);
      await assertTilesCarryValues(page, spec.tiles);
    });

    for (const p of spec.pages) {
      test(`${p.nav} @ desktop`, async ({ page }) => {
        if (p.nav !== spec.pages[0].nav) {
          // exact: true — role-name matching is substring by default, so a nav
          // label that is a prefix of another control breaks strict mode. It
          // did for Superadmin's 'Audit Logs'.
          await page.getByRole('button', { name: p.nav, exact: true }).click();
        }
        await expect(page.getByRole('heading', { level: 1, name: p.title })).toBeVisible();
        await waitForData(page);
        await expect(page).toHaveScreenshot(baselineName(spec.role, p.nav, 'desktop'), {
          fullPage: true,
          mask: masksFor(page),
        });
      });
    }
  });

  test.describe(`${spec.role} — mobile shows SmallScreenGate, not the shell`, () => {
    test.skip(!hasCreds, skipReason);
    test.use({ viewport: { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height } });

    test('gate renders below 768px; the dashboard is absent, not hidden', async ({ page }) => {
      test.setTimeout(150_000); // see the desktop beforeEach
      await signInAs(page, spec.role);
      await expect(page.getByText('This dashboard needs a bigger screen')).toBeVisible();
      // Absent, not merely invisible — FLAG-203 was exactly the case where the
      // records sat in the DOM behind a polite notice.
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await expect(page).toHaveScreenshot(baselineName(spec.role, 'gate', 'mobile'), {
        mask: [page.locator('nextjs-portal')],
      });
    });
  });
}
