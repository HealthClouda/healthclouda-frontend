# Frontend Beta Sprint Plan — 3 weeks to first-org onboarding

> **Created 2026-08-10 by @Bastoh, with the owner.** The dated execution plan from now to the first
> beta org. Companion to the backend repo's `docs/BETA_SPRINT_PLAN.md`, which lists this repo as
> **E5 — a hard gate: "No tiered frontend = no working UI on onboarding day."** Same runway, same
> gates, same board mechanics.
>
> Companion artifacts: `docs/frontend-sprint.ics` (importable calendar, both lanes) ·
> `scripts/gen_frontend_calendar.py` (regenerates it) · `docs/DESIGN-VERIFICATION.md` (week 1) ·
> `docs/UAT-CHECKLIST-FE.md` (written week 2, executed week 3).
>
> **Gates: Fri 21 Aug · Fri 28 Aug · Wed 2 Sep. Onboarding: Thu 3 Sep.**

---

## Context

The first beta organisation onboards **Thu 3 Sep 2026** with **real PHI**. The backend's UAT week
(**Mon 24 – Fri 28 Aug**) runs **role-by-role through this UI**, so the frontend is a dependency of
the backend's own test week — not a follower.

Three things force the work:

1. **The API host is dead.** `healthclouda-backend-production.up.railway.app` returns HTTP 400
   `DisallowedHost` on every path — removed from `ALLOWED_HOSTS` deliberately because it bypassed
   Cloudflare, sidestepping edge rate limiting and the security header the audit-logging fix
   depends on. It will not be restored. New host: **`https://api-dev.healthclouda.com`**.
2. **One deployment cannot serve three backend tiers**, because the API base URL is baked per build.
   This is worse than a CORS problem: **the backend emails links built from its own `FRONTEND_URL`** —
   set-password (staff *and* patient portal invites), org landing pages, and cross-org consent
   approve/deny. If tiers cross, a beta patient clicks their invite, lands on the wrong frontend,
   which calls the wrong API, and the token doesn't exist there. It presents as **"the invite is
   broken"**, not as a config error. The consent link is the worst case — the one flow where a
   patient who never logs in still has to click something.
3. **Six dashboard designs are outstanding, and most write workflows do not exist.** Verified by
   enumerating every write call site: the only actions a user can perform today are
   complete-episode, cancel-prescription, toggle-duty, record-vitals, assign-doctor, org-admin
   access review, and superadmin suspend/activate/verify. Everything else is read-only.

**The structural insight this plan is built around:** the design PRs and the missing write workflows
are **the same work**. `design_handoff_dashboards/README.md` specifies 6 PRs (DASH-1…6), and those
dashboards are where the workflows live — DASH-4 Receptionist *is* registration + check-ins + portal
invite; DASH-6 Patient *is* in-app consent. Running them as separate tracks would put two developers
in the same six files from two directions.

So the plan uses **contract-first, design-on-top**: @Bastoh lands the data layer (endpoints, types,
proxy routes, wiring, security fixes) **ahead of** the dashboard PR that styles it, and @Qeeyat
builds the design on top of already-correct behaviour.

**Decisions taken (2026-08-10):**

| Decision | Choice |
|---|---|
| Scope | **Full write workflows, all six roles.** Nothing descoped. |
| Cloudflare hosting | **Timeboxed spike in week 1, decide at Gate 1** with evidence. DNS + domains move to Cloudflare now regardless. |
| DASH-1 | **@Qeeyat solo, @Bastoh pairs day one.** Her learning is worth the schedule risk; mitigated by a hard Fri 14 checkpoint. |
| Org landing URLs | **Path-based for beta** — `beta.healthclouda.com/<org-slug>/`. Revisit before the first non-NDA clinic. |
| Apex `healthclouda.com` | **Marketing-only, no API** until `api.healthclouda.com` exists. Nothing points at a DEBUG=True backend. |
| Qeeyat's backend | **Shared `api-dev`.** Zero setup, real seeded data, matches what UAT exercises. |

