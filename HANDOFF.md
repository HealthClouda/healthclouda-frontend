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

### 2026-05-25 — Branch Strategy Restructure

**What was done:**
- Diagnosed state: `main` had only 1 commit (initial), `develop` had 89 commits, no `staging` existed, 36 stale remote branches.
- Opened PR #43 (`develop` → `main`) to align main — merged by Qeeyat.
- Created `staging` branch from `develop`.
- Updated GitHub ruleset from `~ALL` to `main/staging/develop` only (was blocking all branch deletions).
- Deleted 36 stale remote branches and 30 stale local branches.
- Updated `CLAUDE.md` to require session handoff updates.

**Decisions made:**
- Branch structure mirrors the backend repo exactly (main / staging / develop).
- React rewrite goes through `rewrite/react` → `staging` → `develop` → `main` — never splits stack across environments.

**Pending / TODOs:**
- [ ] Remap Vercel environments: `main` → Production, `staging` → Beta, `develop` → Dev (not yet done — needs Vercel dashboard).
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`).
- [ ] Start `rewrite/react` branch when React work begins.

---

## Key Contacts

| Person | Role |
|---|---|
| Bastoh | Lead / owner |
| Qeeyat | Team reviewer |
