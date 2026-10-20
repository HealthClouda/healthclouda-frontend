# Stand-up Board: this week's tasks (read-only copy)

> **The board is the source of truth:** https://claude.ai/artifact/HktRWK3SNWSUTgZ5DqSFEW
> This file is a **copy**, written by @Bastoh's Claude when the week is set up on Monday, so that an
> assistant that cannot read the board (an account outside @Bastoh's Claude organization) can still
> tell its dev what they committed to. **Statuses are a snapshot taken on Tue 20 Oct 2026** and go
> stale as soon as anyone ticks the board. Tick tasks on the board, never here.

**Week 2 · Mon 19 to Fri 23 Oct · Superadmin, part 1.** We now build **top-down**: superadmin, then
org admin, doctor, nurse, reception, patient, landing pages, then integrations (lab, theatre…). This
week: finish what is half-built in superadmin (search, detail views, screens whose backend already
exists) and make the audit log usable. **Dr Abdulmuiz now joins the stand-ups** to confirm that what we
build matches clinical practice.

**Done by Friday when:**
- Organisations and users can be searched and filtered
- An organisation has a real detail page, not just an edit form
- Audit log usable: background noise hidden by default, date range filter, sign-out no longer logged as a failed sign-in
- Messages shows contact-form submissions
- Branded loader in place
- Dr Abdulmuiz has answered the facility-verification question
- Last week's open PRs reviewed and merged

> ⚠️ **Week 1 leftover for @Qeeyat:** your week-1 tasks w1-k2, w1-k3 and w1-k4 are done (#193, #195,
> #196) but still read "todo" on the board. Mark them **In review** in the browser.

## @Bastoh (`bastoh`) · backend + frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w2-b1 | Review Qeeyat's open PRs #189, #193, #195, #196 | 2.5 | todo |
| w2-b2 | Post-merge review of Eric's week-1 PRs #276 to #279 | 1.5 | todo |
| w2-b3 | #174: resolve merge conflicts, fix Qeeyat's two nits (`ENDPOINTS.PATIENT(id)`; local date, not UTC), settle FLAG-063 with her | 1 | todo |
| w2-b4 | Superadmin Messages screen (frontend), from the existing `/contact/contact-list/` endpoint | 3 | todo |
| w2-b5 | Superadmin dashboard: system health card (frontend), from the existing `/superadmin/health/` endpoint | 1 | todo |
| w2-b6 | Facility verification spec: ask Dr Abdulmuiz what proof a facility must give, then write the spec | 1 | todo |
| w2-b7 | Clean old test accounts off dev before the demo | 0.5 | todo |

## @Ericmoore207 (`eric`) · backend

| id | Task | Hours | Status |
|---|---|---|---|
| w2-e1 | Audit log noise: tag background requests (heartbeat, `/auth/me/`, dashboard polling) and hide them by default. Keep logging them. Failing test first | 3.5 | todo |
| w2-e2 | Audit log date range filter: `date_from` / `date_to` on `/audit/logs/`, published in the schema | 1.5 | todo |
| w2-e3 | Bug: sign-out is logged as an anonymous "Failed sign-in" (`LOGIN_FAILURE /api/v1/auth/logout/`). Failing test first | 1.5 | todo |
| w2-e4 | Organisation detail data on the org endpoint: staff count by role, org admins, patient count, verified by and when. Check the live schema first | 2 | todo |
| w2-e5 | Search and filters: organisations by name and status; users by name/email, organisation and status. Published in the schema | 1.5 | todo |

## @Qeeyat (`qeeyat`) · frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w2-k1 | Organisation detail page: "View" opens a detail page (info, org admins, staff list, patient count, verification status) with Edit as a button. Uses Eric's e4 | 4 | todo |
| w2-k2 | Users: search, filters, and a user detail panel with Reset password (endpoint exists). Uses Eric's e5 | 3 | todo |
| w2-k3 | Branded loader: a HealthClouda loading animation on page/tab changes and while data loads. Use the logo as inspiration (e.g. a heartbeat moving through the cloud); reach out to Bastoh if you need direction. Respect reduce-motion; screen-reader label | 1.5 | todo |
| w2-k4 | FLAG-056: "No doctor available" shows while a doctor is on duty (carried over) | 1 | todo |
| w2-k5 | Approve #174 once Bastoh's fixes land | 0.5 | todo |
| w2-k6 | Review #194 (ward set-up panel wording, FLAG-074) | 0.5 | todo |