---

## Part 1 — Everything that needs to be done

### A. 🔴 Tier 1 — the gate (nothing real enters until these are green)

| # | Item | Lane | State |
|---|---|---|---|
| A1 | **Tier separation live** — `dev.` → `api-dev`, `beta.` → `api-beta`, apex marketing-only. Per-env var, never hardcoded | infra | ❗ open — **the E5 hard gate** |
| A2 | **Stale host purge** — `next.config.ts:3` (dead railway host in CSP), `src/app/layout.tsx:12` (`metadataBase`), `.env.example`, `design_handoff_prelogin/README.md` | infra | open — half a day |
| A3 | **Cookie scoping** — do **NOT** set `COOKIE_DOMAIN=.healthclouda.com`. A dot-prefixed parent shares cookies across every subdomain, so a dev session cookie would be sent to beta and production. Host-only (current default) keeps tiers isolated. Documented in `.env.example` but never read in code → delete the footgun | infra | open — 🔴 security |
| A4 | **Fail loudly on missing config** — `config.ts:16` falls back to `http://localhost:8000/api/v1`. In a deployed build that fails silently. Must throw at build time outside development | infra | open — small |
| A5 | **FLAG-001 — authorization decided from a client-writable cookie.** `hc_user` is `httpOnly:false` yet every role gate reads it (`[slug]/doctor/page.tsx:11` + 5 siblings, `middleware.ts:68`). A tampered cookie reaches another org's dashboard shell | infra | open — 🔴 must close before PHI |
| A6 | **Remove the org-admin consent bypass** — `OrgAdminDashboard.tsx:260` still calls `ORG_ADMIN_ACCESS_REVIEW`, which the backend **removed as a security fix** because it bypassed patient consent (audit ORGADMIN-1). Keep the read-only list | infra | open — 🔴 small, ship early |
| A7 | **`SECURITY_BASELINE.md`** — the PHI baseline scoped 2026-08-09. Drives `BETA_READINESS.md` Tier 1 | infra | open |
| A8 | **Backend must tier `FRONTEND_URL` too** — cross-repo `api-request` issue. Tier separation only works if both sides are tiered | infra | ❗ **file day one — their work, our blocker** |

### B. 🟠 Standing up the tiers (infra)

| # | Item | Notes |
|---|---|---|
| B1 | Vercel Domains: `dev.` → branch `develop`, `beta.` → branch `staging`, apex + `www` → `main` | Branch-mapped via the "Git Branch" field |
| B2 | **DNS records requested day one** — DNS is held outside Vercel (Cloudflare/registrar) | 🔴 **longest lead item.** Propagation gates the 24 Aug target |
| B3 | Env vars per environment: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` | `api-beta` does not exist until 31 Aug — beta must be **deployable before it exists** |
| B4 | `staging` branch cut from `develop` post-Gate-2 | Mirrors the backend's B1 promotion |
| B5 | Confirm Vercel deployment protection doesn't block the beta org's testers | Preview URLs currently 401 |
| B6 | Settle `hello@healthclouda.ng` vs `.com` — app and designs say `.ng`, infra is `.com` | `src/app/page.tsx:518` + design files |

**The tier map:**

| Vercel env | Git branch | Frontend host | `NEXT_PUBLIC_API_URL` |
|---|---|---|---|
| Production | `main` | healthclouda.com + www | *(unset — marketing-only until prod API exists)* |
| Preview (branch) | `staging` | beta.healthclouda.com | `https://api-beta.healthclouda.com/api/v1` ← **set 31 Aug** |
| Preview (branch) | `develop` | dev.healthclouda.com | `https://api-dev.healthclouda.com/api/v1` |

### C. 🟠 Cloudflare (spike now, decide at Gate 1)

