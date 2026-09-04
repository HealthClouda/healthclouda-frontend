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
| @Qeeyat | **T5 harness — Nurse (DASH-3) rendered; Patient (DASH-6) wired** | `feat/t5-nurse-patient` | `e2e/design/roles.spec.ts` (+5 baselines), `e2e/design/helpers.ts`, `docs/DESIGN-VERIFICATION.md`, `docs/ARCHITECTURE.md`, `CODEBASE_FLAGS.md`, `.env.example` | 2026-09-04 | 🟡 **PR #128 — awaiting @Bastoh's review.** **Nurse rendered for the first time; its stats contract is CLEAN** (11/11). Raised **FLAG-229/230/231**, re-measured **FLAG-212** (P3→P2), resolved **FLAG-225**. ⛓️ Based on `docs/merge-99-100-in-flight` |
| @Qeeyat | **Clear #99/#100 + the 3 Sep handover** | `docs/merge-99-100-in-flight` | `HANDOFF.md`, `CODEBASE_FLAGS.md`, `docs/ARCHITECTURE.md`, `HANDOFF-Qeeyat.md` | 2026-09-03 | 🟡 **PR #126 — awaiting @Bastoh's review.** Docs only. Rebased onto `develop` 2026-09-04 after six merges |
| @Qeeyat | **FLAG-222** — Superadmin stat tiles onto the fields the API sends | `fix/flag-222-dashboard-stats` | `SuperadminDashboard`, `types/dashboard.ts` | 2026-08-29 | 🔴 **PR #109 — CHANGES_REQUESTED**, and **CONFLICTING**. **Needs FLAG-227 (Doctor) and FLAG-231 (Patient) folded in or sequenced after** — all three are the same bug class |
| @Qeeyat | **Issue #101** — HCL-ID handout at registration | `feat/issue-101-hcl-id-handout` | `receptionist/*`, `types/dashboard.ts` | 2026-08-29 | 🔴 **PR #107 — CHANGES_REQUESTED.** 🎯 **The fix is probably known now** — #123 recorded that `POST /patients/` returns the identifiers **nested**: `response.patient.healthclouda_id`, not `response.healthclouda_id` |
| @Bastoh | **FLAG-024** — repair the stale e2e specs | `fix/flag-024-stale-e2e-specs` | `e2e/auth.spec.ts`, `e2e/landing.spec.ts`, `CODEBASE_FLAGS.md`, `HANDOFF.md` | 2026-09-01 | ✅ **PR #118 — APPROVED 2026-09-04** (@Qeeyat's change request cleared: verified **13/13** on a trial merge). 🔴 **Now CONFLICTING — needs a rebase.** ⚠️ Also flaky on a **cold** `next dev` (30s default timeout); matters because CI is always cold |
| @Bastoh | **Session log 3 Sep** | `docs/session-log-bastoh-2026-09-03` | `HANDOFF-Bastoh.md` | 2026-09-03 | ✅ **PR #127 — APPROVED 2026-09-04.** 🔴 **Now CONFLICTING** with #122/#124 on `HANDOFF-Bastoh.md` — needs a rebase; @Bastoh's branch, not mine to force-push |
| @Bastoh | **B4** — promote `develop` → `staging` | `develop` → `staging` | branch promotion | 2026-08-28 | ✅ **PR #98 APPROVED — deliberately held.** `[INFRA]` lane + beta runbook ordering: the `staging`-scoped `NEXT_PUBLIC_API_URL=api-beta` override goes in **first**, domain second. **@Bastoh's call** |
> 📌 **Issue #101 is assigned to @Qeeyat:** the HCL-ID handout is buildable after all — `POST /patients/`
> returns `{message, patient:{id, healthclouda_id}}`. FLAG-216 was derived from a schema that documents
> the *request* serializer as the response.

🎉 **A5/FLAG-001 is closed on `develop`.** **#99** and **#100** were reviewed and merged **2026-09-03 by @Qeeyat**, in that order, as merge commits — the sprint plan's one *must-close-before-PHI* item and the patient portal stacked behind it. `develop` after both: **tsc clean · lint clean · 211/211 across 23 files · build green · middleware 35.8 kB**, verified on the merge commits themselves from a clean `.next`, not from either PR body. Authorization is no longer decided from the client-writable `hc_user` cookie anywhere in the app, the route slug is now checked against the user's own organisation, and **patients can sign in for the first time.**

> ⛓️ **The stack merged safely and the pattern is now evidenced twice.** GitHub retargeted **#100** onto `develop` *before* auto-deleting #99's branch, so the child survived. The trap in this file is specifically `gh pr merge --delete-branch`, which removes the base out from under the child first — not auto-delete after a retarget.

*Cleared on merge: **#99** A5/FLAG-001 server-trusted auth · **#100** FLAG-210 patient portal (both merged 2026-09-03 by @Qeeyat, locally, with the `CODEBASE_FLAGS.md` conflict resolved additively in flag-number order — both sides kept, proven by a heading diff against each parent) · **#111** `CLAUDE.md` §3 branch-protection correction + FLAG-021 (merged 2026-09-02 by @Bastoh) · **#114** In Flight cleanup + session log · **#115** T5 pass + FLAG-227 (both merged 2026-09-01 by @Qeeyat) · **#96** schema-reading guidance — **CLOSED 2026-08-31, not merged**: fixed at source instead. · Earlier: **#116** E8/FLAG-006 CI + ESLint gating · **#117** B7 coverage · **#113** + **#119** @Bastoh session logs · **#112** stale-doc sweep (ARCH-7 closed) — all five **reviewed and merged 2026-09-01 by @Qeeyat**, as merge commits. `develop` after all five: **tsc clean · lint clean (the new gate) · 192/192 · build green · middleware 35.4 kB**. Earlier the same round: **#106** FLAG-203/221 small-screen gate · **#110** FLAG-223/224/225/226 Patient contract audit · **#108** Gate 2 assessment · **#105** session log 29 Aug — merged 2026-08-31, each trial-merged and verified locally before merging rather than from the PR body (**192/192**). **#106 closed the worst PHI exposure in the repo** — staff dashboards no longer mount, fetch, or put records in the DOM below 768px. · **#97** In Flight cleanup + FLAG-017/018/019 · **#102** `SECURITY_BASELINE.md` (A7) · **#103** E7/FLAG-005 server-fetch observability · **#104** FLAG-220 Org Admin referrals page — all four **reviewed and merged 2026-08-30 by @Qeeyat**, as merge commits, each re-verified locally before merging rather than from the PR body (`develop` after all four: tsc clean, **171/171**, build green, middleware 35.4 kB). #104 closes the referral hole FLAG-220 described — the journey can now be accepted. · **A2/A3/A4/A6** Tier-1 infra batch — PR #65 · **FLAG-010** — PR #66 · **FLAG-011

