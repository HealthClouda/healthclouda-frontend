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

**The number follows who *raised* it; the `Owner:` line says who *fixes* it.** Those are not always
the same person, and the number must never be taken from the other dev's range — their agent cannot
see this file mid-session and would pick the same next number. Example: FLAG-013/014/015 were raised
by @Bastoh (so they sit in 001–199) but are owned by @Qeeyat, who was concurrently adding FLAG-205…209
in open PRs. Numbering them 210+ would have collided with work already in flight.

🔑 **An unmerged PR reserves a flag number — but so does a *review comment*, and only the file is
checked for collisions.** (@Qeeyat's formulation, 2026-08-19, after it bit us.) A number quoted in a
review is already load-bearing: the author may write it into code before it is ever written into this
file. That is exactly how FLAG-013 ended up in three merged source comments meaning one thing while
this file meant another. **Before renumbering anything you have already named in a review, grep the
codebase for the old number** — and if it has landed, change the docs, not the code.

⚠️ **Check the live file, not your memory, before taking a number.** FLAG-012 was very nearly issued
twice on 2026-08-17 for exactly this reason — a stale local `develop` didn't yet contain it.
`git fetch` first.

## Legend

**Severity** — `P0` breaks a core workflow or exposes data · `P1` must be fixed before PHI lands ·
`P2` should fix before beta · `P3` hygiene / cleanup

**Status** — `OPEN` · `IN PROGRESS` · `FIXED` (add the PR) · `WONTFIX` (add the reasoning)

Every flag needs a **Done when** that someone else can verify without asking the author.

---

## Open flags

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
**Severity:** P2 · **Area:** Backend contract · **Owner:** @Bastoh ·
**Status:** ✅ **FIXED in PR #90** (2026-08-22, by @Qeeyat) — *stays here until that PR merges;
move to Resolved then*
**Found:** 2026-08-08 (originally logged in `CONTRACT-AUDIT.md` as GLOBAL-2, never fixed)

> **How it was fixed, and the part that could not be verified.** `?status=OPEN` → `?status=ACTIVE`:
> settled against the live schema 2026-08-22, `EpisodeListStatusEnum = ["ACTIVE","COMPLETED"]`, so
> `OPEN` could never match. `?today=true` was dropped and today-ness is now filtered **client-side**,
> which the "Done when" below explicitly allows.
>
> ⚠️ **Neither `/doctor/episodes/` nor `/doctor/appointments/` documents a single query parameter —
> not even `page`.** On this backend that is not evidence of non-support (see the correction in
> FLAG-205), but it is not evidence of support either, and **no doctor account exists in
> `.env.local`**, so `?status=` could not be confirmed empirically. The fix therefore sends the
> correct value *and* narrows client-side, which is right either way. Anyone who gets a doctor token
> should confirm whether `?status=` is honoured — if it is, the client-side narrowing becomes
> belt-and-braces rather than load-bearing. The new pagination-window limitation this introduces is
> **FLAG-214**.
>
> 🔍 **This flag had a THIRD site it never named, and it was the worst one.** The entry quotes only
> the two overview lines (`:56`, `:58`). The **Episodes page** carried the same invented enum: filter
> tabs labelled *Open* / *Closed* sending `?status=OPEN` / `?status=CLOSED`, and — the real damage —
> the row action gated on `ep.status === 'OPEN'`. **No episode can ever be `OPEN`, so the Complete
> Episode button never rendered for anybody.** That is one of the handful of write workflows that
> exist at all in this app (sprint plan Part 1 §3), unreachable through the UI, with nothing failing
> and nothing logged. Found while starting the D5 design migration and fixed in the same PR.
> **Lesson: a flag that quotes line numbers invites fixing exactly those lines. Grep the whole file
> for the bad value before calling a flag closed.**

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
**Severity:** P2 · **Area:** Observability / Error handling · **Owner:** @Bastoh · **Status:** 🟡 **PARTIALLY FIXED 2026-08-28** — two of three clauses done; see below
**Found:** 2026-08-08 (originally AUTH-6; partially mitigated, root cause remains)

`src/lib/server-fetch.ts:20-24` turns auth errors, 500s, network failures, and malformed JSON all
into `null` — indistinguishable from "no data". Dashboards mitigate by re-fetching client-side when
`initialStats` is null, but nothing is ever logged.

Production incidents will present as a silently empty dashboard with no signal anywhere.

**Done when:** `serverFetch` distinguishes error from empty (throws, or returns a discriminated
result), failures are logged server-side with status and path, and callers render an error state
rather than an empty one.

> 🟡 **Two of the three clauses are done (2026-08-28).** `serverFetchResult()` returns a discriminated
> `{ok:true,data} | {ok:false,status,reason}` with reasons `unauthorized | forbidden | not_found |
> server | network | malformed | no_token`, and every failure is logged as
> `[serverFetch] <reason> status=<n> path=<endpoint>`.
>
> **Status and path only — never the body, never the token.** Response bodies from this API carry
> patient data, and a log line is the wrong place for it.
>
> `no_token` is deliberately **not** logged: a logged-out visitor on a server-rendered route is a
> normal state, and logging it would produce an error line per anonymous page view — noise that would
> get the whole log ignored.
>
> ⚠️ **`serverFetch()` keeps its exact contract** (`T | null`). That is on purpose: `requireDashboardUser()`
> (FLAG-001) treats `null` as DENY, which is correct fail-closed behaviour for an authorization gate.
> This change adds signal without moving that goalpost, and every existing caller gets logging for free.
>
> **What remains — the third clause, narrower than the flag implies.** Dashboards already render
> `ErrorState` for their *client-side* fetches (`useApi` / `usePaginatedList`), so the gap is only the
> **server-rendered stat cards**: on failure they show `—` as though the data were empty. Closing it
> means threading an error prop through all six dashboard components.
>
> **Deliberately not done in this PR:** those six files are the design lane's active work surface
> (D4/D5/D6), and a wide mechanical edit across them would collide with @Qeeyat's open branches for a
> cosmetic gain. Better folded into whichever design PR next touches each dashboard. Recorded rather
> than quietly dropped.

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

### FLAG-013 — `?page_size=` is not a supported param on most list endpoints
**Severity:** P2 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN — **confirmed
live; partially fixed by PR #76**
**Found:** 2026-08-17, reviewing PR #76 (Superadmin pages) ·
**Raised by** @Bastoh, **assigned to** @Qeeyat ·
**Confirmed by measurement** by @Qeeyat 2026-08-17 (PR #76, commit `b6fa74c`)

> **Numbering note:** this is **013** deliberately, matching the three in-code comments already merged
> on `develop` (`SuperadminDashboard.tsx:127`, `:476`, `SuperadminDashboard.test.tsx:90`). The
> reviewer's first pass called it 013, renumbered it to 014 mid-review after finding FLAG-012 already
> taken, then settled back on 013 so merged source did not have to be edited to match a docs file.
> **Do not "tidy" this back to 014** without changing those three comments in the same PR.

`usePaginatedList` (`src/hooks/use-api.ts`) appends `?page_size=20` to **every** list request and
then derives `totalPages` from that same 20. `DataTable` separately renders "1–20 of N" from a
`pageSize` prop callers pass by hand.

**Verified against the live schema 2026-08-17** (`https://api-dev.healthclouda.com/api/v1/schema/`):
`page_size` is documented on exactly **two** endpoints in the entire API —
`/org/{slug}/announcements/` and `/org/contacts/`. It is **not** on `/org/`, `/auth/users/` or
`/audit/logs/`, which document only `ordering`/`page`/`search` plus the audit filters. DRF's
`PageNumberPagination` ignores `page_size` unless `page_size_query_param` is configured.

🔬 **That schema reasoning is NOT what settled this — copy the method, not the inference.** Absence
from the schema is *not* evidence of non-support on this backend: several apps are hand-rolled
`APIView`s documenting no params at all, not even the pagination they demonstrably have. FLAG-205 was
partly disproven exactly this way (`?role=` works despite being undocumented). The schema reading
justified *going and measuring*; only the measurement below is evidence.

**Settled by measurement against `api-dev` 2026-08-17 — the param is genuinely ignored:**

```
GET /audit/logs/              count 162, results 20, next ?page=2
GET /audit/logs/?page_size=5  count 162, results 20   <- ignored
GET /auth/users/?page_size=1  count 7,   results 7    <- ignored
```

**The real page size is 20 and `?page=` works.** So `usePaginatedList`'s hardcoded 20 is currently
correct — **by coincidence, not by contract.** Nothing errors, and the footer happens not to lie
today. The day the backend changes its `PAGE_SIZE`, every list in the app silently mis-paginates and
later pages become unreachable (at a real page size of 10 with 57 records the pager would offer 3
pages and rows 31–57 could not be reached at all). Same silent-ignore class as GLOBAL-2 and FLAG-004,
**pre-existing and repo-wide** — every list on all six dashboards — not introduced by PR #76.

⚠️ **The trap that hid this since July:** the `next` URL in the response **echoes `page_size` back**
while ignoring it, so the payload looks like the param was honoured. Anyone re-checking this by
eyeballing a response will conclude it works. Measure `results.length`, not `next`.

**Already fixed in PR #76** (`b6fa74c`), so don't re-report these:
- Overview "Recent Organisations" asked for `?page_size=5` and rendered whatever the server returned
  — a **present-tense bug from the 6th organisation onward**, masked only by a single-org fixture.
  Now capped client-side with a test that fails without the cap.

**Still open:**
1. `usePaginatedList` still sends the ignored `?page_size=` on every list request, and still derives
   `totalPages` from an assumed 20 rather than from what came back.
2. `SuperadminDashboard`'s invite dropdown is capped at the first 20 organisations, so a superadmin
   **cannot invite a user into the 21st organisation** — the option simply isn't there, with no
   error. Documented in-code in #76 and deliberately left; it needs paging or a searchable picker.

⚠️ **Do not "fix" this by deriving page size from `results.length`.** That was this flag's original
prescription and it is **worse than the current assumption** — @Qeeyat caught it in review. On a
partial last page it poisons the total: 57 records at 20/page means page 3 returns 17 rows, and
`ceil(57 / 17)` = **4 phantom pages**, two of which 404. The safe signals are the presence of
`next`/`previous`, or `results.length` **from the first page only** — never from whichever page
happens to be loaded.

**Done when:** `usePaginatedList` stops sending a param the server ignores and derives page count
from `next`/`previous` (or first-page length), not from an assumed 20 nor from the current page's
length, with a regression test asserting the requested URL; the
invite dropdown pages properly or uses a searchable picker; and the measured behaviour above is
recorded in the BACKEND CONTRACT NOTES banner in `HANDOFF.md` with its date, since "the server
ignores `page_size` but echoes it in `next`" is a contract fact no schema states.

---

### FLAG-014 — The brand blue fails WCAG AA as a background for white text
**Severity:** P2 · **Area:** Accessibility · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-17, reviewing PR #77 (Button/ErrorState/Pagination token cleanup) ·
**Raised by** @Bastoh, **assigned to** @Qeeyat (design-token lane)

`--color-primary: #0075ff` carries white text in most of the app's primary actions. Measured, not
eyeballed:

| Pair | Ratio | AA needs |
|---|---|---|
| white on `--color-primary` #0075ff | **4.21:1** | 4.5:1 |
| white on `--color-primary-dark` #005fcc (hover only) | 5.98:1 | ✅ passes |
| `--color-primary` **as text** on white | **4.21:1** | 4.5:1 |

This is a **brand-token flaw, not a component flaw**, and it is app-wide rather than new: white on
`bg-primary` is already how the landing CTAs (`src/app/page.tsx:120`, `:290`), the auth submit button
(`src/components/forms/authStyles.ts:10`), the 404 action (`src/app/not-found.tsx:49`), the org
landing nav (`src/app/[slug]/page.tsx:63`) and the sidebar badge (`Sidebar.tsx:103`) all work.

**Why it surfaced in PR #77 specifically:** that PR moved `Button` from `bg-blue-600` (#2563eb,
**5.17:1**, passing) onto `bg-primary` (4.21:1, failing). At those call sites it is a measurable step
down — but the change was *correct*, because it brought a stray component into line with the system.
Blocking it would have preserved one accessible button inside an inaccessible system. Same reasoning
as FLAG-011: the spec is the problem, the implementation is faithful.

Note the resting state fails while the **hover** state passes — so a primary button becomes *more*
readable when you point at it, which is backwards.

**Done when:** one of these, re-measured afterwards rather than assumed —

1. the brand blue is darkened to clear 4.5:1 under white text (≈#0068e0 or darker), **or**
2. primary actions use `--color-primary-dark` at rest, reserving `--color-primary` for large text and
   non-text use, **or**
3. the deviation is accepted in writing **in this entry**, with a stated reason and a named decider.

Options 1 and 2 are both a single change in `globals.css`, not a per-component fix.

⚠️ **Option 3 says "in this entry" deliberately.** It previously routed the write-up to
`SECURITY_BASELINE.md` / `BETA_READINESS.md` — **neither file exists.** That is the silent-skip trap
`CLAUDE.md` §4 already warns about: a step pointing at nothing reads as satisfied, because nothing
errors. If those files are written later, move the acceptance there and update this line; until then
the acceptance has a real home.

---

### FLAG-015 — Table row-action buttons fail AA contrast
**Severity:** P2 · **Area:** Accessibility · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-17, reviewing PR #76 (Superadmin pages) ·
**Raised by** @Bastoh, **assigned to** @Qeeyat

The per-row action buttons in `SuperadminDashboard` (Organisations and Users tables) use status
colour as **text** at 11.5px semibold. Measured against white:

| Button | Token | Ratio | AA needs |
|---|---|---|---|
| **Activate** | `text-success` #16a34a | **3.30:1** | 4.5:1 |
| **Verify** / **Resend** | `text-primary` #0075ff | **4.21:1** | 4.5:1 |
| Suspend | `text-danger` #dc2626 | 4.83:1 | ✅ passes |

11.5px semibold does not qualify as WCAG "large text" (that needs 18.66px bold / 24px regular), so
4.5:1 is the bar for all three.

✅ **Target size is NOT a problem — an earlier version of this flag claimed it was, and was wrong.**
It asserted "~22px tall, under the 24×24 minimum (WCAG 2.5.8)", measured off the content box.
@Qeeyat recomputed it from the actual classes in review, and the border box clears the bar:

```
11.5px × 1.5 (Tailwind preflight line-height, not overridden) = 17.25   content
+ 4px + 4px   py-1                                            =  8
+ 1px + 1px   border                                          =  2
                                                              = 27.25px
```

The claim is retracted rather than deleted, so nobody re-derives it from the same content-box
mistake. **The contrast half stands and is the whole point of this flag** — the two were raised
together and only one of them was real.

**Why this matters beyond compliance, and why it's FLAG-011's argument again:** these are the controls
that suspend an organisation, verify one, or re-send a staff invite. They are read at a glance, off a
reception or ward monitor, often at an angle. "Activate" at 3.30:1 is the **lowest measured ratio
anywhere in the dashboard set** — lower than any badge in FLAG-011 — and it sits on a
suspend/activate pair where misreading which button is which has a real consequence.

This is FLAG-011's underlying token problem surfacing at **new call sites** (status colour as small
text on white, rather than badge text on a tint). Fixing FLAG-011 at the token level may or may not
fix this depending on how it is fixed — check both, and don't close one assuming the other.

**Done when:** every row-action label meets 4.5:1 at its rendered size, confirmed by measurement in
the T8 accessibility pass rather than by eye (compute from the border box, per the retraction above).
Coordinate with FLAG-011 and FLAG-014 so the tokens move once, not three times.

---

### FLAG-017 — Vercel deployment protection is OFF, and beta will inherit that
**Severity:** P2 · **Area:** Security / Deploy · **Owner:** @Bastoh · **Status:** OPEN — **deliberate, reversible, and dated**
**Found:** 2026-08-28, standing up the dev tier (B1/B3)

`dev.healthclouda.com` came up returning **302 → `vercel.com/sso-api`**: the project had
`ssoProtection: {"deploymentType":"all_except_custom_domains"}`, and that exemption only covers
**production** custom domains. `dev.` is a *preview*-target deployment, so it was gated to Vercel team
members — meaning the backend team could not run UAT through it and @Qeeyat could not screenshot it
(sprint plan **B5**).

**Password protection was the preferred fix and is not available:** the API refuses it with
*"Advanced Deployment Protection is not enabled on your team"* — it needs a paid plan; we are on Hobby.

So SSO was **disabled for the whole project**, with @Bastoh's explicit decision, to unblock B5.

**What this does and does not expose.** The dev tier holds **synthetic seed data only**, and the app
itself is still login-gated — this removes a layer, it does not open the records. Note also that the
apex was *already* public under the old setting, so what actually changed is that **preview URLs**
(every PR) are now world-reachable.

🔴 **The part that matters, and the reason this is a flag rather than a footnote:**
`beta.healthclouda.com` will also be a **preview**-target deployment, and **beta carries real PHI from
3 Sep.** With protection off project-wide, beta would be publicly reachable the moment it is attached.

**Done when:** protection is back on and the beta org's testers can still get in — **completed at beta
stand-up, verified before 3 Sep.**

> 🔑 **DECIDED 2026-08-28 by @Bastoh: re-enable SSO and invite the beta testers to the Vercel team.**
> Not password protection (needs a paid tier we don't have) and not accepting public hosts.
>
> ⏰ **Deliberately NOT done today, and this is the part to get right.** `beta.` does not exist yet, so
> there is nothing to protect — while flipping it now would instantly re-block **`dev.`**, which is the
> backend team's UAT host and the only screenshot target @Qeeyat has. The exposure this flag describes
> begins when beta is attached, so the fix belongs to the **same runbook step**, not to today.
>
> **Runbook — at beta stand-up (Mon 31 Aug), in this order:**
> 1. Invite the beta org's testers to the Vercel team; confirm each one can sign in **before** step 3.
> 2. Set the `staging`-scoped `NEXT_PUBLIC_API_URL` to `api-beta`, then attach `beta.healthclouda.com`
>    (order per the deployment section in `HANDOFF.md` — reversed, beta serves the dev backend).
> 3. Re-enable protection:
>    ```
>    PATCH /v9/projects/<id>?teamId=<team>
>      {"ssoProtection":{"deploymentType":"all_except_custom_domains"}}
>    ```
> 4. 🚨 **Verify `dev.` afterwards.** This setting is **project-wide**, and `all_except_custom_domains`
>    exempts only *production* custom domains — `dev.` and `beta.` are both **preview**-target, so this
>    re-blocks `dev.` too. That is exactly how the flag was found. If UAT still needs `dev.` open at
>    that point, the testers must be invited before it flips, or `dev.` work stops dead.
>
> ⚠️ **Unresolved, and it may reopen the decision: Vercel team seats are usually a PAID feature, and we
> are on Hobby.** If testers cannot be invited without a plan upgrade, this choice collapses into the
> paid option it was chosen over. @Bastoh to confirm on the billing page — our project-scoped token
> returns 403 on `/v2/teams` and cannot read it.
>
> **Worth stating plainly either way:** protection is the OUTER layer. The app is login-gated and every
> request is authorised server-side by DRF, so this is defence in depth, not the thing standing between
> the internet and the records.

Re-enabling is one call, the exact inverse of what was run:

```
PATCH /v9/projects/<id>?teamId=<team>
  {"ssoProtection":{"deploymentType":"all_except_custom_domains"}}
```

---

### FLAG-018 — Production is six weeks stale and cannot currently be redeployed
**Severity:** P1 · **Area:** Config / Deploy · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-28, while verifying the dev tier

Two separate problems that hide each other, both measured against the live Vercel project:

**1. The live apex is a build from 13 July, cut from `develop` — not `main`.**

```
production deployments (target=production):
  2026-07-13T21:13  READY  develop
  2026-07-13T20:25  READY  develop
  2026-06-12T09:35  READY  develop
```

`healthclouda.com` serves the **full application, including a Sign in page** — not the marketing-only
site the tier map describes. So the apex today is an unhardened six-week-old app build: it predates
A2 (stale host purge), A4 (fail-loud config), A3 (cookie scoping) and every dashboard fix since.

**2. The next production deploy will fail the build.** Production has **no `NEXT_PUBLIC_API_URL`**, and
A4 makes that throw at build time (`config.ts:33`) — deliberately, since one build serves exactly one
tier. That guard is right; the consequence is that `main` is currently **un-redeployable**, and nobody
noticed because nothing has tried to deploy it since 13 July.

🪤 **Why this stayed invisible:** the apex returns a healthy **200**, so every casual check passes. A
stale deployment and a working deployment are indistinguishable from the outside — which is the same
class of trap as FLAG-013's `next` URL echoing a param it ignored.

**Why P1:** production is one deploy away from breaking, and the tier map's central claim — *"apex
marketing-only"* — is not what is deployed. Both need settling before 3 Sep, when a real organisation
is pointed at this product.

**Done when:** the production branch and its expected content are decided (marketing-only page, or the
app), `main` builds green with whatever `NEXT_PUBLIC_API_URL` that decision implies, and a fresh
production deployment has been made and verified — so the apex is a build somebody chose.

---

### FLAG-019 — CSP allows `unsafe-inline` and `unsafe-eval` on the pages that render PHI
**Severity:** P2 · **Area:** Security / Headers · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-28, surveying controls for `SECURITY_BASELINE.md` (A7)

The Content-Security-Policy served on every route (`next.config.ts`) includes:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src  'self' 'unsafe-inline'
```

**`unsafe-inline` on `script-src` disables the main thing CSP is for.** The policy's value against XSS
is that injected `<script>` and inline handlers do not execute; allowing inline scripts permits exactly
those. `unsafe-eval` additionally allows `eval`/`new Function` on strings an attacker may influence.

**Verified served live** on `dev.healthclouda.com` 2026-08-28 — this is the deployed policy, not just
the committed one.

**Why it is P2 and not P1.** It is a *mitigation* gap, not a live vulnerability: it does not by itself
leak anything, and we have no known XSS. But it is the layer that would contain one, and the pages in
question render patient records — so the cost of being wrong is high even though the probability is
unknown.

⚠️ **The rest of the policy is genuinely good** and should not be lost in a rewrite: `connect-src
'self'` (the browser never calls the backend directly), `frame-ancestors 'none'`, and `default-src
'self'` are all correct and deliberate. This flag is about two directives, not the policy.

**Why the values are there:** Next.js App Router injects inline bootstrap/hydration scripts, so a
naive removal breaks the app immediately. The supported fix is **nonce-based CSP** — generate a nonce
per request in `middleware.ts`, emit `script-src 'self' 'nonce-<value>' 'strict-dynamic'`, and let
Next attach it. `unsafe-eval` can usually go first and independently; it is rarely needed in a
production build and is the cheaper half.

**Done when:** `script-src` no longer contains `unsafe-inline`; a nonce (or hash) mechanism is in
place; the app still renders and hydrates on a real deployment — **verified in a browser, not only by
a passing build**, since CSP failures appear at runtime in the console and a build cannot see them.
Dropping `unsafe-eval` alone is a valid, smaller first step.

---

### FLAG-020 — Two concurrent refreshes still cost a session, and now there are two refreshers
**Severity:** P2 · **Area:** Auth / Session · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-30, fixing the hourly-logout regression on PR #99

SimpleJWT **rotates and blacklists** refresh tokens: the moment one exchange succeeds, the token it
consumed is dead. So two refreshes genuinely in flight at the same time end with one of them
presenting a blacklisted token, and that user is signed out with a session that was perfectly alive.

`client-api.ts` has always guarded this with a single-flight promise, and `CLAUDE.md` §5 calls that
path load-bearing. **PR #99 adds a second refresher** — `middleware.ts` now resumes a server-rendered
navigation whose access cookie has aged out, because a Server Component cannot set cookies and the
A5 gate needs a live token *during* the render.

**The two do not race in the common case**, which is why this is P2 and not P1:

- `/api/*` returns from middleware before the resume ever runs, so the client's own refresh call is
  never intercepted.
- The client refreshes only after a 401 on a data call, i.e. on a page that has already rendered.
  Middleware refreshes only on a navigation that has no access cookie at all. Those are different
  moments.
- Next does not fully render dynamic routes on `<Link>` prefetch, so a prefetch does not silently
  fire a second resume.

**The window that remains** is genuinely simultaneous requests that each arrive with no access
cookie — most plausibly two browser tabs restored at once after an hour idle, or a hard reload
racing an open tab's background call. The loser gets `rejected`, which clears the cookies, and the
user is bounced to signin holding what *was* a good session. This is **the same class of race the
client path already accepts**, not a new one; PR #99 widens it rather than opening it.

⚠️ **It cannot be fixed by coordinating in middleware.** Middleware runs per-request on the edge with
no shared state, and the loser's request was already sent before the winner's `Set-Cookie` existed —
there is nothing for it to observe. A real fix belongs on the backend (a short grace window where a
just-rotated token is still accepted, which SimpleJWT does not do today) or in a single serialising
session store on our side. Both are architecture, not a patch.

**Done when:** either the backend accepts a just-rotated refresh token inside a short grace window
(needs a backend `api-request` issue), or refreshes are serialised through one server-side holder;
and a test proves two simultaneous expired navigations leave the session intact. **Accepting it in
writing is also a valid close** — say so in `SECURITY_BASELINE.md` with the window named.


### FLAG-021 — The small-screen gate cannot stop the one fetch that sits above it
**Severity:** P3 · **Area:** Security / PHI · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-30, reviewing PR #106 (FLAG-203)

PR #106 makes `DashboardShell` decide in JS whether the dashboard **mounts** below 768px, which is
what finally stops the client-side PHI fetches: React never invokes a component passed as
`children`, so none of its hooks run. That mechanism is correct and it closes the channel FLAG-203
is mostly about.

**It cannot reach a hook that runs before the shell renders**, and there is exactly one, repeated
identically in all six dashboards:

```ts
// NurseDashboard.tsx:489 — and the same line in Doctor, OrgAdmin, Receptionist, Superadmin, Patient
const { data: fetchedStats } = useApi<NurseStats>(initialStats ? null : ENDPOINTS.NURSE_STATS);
```

`NurseDashboard` is the *parent* of `DashboardShell`, so this runs on a phone regardless of the
gate. It is `null` — and therefore silent — **whenever the server supplied `initialStats`**, which
is the normal path. It fires only when the server-side fetch came back empty, which since #103 is a
silent `null` on any 401, 500, or network blip.

**Why P3 and not P1:** the payload is aggregate counts (episode totals, appointment counts), not
patient-identifiable records, and it needs a server-side failure to trigger at all. FLAG-203's
serious half — names, HCL-IDs, prescriptions — is genuinely closed by #106.

**Why it is still worth a number:** it is the same bug class as the flag it survives, and #106's own
argument ("React does not run a component's hooks until it is rendered") is true of `children` and
not of the component doing the rendering. Someone reading that sentence later will reasonably
believe the gate covers everything below the route. It does not.

⚠️ **Do not fix this by hoisting the gate into the six `page.tsx` files** without reading FLAG-203's
channel-1 note first: the client gate tests the **viewport**, any server-side gate tests the
**device**, and those are different predicates. This one is a client-side fetch, so it belongs with
the client gate.

**Done when:** the stats fallback does not fire on a viewport the gate would refuse — e.g. each
dashboard reads `useWideViewport()` and passes `null` unless `'wide'` — and a test asserts no
request is made when the viewport is narrow *and* `initialStats` is absent. **Explicitly accepting
it in `SECURITY_BASELINE.md` is also a valid close**, naming what a phone can still receive.

---

### FLAG-022 — `Avatar` renders a remote `<img>`; next/image needs a per-tier host in `next.config.ts`
**Severity:** P3 · **Area:** Performance / Config · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-31, landing the ESLint gate (E8 / FLAG-006)

`src/components/ui/Avatar.tsx:37` renders a plain `<img src={src}>` when a user has an avatar URL.
`@next/next/no-img-element` fires on it: no lazy-loading, no responsive `srcset`, no format
negotiation, and it counts against LCP on every dashboard that shows a staff list.

**Why it was not fixed in the same PR.** `src` is an arbitrary URL served by the backend, so
`next/image` requires `images.remotePatterns` in `next.config.ts` naming the host that serves it —
and **that host is per tier** (`api-dev` today, `api-beta` from 31 Aug, a production host later).
Putting a backend host in `next.config.ts` is exactly what **A2** purged from that file and what
**A4** exists to prevent: the file is not env-aware, so the value would either be hardcoded (wrong on
two tiers out of three) or need a fourth environment variable that nothing else reads.

So the real fix is a small tier-aware config decision, not a component edit — and it is not worth
making that decision in the week real PHI arrives, on a P3.

⚠️ **The rule is disabled at that single line, not repo-wide**, with a comment pointing here. The
lint job gates at `--max-warnings=0`, so an undocumented `<img>` added later still fails CI. This is
the one deliberate exception and it is visible in the diff.

**Done when:** either `Avatar` uses `next/image` with `remotePatterns` derived from the same
per-environment value as `NEXT_PUBLIC_API_URL` (never a literal host), **or** a written decision here
records that a plain `<img>` is correct for avatars and the disable comment is made permanent with
that reasoning. Verify by deleting the `eslint-disable-next-line` and running
`npx eslint . --max-warnings=0`: it must pass.

---

### FLAG-023 — The proxy boundary that attaches the JWT has zero test coverage
**Severity:** P1 · **Area:** Testing / Security · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-08-31, the first coverage run this repo has ever produced (B7)

`CLAUDE.md` §5 states the security model in one sentence: *"The browser **never** calls the backend
directly. All browser traffic goes through our own proxy routes (`/api/data` reads, `/api/action`
writes), which attach the JWT server-side."*

**Every one of those routes reports 0% coverage.** Measured, not inferred — `npm run test:coverage`:

```
  0%   src/app/api/data/route.ts                     (12 stmts)  ← every browser read
  0%   src/app/api/action/route.ts                   (15 stmts)  ← every browser write
  0%   src/app/api/auth/setup-password/route.ts      (19 stmts)
  0%   src/app/api/access-request/respond/route.ts   (19 stmts)
  0%   src/app/api/auth/{logout,verify-otp,reset-password,forgot-password}/route.ts
```

`src/lib/security-headers.test.ts` mentions these paths, which is why a grep looks reassuring — it
does not exercise the handlers, and coverage is what showed that.

**Why P1 rather than hygiene.** This is the single layer standing between a browser and the backend,
and it is where the access token is read and attached. The invariants that live here are exactly the
ones a refactor can silently drop:

- `getAccessToken()` returning nothing must yield **401**, never an unauthenticated upstream call
- the token must go to the **upstream request** and never into a response body or a log
- a non-2xx upstream status must be **forwarded**, not flattened into a 200 with an empty body
  (the FLAG-005 failure mode, one layer up)

Nothing currently fails if any of those changes. A test asserting them would have to be written to
fail first — none exists to fail.

⚠️ **Related but distinct from FLAG-221.** FLAG-221 is *tests that assert the wrong property*. This is
*no test at all*, which is the more basic condition and was invisible until coverage existed. Both were
found the same way: by running a measurement nobody had run before, the same way the first T5 run found
FLAG-222 in its first screenshot.

📋 **Also 0%, recorded here so the list is not re-derived:** `SigninForm.tsx` (42 stmts — the entry
point to every role), the six `[slug]/<role>/page.tsx` role gates (rewritten with tests in unmerged
**#99**, so that half closes when it lands), and all four landing/contact form components.

**Done when:** `/api/data` and `/api/action` have tests covering the three invariants above — at
minimum: no token → 401 with no upstream call · upstream 4xx/5xx forwarded with its status · the token
never appears in the response. Verify with `npm run test:coverage` showing both files non-zero, and by
deleting the `if (!token)` guard and watching a test fail.

---

### FLAG-024 — 9 of 13 Playwright e2e tests fail on `develop`, and nothing was reporting it
**Severity:** P2 · **Area:** Testing · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-09-01, evaluating whether the e2e suite could be added to CI (B8)

`npm test` runs **vitest only**. The Playwright suite is a separate script (`npm run test:e2e`), it
has never run in CI, and it is not part of any pre-PR ritual — so nothing has executed it in a long
time. Run now, it fails:

```
npx playwright test e2e/landing.spec.ts e2e/auth.spec.ts --project=chromium
  9 failed
  4 passed
```

**The failures are not environmental.** Run twice — once against `api-dev` and once against an
unroutable `https://api-ci.invalid/api/v1` — the result is **identical, 9 failed / 4 passed**. So this
is not a missing backend, missing credentials, or a network problem. The specs describe a UI that no
longer exists.

**Confirmed cause on the largest group.** `e2e/landing.spec.ts:8` asserts the headline matches
`/Modern EHR Built for/i`. The landing page's `<h1>` (`src/app/page.tsx:112`) actually reads:

> One patient record. Every facility, connected.

The landing page was redesigned and the specs were never updated with it. Most of the remaining
landing failures are the same class (navbar buttons, features section, footer, mobile menu).

**Why this blocks B8 rather than being fixed inside it.** Adding a red suite to CI creates exactly
what **FLAG-370** describes on the backend — *"a permanently-red check nobody could read, which also
masked any NEW lint issue a PR introduced."* The e2e job is worth having and is deliberately **not**
added until the specs are green, for that reason and no other.

⚠️ **Two further blockers specific to the T5 design specs** (`e2e/design/*`), separate from the
staleness above and needing a decision, not just a fix:

1. **They sign in for real.** `helpers.ts` requires `E2E_<ROLE>_EMAIL` / `_PASSWORD` against whatever
   `NEXT_PUBLIC_API_URL` points at. Running them in CI means putting demo credentials in GitHub
   Secrets and pointing CI at a live tier — a deliberate decision about CI touching a real backend,
   which is a different question from "should e2e run in CI".
2. **The committed baselines are Windows-only.** Every reference shot is named
   `*-chromium-win32.png`. A Linux runner generates `-linux.png`, matches nothing, and writes new
   baselines instead of comparing — a green job that verified nothing. Cross-platform baselines have
   to be generated on the runner OS, or the job pinned to a Windows runner.

**Done when:** `npm run test:e2e` is green for the credential-free specs (`landing`, `auth`) and that
subset runs in CI as a gating job. The design specs are a separate decision, recorded above, and
should not be bundled into the same change.

---

### FLAG-026 — The hourly-logout fix depends on a backend token lifetime we neither control nor can see
**Severity:** P3 · **Area:** Auth / Session · **Owner:** @Bastoh · **Status:** OPEN
**Found:** 2026-09-02, reviewing PR #99 before its re-review

PR #99's middleware resume fires on exactly one condition: the access **cookie** is absent and the
refresh cookie is present (`middleware.ts`). That works because the cookie and the token it carries
expire at the same time — and those two numbers are set in **different repositories**.

```ts
// src/lib/auth.ts:19
maxAge: 60 * 60, // 1 hour — matches DRF default access token lifetime
```

The comment is honest about what it is: a **default** on the backend, changeable there with no
signal here. Two consequences follow, and the second is the one that matters.

**1. A narrow skew window exists today.** The token's clock starts when the backend mints it; the
cookie's clock starts a few hundred milliseconds later, when our login route writes the response.
The token therefore dies *first*, by the round-trip time. A request landing in that gap carries a
live cookie and a dead token: middleware sees a cookie so it does not resume,
`requireDashboardUser()` gets a 401 from `/auth/me/`, `serverFetch` returns `null` (FLAG-005), and
the user is redirected to signin. Low probability — sub-second per hour per user — but it is the
exact failure #99 exists to remove, not a new one.

**2. If the backend ever shortens `ACCESS_TOKEN_LIFETIME`, the hourly logout returns in full.**
The cookie would then outlive the token by the whole difference, and every request in that widening
window takes the path above. Nothing here would change, no test would fail, and CI would stay green:
the frontend has no way to observe the backend's token lifetime, and — per FLAG-225 — the schema
does not publish it either. It would present as *"the app keeps logging me out"*, the same symptom
@Qeeyat traced on this PR, arriving with no code change to blame.

⚠️ **This is not a security hole and it is not a reason to hold #99.** It fails closed, which is the
safe direction, and #99 is a large net improvement over authorizing from a client-writable cookie.
It is logged rather than fixed because re-opening a settled security PR the week PHI arrives is the
worse trade — `CLAUDE.md` §6: during a review, the output is a written record.

**Done when:** middleware decides freshness from the token's **own `exp` claim** rather than from
cookie presence — decode the access token (no signature verification needed; it is only a freshness
hint, and authorization still comes from `/auth/me/`), treat expired-or-expiring-within-a-few-seconds
as absent, and resume. A test asserting that a dashboard request carrying a **live cookie with an
expired token** resumes rather than redirecting would fail today and pass after. That test is the
real deliverable: it is what makes consequence 2 impossible to reintroduce silently.

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
**Severity:** P1 · **Area:** Security / PHI · **Owner:** @Qeeyat · **Status:** 🟡 **HALF FIXED
2026-08-29** — the client channel is closed; the server-rendered channel is still open
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

> ⚠️ **Update 2026-08-29 (@Qeeyat) — this flag's own "Done when" was wrong, and measuring the live
> deployment is what showed it.** Logged into `dev.healthclouda.com` through its own proxy as
> `doctor@demo.test` and fetched `/demo-clinic/doctor` twice, once with an iPhone user-agent and once
> with a desktop one:
>
> ```
> iPhone UA   -> 200, 29,750 bytes
> desktop UA  -> 200, 29,750 bytes
> byte-identical: YES
> ```
>
> **There are two leak channels here, not one, and they need different fixes:**
>
> | Channel | What it carries | Closed by a JS breakpoint check? |
> |---|---|---|
> | **1. Server-rendered props** | the full `user` object (name, email, UUID, role, org) and `initialStats` — measured live: `active_episodes: 14`, `admissions_under_care: 2`, `todays_appointments: 1` | ❌ **no** |
> | **2. Client fetches on mount** | the patient-level PHI — names, HCL-IDs, episodes, prescriptions, ~7 `useApi`/`usePaginatedList` calls | ✅ yes |
>
> The original "Done when (a)" proposed *"a JS check that accepts a brief flash"*. **That closes
> channel 2 only.** `page.tsx` calls `serverFetch` and passes `initialStats` into the client
> component before any client JS exists, so the payload is already in the HTML — identical for a
> phone and a desktop, as measured above. A criterion that would have been marked satisfied while
> half the leak remained.

**Fixed so far (channel 2):** `DashboardShell` now decides in **JS** whether the dashboard subtree
mounts at all, via `useWideViewport()` (`src/hooks/use-wide-viewport.ts`). React does not invoke a
component — or run its hooks, or fire its fetches — until it is rendered, so returning early is what
stops the requests. It **fails closed**: until `matchMedia` answers (server render, first paint, or
any runtime without it) the state is `unknown` and nothing mounts. The mirrored CSS classes
(`hidden md:flex` on the shell, `md:hidden` on the notice) are **gone** — two CSS mechanisms deciding
the same thing is what let the dashboard sit mounted underneath. Cost: one frame of a neutral
placeholder on desktop, which is the trade this flag anticipated. Resizing a window across 768px now
unmounts the dashboard rather than hiding it.

🪤 **A test was asserting the bug.** `NurseDashboard.test.tsx` checked only that the notice was
*rendered*, with the note *"the md: breakpoint is a media query JSDOM cannot evaluate, so visibility
is not assertable here"* — true of the CSS gate, and precisely what hid the problem: the notice and
the whole dashboard were both in the DOM and the test passed on a build that shipped records to the
phone. It now asserts `dataGetMock` was never called. **"Is the notice rendered" was never the
question; "did any PHI leave the server" is.**

🚨 **And nothing defended the control at all on four of five dashboards.** The gate is one opt-in
prop. Measured, not assumed: deleting `smallScreenGateFor="Doctor"` outright left the suite at
**161/161 green**. `src/components/dashboard/small-screen-gate.test.tsx` now covers all five, and
re-running that mutation fails exactly one test. **This test weakness is a class, not an incident —
written up as [[FLAG-221]], where a third instance is still open and currently hides the session bug
in PR #99.**

📏 **The residual is bounded, and asserted as a bound.** With `initialStats` null (the server fetch
failed) each dashboard falls back to a client stats fetch from a hook *above* the shell, which the
gate cannot stop. Measured 2026-08-29 — a narrow screen makes exactly **one** request per dashboard,
always its own `dashboard/stats` endpoint, never a patient-bearing one. The test asserts that limit
rather than blessing the call, so it fails the day someone moves a patient list above the shell.

**Done when (revised):** channel 1 also closed — the page must not `serverFetch` or serialise PHI
props for a device it should not serve. That needs a **server-side** signal (`Sec-CH-UA-Mobile`
client hint, or UA inspection) in the six `page.tsx` files, **or** explicit acceptance in
`SECURITY_BASELINE.md` naming what remains: staff PII plus aggregate clinical counts, but no
patient-level records.

⚠️ **Sequencing note:** channel 1 was deliberately *not* fixed in the same PR. It requires editing all
six `page.tsx` files, which **#99 rewrites and #100 deletes one of**. Doing both at once would have
meant a three-way conflict during UAT week. Channel 2 lives entirely in `DashboardShell` /
`SmallScreenGate`, so it conflicts with nothing.

⚠️ **And the two fixes test different predicates, which is worth stating before anyone "unifies"
them:** the client gate tests the **viewport**; any server-side hint tests the **device**. They do
not agree — a desktop with a narrowed window is a trusted device with a small viewport, and the
server cannot know a viewport on the first request at all. Whatever closes channel 1 should say
plainly which predicate it is enforcing.

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
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** ⚠️ **PARTLY
DISPROVEN** — the `?role=` half is wrong and is being fixed in **PR #82**; the `/org/` half stands.
See the correction inside this entry.
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

> ⚠️ **Correction (2026-08-19) — this flag was half wrong, and the reasoning behind it was wrong.**
> Tested live against `api-dev` with a superadmin token instead of read off the schema:
>
> ```
> /auth/users/?role=DOCTOR      7 → 2   ["DOCTOR","DOCTOR"]   ← WORKS
> /auth/users/?is_active=true   7 → 7   ignored
> /org/?org_type=CLINIC         2 → 2   ignored
> /org/?is_active=true          2 → 2   ignored
> ```
>
> **`?role=` works despite being undocumented**, so the Users page's Role dropdown was dropped for a
> reason that isn't true. The `/org/` Type and Status dropdowns *were* correctly dropped — those are
> genuinely ignored. Control: `?bogus=xyz` returns all rows, so the `?role=` narrowing is real
> server-side filtering and not coincidence.
>
> **The generalisable lesson, which is bigger than this flag:** on this backend, *absence from the
> schema is not evidence of non-support.* Several apps are hand-rolled `APIView`s that document no
> parameters at all — not even the pagination they demonstrably have. Schema absence justifies
> **verifying**, never **concluding**. This is the mirror image of the invented-param bug class
> (GLOBAL-2, FLAG-004): that one ships a param that does nothing, this one drops a param that works.
> Both come from trusting a document over a request.
>
> **Restoring the Role dropdown is a change to already-merged code (PR #76) and is not done here** —
> it needs its own branch and @Bastoh's call, since he owns the review that removed it.

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

### FLAG-207 — Dead `ORG_ADMIN_STAFF_MEMBER` endpoint constant, removed
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** ✅ FIXED (this PR)
**Found:** 2026-08-17, building D2 Org Admin, verified against the live schema

`ORG_ADMIN_STAFF_MEMBER: (id) => '/org-admin/staff/${id}/'` had zero consumers anywhere in `src/`
and pointed at a URL that doesn't exist in the live schema — only `/org-admin/staff/` (list+create)
and `/org-admin/staff/<id>/status/` (the activate/deactivate endpoint) do. Removed rather than
fixed to a guess; `ORG_ADMIN_STAFF_STATUS` added in its place for the endpoint that's actually real.

**Done when:** N/A — already done. Logged for the paper trail, since the removal is referenced by
name (`FLAG-207`) in the `config.ts` comment.

---

### FLAG-208 — Staff activate/deactivate endpoint exists; body shape doesn't, so it isn't built
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-17, building D2 Org Admin

`PATCH /org-admin/staff/<id>/status/` is real (confirmed in the live schema), but the schema
documents no request body for it — same under-documentation as the rest of the `org-admin` app.
Unlike a read-only filter param (silently ignored, wrong data with no error — FLAG-205's class),
a wrong PATCH body fails **loudly** with a 400, so the risk of guessing is different in kind. Still
chose not to guess: today's row was "staff invite, read-only access requests" specifically, and
Staff stayed read-only-for-status exactly as before this PR — no regression, just no new capability
here. (Also noted in passing: `/org-admin/staff/` documents no search/filter params either, same
pattern as FLAG-205 on a different endpoint — one `api-request` covering the `org-admin` app's
missing param docs generally would probably be more useful than filing each endpoint separately.)

**Done when:** the backend documents (or confirms via a quick empirical test once someone has
working `api-dev` credentials in-session) the PATCH body shape — most likely `{is_active: boolean}`
matching the field name used everywhere else in this API — then Staff gets the same
activate/deactivate row action Superadmin's Users page has.

---

### FLAG-209 — Resend-invite for org-admin-created staff: endpoint exists, permission scope doesn't
**Severity:** P3 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-17, building D2 Org Admin

The design's Staff page wants a per-row "Resend invite." The only resend endpoint in the schema is
`POST /auth/users/<id>/resend-setup-email/` (superadmin's — confirmed working there). The OpenAPI
`security` block just says `jwtAuth`, generically, for every endpoint — it doesn't expose which
**roles** DRF's permission classes actually allow, so whether an org admin can call this for their
own staff is unknown, not just unbuilt. Not built today rather than guessed.

**Done when:** either confirmed empirically (org-admin token, real staff id, watch for 200 vs 403)
once credentials are usable in a session, or the backend documents the permission explicitly.


---

### FLAG-211 — Admission write endpoints are documented, but nurse permission is not
**Severity:** P2 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-19, building D3 Nurse

Tuesday's sprint row names an **admission** workflow for the nurse dashboard. The contract exists
and is fully documented, unusually for this API:

```
POST /ward/admissions/              AdmissionCreateRequest
                                    required: patient, episode, bed
                                    optional: admission_reason, override
POST /ward/admissions/<id>/discharge/   discharge_summary, discharge_instructions (both optional)
POST /ward/admissions/<id>/transfer/
```

**What is verified (live, nurse token, 2026-08-19):** a nurse can **read** both
`GET /ward/beds/` → 200 (7 beds, with `status` and a nested `current_patient`) and
`GET /ward/admissions/` → 200. The read side is built in this PR — the ward board now shows which
patient is in which bed.

**What is NOT verified:** whether a nurse may **POST** any of the three. The schema's `security`
block says `jwtAuth` generically for every endpoint and never exposes which roles a view's
permission classes allow — the same gap as FLAG-209. A `GET` returning 200 says nothing about
`POST`.

> ⚠️ **Narrowed 2026-08-23, after @Bastoh's review of PR #86.** As first written this entry
> generalised from the doctor endpoints to the whole API, saying the schema documents no
> parameters. **That generalisation is wrong.** It holds for the doctor routes — `/doctor/appointments/`
> and `/doctor/episodes/` really are `200: no response body` with no parameters — but **not** for
> `/ward/beds/`, which documents `page`, `search` and `ordering` and returns a
> `PaginatedBedListList` envelope.
>
> This cost something real rather than being a tidy-up: believing the endpoint documented nothing
> is why the ward board was built with a plain `useApi` and rendered only the first 20 beds. **The
> roles half of the claim still stands** — no endpoint exposes its permission classes, and that is
> the part this flag is actually about. **Read the schema per endpoint; this API is not uniform,
> and assuming it is produced a real bug.**

**Why it wasn't guessed:** the only way to settle it is to POST, and on a shared dev tier that
means creating or discharging a real admission in seed data the other dev may be testing against.
Unlike a silently-ignored filter param, a wrong write here is not invisible — it is *visible to
everyone*, and discharging a seeded admission is only undone by re-admitting.

**Also unresolved even if permission is granted:** `POST /ward/admissions/` needs an **`episode`**
id, and no nurse endpoint exposes a patient's episodes. `/nurse/my-patients/` carries an episode
only for patients who are *already admitted*, which is the wrong direction — admitting needs the
episode of someone not yet in a bed. So the admit flow needs an episode lookup that does not
currently exist for this role.

**Done when:** either (a) the permission is confirmed — ideally by the backend documenting it,
otherwise by one deliberate POST against a disposable record with @Bastoh's agreement — **and** an
episode-lookup route for the nurse role is identified, after which admit/discharge/transfer can be
built; or (b) it is confirmed that admission is an ORG_ADMIN/receptionist workflow rather than a
nurse one, and Tuesday's row is corrected to say so.

---

### FLAG-212 — The two bed sources disagree, and one bed belongs to no ward
**Severity:** ~~P3~~ **P2** (raised 2026-09-04) · **Area:** Backend contract / data · **Owner:** @Qeeyat · **Status:** **OPEN — half of it closed by itself; read the 2026-09-04 re-measurement below before acting**
**Found:** 2026-08-19, building the D3 ward board — visible only once real beds were rendered

Measured live as `nurse@demo.test`, 2026-08-19:

```
GET /ward/beds/             7 beds → General Ward 6, ward: null 1
GET /nurse/wards/overview/  General Ward  total 6, available 4, occupied 2   ✓ consistent
                            Maternity Ward total 4, available 0, occupied 0   ✗
```

Two separate problems:

1. **A bed with `ward: null`.** It cannot be grouped under any ward, so it renders on no ward board
   anywhere in the app and is effectively invisible. Whether that is seed-data debris or a real
   possibility (a bed awaiting assignment) decides whether the UI needs an "unassigned beds" bucket.
2. **Maternity's counts are internally inconsistent** — `total 4` with `available 0` and
   `occupied 0`, which does not add up on its own terms, and `/ward/beds/` lists no maternity beds
   at all. So the ward card shows "4 total beds" above an empty bed list. Note the **org-admin**
   wards endpoint reported Maternity as `0` beds on the same day, so the two ward endpoints
   disagree with each other as well as internally.

**Not worked around in the UI, deliberately.** The board renders what `/ward/beds/` actually
returns; inventing a placeholder row per missing bed would make a data problem look like a display
and hide it from whoever can fix it. This is a case where the honest render *is* the bug report.

**Done when:** the backend confirms whether `ward: null` beds are legitimate (and if so the board
grows an unassigned bucket), and Maternity's counts either reconcile with `/ward/beds/` or the
discrepancy is explained. Likely a seed-data issue rather than a code one — worth checking before
filing an `api-request`.

> 🔄 **Re-measured 2026-09-04**, on the first-ever T5 render of the Nurse dashboard
> (`e2e/design/roles.spec.ts`). Live capture as the nurse against `api-dev` — payloads, not the
> schema:
>
> ```
> GET /nurse/dashboard/stats/   total_beds 11 · occupied_beds 2 · occupancy_rate 18.2
> GET /nurse/wards/overview/    General Ward 6/2/4 · Maternity Ward 4/0/4   → sum total_beds = 10
> GET /ward/beds/               count 11 → General Ward 6, Maternity Ward 4, ward: null 1
> ```
>
> **Half of this flag has closed on its own, and half has not.**
>
> - ✅ **Problem 2 (Maternity) is gone.** It now reports `total 4, occupied 0, available 4`, which
>   adds up on its own terms, and `/ward/beds/` lists four maternity beds (MW-01…04) that render on
>   the board. Nothing in this repo changed — the seed data did, which is what this flag guessed.
> - ❌ **Problem 1 (the `ward: null` bed) is unchanged**, still exactly one.
>
> 🔴 **What is new is the consequence, and it is worse than "a bed renders nowhere".** Now that
> Maternity has beds, the orphan bed is the *only* difference between the two sources, so the Nurse
> dashboard displays **two bed totals that disagree, on the same screen, both unlabelled**:
>
> | Where | What it says | Denominator |
> |---|---|---|
> | Overview → **Bed Occupancy** tile | **18.2%**, delta "2 of **11** beds occupied" | stats, counts the orphan |
> | Ward Overview → the board | General 6 + Maternity 4 = **10** beds, 2 occupied → **20%** | wards, cannot see the orphan |
>
> A nurse who reads the tile and then counts the board finds a bed that does not exist on any ward.
> **This is not a rounding difference and there is no view in the app that reconciles them** — the
> orphan is unreachable from the ward board by construction.
>
> ⚠️ **The tile is not wrong and must not be "fixed" to 20%.** `occupancy_rate: 18.2` is the
> backend's own number over its own denominator; recomputing it client-side from the ward sum would
> hide the orphan bed a second time and put a locally-invented statistic on a clinical screen. The
> fault is upstream — one bed with no ward — and it stays visible until the backend resolves it.
>
> **Severity raised P3 → P2.** It was P3 as "one invisible bed in seed data". It is now a visible
> numerical contradiction on a dashboard a nurse reads bed availability from, four days after this
> tier's data model goes near real patients.

---

> ✅ **Fixed 2026-08-28, and the architecture question it was waiting on is now answered.**
>
> 🔑 **@Bastoh's decision:** the apex (`healthclouda.com`) is **marketing + the patient portal**;
> organisation staff use `beta.`. So the answer is a **slug-less `/patient` route**, not a backend
> home-org — which also means no `api-request` was needed and nothing waits on the backend.
>
> What changed: new `app/patient/page.tsx` · `app/[slug]/patient/` **removed** · `patient` added to
> `RESERVED_PATHS` so no org slug can shadow the portal · `roleDashboardPath(PATIENT)` returns
> `/patient` and **ignores any slug passed to it** · `middleware.ts` treats `/patient` as a top-level
> dashboard (it was previously read as an *org slug*, so a logged-out visitor was sent to
> `/patient/signin` — a portal for an organisation that does not exist) · `SigninForm` no longer
> demands a slug for `PATIENT`.
>
> **The nuance this flag always had, now settled in code:** `organization: null` on a patient is the
> *correct* answer, not missing data — records move with the patient between facilities
> (`CLAUDE.md` §1). The bug was never the backend's; it was that every route we had needed an org.
>
> ⚠️ **This confirms FLAG-010's nuance too:** the backend's slug-less `redirect_to: "/patient/"` is
> exactly right for patients, and now matches a route that exists.
>
> 📌 **Follow-up for the backend, not blocking:** the apex will point at `api-beta` from 3 Sep, so a
> beta patient's invite email must link to the **apex**, while staff invites link to `beta.`.
> `FRONTEND_URL` is one value per tier (A8 / backend #107), so that split needs raising with them
> before onboarding.

---

### FLAG-213 — `Appointment` and `CheckIn` describe shapes the API does not return
**Severity:** P1 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-19, capturing the receptionist payloads **before** starting D4 — deliberately,
after the same bug class shipped in D2 (see the correction inside FLAG-205 and PR #85)

Captured live as `reception@demo.test`, 2026-08-19.

**✅ Already correct, no action:** `ReceptionistStats`, `OnDutyDoctor` and `PatientSearchResult` all
match their endpoints field for field.

#### `Appointment` — wrong, and shipped

```
type:  appointment_date, appointment_time?, doctor_name?, patient_name?
live:  scheduled_at, duration_minutes, doctor{}, patient{}, booked_by{},
       reason, notes, cancelled_at, cancellation_reason, created_at
```

`appointment_date` and `appointment_time` **do not exist**, and `doctor` is a nested object, not a
`doctor_name` string. Consumers rendering the missing fields **on `develop` right now**:

- `src/components/dashboard/receptionist/ReceptionistDashboard.tsx:208-210`
- `src/components/dashboard/doctor/DoctorDashboard.tsx:101, 310-311`

So both appointment tables currently show a blank/invalid date and `—` for the doctor against real
data. Same failure mode as the Org Admin tables: rows render, so the table looks fine, and every
human-readable cell is empty.

**Note `PatientAppointment` is NOT affected** — it was verified live on 2026-07-09 and already uses
`scheduled_at`/`duration_minutes`. One of the two appointment types was checked against the API and
the other was not, which is why they disagree.

#### `CheckIn` — wrong on three fields, and D4 is built entirely on it

```
type:  check_in_time, assigned_doctor?: string | null, chief_complaint?
live:  checked_in_at, assigned_doctor{}, reason_for_visit,
       + queue_number, called_at, completed_at, checked_in_by{}
```

`queue_number` is exactly what a receptionist queue UI needs and is being returned and ignored.

#### 🪤 `/receptionist/check-ins/` defaults to TODAY

```
GET /receptionist/check-ins/                  → count 0
GET /receptionist/check-ins/?date=2026-08-13  → count 5
GET /receptionist/check-ins/?status=WAITING   → count 0   (date filter applies first)
```

The 5 seeded check-ins are dated 13 Aug, so **against seed data the queue looks empty and broken**,
and filtering by status alone returns nothing. This is correct behaviour for a "today's queue"
endpoint, but it will read as a bug to whoever builds D4 — it cost time here and it is written down
so it does not cost it again.

#### Minor

`GET /receptionist/emergency-beds/` returns `{"emergency_wards": [...]}` — a bare keyed object, not
a DRF envelope, so `usePaginatedList` is the wrong tool for it.

**Done when:** `Appointment` and `CheckIn` are re-typed from the captured payloads with fixtures
derived from them (not hand-written), the Receptionist and Doctor tables render real dates and
doctors, and the check-ins date default is handled explicitly rather than discovered. **Sequencing:**
the receptionist half rides with **D4** and the doctor half with **D5**, since both rewrite those
components anyway — fixing the types in isolation first would mean touching the same files twice.
### FLAG-214 — Client-side "today" and "active" filters only see the first page
**Severity:** P2 · **Area:** Correctness / Pagination · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-22, introduced deliberately by the FLAG-004 fix in PR #90

> 📎 **Forward reference:** FLAG-213 is referenced here and in several code comments from PR #90, but
> its entry lands with **PR #87**, which is still open. If you are reading this on `develop` and
> cannot find FLAG-213, that is why — not a numbering mistake.

The doctor Overview now filters today's appointments and active episodes **client-side**, because
`?today=true` was invented and `?status=` cannot be confirmed as supported (FLAG-004). That is
correct whether or not the server participates — but it filters **only the rows the server chose to
return on page 1**, which is ~20 (`?page_size=` is ignored, FLAG-013).

```
GET /doctor/appointments/     → 20 rows, ordering undocumented
  .filter(isToday)            → correct for those 20, blind to the rest
```

So **a doctor with more than a page of appointments can have today's appointment fall on page 2 and
not appear on their Overview at all.** The panel would say "No appointments scheduled for today"
while one exists — a silent wrong answer, which is the same failure mode FLAG-004 was about.

**Why it was shipped this way anyway:** the alternative is guessing an ordering or filter param that
isn't in the schema, which is precisely the invented-param bug class being removed. A wrong guess
here fails silently too, and would be *harder* to spot. Bounded and written down beats unbounded and
assumed.

**Not currently reachable on seed data** — `demo-clinic` has 7 appointments total, well inside one
page — so this cannot be demonstrated today and will not appear in UAT. It becomes real with a busy
real-world doctor, i.e. after PHI arrives.

**Done when:** one of —
1. the backend confirms a supported filter (`?date=`, `?status=`) and the panels use it — note
   `/receptionist/check-ins/` **already defaults to today** (FLAG-213), so the capability probably
   exists and just isn't documented; **or**
2. the backend documents ordering, and the panel is proven to only need the first page; **or**
3. the Overview fetches with an explicit bound and shows an honest "showing first N" affordance.

Worth filing as an `api-request` if (1) turns out to be unsupported.

---

## Resolved flags

> ⚠️ **Filing note (2026-09-03):** everything from **FLAG-215 downwards is BELOW this heading but is
> not resolved** — those entries were appended to the end of the file as they were raised, and the
> heading has been sitting above them since. Read each entry's own **Status** line, not its position.
> Left as-is rather than reordering other people's flags mid-session; worth straightening in a
> dedicated pass.

### FLAG-001 — Authorization is decided from a client-writable cookie
**Severity:** P1 · **Area:** Security / Auth · **Owner:** @Bastoh · **Status:** ✅ **RESOLVED — PR #99, merged 2026-09-03** by @Qeeyat, as a merge commit. Verified on the merge commit from a clean `.next`: tsc clean · lint clean · 211/211 · build green. The fix was re-proven RED-first by running the new middleware tests against the pre-fix middleware (`f4b4832`): **7 failed | 13 passed**. Residual race logged as [FLAG-020]
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

> ✅ **Fixed 2026-08-28.** All six page gates now call `requireDashboardUser()`
> (`lib/auth-server.ts`), which resolves identity from `GET /auth/me/` using the **httpOnly** access
> token. `hc_user` is annotated display-only at its definition and at `getUser()`.
>
> 🔍 **Access-token claims were the cheaper fix and are not available.** Decoded a real token from
> `api-dev` rather than assuming: the payload is stock SimpleJWT —
> `{ token_type, exp, iat, jti, user_id }`, **no role, no organisation**. So a server lookup is the
> only server-trusted option today. It costs one round trip per gated render, held to one by React
> `cache()`. If the backend later adds `role`/`organization` claims, `getAuthorizedUser()` is the
> single function to change and the trip disappears — worth an `api-request`, but it is an
> optimisation, not a blocker.
>
> 🚨 **A second hole was found while fixing the first, and it needed no tampering at all.** The gates
> checked the *role* and never compared the route slug to the user's organisation, so a real doctor at
> `demo-clinic` could open `/other-clinic/doctor` and get that org's dashboard shell by typing a URL.
> Multi-tenancy is the core constraint of this product, so this is now asserted in the same gate and
> covered by its own test.
>
> ⚠️ **The fix fails closed, deliberately.** `serverFetch` returns `null` for everything — no token,
> 401, 500, network blip (FLAG-005) — and the gate treats every one as DENY. The cost is that a
> backend wobble bounces people to signin rather than showing a stale shell. That is the right trade
> for an authorization decision, but it does mean **FLAG-005 now has a UX consequence it did not have
> before**, which is an argument for raising its priority.
>
> Also corrected in passing: the superadmin gate redirected to `/signin`, the **patients-only** portal
> where the backend rejects staff — the same defect PR #84 fixed in `middleware.ts`, still live here.
> It now goes to `/superadmin/signin`.
>
> **Not changed:** `middleware.ts` still reads `hc_user` for its signin-page redirect. That is a
> convenience redirect, not an authorization decision — a tampered cookie can now only send the
> attacker to a dashboard that refuses to render.

---

### FLAG-210 — A patient cannot sign in: they have no organization, but every patient route needs one
**Severity:** P1 · **Area:** Auth / Routing / Multi-tenancy · **Owner:** @Bastoh · **Status:** ✅ **RESOLVED — PR #100, merged 2026-09-03** by @Qeeyat, as a merge commit, immediately after #99. Verified from a clean `.next`: tsc clean · lint clean · 211/211 · build green · `/patient` present in the route tree. **Patients can sign in for the first time.** · was OPEN —
**needs an architecture decision, not a one-line fix**
**Found:** 2026-08-19, first live click-through of the app against `api-dev` ·
**Raised by** @Qeeyat, **assigned to** @Bastoh (auth/routing is the `[INFRA]` lane, and the fix
changes the route tree and `RESERVED_PATHS`)

> **Numbering:** opened as FLAG-016 and renumbered to **210** on merge — @Qeeyat raised it, so it
> takes a number from her range; the `Owner:` line is what assigns the work. 016 was not free: once
> PR #79 merged it became the next number @Bastoh's own agent would take, which is precisely the
> collision the ranges exist to prevent. Renumbered by @Bastoh at merge time rather than waiting a
> round-trip, since nothing referenced 016 outside this entry. **Severity is @Qeeyat's P1; see the
> review on #83 for the argument that it is closer to P0.**

**A patient authenticates successfully and is then refused by our own frontend.** Reproduced in a
real browser against `api-dev` on 2026-08-19 with `patient@demo.test` on the general portal:

```
POST /auth/login/          → 200, role PATIENT, redirect_to "/patient/"
UI shows: "Signed in, but your organization could not be determined.
           Please use your organization portal."
```

The advice in that message is itself impossible to follow — the general portal **is** the patient
portal (`CLAUDE.md` §8); there is no other one for them.

**Three things that don't agree:**

```
GET /auth/me/ (patient)  →  "organization": null      correct — patients aren't org staff
roleDashboardPath()      →  `/${orgSlug}/patient`     requires a slug (src/lib/router.ts:16-17)
src/app/                 →  only /[slug]/patient      no slug-less patient route exists
```

`src/components/forms/SigninForm.tsx:87` exempts `SUPERADMIN` from the "no slug" guard but not
`PATIENT`, so every patient is blocked. **The guard is not the bug** — without it,
`roleDashboardPath(PATIENT, undefined)` builds the literal string **`/undefined/patient`**. It is
papering over the real mismatch.

**The real mismatch: patients are org-scoped in our routing but org-less in the data model.**
`organization: null` is correct backend behaviour and follows directly from the product premise in
`CLAUDE.md` §1 — records move *with the patient* between facilities, so a patient belongs to no
single org.

⚠️ **This also nuances FLAG-010.** That flag records the backend's `redirect_to` "dropping the org
slug" as a loaded gun. For **patients specifically, `/patient/` is the correct answer, not a
defect** — the backend is right and our router is wrong. FLAG-010's blanket framing hides that.

**Two ways out, and the choice is the actual work:**

1. **Add a slug-less `/patient` route.** Consistent with `organization: null` and with the backend's
   own `redirect_to`. Requires: a new route tree, `'patient'` added to `RESERVED_PATHS` in
   `src/lib/config.ts` (or an org whose slug is literally `patient` shadows it), and a revisit of
   `DASHBOARD_SEGMENTS`/`isDashboardRoute` in `src/middleware.ts`, which currently assume
   `/[slug]/patient`.
2. **Ask the backend to give patients a home organisation** (an `api-request`). Contradicts the
   multi-facility premise, so this is the weaker option — noted for completeness, not recommended.

**Blocking:** **D6 Patient is Thu 20 Aug's row.** Whichever way this goes, it is the foundation D6
sits on, so it wants deciding before that branch is cut rather than during it.

**Done when:** a patient can sign in at `/signin` and land on a working dashboard URL that contains
no org slug and no `undefined`, with the decision recorded here and in `HANDOFF.md`, and a
regression test covering a `PATIENT` whose `organization` is `null`.

---


---

### FLAG-215 — Two `roleLabel` implementations, and they disagree about what a role is called
**Severity:** P3 · **Area:** Consistency / UX copy · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-24, fixing the Role column for PR #85

There are two independent role-label functions:

| Where | `ORGANIZATION_ADMIN` | `SUPERADMIN` | Unknown role |
|---|---|---|---|
| `lib/utils.ts` → `roleLabel` | **Org Admin** | **Superadmin** | returns the raw value |
| `components/forms/SetPasswordForm.tsx:42` → local `roleLabel` | **Organization Admin** | **Super Admin** | title-cases it |

So a staff member is told they have been created as an *"Organization Admin"* in the invite email
flow, then sees *"Org Admin"* in the staff table of the dashboard they land on. Same product, same
role, two names.

**Not a live bug, and worth being precise about why:** the `SetPasswordForm` copy is *correct* on
its own terms, and its title-case fallback means it would have survived the lowercase-role problem
that FLAG-215's sibling fix (PR #85) had to solve in `utils.ts`. The defect is that there are two
sources of truth for user-facing role names, not that either is broken.

**Why it wasn't fixed in #85:** that PR is a bugfix for a Role column rendering raw `org_admin`.
Changing which words a patient-facing invite screen shows is a **copy decision**, not a bugfix, and
it belongs to whoever owns the wording — silently rewording an invite screen inside a typing PR is
exactly the kind of unreviewed change `CLAUDE.md` §6 exists to prevent.

**Done when:** one `roleLabel` remains, in `lib/utils.ts`, with the labels chosen deliberately
(including which of "Org Admin" / "Organization Admin" is the product's word), `SetPasswordForm`
imports it, and the title-case fallback for unknown roles is kept or dropped on purpose rather than
by accident.

### FLAG-216 — `POST /patients/` returns no identifiers, so the HCL-ID handout cannot be built

> 🔴 **DISPROVEN 2026-08-28 by @Bastoh — the handout CAN be built, and this is now the blocker it
> claimed to be, in reverse.** Recorded here rather than rewritten, because the reasoning is worth
> keeping and the entry is in @Qeeyat's range. **@Qeeyat: this unblocks the D4 item you deliberately
> did not build.**
>
> Backend **closed #137 with no code change**: *"this already works today."* `PatientViewSet.create`
> does not serialise its response with `PatientCreateSerializer` — it re-serialises the saved row with
> `PatientDetailSerializer`, which carries both fields. **The patient is nested, not top-level:**
>
> ```json
> { "message": "Patient registered successfully",
>   "patient": { "id": "…", "healthclouda_id": "HCL-…", … } }
> ```
>
> So the desk reads **`response.patient.healthclouda_id`**. Reading the top level gives `undefined` —
> which looks exactly like "the API doesn't return it".
>
> 🪤 **Why we got it wrong, and why nobody should feel silly about it:** the flag was derived from the
> live schema, which documents the 201 as `PatientCreate` — 19 fields, no identifiers. That is the
> **request** serializer echoed into the response slot. The schema is wrong; the endpoint is right.
>
> 🎯 **Third time today.** `?date=` on the receptionist endpoints was undocumented and *worked*
> (FLAG-213 / PR #94); the `/patients/` role matrix is documented **only** in prose; and here the
> documented response shape is simply not the one returned. **The schema is a lead, never a verdict.**
>
> ⚠️ **Not re-verified live by me, deliberately.** Confirming it means `POST`ing a real patient into
> the seed data @Qeeyat is testing against — her own reasoning for declining, and it still holds. The
> backend verified it on `api-dev` (`201, created HCL-5WO6SE`), which is good enough to act on and
> cheap to confirm the next time someone registers a patient legitimately.
>
> **Still open, and it is the only thing left of this flag:** the frontend does not yet read the
> nested field, so the HCL-ID handout remains unbuilt. That is a D4 follow-up, not a backend gap.
**Severity:** P1 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN — filed upstream
**Found:** 2026-08-24, verifying D4 against the live schema before building

The 201 response to `POST /api/v1/patients/` is the `PatientCreate` serializer: 19 fields and
**no `id`, no `healthclouda_id`**. Read from the component directly, not inferred from an example.

Registering a patient and reading them their HealthClouda ID is the point of the front-desk flow.
It cannot be done, and there is no fallback: without `id` we cannot even follow up with
`GET /patients/{id}/`, and `send-portal-invite` needs that same `patient_id`.

**⚠️ The available workaround was deliberately refused.** We could search for the patient just
created and take the first result. Two patients registered with the same name minutes apart are
indistinguishable that way, and handing someone the **wrong HealthClouda ID** in an EHR attaches
their records to another person — invisibly, at a reception desk, with no error anywhere. A gap the
receptionist can see is safer than a guess they cannot.

**What was built instead:** registration works and says plainly that the ID is not available yet,
with a one-click search for the patient by name. The receptionist gets the ID from the search
result, where it is unambiguous because they can see who they picked.

**Filed:** backend [#137](https://github.com/HealthClouda/healthclouda-backend/issues/137), which
also asks whether the *"email optional, phone required when email omitted"* rule exists —
`PatientCreateRequest` marks only `first_name`/`last_name` required, so if that rule lives in
`validate()` our form cannot mirror it and the receptionist meets it as a 400 after submitting.

**Done when:** the 201 carries `id` and `healthclouda_id`, the registration screen shows the ID
directly, and the "search for them instead" notice is deleted.

---

### FLAG-217 — This API documents permissions and query params in prose, not in the schema fields
**Severity:** P2 · **Area:** Backend contract / process · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-24, reading the live schema for D4

Two discoveries that change how we should read `/api/v1/schema/`, both the opposite of what our own
flags asserted.

**1. `/api/v1/schema/` needs no authentication.** An unauthenticated GET returns 200 and the full
125-path document. Both devs have deferred contract questions believing a token was required —
@Qeeyat did it on PR #86 the same night this was found. **Only live *data* needs auth. Shapes,
params and required fields never did.**

**2. Some endpoints DO document their role permissions — in the `description` string.** The patients
viewset spells it out verbatim:

```
Permissions:
- VIEW (GET): All staff members
- CREATE (POST): SUPERADMIN, RECEPTIONIST only
- UPDATE (PUT/PATCH):
    - SUPERADMIN, ORG_ADMIN: all fields
    - RECEPTIONIST: contact info only
    - DOCTOR, NURSE: medical info only
- DELETE: SUPERADMIN, ORG_ADMIN only
```

This is exactly what FLAG-209 and FLAG-211 say the schema "never" exposes. It is not never — it is
**12 operations across 6 paths**, all of them prose. D4's contact-edit and registration permissions
were both settled from that block rather than by guessing or by POSTing at shared seed data.

**Params hide in the same place.** `/receptionist/appointments/` declares no parameters and its
description says `GET: appointments (?date=&doctor_id=&status=)`. `/ward/admissions/` declares none
and documents `status`, `ward_id`, `patient_id`. Given that inventing query params is a known bug
class here (DRF ignores unknown params silently), **the descriptions are load-bearing and must be
read** — they are frequently the only place a param is written down.

**Where it does NOT help:** `/ward/admissions/` POST documents no permissions, so FLAG-211's actual
question — may a nurse admit? — is still open. Checked, not assumed.

**Done when:** `ONBOARDING.md` and the contract-seam section of `CLAUDE.md` say to read the schema
**description** as well as the parameters, and FLAG-209/211's "the schema never exposes roles"
wording is narrowed to "unless the description says so — check first."

---

### FLAG-218 — Every receptionist write endpoint documents an empty request body
**Severity:** P1 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-24, scoping D4

`POST /receptionist/check-ins/` (check a patient in), `POST /receptionist/appointments/` (book), and
`PATCH /receptionist/check-ins/{id}/` (call / complete / no-show) all carry **no `requestBody` in
the schema at all** — they are hand-rolled APIViews whose descriptions name the *action* but never
the payload. `PATCH /patients/{id}/` is the same: role rules in prose, no documented body.

FLAG-213 captured the **GET** shapes for these endpoints live, but not the write shapes, so there is
no second source either.

**Consequence for D4:** checking a patient in and booking an appointment — two things a receptionist
does constantly — **were not built**, because building them means inventing a request body and
discovering the truth from 400s in front of a patient. Everything D4 *did* ship is backed by either
the schema or a live capture.

What shipped instead: the queue and appointment list read correctly, are filterable by the params
the descriptions document, and doctor assignment (whose body was already known and working) is
unchanged.

**Done when:** the three write bodies are documented — ideally in the schema, otherwise captured
live against a disposable record with @Bastoh's agreement — and check-in creation plus appointment
booking are built. **This is the largest remaining gap in D4** and should be the first thing settled
after backend #137.

### FLAG-219 — Create endpoints return their input back without an `id`, twice now
**Severity:** P2 · **Area:** Backend contract · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-24, building D5 episode create — the second endpoint with this shape in one night

`POST /api/v1/episodes/` returns `EpisodeCreate`, which is the request echoed back:

```
patient, episode_type, chief_complaint, diagnosis, prescribed_drugs,
patient_instructions, vitals, clinical_notes, treatment_plan
```

**No `id`.** So having created an episode we cannot link to it, cannot attach anything to it, and
cannot confirm which record we made — only refetch the list and hope to recognise it.

This is the **same shape as FLAG-216** (`POST /patients/` returning no `id`/`healthclouda_id`), and
two instances in two different apps is a serializer convention, not an oversight in one place.
Filed separately from #137 only because that issue is specifically about the HCL-ID handout; **if
the backend fixes the convention rather than the endpoint, both close together.**

**Impact is lower here than in FLAG-216** and worth saying so plainly: a doctor who has just started
an episode is looking at the patient in front of them, so refetching the list is a mild annoyance.
Handing a patient the wrong HealthClouda ID is not. Same defect, very different blast radius.

**Worth checking before filing more:** whether `POST /referrals/`, `POST /ward/admissions/` and the
other creates share it. Not swept yet.

**Done when:** create responses carry `id`, or the convention is confirmed deliberate and we stop
expecting it.

---

### FLAG-220 — Referral accept/decline moved to ORG_ADMIN, and the doctor-namespaced route is a trap

> ✅ **The capability gap is closed 2026-08-28 (@Bastoh)** — Org Admin now has a **Referrals** page
> with accept/decline. The flag stays open until that PR merges; the *trap* it documents is permanent
> and should not be deleted.
>
> Built against the **generic** `/referrals/<id>/accept/` and `/decline/`, which the schema fully
> specifies, rather than the `/doctor/`-namespaced twins that carry the same ORG_ADMIN rule.
>
> **Contract, read live 2026-08-28:** `ReferralResponseRequest` requires **`response_notes`** on both
> actions; `create_episode`, `chief_complaint` and `diagnosis` are optional and only sent when an
> episode is actually being opened. The submit button stays disabled until notes exist, because a
> missing required field would be a guaranteed 400 in front of a waiting patient.
>
> 🪤 **Two schema errors found on this endpoint, and the type is captured, not derived.**
> `GET /referrals/received/` is documented as returning a single `ReferralDetail` (28 fields). It
> actually returns a **DRF envelope** whose items carry **14** — the list serializer is a subset, and
> `response_notes` / `responded_by` / the clinical fields are detail-only. Do not "tidy" `OrgReferral`
> against the schema.
>
> 🔴 **The action buttons gate by EXCLUSION, and that is deliberate.** The schema documents **no status
> enum for referrals**, and the seeded data only ever showed `ACCEPTED` and `DECLINED` — so the name of
> the pending state is **unverified**. Listing it would mean inventing an enum member, which is exactly
> the FLAG-004 bug class, and a wrong guess would hide the buttons on precisely the rows that need
> them — failing silently. Anything not already resolved is therefore actionable.
>
> ⚠️ **Not exercised end to end against `api-dev`.** Both seeded received-referrals are already
> resolved, so no row in real data currently offers the buttons, and confirming a real accept would
> mutate shared seed data (and create an episode). The test fixture uses a deliberately unfamiliar
> status to prove the gating works for a value we have never seen.
**Severity:** P1 · **Area:** Backend contract / authorisation · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-24, re-reading Swagger before D5 writes — exactly as the sprint plan instructed

The change the sprint plan warned about (*"referral workflow becomes ORG_ADMIN-managed ~20 Aug —
re-read Swagger first, don't build deep"*) **has landed.** From the live schema, verbatim:

> **Authorisation: the receiving organisation's ORGANIZATION_ADMIN only** (FLAG-220) — a doctor can
> no longer self-accept. On accept, a receiving-org Episode is created and the referral is forwarded
> to that org's on-duty doctors.

**🪤 The trap:** the endpoints are still namespaced under `/doctor/`.

```
PATCH /api/v1/doctor/referrals/{id}/accept/
PATCH /api/v1/doctor/referrals/{id}/decline/
```

Their own descriptions say they are the **ORG_ADMIN's** capacity confirmation. So a path that reads
`/doctor/…` requires a role that is not the doctor, and anyone scanning path names to decide what
belongs on the doctor dashboard will get it exactly backwards. There are also two parallel surfaces
(`/referrals/{id}/accept/` POST vs `/doctor/referrals/{id}/accept/` PATCH) with **different verbs**
for the same action.

**Consequence, and why this flag is worth its length:** D5's sprint row lists "referral
accept/decline" as doctor work. Building it would have shipped a button that 403s every time — an
affordance a doctor can neither use nor understand, on a dashboard the backend tests next week. The
doctor's Referrals page is read-only today and **must stay that way**; a test now pins that
(`referral accept/decline is NOT the doctor's to make`).

**Where it belongs instead:** **D2 Org Admin.** The receiving org's admin needs an incoming-referrals
queue with accept/decline, and nothing in D2 covers it — this is currently a hole in the product,
not just a misplaced button.

**Done when:** the sprint plan's D5 row no longer lists referral accept/decline as doctor work, D2
gains the ORG_ADMIN referral queue, and — ideally — the backend is asked why an ORG_ADMIN-only
action lives under `/doctor/`.

---

### FLAG-223 — Three Patient endpoints return bare arrays; the dashboard reads `.results` from all three
**Severity:** P1 · **Area:** Contract / Patient dashboard · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-30, auditing the Patient dashboard against the live schema

The Patient dashboard has **never been rendered by anyone** — FLAG-210 means patients cannot sign
in, so nothing in it has ever been seen against real data. Audited against the live schema instead.

`/patients/me/appointments/`, `/patients/me/notifications/` and `/patients/me/access-requests/` are
each documented as a **bare array**, not a DRF paginated envelope:

```
/api/v1/patients/me/appointments/     ARRAY of PatientAppointment
/api/v1/patients/me/notifications/    ARRAY of PatientNotification
/api/v1/patients/me/access-requests/  ARRAY of PatientAccessRequest
```

`PatientDashboard.tsx` reads `.results` off all three:

```ts
const upcoming   = apptData?.results ?? [];   // :54
const notifs     = notifData?.results ?? [];  // :55
const accessList = arData?.results ?? [];     // :258
usePaginatedList<PatientAppointment>(path);   // :192 — also assumes {count, results}
```

On a bare array `.results` is `undefined`, so every one of them falls through to `?? []` and the
panel renders its **empty state**. That is the Overview appointments panel, the Overview
notifications panel, the whole Appointments page, and the Access tab — i.e. most of the dashboard,
showing "No appointments" to a patient who has them.

⚠️ **The schema does distinguish the two shapes**, which is why I trust it here: `/patients/`,
`/ward/beds/` and `/org/` all carry `PaginatedXList` refs in the same document. These three
deliberately do not.

🪤 **Something already saw this.** Line 255 types referrals as `Paginated<Referral> | Referral[]`
and unwraps both — someone hit an array there live and hedged at that one call site instead of
checking its four neighbours. A hedge is evidence about the endpoints next to it.

**Not yet confirmed live** — confirming needs a patient token, and patients cannot sign in
(FLAG-210), so this is schema-level evidence only. ⚠️ FLAG-216 is precedent that this schema can be
wrong about a *response* shape, so verify before rewriting all four call sites.

**Also unresolved:** `/referrals/my-referrals/` documents its 200 as a **single `ReferralDetail`
object**, which matches neither branch of the hedge above. Three different shapes across five
patient endpoints.

**Done when:** each of the four call sites is confirmed against a live patient response and unwraps
the shape that endpoint actually returns, with a test per shape.

---

### FLAG-224 — The patient "Requested By" column reads a field that does not exist on their serializer
**Severity:** P1 · **Area:** Contract / Consent · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-30, same audit

`PatientDashboard.tsx:274` renders the Access Requests table first column from `ar.staff_name`.
The patient-scoped serializer has no such field:

```
PatientAccessRequest: id, organization_name, reason, status, created_at
```

`staff_name` is optional on our shared `AccessRequest` type (`types/dashboard.ts:501`), which is the
org-admin shape — so TypeScript is satisfied and the column silently renders an em dash on every row.

**Why this is P1 and not cosmetic.** This is the screen where a patient sees *who asked to read
their medical records* and decides whether to allow it. Rendering a dash in that column does not
degrade a nice-to-have; it removes the identity from a consent decision while still presenting the
decision as informed. `organization_name` — the field the backend actually sends, and arguably the
more meaningful answer, since access is granted to an organisation — is right there and unused.

**Same class as FLAG-222**, found the same way: a type permissive enough to hide the mismatch. Two
in one week says the shared-type-across-roles pattern is the bug generator, not the individual field.

**Done when:** the column renders `organization_name`, and a test asserts the requesting
organisation appears — asserted positively, not as "not an em dash" (the FLAG-221 lesson).

---

### FLAG-225 — No dashboard stats endpoint in the entire API documents a response body
**Severity:** P1 · **Area:** Contract / Schema · **Owner:** @Qeeyat (frontend) · **Status:** ✅ **RESOLVED 2026-09-03 by backend #161** — verified against the live schema 2026-09-04, see the note at the end of this entry
**Found:** 2026-08-30, generalising from FLAG-222

FLAG-222 (three of four Superadmin stat cards read fields the API has never returned) is not a
one-off. Every stats/dashboard endpoint in the live schema — **eleven of them** — documents a `200`
with **no response body at all**:

```
/doctor/dashboard/stats/        /nurse/dashboard/stats/       /org-admin/dashboard/stats/
/receptionist/dashboard/stats/  /patients/me/dashboard/       /superadmin/dashboard/
/superadmin/stats/              /doctor/my-patients/          /nurse/my-patients/
/nurse/wards/overview/          /org-admin/wards/overview/
```

So **the stat tiles on all six dashboards are unverifiable from the schema**, by construction. Every
`*DashboardData` / `*Stats` interface in `types/dashboard.ts` is a guess that happens to have been
right, or has not been caught yet. Three of the four dashboards anyone has looked at carried a
contract bug; this flag is why that hit rate is not bad luck.

It also explains the shape of the whole audit trail: **the schema cannot answer the one question the
tiles depend on, so only live capture can.** FLAG-217 established that this API documents contracts
in prose; this is the same gap at the place it costs most.

**Backend #158** already asks for three missing Superadmin stats fields. That is the instance. The
class — *publish response serializers for the stats endpoints* — needs its own ask.

**Done when:** the stats endpoints document their response serializers in `/api/v1/schema/`, or —
failing that — every stat tile in the app has a live-captured payload recorded next to its type, per
role, with the capture date.


> ✅ **RESOLVED by backend #161, merged 2026-09-03. Verified against the live schema 2026-09-04** —
> re-fetched and parsed here, not taken from the PR:
>
> ```
> /api/v1/doctor/dashboard/stats/        HAS BODY   → DoctorDashboardStats
> /api/v1/nurse/dashboard/stats/         HAS BODY   → NurseDashboardStats
> /api/v1/org-admin/dashboard/stats/     HAS BODY   → OrgAdminDashboardStats
> /api/v1/receptionist/dashboard/stats/  HAS BODY   → ReceptionistDashboardStats
> /api/v1/patients/me/dashboard/         HAS BODY   → PatientDashboard
> /api/v1/superadmin/dashboard/          HAS BODY   → SuperadminDashboardStats
> /api/v1/superadmin/stats/              HAS BODY   → SystemStats
> ```
>
> **Seven for seven.** The sentence this flag is named for is no longer true.
>
> 🎯 **It immediately paid for itself twice, on the same day.**
> - It **confirmed [[FLAG-227]] from a second, independent source**: `DoctorDashboardStats` publishes
>   `todays_appointments` (not `appointments_today`) and carries **no `active_prescriptions`** — the
>   phantom field, absent exactly as the live capture said.
> - It **found [[FLAG-231]] on a dashboard nobody can log into.** Two of four Patient tiles read
>   fields `PatientDashboard` does not publish. That check was impossible the day before this landed,
>   and it needed no credentials.
>
> ✅ It also **cleared Nurse from a third source**: `NurseDashboardStats` publishes exactly the eleven
> fields `NurseStats` declares, matching the live capture taken the same day.
>
> ⚠️ **Do not read this as "the schema can now be trusted."** Two limits, both live:
> 1. **[[FLAG-554]] (backend)** — six nested `SerializerMethodField`s in this same batch publish as
>    `string` where the value is an integer or an object. **A published wrong type is more dangerous
>    than a documented absence**, because absence makes a consumer go and measure, and that measuring
>    is what caught FLAG-222 and FLAG-227. Confidence removes the reason to check.
> 2. **This closes the *stats* class only.** The wider count — of the 84 GETs documenting a `200`,
>    48 documented no body — was measured across the whole API on 2026-09-01. Only these seven paths
>    are known to have changed.
>
> **So the rule stands: the schema is a lead, not a verdict.** What changed is that the lead now
> exists for stats endpoints, and a *presence* check against it is cheap and does not need a token —
> which is exactly how FLAG-231 was found.
---

### FLAG-226 — `?my=true` on `/episodes/` is undocumented, and if it is ignored the patient sees other patients episodes
**Severity:** P1 — **P0 if live capture shows unscoped results** · **Area:** Security / PHI ·
**Owner:** @Qeeyat · **Status:** OPEN — **verify before 3 Sep**
**Found:** 2026-08-30, same audit

The patient "My Health Records" page fetches:

```ts
usePaginatedList<Episode>(ENDPOINTS.EPISODES + '?my=true');   // PatientDashboard.tsx:143
```

`/api/v1/episodes/` documents exactly three query params — `ordering`, `page`, `search`. **`my` is
not one of them.** This repo recurring bug class is precisely that DRF ignores unknown params
silently (`CLAUDE.md` §5), and the FLAG-205 correction says absence from the schema justifies
verifying, never concluding — so this is not yet a finding of fact.

**But the two outcomes are very far apart:**

- If the backend scopes `/episodes/` to `request.user` anyway, `?my=true` is dead weight — harmless,
  delete it.
- If it does not, a logged-in patient own health-records page renders **other patients episodes**,
  each row carrying a chief complaint. That is a cross-patient PHI leak on the one screen a patient
  is guaranteed to open, and it would have shipped looking like a working page.

**This is the FLAG-221 lesson pointed forwards.** That flag recorded a test that was green while PHI
leaked, because it asserted the layer rather than the property. Here nothing is asserted at all: the
Patient dashboard has never been rendered, so no test and no human has ever seen this response.

⚠️ **Do not "fix" this by deleting the param.** If the endpoint is unscoped, removing `?my=true`
changes nothing and destroys the evidence that prompted the check.

**Done when:** `GET /episodes/` is captured live with a patient token and it is recorded here
whether the response is user-scoped — and if it is not, the page moves to a patient-scoped endpoint
and a test asserts no foreign patient id appears in the rendered rows.


---

*Last updated 2026-08-30. FLAG-223/224/225/226 raised 2026-08-30, auditing the Patient dashboard against the live schema — the first time anything in it had been checked, since FLAG-210 means it has never been rendered. FLAG-225 is the generalisation of FLAG-222 and the reason this audit was worth running: the schema documents no response body for any of the eleven stats endpoints, so no stat tile on any dashboard is verifiable without live capture.*

*Earlier history: last updated 2026-08-19. Flags 001–009 raised from the 2026-08-08 codebase survey. FLAG-200 raised
2026-08-10 (Qeeyat's first session). FLAG-010 and FLAG-011 raised 2026-08-12; FLAG-002 partially
fixed by PR #65. FLAG-201/202/203/204 raised 2026-08-13, reviewing PR #69. FLAG-012 raised 2026-08-13
reviewing PR #73. FLAG-205/206 raised 2026-08-14/15, building D1 Superadmin pages (PR #76, merged
2026-08-17) — **FLAG-205 is partly disproven, see the correction in its entry**. FLAG-207/208/209
raised 2026-08-17, building D2 Org Admin (PR #78, merged 2026-08-19) — FLAG-207 fixed same PR.
**FLAG-013/014/015 raised 2026-08-17 reviewing PRs #76/#77/#78 — numbered in @Bastoh's range, owned
by @Qeeyat** (see the note under the range table). FLAG-013 and FLAG-014 were **swapped on
2026-08-19** so that `page_size` is 013, matching three in-code comments already merged on `develop`
— see the numbering note on FLAG-013. FLAG-211/212 raised 2026-08-19, building D3 Nurse.
FLAG-215 raised 2026-08-24, fixing the Role column for PR #85. FLAG-211 was **narrowed** the same
night (see the note inside it): its claim that the schema documents no parameters held for the
doctor endpoints and was wrongly generalised to the whole API. FLAG-219/220 raised 2026-08-24, re-reading Swagger before the D5 write workflows — FLAG-220 is the referral authorisation change the sprint plan told us to check for, and it had landed. FLAG-216/217/218 raised 2026-08-24, verifying D4 against the live schema BEFORE building it — which is how all three were found rather than shipped.*

> 🔁 **The numbering rule bit again, in the third distinct way.** FLAG-016 (patient sign-in, PR #83)
> was renumbered to **FLAG-210** on merge, into @Qeeyat's range. A D3 branch cut before that merge
> then added its own "FLAG-210", and the collision only surfaced when the two files met. So the rule
> now has three cases, not two: an unmerged PR reserves numbers · a **review comment** reserves
> numbers · and a flag that gets **renumbered on merge** silently invalidates any branch that was
> cut while it held its old number. Before numbering: check `develop` **and** open PRs **and**
> whether anything you filed has since been renumbered.


> ⚠️ **FLAG-011 is still OPEN — do not read `HANDOFF.md` as saying otherwise.** Its "Cleared on
> merge" line reads *"FLAG-011 token contrast — PR #68"*, which looks like a fix. PR #68 was
> **docs-only**: it *logged* this flag. The failing token values are unchanged and still live.
> FLAG-014 and FLAG-015 are the same underlying problem at other call sites — fix the tokens once,
> across all three, and re-measure.

---

### FLAG-221 — Tests assert the layer, not the property — and one of them was green on a live PHI leak
**Severity:** P2 (process) · **Area:** Testing / process · **Owner:** @Qeeyat · **Status:** 🟡 two
instances fixed, one open
**Found:** 2026-08-29, while fixing FLAG-203

A test can be green, well-named, and carefully written, and still say nothing about the property it
appears to protect — because it asserts the **layer it can reach** rather than **what the user
gets**. This is not hypothetical here: it is how FLAG-203 shipped a PHI leak past a passing suite,
and it currently hides a session bug in an unmerged PR.

**Instance 1 — the test that asserted the bug (fixed).** `NurseDashboard.test.tsx` checked only that
the small-screen notice was *rendered*, with the note *"the md: breakpoint is a media query JSDOM
cannot evaluate, so visibility is not assertable here."* Every word of that was true, and it is
exactly what hid the problem: with a CSS-only gate, the notice **and the entire dashboard** were both
in the DOM. The test passed on a build that shipped patient records to phones. **The honest question
was never "is the notice rendered" — it is "did any PHI leave the server."** It now asserts
`dataGetMock` was never called.

**Instance 2 — a control that nothing defended (fixed).** The gate is one opt-in prop
(`smallScreenGateFor`) on five dashboard components, and only Nurse had any test naming it. Measured
rather than assumed: deleting `smallScreenGateFor="Doctor"` from `DoctorDashboard` outright left the
suite at **161/161 green**. A PHI control could be removed by a one-line edit with no signal.
`src/components/dashboard/small-screen-gate.test.tsx` now covers all five; re-running the same
mutation fails exactly one test.

**Instance 3 — OPEN, and it matters this week.** `middleware.test.ts:45` is named *"lets a dashboard
nav through when ONLY the refresh cookie is present"* and asserts middleware does not redirect. PR
**#99** breaks precisely that invariant for the user — the new page-level gate reads only the access
token, which expires hourly, so the user is bounced to signin with six days of refresh token left.
**That test stays green, because #99 does not touch `middleware.ts` at all** (verified: zero
middleware files in its diff). Middleware still "lets it through"; the page then throws it out. The
test covers a layer; nobody covers the composition.

> 🎯 **The generalisation worth keeping:** every one of these tests is *correct about its own layer*.
> The failure is scope — the property that matters spans two layers (CSS + mount, middleware + page,
> server render + client fetch), and no test in this repo spans two layers. **A green suite means the
> code matches its tests; it has never meant the code matches its contract.** @Qeeyat wrote almost
> exactly that during Gate 1 about the six fixture tests; this is the same sentence with a different
> cause, so it is worth stating as a standing rule rather than rediscovering a third time.

**The technique that found 2 and 3, which is cheap enough to make routine:** break the control on
purpose and run the suite. If it stays green, the control is undefended. It took about two minutes
per probe and needs no tooling. Worth doing for every item in `SECURITY_BASELINE.md` §2 before beta —
a control with no failing test is a claim, not a control.

**Done when:**
- [x] Instance 1 — nurse test asserts the fetch, not the render (PR #106)
- [x] Instance 2 — all five staff dashboards assert the gate (PR #106)
- [ ] Instance 3 — a test that spans middleware **and** the page gate, so "an expired access token
      with a live refresh token keeps the session" is asserted end to end rather than per layer.
      Belongs with #99's fix, not in a separate PR.
- [ ] Run the mutation probe against each control claimed in `SECURITY_BASELINE.md` §2 and record
      which ones have a test that actually fails when they are removed.

---

### FLAG-222 — Three of four Superadmin stat cards read fields the API has never returned
**Severity:** P1 · **Area:** Backend contract / D1 · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-29, the first time anyone rendered this dashboard in a browser

`SuperadminStats` is typed against fields `/superadmin/dashboard/` does not send. Measured live on
`api-dev` as `superadmin`, 29 Aug:

```
GET /api/v1/superadmin/dashboard/  -> 200
{ "total_users": 17, "total_orgs": 3, "monthly_revenue": 0, "active_records": 18,
  "users_trend": null, "users_trend_up": null, "orgs_trend": null, "orgs_trend_up": null,
  "revenue_trend": null, "revenue_trend_up": null, "records_trend": null, "records_trend_up": null }
```

| Card | Reads | Exists? | Renders |
|---|---|---|---|
| Total Users | `total_users` | ✅ | **17** |
| Organisations | `total_organizations` | ❌ — it is `total_orgs` | **—** |
| Active Orgs | `active_organizations` | ❌ **no such field at all** | **—** |
| Total Patients | `total_patients` | ❌ — nearest is `active_records` | **—** |

🪤 **On screen this is visibly absurd and nobody saw it:** the "Organisations" tile reads **—** while
the "Recent Organisations" table **directly beneath it lists three organisations**. Screenshot in
PR #106's thread.

**Why the schema could not have caught it:** `/superadmin/dashboard/` documents `200: No response
body` (FLAG-218 class) and its description merely *claims* *"Returns flat dashboard stats matching
the frontend contract."* That sentence is the only contract, and it is false. **A description is
evidence about intent, not about shape.**

**Why 155 green tests did not catch it:** the fixtures assert our own `SuperadminStats` type, so
they agree with the code and never with the API. This is [[FLAG-221]] a fourth time, and Gate 1 said
it in September's words already — *"green means the code matches the fixtures, nothing more."* It is
also the **same bug class as the merged D2 fix (#85, Org Admin) and NURSE-1** — third dashboard, same
cause.

⚠️ **Do NOT map these by name-similarity — two of the three are genuinely unresolvable today:**

- `total_orgs` → **Organisations** is exact and safe.
- **Active Orgs** has *no* corresponding field. It cannot be shown truthfully without one.
- **Total Patients**: `active_records: 18` is **not** a patient count — the seed has 21+ patients
  across orgs. "Records" and "patients" are different nouns and guessing they are the same is how
  this class of bug started. Renaming the read to `active_records` would replace a visible gap with
  an invisible wrong number, which is strictly worse on a dashboard someone makes decisions from.

**Done when:**
- [ ] `total_orgs` wired to the Organisations tile.
- [ ] An `api-request` filed for a real `active_organizations` and a real patient count — or the two
      tiles are removed rather than shown permanently blank.
- [ ] A test that fails against the **captured** payload above rather than against our own type.

---

### FLAG-227 — Two Doctor stat tiles read fields `/doctor/dashboard/stats/` does not return
**Severity:** P1 · **Area:** Contract / Doctor dashboard · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-08-31, first T5 render of the Doctor dashboard (`e2e/design/roles.spec.ts`)

The **fourth** dashboard with this bug — after Org Admin (#85), Nurse (NURSE-1) and Superadmin
([[FLAG-222]]). Found the first time anyone rendered the Doctor dashboard in a browser, which is
exactly what Gate 2 predicted would happen.

**Captured live, 2026-08-31**, `GET /doctor/dashboard/stats/` as `doctor@demo.test` against
`api-dev` — the payload, not the schema, which documents `200: No response body` ([[FLAG-225]]):

```json
{"todays_appointments":0,"active_episodes":14,"patients_in_queue":0,
 "pending_referrals":0,"admissions_under_care":2,"completed_episodes_this_week":0}
```

`DoctorDashboard.tsx:268-271` reads:

| Tile | Component reads | In payload? |
|---|---|---|
| Active Episodes | `active_episodes` | ✅ |
| **Appointments Today** | `appointments_today` | ❌ — the field is **`todays_appointments`** |
| Pending Referrals | `pending_referrals` | ✅ |
| **Prescriptions** | `active_prescriptions` | ❌ — **no equivalent field exists at all** |

⚠️ **These two are not the same problem and must not be fixed the same way.**

- **Appointments Today** is a straight rename — `appointments_today` → `todays_appointments`. Safe.
- **Prescriptions** has **no corresponding field in the payload**. There is nothing to rename it to.
  Per the [[FLAG-222]] reasoning, do **not** point it at a plausible-looking neighbour: mapping it to
  `completed_episodes_this_week` or `admissions_under_care` would replace a visible gap with an
  invisible wrong number on a screen a clinician makes decisions from. It needs an `api-request` for
  a real prescriptions count, or the tile comes out.

**Three fields the backend sends and nothing renders:** `patients_in_queue`,
`admissions_under_care`, `completed_episodes_this_week`. Worth a design look — `admissions_under_care: 2`
is real clinical information currently thrown away.

**Why the unit suite is green:** `DoctorDashboard.test.tsx` fixtures assert our own `DoctorStats`
interface, so they agree with the component and never with the API. [[FLAG-221]], a fifth time.

**Currently annotated, not fixed.** `roles.spec.ts` marks the doctor tile test `test.fail()` via
`knownStatBug: 'FLAG-227'`, so the suite is honest rather than permanently red. **When that test
starts passing, the source has been fixed — delete the annotation.**

**Done when:**
- [ ] `todays_appointments` wired to the Appointments Today tile.
- [ ] An `api-request` filed for a prescriptions count — or the tile removed rather than shown blank.
- [ ] `knownStatBug` deleted from the doctor entry in `e2e/design/roles.spec.ts`, and that test passes.
- [x] ~~The two remaining unverified dashboards — **Nurse and Patient** — rendered the same way.~~
      **Nurse: done 2026-09-04 and it is CLEAN** — the first dashboard whose stats interface matches
      the live payload exactly. All four tiles carry real values; `NurseStats`' eleven fields are
      eleven for eleven against `GET /nurse/dashboard/stats/`. **The streak was four of six, not
      five of seven.** (The run did find [[FLAG-212]] worsening and raised [[FLAG-229]] — just not
      this bug class.)
- [ ] **Patient (DASH-6) is still unrendered — it is now the only one.** It is *reachable* since
      #100, but no `E2E_PATIENT_EMAIL` / `E2E_PATIENT_PASSWORD` exists, so it remains the one
      dashboard nobody has ever seen. It is wired into `roles.spec.ts` and skips cleanly; it renders
      the moment credentials land. **This is now the single cheapest unverified thing in the repo.**
### FLAG-228 — A Google Fonts fetch inside `npm run build` can turn any CI run red
**Severity:** P3 · **Area:** CI / Build · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-09-03, reviewing why PR #120 showed a failing check

`next/font/google` fetches the font files **at build time**, so `npm run build` makes a live call to
`fonts.googleapis.com`. On PR #120 that call failed on the runner and the build died:

```
##[error]The build failed, but NOT on the A4 fail-loud guard.
NextFontError: Failed to fetch `Lato` from Google Fonts.
```

The job that failed is **"Build fails loud without a tier URL"** — the A4 guard, which exists to prove
the build *refuses* to run without `NEXT_PUBLIC_API_URL`. It is a network flake, nothing to do with
#120's diff, and the job's own error line says so. Re-running the workflow clears it.

**Why it is worth a flag rather than a shrug:**

1. **It is indistinguishable from a real failure at a glance.** A red X on a PR is the one signal a
   reviewer is meant to trust, and #116 has just made CI a gate. A check that fails randomly teaches
   people to merge past red — the exact habit FLAG-370's permanently-red check was called out for.
2. **It will hit the A4 guard specifically and repeatedly**, because that job is the one that runs a
   full build with no cached font.
3. **It is our only build-time dependency on a third-party host**, which is also an A2-shaped concern:
   the build reaches out to a domain we do not control.

**Done when:** the fonts are self-hosted (`next/font/local` with the `.woff2` committed, which is the
documented fix and removes the network call entirely), **or** the CI build step retries once on a
`NextFontError`. Self-hosting is the better answer — it also removes a render-blocking third-party
request from every page load.

> 📌 **Second sighting, 2026-09-04 — and this one was reproduced locally, which narrows the cause.**
> `npm run build` from a clean `.next` died with the identical `NextFontError`. Immediately after,
> the host was fine:
>
> ```
> curl https://fonts.googleapis.com/css2?family=Lato:wght@400   → 200 in 1.33s
> npm run build (retried, no other change)                      → green, middleware 35.8 kB
> ```
>
> **So it is not an outage and not a DNS failure** — the host was reachable a second either side of
> the failure. That leaves a transient refusal (rate limiting or a connection reset under load) as
> the likely cause, which matters for the fix: **a "check the host is up" retry guard would not have
> caught this**, because the host *was* up. Only removing the build-time network call does.
>
> It also confirms the flag is **not CI-specific** — it fails on a developer's machine, where it
> presents as "my build is broken" rather than "the runner flaked", and there is no job log naming
> the cause. That is the more expensive version of this bug.

---

### FLAG-229 — The T5 harness photographs only the landing state, so every write workflow is unrendered
**Severity:** P2 · **Area:** Test coverage / design verification · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-09-04, rendering the Nurse dashboard (DASH-3) for the first time

`e2e/design/roles.spec.ts` clicks each sidebar nav item and screenshots what appears. Anything
behind a *second* interaction — a row action, a selection, a modal, a slide panel — is never
rendered, by anyone, at any point in our process.

**The Nurse dashboard is where this stops being theoretical.** Recording vitals is the one write
workflow a nurse has, and `RecordVitalsForm` only mounts after a patient is picked from the Vitals
picker. So the T5 baseline `nurse-vitals-desktop` is a screenshot of an **empty "Select a patient"
panel**, and the form itself — 8 numeric inputs with live backend validation bounds, a notes field,
a submit that `PATCH`es real clinical data — has still never been looked at. The dashboard reads as
verified because four pages are green.

This generalises to every role:

| Never rendered | Where |
|---|---|
| Record-vitals form (8 inputs + notes + submit) | Nurse → Vitals, after selecting a patient |
| Every `SlidePanel` / `Modal` | staff invite, episode create, access review, … |
| Every row action | "Record vitals", suspend/activate, assign doctor |
| Pagination beyond page 1 | seed data fits on one page everywhere |
| The `error` and `empty` states | `docs/DESIGN-VERIFICATION.md` §3 asks for all three; the harness captures one |

🔑 **Why this is P2 and not a nice-to-have.** The stat-tile check exists because a *live render* is
the only layer that can see a field the backend never sent ([[FLAG-222]], [[FLAG-227]],
[[FLAG-221]]). That argument does not stop at the landing state — a form binding a field the API
does not accept, or a panel reading a key off a serialiser that renamed it, is the **same bug class
in the half of the UI the harness cannot see.** We have been reasoning as though a green harness
covered a dashboard. It covers a dashboard's front page.

⚠️ **`docs/DESIGN-VERIFICATION.md` already warns not to read a green run as "the dashboards are
verified" — but only about the roles with no credentials.** The same sentence needs to say it about
the pages we *do* run.

**Not fixed here, deliberately.** Extending the harness into interaction states is real design work
(what to click, what to mask, how not to `PATCH` seed data from a screenshot test — a write workflow
test that actually submits would mutate `api-dev`, which is precisely what [[FLAG-216]] refused).
That is its own PR, not a rider on the one that first rendered Nurse.

**Done when:**
- [ ] A decision on read-only vs. mutating interaction coverage — a form can be *opened* and
      screenshotted without submitting, which gets most of the value with none of the writes.
- [ ] At minimum the Nurse record-vitals form and one `SlidePanel` rendered and baselined.
- [ ] The empty and error states captured deliberately rather than incidentally.
- [ ] `docs/DESIGN-VERIFICATION.md`'s "what is NOT covered" table says *landing states only*.

---

### FLAG-230 — Stacked PRs never run CI, and the repo's safe-merge pattern is exactly what stacks them
**Severity:** P2 · **Area:** CI / process · **Owner:** @Bastoh (repo settings + workflow) · **Status:** OPEN
**Found:** 2026-09-04, opening #128 onto a stack parent and noticing it had no checks at all

`ci.yml` triggers on `pull_request: branches: [develop, staging, main]`. **A PR whose base is
another feature branch matches none of those, so none of the three jobs run** — not `verify`, not
`lint`, not `tier-guard`. `gh pr checks` reports "no checks reported", which is easy to read as
"nothing has run yet" rather than "nothing will ever run".

**Measured on merged PRs, 2026-09-04** — every stacked child in the repo's history:

| PR | Base now | CI jobs that ran |
|---|---|---|
| **#100** patient portal (stacked on #99, merged 3 Sep) | `develop` (retargeted) | **none** — Vercel only |
| **#117** B7 coverage (stacked on #116) | `develop` (retargeted) | **none** — Vercel only |
| **#119** session log (stacked on #113) | `develop` (retargeted) | **none** — Vercel only |
| **#124** session log (stacked on #122, still open) | a docs branch | **none** — Vercel only |

🔑 **Retargeting does not save it.** When the parent merges, GitHub moves the child's base to
`develop` — but a base change fires `pull_request` with action `edited`, and the default activity
types for that event are `opened`, `synchronize` and `reopened`. So the workflow does not run on the
retarget, and unless someone pushes another commit afterwards **the child merges into `develop`
having never been checked.** That is what the table above shows: all three are on `develop` now, and
none of them ever ran a job.

🔴 **Why this is worse than it sounds.** `HANDOFF.md` teaches stacking as *the* safe pattern —
"merge the parent as a merge commit, **without `--delete-branch`**", evidenced twice (#116→#117,
#99→#100) after `--delete-branch` closed a stacked child. That guidance is correct and should stay.
But it means **the repo's recommended workflow is also the one that skips CI**, and the two facts
have never been stated next to each other. #100 — the patient portal, merged two days before real
PHI — is a stacked PR that no CI job ever saw.

Compounding: ruleset 11328360 carries **no required status checks** (FLAG-006's remaining half), so
nothing notices the absence. A required check would at least have blocked on "Expected — waiting for
status to be reported".

**Done when** — one of:
- [ ] `ci.yml` also triggers on `pull_request: branches: ['**']` (simplest; runs CI on every PR
      regardless of base), **or** adds `types: [opened, synchronize, reopened, edited]` so a
      retarget re-runs it. The first is the more honest fix — it checks the child *before* it is
      retargeted, not after.
- [ ] Required status checks are added to the ruleset, so a PR with no checks cannot merge silently.
- [ ] `HANDOFF.md`'s stacking guidance says out loud that a stacked child gets no CI until it is
      retargeted **and** pushed to.

---

### FLAG-231 — Two Patient stat tiles read fields `/patients/me/dashboard/` does not return
**Severity:** P1 · **Area:** Contract / Patient dashboard · **Owner:** @Qeeyat · **Status:** OPEN
**Found:** 2026-09-04, from the **newly published schema** — not from a render, because nobody can render this dashboard yet

The **fifth** dashboard with this bug, after Org Admin (#85), Nurse (NURSE-1), Superadmin
([[FLAG-222]]) and Doctor ([[FLAG-227]]). **The count is now five of seven, not four of six** — and
DASH-6 is the one nobody has ever looked at.

🎯 **This was found without credentials, and that is the point.** Backend **#161** (merged 2026-09-03)
published response bodies for all seven dashboard/stats endpoints, closing the [[FLAG-225]] class.
`GET /api/v1/patients/me/dashboard/` now `$ref`s a complete `PatientDashboard` component:

```
required: active_episodes, active_instructions, active_prescriptions, completed_episodes,
          current_admission, last_visit_date, last_visit_organization, organizations_visited,
          total_episodes, unread_notifications
```

`PatientDashboard.tsx:70-73` reads:

| Tile | Component reads | Published? |
|---|---|---|
| **Upcoming Appts** | `upcoming_appointments` | ❌ **not in the component** |
| Active Episodes | `active_episodes` | ✅ |
| **Access Requests** | `pending_access_requests` | ❌ **not in the component** |
| Notifications | `unread_notifications` | ✅ |

**Nothing appointment-shaped or access-request-shaped is published on this endpoint at all** — the
two missing names have no near neighbour to be a rename of. Per the [[FLAG-222]] reasoning, do
**not** point them at a plausible-looking field: this is a screen a patient reads their own care
from, and an invisible wrong number is worse than a visible gap.

⚠️ **Two tiles will render `—`** the moment anyone signs in, because `StatCard` renders
`{value ?? '—'}`. `Notifications` is masked by `?? 0` in the component and would show `0` even if the
field vanished — worth noting as a second, quieter instance of the same class.

`src/types/dashboard.ts:72-77` declares the wrong interface:

```ts
export interface PatientDashboardData {
  upcoming_appointments: number;      // ❌ never sent
  active_episodes: number;            // ✅
  pending_access_requests: number;    // ❌ never sent
  unread_notifications?: number;      // ✅
}
```

**Seven published fields nothing renders:** `total_episodes`, `completed_episodes`,
`last_visit_date`, `last_visit_organization`, `current_admission`, `active_prescriptions`,
`organizations_visited`. 🎯 **`current_admission` and `active_prescriptions` are real clinical
information being thrown away** on the patient's own portal — and note `active_prescriptions` **does**
exist here, while [[FLAG-227]]'s doctor-side `active_prescriptions` does not. There is a
prescriptions concept; it is published on the patient endpoint and nowhere else.

⚠️ **Evidence standard — read this before acting.** This is **schema evidence, not a live capture**,
and `CLAUDE.md` is explicit that the schema is a lead and not a verdict. Three things make it strong
anyway: the component is newly generated from the view's own serializer, its `required` list is
complete rather than partial, and the two names are absent entirely rather than mistyped.
[[FLAG-554]] (backend) warns that six nested fields in this batch publish as `string` where the value
is an integer or object — **that is a wrong *type*, not a wrong *presence***, so it does not weaken
this finding. **Still: confirm against a live payload the first time a patient token exists.**

**Currently annotated, not fixed.** `roles.spec.ts` carries `knownStatBug: 'FLAG-231'` on the patient
entry, so when credentials land the suite stays honest instead of going red, and turns red when
someone fixes the source.

**Done when:**
- [ ] A live capture as a real patient confirms (or refutes) the two absences.
- [ ] `PatientDashboardData` is re-typed from that payload — **not from the fixture**, which is how
      this class survives a green unit suite ([[FLAG-221]]).
- [ ] The two tiles are repointed at real fields, or removed rather than shown blank. `total_episodes`
      is a plausible honest substitute for one of them; that is a **design call**, not a rename.
- [ ] `knownStatBug` deleted from the patient entry in `e2e/design/roles.spec.ts`, and that test passes.
