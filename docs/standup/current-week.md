# Stand-up Board: this week's tasks (read-only copy)

> **The board is the source of truth:** https://claude.ai/artifact/HktRWK3SNWSUTgZ5DqSFEW
> This file is a **copy**, written by @Bastoh's Claude when the week is set up on Monday, so that an
> assistant that cannot read the board (an account outside @Bastoh's Claude organization) can still
> tell its dev what they committed to. **Statuses here are a Monday snapshot.** Tick tasks on the board,
> never here.

**Week 1 · Tue 13 to Fri 16 Oct · Bug week.** First clean up your flags file: mark already-fixed flags
as RESOLVED with the PR number. Then fix the real bugs, admissions first.

**Done by Friday when:**
- Both flags files are honest: every open flag is really open
- All 5 open frontend PRs merged and backend #264 closed
- Appointment and check-in status rules enforced
- At least 2 admissions bugs closed on each side
- Doctor's follow-up (arrival step + recording limits) sent

## @Bastoh (`bastoh`) · backend + frontend

| id | Task | Hours |
|---|---|---|
| w1-b1 | Fix Qeeyat's review comments on #186, #187, #188. Then assign Qeeyat as reviewer on #174 and review her #189 | 3.5 |
| w1-b2 | Backend #264: a refused bed reduction still saves the rest of the request | 1.5 |
| w1-b3 | FLAG-576: the emergency admission path skips the shared admission logic (`apps/ward/services.py`) | 2 |
| w1-b4 | Clean up the backend ward and admissions flags (mark already-fixed ones RESOLVED with the PR number) | 0.5 |
| w1-b5 | Send the doctor the follow-up message and record his reply (arrival step + vitals recording limits) | 0.5 |

## @Ericmoore207 (`eric`) · backend

| id | Task | Hours |
|---|---|---|
| w1-e1 | Clean up the backend flags file. 135 open headings: High priority first, then patients and referrals | 3 |
| w1-e2 | Appointment and check-in status rules. A cancelled appointment must not become completed; check-ins only move through legal steps. Both receptionist and doctor views. Failing test first | 3 |
| w1-e3 | Refuse check-in for a deceased patient (backend half of frontend FLAG-067) | 1 |
| w1-e4 | FLAG-310: vitals entry limits in one place, stop rejecting real hypothermia. The doctor's normal-ranges table must NOT be used to reject values (see backend `docs/medical`) | 1 |

## @Qeeyat (`qeeyat`) · frontend

| id | Task | Hours |
|---|---|---|
| w1-k1 | Re-review #186, #187, #188 and #174 as Bastoh's fixes land, and approve so they can merge | 2 |
| w1-k2 | Clean up the frontend flags file. About 30 flags under Open are already fixed (e.g. 057, 059, 060, 061, 065, 248, 250): move them to Resolved with PR numbers | 2 |
| w1-k3 | FLAG-212: the two bed lists disagree, and one bed belongs to no ward (admissions) | 2 |
| w1-k4 | FLAG-067: show the refusal when reception checks in a deceased patient (pairs with Eric's backend task) | 1 |
| w1-k5 | FLAG-056: "No doctor available" shows while a doctor is on duty (copy fix) | 1 |