*Cleared on merge: **#111** `CLAUDE.md` §3 branch-protection correction + FLAG-021 — **merged 2026-09-02 by @Bastoh as a merge commit** (`88ae5ad`) after a rebase off a 31-commit-stale base; `develop` after it: **tsc clean · lint clean · 192/192 · build green**. · **#116** E8/FLAG-006 CI + ESLint gating · **#117** B7 coverage · **#113** + **#119** @Bastoh session logs · **#112** stale-doc sweep (ARCH-7 closed) — all five **reviewed and merged 2026-09-01 by @Qeeyat**, as merge commits. `develop` after all five: **tsc clean · lint clean (the new gate) · 192/192 · build green · middleware 35.4 kB**. Earlier the same round: **#106** FLAG-203/221 small-screen gate · **#110** FLAG-223/224/225/226 Patient contract audit · **#108** Gate 2 assessment · **#105** session log 29 Aug — merged 2026-08-31, each trial-merged and verified locally before merging rather than from the PR body (**192/192**). **#106 closed the worst PHI exposure in the repo** — staff dashboards no longer mount, fetch, or put records in the DOM below 768px. · **#97** In Flight cleanup + FLAG-017/018/019 · **#102** `SECURITY_BASELINE.md` (A7) · **#103** E7/FLAG-005 server-fetch observability · **#104** FLAG-220 Org Admin referrals page — all four **reviewed and merged 2026-08-30 by @Qeeyat**, as merge commits, each re-verified locally before merging rather than from the PR body (`develop` after all four: tsc clean, **171/171**, build green, middleware 35.4 kB). #104 closes the referral hole FLAG-220 described — the journey can now be accepted. · **A2/A3/A4/A6** Tier-1 infra batch — PR #65 · **FLAG-010** — PR #66 · **FLAG-011
logged** (docs only — see the correction below) — PR #68 · **D1 shared shell**
(DashboardShell/StatCard/DataTable/Badge) — PR #67 · **D1 overlays**
(SlidePanel/Modal/Toaster/EmptyState/SmallScreenGate) — PR #69 · In Flight row cleared — PR #70 ·
**docs: `api-dev` seeding + FLAG-010 live + `CLAUDE.md` ritual fix** — PR #72 (all merged
2026-08-12/13) · **Token cleanup** (Button/ErrorState/Pagination onto dashboard tokens) — PR #77 ·
**D1 Superadmin pages + T5 harness** — PR #76 (both merged 2026-08-17) · **D2 Org Admin** (staff
invite + read-only access requests) — PR #78 · **FLAG-013/014/015** (logged from reviewing
#76/#77/#78) — PR #79. Both merged 2026-08-19 · **#85** Org Admin payload shapes · **#86** D3 Nurse + `useAllPages()` · **#93** session log 24 Aug + FLAG-215 · **#95** D5 episode create + FLAG-219/220 · **#94** D4 Receptionist (all reviewed and merged 2026-08-28 by @Bastoh; #93 and #95 merged locally with additive `CODEBASE_FLAGS.md` conflict resolutions, nothing dropped) · **#84** superadmin signin reachable when logged out · **#87** FLAG-213 · **#88** session log · **#89** Gate 1 assessment · **#90** E1/FLAG-004 + FLAG-213 doctor half · **#91** D5 design migration (all reviewed and merged 2026-08-23 by @Bastoh; #90 merged via merge commit so #91 retargeted cleanly).*

> ⚠️ **Correction (2026-08-17):** this line previously read *"**FLAG-011** token contrast — PR #68"*,
> which reads as though the contrast problem was **fixed**. It was not. PR #68 was docs-only and
> merely *logged* the flag; the failing token values are unchanged and still live, and FLAG-014 and
> FLAG-015 are the same problem at other call sites. **"Cleared on merge" means the In Flight row was
> cleared — never that the underlying issue was resolved.** Worth stating because it misled a review
> this session.

⚠️ **Contract-first ordering (sprint plan Part 3):** E2/E3 must land **before** D4/D6 style them.
A design PR built on the wrong data shape is a rewrite — if that order slips, say so in this table.

---

## 📥 Cross-Lane Asks — what is waiting on the other dev (added 2026-09-01)

> **The inbox.** 🚧 In Flight says *what I am doing*. This says *what is waiting on you.* They are
> different questions, and until today **nothing in this repo answered the second one.**
>
> **The rule: an escalation is not delivered until a row exists here.** Writing it in
> `CODEBASE_FLAGS.md` is a catalogue entry. Writing it in your own session log is narrative. Saying
> it out loud is nothing at all — **the other dev's assistant has no memory of your session, only the
> text you leave in a place they are told to look.** Adding a row is one line; skipping it is how a
> gate goes unnoticed.
>
> **Raise a row when** the work belongs to the other lane: it needs infra, secrets or spend you don't
> hold, it's a product or design call, or it blocks you. **One sentence and a link** to the detail
> (FLAG-xxx, PR, issue) — don't restate it here.
>
> **The owner clears the row, not the raiser.** ✅ Mark it done *and say where it landed* (PR number,
> doc section, FLAG). If the ask also has a GitHub issue, **closing the issue is part of clearing the
> row** — a row marked done while its issue stays open means the tracker says finished and GitHub
> says open, and GitHub is what sends the email.
>
> **Read your own rows at session start** — they arrive with `HANDOFF.md`, ritual step 2. An open row
> may outrank whatever you planned to start.
>
> 🎯 **Why this exists, concretely.** On 29 Aug @Qeeyat's Gate 2 said of the T6 journeys: *"I cannot
> tell from this repo whether it happened… this needs an answer from the backend team, not a guess
> from me."* The answer was already written down — in the **backend** repo's `docs/UAT-CHECKLIST.md`,
> by @Bastoh, four days earlier. She waited three days on something that existed the whole time, in a
> folder she does not open. **Ported from the backend repo, which has had this table since
> 2026-07-31.**

