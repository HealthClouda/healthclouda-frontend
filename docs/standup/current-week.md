# Stand-up Board: this week's tasks (read-only copy)

> **The board is the source of truth:** https://claude.ai/artifact/HktRWK3SNWSUTgZ5DqSFEW
> This file is a **copy**, written by @Bastoh's Claude when the week is set up, so that an
> assistant that cannot read the board (an account outside @Bastoh's Claude organization) can still
> tell its dev what they committed to. **Statuses are a snapshot taken on Mon 2 Nov 2026** and go
> stale as soon as anyone ticks the board. Tick tasks on the board, never here.

**Week 4 · Tue 3 to Fri 6 Nov · Superadmin close-out: the last superadmin week.** Close the referral
access gaps first, then merge every superadmin screen already built and empty the frontend review
queue. **Next: org admin, with billing** (spec waits on the owner's pricing model doc).

**Done by Friday when:**
- No hospital can gain access to a patient through a referral it shouldn't make or accept (FLAG-254 + accept checks verification)
- Every superadmin screen built so far is merged: org detail (#205), health card (#202), Messages (#203), Reset password button, Suspended filter
- The frontend review queue is empty
- Facility verification part 2 explicitly moved to when the doctor answers the licence question
- Staging promotion has a date and a checklist

> 🩺 The licence question (what stops when a facility licence expires) is **with Dr Abdulmuiz**.
> Facility-verification **part 2** waits on his reply; nothing this week does. Other medical questions
> are asked in the week their feature is built.

## @Bastoh (`bastoh`) · backend + frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w4-b1 | Browser re-review + merge of #205; review Qeeyat's #206 (carried) | 1 | todo |
| w4-b2 | As Qeeyat approves: rebase #202/#203, merge, check each on dev | 1.5 | todo |
| w4-b3 | Post-merge reviews of Eric's e1 to e7 + the Railway approvals | 2 | todo |
| w4-b4 | Decisions (carried): Records screen, facility types, FLAG-063 (#174), `license_number` | 1 | todo |
| w4-b5 | Decide and build the superadmin Records screen (frontend) | 3 | todo |
| w4-b6 | Plan the staging promotion: date, parity checklist, Railway worker step | 1.5 | todo |
| w4-b7 | Week-4 board + this file in both repos | 0.25 | review |

## @Ericmoore207 (`eric`) · backend

| id | Task | Hours | Status |
|---|---|---|---|
| w4-e1 | **#304 FLAG-254 (High):** both referral create paths check the doctor's hospital can see the patient, **before** the deceased check (#211 made it a death lookup). Failing tests first, one per path | 3 | todo |
| w4-e2 | **Accepting a referral checks verification** (gap found reviewing #310): `accept_referral` (`referrals/services.py:91`) never calls the predicate, and accept is where profile access is granted. Failing test first; add the line to `FACILITY_VERIFICATION_SPEC.md` §4.3 | 1 | todo |
| w4-e3 | **Rate-limit `send-password-reset`** (only `resend_setup_email` is throttled, `accounts/views.py:495`). Decide whether the legacy `reset-password/` goes now: it lets an org admin *set* a fellow org admin's password. Mark it `deprecated: true` in the schema | 0.5 | todo |
| w4-e4 | **#301 follow-ups:** `?is_active=false` widens every action, not just `list` (a PATCH can leave `is_active=true` with `deleted_at` set); the org-admin staff screen still can't see suspended users | 1 | todo |
| w4-e5 | **#305 FLAG-635:** assign-doctor refuses a deceased patient; correct FLAG-619 and the `access.py` docstring | 1 | todo |
| w4-e6 | **Frontend contract notes** for #301 (`is_suspended`) and #310 (unverified orgs hidden from the picker, new 400 texts); clear #310's In Flight row | 0.5 | todo |
| w4-e7 | **#306 part:** FLAG-636 (duty toggle tagged background) + FLAG-637 (phone search ignores spaces) | 2 | todo |

> Moved to week 5: the rest of #306, and all of #307 (vitals follow-ups).

## @Qeeyat (`qeeyat`) · frontend

| id | Task | Hours | Status |
|---|---|---|---|
| w4-k1 | **#205 fix** (carried): the Staff table stays true after Suspend/Activate. Test first; drop the In Flight row from the branch | 1.5 | todo |
| w4-k2 | **Review queue** (carried), oldest first: #200, #202, #203, #174 (after the FLAG-063 decision), #207, #211, #212 | 3.5 | todo |
| w4-k3 | **Reset password button** in the Users panel (FLAG-252). Backend #309 is live on dev: `POST /auth/users/{id}/send-password-reset/`. No token in the reply on purpose; the user being signed out everywhere afterwards is not an error | 1.5 | todo |
| w4-k4 | **Check the Suspended filter + Activate** on Users (backend #301 is live on dev; field `is_suspended`) | 0.5 | todo |
| w4-k5 | **UX fixes** (carried): filter bar at 1280px, browser Back, sign-in redirect. First to cut if the week is short | 2 | todo |
| w4-k6 | **Old branches** (carried): `docs/schema-contract-guidance` (#96) and `fix/flag-235-mask-contract`. Open a PR, or say why it's dropped | 0.5 | todo |
| w4-k7 | Frontend issue #213: correct two old board tasks | 0.1 | todo |

> Moved to week 5: #208 ("save anyway?" vitals prompt), #209 (abnormal readings in red, needs #307),
> #210 (height in feet and inches).
