# HealthClouda Frontend — Beta Readiness Backlog

> **What this is:** the prioritised, repo-wide backlog for getting a real beta organisation — with
> real patient data (PHI) — safely onto this frontend. Ordered by the progressive-hardening North
> Star (`develop` demo-functional → `staging` production-grade → `main` prod), **not** by any single
> demo date.
>
> **Sources:** `CODEBASE_FLAGS.md` (49 flags at the time of writing — 17 P1, 18 P2, 14 P3, no P0),
> `docs/FRONTEND_SPRINT_PLAN.md` (items A–F, tests T1–T9), `HANDOFF.md` (In Flight, gates, deploy
> state), `docs/SECURITY_BASELINE.md`, and the open PR queue. **Created 2026-09-01 (@Bastoh).**
>
> ⚠️ **This file was owed from the day `CLAUDE.md` was written.** It has been listed as required
> session-start reading since then and did not exist, so every session silently read nothing. It is
> written here from **frontend** evidence — the backend has a file of the same name and it is **not**
> the source: their gate is about data at rest in Postgres, ours is about what reaches a browser.
> Porting theirs would have produced an authoritative-looking document describing the wrong system.

---

## 🚧 The governing gate

The backend's gate asks *"is the data safe where it is stored?"* Ours asks a different question, and
it needs stating in our own terms:

> ### No real PHI is served to a browser until:
> 1. **Authorization is decided somewhere the user cannot write to** — not from a cookie the browser
>    can edit.
> 2. **The tier the browser talks to is the tier we intended** — a beta frontend must never be
>    holding a dev backend's session, or vice versa.
> 3. **PHI does not reach a surface we do not control** — the DOM of a device we refused to serve,
>    a URL, a browser cache, an error report, a screenshot committed to a **public** repo.

Point 3 has a consequence specific to us and worth stating loudly:

🔴 **This repository is PUBLIC.** The backend's is private. Anything that lands here — a Playwright
baseline PNG, a fixture, a `.env.example`, a pasted payload in a PR description — is world-readable
**forever**, including after deletion. From the moment the beta backend holds real records, the T5
design harness must never be pointed at it. This constraint does not exist on the other side of the
seam and cannot be inherited from their documents.

### Which environment must each item be true on?

The gate protects **real PHI**, and real PHI lives on the **beta tier** — which does **not exist
yet** (`beta.healthclouda.com` and `api-beta.healthclouda.com` were both NXDOMAIN when measured on
2026-09-01). An item verified on `dev.` is verified against synthetic data, a `DEBUG=on` backend and
no beta org. That is a rehearsal. It is worth doing. **It is not the gate closing.**

- **🔨 BUILD-ON-DEVELOP** — code or config shaped. Build and fully test it on `develop` now; it ships
  to `staging` with the promotion. Most of the work is here, and all of it is available today.
- **🎯 PROVE-ON-BETA** — only meaningful against the real tier: its domain, its backend, its emails.
  Write the runbook now, execute on beta week.

> **Never tick a 🎯 item because it worked on `dev.`** That conflation is what this block exists to
> prevent, and it is the same trap the backend wrote into their copy for the same reason.

---

## 🔴 Tier 1 — Beta-blocking (the PHI gate)

**Nothing real goes in until these are green.**

