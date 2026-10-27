# Stand-up Board: this week's tasks (read-only copy)

> **The board is the source of truth:** https://claude.ai/artifact/HktRWK3SNWSUTgZ5DqSFEW
> This file is a **copy**, written by @Bastoh's Claude when the week is set up, so that an
> assistant that cannot read the board (an account outside @Bastoh's Claude organization) can still
> tell its dev what they committed to. **Statuses are a snapshot taken on Tue 27 Oct 2026** and go
> stale as soon as anyone ticks the board. Tick tasks on the board, never here.

**Week 3 · Tue 27 to Fri 30 Oct · Superadmin, part 2.** Still building **top-down** (superadmin, then
org admin, doctor, nurse, reception, patient, landing pages, integrations). **Day 1 (Tuesday) goes to
the fixes the browser walkthrough found on Mon 26 Oct**, then the remaining superadmin gaps.
**New rule:** every frontend PR is walked in the browser (UX first, every action done and reverted on
`api-dev`) before it merges, not just code-reviewed.

**Done by Friday when:**
- Day-1 fixes merged: a suspended user can be found and re-activated; #205's Staff table stays true after Suspend
- FLAG-378 closed: org-admin, org, audit-log and contact reads are audited
- Admin password reset by emailed link is live (#297), and the Users panel offers it
- Unverified organisations can't send or receive inter-org referrals (FLAG-631 part 1)
- Qeeyat's review queue cleared: #200, #202, #203 reviewed
- #205 merged after a browser re-review

> 🩺 **Dr Abdulmuiz is unwell**, so Q10 (what stops when a facility licence expires) is still open.
> Facility-verification **part 2** waits on it; nothing this week does.

## @Bastoh (`bastoh`) · backend + frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w3-b1 | Browser re-review + merge of #205's fix; review Qeeyat's #206 | 1 | todo |
| w3-b2 | Post-merge reviews of Eric's e1 to e4, with the Railway approvals | 2 | todo |
| w3-b3 | #280: vitals "confirm before saving" for out-of-range readings (FLAG-014). Failing test first | 2.5 | todo |
| w3-b4 | Railway: migrate Config as Code before it stops working on 1 Dec | 1.5 | todo |
| w3-b5 | Rescue FLAG-076 to 081 (frontend docs PR from branch `ccr-cd9ff359-v8tvuf`) | 0.75 | todo |
| w3-b6 | FLAG-230: make frontend CI a required check | 0.5 | todo |
| w3-b7 | Decisions: Records screen, facility types, FLAG-063 (#174), `license_number` field | 1 | todo |
| w3-b8 | Fix `audit/0007` so #296 could deploy (FLAG-634) · off-board, Mon 26 Oct | 1.5 | done (#298) |
| w3-b9 | Browser walkthrough of #204/#205, and the `/browser-review` skill · off-board, Mon 26 Oct | 2 | done |
| w3-b10 | Stale sweep before week 3 · off-board, Mon 26 Oct | 1 | done |
| w3-b11 | Post-merge review of Eric's #299 (FLAG-166) · off-board, Tue 27 Oct | 0.5 | done |

## @Ericmoore207 (`eric`) · backend

| id | Task | Hours | Status |
|---|---|---|---|
| w3-e1 | **Day 1:** a suspended user can't be brought back. Suspend soft-deletes, and every list hides soft-deleted users, so there's no Activate button and #204's "Suspended" filter can never show anyone. Make them listable and re-activatable. Failing test first | 2 | todo |
| w3-e2 | **Day 1:** FLAG-378 + twins. Audit `/org-admin/`, `/org/`, `/audit/` and `/contact/` (`/organizations/` in `SENSITIVE_ENDPOINTS` is dead). Measure volume first; tag polled dashboard stats `is_background`. Failing test first | 2 | todo |
| w3-e3 | #297: admin password reset by emailed link. The admin never sees the password; the user's sessions end; audited; published in the schema. Unblocks Qeeyat's k5 | 3 | todo |
| w3-e4 | FLAG-631 part 1: an unverified organisation can't send or receive inter-org referrals (`docs/FACILITY_VERIFICATION_SPEC.md` §4.3). Failing tests first | 2.5 | todo |

> Your other triaged issues (#286, #282, #289) and the newly assigned #155 / #136 are **not** this
> week; they come after these four.

## @Qeeyat (`qeeyat`) · frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w3-k1 | **Day 1:** #205 fix. The Staff table goes stale after Suspend/Activate (changes requested on the PR). If quick, make the org Suspend dialog say every staff member is deactivated. Test first; drop the In Flight row from the branch | 1.5 | todo |
| w3-k2 | Review Bastoh's #200, #202, #203 (the second of #202/#203 to merge needs a rebase; Bastoh does it) | 2.5 | todo |
| w3-k3 | UX follow-ups: #204's filter bar wraps at 1280px; browser Back leaves the dashboard (put the view in the URL); `/superadmin/signin` should send a signed-in user to the dashboard | 2 | todo |
| w3-k4 | After Eric's e1: check the Suspended filter + Activate on Users | 0.5 | todo |
| w3-k5 | After Eric's e3: wire the Reset password button (FLAG-252) | 1.5 | todo |
| w3-k6 | Decide your two old branches: `docs/schema-contract-guidance` (#96) and `fix/flag-235-mask-contract` | 0.5 | todo |
