# T6 — Role-Journey UAT Checklist (Frontend)

> **What this is:** the scripted journeys for every role, walked **through the UI** on a deployed
> frontend. It is the frontend half of T6 (`docs/FRONTEND_SPRINT_PLAN.md`) and was owed from week 2.
> **Written 2026-09-13 (@Qeeyat)**, for daily execution the week of **Mon 14 – Fri 18 Sep**, and
> reusable on every promotion after that.
>
> **Why it exists when the backend already has one.** The backend's `docs/UAT-CHECKLIST.md` (J1–J7)
> is excellent and it is **API-level** — every step is a `curl` against `api-dev`. It proves the
> endpoints; it does not prove that a receptionist can do the job **in this app**. Four of six
> dashboards shipped stat tiles reading fields the API never sends while the API itself passed. The
> journeys below mirror theirs **step for step where the UI supports it**, so a failure here and a
> pass there points straight at the frontend.

---

## 🔴 Rules of execution — read these every day

1. **Log deviations as defects. Do not fix in place.** Fixing mid-run means you are no longer
   testing the build you started with, and the reproduction is lost. Record it in the defect log
   below, carry on, and triage at the end of the day.
2. **Every defect becomes a `CODEBASE_FLAGS.md` entry at triage.** An entry here is a run note; a
   FLAG is what gets fixed. Fixes go on their own small branch, reviewed the same day.
3. **Record what you saw, not what you expected.** A ✅ with nothing in *Observed* is not evidence.
   Where a step says *record*, write the value down.
4. **Run journeys in order within a day** — FE-J2 signs in as the patient FE-J1 created.
5. 🔴 **This repository is PUBLIC.** No passwords, no tokens, no real names, and **no screenshots of
   records** in this file, in a PR, or in a FLAG. Demo account passwords are shared out-of-band only.
   Describe what you saw in words.
6. 🎯 **Everything here runs on `dev.` against synthetic data. That is a rehearsal, not the PHI gate.**
   Never tick a 🎯 PROVE-ON-BETA item in `BETA_READINESS.md` because it passed here.
7. **A step that could not reach its control is ⚠️ UNTESTED, not ✅.** If a 403 arrived for a
   different reason than the one the step tests, it did not pass. (The backend's U-03/U-05/U-07 are
   three worked examples of this.)

### Status legend for the *Avail.* column

| Mark | Meaning |
|---|---|
| ✅ | Built and on `develop` — testable today |
| ⏳ #NNN | Built, **unmerged** — testable once that PR merges. Until then mark the step ⚠️ UNTESTED |
| ❌ | **Not built in the UI.** Do not test; the step exists to show the gap against the backend journey |

---

## Environment under test

| | Value |
|---|---|
| Frontend | `https://dev.healthclouda.com` (branch `develop`) |
| Backend | `api-dev.healthclouda.com` — dev tier, `seed_demo` data |
| Browser | Desktop Chrome at ≥ 1280px for staff dashboards; phone-width for FE-J2 and the gate checks |
| Beta | ❌ **`beta.healthclouda.com` does not resolve (re-measured 2026-09-13).** Nothing here can run on beta yet |

⚠️ **The backend re-seeds `api-dev` from time to time, and the seeded dates move.** An empty check-in
queue "today" can be the correct render. Before logging "empty table" as a defect, confirm the data
exists (e.g. change the date filter).

### Accounts (`seed_demo`, synthetic)

Emails only. **Passwords are shared out-of-band — never write them here.**

| Role | Account | Sign in at |
|---|---|---|
| Superadmin | `superadmin@demo.test` | `/superadmin/signin` |
| Org admin | `orgadmin@demo.test` | `/demo-clinic/signin` |
| Doctor | `doctor@demo.test` | `/demo-clinic/signin` |
| Nurse | `nurse@demo.test` | `/demo-clinic/signin` |
| Receptionist | `reception@demo.test` | `/demo-clinic/signin` |
| Patient | `patient@demo.test` | `/signin` |
| Doctor, **second org** | `doctor.other@demo.test` | `/other-clinic/signin` |
| Org admin, **second org** | `orgadmin.other@demo.test` | `/other-clinic/signin` |

🔑 **Three portals, and using the wrong one looks like a bug.** Staff who try `/signin` are redirected
to their org portal — that is correct behaviour, not a defect. Superadmin has only its own door.

---

