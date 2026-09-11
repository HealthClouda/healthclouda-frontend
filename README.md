# HealthClouda — Frontend

Next.js 15 (App Router) frontend for **HealthClouda**, an API-first, multi-tenant EHR/EMR platform
for Nigerian healthcare organisations. Hospitals and clinics store patient records with us, and
those records move with the patient between facilities.

> ⚠️ **This application handles real patient data (PHI).** Before you write code here, read
> **[`CLAUDE.md`](CLAUDE.md)** — it is the operating manual for humans and AI assistants alike — and
> **[`ONBOARDING.md`](ONBOARDING.md)** if you are new. The rules in §5 of `CLAUDE.md` are not style
> preferences; several of them exist because something broke without them.

---

## The three rules that matter most

If you remember nothing else from this file:

1. **The browser never calls the backend directly.** All browser traffic goes through our own proxy
   routes — `/api/data` for reads, `/api/action` for writes — which attach the JWT server-side.
   Never `fetch()` the backend from a component; use `useApi()` / `dataGet()` / `dataAction()`.
2. **JWTs live in httpOnly cookies.** Never move a token anywhere JavaScript can read it — no
   `localStorage`, no `sessionStorage`, no non-httpOnly cookie. The browser cannot read the token,
   which is the entire point.
3. **The live `/api/v1/schema/` is the single source of truth for the API** — not this file, not a
   committed doc, not what a component currently assumes. It needs **no authentication**, so a
   contract question is never blocked on credentials. If an endpoint or field is missing, open a
   GitHub issue on the backend repo tagged `api-request`. Never guess, never silently work around it.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 15** (App Router) · **React 19** · TypeScript (strict) |
| Styling | **Tailwind CSS v4** (via `@tailwindcss/postcss`) |
| Forms | `react-hook-form` + `zod` (`@hookform/resolvers`) |
| Client state | `zustand` |
| Unit tests | **Vitest** + Testing Library (jsdom) |
| Browser tests | **Playwright** (`e2e/`) |
| Hosting | **Vercel** (this repo) · **Railway** (the Django/DRF backend) |

The backend lives in a separate repo, `healthclouda-backend` (Django REST Framework).

---

## Getting started

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/HealthClouda/healthclouda-frontend.git
cd healthclouda-frontend
npm install
cp .env.example .env.local     # then edit — see below
npm run dev                    # http://localhost:3000
```

### Environment

`.env.example` is the documentation for this — read it, it explains the reasoning, not just the
names.

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL **including** the `/api/v1` suffix |
| `NEXT_PUBLIC_SITE_URL` | This deployment's own public origin (metadata, canonical URLs) |

🔴 **One build serves exactly one backend tier.** `NEXT_PUBLIC_API_URL` is baked in at build time,
so a deployment cannot be re-pointed without rebuilding. There is **no fallback outside local
development** — if it is unset, the build fails deliberately (`src/lib/config.ts`), because a
deployed build silently pointing at localhost presents as "the backend is down".

🔴 **Do not set a cookie domain.** There is deliberately no `COOKIE_DOMAIN` variable: a dot-prefixed
parent (`.healthclouda.com`) would share session cookies across every subdomain, so a dev session
cookie would be sent to beta and to production.

### Tiers

| Git branch | Frontend | Backend API |
|---|---|---|
| `main` | healthclouda.com + www | *(unset — marketing only for now)* |
| `staging` | beta.healthclouda.com | `https://api-beta.healthclouda.com/api/v1` |
| `develop` | dev.healthclouda.com | `https://api-dev.healthclouda.com/api/v1` |

---

## Verify before every PR

Non-negotiable, and there is **no CI** — these are honour-system and local (FLAG-006):

```bash
npx tsc --noEmit    # must be clean
npm test            # must be green
npm run build       # must be green
```

`npm run build` needs `NEXT_PUBLIC_API_URL` set, by design. Report failures honestly, with output.

Other scripts: `npm run test:watch`, `npm run test:e2e` (Playwright), `npm run test:e2e:ui`,
`npm run lint`.

---

## How a request actually flows

```
component
  └─ useApi() / dataGet() / dataAction()        src/hooks/use-api.ts, src/lib/client-api.ts
       └─ /api/data  ·  /api/action             our own route handlers (same origin)
            └─ attach JWT from httpOnly cookie  src/lib/auth.ts
                 └─ DRF backend                 NEXT_PUBLIC_API_URL
```

