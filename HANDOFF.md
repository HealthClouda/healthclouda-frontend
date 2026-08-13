# HealthClouda Frontend — Handoff

> Updated at the end of every session. Read this first before starting any work.

---

## 🚧 In Flight

> **This table is how two developers — each driving their own AI assistant that cannot see the
> other's memory — avoid working the same files from two directions.**
>
> **Rules:** claim your row **before cutting the branch**, not at PR time · clear it on merge ·
> read it at session start, every session · if you abandon the work, **clear the row** — a stale
> claim is worse than no claim.
>
> Taking an item outside your default lane (`[INFRA]` @Bastoh · `[DESIGN]` @Qeeyat) matters *more*
> here, not less — claim it loudly.

| Who | Item(s) | Branch | Touches | Since | State |
|---|---|---|---|---|---|
| *(none — claim before cutting your next branch)* | | | | | |

*Cleared on merge: **A2/A3/A4/A6** Tier-1 infra batch — PR #65 · **FLAG-010** — PR #66 · **FLAG-011**
token contrast — PR #68 · **D1 shared shell** (DashboardShell/StatCard/DataTable/Badge) — PR #67 ·
**D1 overlays** (SlidePanel/Modal/Toaster/EmptyState/SmallScreenGate) — PR #69 · In Flight row cleared —
PR #70 · **docs: `api-dev` seeding + FLAG-010 live + `CLAUDE.md` ritual fix** — PR #72. All merged
2026-08-12/13.*

⚠️ **Contract-first ordering (sprint plan Part 3):** E2/E3 must land **before** D4/D6 style them.
A design PR built on the wrong data shape is a rewrite — if that order slips, say so in this table.

---

## 📡 Backend Contract Notes

> Backend changes we must consume. The live `/api/v1/schema/` is the single source of truth —
> **not** this table, and not `API-doc.md` (which is gitignored, see FLAG-009).

| Date | Note | Status |
|---|---|---|
| 2026-08-13 | 🎯 **`api-dev` is now seeded — the dev tier is usable for the first time.** It previously had 112 migrations applied and **zero rows**; the 5 July note *"dev-tier is NOT seeded"* was accurate and the sprint plan's *"real seeded data"* was aspirational. Now present: `demo-clinic` **and** `other-clinic` (a second org, so cross-org isolation is testable — T3), 7 users across all six roles, 21 patients, 16 episodes, 7 appointments, 5 check-ins, 31 vitals, 10 prescriptions, 2 wards, 7 beds, 3 admissions, 5 referrals, 4 access requests. Dashboards render populated, not empty. **Verified through the proxy path, not just reported:** both orgs `GET /org/by-slug/<slug>/` → 200 · staff on the generic portal → **400** (not 401) carrying `org_slug` + `redirect_url` · `POST /auth/login/demo-clinic/` → 200 with `{access, refresh, user, redirect_to}`. Login's `user` carries only `id, email, first_name, last_name, role, last_login` — **no organization, no duty fields**; our login route already enriches from `/auth/me/` (`api/auth/login/route.ts:96-117`), so **no code change is needed**. Credentials are synthetic and stay out of this repo. | ✅ **unblocks** visual verification, the T5 harness, and the FLAG-003 re-verification. ✅ **@Qeeyat has credentials** — sent out-of-band by @Bastoh 2026-08-13, together with the three-portal table (staff on the general portal get a **400**, not a 401). Values stay out of this repo |
| 2026-08-10 | **API host moved to `https://api-dev.healthclouda.com`.** The old Railway host returns HTTP 400 `DisallowedHost` on every path — removed from `ALLOWED_HOSTS` deliberately (it bypassed Cloudflare, sidestepping edge rate limiting + the audit-logging security header). **It will not be restored.** | ✅ purged from the codebase 2026-08-12 (A2) |
| 2026-08-12 | **A8 — backend must tier its `FRONTEND_URL`.** It emails links built from that value (set-password for staff *and* patient invites, org landing, cross-org consent approve/deny). If tiers cross, a beta patient's invite lands on the wrong frontend calling the wrong API, and presents as *"the invite is broken"*. **Researched in their code before filing:** it is already env-driven (`settings/base.py:338`) with **no** per-tier override, so this needs **no code change on their side** — only the env var set per deployment. Two hazards raised with it: the default is `http://localhost:3000` (an unset tier emails localhost links to patients), and `patients/receptionist_views.py:287` carries a second hardcoded localhost default on the **consent** link specifically. Every path they build was verified against our routes — only the host is at risk. | ✅ **filed: backend [#107](https://github.com/HealthClouda/healthclouda-backend/issues/107)** — needed before `api-beta` exists (~31 Aug) |
| 2026-08-12 | **Login `redirect_to` drops the org slug** — built from `FRONTEND_ROLE_PATHS` (`settings/base.py:406`), so a doctor gets `/doctor/`, not `/<slug>/doctor`. We don't consume it (we use `redirect_url` from the 400 staff-portal response), so impact is zero today. **Do not wire `redirect_to` without checking `router.ts`.** | logged as **FLAG-010**, not filed upstream · ✅ **reproduced live on `api-dev` 2026-08-13** — `POST /auth/login/demo-clinic/` as `doctor@demo.test` returned `redirect_to: "/doctor/"`, confirming the slug is dropped in the deployed build, not only in their source |
| 2026-08-10 | **Org-admin access-request review was removed by the backend as a security fix** — it let an org admin approve access to a patient's records *bypassing patient consent* (audit ORGADMIN-1). Read-only list stays. | ✅ frontend caller removed 2026-08-12 (A6) |
| 2026-08-10 | Referral workflow becomes **ORG_ADMIN-managed ~20 Aug** — re-read Swagger before D5 Doctor; don't build deep against today's shape. | ⏳ pending |
| 2026-08-08 | Contract claims in our docs are **July-sourced, not re-verified** against the live schema (FLAG-003). | ❗ open — **but no longer blocked.** FLAG-002 (dead host) made the schema unreachable; `api-dev` is now up *and* seeded, so the re-verification can finally run. Scheduled Fri 14 Aug, ahead of E2/E3 |

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

