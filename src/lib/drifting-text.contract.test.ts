import { describe, it, expect } from 'vitest';
import { timeAgo } from './utils';
import { DRIFTING_TEXT_PATTERNS } from '../../e2e/design/drifting-text';

/**
 * FLAG-235 — the screenshot harness's content masks are only protection if they
 * match strings this app actually renders. The list they replaced matched
 * `"12 days ago"` and `"Today,"`; `timeAgo()` returns `"12d ago"` and nothing
 * renders `"Today,"` at all, so Playwright masked **zero elements** while the
 * list read as coverage. Every baseline holding a relative time has been
 * date-dependent since it was captured.
 *
 * ⚠️ **This test exists because the harness cannot check itself.** Playwright
 * does not run in CI (no credentials, by design — see `roles.spec.ts`), so a
 * mask can rot for months without a single red run. Vitest does run in CI, so
 * the binding between `timeAgo()` and the mask list is asserted here instead:
 * change the format `timeAgo()` returns without updating
 * `e2e/design/drifting-text.ts` and this goes red immediately.
 *
 * It deliberately drives the **real** `timeAgo()` rather than restating its
 * output as string literals. A fixture of hand-written expected strings is the
 * same mistake one layer down — it would agree with the mask list while both
 * disagreed with the app (FLAG-221).
 */

const matchesSomePattern = (s: string) => DRIFTING_TEXT_PATTERNS.some(re => re.test(s));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const agoBy = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('FLAG-235 — every clock-dependent string the app renders is masked', () => {
  // One case per branch of timeAgo(): just now / m / h / d.
  it.each([
    ['just now', agoBy(10_000)],
    ['minutes', agoBy(5 * MINUTE)],
    ['hours', agoBy(3 * HOUR)],
    ['days', agoBy(12 * DAY)],
    // The boundaries, because they are where a format change lands first.
    ['59 minutes', agoBy(59 * MINUTE)],
    ['23 hours', agoBy(23 * HOUR)],
    ['exactly 1 day', agoBy(DAY)],
  ])('masks timeAgo() output for %s', (_label, iso) => {
    const rendered = timeAgo(iso);
    expect(
      matchesSomePattern(rendered),
      `timeAgo() renders "${rendered}", which NO pattern in ` +
        `e2e/design/drifting-text.ts matches. Every screenshot baseline showing ` +
        `this value is now date-dependent and will drift until it crosses the ` +
        `pixel threshold — that is FLAG-235 happening again. Fix the pattern ` +
        `list, then regenerate every baseline once.`,
    ).toBe(true);
  });

  it('masks the nurse length-of-stay counter, which the BACKEND increments daily', () => {
    // NurseDashboard renders `({a.length_of_stay}d)` beside the admitted date.
    // No deploy and no data change is needed for this to move.
    expect(matchesSomePattern('(1d)')).toBe(true);
    expect(matchesSomePattern('(13d)')).toBe(true);
    expect(matchesSomePattern('(365d)')).toBe(true);
  });

  it('does NOT mask absolute dates, which are stable and should fail a baseline when they move', () => {
    // formatDate/formatDateTime/formatTime render a fixed instant. Masking
    // those would hide real data changes — the opposite failure to FLAG-235,
    // and the reason this list is narrow rather than "anything date-shaped".
    for (const stable of ['04 Sep 2026', '04 Sep 2026, 14:30', '14:30', 'Admitted', 'Ward B / Bed 3']) {
      expect(
        matchesSomePattern(stable),
        `"${stable}" is masked, but it is stable text — masking it would hide a ` +
          `real regression rather than a clock tick.`,
      ).toBe(false);
    }
  });

  it('no pattern is dead: each one matches at least one string the app can render', () => {
    // The actual FLAG-235 defect, asserted directly: a pattern that matches
    // nothing is worse than no pattern, because it reads as protection.
    const producible = [
      timeAgo(agoBy(5 * MINUTE)),
      timeAgo(agoBy(3 * HOUR)),
      timeAgo(agoBy(12 * DAY)),
      timeAgo(agoBy(10_000)),
      '(13d)',
    ];
    for (const re of DRIFTING_TEXT_PATTERNS) {
      expect(
        producible.some(s => re.test(s)),
        `Pattern ${re} matches none of the strings this app produces ` +
          `(${producible.map(s => `"${s}"`).join(', ')}). That is exactly the ` +
          `FLAG-235 defect: a mask that reads as coverage and masks nothing.`,
      ).toBe(true);
    }
  });
});