## P0 · Daily pre-flight (5 minutes, before any journey)

| # | Step | Expected | ✅/❌ | Observed |
|---|---|---|---|---|
| 0.1 | Open `https://dev.healthclouda.com` | Landing page loads, valid padlock | | |
| 0.2 | Logged out, open `/patient` | Redirected to `/signin` | | |
| 0.3 | Logged out, open `/demo-clinic/doctor` | Redirected to the org sign-in, never the dashboard | | |
| 0.4 | Open `/demo-clinic` | Org landing page shows the clinic's name/branding | | |
| 0.5 | Open DevTools → Console on the landing page | No red errors | | |
| 0.6 | Note today's date and the latest `develop` merge you are testing | Recorded | | commit: ________ |

---

## FE-J1 · Receptionist — walk-in to portal account

*Mirrors backend J1. The single most important journey: it is how every real patient enters.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 1.1 | Sign in at `/demo-clinic/signin` as the receptionist | Lands on the receptionist dashboard, name shown in the shell | ✅ | | |
| 1.2 | Read the Overview stat tiles | **Every tile shows a number** — never `—`, `NaN` or blank | ✅ | | |
| 1.3 | Patient Search → Register patient **with** email | Success; the **HealthClouda ID is shown on screen** to hand over (#107). **Record it** | ✅ | | HCL-ID: ________ |
| 1.4 | Register a patient **without** email, phone only | Succeeds; HCL-ID shown | ✅ | | HCL-ID: ________ |
| 1.5 | Register with **neither** email nor phone | Refused with a **readable** message — not "Request failed (HTTP 400)" | ✅ | | |
| 1.6 | Search for the 1.3 patient by surname (≥ 3 characters) | Found; phone shown masked | ✅ | | |
| 1.7 | Search with 2 characters | Told the minimum, not an empty result that looks like "no patient" | ✅ | | |
| 1.8 | Open the 1.4 patient → Portal & contact → add an email → Send portal invite | Success message; panel now shows the patient has a portal account | ✅ | | |
| 1.9 | Try to set a patient's email to a **staff** address (e.g. the doctor's) | Refused, with the backend's sentence *"already linked to another account"* shown | ✅ | | |
| 1.10 | Repeat 1.9 with different letter case | Refused identically | ✅ | | |
| 1.11 | Open patient A's panel, type in the check-in reason, then open patient B **without closing** | Patient B's form is **empty** — nothing carries over | ⏳ #137 | | |
| 1.12 | Check a patient in **with no reason typed** | Checked in; queue number shown. 🔴 **#137's P1 predicts a 400 here** | ⏳ #137 | | queue #: ________ |
| 1.13 | Check the same patient in again | Refused: *"already has an active check-in"* — the words, not a generic error | ⏳ #137 | | |
| 1.14 | Check-ins page → filter by status **In Progress** | Filter works; there is no "Called" option | ⏳ #137 | | |
| 1.15 | Work the queue: Call in → Complete; another patient → No-show | Status badge updates each time, row stays correct | ⏳ #137 | | |
| 1.16 | Book an appointment for the patient | — | ❌ | | *Not built in the UI (backend J1 1.13 exists)* |
| 1.17 | Assign a doctor to a patient | Success, or a readable refusal if they already have an active episode | ✅ | | |
| 1.18 | Referrals page | Loads; received referrals listed or a clear empty state | ✅ | | |

> 📋 **1.3/1.4 are the front-desk handover.** An email-less patient is **only ever told their HCL-ID
> on this screen.** If it is hard to read or copy, log it — that fails the patient as hard as a bug.

---

## FE-J2 · Patient portal

*Mirrors backend J2. Uses `patient@demo.test`; the FE-J1 invite can't be completed without a mailbox.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 2.1 | Open the set-password link from 1.8's email | — | ⚠️ | | *Needs mailbox access — UNTESTED unless someone has it. This is T7 on beta* |
| 2.2 | Sign in at `/signin` as the patient | Lands on `/patient` — **not** an "organization could not be determined" error (FLAG-210) | ✅ | | |
| 2.3 | Overview | Name, HCL-ID and tiles render with values | ✅ | | |
| 2.4 | My Health | Own records only; empty sections say so rather than erroring | ✅ | | |
| 2.5 | Appointments | Lists own appointments or a clear empty state | ✅ | | |
| 2.6 | Access & Referrals | Lists access requests with their status | ✅ | | |
| 2.7 | **Approve or deny an access request in the app** | — | ❌ | | *🔴 Not built: this tab is read-only. The sprint plan requires in-app approval. Today consent works only through the emailed link (FE-J8)* |
| 2.8 | Resize to phone width (~390px) | Patient dashboard **stays usable** — it is the one dashboard meant to be responsive | ✅ | | |
| 2.9 | Edit the URL to `/demo-clinic/doctor` | Refused/redirected — never a staff dashboard | ✅ | | |
| 2.10 | Sign out, press Back | No patient data visible from the browser cache | ✅ | | |

