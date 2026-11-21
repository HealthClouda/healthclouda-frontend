import { test, expect, type Page } from '@playwright/test';
import { signInAs, VIEWPORTS, type E2ERole } from './helpers';
import { EMPTY_VALUE } from '../../src/lib/utils';

/**
 * Dashboard contract checks against the real API, in a real browser:
 * Org Admin, Nurse, Receptionist, Doctor, Patient.
 *
 * 🗓️ **Run before every `develop` → `staging` promotion** (`npm run test:contract`,
 * staff logins in `.env.local`, see `helpers.ts`). It is not in CI, because CI
 * holds no credentials, so this is the only moment it is guaranteed to run.
 *
 * Until 21 Nov 2026 this was `e2e/design/roles.spec.ts`, the T5 design harness,
 * and it also took screenshot baselines. Those existed so the Claude Design
 * exports could be matched while they were built. That job is done, and the
 * baselines drifted daily with the clock (FLAG-235), so they were removed. The
 * two checks below never depended on pixels and stay.
 *
 * ⚠️ **Why this file exists, and what it is actually for.**
 * Gate 2 recorded that the first time anyone rendered a dashboard in a browser,
 * the first screenshot found FLAG-222: three of four Superadmin stat tiles read
 * fields the API has never returned, so the Organisations tile showed an em dash
 * directly above a table listing three organisations.
 *
 * That bug class was invisible to every other layer we had:
 *   - unit tests assert our own fixtures, typed from the same wrong interface,
 *     so they agree with the bug (FLAG-221, four times now);
 *   - the schema documented `200: No response body` for every dashboard stats
 *     endpoint (FLAG-225), so it could not adjudicate either.
 *
 * ⚠️ **The second half changed on 2026-09-03 and this comment must not go stale
 * the way the last one did.** Backend #161 published response bodies for all
 * seven dashboard/stats endpoints, so a *presence* check against the schema is
 * now possible and needs no credentials — that is how FLAG-231 was found on the
 * Patient dashboard, which nobody can still log into.
 *
 * That does NOT retire this file, for two reasons. FLAG-554 (backend) shows six
 * fields in that same batch published with the wrong *type*, and a confidently
 * wrong schema is worse than a silent one because it removes the reason to
 * measure. And a schema cannot tell you what actually rendered: `StatCard`
 * renders `{value ?? '—'}`, so an em dash in a tile IS the signature of reading
 * a field the backend never sent. `assertTilesCarryValues` below is the
 * assertion with teeth.
 *
 * Signs in for real against `NEXT_PUBLIC_API_URL`; credentials come from
 * `.env.local` and never from this repo. See `helpers.ts`.
 */

