# Architecture — what is actually built

> **Scope:** this file describes the application **as it stands on `develop`**, not what is planned.
> If something here is aspirational, it is a bug in this file.
>
> **Rewritten 2026-08-30.** The previous version described the vanilla-JS application that was
> deleted in July 2026 (ARCH-7) — it survived the React rewrite untouched for eleven weeks while
> `CLAUDE.md` §4 pointed every new reader and every AI assistant at it. Historical documents now
> live in [`archive/`](archive/) and are labelled as such.

---

## 1. Shape of the thing

A **Next.js 15 App Router** application (React 19, TypeScript strict, Tailwind v4) deployed on
Vercel, talking to a **Django REST Framework** backend on Railway. One build serves exactly one
backend tier — see [`../README.md`](../README.md).

**Multi-tenancy is the core constraint.** Many organisations share one system and must never see
each other's data. That is why URLs carry an org slug, why there are three separate login endpoints,
and why the dashboard gates check the organisation as well as the role.

---

## 2. Routes

21 pages and 13 route handlers.

### Pages

| Route | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/signin` | **General portal — patients only.** Staff who try it get a 400 carrying `org_slug` + `redirect_url` and are redirected |
| `/set-password` | Invite setup, `?token=<uuid>` — validated before the form renders |
| `/forgot-password` · `/reset-password` · `/check-email` · `/password-success` | OTP reset flow (forgot → verify-otp → reset) |
| `/access-request/respond` | Cross-org consent. `GET ?token=` is read-only; POST performs the decision (`accept` / `deny`) |
| `/superadmin` | Superadmin dashboard — organisations, users, audit logs |
| `/superadmin/signin` | **Superadmin portal.** Distinct from `/signin`, which cannot log staff in |
| `/[slug]` | Org landing page, branded from `GET /org/by-slug/<slug>/` |
| `/[slug]/signin` | **Org portal** — staff *and* patients of that organisation |
| `/[slug]/doctor` · `nurse` · `receptionist` · `org-admin` | The four org-scoped staff dashboards |
| `/patient` | **The patient dashboard — slug-less on purpose (FLAG-210).** A patient belongs to no organisation (`/auth/me/` returns `organization: null`, correctly: records move *with* the patient), so there is no slug to scope them to. `patient` is in `RESERVED_PATHS` so no org can shadow it |
| `/[slug]/forgot-password` · `reset-password` · `check-email` · `password-success` | Org-scoped password flows |

⚠️ **`RESERVED_PATHS` (`src/lib/config.ts`) must stay in sync with `src/app/`.** `[slug]` is a
catch-all at the root, so any new top-level route that is not reserved can be shadowed by an
organisation slug.

### Route handlers — the only code that talks to the backend

| Handler | Purpose |
|---|---|
| `/api/data` | **All browser reads.** `?path=` → backend GET with the JWT attached server-side |
| `/api/action` | **All browser writes.** `{method, path, data}` → backend POST/PATCH/PUT/DELETE |
| `/api/auth/login` | Picks the right portal, sets the three cookies, enriches from `/auth/me/` |
| `/api/auth/refresh` | Single-flight session refresh; persists the **rotated** refresh token |
| `/api/auth/logout` | Clears cookies |
| `/api/auth/forgot-password` · `verify-otp` · `reset-password` | The three-step OTP reset |
| `/api/auth/setup-password` · `setup-password/resend` | Invite validation and re-request |
| `/api/access-request/respond` | Consent accept/deny |
| `/api/contact` · `/api/contact/[slug]` | Public contact forms |

---

## 3. Data access — one path, no exceptions

```
Client Component
  └─ useApi(path)  ·  usePaginatedList(path)  ·  useAllPages(path)  ·  apiAction(...)
       └─ dataGet() / dataAction()                       src/lib/client-api.ts
            └─ GET /api/data  ·  POST /api/action        same-origin route handlers
                 └─ Authorization: Bearer <httpOnly cookie>
                      └─ DRF, at NEXT_PUBLIC_API_URL

Server Component
  └─ serverFetchResult(path) / serverFetch(path)         src/lib/server-fetch.ts
       └─ same httpOnly cookie, read via next/headers
            └─ DRF
