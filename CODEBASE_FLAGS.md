# Codebase Flags

> Known issues, logged shortcuts, and anything noticed but not fixed.
>
> **Why this file exists:** our North Star is *progressive hardening, not a rewrite*. `develop` may
> carry shortcuts — **only if they are logged here.** An undocumented shortcut is the real problem;
> a documented one is a plan. Real patient data (PHI) is arriving, so everything we let slide now
> has to be findable later.
>
> **How flags are created:** during a **review**, "let's fix that" means *add a flag here* — not
> edit source. Fixes happen in their own session, branch, and PR.

---

## FLAG number ranges

Each dev owns a range, so numbers never collide between agents that cannot see each other's memory.
Frontend numbering is **independent** of the backend repo's.

| Range | Owner |
|---|---|
| 001–199 | @Bastoh |
| 200–399 | @Qeeyat |
| 400+ | unallocated — assign the next block when a dev joins |

**Always take the next free number in your own range.** Never renumber someone else's flag.

## Legend

**Severity** — `P0` breaks a core workflow or exposes data · `P1` must be fixed before PHI lands ·
`P2` should fix before beta · `P3` hygiene / cleanup

**Status** — `OPEN` · `IN PROGRESS` · `FIXED` (add the PR) · `WONTFIX` (add the reasoning)

Every flag needs a **Done when** that someone else can verify without asking the author.

---

## Open flags

### FLAG-001 — Authorization is decided from a client-writable cookie
**Severity:** P1 · **Area:** Security / Auth · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08, codebase survey

The `hc_user` cookie is set `httpOnly: false` (`src/lib/auth.ts:30`) so the UI can read the user's
name and role. But it is also what every role gate reads:

```ts
// src/app/[slug]/doctor/page.tsx:11 — same pattern on all six dashboards
if (!user || user.role !== ROLES.DOCTOR) redirect(`/${slug}/signin`);
```

`src/middleware.ts:68` parses the same cookie for redirect decisions. A user can edit
`document.cookie` to set `role: "DOCTOR"` and any `organization_slug`, then load another org's
dashboard shell.

**Impact today is limited:** every real data fetch carries the bearer token and DRF enforces
permissions server-side, so the attacker lands in an empty skeleton getting 403s. It is not a data
breach. It *is* a client-trusted authorization decision, and that stops being theoretical the
moment PHI arrives.

**Done when:** role/tenant gating decides from a server-trusted source (access token claims or a
server-side lookup), the `hc_user` cookie is display-only, and a test proves a tampered `hc_user`
cookie cannot render another role's or another org's dashboard.

---

### FLAG-002 — Backend base URL is stale in three committed places
**Severity:** P1 · **Area:** Config / Deploy · **Owner:** @Bastoh · **Status:** ⚠️ **PARTIALLY FIXED**
— codebase purged in PR `fix/tier1-infra-batch` (2026-08-12, sprint item A2). **Still open on the
infra half:** Vercel per-environment env vars are not yet set and no deployed build has been
verified against the new backend. Closes when B1/B3 land.
**Found:** 2026-08-08

The backend URL changed. The old Railway URL is still hardcoded in:

- `next.config.ts:3` — `const BACKEND = …`, baked into the CSP `connect-src`
- `.env.example` — documented as the production value
- `CLAUDE.md` — *(corrected 2026-08-09: now carries a warning instead of the URL)*

Runtime severity is low because the browser only ever calls same-origin `/api/*`, which
`connect-src 'self'` already covers — the constant is effectively vestigial. The real cost is that
it mis-documents the contract seam in the first two places a new dev looks, and it blocks live
schema verification (see FLAG-003).

**Done when:** the new URL is confirmed, `.env.example` and `next.config.ts` are updated, Vercel
env vars are checked per environment, and a request from a deployed build is verified against the
new backend.

---

### FLAG-003 — Contract claims are unverified against the live schema
**Severity:** P1 · **Area:** Backend contract · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08