| # | Item | Notes |
|---|---|---|
| C1 | **DNS + domains on Cloudflare** | Happens now regardless of the hosting decision |
| C2 | 🔬 **Hosting spike — one timeboxed day.** Deploy `develop` to Workers via `@opennextjs/cloudflare` on a scratch subdomain, catalogue every failure, **then tear it down** | Mirrors the backend's A8 dry run, "the highest-value de-risker". Costs a day, touches no branch, holds no data |
| C3 | **What the spike must specifically prove** — `middleware.ts` route gating · route handlers setting httpOnly cookies via `next/headers` · the `/api/data` + `/api/action` proxy · `next/font/google` · `next/image` · build output size limits | Every one of these is load-bearing for auth or PHI |
| C4 | **Decision at Gate 1 (21 Aug)** — short list → migrate before beta; long list → first post-hypercare project with its own plan | Written decision either way, into `HANDOFF.md` |

### D. 🟣 Design lane — DASH-1…6 (default @Qeeyat)

Source: `design_handoff_dashboards/README.md`. Each PR: verify contracts against live Swagger
first, RED-first tests where replacing broken behaviour, **screenshots in the PR description**
(see `docs/DESIGN-VERIFICATION.md`).

| # | Item | Carries these workflows | Notes |
|---|---|---|---|
| D1 | **DASH-1 Superadmin + the shared shell** — `DashboardShell`, `StatCard`, `DataTable`, `Badge`, `SlidePanel`, `Modal`, `Toast`, `EmptyState`, `SmallScreenGate`, avatars | pending-invite resend | 🔴 **DASH-2…6 all depend on this.** Hard checkpoint Fri 14 |
| D2 | **DASH-2 Org Admin** | **staff invite** (`full_name`, **lowercase** role), access-request list **read-only** | Lands *after* A6 removes the bypass |
| D3 | **DASH-3 Nurse** | vitals (exists), ward/bed/admission | Lowest contract risk — good confidence builder |
| D4 | **DASH-4 Receptionist** | 🔴 **registration (email OPTIONAL, phone REQUIRED when omitted)**, HCL-ID handout, **`has_portal_account` + send-portal-invite**, patient email edit, check-ins, appointments | The densest PHI-facing PR |
| D5 | **DASH-5 Doctor** | episode create, prescription create, referrals | ⚠️ Referral workflow becomes ORG_ADMIN-managed **~20 Aug** — re-read Swagger first, don't build deep |
| D6 | **DASH-6 Patient** | 🔴 **in-app consent approve/deny**, notifications, appointments | ⚠️ The **only** mobile-responsive dashboard — must NOT get `SmallScreenGate` |

### E. 🟢 Contract & app layer (default @Bastoh, lands ahead of the DASH PR that styles it)

| # | Item | Notes |
|---|---|---|
| E1 | **FLAG-004 — invented query params.** `DoctorDashboard.tsx:56` `?today=true` is silently ignored; `:58` `?status=OPEN` — enum is `ACTIVE`, so the panel is always empty | Small, verifiable → 🎓 **Qeeyat's first PR** |
| E2 | Registration + portal-invite data layer — endpoints, types, proxy routes, 400/404/409 handling | Ahead of D4 |
| E3 | Patient consent data layer — `PATIENT_ACCESS_REQUEST` PATCH wiring | Ahead of D6 |
| E4 | Announcements — re-add `ORG_ANNOUNCEMENTS` (public, paged, `is_public`), wire into the existing empty state | Endpoint now exists |
| E5 | Notifications — staff + patient lists, unread count, mark-read, read-all (`STAFF_NOTIFS`, `PATIENT_READ_ALL`: **zero uses** today) | Backend delivery goes live this sprint |
| E6 | Envelope type narrowing — `useApi<Ward[] \| Paginated<Ward>>` hedges resolved against Swagger | |
| E7 | `serverFetch` swallows all failures as `null` (FLAG-005) — error ≠ empty, nothing logged | Production incidents would be invisible |
| E8 | ESLint config + GitHub Actions CI (FLAG-006) — `next lint` has **never run**; there is **no `.github/`** | Every check is manual today |