interface RoleSpec {
  role: E2ERole;
  /** Every StatCard label on the overview, exactly as it appears in the DOM. */
  tiles: readonly string[];
  /**
   * What 390px must show — and the two roles want OPPOSITE assertions, so this
   * cannot be inferred.
   *
   * `gate`       — DASH-1…5, staff. The dashboard must not be in the DOM at
   *                all, only `SmallScreenGate` (FLAG-203).
   * `responsive` — DASH-6 Patient, and only Patient. Patients are on phones;
   *                `DashboardShell`'s own prop doc says this dashboard "must
   *                omit" the gate. Asserting the gate here would be asserting
   *                a bug.
   */
  mobile: 'gate' | 'responsive';
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
    tiles: ['Total Staff', 'Active Patients', 'Bed Occupancy', 'Pending Access'],
    mobile: 'gate',
  },
  {
    role: 'nurse',
    tiles: ['Active Admissions', 'Patients in Queue', 'Bed Occupancy', 'Admitted Today'],
    mobile: 'gate',
  },
  {
    role: 'receptionist',
    tiles: ['Check-ins Today', 'Pending Assignment', 'Avail. Beds', 'Pending Referrals'],
    mobile: 'gate',
  },
  {
    role: 'doctor',
    // #109 (FLAG-222/227) fixed the field-name mismatch and swapped the dead
    // "Prescriptions" tile (read `active_prescriptions`, never sent) for
    // "Admissions Under Care" (`admissions_under_care`, genuinely returned).
    // `knownStatBug` is removed per this file's own convention: the test now
    // passes for real instead of being inverted.
    // FLAG-051: `active_prescriptions` exists now (backend #197), so the tile is back.
    tiles: ['Active Episodes', 'Appointments Today', 'Pending Referrals', 'Active Prescriptions', 'Admissions Under Care'],
    mobile: 'gate',
  },
  {
    role: 'patient',
    // #109 (FLAG-231) confirmed the prediction: `upcoming_appointments` and
    // `pending_access_requests` were never in the payload. "Upcoming Appts"
    // survives on a real value — `apptData.count` from the scheduled-
    // appointments fetch the page already makes, not the stats endpoint.
    // "Access Requests" was removed outright rather than reconstructed (no
    // cheap source), so the row is three tiles now, not four. `knownStatBug`
    // removed for the same reason as doctor, above.
    tiles: ['Upcoming Appts', 'Active Episodes', 'Notifications'],
    mobile: 'responsive',
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
 * Three masks, not one, and each was found the hard way:
 *
 *   `—`          the plain case — `value={stats?.some_field}`.
 *   `NaN`        the receptionist's "Avail. Beds" computes
 *                `total_beds - occupied_beds`, so a missing field there is
 *                arithmetic on `undefined`.
 *   `undefined`  a tile built with a template literal. The nurse's "Bed
 *                Occupancy" is `` `${stats.occupancy_rate}%` ``, which renders
 *                the literal string **"undefined%"** when the field is absent
 *                — not an em dash, not NaN, and a `?? '—'` fallback can never
 *                fire because the template already produced a non-null string.
 *
 * All three are the same contract fault wearing different masks, so the match
 * is a substring for the last two rather than a whole-value test.
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
    if (text === EMPTY_VALUE || text === '—' || /NaN|undefined/.test(text)) broken.push(`${label} → "${text}"`);
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

// One worker, in order: each role's desktop and mobile tests sign in as the SAME
// account, and the backend rotates and blacklists refresh tokens, so parallel
// logins for one user log each other out. 'default', not 'serial', so one
// failing role does not skip the rest: a run should report every broken tile.
test.describe.configure({ mode: 'default' });

for (const spec of ROLES) {
  const key = spec.role.toUpperCase().replace(/-/g, '_');
  const hasCreds = !!process.env[`E2E_${key}_EMAIL`] && !!process.env[`E2E_${key}_PASSWORD`];
  const skipReason = `E2E_${key}_EMAIL / E2E_${key}_PASSWORD not set — see e2e/contract/helpers.ts`;

  test.describe(`${spec.role} — desktop`, () => {
    // Skip rather than fail: CI holds no secrets, and a suite that goes red for
    // a missing credential trains people to ignore red suites.
    test.skip(!hasCreds, skipReason);
    test.use({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });

    test('overview stat tiles read fields the API actually returns', async ({ page }) => {
      // 150s, not the 30s default. `signInAs` alone allows 45s — against
      // `next dev` each route compiles on first request — so the default test
      // timeout fired BEFORE the sign-in helper's own wait, and the test failed
      // looking exactly like broken credentials.
      test.setTimeout(150_000);
      await signInAs(page, spec.role);
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
  });

  test.describe(`${spec.role} — mobile @ ${VIEWPORTS[1].width}px`, () => {
    test.skip(!hasCreds, skipReason);
    test.use({ viewport: { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height } });

    test(
      spec.mobile === 'gate'
        ? 'gate renders below 768px; the dashboard is absent, not hidden'
        : 'the dashboard renders responsively; there is no gate',
      async ({ page }) => {
        test.setTimeout(150_000); // see the desktop beforeEach
        await signInAs(page, spec.role);

        if (spec.mobile === 'gate') {
          await expect(page.getByText('This dashboard needs a bigger screen')).toBeVisible();
          // Absent, not merely invisible — FLAG-203 was exactly the case where
          // the records sat in the DOM behind a polite notice.
          await expect(page.getByRole('navigation')).toHaveCount(0);
        } else {
          // The exact inverse, and it has to be asserted rather than assumed:
          // `smallScreenGateFor` is one omitted prop away from silently turning
          // the patient portal into a "get a bigger screen" notice on the only
          // device patients use. `docs/DESIGN-VERIFICATION.md` calls this "the
          // mistake most likely to reach review".
          await expect(page.getByText('This dashboard needs a bigger screen')).toHaveCount(0);
          // Present in the DOM at 390px, off-canvas behind the menu button —
          // that is FLAG-025 (the drawer is mounted unconditionally and hidden
          // with `-translate-x-full`), so count is 1, not 0. No PHI concern
          // here: this dashboard shows the signed-in patient their own records.
          await expect(page.getByRole('navigation')).toHaveCount(1);
        }
      },
    );
  });
}