The live `/api/v1/schema/` could not be reached during the survey (URL change, FLAG-002). Every
contract claim currently in these docs — including FLAG-004 — is sourced from the July
`CONTRACT-AUDIT.md`, **not from today's schema.** Several `useApi<>` call sites hedge their types
(`Ward[] | Paginated<Ward>`) precisely because nobody has confirmed which shape comes back.

Our stated rule is that the live schema is the single source of truth, so the docs are currently
asserting things we have not checked.

**Done when:** the live schema has been re-fetched against the new URL, every `ENDPOINTS` entry in
`src/lib/config.ts` is confirmed to exist, the hedged union types are narrowed to the real shape,
and the BACKEND CONTRACT NOTES banner in `HANDOFF.md` reflects verified findings with the date.

---

### FLAG-004 — Doctor dashboard uses two query params the backend ignores
**Severity:** P2 · **Area:** Backend contract · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08 (originally logged in `CONTRACT-AUDIT.md` as GLOBAL-2, never fixed)

```ts
// src/components/dashboard/doctor/DoctorDashboard.tsx:56
DOC_APPOINTMENTS + '?today=true&page_size=6'   // ?today= is silently IGNORED by DRF
// src/components/dashboard/doctor/DoctorDashboard.tsx:58
DOC_EPISODES + '?status=OPEN&page_size=5'      // enum is ACTIVE, not OPEN → always 0 rows
```

So "today's appointments" silently lists *all* appointments, and "recent episodes" renders
permanently empty. Both fail with **no error** — the classic invented-query-param bug class in
this repo.

**Done when:** both params are verified against the live schema and corrected (`?status=ACTIVE`;
`?today=` replaced with whatever the schema actually supports, or the filter done client-side),
with a regression test asserting the requested URL.

---

### FLAG-005 — `serverFetch` swallows every failure as `null`
**Severity:** P2 · **Area:** Observability / Error handling · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08 (originally AUTH-6; partially mitigated, root cause remains)

`src/lib/server-fetch.ts:20-24` turns auth errors, 500s, network failures, and malformed JSON all
into `null` — indistinguishable from "no data". Dashboards mitigate by re-fetching client-side when
`initialStats` is null, but nothing is ever logged.

Production incidents will present as a silently empty dashboard with no signal anywhere.

**Done when:** `serverFetch` distinguishes error from empty (throws, or returns a discriminated
result), failures are logged server-side with status and path, and callers render an error state
rather than an empty one.

---

### FLAG-006 — Lint is dead and there is no CI
**Severity:** P2 · **Area:** Tooling · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08

`package.json` defines `"lint": "next lint"` and `eslint-config-next` is installed, but **no
`eslint.config.*` or `.eslintrc*` exists** — lint has never actually run. There is **no `.github/`
directory at all**: no Actions, no PR template, no CODEOWNERS.

Combined with branch protection being unenforceable on a private repo, *every* check (tsc, tests,
build) is manual and honour-system. On a team where two agents can't see each other, that's the
weakest link.

**Done when:** an ESLint flat config exists and `npm run lint` passes clean, and a GitHub Actions
workflow runs lint + `tsc --noEmit` + `npm test` + `npm run build` on every PR into `develop`.

---

### FLAG-007 — Login rate limiter is per-instance memory
**Severity:** P2 · **Area:** Security · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08

`src/app/api/auth/login/route.ts:14` holds attempt counts in an in-memory `Map`. On Vercel that is
per-lambda-instance and resets on every cold start, so it is close to decorative against a real
attacker distributing attempts. The code comment already concedes this.

**Done when:** rate limiting is backed by shared state (Redis/Upstash or equivalent) **or** we
confirm the backend enforces login throttling itself and this layer is documented as defence in
depth only.

---

### FLAG-008 — Dead constants imply a session timeout that doesn't exist
**Severity:** P3 · **Area:** Cleanup · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08