**Already handled — no work needed** (verified in code 2026-08-10): `setup-password/resend` +
expired-link UI · `validate` org branding · consent `reason`/`requested_at` (typed, rendered
conditionally, light up automatically when the backend ships them) ·
`GET /patients/me/appointments/` · duty state via `/auth/me` after login
(`api/auth/login/route.ts:102`) · DRF paged envelopes via `usePaginatedList`.

### F. 🟢 Docs (everyone)

`HANDOFF.md` restructure (durable state + 🚧 In Flight + BACKEND CONTRACT NOTES) · migrate narrative
to `HANDOFF-Bastoh.md` · `ARCHITECTURE.md` rewrite (still describes the deleted vanilla app) ·
`TARGET_ARCHITECTURE_CHECKLIST.md` · `BETA_READINESS.md` · `ONBOARDING.md` updated with the new
backend URL the moment it's confirmed.

---

## Part 2 — The test plan

**Baseline today:** 63 passing tests across 13 files, `tsc --noEmit` clean, `next build` green.
No lint, no CI.

| # | Layer | What it is | State |
|---|---|---|---|
| **T1** | **Regression suite** | The existing 63 tests. Green on every branch | ✅ exists — the floor |
| **T2** | **RED-first change tests** | A test that fails on pre-fix code, then the fix, then green. A test that passed before your change proves nothing | ✅ convention |
| **T3** | **Role-gate & tenant isolation in the UI** 🔴 | A tampered `hc_user` cookie must not render another role's or another org's dashboard (A5/FLAG-001). Every role × every dashboard | ❌ **to write** — the most important gate suite |
| **T4** | **PHI leakage checks** 🔴 | Patient IDs/HCL-IDs in URLs (history, server logs, `Referer`) · browser cache/bfcache (Back after logout) · what an error tracker would ship | ❌ **to write** |
| **T5** | **Design fidelity** | Playwright screenshots of route vs `.dc.html` at fixed viewports. **Includes `SmallScreenGate`: DASH-1…5 show only the notice below 768px; DASH-6 stays responsive** | ❌ **to build in D1** |
| **T6** | **Role-journey UAT through the UI** 🔴 | The layer the backend's own test week depends on. Scripted end-to-end journeys against `api-dev` | ❌ **write week 2, execute week 3** |
| **T7** | **Live-env probes** | Only provable against a deployment: emailed set-password + consent links land on the **right tier** · no cookie carries `Domain=.healthclouda.com` · CSP · built output contains no `railway.app` | ⚠️ formalise as a checklist |
| **T8** | **Accessibility & performance** | The five lenses, systematically: keyboard reachable, labelled, contrast, screen-reader sane; Lighthouse; oversized assets | ❌ **to build** |
| **T9** | **Beta-env confirmatory pass** | Re-run against `beta.` + `api-beta` — a different environment proves nothing until tested. Its own day (1 Sep) | ❌ **write week 2, execute 1 Sep** |

**T7, in detail — the tier test that matters most.** Trigger a real set-password email from the dev
backend; confirm the link points at `dev.healthclouda.com`; complete the flow through to login.
Repeat for a consent approve/deny link. **`FRONTEND_URL` mistakes surface exactly here and nowhere
earlier** — this is the frontend mirror of the backend's T9 Resend proof.

---

## Part 3 — Capacity, and how the shared board works

**Nothing is cut.** In numbers: two devs × 10 build days = **20 dev-days**. Part 1 is roughly
**21–23** — designs alone ≈ 13 (D1 ≈ 3, D2…D6 ≈ 2 each), infra + contract ≈ 8–10. The gap is real
and handled explicitly rather than hidden:

- **Two float days are scheduled** — **Sat 15 Aug** and **Sat 22 Aug** — as *named* catch-up blocks,
  not an assumption of weekend work. If the week ran clean, they are not work days.
