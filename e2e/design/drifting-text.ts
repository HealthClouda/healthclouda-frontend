/**
 * Text this application renders that changes with **the clock**, not with the
 * code — the only thing a screenshot baseline can never hold.
 *
 * ⚠️ **Read FLAG-235 before editing this list.** The list it replaces masked
 * `/\d+ (second|minute|hour|day)s? ago/i` and `/Today,/i`, and this app has
 * **never emitted either string**: `timeAgo()` returns the abbreviated
 * `12d ago`, and the only `Today,` in `src/` is `isToday,` inside an import
 * list. Playwright masked zero elements for months, nothing errored, and every
 * committed baseline holding a relative time has been date-dependent since the
 * day it was captured. The nurse row was not the defect — it was the first one
 * whose drift changed the string *width* enough to move a table and cross the
 * pixel threshold.
 *
 * 🔑 **A mask that matches nothing is worse than no mask, because it reads as
 * coverage.** So every pattern here names the code that produces it, and
 * `src/lib/drifting-text.contract.test.ts` feeds the real producer's output
 * through these patterns in **vitest** — which runs in CI, where Playwright
 * does not. Change `timeAgo()`'s format without changing this list and that
 * test goes red.
 *
 * Deliberately NOT masked: `formatDate()` / `formatDateTime()` / `formatTime()`.
 * Those render an absolute instant ("04 Sep 2026"), which is stable as long as
 * the underlying row is — they drift only when the *data* moves, and that is a
 * real change a baseline should catch.
 */
export const DRIFTING_TEXT_PATTERNS: readonly RegExp[] = [
  // `timeAgo()` — src/lib/utils.ts. Returns "just now", "5m ago", "3h ago",
  // "12d ago" — abbreviated units, never the spelled-out "5 minutes ago".
  // Eight call sites: doctor episodes, nurse vitals, patient notifications,
  // receptionist check-ins, superadmin recent activity and audit log.
  /\b\d+[mhd] ago\b/i,
  /\bjust now\b/i,

  // `({length_of_stay}d)` — NurseDashboard.tsx, the Admitted column, and the
  // only view that takes the `admittedAsDate` branch. `length_of_stay` is
  // computed by the BACKEND from the admission date, so it increments every
  // day on its own: no deploy, no data change, no code change. This is the
  // one FLAG-235 was raised on.
  /\(\d+d\)/,
] as const;