`TOKEN_KEYS` and `SESSION_TIMEOUT_MS` in `src/lib/config.ts` have **zero references** in `src/` —
leftovers from the localStorage-era vanilla app. `SESSION_TIMEOUT_MS = 30 minutes` in particular
implies an idle-session timeout that **is not implemented anywhere**.

That's actively misleading: a reader (human or agent) reasonably concludes idle sessions expire.
For a medical records product on shared clinic machines, they arguably should.

**Done when:** both constants are deleted, **and** a decision on idle-session timeout is recorded —
either implemented, or logged as a deliberate deferral in `BETA_READINESS.md`.

---

### FLAG-009 — The API reference is gitignored, contradicting the contract-seam rule
**Severity:** P3 · **Area:** Docs / Process · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-08

`API-doc.md` and `FRONTEND_HANDOFF.pdf` are in `.gitignore`, so they exist only on one machine.
Any other dev — and every other dev's agent — cannot see them. Meanwhile `MIGRATION-PLAN.md` is
complete history and `CONTRACT-AUDIT.md` is partially stale, with no marking to say so.

If a local file is load-bearing for understanding the API, the docs channel between agents is
broken by design.

**Done when:** the live schema is the only referenced API source; `CONTRACT-AUDIT.md` and
`MIGRATION-PLAN.md` are either updated or clearly marked historical; and no committed doc points a
reader at a gitignored file.

---

### FLAG-010 — Backend's login `redirect_to` drops the org slug (unused today, loaded gun)
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-12, while researching A8 in the backend repo ·
**Reproduced live 2026-08-13** on the newly seeded `api-dev`: `POST /auth/login/demo-clinic/` as
`doctor@demo.test` returned `redirect_to: "/doctor/"`. Previously this was read out of their source
only — it is now confirmed in the deployed build, so the field is live and wrong, not theoretical.

`healthclouda-backend` builds the login response's `redirect_to` from `FRONTEND_ROLE_PATHS`
(`healthclouda/settings/base.py:406`), which has **no org slug in it**:

```python
FRONTEND_ROLE_PATHS = {'DOCTOR': '/doctor/', 'NURSE': '/nurse/', ...}

# apps/accounts/views.py:217 — takes org_slug, then ignores it
def _get_redirect_url(self, user, org_slug):
    role_paths = getattr(settings, 'FRONTEND_ROLE_PATHS', {})
    return role_paths.get(user.role, '/signin')
```

Our staff routes are `/[slug]/doctor`, so `/doctor/` would be resolved as an **org slug named
"doctor"**, hit `notFound()`, and 404.

**Impact today is zero, and that's exactly the risk.** We never read `redirect_to` — the only
redirect we consume is `redirect_url` from the **400** staff-on-general-portal response
(`src/types/auth.ts:72`), which is correctly built. So nothing is broken, nothing will go red, and
the field sits there looking usable. The next person to wire "redirect after login" from the
response they're already parsing gets a 404 for every staff role, in a codebase where invented and
half-wired contract fields are a known recurring bug class.

Deliberately **not** bundled into backend issue #107 (A8 / `FRONTEND_URL` tiering) — different
concern, and #107 is time-critical for the beta tiers.

**Done when:** either the backend prefixes the org slug (`/<org_slug>/doctor/`) and we consume
`redirect_to`, **or** we record that we ignore the field by design and the backend drops it. Any
future use of `redirect_to` must be checked against `src/lib/router.ts` first.

---

### FLAG-011 — Dashboard design tokens fail WCAG AA contrast
**Severity:** P2 · **Area:** Accessibility · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-12, reviewing PR #67 (DASH-1 shared shell)

The dashboard token block added to `src/app/globals.css` fails AA at the sizes it is used. Measured,
not eyeballed:

| Token | Used for | Ratio | AA needs |
|---|---|---|---|
| `--color-nav-muted: #c0c8d8` | sidebar section labels, 10.5px bold | **1.68:1** | 4.5:1 |
| `--color-placeholder: #b0bcc8` | input placeholders | **1.93:1** | 4.5:1 |
| `--color-warning` on `--color-warning-bg` | status badges, 11px bold | **2.86:1** | 4.5:1 |
| `--color-success` on `--color-success-bg` | status badges | **3.00:1** | 4.5:1 |
| `--color-danger` on `--color-danger-bg` | status badges | **3.95:1** | 4.5:1 |
| `--color-info` on `--color-info-bg` | status badges | **4.24:1** | 4.5:1 |

`--color-text-soft` (4.83:1) and `--color-text-mid` (10.31:1) pass. Badge text is 11px **bold**,
which does **not** qualify as WCAG "large text" (that needs 18.66px bold / 24px regular), so 4.5:1
is the bar for all of the above.

**These come from `design_handoff_dashboards/README.md` — PR #67 implemented them faithfully.** This
is a flaw in the spec, not in that PR, which is why it is logged here rather than raised as a change
request against it. Precedent: the 2:1 favicon squashed into a square slot (`fix/brand-assets`,
2026-07-13) was also inherited from a design file.

**Why it matters beyond compliance:** status badges are how staff scan a list — an occupied bed, a
suspended org, a denied access request. Low-contrast state colour on a ward monitor at an angle, or
for a colour-vision-deficient clinician, is a misread rather than an annoyance. Fixing it at the
token level is one change; fixing it after DASH-2…6 inherit it is six.

**Done when:** every token pair used for text meets 4.5:1 at its rendered size (or the size is
raised to qualify as large text), the fix is made in `globals.css` **once** rather than per
component, the design source is updated or the deviation recorded, and a contrast check is part of
the T8 accessibility pass.

---

### FLAG-012 — Two contradictory punctuation conventions, and the visible one is the old one
**Severity:** P3 · **Area:** Copy / Design system · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-13, reviewing PR #73

PR #73 removed em dashes from UI copy across all six `design_handoff_dashboards/*.dc.html` files,
replacing each with the mark that fits the sentence. Good change, correctly scoped away from the
`'—'` empty-value placeholders, and landed **before** DASH-2…6 are built from those files.

But the convention now exists in exactly one place. It is **not** applied to:

- `design_handoff_prelogin/` — 16 em dashes in the Auth Pages design, 26 in Landing, 4 in Org Landing.
- **Shipped application copy**, including the public landing page: `src/app/page.tsx` carries
  *"your records and referrals move with you — securely"* and *"Patient accounts are created at any
  registered HealthClouda facility — not online"*, with the same pattern across the org landing and
  auth screens.

So the repo holds two contradictory conventions and **the one a visitor actually sees is the old
one.** Nothing in `CLAUDE.md` or either design README states a punctuation rule, so the only record
of the decision is a PR title. The next person building D4 Receptionist from a `.dc.html` has no way
to tell which is right, and the likeliest outcome is that em dashes get reintroduced by whoever
writes the next piece of copy — which is the same failure mode as an undocumented shortcut.

Cosmetic in isolation. Logged because it is a **decision that was made but not written down**, and
this repo's whole premise is that undocumented decisions are invisible to the other dev's agent.

**Done when:** the intended scope is stated in writing where an agent will read it (`CLAUDE.md` or
the design READMEs) — either "dashboard design system only, deliberately", or "repo-wide", in which
case the prelogin designs and shipped copy get the same pass in their own PR.

---

### FLAG-200 — `npm install` reports 7 high severity dependency vulnerabilities
**Severity:** P2 · **Area:** Dependencies / Supply chain · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-10, first `npm install` this session