```

**The browser never holds a token and never calls the backend.** `connect-src 'self'` in the CSP
enforces the second half at the browser, and it deliberately names no backend origin — the proxy is
same-origin, and the config is shared across three tiers that hit three different API hosts.

**Hooks (`src/hooks/use-api.ts`):**

| Hook | Use it for |
|---|---|
| `useApi<T>(path \| null)` | A single fetch. `null` skips it — that is how conditional fetches are expressed |
| `usePaginatedList<T>(path, size?)` | DRF `{count, next, previous, results}` with page state |
| `useAllPages<T>(path)` | When a partial list would be *wrong*, not just short — e.g. a ward bed board |
| `apiAction(path, method, body)` | Writes |

**Why `useAllPages` exists:** the ward board used `useApi().results` and silently capped at 20 beds.
A nurse reading a partial bed list has no way to tell it is partial, and concluding a bed is not
there has clinical consequence. It cannot follow DRF's `next` (an absolute backend URL the browser
may not call), so it derives the page count from `count` plus the size of page one.

**Error handling.** `serverFetchResult()` returns a discriminated result — `no_token`,
`unauthorized`, `forbidden`, `not_found`, `server`, `network`, `malformed` — and logs the status and
path only, **never the body** (bodies carry patient data). `serverFetch()` is the back-compatible
wrapper returning `T | null`; prefer the result form in new code so a caller can render an error
state instead of an empty one.

---

## 4. Auth and session

**Three cookies, set by `/api/auth/login`** (`src/lib/auth.ts`):

| Cookie | httpOnly | Lifetime | Purpose |
|---|---|---|---|
| `hc_access_token` | ✅ | 1 hour | Bearer token, attached server-side |
| `hc_refresh_token` | ✅ | 7 days | Session continuity |
| `hc_user` | ❌ | 7 days | **Display only** — a name and role for the UI |

🔴 **`hc_user` is client-writable and must never decide access.** It is `httpOnly: false` so the UI
can show a name, which means the user can edit it.

**Refresh is single-flight and the rotation is load-bearing.** SimpleJWT rotates *and blacklists*
refresh tokens: the new one must be persisted, and two refreshes in flight at once cost the session.
`client-api.ts` guards the client path with one in-flight promise; `middleware.ts` performs the same
exchange for server-rendered navigations, and both go through `lib/session-refresh.ts` so there is
one implementation. The residual multi-tab race is logged as FLAG-020.

**`src/middleware.ts`** gates every non-API route:

1. Dashboard route with no session at all → redirect to **that portal's own** signin (a superadmin
   sent to `/signin` lands on the patients-only portal, which cannot log them in).
2. Dashboard route with a live refresh cookie but an expired access cookie → **resume the session**:
   refresh, hand the new token to this request's render, and persist the rotated pair. A rejected
   token clears the cookies; an unreachable backend does not.
3. Already signed in and on a signin page → forward to the right dashboard.

---

## 5. Authorization

Two layers, and only one of them is trusted:

- **The backend.** Every request carries the bearer token and DRF enforces permissions server-side.
  This is the real boundary.
- **The UI gate**, which decides what to render. Historically it read `hc_user` — the client-writable
  cookie — which is FLAG-001.

✅ **Closed 2026-09-03 (PRs #99 + #100).** Every dashboard gate now calls `requireDashboardUser()`
(`src/lib/auth-server.ts`), which resolves identity from `GET /auth/me/` using the **httpOnly** access
token and checks **role *and* organisation** — a real doctor at one org could previously open another
org's dashboard shell by typing the URL, which needed no cookie tampering at all. `hc_user` no longer
decides access anywhere in the app; `getUser()` remains for display only and says so in its doc
comment.

The gate **fails closed**: `serverFetch` returns `null` for a missing token, a 401, a 500 or a network
blip alike, and every one of those is read as DENY. That is the correct trade for an authorization
decision, and it means FLAG-005's observability now has a UX consequence — a backend wobble bounces
users to signin rather than rendering a shell.

Because the gate needs a live access token *during* the server render, and the access cookie lives one
hour while the refresh cookie lives seven days, **`middleware.ts` now resumes an aged-out session
itself** (`lib/session-refresh.ts`) and hands the new token to that same render via a mutated request
cookie. A Server Component cannot set cookies, so the gate could not repair this alone. Residual race:
[FLAG-020](../CODEBASE_FLAGS.md).

Patients reach `/patient` with no slug (#100) and can sign in for the first time.
---

## 6. UI composition

```
DashboardShell            sidebar + header + content, and the small-screen gate
├── Sidebar               role's nav items
├── DashboardHeader       user menu, notifications, duty toggle
└── {children}            the role's pages
```

Shared primitives in `src/components/ui/`: `DataTable`, `StatCard`, `Modal`, `SlidePanel`,
`Toaster`, `EmptyState`, `ErrorState`, `Pagination`, `SearchInput`, `Avatar`, `StatusBadge`,
`Shimmer`, `ConfirmDialog`, `FormField`, `Button`.

**`SmallScreenGate` is a PHI control, not a layout preference.** Staff dashboards (DASH-1…5) must
not render below 768px. It was `hidden md:flex` — pure CSS, so the dashboard still mounted, still
fetched, and the records still landed in the phone's DOM. `display: none` hides pixels, not data.
The gate now decides in **JS** whether the subtree mounts, and fails closed until a viewport has
been measured. The patient dashboard (DASH-6) is the one responsive dashboard and must **not** use
it. See FLAG-203 and FLAG-021 for what remains: server-rendered props still reach a narrow device.

---

## 7. Security posture

Headers are set for every route in `next.config.ts`: `Strict-Transport-Security` (2 years,
`includeSubDomains`, `preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera, microphone
and geolocation, and a CSP with `frame-ancestors 'none'` and `connect-src 'self'`.

