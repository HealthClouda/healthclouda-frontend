# HealthClouda Frontend — Technical Review & Next.js Migration Plan

> ⚠️ **HISTORICAL — completed, kept for context. Do not act on this document.**
>
> This is the plan for the vanilla-JS → Next.js migration, written 2026-06-11. **The migration
> shipped** (PRs #45/#46) and the `public/*.html` files it schedules for deletion are already gone.
> It is preserved because the reasoning — why React, why a rewrite rather than incremental
> hardening, what was deliberately not carried over — still explains decisions visible in today's
> code. Archived 2026-08-30 (FLAG-009).
>
> For what actually exists now, read [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

> Created: 2026-06-11 | Author: Claude (session review)
> Update this file if architectural decisions change during migration.

---

## Table of Contents

1. [Project Audit](#1-project-audit)
2. [Tech Stack Analysis](#2-tech-stack-analysis)
3. [Migration Decision: Vanilla JS → Next.js](#3-migration-decision-vanilla-js--nextjs)
4. [Full Migration Guide](#4-full-migration-guide)
5. [Implementation Plan & Timeline](#5-implementation-plan--timeline)
6. [Final Recommendation](#6-final-recommendation)

---

## 1. Project Audit

### What the project is

A **Multi-Page Application (MPA)** serving a multi-tenant EHR/EMR platform. Six role-based dashboards (Doctor, Nurse, Receptionist, Patient, Org Admin, Superadmin), three separate auth portals, and an org-branded landing page per tenant — all routing through Vercel rewrites to static HTML files.

### Current measurements

| Area | Count |
|---|---|
| JavaScript | ~8,500 lines across 11 files |
| CSS | ~1,680 lines |
| HTML shells | 22 files |
| Role dashboards | 6 (largest: Superadmin @ 1,534 lines) |
| Tests | **0** |
| Build steps | **0** (pure static) |
| npm dependencies | **0** |

### Strengths

- **Solid API layer.** `api.js` is well-designed: single entry point, auto-refresh on 401, concurrency guard (`_refreshPromise`), and `hc_formatApiError()` that handles DRF error shapes. This is the best-engineered part of the codebase.
- **Routing is correct.** `HC_ROUTER` as the single source of truth for URL construction is the right pattern — it just needs to be ported, not redesigned.
- **Config is centralised.** `HC_CONFIG.ENDPOINTS` prevents endpoint strings from scattering everywhere (mostly).
- **Auth flows are complete.** All three portals, OTP reset, invite setup, rate limiting, and role-based redirects are all implemented.
- **Fast to ship.** No build step = zero friction for hotfixes.

### Weaknesses and issues

**Architecture-level:**

1. **No module system.** Every file pollutes the global scope. `HC_CONFIG`, `HC_ROUTER`, `hc_requireAuth`, `apiGet`, `showToast` — all globals. A naming collision will silently break things.
2. **Massive file sizes with no separation of concerns.** `auth.js` is 851 lines handling 8 different forms. Each dashboard JS file is 700–1,534 lines mixing API calls, DOM updates, state, and business logic in the same functions.
3. **Duplication at scale.** `escapeHtml()`, `formatDate()`, `statusBadge()`, `showToast()`, shimmer helpers — all repeated verbatim in every dashboard file. 6× copies of the same ~200-line helper block.
4. **No state machine.** Page state is tracked with ad-hoc `let`/`const` flags (`_loaded`, `_currentEpisodeTab`, `_episodeDetailId`). These become inconsistent under rapid navigation.
5. **Memory leaks.** Every dashboard sets `setInterval` for polling (30s–60s). No `clearInterval` on navigation. Same for event listeners.

**Security:**
- Access/refresh tokens in `localStorage` (XSS-vulnerable — noted in `ARCHITECTURE.md` but not yet resolved).
- No CSRF tokens on forms.
- `publicApiRequest()` accepts arbitrary HTTP URLs (potential open redirect).
- Rate limiting is in-memory — a refresh bypasses it.

**Performance:**
- Every dashboard loads its entire JS file (~1,000+ lines) synchronously before rendering. No lazy loading of sections.
- No minification, no tree-shaking, no caching headers for JS (only a URL-busting trick on CSS).
- Session timeout runs `setInterval` every 60s on every authenticated page simultaneously.

**Operability:**
- Zero tests. No way to verify a backend API change didn't break a form without manually testing every flow.
- Env detection based on `window.location.hostname` string matching — fragile if a domain changes or a new preview URL is added.

---

## 2. Tech Stack Analysis

### Current stack

| Layer | Technology | Assessment |
|---|---|---|
| Language | Vanilla JS (ES6+) | Works, but hitting limits |
| Markup | Plain HTML | Fine for static, not scalable for components |
| Styling | Custom CSS (~1,700 lines) | Good foundation, but no design system |
| Routing | Vercel rewrites | Correct approach, needs no changes in isolation |
| Auth | Custom JWT + localStorage | Functional, security debt |
| API | Custom `fetch()` wrapper | Good design, needs TypeScript + React Query |
| Build | None | Zero friction now, ceiling for scale |
| Testing | None | Critical gap |
| Type safety | None | Large risk surface |

### Is the current stack suitable for scaling?

**No — not beyond the current scope.** Here is exactly why:

- Adding a 7th dashboard role means duplicating ~200 lines of helpers again.
- Fixing a bug in `showToast()` requires changing it in 6 files.
- A new developer joining the team has no IDE autocomplete, no type errors, and no tests to tell them if they broke something.
- The org-slug multi-tenant pattern works today but becomes a maintenance problem as the number of tenants grows and each wants slightly different branding behavior.
- No component reuse means any UI consistency change (a new button style, a redesigned modal) requires touching 22 HTML files.

The codebase has good ideas embedded in poor structure. The API layer, router pattern, and config centralisation are all worth keeping — just in a better form.

---

## 3. Migration Decision: Vanilla JS → Next.js

### Verdict: Yes — migrate. The case is strong.

**Why Next.js fits this project better than plain React:**

1. **Dynamic routes map perfectly.** The `/:slug/doctor/` URL scheme maps directly to Next.js `app/[slug]/doctor/page.tsx`. This is solved architecture, not custom code.
2. **Middleware for auth guards.** Instead of an IIFE auth guard at the top of every JS file, one `middleware.ts` file handles auth for all protected routes. Single point of change.
3. **API routes for sensitive operations.** The token refresh logic, session management, and any server-only logic can live in `/app/api/` routes — never exposed to the browser. This is where you move tokens to `httpOnly` cookies.
4. **Server Components for initial data.** Dashboard stats can be fetched server-side on first load, eliminating the shimmer delay users see today on every page.
5. **Already on Vercel.** Next.js and Vercel are the same product family — zero deployment friction, edge middleware, automatic preview URLs per PR.

**Why not plain React (Vite SPA)?**

- You lose server-side rendering (important for org-branded pages and SEO on the landing page).
- You'd have to build your own routing for the `[slug]` pattern (React Router does this but adds complexity).
- You'd lose the middleware auth guard capability.
- You'd still be deploying to Vercel anyway, which is optimised for Next.js.

**Risks and honest challenges:**

| Risk | Severity | Mitigation |
|---|---|---|
| Zero test coverage to catch regressions | High | Write integration tests before each migrated flow ships |
| Team learning curve (React + Next.js) | Medium | Start with the simplest portal (Superadmin — single-tenant) |
| Auth migration (localStorage → httpOnly cookies) | Medium | Migrate auth first, independently, before touching dashboards |
| Multi-tenant slug routing edge cases | Medium | Port `HC_ROUTER` logic and test every reserved-path case |
| Org branding API fallback logic | Low | Direct port — same fetch logic, now in a Server Component |
| Two backends hit (`/api/v1/` + future Next.js API routes) | Low | Keep DRF as the data layer; Next.js API routes only for auth |

---

## 4. Full Migration Guide

### Repository strategy: convert the existing repo, do not create a new one

Reasons:
- Git history (blame, log, bisect) is valuable — do not throw it away.
- The `rewrite/react` branch strategy is already documented in `HANDOFF.md`. Follow it.
- The existing `develop` → `staging` → `main` pipeline stays intact.

**Do not** try to merge React code into `develop` mid-migration. `rewrite/react` is isolated until feature-complete.

---

### Phase 0 — Preparation

Before writing a single React component:

**1. Cut the branch.**
```bash
git checkout develop
git checkout -b rewrite/react
```

**2. Initialise Next.js in the repo root** (not inside `public/`).
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
Answer: use `src/` directory, App Router, TypeScript, Tailwind, ESLint.

**3. Keep `public/` temporarily.** Move the Next.js `public/` to `public-next/` to avoid collision with the existing static site during transition. Once migration is complete, rename.

**4. Port `config.js` → `src/lib/config.ts` first.** This is the foundation everything else depends on.
```typescript
// src/lib/config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    LOGIN_ORG: (slug: string) => `/auth/login/${slug}/`,
    LOGIN_ADMIN: '/auth/login/admin/',
    REFRESH: '/auth/refresh/',
    LOGOUT: '/auth/logout/',
    SETUP_PASSWORD: '/auth/setup-password/',
    VALIDATE_SETUP_TOKEN: '/auth/setup-password/validate/',
    FORGOT_PASSWORD: '/auth/forgot-password/',
    VERIFY_OTP: '/auth/verify-otp/',
    RESET_PASSWORD: '/auth/reset-password/',
  },
  DOCTOR: { DASHBOARD: '/doctor/dashboard/stats/', /* ... */ },
  NURSE: { DASHBOARD: '/nurse/dashboard/stats/', /* ... */ },
  // etc.
} as const;

export const ROLES = {
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  RECEPTIONIST: 'RECEPTIONIST',
  PATIENT: 'PATIENT',
  ORG_ADMIN: 'ORG_ADMIN',
  SUPERADMIN: 'SUPERADMIN',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
```

**5. Set up `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
Vercel environment variables replace the `window.location.hostname` detection entirely.

---

### Phase 1 — Auth system

This is the highest-value migration because it fixes the security debt and unblocks everything else.

**New file structure:**
```
src/
├── app/
│   ├── signin/page.tsx                    # General portal (patients)
│   ├── superadmin/signin/page.tsx         # Superadmin portal
│   ├── [slug]/signin/page.tsx             # Org portal
│   ├── forgot-password/page.tsx
│   ├── check-email/page.tsx
│   ├── reset-password/page.tsx
│   ├── password-success/page.tsx
│   ├── set-password/page.tsx
│   └── api/
│       ├── auth/login/route.ts            # Proxy to DRF, sets httpOnly cookie
│       ├── auth/refresh/route.ts          # Handles token refresh server-side
│       └── auth/logout/route.ts           # Clears cookies
├── middleware.ts                           # Auth guard for all protected routes
└── lib/
    ├── auth.ts                             # Token helpers (server-safe)
    └── api.ts                              # Fetch wrapper (replaces api.js)
```

**Key implementation decisions:**

- **Tokens move to `httpOnly` cookies** via Next.js API routes. The browser never sees the token directly. `api/auth/login/route.ts` calls DRF, gets the JWT, and `Set-Cookie`s it from the server.

- **`middleware.ts` replaces every auth guard IIFE.** One file, runs on the edge before any page renders.
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('hc_access_token');
  const protectedPattern = /^\/(doctor|nurse|patient|receptionist|org-admin|superadmin)/;
  const isProtected = protectedPattern.test(request.nextUrl.pathname);

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets).*)'],
};
```

- **React Hook Form + Zod** for all auth forms. One schema per form, validation runs client-side before any API call.
- **Rate limiting** moves to the Next.js API route (or DRF) — not in-memory in the browser.

---

### Phase 2 — Shared component library

Before migrating dashboards, build the components that all 6 dashboards share. This kills the current duplication problem.

```
src/components/
├── ui/
│   ├── Toast.tsx
│   ├── Modal.tsx
│   ├── SlidePanel.tsx
│   ├── StatusBadge.tsx
│   ├── Shimmer.tsx
│   └── ConfirmDialog.tsx
├── layout/
│   ├── Sidebar.tsx
│   ├── DashboardHeader.tsx
│   └── DashboardShell.tsx
└── forms/
    ├── PasswordStrengthMeter.tsx
    └── OtpInput.tsx
```

Use **Shadcn/ui** as the component foundation — accessible, unstyled primitives styleable with Tailwind. Much easier than building from scratch, and it matches the existing custom CSS patterns.

---

### Phase 3 — Dashboard migration, one role at a time

**Migration order (easiest → hardest):**

| Order | Role | Reason |
|---|---|---|
| 1 | Superadmin | Single-tenant, no `[slug]` complexity, clear CRUD |
| 2 | Org Admin | Introduces slug routing, tests multi-tenant patterns |
| 3 | Receptionist | Medium complexity; flag 2 missing backend endpoints |
| 4 | Nurse | Straightforward, similar to Receptionist |
| 5 | Doctor | Most complex (episodes, prescriptions, referrals, tabs) |
| 6 | Patient | `USE_DEMO` fallback, access requests, strict auth |

**Per-dashboard file structure:**
```
src/app/[slug]/doctor/
├── page.tsx                    # Shell — auth check, layout, renders child pages
├── _components/
│   ├── DoctorDashboardStats.tsx
│   ├── EpisodesPage.tsx
│   ├── PrescriptionsPage.tsx
│   ├── ReferralsPage.tsx
│   └── AppointmentsPage.tsx
└── _hooks/
    ├── useDoctorDashboard.ts   # SWR hook for dashboard stats
    ├── useEpisodes.ts
    └── usePrescriptions.ts
```

Each "page" within a dashboard becomes a React component with its own data fetching hook (SWR). The `_loaded` Set pattern is replaced by SWR's `revalidateOnMount` and stale-while-revalidate caching.

**State management:**
- **Zustand** for shared state (current user, notifications, active page).
- **SWR** for all server state (API data).
- Do not use Redux — overkill for this data model.

---

### Phase 4 — Org portal and landing page

```
src/app/
├── page.tsx                    # Landing page (replaces index.html)
└── [slug]/
    ├── page.tsx                # Org landing page — Server Component
    └── signin/page.tsx         # Already done in Phase 1
```

The org landing page is a **Server Component** — it fetches org branding data server-side (`/org/by-slug/{slug}/`) before sending HTML. No loading state, no flash of unstyled content, no fallback needed. This is one of the biggest UX wins of the migration.

---

### Phase 5 — Cleanup and hardening

- Delete the `public/` static files (old Vanilla JS).
- Update `vercel.json` — most rewrites are now handled by Next.js file routing; only edge cases remain.
- Add **Vitest + React Testing Library** for component tests.
- Add **Playwright** for 3–4 critical E2E flows: signin, password reset, creating a patient, toggling duty.
- Implement **Content Security Policy** headers in `next.config.ts`.
- Set up `NEXT_PUBLIC_*` env vars in Vercel dashboard for Production, Staging, and Dev environments.

---

### Recommended Next.js project structure

```
healthclouda-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout (fonts, providers)
│   │   ├── page.tsx                        # Landing page
│   │   ├── signin/page.tsx                 # General portal
│   │   ├── forgot-password/page.tsx
│   │   ├── check-email/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── password-success/page.tsx
│   │   ├── set-password/page.tsx
│   │   ├── superadmin/
│   │   │   ├── signin/page.tsx
│   │   │   └── page.tsx
│   │   ├── [slug]/
│   │   │   ├── page.tsx                    # Org landing (Server Component)
│   │   │   ├── signin/page.tsx
│   │   │   ├── doctor/page.tsx
│   │   │   ├── nurse/page.tsx
│   │   │   ├── receptionist/page.tsx
│   │   │   ├── patient/page.tsx
│   │   │   └── org-admin/page.tsx
│   │   └── api/
│   │       ├── auth/login/route.ts
│   │       ├── auth/refresh/route.ts
│   │       └── auth/logout/route.ts
│   ├── components/
│   │   ├── ui/                             # Shadcn/ui + custom primitives
│   │   ├── layout/                         # Sidebar, DashboardShell, Header
│   │   └── forms/                          # PasswordStrengthMeter, OtpInput
│   ├── hooks/                              # Shared SWR hooks
│   ├── lib/
│   │   ├── config.ts                       # Ported from config.js
│   │   ├── api.ts                          # Ported from api.js
│   │   └── router.ts                       # Ported from router.js
│   ├── store/                              # Zustand stores
│   │   ├── auth.ts
│   │   └── notifications.ts
│   ├── types/                              # Shared TypeScript types
│   │   ├── auth.ts
│   │   ├── patient.ts
│   │   ├── doctor.ts
│   │   └── api.ts
│   └── middleware.ts
├── public/                                 # Static assets only (images, robots.txt)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                             # Minimal — only edge cases
```

---

## 5. Implementation Plan & Timeline

> Assumptions: 1–2 developers, part-time alongside other work. Adjust multiplier if full-time.

### Phase timeline

| Phase | Scope | Estimated Duration | Output |
|---|---|---|---|
| **0 — Setup** | Branch, Next.js init, config port, env vars | 2–3 days | Blank Next.js app running on `rewrite/react` |
| **1 — Auth** | All signin pages, password flows, middleware, httpOnly cookies | 2–3 weeks | Secure auth system replacing auth.js entirely |
| **2 — Components** | Shared UI library (Toast, Modal, Sidebar, StatusBadge, etc.) | 1–2 weeks | Reusable component kit |
| **3 — Dashboards** | All 6 role dashboards, one at a time | 4–8 weeks | Full dashboard parity |
| **4 — Org + Landing** | Landing page, org-branded portal (SSR) | 1–2 weeks | Better performance, no flash |
| **5 — Hardening** | Tests, CSP, env config, old code deletion | 1 week | Production-ready |
| **Total** | | **9–16 weeks** | |

### Effort breakdown

| Task | Effort | Notes |
|---|---|---|
| Phase 0 setup | Low | Template init, mostly config |
| Auth migration | High | Security-sensitive, needs careful testing |
| Shared components | Medium | Pays for itself immediately in Phase 3 |
| Superadmin dashboard | Medium | Warmup — simplest case |
| Org Admin dashboard | Medium | Tests slug routing |
| Receptionist dashboard | Medium | 2 missing backend endpoints — open issues first |
| Nurse dashboard | Low–Medium | Straightforward port |
| Doctor dashboard | High | Most complex logic (episodes, tabs, referrals) |
| Patient dashboard | Medium | Demo fallback + access requests |
| Org landing (SSR) | Low | Mostly a port, SSR makes it simpler |
| Tests | High | Zero baseline = build from scratch |
| Hardening | Low | Config and cleanup |

### Milestones

```
Week 0–1   → Phase 0 complete. Next.js running, config.ts live.
Week 1–4   → Phase 1 complete. Auth system migrated. Ships to staging for review.
Week 4–6   → Phase 2 complete. Shared component library ready.
Week 6–12  → Phase 3 in progress. Dashboards migrated one at a time.
Week 12–14 → Phase 4 complete. Landing and org portal live.
Week 14–16 → Phase 5 complete. Tests, hardening, old code deleted. Ready for staging sign-off.
```

---

## 6. Final Recommendation

### Proceed with the migration.

**The current codebase is well-thought-out but has hit its architectural ceiling.** The auth layer works, the API layer is solid, and the routing pattern is correct — but the complete absence of a module system, type safety, and tests means that adding the next significant feature (or onboarding the next developer) carries real risk. A change to a shared utility currently requires editing 6–7 files. A token storage vulnerability is documented but unresolvable without a framework that supports server-side cookie handling.

**Do not rebuild — convert.** The logic in `config.js`, `api.js`, and `router.js` is worth porting directly. The auth flows in `auth.js` cover real edge cases (rate limiting, multi-portal redirect, OTP spans, token validation) that were earned through experience and should not be thrown away. The migration path is a direct port of concepts into better structure, not a redesign.

**Next.js is the right target** — not because it is fashionable, but because it solves the three most pressing problems in this codebase simultaneously:

- **Security:** `httpOnly` cookies via API routes — no code change on the DRF backend required.
- **Routing:** Dynamic `[slug]` routes are native — the Vercel rewrites hack goes away.
- **Performance:** Server Components deliver org branding with zero loading flash; code splitting eliminates loading all 1,500 lines of Superadmin JS on the Patient dashboard.

### Strategic rules for the migration

1. **Phase 1 (auth) ships to `staging` as a standalone PR** before dashboards are touched. This validates the new deploy pipeline with low risk.
2. **No new features on `develop` (Vanilla JS) once Phase 1 ships.** All feature work continues in `rewrite/react`. This prevents the migration from becoming a forever-moving target.
3. **Write tests for each flow as it is migrated.** Do not defer testing to Phase 5. The zero-test baseline is the biggest long-term risk in this project.
4. **Open backend `api-request` issues before the receptionist migration starts** for the two missing endpoints (`POST /receptionist/send-to-nurse/` and a nurses-on-duty endpoint).
5. **Never split tech stacks across branches.** All three core branches (`main`, `staging`, `develop`) always run the same technology — Vanilla JS until the final merge of `rewrite/react`.

---

## Appendix: Key Files to Port (Priority Order)

| Vanilla JS file | Next.js destination | Notes |
|---|---|---|
| `assets/js/config.js` | `src/lib/config.ts` | Port first — everything depends on it |
| `assets/js/api.js` | `src/lib/api.ts` | Keep the same design, add TypeScript |
| `assets/js/router.js` | `src/lib/router.ts` | Port `HC_ROUTER` logic directly |
| `assets/js/auth.js` | `src/app/signin/`, `src/app/api/auth/` | Split by form/flow |
| `assets/js/animations.js` | Framer Motion components | Do not port directly |
| `organization/org-config.js` | `src/lib/org-config.ts` | Keep as fallback config |
| `vercel.json` rewrites | Next.js App Router file structure | Most rules become implicit |
| Each `dashboard.js` | `src/app/[slug]/<role>/` | One at a time, Phase 3 |

## Appendix: Dependencies to Install

```bash
# Core
npm install next react react-dom
npm install -D typescript @types/react @types/node

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Data fetching
npm install swr

# State management
npm install zustand

# UI components
npx shadcn@latest init

# Animations
npm install framer-motion

# Styling
npm install -D tailwindcss postcss autoprefixer

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```