---

## FE-J3 · Doctor — clinical workflow

*Mirrors backend J3.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 3.1 | Sign in as the doctor | Doctor dashboard | ✅ | | |
| 3.2 | Toggle duty on, reload the page | The toggle **stays** in its new state after reload | ✅ | | |
| 3.3 | Overview tiles | All show values (FLAG-227 was two blank tiles here) | ✅ | | |
| 3.4 | My Patients → New episode on a patient | Episode created; appears under Episodes | ✅ | | |
| 3.5 | Open New episode for patient A, type in it, close, open for patient B | Form is empty for B (FLAG-028) | ⏳ #130 | | |
| 3.6 | Add a note to an episode | — | ❌ | | *Not built in the UI* |
| 3.7 | Write a prescription | — | ❌ | | *Not built in the UI — cancel exists, create does not* |
| 3.8 | Cancel a prescription you issued | Cancelled; status updates | ✅ | | |
| 3.9 | Complete an episode | Moves to completed | ✅ | | |
| 3.10 | Appointments | Dates and times actually render — not blank cells (FLAG-213) | ✅ | | |
| 3.11 | Sign in as `doctor.other@demo.test` → My Patients | **None** of the demo-clinic patients appear | ✅ | | 🔴 isolation |

---

## FE-J4 · Nurse — vitals, wards, admissions

*Mirrors backend J4.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 4.1 | Sign in as the nurse; Overview | Tiles show values | ✅ | | |
| 4.2 | Record vitals for a patient | Saved; appears in Vitals with the right time | ✅ | | |
| 4.3 | Submit vitals with **every field empty** | Refused in the UI (backend FLAG-533 accepts an all-null record) | ✅ | | |
| 4.4 | Ward Overview | Wards and bed occupancy render; numbers agree with the beds shown | ✅ | | |
| 4.5 | My Patients → Admitted column | Date plus length of stay, e.g. `(13d)` | ✅ | | |
| 4.6 | Admit a patient to a free bed | Bed shows occupied | ⏳ #139 + #142 | | |
| 4.7 | Admit a second patient to the same bed | Refused with a readable message | ⏳ #139 + #142 | | |
| 4.8 | Admit to a gender-mismatched ward | **Warns and lets you override** — not a hard block | ⏳ #139 + #142 | | |
| 4.9 | Transfer, then discharge | Both beds update; discharged bed is freed | ⏳ #139 + #142 | | |

---

## FE-J5 · Org admin — staff, patients, referrals

*Mirrors backend J5.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 5.1 | Sign in as the org admin; Dashboard | Tiles show values | ✅ | | |
| 5.2 | Staff → Invite staff member | Created; appears in the list | ✅ | | |
| 5.3 | Deactivate a staff member | — | ❌ | | *Not built in the UI* |
| 5.4 | Patients | List pages correctly past the first 20 | ✅ | | |
| 5.5 | Wards & Beds | Renders | ✅ | | |
| 5.6 | Access Requests | **Read-only**, by design — there is no approve button (A6: approving here bypassed patient consent) | ✅ | | |
| 5.7 | Referrals → accept an incoming referral, with *create episode* ticked | Accepted; status shows **Accepted**, not Pending | ✅ | | |
| 5.8 | Decline a different referral | Declined with the note you wrote | ✅ | | |
| 5.9 | Notifications, Settings | Show a "coming soon" placeholder — **not** a broken page | ✅ | | |
| 5.10 | Logged out, open `/demo-clinic` → Health Announcements | — | ❌ | | *Not built: `src/app/[slug]/page.tsx` renders a **hardcoded** empty state "until backend#69 ships" — but backend J5 5.8 verified the public endpoint **live on 27 Aug**. The UI is waiting on something that already shipped* |

---

