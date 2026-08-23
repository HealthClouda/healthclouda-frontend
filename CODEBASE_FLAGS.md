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

### FLAG-210 — A patient cannot sign in: they have no organization, but every patient route needs one
**Severity:** P1 · **Area:** Auth / Routing / Multi-tenancy · **Owner:** @Bastoh · **Status:** OPEN —
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

*(none yet — move entries here with their PR number and resolution date)*

---

*Last updated 2026-08-19. Flags 001–009 raised from the 2026-08-08 codebase survey. FLAG-200 raised
2026-08-10 (Qeeyat's first session). FLAG-010 and FLAG-011 raised 2026-08-12; FLAG-002 partially
fixed by PR #65. FLAG-201/202/203/204 raised 2026-08-13, reviewing PR #69. FLAG-012 raised 2026-08-13
reviewing PR #73. FLAG-205/206 raised 2026-08-14/15, building D1 Superadmin pages (PR #76, merged
2026-08-17) — **FLAG-205 is partly disproven, see the correction in its entry**. FLAG-207/208/209
raised 2026-08-17, building D2 Org Admin (PR #78, merged 2026-08-19) — FLAG-207 fixed same PR.
**FLAG-013/014/015 raised 2026-08-17 reviewing PRs #76/#77/#78 — numbered in @Bastoh's range, owned
by @Qeeyat** (see the note under the range table). FLAG-013 and FLAG-014 were **swapped on
2026-08-19** so that `page_size` is 013, matching three in-code comments already merged on `develop`
— see the numbering note on FLAG-013.*

> ⚠️ **FLAG-011 is still OPEN — do not read `HANDOFF.md` as saying otherwise.** Its "Cleared on
> merge" line reads *"FLAG-011 token contrast — PR #68"*, which looks like a fix. PR #68 was
> **docs-only**: it *logged* this flag. The failing token values are unchanged and still live.
> FLAG-014 and FLAG-015 are the same underlying problem at other call sites — fix the tokens once,
> across all three, and re-measure.