**Stacking rules (adopted 2026-07-05, after the PR #51 mishap):** independent work always branches off
up-to-date `develop` — never stack, never wait. Stack on another feature branch ONLY when the new work
needs code from that unmerged PR. `delete_branch_on_merge` is ON (enabled 2026-07-05), so GitHub
auto-retargets a stacked PR to `develop` when its parent merges — but stack parents MUST merge via
**merge commit** (squash breaks the retargeted child with phantom conflicts). Reviewer: confirm the
child PR's base shows `develop` before merging it.

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

> **Session narrative lives in the per-dev logs, not here.** `CLAUDE.md` §3 makes this file durable
> shared state only — the snapshot, branches, env/deploy facts, the 🚧 In Flight table and the
> 📡 Backend Contract Notes. Narrative goes in `HANDOFF-<Name>.md`.
>
> The 15 entries that used to sit here (2026-05-25 → 2026-07-17) were rewritten into
> `HANDOFF-Bastoh.md` during the 2026-08-09 doc restructure but were never removed from this file, so
> two copies drifted side by side and this one contradicted the rule at the top of it. Removed
> 2026-08-13.
>
> **The copies are not verbatim.** They were condensed into the first-person entry template: every
> substantive fact survives — contract verifications, decisions and their reasoning, what was checked
> and how — but granular detail does not, specifically the names of branches deleted in cleanups,
> per-file test listings, and the per-entry "Pending / TODOs" checklists, which were point-in-time
> snapshots rather than live state. **Nothing is lost permanently:** the full original text is in git
> history at `25f3189:HANDOFF.md` and every commit before it.

- **@Bastoh** → `HANDOFF-Bastoh.md`
- **@Qeeyat** → `HANDOFF-Qeeyat.md`

---

## Key Contacts

| Person | Role |
|---|---|
| Bastoh | Lead / owner |
| Qeeyat | Team reviewer |
