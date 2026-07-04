# HealthClouda Frontend — Handoff

> Updated at the end of every session. Read this first before starting any work.

---

## Project Snapshot

- **Stack (current):** Next.js (App Router) on `develop` — React rewrite merged via PRs #45/#46
- **Backend:** Django / DRF on Railway
- **Frontend:** Vercel
- **API reference:** `API-doc.md` (gitignored — keep locally)

---

## Branch Strategy

| Branch | Environment | Protection |
|---|---|---|
| `main` | Production | PR + 1 reviewer, no force-push, no deletion |
| `staging` | Beta (NDA partners) | PR + 1 reviewer |
| `develop` | Development | PR + 1 reviewer |
| `feat/*` / `fix/*` | Local only | None — freely deletable |

GitHub ruleset ID `11328360` protects only `main`, `staging`, `develop`. Was previously `~ALL` (blocked everything) — fixed 2026-05-25.

---

## React Migration Plan

1. Cut `rewrite/react` from `develop` when React work begins.
2. All React development happens on `rewrite/react` only.
3. When feature-complete → PR into `staging` for NDA partner testing.
4. After staging sign-off → `staging` → `develop` → `main`.
5. `rewrite/react` deleted after final merge.

**Rule:** Never split tech stacks across branches. All three core branches always run the same technology.

---

## Session Log

### 2026-07-04 — PR #49 regression tests + stale-branch cleanup (branch: test/auth-regression)

**Context:** PR #49 (`fix/auth-layer`) merged into `develop` (`447758b`). Per the pre-fix/post-fix
discipline adopted 2026-07-03, first task was to backfill regression guards for the auth fixes that
shipped without tests, then clean up merged branches.