### 1. **A5 / FLAG-001 — authorization is decided from a client-writable cookie** · 🔨 BUILD-ON-DEVELOP
🔄 **Fix written, in review — [PR #99](https://github.com/HealthClouda/healthclouda-frontend/pull/99). CHANGES_REQUESTED since 30 Aug.**

`hc_user` is set `httpOnly: false` so the UI can read a name and role — and every role gate reads the
same cookie (`[slug]/doctor/page.tsx:11` plus five siblings, `middleware.ts:68`). A user can edit
`document.cookie` and load another role's or another org's dashboard shell.

**Impact is limited today and stops being limited the moment PHI arrives:** every real fetch carries
the bearer token and DRF enforces server-side, so an attacker currently lands in an empty skeleton
collecting 403s. It is a client-trusted authorization decision in a multi-tenant medical records
system.

**🔴 This is the single item the sprint plan marks "must close before PHI", and it blocks the most.**
[PR #100](https://github.com/HealthClouda/healthclouda-frontend/pull/100) is approved and cannot
merge until it does.

**Done when:** role and tenant gating decide from a server-trusted source; `hc_user` is display-only;
and a test proves a tampered `hc_user` cannot render another role's or another org's dashboard (that
test is **T3**, item 4 below). ⛓️ Merge as a **merge commit** — #100 is stacked.

---

### 2. **FLAG-210 — a patient cannot sign in at all** · 🔨 BUILD-ON-DEVELOP
🔄 **Fix written and APPROVED — [PR #100](https://github.com/HealthClouda/healthclouda-frontend/pull/100), blocked behind #99.**

`GET /auth/me/` returns `"organization": null` for a patient, which is **correct** — records move
with the patient between facilities, so a patient belongs to no single org. But `roleDashboardPath()`
builds `/${orgSlug}/patient`, so login is refused rather than navigating to `/undefined/patient`.

**Two consequences that make this Tier 1 rather than a bug:**
- **DASH-6 has never been rendered by anyone.** It is built, merged, and unobserved.
- **FLAG-226 cannot be settled without it** (item 6) — and FLAG-226 is a candidate P0.

**Done when:** a patient signs in on the general portal and reaches their dashboard, verified against
`api-dev` with a real patient token.

---

### 3. **A1 / B3 — tier separation, and the ordering trap inside it** · 🎯 PROVE-ON-BETA
🟡 **Half done.** `dev.` → `api-dev` is live and authenticating. `beta.` does not resolve.

🪤 **The trap, and it is silent in both directions.** On Vercel, `staging` is a **preview** target,
and `NEXT_PUBLIC_API_URL` is currently set **preview-wide** to `api-dev`. Attaching
`beta.healthclouda.com` before setting a `staging`-scoped override means the beta host serves against
the **dev** backend — which presents to a beta user as *"the invite is broken"*, not as a
misconfiguration.

> **Set the `staging`-scoped `NEXT_PUBLIC_API_URL=api-beta` override FIRST. Attach the domain
> SECOND.** [PR #98](https://github.com/HealthClouda/healthclouda-frontend/pull/98) (`develop` →
> `staging`) is approved and **deliberately held** for exactly this reason.

⚠️ **Blocked on the backend:** `api-beta` did not exist on 2026-09-01. See the Cross-Lane Asks table
in `HANDOFF.md`.

**Done when:** `beta.healthclouda.com` loads, authenticates against `api-beta`, and a built artifact
served from `beta.` contains no `api-dev` string. 🔴 **No code change** — if this needs a code edit,
the tiering is wrong.

---

### 4. **T3 — the role-gate and tenant-isolation suite does not exist** · 🔨 BUILD-ON-DEVELOP
❌ **Not written.** The sprint plan calls it *"the most important gate suite"*.

A5's fix is unfalsifiable without it. Every role × every dashboard: a tampered `hc_user` must not
render another role's or another org's page.

**Done when:** the suite exists, and **at least one test in it has been proven able to fail** —
run against a deliberately weakened gate, the way the backend proved their cross-org control by
sabotaging the rule and watching the test report the leak. A control that has never failed is
indistinguishable from a control that cannot fail.

---

### 5. **T4 — PHI leakage checks do not exist** · 🔨 BUILD-ON-DEVELOP + 🎯 PROVE-ON-BETA
❌ **Not written.**

Patient IDs and HCL-IDs in URLs (history, server logs, `Referer`) · browser cache and bfcache (press
Back after logout) · what an error tracker would ship if we add one · **what a screenshot committed
to this public repo contains**.

**Done when:** each surface has a check, and the bfcache one is executed manually at least once —
pressing Back after logout is not a thing a unit test observes.

---

### 6. **FLAG-226 — `?my=true` on `/episodes/` is undocumented, and may be returning other patients' rows** · 🔨
❗ **OPEN — a candidate P0, and it is unmeasured.**

The schema documents *field* visibility for patients in prose (*"NO clinical_notes, NO
treatment_plan"*) and says nothing about **row** scoping. So patients are expected callers and the
silence is specifically about *which rows come back*. If `?my=true` is silently ignored — and
undocumented params on this API **are** silently ignored, that is FLAG-004's whole story — a patient
sees other patients' episodes.

⚠️ **Blocked on item 2:** settling it needs a live patient token, which needs #100.

**Done when:** a live capture as a real patient shows only that patient's rows — or, if it does not,
this becomes a P0 and the beta date is the thing that moves.

---

### 7. **FLAG-203 / FLAG-025 — dashboards mount below the small-screen gate** · 🔨
🟡 **Half fixed** — #106 stopped the five staff dashboards mounting, fetching or putting records in
the DOM below 768px. **FLAG-025 is the same defect one component over:** the marketing mobile drawer
is mounted unconditionally and hidden with `translate-x-full`, so its controls stay in the
accessibility tree and in tab order when closed.

**Why it stays in Tier 1 despite "half fixed":** the same mistake in two independently written
components is a pattern, not an accident. FLAG-025 itself carries no PHI — the next instance might.

**Done when:** a sweep confirms no component hides PHI-bearing content with CSS alone, and the
convention is written down where the next person will read it.

---

### 8. **FLAG-019 — CSP allows `unsafe-inline` and `unsafe-eval` on the pages that render PHI** · 🔨
❗ **OPEN.**

**Done when:** either the directives are removed on dashboard routes, or the residual is accepted in
writing in `docs/SECURITY_BASELINE.md` with the reason and the date — an accepted risk is a decision,
an unexamined one is not.

---

### 9. **FLAG-017 — Vercel deployment protection is OFF, and beta inherits it** · 🎯 PROVE-ON-BETA
❗ **OPEN — deliberate, reversible, dated.**

It had to be turned off: `dev.` was returning 302 to `vercel.com/sso-api`, so nobody outside the
Vercel team could reach it, and password protection is unavailable on the Hobby plan.

**Done when:** the beta org's testers can reach `beta.` **and** the general public cannot, decided
explicitly at stand-up rather than inherited by default.

---

### 10. **T7 — live-env probes: do emailed links land on the right tier?** · 🎯 PROVE-ON-BETA
❌ **Not formalised.**

Trigger a real set-password email from the beta backend; confirm the link points at
`beta.healthclouda.com`; complete it through to login. Repeat for a consent approve/deny link.
**`FRONTEND_URL` mistakes surface exactly here and nowhere earlier.**

**Done when:** both journeys complete on the beta tier, from the email client, on a real device.

---

### 11. **FLAG-018 — production is stale and cannot currently be redeployed** · 🎯
❗ **OPEN.** The apex serves a **13 Jul build cut from `develop`**.

It is in Tier 1 because it is the only tier a member of the public can reach today, and because
"cannot currently be redeployed" is the part that bites during an incident, not during planning.

**Done when:** the apex serves an intended build from `main`, and a redeploy has been executed once
to prove the path works.

---

### 12. **FLAG-023 — the proxy boundary that attaches the JWT has zero test coverage** · 🔨
❗ **OPEN.**

`/api/data` and `/api/action` — the layer `CLAUDE.md` §5 says attaches the JWT server-side — are both
at **0%**, as is every auth route. **Nothing fails today if the `if (!token)` guard is deleted.**
`security-headers.test.ts` mentions those paths, which is why a grep looks reassuring and coverage
did not.

**Done when:** deleting the token guard turns the suite red.

---

## 🟠 Tier 2 — Correctness: the UI shows clinicians the wrong thing

Not gate items — a clinician reading a wrong number is not a breach. But this is the largest cluster
in the repo and it has one root cause, so it is one item repeated seven times.

> 🎯 **The root cause, stated once.** Of the 84 GETs in the live schema that document a `200`, only
> **36 document a response body — 48 do not** (measured 2026-09-01). Where the schema is silent, the
> frontend typed the fields by guessing, and the guesses were wrong. **`StatCard` renders
> `{value ?? '—'}`, so the failure mode is an em dash, not an error** — invisible to unit tests
> written against the same wrong interface, and invisible to the schema. **Only a live render sees
> it.** Backend ask #1 in `HANDOFF.md`'s Cross-Lane table is the upstream fix.

| Flag | What | State |
|---|---|---|
| **FLAG-225** | No dashboard stats endpoint in the entire API documents a response body | ❗ open — the parent |
| **FLAG-222** | 3 of 4 **Superadmin** stat cards read fields the API never returns | 🔄 PR #109, CHANGES_REQUESTED |
| **FLAG-227** | 2 **Doctor** stat tiles do the same — `appointments_today` is really `todays_appointments`; `active_prescriptions` has **no equivalent field at all** | ❗ open — found on the first-ever Doctor render |
| **FLAG-213** | `Appointment` and `CheckIn` describe shapes the API does not return | ❗ open |
| **FLAG-223** | Three Patient endpoints return **bare arrays**; the dashboard reads `.results` | ❗ open |
| **FLAG-224** | The patient "Requested By" column reads a field that does not exist | ❗ open |
| **FLAG-214** | Client-side "today"/"active" filters only ever see the first page | ❗ open |
| **FLAG-013** | `?page_size=` is ignored server-side; `next` echoes it back while ignoring it | ❗ open |
| **FLAG-216 / 219** | Create endpoints return their input without an `id`, twice | ⚠️ **FLAG-216 was wrong** — `POST /patients/` does return `{patient:{id, healthclouda_id}}`; the *schema* documents the request serializer as the response. Re-scoped in backend PR #160 |

**Done when (the tier, not each row):** every dashboard's stat tiles and tables are typed from a
**captured live payload** pasted into the PR, and the em-dash render is asserted against — the T5
harness is what catches this class and it now covers four of six roles.

---

## 🟡 Tier 3 — The gate that gates: CI, tests, and what they actually prove

| Item | State |
|---|---|
| **FLAG-006 / E8 — ESLint + CI** | ✅ **DONE** — PR #116. CI exists and has run green |
| 🔴 **Required status checks are not wired** | ❗ **OPEN.** Ruleset `11328360` carries **no** required status checks, so a green tick implies a gate that does not exist. Repo settings, owner-only. #116 is merged, so the blocker named on that PR is gone |
| **B7 — coverage** | ✅ reporting exists. Baseline **55.64% statements** |
| **FLAG-024 — e2e specs** | 🔄 [PR #118](https://github.com/HealthClouda/healthclouda-frontend/pull/118), CHANGES_REQUESTED — correctly. "13/13" was the `chromium` project alone; the default command gives **24 passed / 2 failed** on `mobile` |
| **FLAG-221 — tests assert the layer, not the property** | 🟡 two instances open. One was **green while the bug was live** |

> 🎯 **The lesson this tier keeps teaching, in three separate incidents:** a test written against one
> failure mode is blind to the next one in the same cell; a one-page fixture cannot see a pagination
> bug; and a suite measured on one Playwright project is not the suite CI runs. **Measure with the
> command the gate will use, and quote its full output.**

---

## 🟢 Tier 4 — Accessibility, before it is a retrofit (T8)

`FLAG-011` dashboard tokens fail WCAG AA · `FLAG-014` brand blue fails AA behind white text ·
`FLAG-015` table row-action buttons fail AA · `FLAG-201` `Modal` focus handling is nominal, not a
real trap · `FLAG-202` entrance animations have no `prefers-reduced-motion` guard · `FLAG-204`
persistent toasts have no cap, dedupe or dismiss-all.

**Why not Tier 5:** contrast and focus traps are not cosmetic in a system nurses use on a ward at
speed. **Why not Tier 1:** nobody is harmed by them in the way the gate means, and pretending
otherwise would devalue the gate.

**Done when:** T8 exists as a repeatable pass, and the three contrast flags are either fixed or the
token values are accepted in writing.

---

## ⚪ Tier 5 — Hygiene and known-and-parked

`FLAG-007` login rate limiter is per-instance memory · `FLAG-008` dead constants imply a session
timeout that does not exist · `FLAG-009` the API reference is gitignored, contradicting the
contract-seam rule · `FLAG-010` backend `redirect_to` drops the org slug (unused today, loaded gun) ·
`FLAG-012` two contradictory punctuation conventions · `FLAG-022` `Avatar` renders a remote `<img>` ·
`FLAG-200` 7 high-severity `npm audit` findings · `FLAG-205/206/208/209` org-admin endpoints whose
permissions or body shapes do not exist · `FLAG-211` nurse admission permissions undocumented ·
`FLAG-212` the two bed sources disagree · `FLAG-215` two `roleLabel`s that disagree · `FLAG-217` this
API documents permissions and params in prose, not schema fields.

---

## Definition of "beta ready" (frontend)

Every **Tier 1** item is either ticked against its own "Done when", or **accepted in writing** in
`docs/SECURITY_BASELINE.md` with a named owner and a date. Tier 2 does not block the gate but **does**
block anyone trusting a number on a dashboard, so it blocks the clinical walkthrough.

⚠️ **A tier is not a schedule.** Tier 1 items 3, 9, 10 and 11 are 🎯 PROVE-ON-BETA and cannot be
finished before the beta tier exists — which is currently blocked on the backend. **If `api-beta`
does not exist, the gate cannot close, and that is a date decision, not an engineering one.**

---

## Maintenance

- **Both devs write here**, own FLAG range as usual. Toggle only your own items; `git pull`
  immediately before editing.
- **This is a backlog, not a status board** — `HANDOFF.md` remains the live view.
- **`TARGET_ARCHITECTURE_CHECKLIST.md` is derived FROM this file**, re-ordered by dependency and
  tagged to the target pages in `docs/frontend-design.drawio` (*App Shell & Routing — target*,
  *Auth & Session — target*). It is **not yet written** — that ordering is the backend's, stated in
  their checklist's own preamble, and building the checklist first would mean inventing its inputs.