- **Five items are marked `FLOAT`** with a named landing spot: the Cloudflare migration itself (if
  Gate 1 says go), announcements editor, org settings, superadmin extras beyond
  suspend/activate/verify, and deep referral work. *Scheduled, not cut* — whichever slips is visible
  on the board.
- **The gates decide slippage** — Fri 21 Aug, Fri 28 Aug, Wed 2 Sep — not onboarding morning.

🔴 **The single biggest schedule risk is D1.** DASH-2…6 all depend on the shared shell, and it is a
new developer's first task in an unfamiliar repo. Mitigations: @Bastoh pairs on day one; a **hard
checkpoint on Fri 14** — if the shell has not landed, @Bastoh takes it over the float day and Qeeyat
moves to DASH-3 Nurse (lowest contract risk) on the existing primitives.

### Both devs see everything, and either can take any item

Lane labels are ownership **defaults, not walls**. @Bastoh will pick up design items to fill in.
Four mechanics make that safe — skip them and the two Claudes will stomp each other:

1. **One `.ics`, both lanes.** Every event carries `[INFRA]` / `[DESIGN]` / `[BOTH]`. Nobody has a
   private schedule.
2. **The In Flight table in `HANDOFF.md` is the swap mechanism.** Taking an item outside your default
   lane means **claiming its row before cutting the branch**. This matters *more* when lanes cross.
3. 🔴 **Contract-first ordering is announced there too.** E2/E3 must land before D4/D6 style them.
   If the order slips, say so in In Flight — a design PR built on the wrong data shape is a rewrite.
4. **Logs and FLAG ranges stay with the person, not the task.** @Bastoh writes
   `HANDOFF-Bastoh.md`, FLAGs **001–199**; @Qeeyat writes `HANDOFF-Qeeyat.md`, FLAGs **200–399** —
   never in the other's file or range.

---

## Part 4 — The calendar

**Timezone Africa/Lagos (WAT).** One shared board; lane prefixes are defaults.
**Recurring:** `[BOTH] Frontend standup` **21:30–22:00, Mon–Fri, 10 Aug – 4 Sep** — all three attend,
following the backend standup at 21:00. Distinct UID so the two calendars don't collide.

### Week 1 — Tiers live + the shell (Mon 10 – Sat 15 Aug)

| Date | `[INFRA]` default @Bastoh | `[DESIGN]` default @Qeeyat |
|---|---|---|
| **Mon 10** | ❗ **B2 request DNS records** (longest lead) · ❗ **A8 file the backend `FRONTEND_URL` issue** · **A2** stale host purge · **A6** remove the consent bypass | 🎓 **Onboarding**: `ONBOARDING.md` end to end, env against `api-dev`, three verify commands green · **pair on D1 kickoff** |
| **Tue 11** | **A3** cookie scoping · **A4** fail-loud config · **B3** env var contract | **D1** shared shell — `DashboardShell`, `StatCard`, `DataTable`, `Badge` |
| **Wed 12** | **B1** Vercel domains + branch mapping · 🎯 **`dev.healthclouda.com` → `api-dev` live** | **D1** cont. — `SlidePanel`, `Modal`, `Toast`, `EmptyState`, `SmallScreenGate` |
| **Thu 13** | 🔬 **C2 Cloudflare spike** — Workers on a scratch subdomain, catalogue failures, **tear down** | **D1** Superadmin pages — orgs, users, audit logs |
| **Fri 14** | **C2 writeup** · verify Part-1 contracts against live Swagger · **E1 FLAG-004** | 🔴 **D1 CHECKPOINT — shell must land** · **T5 screenshot harness** committed |
| **Sat 15** | 🌊 **FLOAT** — not a work day by default | 🌊 **FLOAT** |

> **Why the Cloudflare spike is week 1:** the same logic as the backend's A8. `@opennextjs/cloudflare`
> changes the runtime under middleware, cookie handling and the API proxy. Discovering that in week 4
> with the org waiting is the likeliest way this slips. A day now buys a written list and a decision
> at Gate 1.

