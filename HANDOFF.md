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
| @Bastoh | **A5/FLAG-001** — server-trusted role **and** tenant gating | `fix/flag-001-server-trusted-auth` | `lib/auth-server.ts` (new), all six dashboard page gates | 2026-08-28 | 🔄 **PR #99**. ⛓️ **MUST merge as a merge commit, not a squash** — #100 is stacked on it |
| @Bastoh | **FLAG-210** — slug-less `/patient` portal | `fix/flag-210-patient-portal` | `app/patient/*` (new), `app/[slug]/patient/*` (removed), `config.ts`, `router.ts`, `SigninForm`, `middleware` | 2026-08-28 | 🔄 **PR #100**, ⬆️ stacked on #99 |
| @Bastoh | **B4** — promote `develop` → `staging` | `develop` → `staging` | branch promotion, fast-forward | 2026-08-28 | 🔄 **PR #98**. `staging` still holds the **12 Apr vanilla app** until this merges |
| @Qeeyat | **Schema-reading guidance** | `docs/schema-contract-guidance` | `CLAUDE.md`, `ONBOARDING.md` | 2026-08-25 | 🟡 **PR #96** — one bullet to reword; exact replacement text is in a comment on the PR |
| @Qeeyat | **FLAG-203** — stop mounting staff dashboards below 768px + FLAG-221 | `fix/flag-203-small-screen-gate` | `SmallScreenGate`, all five staff dashboard gates, specs | 2026-08-29 | 🔄 **PR #106**. ⛓️ **MUST merge as a merge commit** — #109 is stacked on it |
| @Qeeyat | **FLAG-222** — Superadmin stat tiles onto the fields the API sends | `fix/flag-222-dashboard-stats` | `SuperadminDashboard`, `types/dashboard.ts` | 2026-08-29 | 🔄 **PR #109**, ⬆️ stacked on #106 |
| @Qeeyat | **Issue #101** — HCL-ID handout at registration | `feat/issue-101-hcl-id-handout` | `receptionist/*`, `types/dashboard.ts` | 2026-08-29 | 🔄 **PR #107**. Unblocked — FLAG-216 was derived from a schema documenting the request serializer as the response |
| @Qeeyat | **Gate 2 assessment** (docs only) | `docs/gate-2-assessment` | `HANDOFF.md` | 2026-08-29 | 🔄 **PR #108** — 🔴 NO-GO verdict for 3 Sep as `develop` stood on 29 Aug |
| @Qeeyat | **Session log 29 Aug** (docs only) | `docs/session-log-qeeyat-2026-08-29` | `HANDOFF-Qeeyat.md` | 2026-08-29 | 🔄 **PR #105** |
| @Qeeyat | **Patient + Nurse contract audit** — FLAG-223/224/225/226 (docs only) | `docs/flags-patient-nurse-contract-audit` | `CODEBASE_FLAGS.md`, `HANDOFF.md` | 2026-08-30 | 🔄 open. ✅ **Claimed before cutting the branch.** Docs only — **no source touched**, per `CLAUDE.md` §6 (review means flag, not fix). ⚠️ **FLAG-226 needs a live patient token to settle** and may be a P0 PHI leak |

> 📌 **Issue #101 is assigned to @Qeeyat:** the HCL-ID handout is buildable after all — `POST /patients/`
> returns `{message, patient:{id, healthclouda_id}}`. FLAG-216 was derived from a schema that documents
> the *request* serializer as the response.

*Cleared on merge: **#97** In Flight cleanup + FLAG-017/018/019 · **#102** `SECURITY_BASELINE.md` (A7) · **#103** E7/FLAG-005 server-fetch observability · **#104** FLAG-220 Org Admin referrals page — all four **reviewed and merged 2026-08-30 by @Qeeyat**, as merge commits, each re-verified locally before merging rather than from the PR body (`develop` after all four: tsc clean, **171/171**, build green, middleware 35.4 kB). #104 closes the referral hole FLAG-220 described — the journey can now be accepted. · **A2/A3/A4/A6** Tier-1 infra batch — PR #65 · **FLAG-010** — PR #66 · **FLAG-011
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
| `beta.healthclouda.com` | `staging` | `api-beta` | ❌ **not created — deliberately held.** See the note below |
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