Fresh `npm install` (461 packages) reports 7 high severity advisories via `npm audit`. Not yet
triaged — could be transitive/dev-only with low real risk, or something that matters before PHI
lands. Ties into the supply-chain concern Bastoh raised for `SECURITY_BASELINE.md` ("every npm
dep runs with full DOM access").

**Done when:** `npm audit` output triaged advisory-by-advisory (transitive/dev-only vs.
runtime-reachable), fixes applied via `npm audit fix` or explicit version bumps in their own PR,
and any remaining accepted risk is documented here or in `SECURITY_BASELINE.md`.

---

### FLAG-201 — `Modal` focus handling is nominal, not a real trap
**Severity:** P2 · **Area:** Accessibility · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-13, reviewing PR #69 (DASH-1 overlays)

`src/components/ui/Modal.tsx` focuses the panel once on open, but that's the extent of it:

- Tab walks straight out of the dialog into the page behind it — no containment.
- Focus isn't restored to the trigger element on close.
- No body-scroll lock — the page behind the modal still scrolls.
- `id="modal-title"` (and `modal-description`) are hardcoded, so two `Modal`s open at once would
  duplicate IDs and break `aria-labelledby`/`aria-describedby` for both.

Pre-existing before PR #69, but that PR promotes `Modal` to the shared base every DASH-2…6 confirm
dialog and form modal sits on, which changes the blast radius from "one dashboard" to "five."

**Done when:** Tab/Shift+Tab stay contained inside the open dialog, focus returns to the trigger on
close, body scroll is locked while open, and the title/description IDs are generated per-instance
(e.g. `useId()`).

---

### FLAG-202 — New entrance animations have no `prefers-reduced-motion` guard
**Severity:** P3 · **Area:** Accessibility · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-13, reviewing PR #69 (DASH-1 overlays)

`hc-panel-in`, `hc-modal-in`, `hc-toast-in` (`src/app/globals.css`) run unconditionally. Same gap
as the pre-existing `hc-blink`/`hc-pop` on the auth screens — repo-wide, not introduced by this PR,
but the dashboard set adds three more instances of it.

**Done when:** a single `@media (prefers-reduced-motion: reduce)` block disables/shortens all five
keyframes (or swaps to opacity-only), fixed once rather than per animation.

---

### FLAG-203 — `SmallScreenGate` hides the dashboard visually, not functionally
**Severity:** P1 · **Area:** Security / PHI · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-13, reviewing PR #69 (DASH-1 overlays)

`DashboardShell`'s `smallScreenGateFor` prop hides the shell below 768px with `hidden md:flex`
(pure CSS, no JS breakpoint check). The dashboard's children still mount, still call `/api/data`,
and the fetched PHI still lands in that device's DOM and memory — it's `display: none`, not absent.
The notice text ("This dashboard needs a bigger screen") reads as a guarantee the implementation
doesn't make.

**Chosen deliberately, not a bug found late:** a JS breakpoint check would avoid the fetch but costs
an SSR/hydration flash (server can't know the client's viewport), and server-side UA sniffing is a
bigger change than this PR's scope. CSS-only was the right call for a first pass — this flag exists
so the tradeoff is a recorded decision instead of a silent side effect, per the reviewer's ask.

**Why P1 and not P2/P3 like the others above:** this is a live PHI leakage channel once beta data
is real (3 Sep) — it belongs in the PHI-leakage-channels section of the still-unwritten
`SECURITY_BASELINE.md`, alongside bfcache/URL-history/screenshot channels, not just as a frontend
polish item.

**Done when:** either (a) the dashboard genuinely doesn't fetch below 768px — a JS check that
accepts a brief flash, or a server-side device hint — or (b) the risk is explicitly accepted in
`SECURITY_BASELINE.md` with a stated reason (e.g. "no PHI-bearing dashboard is realistically opened
on a sub-768px device in a clinic" — a claim that should be verified, not assumed).

---

### FLAG-204 — Persistent toasts have no cap, dedupe, or dismiss-all
**Severity:** P3 · **Area:** UX · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-13, reviewing PR #69 (DASH-1 overlays)

Error/warning toasts now persist until manually dismissed (fix for the auto-dismiss timing gap
above). `add()` in `src/store/toast.ts` appends to the list unconditionally — no cap, no
deduplication of an identical repeated message, no "dismiss all."

**Checked before raising, not just theorised:** all six current `toast.error` call sites are
user-initiated actions, not per-keystroke, so today's usage is bounded — a user has to click
something five times to get five stacked toasts. Not urgent, but DASH-2…6 add a lot more write
actions onto this same surface, and a retried failing action (e.g. a flaky save) now stacks
permanent toasts off the top of a fixed-position container with no way to clear them at once.

**Done when:** `useToastStore` either caps the visible list (oldest auto-removed or a "+N more"
summary), deduplicates an identical consecutive message, or a "Clear all" affordance exists —
whichever fits the actual DASH-2…6 usage once it's written, rather than guessed now.

---

### FLAG-205 — Org/User list endpoints don't support the filters the design assumes
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-14/15, building D1 Superadmin pages, verified against the live schema

`design_handoff_dashboards`'s Organisations page has Type + Status filter dropdowns; the Users page
has Role + Status + Organisation dropdowns. The live schema for both list endpoints
(`auth_users_list`, `org_list`) documents exactly three query params: `search`, `ordering`, `page`.
No `type`, `status`, `role`, or `organization` filter param exists on either.

**Dropped rather than invented** — adding `?org_type=` or `?role=` would be exactly the
invented-query-param bug class this repo has hit before (GLOBAL-2, FLAG-004): DRF would silently
ignore it and the dropdown would look functional while doing nothing. `src/components/dashboard/
superadmin/SuperadminDashboard.tsx` ships search + column sort only on both tables.

**Done when:** either the backend adds the filter params (an `api-request` issue, not filed yet —
low urgency, these are UX conveniences with client-visible workarounds: search covers most of the
same need) or the filters are implemented as accepted client-side-only filtering of the current
page (misleading across pages, so not done here without a product decision either way).

---

### FLAG-206 — No backend concept of "pending invite"; inferred from `last_login == null`
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-14/15, building D1 Superadmin pages, verified against the live schema

The design's Users page shows a per-user "Invite pending" state and a Dashboard-level "Pending
Invites" stat card + list. Neither `UserList` nor `UserDetail` in the live schema has a dedicated
field for it (no `is_pending`, no `has_set_password`). Implemented the per-row badge as
`last_login == null` — a reasonable proxy (a user literally cannot have logged in without having
set a password first), but never confirmed as the backend's own definition.

**Bigger gap, deliberately not built:** the Dashboard-level "Pending Invites" stat card and list
from the design are **not implemented**. `SuperadminStats` has no `pending_invites` field, and
there's no filter param (see FLAG-205) to fetch an accurate global count — only a page-restricted
`last_login == null` count would be available, which undercounts past page 1 and would present a
wrong number confidently. Overview keeps the four stat cards that already have real values
(Total Users, Organisations, Active Orgs, Total Patients) instead.

**Done when:** the backend either adds `pending_invites` to the stats response, adds a filter param
so an accurate count is fetchable, or confirms `last_login == null` is the intended definition and
documents it — then the stat card and dashboard-level pending-invites list can be built for real.

---

## Resolved flags

*(none yet — move entries here with their PR number and resolution date)*

---

*Last updated 2026-08-15. Flags 001–009 raised from the 2026-08-08 codebase survey. FLAG-200 raised
2026-08-10 (Qeeyat's first session). FLAG-010 and FLAG-011 raised 2026-08-12; FLAG-002 partially
fixed by PR #65. FLAG-201/202/203/204 raised 2026-08-13, reviewing PR #69. FLAG-205/206 raised
2026-08-14/15, building D1 Superadmin pages.*