## FE-J6 · Superadmin

*Mirrors backend J6.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 6.1 | Sign in at `/superadmin/signin` | Superadmin dashboard | ✅ | | |
| 6.2 | Try the same account at `/signin` and `/demo-clinic/signin` | Refused at both | ✅ | | |
| 6.3 | Dashboard tiles | All show values (FLAG-222 was three blank tiles here) | ✅ | | |
| 6.4 | Recent activity feed | **No clinical free text** — no complaints, diagnoses or notes | ✅ | | 🔴 |
| 6.5 | Organisations → create, edit, then suspend and reactivate a test org | Each succeeds and the status badge updates | ✅ | | |
| 6.6 | Users → create a user; resend setup; deactivate/reactivate | Each succeeds | ✅ | | |
| 6.7 | Audit Logs | Rows render; paging works | ✅ | | |
| 6.8 | Records, Billing, Messages, Settings | "Coming soon" placeholder, not a broken page | ✅ | | |

---

## FE-J7 · Referral end to end — the wedge feature 🔴

*Mirrors backend J7. The demo runs on this, and the backend only proved it through the API.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 7.1 | As the doctor: My Patients → **Refer** a patient | Referral panel opens for that patient | ⏳ #130 | | |
| 7.2 | Search the receiving organisation by name, then by city | Results show name **and** city; typing 1 character asks for more | ⏳ #130 | | |
| 7.3 | Try to send without ticking both consent confirmations | Send stays disabled | ⏳ #130 | | |
| 7.4 | Fill the required fields, tick both, send to `other-clinic` | "Referral created" — **record the letter number** if shown | ⏳ #130 | | letter: ________ |
| 7.5 | If the letter failed to generate | The panel stays open and offers **Retry**; it does not claim success | ⏳ #130 | | |
| 7.6 | Refer a patient who cannot be referred (e.g. recorded deceased), if the data allows | A **readable** reason — #130's review predicts a bare "HTTP 400" | ⏳ #130 | | |
| 7.7 | Doctor → Referrals | The new referral shows under outgoing | ✅ | | |
| 7.8 | As `orgadmin.other@demo.test` → Referrals | The referral appears as incoming; **accept** with create-episode ticked | ✅ | | |
| 7.9 | As `doctor.other@demo.test` | Can see it, but has **no accept button** (the receiving org admin accepts) | ✅ | | 🔴 |
| 7.10 | As `doctor.other@demo.test` → My Patients / Episodes | The referred patient's new episode is there | ✅ | | |
| 7.11 | Receptionist at `other-clinic` → Referrals → notify doctors | — | ❌ | | *Not built in the UI — `REC_NOTIFY_DOCTORS` is defined in `config.ts` and has no caller* |
| 7.12 | Patient → Access & Referrals | Their referral is listed | ✅ | | |

---

## FE-J8 · Consent by emailed link

*The only consent path a patient has today (see 2.7).*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 8.1 | Open `/access-request/respond?token=<a real token>` | Shows **what** is being requested and **by which organisation** — and nothing is decided just by opening it | ✅ | | |
| 8.2 | Reload the page | Still undecided — opening the link twice must not approve anything | ✅ | | |
| 8.3 | Choose **Deny** | Confirmation shown; the organisation still has no access | ✅ | | |
| 8.4 | Open the same link again | Tells you it was already answered — no second decision | ✅ | | |
| 8.5 | Open with a broken token (change one character) | A clear "invalid or expired" page, no crash | ✅ | | |

---

## FE-J9 · Isolation through the browser 🔴

*T3 proves the gate in unit tests against a mocked `/auth/me/`. **Nobody has walked it on the
deployed app** (open since 2026-09-08). These steps close that.*