⚠️ **`script-src` still carries `unsafe-inline` and `unsafe-eval`** on pages that render PHI
(FLAG-019). The rest of the policy is deliberate and good; that one directive is the open item.

Cookies are **host-only** — no `Domain=` attribute, ever — so a dev session cookie cannot be sent to
beta or production. Full posture and what is accepted in writing: [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md).

---

## 8. Testing

| Layer | Where |
|---|---|
| Unit + component (Vitest, jsdom) | `src/**/*.test.ts(x)` — **211 tests / 23 files** |
| Browser (Playwright) | `e2e/`, including the design-fidelity harness in `e2e/design/` |

**T5 design harness coverage** (`e2e/design/`) — it signs in for real against `api-dev`, so a role is
covered only where credentials exist:

| Dashboard | Rendered | Note |
|---|---|---|
| DASH-1 Superadmin | ✅ | own spec (bespoke audit-log masking) |
| DASH-2 Org Admin · DASH-4 Receptionist · DASH-5 Doctor | ✅ 2026-08-31 | `roles.spec.ts` |
| DASH-3 Nurse | ✅ **2026-09-04** | first render; stats contract **clean** |
| DASH-6 Patient | ⏸️ **never rendered** | wired and skipping — no `E2E_PATIENT_*` credentials. 🔴 **Known-bad without being seen**: two of four stat tiles read fields the published `PatientDashboard` schema does not carry (**FLAG-231**) |

⚠️ The harness captures each page's **landing state only** — every form, modal and row action is
unrendered (FLAG-229).

**The convention that matters: a test must fail against the pre-fix code.** A test written after a
fix, that would have passed before it, proves nothing. Two bug classes in this repo were invisible to
a green suite because the fixtures asserted our own assumptions rather than captured payloads — see
FLAG-221 and FLAG-222.

⚠️ **Corrected 2026-09-04 — this paragraph used to read "There is **no CI** (FLAG-006)". That has
been false since #116 merged on 1 Sep**, and the correction matters in both directions:

- **CI exists and runs.** `.github/workflows/ci.yml` runs three jobs on every PR — `verify` (tsc,
  the suite, the build), `lint` at `--max-warnings=0`, and `tier-guard` (the A4 fail-loud check).
  FLAG-006 is closed.
- **CI still gates nothing.** Ruleset 11328360 carries **no required status checks**, so a red run
  does not block a merge. A green tick therefore implies a gate that is not wired up. Making the
  three jobs required is a repo-settings change only @Bastoh can make.

So the honest statement is: every check is *also* a developer running three commands locally and
choosing to report them honestly.

---

## 9. Known structural gaps

Tracked in [`../CODEBASE_FLAGS.md`](../CODEBASE_FLAGS.md); the ones that shape the architecture:

| Flag | Gap |
|---|---|
| ~~FLAG-001~~ | ✅ **Resolved 2026-09-03 (#99)** — authorization is decided on the server from `/auth/me/`, role **and** tenant |
| ~~FLAG-210~~ | ✅ **Resolved 2026-09-03 (#100)** — patients have a slug-less `/patient` portal and can sign in |
| ~~FLAG-006~~ | ✅ **Resolved 2026-09-01 (#116)** — ESLint flat config + GitHub Actions CI, gating at zero findings |
| FLAG-019 | CSP allows `unsafe-inline` / `unsafe-eval` on PHI pages |
| FLAG-203 / FLAG-021 | Small-screen gate: client channel closed, server-rendered props still reach a phone |
| FLAG-225 | ~2 in 5 GET endpoints document no response body, so most types are captured, not derived |

The offline-first data layer is **deferred** to the staging phase. `src/lib/client-api.ts` is the
intended swap point — which is the reason components must never call `fetch()` directly.