### Week 2 — Dashboards + contract layer (Mon 17 – Sat 22 Aug)

| Date | `[INFRA]` default @Bastoh | `[DESIGN]` default @Qeeyat |
|---|---|---|
| **Mon 17** | **A5/FLAG-001** — role gating off the client-writable cookie · **T3** isolation suite | **D2 Org Admin** — staff invite, read-only access requests |
| **Tue 18** | **E2** registration + portal-invite data layer (ahead of D4) · **E6** envelope narrowing | **D3 Nurse** — vitals, ward/bed, admission |
| **Wed 19** | **E3** patient consent data layer (ahead of D6) · **E4** announcements · **A7 `SECURITY_BASELINE.md`** | **D4 Receptionist** 🔴 — registration (email-optional), HCL-ID, portal invite, check-ins |
| **Thu 20** | **E5** notifications · **E7** `serverFetch` · **E8** ESLint + CI | **D6 Patient** 🔴 — in-app consent, notifications. **No `SmallScreenGate`** |
| **Fri 21** | **T6 + T9 checklists authored** · **C4 Cloudflare decision written** · 🚦 **GATE 1** | **D5 Doctor** — ⚠️ re-read Swagger first, referrals changed ~20 Aug · 🧊 freeze |
| **Sat 22** | 🌊 **FLOAT** — D5 overflow, FLOAT items | 🌊 **FLOAT** |

**Fri 21 — GATE 1: is the UI ready for the backend's UAT week?** All six dashboards merged on
`develop` and exercised against `api-dev` · suite green · tsc clean · build green · `HANDOFF.md`
current · no unclaimed In Flight rows · Cloudflare decision written. **If NO-GO, what moves is
decided here** — not during UAT.

### Week 3 — UAT week, on `develop` / `dev.` against synthetic data (Mon 24 – Fri 28 Aug)

> **No new features.** `develop` is frozen except for fixes arising from testing. The backend runs
> its role-by-role UAT **through this UI** — we are on the hook for turnaround, not new build.

| Date | Event |
|---|---|
| **Mon 24** | 🧪 **T6 part 1** — receptionist (register **with** and **without** email → HCL-ID → portal invite → patient sets password → patient logs in), patient portal, doctor. Deviations **logged as defects**, not fixed in place |
| **Tue 25** | 🧪 **T6 part 2** — nurse, org-admin (staff CRUD, announcements incl. `is_public`), superadmin, and the referral journey end to end |
| **Wed 26** | 🛡️ **T3/T4/T7 — security day.** Tampered-cookie isolation against the deployment · PHI leakage (URLs, cache, bfcache, Back-after-logout) · 🎯 **the tier test: a real emailed set-password link and a consent link must land on `dev.`** · no `Domain=.healthclouda.com` cookie · no `railway.app` in the built output |
| **Thu 27** | 🔧 **Defect triage + fixes** on `develop`, RED test first · **T8 accessibility + performance pass** · **B4 cut `staging`, deploy `beta.healthclouda.com`** with the API var still unset (must fail loudly) |
| **Fri 28** | 🚦 **GATE 2** — every Tier-1 A-item evidenced or explicitly accepted in writing. 🎯 **`beta.healthclouda.com` ready, pending only the `api-beta` variable.** If NO-GO, onboarding moves — decided here, not on 3 Sep |

### Week 4 — Beta stand-up, confirmation & onboarding (Mon 31 Aug – Fri 4 Sep)