| # | Step (UI) | Expected | Avail. | ✅/❌ | Observed |
|---|---|---|---|---|---|
| 9.1 | Signed in as the demo-clinic doctor, edit the URL to `/other-clinic/doctor` | Refused/redirected — never the other org's dashboard | ✅ | | 🔴 |
| 9.2 | Signed in as the doctor, edit the URL to `/demo-clinic/org-admin` | Refused — never another role's dashboard | ✅ | | 🔴 |
| 9.3 | DevTools → Application → Cookies: change the **role** inside `hc_user` to `ORGANIZATION_ADMIN`, reload `/demo-clinic/org-admin` | Still refused (FLAG-001 — the cookie is display-only) | ✅ | | 🔴 |
| 9.4 | Same, but change the org slug inside `hc_user` and visit that org | Still refused | ✅ | | 🔴 |
| 9.5 | Delete `hc_access_token` only, then use the dashboard | Session recovers or signs out cleanly — no half-rendered data | ✅ | | |
| 9.6 | Leave a dashboard idle over an hour, then click around | **Not** logged out (FLAG-001's hourly-logout regression) | ✅ | | |

---

## Daily page sweep — every page, every day

*Next week's core loop. Faster than the journeys and catches the stat-tile class of bug.*

**For every page below, check all six:**

1. **Loads** without an error screen, and nothing in the console is red
2. **Tiles and tables carry values** — no `—`, `NaN`, `undefined` or blank cells where data exists
3. **Empty state reads as empty**, not as an error
4. **Paging** reaches page 2 where there is more than one page
5. **Keyboard**: Tab reaches every control, focus is visible, Esc closes panels
6. **Below 768px**: staff dashboards show the small-screen notice **and render no records**; the patient dashboard stays responsive

| Role | Pages | Mon | Tue | Wed | Thu | Fri |
|---|---|---|---|---|---|---|
| Superadmin | Dashboard · Organisations · Users · Audit Logs · *(Records · Billing · Messages · Settings = placeholders)* | | | | | |
| Org admin | Dashboard · Staff · Patients · Wards & Beds · Access Requests · Referrals · *(Notifications · Settings = placeholders)* | | | | | |
| Doctor | Overview · My Patients · Episodes · Appointments · Referrals · Prescriptions | | | | | |
| Nurse | Overview · My Patients · Vitals · Ward Overview | | | | | |
| Receptionist | Overview · Check-ins · Appointments · Patient Search · Referrals | | | | | |
| Patient | Overview · My Health · Appointments · Access & Referrals | | | | | |
| Public | `/` · `/signin` · `/demo-clinic` · `/demo-clinic/signin` · `/superadmin/signin` · `/forgot-password` | | | | | |

Mark each cell ✅, or the defect ID it raised.

---

## Defect log

Copy a row per deviation. **Every ❌ above must appear here** — an unlogged failure is a pass by
Friday. At triage, each row gets a FLAG number and moves to `CODEBASE_FLAGS.md`.

| ID | Day | Journey/step or page | What happened | Expected | Severity | FLAG | Status |
|---|---|---|---|---|---|---|---|
| FE-U-01 | | | | | | | |

**Severity:** 🔴 blocks beta — PHI exposure, isolation break, or a role cannot do its job · 🟠 degrades
a journey but has a workaround · 🟡 cosmetic.

---

## Known gaps going in — so nobody logs them as new

Found while writing this checklist (2026-09-13). They are **❌ in the tables above**, not defects to
rediscover:

| Gap | Where | Backend supports it? |
|---|---|---|
| 🔴 **Patient cannot approve/deny consent in the app** — only via the emailed link | FE-J2 2.7 | Yes — and the sprint plan requires it |
| Receptionist cannot book appointments | FE-J1 1.16 | Yes (backend J1 1.13) |
| Doctor cannot write a prescription or an episode note | FE-J3 3.6, 3.7 | Yes (backend J3 3.5, 3.6) |
| Org admin cannot deactivate staff | FE-J5 5.3 | Yes (backend J5 5.5) |
| Receptionist cannot notify doctors of a referral — endpoint constant exists, no caller | FE-J7 7.11 | Yes |
| 🟠 **Org landing shows a hardcoded "No announcements" forever**, citing backend#69 as pending | FE-J5 5.10 | **Yes — verified live 27 Aug (backend J5 5.8).** Likely a stale code comment; check backend#69 before building |
| Check-in, referral create, admissions — **built but unmerged** | ⏳ rows | Yes |

---

## Sign-off

| | Mon 14 | Tue 15 | Wed 16 | Thu 17 | Fri 18 |
|---|---|---|---|---|---|
| Build tested (commit) | | | | | |
| Journeys attempted / passed | | | | | |
| Pages swept / clean | | | | | |
| New 🔴 defects | | | | | |
| Run by | | | | | |

🔴 **A journey with an open 🔴 defect is not "passed".** And a green week here is a rehearsal on `dev.` —
it moves nothing in `BETA_READINESS.md`'s 🎯 items until the same run passes on `beta.`.