Server Components fetch through `serverFetch()` / `serverFetchResult()` (`src/lib/server-fetch.ts`),
which reads the same httpOnly cookie. On a 401 the client layer refreshes **once**, single-flight,
and retries — SimpleJWT rotates *and blacklists* refresh tokens, so concurrent refreshes log the
user out. That single-flight is load-bearing; don't "simplify" it.

**Two more conventions with teeth:**

- Every backend path lives in `ENDPOINTS` (`src/lib/config.ts`). Never hardcode one in a component.
- Every app URL is built via `src/lib/router.ts`. Never hand-write a path. `RESERVED_PATHS` in
  `config.ts` must stay in sync with `src/app/`, or an org slug will shadow a real route.

**DRF shapes:** list endpoints return `{count, next, previous, results}`, not bare arrays — use
`usePaginatedList()`. Pagination params are `?page=` and `?page_size=`; `?limit=` is silently
ignored. **Invented query params are a recurring bug class here** — DRF ignores an unknown filter
silently and the UI shows wrong data with no error, so verify against the live schema first.

---

## Login portals — three, and they are not interchangeable

| Portal | Endpoint | Who |
|---|---|---|
| General | `POST /auth/login/` | Patients only |
| Org | `POST /auth/login/<org_slug>/` | Staff **and** patients |
| Superadmin | `POST /auth/login/admin/` | Superadmin only |

Staff who try the general portal get a **400 carrying `org_slug` + `redirect_url`** — we use it to
redirect them to their org portal automatically.

**Roles:** `SUPERADMIN`, `ORGANIZATION_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `PATIENT`.

---

## Layout

```
src/
├── app/                  routes (App Router)
│   ├── [slug]/           org-scoped: signin, five staff dashboards, password flows
│   ├── api/              our proxy + auth route handlers — the ONLY caller of the backend
│   ├── superadmin/       superadmin portal (no org slug)
│   └── …                 landing, signin, set-password, access-request/respond
├── components/
│   ├── dashboard/        one folder per role
│   ├── layout/           DashboardShell, Sidebar, DashboardHeader, SmallScreenGate
│   ├── ui/               shared primitives (DataTable, Modal, SlidePanel, Toaster, …)
│   ├── forms/            auth + password-flow forms
│   ├── landing/          marketing page sections
│   └── access/           cross-org consent respond screens
├── hooks/                useApi, useAllPages, usePaginatedList, apiAction
├── lib/                  config (ENDPOINTS, ROLES), router, auth, client-api, server-fetch, utils
├── types/                auth.ts, dashboard.ts
└── middleware.ts         route gating + server-side session resume
```

`design_handoff_*/` hold the design sources the dashboards and pre-login screens are built from;
they are referenced from the components and stay where they are.

---

## Branches

`develop` → demo-functional (shortcuts allowed **only if logged** in
[`CODEBASE_FLAGS.md`](CODEBASE_FLAGS.md)) · `staging` → production-grade · `main` → production.

Cut `feat/*` / `fix/*` from an up-to-date `develop`, **rebase** onto it (never merge it in), and open
a PR back into `develop`. `main`, `staging` and `develop` are protected by a GitHub ruleset: a PR is
required, **one approving review** is required, and force-pushes and deletion are blocked, with no
bypass for anyone. Assign the reviewer when you open the PR — it is always the other developer.

---

## Where the real documentation lives

| File | What it is |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **The operating manual.** Binding on humans and AI assistants |
| [`ONBOARDING.md`](ONBOARDING.md) | Read this first if you are new — glossary, setup, conventions |
| [`HANDOFF.md`](HANDOFF.md) | Durable shared state: In Flight claims, backend contract notes, gates |
| `HANDOFF-<Name>.md` | Per-developer session logs. **Never edit someone else's** |
| [`CODEBASE_FLAGS.md`](CODEBASE_FLAGS.md) | Known issues and logged shortcuts |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | What is actually built |
| [`docs/SECURITY_BASELINE.md`](docs/SECURITY_BASELINE.md) | The PHI security baseline |
| [`docs/FRONTEND_SPRINT_PLAN.md`](docs/FRONTEND_SPRINT_PLAN.md) | The dated plan to beta onboarding |
| [`docs/DESIGN-VERIFICATION.md`](docs/DESIGN-VERIFICATION.md) | How to verify a screen against its design |
| [`docs/archive/`](docs/archive/) | Historical documents, kept for context, not current |

---

## Support

Questions go to the team, early — thirty minutes stuck, not two hours. This is a multi-tenant
medical records system; nobody reads it once and gets it.