**What was done:**
- **Branch hygiene** (our "merged → delete" principle): fast-forwarded local `develop` to `447758b`;
  deleted 5 stale remote branches (`fix/auth-layer` #49, `fix/vercel-deploy-handoff` #48,
  `fix/ward-edit-id-quoting`, `chore/repo-cleanup` #44, and the redundant `fix/vercel-nextjs-config`)
  and their local copies. Remaining remotes: `main`/`staging`/`develop` (protected) + `rewrite/react`.
- **Regression tests — 14 new, vitest 23/23 green** (`test/auth-regression` off `develop`):
  - `src/app/api/auth/refresh/route.test.ts` — refresh route persists the ROTATED refresh token;
    401 clears cookies; no-cookie short-circuits without calling DRF.
  - `src/middleware.test.ts` — gates on access OR refresh cookie (refresh-only nav passes through);
    never builds `/undefined/...`; org-aware + superadmin signin redirects.
  - `src/lib/client-api.test.ts` — single-flight refresh (concurrent 401s → ONE refresh → retry both);
    org-aware signin redirect when refresh fails.
  - `src/lib/router.test.ts` — `getOrgSlugFromPathname` slug vs. reserved-path handling.
  - **Verified genuine:** temporarily reverted the refresh-rotation and `/undefined/` fixes and confirmed
    the guards go red (buggy middleware reproduced exactly `/undefined/doctor`), then restored → green.

**Decisions made:**
- `rewrite/react` is NOT deleted yet: merged into `develop` but the migration plan says "delete after
  final merge" and `main` has not received the rewrite. Delete once it reaches `main`.

**Pending / TODOs:**
- [ ] Get `test/auth-regression` reviewed + merged into `develop`.
- [ ] Delete `rewrite/react` once the rewrite lands on `main`.
- [ ] PR 2: error states + pagination + `?limit=`→`?page_size=` (audit UX-ERR-1, PERF-1, GLOBAL-1) —
  same discipline: start with a failing test.
- [ ] Remaining items carry over from the 2026-07-03 entry below.

---

### 2026-07-03 — Full-codebase audit (5 lenses) + auth-layer fix (PR: fix/auth-layer)

**Context:** Backend fix phase M0–M5 is complete (see `FRONTEND_HANDOFF.pdf`, gitignored-style local doc,
updated 2026-07-03 with `seed_demo` demo logins — all `@demo.test` / `Demo#Pass1`). Goal: catch all bugs,
align frontend with the new backend contract. Offline-first is DEFERRED to staging phase (backend decision
2026-07-02); build online-only but keep all data access behind a swappable layer.

**What was done:**
- Phase 0 baseline: install (flaky network corrupted 3 native binaries — fixed via cache verify + targeted
  re-downloads), build green (22 routes, 102–142 kB first load), vitest 9/9, dev server + local Docker
  backend (`localhost:8000`) verified end-to-end with seeded logins.
- Phase 1: **full codebase review** through 5 lenses (correctness/contract, security, performance,
  architecture, UX/a11y) against the handoff PDF + live OpenAPI schema + live backend.
  → **`CONTRACT-AUDIT.md`** (committed): ~9 P0s, ~20 P1s, ~25 missing workflows, proposed PR order,
  4 open backend questions. Read it before doing any Phase 2 work.
- Phase 2 started — **PR 1 (`fix/auth-layer`)**, all verified live against Docker backend:
  - Refresh route now persists the ROTATED refresh token (was discarded → 2nd refresh always 401'd).
  - New `src/lib/client-api.ts`: single data layer, 401 → single-flight refresh → retry → org-aware
    signin redirect. `use-api.ts` rewired on top (same interface). This is the offline swap seam.
  - Login route enriches user with `organization_slug/name` from `/auth/me/` (login response has none —
    staff used to be redirected to `/undefined/<role>`).
  - Middleware gates on access OR refresh cookie (access cookie expires hourly — page navs used to bounce
    to signin despite valid refresh token); never builds `/undefined/` redirects.
  - Logout + 401 redirects are org-aware; receptionist search param fixed (`?q=` → `?query=`).

**Decisions made:**
- Offline-first deferred to staging phase; `SYNC-CONTRACT.md` already designed (lives in backend repo).
- Fix order = CONTRACT-AUDIT.md "Phase 2 fix order" (auth → error/pagination hygiene → per-role PRs,
  mirroring backend app-by-app review).

**Pending / TODOs:**
- [x] Get PR `fix/auth-layer` reviewed + merged — **merged as PR #49** (`447758b` on `develop`).
- [x] **Adopt pre-fix/post-fix test discipline (agreed 2026-07-03):** every fix PR starts with a failing
  test reproducing the flagged issue, fix turns it green, test stays as regression guard.
  Regression tests for PR #49 backfilled 2026-07-04 (see that session entry).
- [ ] PR 2: error states + pagination + `?limit=`→`?page_size=` (see audit UX-ERR-1, PERF-1, GLOBAL-1).
- [ ] PR 3+: per-role contract fixes — NOTE stats field names mismatch backend on likely all roles (GLOBAL-6).
- [ ] Nurse vitals rebuild (NURSE-1) — biggest P0 remaining, needs its own session.
- [ ] Answer 4 open backend questions at the bottom of CONTRACT-AUDIT.md (patient appointments endpoint,
  org-admin review removal, `is_on_duty` source, list filters).
- [ ] ESLint config + GitHub Actions CI (ARCH-2/3) — still pending from May.
- [ ] ARCHITECTURE.md still documents the old Vanilla JS app — rewrite after PR 1–3 land.

---

### 2026-06-12 — Vercel deploy failures fixed (Output Directory override)

**What was done:**
- Diagnosed why every Vercel deployment failed after the React rewrite merged: builds errored with `NEXT_NO_ROUTES_MANIFEST` because the **dashboard Output Directory setting was still `public`** (leftover from the static site). Dashboard settings override `vercel.json`, so the `"framework": "nextjs"` fix in fe6b115 never took effect.
- Cleared the Output Directory override via the Vercel API (`outputDirectory: null` → Next.js default `.next`).
- Redeployed `develop` head (6e14a2c) — preview built green in 1m.
- Production was stuck on a stale commit (e17319e) with a real `module_not_found` build bug already fixed by PR #46, so the current develop build was promoted to production. `healthclouda-frontend.vercel.app` is live (HTTP 200).
- Verified `develop` branch ruleset: PRs required (1 approval), no direct pushes, no force-push/deletion.

**Decisions made:**
- Vercel production branch **stays `develop` for now** — the `main` → Production remap is deferred (to be discussed).
- Branch `fix/vercel-nextjs-config` is redundant — its only commit duplicates fe6b115 already on `develop`, and the actual fix was the dashboard setting. Safe to delete without merging.

**Pending / TODOs:**
- [ ] Delete the redundant `fix/vercel-nextjs-config` remote branch.
- [ ] Preview URLs return 401 (Vercel Deployment Protection) — decide whether previews should be publicly viewable.
- [ ] Remap Vercel environments (`main` → Production) — deferred, see decision above.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`) — still pending.

---

### 2026-06-11 — Full technical review + Next.js migration plan

**What was done:**
- Full codebase audit: measured all JS files (~8,500 lines), CSS (~1,680 lines), 22 HTML shells, 6 dashboards.
- Identified architecture ceiling: no module system, global scope pollution, 6× code duplication, zero tests, localStorage token security debt, memory leaks from uncleared intervals.
- Evaluated Vanilla JS → Next.js migration: verdict is **proceed**.
- Created `MIGRATION-PLAN.md` — full reference document covering audit, stack analysis, migration decision, step-by-step guide, phased timeline, and final recommendation.

**Decisions made:**
- Migrate to Next.js (App Router) via `rewrite/react` branch (existing branch strategy from HANDOFF.md applies).
- **Convert the existing repo** — do not create a new one. Git history is preserved.
- Do not rebuild — port `config.js`, `api.js`, `router.js` directly. Redesign only the structure.
- Phase 1 (auth) ships to `staging` as a standalone PR before dashboards are touched.
- No new features on `develop` (Vanilla JS) once Phase 1 ships.

**Pending / TODOs:**
- [ ] Start Phase 0: cut `rewrite/react` branch, init Next.js, port `config.js` → `config.ts`.
- [ ] Open backend `api-request` issues for 2 missing receptionist endpoints before Phase 3.
- [ ] Remap Vercel environments (`main` → Production, `staging` → Beta, `develop` → Dev) — still pending from prior session.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`) — still pending.

---

### 2026-05-25 — CLAUDE.md upgrade + ARCHITECTURE.md created

**What was done:**
- Replaced `CLAUDE.md` with a more structured version: login portal contract, auth flow notes, explicit session start/during/end workflow, key patterns to enforce.
- Created `ARCHITECTURE.md` — full documentation of file structure, routing (Vercel rewrites + `HC_ROUTER`), auth flows (3 portals), API layer, and API endpoint map per role.

**Decisions made:**
- `ARCHITECTURE.md` is now a required living doc — update it whenever routing, file structure, or API integration changes.

**Pending / TODOs:**
- [ ] Merge PR #44 (repo cleanup) once Qeeyat reviews.
- [ ] Add `ARCHITECTURE.md` to PR #44 or open a separate PR to track it.
- [ ] Remap Vercel environments: `main` → Production, `staging` → Beta, `develop` → Dev.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`).
- [ ] Start `rewrite/react` branch when React work begins.

---

### 2026-05-25 — Branch Strategy Restructure + Repo Cleanup

**What was done:**
- Diagnosed state: `main` had only 1 commit (initial), `develop` had 89 commits, no `staging` existed, 36 stale remote branches.
- Opened PR #43 (`develop` → `main`) to align main — merged by Qeeyat.
- Created `staging` branch from `develop`.
- Updated GitHub ruleset ID `11328360` from `~ALL` to `main/staging/develop` only (was blocking all branch deletions and pushes).
- Deleted 36 stale remote branches and 30 stale local branches.
- Updated `CLAUDE.md` to add `## Session Handoff (REQUIRED)` instruction.
- Created `HANDOFF.md` (this file) and added it to version control.
- Fixed `.gitignore`: removed stale `claude.md` and `Backend-prompts.md` entries so `CLAUDE.md` and `HANDOFF.md` are tracked.
- Deleted `BACKEND-PROMPTS.md` — bugs were resolved; offline-first architecture saved to Claude memory.
- Deleted 9 unused placeholder/fictional images from `public/assets/images/`.
- PR #44 open (`chore/repo-cleanup` → `develop`) — awaiting Qeeyat review.

**Decisions made:**
- Branch structure mirrors the backend repo exactly (main / staging / develop).
- React rewrite goes through `rewrite/react` → `staging` → `develop` → `main` — never splits stack across environments.
- `CLAUDE.md` and `HANDOFF.md` should be committed (team/Claude reference), but `PRD.md` and `API-doc.md` stay gitignored (sensitive internal docs).

**Pending / TODOs:**
- [ ] Merge PR #44 (repo cleanup) once Qeeyat reviews.
- [ ] Remap Vercel environments: `main` → Production, `staging` → Beta, `develop` → Dev (needs Vercel dashboard — not yet done).
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`).
- [ ] Start `rewrite/react` branch when React work begins.

---

## Key Contacts

| Person | Role |
|---|---|
| Bastoh | Lead / owner |
| Qeeyat | Team reviewer |