| For | From | Ask | Why it's theirs | Blocking? | Raised | Status |
|---|---|---|---|---|---|---|
| @Bastoh | @Qeeyat | **Send `E2E_NURSE_EMAIL` / `E2E_NURSE_PASSWORD`** out-of-band (never into this repo — **it is public**) | Credentials only he holds | 🔴 **Nurse and Patient are the only two dashboards nobody has ever rendered.** Four of the other six turned out to be reading stat fields the API never sends | 2026-09-01 | ✅ **DONE 2026-09-04.** Sent, and they worked — the one failure was ours: an unquoted `#` in `.env.local` truncated the value (dotenv comment). **Nurse rendered, 6/6, stats contract CLEAN.** #128 |
| @Bastoh | @Qeeyat | **Fix #99 (A5/FLAG-001)** — the server gate logs every user out hourly | His branch, his lane | 🔴 The sprint plan's **must-close before PHI**, and **#100 is approved and stuck behind it** — until it lands patients cannot sign in at all | 2026-08-30 | ✅ **DONE.** Fixed 30 Aug, merged 3 Sep. A5 closed |
| @Bastoh | @Qeeyat | **Rebase #111 onto `develop`**, and fix its now-false *"there is still no CI"* clause while in there | Another dev's branch — she resolved both conflicts locally but **refused to force-push someone else's branch unattended** | 🟠 Approved but CONFLICTING. The resolution is written up in her handover below | 2026-09-01 | ✅ **DONE.** Merged 2026-09-02 (`88ae5ad`) |
| @Bastoh | @Qeeyat | **Wire CI into ruleset `11328360`'s required status checks** | Repo settings — owner only | 🟠 #116 merged so CI runs, but **the ruleset requires no checks**, so a green tick implies a gate that does not exist | 2026-09-01 | **OPEN** — and now **worse than thought**: see **FLAG-230**, stacked PRs run **no CI at all** (#100, #117, #119 each merged unchecked) |
| @Bastoh | @Qeeyat | **Decide #98** (`develop` → `staging`) | `[INFRA]` lane, and the beta runbook ordering is his call | 🟠 Held deliberately, **not forgotten**: the `staging`-scoped `NEXT_PUBLIC_API_URL=api-beta` override goes in **first**, domain second | 2026-08-31 | **OPEN** |
| @Qeeyat | @Bastoh | **Re-review #99** once the logout fix is pushed | Her change request stands until she clears it | 🔴 `dismiss_stale_reviews_on_push = false` — **pushing the fix did not clear the block**, and GitHub refuses a merge over a standing change request. Nothing behind #99 moves until she re-reviews | 2026-08-30 | ✅ **DONE 2026-09-03** — re-reviewed, approved, #99 then #100 merged as merge commits |
| @Qeeyat | @Bastoh | **#118 fix incoming** — her block was correct; "13/13" was the `chromium` project alone | His PR, his error | 🟢 Not blocking her | 2026-09-01 | ✅ **DONE 2026-09-04** — @Qeeyat re-reviewed and **APPROVED**; verified 13/13 on a trial merge. Now needs a rebase (CONFLICTING) |
| 🔌 backend | @Bastoh | **Does `api-beta` exist?** Both `api-beta.healthclouda.com` and `beta.healthclouda.com` were **NXDOMAIN** on 2026-09-01 | Their infra | 🔴 **Blocks the beta promotion.** We will not point `beta.` at `api-dev` — that is the tier-crossing that presents as *"the invite is broken"* | 2026-09-01 | **OPEN** — asked in backend [PR #160](https://github.com/HealthClouda/healthclouda-backend/pull/160) §7 |
| 🔌 backend | @Bastoh | **Publish response bodies in the schema** — of the 84 GETs documenting a `200`, **48 document no body** (57%), including `/auth/me/` and every dashboard stats endpoint | Only `drf-spectacular` annotations on their serializers can fix it | 🔴 **This is the root cause of four dashboards shipping stat tiles bound to fields the API never sends** | 2026-09-01 | **OPEN** — backend PR #160 §7 |
| 🔌 backend | @Bastoh | **A grace window for just-rotated refresh tokens** | SimpleJWT blacklist behaviour — **unfixable from our side**: the loser's request was already in flight before the winner's new token existed | 🟠 Symptom is a user logged out mid-consultation | 2026-09-01 | **OPEN** — backend PR #160 §7 |
| 🔌 backend | @Bastoh | **Tell them the UI half of T6 was never walked** — their `docs/UAT-CHECKLIST.md` records 20 blocked steps → 6, but **those steps are API-level `curl`** | Shared — they believe the journeys are proven end to end | 🟠 They may go into onboarding believing the UI is exercised | 2026-09-01 | **OPEN** — stated in backend PR #160 §7 |
| @Bastoh | @Qeeyat | **Send `E2E_PATIENT_EMAIL` / `E2E_PATIENT_PASSWORD`** out-of-band (never into this repo — **it is public**) | Credentials only he holds | 🔴 **Patient is the ONLY dashboard nobody has ever rendered.** Also confirms **FLAG-231** and settles **FLAG-226**, the candidate P0 in `BETA_READINESS.md`'s own Tier 1 | 2026-09-04 | **OPEN** — asked on #115, #116, #119, #121, #126 before this table existed |
| @Bastoh | @Qeeyat | **Rebase #127 and #118** — both approved, both now CONFLICTING | His branches; force-pushing another dev's branch is not something to do unattended | 🟠 Both are approved and ready otherwise. #118 also wants a longer timeout before it goes into CI — it is flaky on a **cold** `next dev` | 2026-09-04 | **OPEN** |
| @Bastoh | @Qeeyat | **One-line `ci.yml` fix for FLAG-230** — `branches: ['**']` | His lane, and it pairs with the required-checks flip | 🔴 Today every stacked PR reaches `develop` unchecked. **Tomorrow is PHI day and hotfixes are exactly the PRs that get stacked** | 2026-09-04 | **OPEN** |

> 📌 **Rows closed by the raiser, not the owner — 2026-09-04, deliberately and named here.** The rule
> above says *the owner clears the row*. @Qeeyat closed three of @Bastoh's rows (nurse credentials,
> fix #99, rebase #111) because all three are **verifiably landed** — merged commits and a rendered
> dashboard — and leaving them **OPEN** on the day before PHI would have been the more misleading
> error. Recording the deviation rather than making it silently, which is what the row above about
> claiming In Flight late does too. **@Bastoh: correct any of these if I have read them wrong.**

---

## 🚦 GATE 2 — assessment (due Fri 28 Aug · **run late, Sat 29 Aug, by @Qeeyat**)

> **Verdict: 🔴 NO-GO for onboarding Thu 3 Sep as the repo stands today.**
>
> Gate 2 asks one question — *"is every Tier-1 A-item evidenced or explicitly accepted in writing,
> and is `beta.` ready pending only the `api-beta` variable?"* (sprint plan, Week 3). The plan is
> explicit that **"If NO-GO, onboarding moves — decided here, not on 3 Sep."** This section is that
> question being asked; **the decision itself needs @Bastoh and the owner.**
>
> It was not run on Fri 28. Run here instead, **four days before real PHI arrives.**
>
> 🎯 **The diagnosis is the opposite of Gate 1's, and that matters more than the verdict.** Gate 1
> found work that did not exist — two dashboards unstarted. Gate 2 finds **eleven open PRs, six of
> them approved and mergeable right now**, and almost every gap below closes when they land. **This is
> a merge-throughput problem, not a build problem.** The verdict can flip over a weekend without
> anyone writing a feature — which is exactly why it needs saying today rather than Wednesday.

### Criteria, measured on `develop` @ `3765b62` (29 Aug)

| Gate 2 criterion | Result | Evidence |
|---|---|---|
| `tsc --noEmit` clean | ✅ | exit 0 |
| Suite green | ✅ | **155 passed / 19 files** |
| `npm run build` green | ✅ | builds |
| **Every Tier-1 A-item evidenced or accepted in writing** | ❌ | **2 of 8 open** — table below |
| **`beta.` ready, pending only the `api-beta` variable** | ❌ | `beta.healthclouda.com` **does not resolve**, and `staging` still holds the **12 Apr vanilla-JS app** until #98 merges |
| Week-3 test layers executed (T3/T4/T6/T7/T8) | ❌ | **0 of 5 complete** — table below |

### Tier-1 A-items — measured, not reported

| Item | State | Evidence |
|---|---|---|
| **A1** tier separation | 🟡 **partial** | `dev.healthclouda.com` → **200, valid TLS**, authenticates against `api-dev`. `beta.` **unresolvable**. Apex → 200, serving a **13 Jul** build (FLAG-018) |
| **A2** stale host purge | ✅ | **0** hits for `railway.app` in the *served* HTML and JS chunk — checked on the deployed artifact, not the source |
| **A3** cookie scoping | ✅ | signed in through the deployed proxy and read the jar: `hc_user`, `hc_access_token`, `hc_refresh_token` are **all host-only** (`dev.healthclouda.com`, no `Domain=`), all `Secure`. No cookie can cross to `beta.` or the apex |
| **A4** fail loud on missing config | ✅ | evidenced the hard way — it is what failed every Vercel build from #65 until the env vars were set |
| **A5 / FLAG-001** authz off the client-writable cookie | ❌ **OPEN** | **#99 is CHANGES_REQUESTED** — its server gate logs every user out after one hour (see FLAG-221). **This is the item the sprint plan marks "must close before PHI"** |
| **A6** org-admin consent bypass removed | ✅ | merged 2026-08-12 |
| **A7** `SECURITY_BASELINE.md` | ❌ **OPEN** | **the file does not exist on `develop`.** It is written and approved, in unmerged #102 |
| **A8** backend tiers `FRONTEND_URL` | ✅ | backend **#107 CLOSED** |

### 🔴 Added after the gate was first written: the dashboards have not been *looked at*

Running the T5 harness against `dev.` on the night of 29 Aug — **the first time any of these
dashboards had been rendered in a browser** — found a P1 in the first screenshot.

**FLAG-222: three of four Superadmin stat cards read fields the API has never returned.** Measured
live: the endpoint sends `total_orgs`, `active_records`, `monthly_revenue`; the UI reads
`total_organizations`, `active_organizations`, `total_patients`. On screen the **Organisations tile
renders `—` directly above a table listing three organisations.**

Three things make this a gate-level finding rather than a bug report:

1. **155 green tests did not catch it**, because the fixtures assert our own type. FLAG-221, a fourth
   time.
2. **The schema could not catch it** — `/superadmin/dashboard/` documents `200: No response body` and
   only *claims* in prose to "match the frontend contract".
3. **It is the third dashboard with this exact bug** — Org Admin (#85) and Nurse (NURSE-1) were the
   first two. The remaining unverified dashboards are Doctor, Receptionist and Patient, and **nothing
   currently in flight would find the same fault in them.**

⚠️ **So "all six dashboards merged" was never the same claim as "all six dashboards work."** Gate 1
measured the former. Nobody has yet measured the latter, four days out. **A T5 pass over the
remaining five roles is now the cheapest high-value thing on the board** — it is one evening, it
needs no new code, and it just paid for itself on the first run.

### The test layers week 3 was supposed to execute

| Layer | State |
|---|---|
| **T3** role-gate & tenant isolation | 🟡 written, **unmerged** (#99). Covers DOCTOR only — one role of six |
| **T4** PHI leakage | 🟡 partial. FLAG-203's client channel closed in unmerged #106; **the server-rendered channel is still open** — a phone still receives staff PII and aggregate clinical counts, byte-identical to a desktop |
| **T6** role-journey UAT | ❌ **`docs/UAT-CHECKLIST-FE.md` was never written.** It was scheduled to be authored in week 2 and executed in week 3. Week 3 has passed |
| **T7** live-env probes (the emailed-link tier test) | ❌ not run. It cannot be fully run until `beta.` exists |
| **T8** accessibility & performance | ❌ not run |

⚠️ **On T6 specifically, stated as a question rather than a claim:** the backend's UAT week (24–28 Aug)
was scheduled to run role-by-role *through this UI*. **I cannot tell from this repo whether it
happened** — the checklist that was meant to script it does not exist, and no defect log from it
appears here. If it did run, its findings need to land somewhere before Thursday. **If it did not, we
would be onboarding onto journeys nobody has walked end to end.** @Bastoh — this needs an answer from
the backend team, not a guess from me.

### 🔴 What actually stands between today and Thursday

Ordered by what unblocks most, not by effort:

1. 🔴 **Merge the six approved PRs.** #97, #98, #100, #102, #103, #104 are reviewed and mergeable
   **today**. That alone closes **A7**, stands up `staging`, makes patients able to sign in, and gives
   FLAG-005 observability. ⛓️ **#99 must merge as a merge commit, not a squash** — #100 is stacked on it.
2. 🔴 **#99 needs its session fix.** A5 cannot close without it, and A5 is the "must close before PHI"
   item. The regression is small and understood (`middleware.ts:49` documents the invariant it breaks);
   the fix is an architecture choice about where the refresh happens.
3. 🟠 **Then re-promote `staging` and attach `beta.`, in that order** — set the `staging`-scoped
   `NEXT_PUBLIC_API_URL` to `api-beta` **before** attaching the domain, or `beta.` serves the beta host
   against the dev backend. Both failure modes here are silent.
4. 🟠 **Answer the T6 question above**, and land whatever UAT produced.
5. 🟠 **FLAG-203's server channel** — closeable only after #99/#100 stop moving the six `page.tsx`
   files, or explicitly accepted in `SECURITY_BASELINE.md` naming exactly what a phone still receives.

### The decision this gate exists to force

**The plan says onboarding slips or holds is decided here, not on onboarding morning.** On today's
evidence I would not put real patient data on this build: authorization is still decided from a
client-writable cookie on `develop`, and the security baseline that would let us accept the remaining
risks in writing is not merged.

**But the honest framing is that this is recoverable in days, not weeks**, and mostly by merging work
that is already written and already reviewed. What is needed is a decision about **Sunday and Monday**
— what merges, in what order, and who is available — rather than a decision to move 3 Sep.

**That call is @Bastoh's and the owner's. I have measured; I have not chosen.**

### 📌 Update 2026-09-03 — what has closed since this gate was measured

> The tables above are a **record of what was true on 29 Aug** and are deliberately not rewritten.
> This is what has changed since, so nobody re-reads the verdict as current.

| Gate 2 finding | Then (29 Aug) | Now (3 Sep) |
|---|---|---|
| **A5 / FLAG-001** — authz off the client-writable cookie | ❌ OPEN, #99 CHANGES_REQUESTED | ✅ **CLOSED** — #99 merged today, hourly-logout regression fixed and evidenced |
| **A7** `SECURITY_BASELINE.md` | ❌ "does not exist on `develop`" | ✅ **CLOSED** — #102 merged 2026-08-30 |
| **FLAG-210** — patients cannot sign in | blocking, #100 stuck behind #99 | ✅ **CLOSED** — #100 merged today |
| Suite green | 155 passed | **211 passed / 23 files**, plus lint and CI gating (#116) |
| Merge backlog — *"eleven open PRs, six approved and mergeable"* | the stated root cause | **11 open**, but only **#98** is approved-and-waiting; six are @Bastoh's, opened 1–3 Sep, awaiting @Qeeyat |

**The verdict itself has not been re-run, and this note does not flip it.** Gate 2's second criterion
— *`beta.` ready pending only the `api-beta` variable* — is still ❌: `beta.healthclouda.com` does not
resolve, and #98 is still held. **T6/T7/T8 remain unexecuted.** What has changed is that the item the
sprint plan marked *must-close before PHI* is now closed, so the remaining gap is deployment and test
layers rather than authorization.

⚠️ **Two dashboards — Nurse and Patient — have still never been rendered by anyone.** Patient is now
*reachable* for the first time (#100), which removes the blocker but is not the same as having looked
at it. Nurse still needs `E2E_NURSE_EMAIL` / `E2E_NURSE_PASSWORD` from @Bastoh. Four of the six
dashboards that *have* been rendered turned out to be reading stat fields the API never sends
(FLAG-222, FLAG-227, and two before them).

> 📌 **Update 2026-09-04 — half of this is now done.** **Nurse has been rendered** (T5, `roles.spec.ts`,
> 6/6 green) and its stats contract is **clean**: `NurseStats`' eleven fields are eleven for eleven
> against a live `GET /nurse/dashboard/stats/`. **So the count stays "four of six", not five of
> seven** — the first dashboard to break the streak. `E2E_NURSE_*` did arrive; the value simply
> needed quoting in `.env.local` (an unquoted `#` truncates it — see `docs/DESIGN-VERIFICATION.md`).
>
> ⏸️ **Patient is now the ONLY dashboard nobody has ever rendered.** It is wired into the harness and
> skips cleanly; it needs `E2E_PATIENT_EMAIL` / `E2E_PATIENT_PASSWORD` and nothing else. **One
> message from @Bastoh closes the last of this gap.**

---


---

## 🌙 Session close — @Qeeyat, 2026-09-03. **Start here next session.**

> The 1 Sep handover below is now **spent**: its item 1 (fix #99) is done and merged. Read this
> block first, then that one only for the #111/#118/#96 history.

### ✅ What changed on `develop` on 2026-09-03

**A5/FLAG-001 is closed.** #99 then #100, merged in that order as merge commits by @Qeeyat, each
verified on the merge commit itself from a clean `.next` rather than from the PR body:

```
tsc clean · eslint clean · 211/211 across 23 files · build green
/patient present in the route tree · middleware 35.8 kB · CI green on develop
```

- Authorization no longer comes from the client-writable `hc_user` cookie **anywhere** in the app.
  Every dashboard gate calls `requireDashboardUser()`, which resolves identity from `GET /auth/me/`
  using the httpOnly token and checks **role *and* tenant**.
- `middleware.ts` now **resumes an aged-out session** itself and hands the new token to that same
  render — the hourly-logout regression @Qeeyat caught on 29 Aug, fixed and re-proven RED-first
  against the pre-fix middleware (`f4b4832`): **7 failed | 13 passed**.
- **Patients can sign in for the first time** (`/patient`, slug-less).

### 🔴 Do these first — in this order

| # | Action | Why it's first |
|---|---|---|
| 1 | **Merge #126** (this PR — docs, In Flight, FLAG-001/210 resolved, FLAG-228) | Everything below is written down there. Until it merges, `HANDOFF.md` on `develop` still shows #99 and #100 as open work, and the next reader plans around a blocker that no longer exists. Needs @Bastoh's review |
| 2 | ✅ **Nurse: DONE 2026-09-04** · ⏸️ **Patient: still nobody** | **Nurse rendered, 6/6 green, stats contract CLEAN** (11/11 fields) — the streak stays four of six. The run raised **FLAG-229** and re-measured **FLAG-212** to P2. **Patient is now the only dashboard nobody has ever rendered**: it is wired into `roles.spec.ts` and skips cleanly, and needs only `E2E_PATIENT_EMAIL` / `E2E_PATIENT_PASSWORD` from @Bastoh, out of band. *(Original row, for the record: "Render Nurse and Patient — nobody ever has … the cheapest high-value thing on the board and it has paid for itself on every run so far." It did again.)* |
| 3 | **Six of @Bastoh's PRs await @Qeeyat's review** — #120, #121, #122, #123, #124, #125 | #121 lands `BETA_READINESS.md`, one of the **two files `CLAUDE.md` §4 has demanded as required reading since day one and that have never existed here**. ⛓️ #124 is stacked on #122's branch — merge #122 as a merge commit, **without `--delete-branch`** |
| 4 | **@Qeeyat's own two are stale and still CHANGES_REQUESTED** — #109 (now conflicting, `CODEBASE_FLAGS.md` only) and #107 | Untouched since 30/31 Aug. #109 also needs FLAG-227 folded in or sequenced after it |
| 5 | **#98 — `develop` → `staging`** | Approved and **deliberately held**, not forgotten. `[INFRA]` lane: the `staging`-scoped `NEXT_PUBLIC_API_URL=api-beta` override goes in **first**, domain second. **@Bastoh's call** |
| 6 | **Wire CI into ruleset 11328360's required status checks** | Still outstanding from 1 Sep. CI runs, but the ruleset carries no required checks, so a green tick implies a gate that does not exist. Repo settings — only @Bastoh can do it |

### 📌 Three things worth knowing before touching anything

1. ⛓️ **Merging a stack parent by pushing a merge commit to `develop` is safe.** GitHub retargeted
   **#100** onto `develop` *before* auto-deleting #99's branch, so the child survived. The trap in
   this file is specifically **`gh pr merge --delete-branch`**, which removes the base out from under
   the child *first*. Two data points now: #116→#117 and #99→#100.
2. 🔴 **A red CI check is not automatically a real failure — see FLAG-228.** `npm run build` fetches
   `Lato` from Google Fonts at build time, and when that call flakes the **A4 fail-loud job** dies
   with `NextFontError`. It killed a check on #120 that has nothing to do with that diff. **Read the
   job log before believing a red X**, and self-host the font to end it.
3. 🟡 **`CODEBASE_FLAGS.md` is mis-filed from FLAG-215 down** — those entries sit *below* the
   "Resolved flags" heading while still being OPEN, because they were appended as raised. **Read each
   entry's Status line, not its position.** Left deliberately unsorted; it wants its own pass.

### ⚠️ What is still NOT true, so nobody reads the win too widely

- **Gate 2's verdict has not been re-run and does not flip on this.** A5 and A7 are closed, but
  `beta.healthclouda.com` **still does not resolve**, #98 is still held, and **T6 / T7 / T8 remain
  unexecuted**. What changed is that the remaining gap is deployment and test layers rather than
  authorization.
- **Nothing in #99 has been exercised against a live browser session on `dev.healthclouda.com`.**
  Every hour-boundary claim is asserted by unit tests against a mocked `fetch`. A click-through on
  the deployed dev tier is the cheapest remaining check on the highest-value change in the repo.
- **FLAG-020 (concurrent refreshes) is open and its residual window is real** — two tabs restored
  after an hour idle can still cost a session. Its *reasoning* about `<Link>` prefetch is wrong even
  though its conclusion holds today; the detail is on #99 and in `HANDOFF-Qeeyat.md`.

---

## 🌙 Handed over to @Bastoh — end of @Qeeyat's session, 2026-09-01

> Written because @Qeeyat is offline and everything below needs **@Bastoh**. Nothing here is
> blocked on @Qeeyat returning; all of it is blocked on him.

### 🔴 Do these first — in this order

| # | Action | Why it's first |
|---|---|---|
| 1 | **Fix #99 (A5/FLAG-001)** — its server gate logs every user out after an hour | It is the item the sprint plan marks **must-close before PHI**, and **#100 is approved and stuck behind it**. Until #100 lands, patients cannot sign in at all and DASH-6 cannot be rendered by anyone. ⛓️ merge #99 as a **merge commit** |
| 2 | **Send `E2E_NURSE_EMAIL` / `E2E_NURSE_PASSWORD`** (out-of-band, not in this repo) | **Nurse and Patient are the only two dashboards nobody has ever rendered.** Four of the other six turned out to be reading stat fields the API never sends. One message unblocks half of that gap |
| 3 | **Rebase #111 onto `develop`** | Approved, but now CONFLICTING. See the note below — the resolution is already known |
| 4 | **Wire CI into ruleset 11328360's required status checks** | #116 is merged, so CI runs — but the ruleset carries **no required status checks**, so a green tick currently implies a gate that does not exist. Repo settings; only you can do it |
| 5 | **Decide #98 (B4 `develop` → `staging`)** | Approved and held deliberately, not forgotten — `[INFRA]` lane and beta-runbook ordering. The `staging`-scoped `NEXT_PUBLIC_API_URL=api-beta` override goes in **first**, domain second |

### 📌 #111 — the resolution is already worked out, you just have to apply it

@Qeeyat rebased it locally onto `develop` and both conflicts resolved cleanly and **additively**:

- **`HANDOFF.md`** — In Flight rows: keep both sides, nothing dropped.
- **`CODEBASE_FLAGS.md`** — your FLAG-021 and the merged FLAG-022/023/024 collided. Keep both, **in flag-number order** (021 before 022).

The rebase succeeded and preserved your authorship. **Pushing it to your branch was refused** — force-pushing another dev's branch is not something an assistant should do unattended — so it is yours to redo. It is five minutes.

⚠️ **One thing to fix while you are in there:** #111's new `CLAUDE.md` text ends with *"there is still **no CI** (FLAG-006)"*. **#116 merged, so that clause is now false** before it has even landed.

### 🔴 Two reviews came back CHANGES_REQUESTED — both yours

- **#118** — "9 failing, now 13/13" is the `chromium` project alone. `npx playwright test` gives **24 passed / 2 failed** on the `mobile` project, reproducibly. It matters because this PR exists to unblock e2e-in-CI, and merged as green it puts the next person straight into a red-on-day-one suite. Two small fixes offered on the PR.
- **#96** — still one bullet to reword, **open 7 days**.

### 🟡 Two PRs of @Qeeyat's need your review

**#115** (T5 pass + FLAG-227) and **#114** (this file). #115 is the one that matters: it found **FLAG-227** on the first-ever render of the Doctor dashboard — two of four stat tiles reading fields `/doctor/dashboard/stats/` does not return.

### 🪤 A trap that cost real recovery work — do not repeat it

**`gh pr merge --delete-branch` on a stack parent CLOSES the stacked child.** Merging #106 that way deleted its branch and GitHub closed #109 two seconds later. Recovery is possible but non-obvious (a closed PR cannot be reopened while its base is missing, and its base cannot be changed while it is closed) — the sequence is written up further down this file.

✅ **Merging a stack parent WITHOUT `--delete-branch` retargets the child correctly.** Verified today on #116→#117 and #113→#119: both children auto-retargeted to `develop` and stayed open. **That is the pattern to use.**

## 🚦 GATE 1 — assessment (due Fri 21 Aug · **run late, Sat 22 Aug, by @Qeeyat**)

> **Verdict: 🔴 NO-GO for the backend's UAT week as scheduled.**
>
> Gate 1 asks one question — *"is the UI ready for the backend's UAT week?"* (sprint plan, Week 2).
> It was not run on Fri 21 because @Qeeyat was away Thu 20 – Fri 21. Run here instead, one working
> day before UAT starts **Mon 24 Aug**. The plan says *"If NO-GO, what moves is decided here — not
> during UAT."* This section is that decision being surfaced; **the descope itself needs @Bastoh.**

### Criteria, measured on `develop` @ `8eb5f23`

| Gate 1 criterion | Result | Evidence |
|---|---|---|
| `tsc --noEmit` clean | ✅ | exit 0 |
| Suite green | ⚠️ **green, but partly on false fixtures** | 112 passed / 17 files. **6 of them assert payload shapes the backend never sends** — PR #85 makes them fail correctly. Green here is not evidence of correctness |
| `npm run build` green | ✅ | builds; middleware 35.3 kB |
| **All six dashboards merged on `develop`** | ❌ | **2 of 6.** D1 Superadmin + D2 Org Admin merged · D3 Nurse in unmerged #86 · **D4/D5/D6 not started** |
| **Exercised against `api-dev`** | ❌ | see the role table below — 2 of 6 roles cannot sign in at all |
| `HANDOFF.md` current | ❌ → ✅ | was missing five In Flight rows and this section; both fixed in this PR |
| No unclaimed In Flight rows | ❌ → ✅ | five branches ran unclaimed 19–22 Aug; claimed retroactively above |
| **C4 Cloudflare decision written** | ❌ | **the C2 spike was never run.** `HANDOFF-Bastoh.md:206` slipped it from Thu 13 to the Sat 15 float; no writeup exists. `[INFRA]` lane — @Bastoh's call |

### 🔴 The finding that actually matters: what UAT can test on Monday

The backend's UAT week runs **role-by-role through this UI**, so this table is their dependency, not
just ours. Measured on `develop` today:

| Role | Can sign in? | Renders correctly? | Blocker |
|---|---|---|---|
| `SUPERADMIN` | ❌ **no** | — | `isDashboardRoute('/superadmin/signin')` → `true` (`middleware.ts:25`), guard at `:56` fires before `isSigninRoute` → logged-out superadmin is 307'd to `/signin`, the **patients-only** portal, where the backend rejects staff. **Fix sits in unmerged #84** |
| `PATIENT` | ❌ **no** | — | **FLAG-210** (P1, @Bastoh, open) — `organization: null` is correct, but `roleDashboardPath()` needs a slug |
| `ORGANIZATION_ADMIN` | ✅ | ❌ blank names, `?` avatars, 2 of 4 stat cards `—` | typed against the wrong endpoints. **Fix sits in unmerged #85** |
| `DOCTOR` | ✅ | ⚠️ episodes panel **always empty** | **FLAG-004 / E1** — `?status=OPEN` (`doctor/…:58`), the enum is `ACTIVE`; `?today=true` (`:56`) silently ignored. E1 was Fri 14's row and **was never done** |
| `NURSE` | ✅ | ⚠️ old primitives | D3 in unmerged #86 |
| `RECEPTIONIST` | ✅ | ⚠️ old primitives | D4 not started |

🚨 **Monday's very first UAT item is impossible today.** Week 3 Mon 24 opens with the receptionist
journey: *register → HCL-ID → portal invite → patient sets password → **patient logs in***. That last
step is exactly FLAG-210. The journey cannot complete regardless of how much D4 work lands.

### What unblocks the most, in order

1. 🔴 **Review and merge #84 and #85.** This is no longer housekeeping — it is the difference between
   **two** roles being untestable on Monday and **four**. Both are already reviewer-assigned to
   @Bastoh and have sat three days. Cheapest possible win.
2. 🔴 **FLAG-210 needs its architecture decision** (`[INFRA]`, @Bastoh). Until it lands, the patient
   role is untestable and the Mon 24 receptionist journey cannot complete end to end.
3. 🟠 **E1 / FLAG-004** — a small, verifiable fix that makes the Doctor dashboard show real data
   before Tue 25's doctor journey. Originally scoped as Qeeyat's first PR; still unclaimed.
4. 🟠 **D4/D5/D6 will not all land before Monday.** Two dashboards do not fit in one float day. Which
   role UAT covers on old primitives is a **descope decision for @Bastoh and the backend team**, not
   something to be discovered on Monday morning.

---

### 🧪 UAT Day 2 (Tue 25 Aug) — three of today's four items are blocked

> Written the morning of Tue 25, **before** the backend team hits these at their desk. Monday's
> journey died on FLAG-210 with no warning; this is the same failure mode caught one day earlier.

Today's sprint row is *"T6 part 2 — nurse, org-admin (staff CRUD, announcements incl. `is_public`),
superadmin, and the referral journey end to end."* Measured on `develop` this morning:

| Today's UAT item | State on `develop` | Blocker |
|---|---|---|
| **Superadmin** | ✅ testable | — (#84 merged 23 Aug) |
| **Org Admin** | ❌ blank names, `?` avatars, 2 of 4 stat cards `—` | **the fix is in unmerged #85**, pushed 24 Aug, awaiting re-review |
| **Nurse** | ⚠️ old primitives; ward board caps at 20 beds | **the fix is in unmerged #86**, pushed 24 Aug, awaiting re-review |
| **Referral journey, end to end** | 🚨 **cannot be tested at all** | **no UI exists for the accept step, anywhere in the product** |

#### 🚨 The referral journey has no accept step

**FLAG-220:** accepting or declining a referral is now the receiving organisation's
**ORGANIZATION_ADMIN** — *"a doctor can no longer self-accept"*, stated verbatim in the live schema.

- The **Doctor** dashboard's referrals page is read-only, and per FLAG-220 it must stay that way —
  a button there would 403 every time.
- The **Org Admin** dashboard has **no referrals page**. Its nav is Dashboard / Staff / Patients /
  Wards & Beds / Access Requests. Confirmed in `OrgAdminDashboard.tsx` on 25 Aug: the string
  "referral" does not appear in the file.

So the journey can be *created* and *listed* but never *accepted*. **This is a hole in the product,
not a misplaced button** — the backend moved the authorisation ~20 Aug and no dashboard gained the
capability.

⚠️ **Note the trap that hid this:** the endpoints are still namespaced `/doctor/referrals/{id}/accept/`
while requiring ORG_ADMIN. Anyone deciding scope from path names gets it exactly backwards.

#### What this needs, in order

1. 🔴 **Review #85 and #86 today.** Both are today's UAT roles and both fixes are already written and
   pushed. This is the same "cheapest possible win" the Gate 1 assessment named on 22 Aug, three
   days later and now inside UAT week.
2. 🔴 **Tell the backend team the referral journey cannot complete** before they spend the day on it.
   Monday cost them the receptionist journey discovered live; this one is knowable in advance.
3. 🟠 **Decide who builds the ORG_ADMIN referral queue, and whether it happens during the freeze.**
   Week 3 says *"no new features — `develop` is frozen except for fixes arising from testing."*
   This gap arises **from** testing, so it plausibly qualifies — but that is @Bastoh's descope call,
   not something to be assumed. It is unclaimed and unbuilt as of this morning.

> ⚠️ **A freeze note against myself.** D4 (#94) and D5 (#95) were built on Mon 24 — inside the
> declared freeze. Gate 1's NO-GO said *"if NO-GO, what moves is decided here — not during UAT"*, and
> that descope decision was never made, so I built into an undecided plan rather than waiting for it.
> Both PRs are honest about what they contain and neither is merged, so nothing is on `develop` that
> shouldn't be — but the sequencing was mine to get wrong and it is recorded here rather than
> quietly.

---

## 🚀 Deployment & tier state

> **Updated 2026-08-28 (@Bastoh).** Measured against the live systems, not reported. B1/B3 landed
> today; the rest of this table is what is *actually* deployed, which is not what the tier map assumes.

| Host | Git branch | Backend tier | State |
|---|---|---|---|
| **`dev.healthclouda.com`** | `develop` | `api-dev` | ✅ **LIVE 2026-08-28** — first working frontend tier |
| `beta.healthclouda.com` | `staging` | `api-beta` | ❌ **not created.** Re-measured 2026-09-02: **NXDOMAIN**, and so is `api-beta`. Held deliberately — see the note below and the 2026-09-02 contract note |
| `healthclouda.com` (apex) | `main` | — | ⚠️ **serving a 13 Jul build cut from `develop`** — see **FLAG-018** |

**How `dev.` was verified — end to end, not by the dashboard saying "Ready":**

```
https://dev.healthclouda.com                       -> HTTP 200, valid TLS
POST /api/auth/login (deployed proxy, doctor)      -> 200, role=DOCTOR, org_slug=demo-clinic
Set-Cookie hc_access_token / hc_refresh_token      -> Secure; HttpOnly; SameSite=strict
Set-Cookie (all three)                             -> NO Domain= attribute (host-only)  ✅ A3
deployed JS chunks grepped for `railway.app`       -> 0 occurrences                     ✅ A2
```

That login is **A1 proved end to end** — a request to `dev.` authenticated against `api-dev` and came
back with the right role and org. The single `api-beta` string in the bundle is the text of A4's
error message in `config.ts:37`, not a live reference.

**Vercel configuration as it now stands:**

- The project had **zero environment variables**. That — not anything in anyone's code — is why every
  Vercel check failed from PR #65 onward: A4's fail-loud guard was firing exactly as designed.
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are set **preview-wide**, so *every* PR preview now
  builds. 🔴 **This is why `beta.` is deliberately not attached yet:** `staging` is also a *preview*
  target, so it would inherit `api-dev` and serve the beta host against the dev backend — the exact
  tier-crossing `.env.example` warns presents as *"the invite is broken"*. **On 31 Aug, set a
  `staging`-scoped override to `api-beta` FIRST, then attach the domain. Not the other way round.**
- DNS: `dev` is a **CNAME → `85232879bb8ef21f.vercel-dns-017.com`, DNS-only (grey cloud)** — not
  proxied like the apex. Deliberate: with Cloudflare's proxy on, Vercel's certificate challenge can
  fail and you get TLS errors on a host that looks correctly configured. It can be flipped to proxied
  later, once the cert is settled, if we want the apex's edge behaviour.
- The Vercel token used was **project-scoped**, not user-scoped — `/v2/teams` returns 403 while the
  project endpoints return 200. Worth knowing: `vercel whoami` fails with such a token, which looks
  like a bad credential and is not one.

⚠️ **Deployment protection is OFF — see FLAG-017.** It had to be: `dev.` was returning 302 to
`vercel.com/sso-api`, so no one outside the Vercel team could reach it, and **password protection is
unavailable on the Hobby plan** (*"Advanced Deployment Protection is not enabled on your team"*).

---

## 📡 Backend Contract Notes

> Backend changes we must consume. The live `/api/v1/schema/` is the single source of truth —
> **not** this table, and not `API-doc.md` (which is gitignored, see FLAG-009).

| Date | Note | Status |
|---|---|---|
| 2026-09-02 | ✅ **Backend #137 is CLOSED and `POST /patients/` DOES return the identifiers — the frontend fix is one line.** Verified by reading the backend source on 2026-09-02, not the closing comment: `apps/patients/views.py:171-182` re-serializes the created row with **`PatientDetailSerializer`** (not the request serializer the original issue quoted), and that serializer carries `id` and `healthclouda_id` as read-only fields (`apps/patients/serializers.py:20,33,49-64`). The 201 body is `{message, patient: {id, healthclouda_id, …}}` — **nested, not top-level**, which is almost certainly what produced the original misread: `response.healthclouda_id` is `undefined`, `response.patient.healthclouda_id` is the real value. 🎯 **@Qeeyat — this is most likely what PR #107 needs.** ⚠️ Separately, the **class** behind FLAG-222/227 is confirmed structural: `DoctorDashboardStatsView`, `NurseDashboardStatsView` and superadmin's `DashboardView`/`SystemStatsView` carry **no `@extend_schema` at all**, and org-admin's + receptionist's carry one with a **text description only**, so no field-level response is published for any of them. That is why four dashboards shipped tiles reading fields that were never sent. | ✅ **#137 settled — no backend action.** FLAG-216 can close once #107 lands · the serializer class is being worked in the backend repo (see @Bastoh's log) |
| 2026-09-02 | 🔴 **`api-beta` and `beta.` are both still NXDOMAIN — measured, not reported.** `curl https://api-beta.healthclouda.com/` and `https://beta.healthclouda.com/` both fail to resolve; `dev.healthclouda.com` returns **200** and `api-dev.healthclouda.com` returns **404** at the root (host alive, no route there). The backend's `staging` branch is still at its pre-sprint tip, so the 31 Aug stand-up did not happen on either side. **Nothing on the beta path can start until this does** — T9, the DB wipe, and frontend #98 all queue behind it. | ⏳ **deliberately deferred by @Bastoh 2026-09-02** — `develop` gets finished first, then staging |
| 2026-08-30 | 🚨 **The live schema documents no response body for ANY of the eleven dashboard stats endpoints** — `/superadmin/stats/`, `/superadmin/dashboard/`, `/{doctor,nurse,org-admin,receptionist}/dashboard/stats/`, `/patients/me/dashboard/`, `/{doctor,nurse}/my-patients/`, `/{nurse,org-admin}/wards/overview/`. So **no stat tile on any of the six dashboards can be verified from the schema** — every `*Stats` / `*DashboardData` interface in `types/dashboard.ts` is an unverified guess, and the only way to check one is to capture it live per role. This is why FLAG-222 (three of four Superadmin tiles reading fields that were never sent) was not bad luck, and why three of the four dashboards anyone has examined carried a contract bug. ⚠️ **Read this before trusting any tile.** | logged as **FLAG-225** · backend [#158](https://github.com/HealthClouda/healthclouda-backend/issues/158) covers the three missing Superadmin *fields* — the **class** (publish the stats response serializers) still needs its own `api-request` issue |
| 2026-08-28 | ✅ **The schema needs no auth — and the receptionist filters DO work, though nothing documents them.** Both halves measured against `api-dev` by @Bastoh. **(1)** `curl "https://api-dev.healthclouda.com/api/v1/schema/?format=json"` returns **200 and the whole document unauthenticated** (@Qeeyat's finding, confirmed) — only live *data* needs a token, so **a contract question is never blocked on credentials.** **(2)** ⚠️ **Correcting my own earlier note in this table:** I first recorded that `?date=`/`?status=`/`?doctor_id=` on the receptionist endpoints were *unverified and probably ignored*, because every `/receptionist/` GET declares `parameters: []` and mentions no params in its prose. **That inference was wrong and I blocked PR #94 on it.** Measured with a receptionist token: `/receptionist/appointments/` returns 7 unfiltered and **0** for `?date=1999-01-01`; `/receptionist/check-ins/?date=2026-08-27` returns **5**, `&status=WAITING` narrows to **2**, and `?status=WAITING` alone returns **0** — confirming the date filter applies *before* status, exactly as FLAG-213 says. 🎯 **The rule this restates, which I wrote and then broke: absence from the schema is not evidence of non-support on this backend — it justifies verifying, never concluding.** It cuts both ways: a param can be documented and ignored, or undocumented and honoured. Only measurement settles it. **Still true:** this API hides real contract in prose — `/patients/` carries its entire role matrix (*"CREATE (POST): SUPERADMIN, RECEPTIONIST only"*) in a description string and nowhere else. | ✅ **settled — no action.** Filters shipped in #94 (merged). The seeded check-ins have **moved from 13 Aug to 27 Aug**, so anything hardcoding a date is stale and an empty queue today is the *correct* render |
| 2026-08-24 | 🎯 **`/api/v1/schema/` needs NO authentication — contract verification is never blocked on credentials.** An unauthenticated `GET https://api-dev.healthclouda.com/api/v1/schema/?format=json` returns **200** and the full 125-path OpenAPI document. This is worth stating loudly because both devs have deferred contract questions on the belief that a token was needed: @Qeeyat left `/nurse/wards/overview/` "unverified, no token to hand" on PR #86 the same night (corrected there). **Only live *data* needs a token — shapes, params and required fields do not.** Pull the schema and read the component directly rather than inferring from an example response. | ✅ verified 2026-08-24 |
| 2026-08-24 | 🚨 **`POST /patients/` returns no `id` and no `healthclouda_id`, so a receptionist cannot hand a newly-registered patient their HCL-ID.** The 201 body is the `PatientCreate` serializer: 19 fields, **zero identifiers** (read from the component, not an example). No fallback exists — without `id` we cannot even `GET /patients/{id}/`, and `send-portal-invite` needs that same `patient_id`. ⚠️ **The available workaround was deliberately refused:** searching for the patient just created and guessing which result is theirs. Two same-name registrations minutes apart are indistinguishable, and handing over the **wrong HealthClouda ID** risks a patient's records attaching to another person — an error invisible at the desk. Also asked in the same issue: `PatientCreateRequest` marks only `first_name`/`last_name` required, so the sprint's *"email optional, phone required when email omitted"* rule is either absent or hidden in `validate()`, and our form cannot mirror it. | ❗ **filed: backend [#137](https://github.com/HealthClouda/healthclouda-backend/issues/137)** · frontend side is **FLAG-216** · **blocks the D4 HCL-ID handout only** — portal invite is unaffected (search → `id` → detail → invite) |
| 2026-08-19 | ⚠️ **Read before D4/D5: `Appointment` and `CheckIn` describe shapes the API does not return, and `/receptionist/check-ins/` defaults to TODAY.** Captured live as `reception@demo.test`. Appointments return `scheduled_at` + a nested `doctor{}` — **not** `appointment_date`/`appointment_time`/`doctor_name`, which is what `ReceptionistDashboard.tsx:208-210` and `DoctorDashboard.tsx:101,310-311` render **on `develop` today**, so both tables show blank dates against real data. Check-ins return `checked_in_at`, a nested `assigned_doctor{}`, `reason_for_visit` and a `queue_number` we ignore — not `check_in_time`/`chief_complaint`. 🪤 **And `/receptionist/check-ins/` with no params returns 0** against seeded data: the 5 seeded check-ins are dated 13 Aug and the endpoint defaults to today, so the queue looks broken and `?status=` alone returns nothing because the date filter applies first. ✅ `ReceptionistStats`, `OnDutyDoctor` and `PatientSearchResult` are all correct as typed. | logged as **FLAG-213** · fixes sequenced **with D4 (receptionist) and D5 (doctor)** rather than separately, since both rewrite those components · ⚠️ **this is the D2 bug class again**, found this time by capturing payloads *before* building |
| 2026-08-19 | 🚨 **A patient has no organisation, and every patient route we have needs one — so patients cannot sign in.** `GET /auth/me/` returns `"organization": null` for `patient@demo.test`, which is **correct**: records move with the patient between facilities (`CLAUDE.md` §1), so a patient belongs to no single org. But `roleDashboardPath()` builds `/${orgSlug}/patient` and the only route that exists is `/[slug]/patient`, so `SigninForm.tsx:87` refuses the login rather than navigate to `/undefined/patient`. Verified in a real browser against `api-dev`: login returns **200** with role `PATIENT`, then our UI shows *"Signed in, but your organization could not be determined. Please use your organization portal"* — advice that cannot be followed, because the general portal **is** the patient portal. ⚠️ **This nuances FLAG-010:** for patients, the backend's slug-less `redirect_to: "/patient/"` is the **correct** answer, not the loaded gun that flag describes. | ❗ **open — assigned to @Bastoh as FLAG-210** (P1). Needs an architecture decision, not a one-liner: a slug-less `/patient` route (plus `RESERVED_PATHS` + `middleware.ts` changes) or a backend home-org. **Blocks D6 Patient** (was Thu 20 Aug's row; that day passed unworked) · ⏫ **escalated 2026-08-22:** this now also blocks the **Mon 24 Aug UAT opener** — the receptionist journey ends in *"patient logs in"*, which is precisely this bug. It is no longer only a D6 dependency; it is on the backend's UAT critical path |
| 2026-08-17 | ⚠️ **`?page_size=` is ignored by the server, and the response hides it.** Measured against `api-dev` by @Qeeyat (PR #76, `b6fa74c`): `GET /audit/logs/` → count 162, **results 20**; `?page_size=5` → still **results 20**; `GET /auth/users/?page_size=1` → count 7, **results 7**. The real page size is **20** and `?page=` works, so `usePaginatedList`'s hardcoded 20 is right **by coincidence, not contract** — if the backend retunes `PAGE_SIZE`, every list in the app silently mis-paginates and later pages become unreachable. 🪤 **The trap:** the `next` URL **echoes `page_size` back** while ignoring it, so the payload looks like the param was honoured — verify with `results.length`, never with `next`. The schema documents `page_size` on only two endpoints in the entire API (`/org/{slug}/announcements/`, `/org/contacts/`). | logged as **FLAG-013** · ✅ the one present-tense bug (Overview "Recent Organisations" rendering 20 instead of 5) fixed in PR #76 · ⏳ `usePaginatedList` still sends the ignored param repo-wide, and the superadmin invite dropdown is capped at the first 20 orgs |
| 2026-08-13 | 🎯 **`api-dev` is now seeded — the dev tier is usable for the first time.** It previously had 112 migrations applied and **zero rows**; the 5 July note *"dev-tier is NOT seeded"* was accurate and the sprint plan's *"real seeded data"* was aspirational. Now present: `demo-clinic` **and** `other-clinic` (a second org, so cross-org isolation is testable — T3), 7 users across all six roles, 21 patients (⚠️ **that is the total across BOTH orgs — `demo-clinic` alone has 14**, corrected 2026-08-19 after a live count; sizing a fixture or expecting pagination from "21" will be wrong), 16 episodes, 7 appointments, 5 check-ins, 31 vitals, 10 prescriptions, 2 wards, 7 beds, 3 admissions, 5 referrals, 4 access requests. Dashboards render populated, not empty. **Verified through the proxy path, not just reported:** both orgs `GET /org/by-slug/<slug>/` → 200 · staff on the generic portal → **400** (not 401) carrying `org_slug` + `redirect_url` · `POST /auth/login/demo-clinic/` → 200 with `{access, refresh, user, redirect_to}`. Login's `user` carries only `id, email, first_name, last_name, role, last_login` — **no organization, no duty fields**; our login route already enriches from `/auth/me/` (`api/auth/login/route.ts:96-117`), so **no code change is needed**. Credentials are synthetic and stay out of this repo. | ✅ **unblocks** visual verification, the T5 harness, and the FLAG-003 re-verification. ✅ **@Qeeyat has credentials** — sent out-of-band by @Bastoh 2026-08-13, together with the three-portal table (staff on the general portal get a **400**, not a 401). Values stay out of this repo |
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