| Date | Event |
|---|---|
| **Mon 31 Aug** | 🚀 **`api-beta` created by the backend → set `NEXT_PUBLIC_API_URL` on the `staging` branch env, redeploy, verify.** 🔴 **No code change** — if this needs a code edit, the tiering is wrong. **Done when:** `beta.healthclouda.com` loads and authenticates against `api-beta` |
| **Tue 1 Sep** | 🧪 **T9 confirmatory day on beta, synthetic data.** Re-run T6 role journeys, T3 isolation, T4 leakage, T8 a11y against the new env. 🎯 **Prove what only beta can prove:** an emailed invite from the **staging** backend lands on **`beta.`** and completes — this is where `FRONTEND_URL` mistakes surface. Failures logged, not patched in place |
| **Wed 2 Sep** | 🧹 **Fix on `develop`, re-promote, re-verify** — never hot-patch `staging`. Smoke test **after** the backend wipes its DB (empty states must render as empty, not as errors). 🧊 Freeze |
| **Thu 3 Sep** | 🎉 **ONBOARDING DAY.** Staff walkthrough, watch logs live. **No deploys.** First real PHI enters here — and not one day earlier |
| **Fri 4 Sep** | 🩺 **Hypercare day 1** (continuing into the following week): error review, support triage, landing spot for any remaining `FLOAT` item — including the Cloudflare migration if Gate 1 deferred it |

---

## Part 5 — Artifacts

| File | Purpose |
|---|---|
| `docs/FRONTEND_SPRINT_PLAN.md` | This file — the source of truth both Claudes read |
| `docs/frontend-sprint.ics` | Importable calendar carrying **both lanes**, `Africa/Lagos`. Share in the WhatsApp group |
| `scripts/gen_frontend_calendar.py` | **Idempotent** `.ics` generator — a date change is a re-run, never a hand-edited `.ics` |
| `docs/DESIGN-VERIFICATION.md` | 🎓 Qeeyat's local workflow: open `.dc.html` beside `npm run dev`, run the screenshot harness, viewport checks incl. `SmallScreenGate`, what "verified" means before pushing |
| `docs/UAT-CHECKLIST-FE.md` | The T6 role-journey scripts — written week 2, executed week 3, reusable every promotion |
| `e2e/design/` | The T5 screenshot harness + committed reference shots |

**Sharing note:** iOS WhatsApp may need *Save to Files → open* before Calendar accepts an `.ics`;
Android opens it directly; Google Calendar on desktop imports via Settings → Import & Export.

---

## Verification

- **Tier separation (A1, the E5 gate):** `curl -I https://dev.healthclouda.com` → 200 and it
  authenticates against `api-dev` · building `staging` with `NEXT_PUBLIC_API_URL` unset **fails
  loudly**, no localhost fallback · grep the built output for `railway.app` → **zero hits** · sign in
  and confirm **no cookie carries `Domain=.healthclouda.com`**.
- 🎯 **The link test (T7/T9):** a real set-password email and a real consent link, from each backend
  tier, land on that tier's frontend and complete end to end. This is the failure the whole plan
  exists to prevent.
- **Role isolation (A5/T3):** a tampered `hc_user` cookie cannot render another role's or another
  org's dashboard — asserted in tests, then probed against the deployment on 26 Aug.
- **Write workflows:** each driven end to end through the real proxy against `api-dev`, not mocked.
  Specifically: register a patient with **no email** (succeeds, phone required) · with **both
  omitted** (400 surfaced legibly) · send a portal invite and confirm the email arrives with a
  working link · approve a cross-org consent request **in-app** as a patient.
- **Design fidelity (T5):** screenshots route-vs-design at fixed viewports; **DASH-1…5 render only
  the small-screen notice below 768px, DASH-6 stays responsive.**
- **Per PR, non-negotiable:** `npx tsc --noEmit` clean · `npm test` green · `npm run build` green.
  From Thu 20 Aug, CI enforces these on every PR into `develop` (E8).
- **The `.ics`:** import into a throwaway calendar — events land on the right dates in WAT, both
  lanes present, standup recurring weekdays only at 21:30, and **no collision with the backend
  calendar's standup**.
- **The gates:** three — **Fri 21 Aug**, **Fri 28 Aug**, **Wed 2 Sep** — each decides slippage early
  instead of on onboarding morning.
