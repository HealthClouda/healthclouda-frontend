# HealthClouda Frontend — Handoff

> Updated at the end of every session. Read this first before starting any work.

---

## Project Snapshot

- **Stack (current):** Vanilla HTML / CSS / JavaScript
- **Stack (planned):** React rewrite — see Migration Plan below
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
