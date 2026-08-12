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
| @Qeeyat | **D1** — DASH-1 shared shell + Superadmin | `feat/dash-1-shared-shell` | `src/components/ui/*`, `src/components/layout/*`, `src/components/dashboard/StatCard.tsx`, `src/app/globals.css`, `src/app/layout.tsx` | 2026-08-10 | **PR #67 — CHANGES REQUESTED (@Bastoh), addressing now.** Shell components only (Tue 11 row); SlidePanel/Modal/Toast/EmptyState/SmallScreenGate + Superadmin pages still to come — 🔴 hard checkpoint **Fri 14 Aug** |

*Cleared on merge: **A2/A3/A4/A6** Tier-1 infra batch — PR #65 · **FLAG-010** — PR #66 · **FLAG-011**
token contrast — PR #68. All merged 2026-08-12.*

⚠️ **Contract-first ordering (sprint plan Part 3):** E2/E3 must land **before** D4/D6 style them.
A design PR built on the wrong data shape is a rewrite — if that order slips, say so in this table.

---

## 📡 Backend Contract Notes

> Backend changes we must consume. The live `/api/v1/schema/` is the single source of truth —
> **not** this table, and not `API-doc.md` (which is gitignored, see FLAG-009).

| Date | Note | Status |
|---|---|---|
| 2026-08-10 | **API host moved to `https://api-dev.healthclouda.com`.** The old Railway host returns HTTP 400 `DisallowedHost` on every path — removed from `ALLOWED_HOSTS` deliberately (it bypassed Cloudflare, sidestepping edge rate limiting + the audit-logging security header). **It will not be restored.** | ✅ purged from the codebase 2026-08-12 (A2) |
| 2026-08-12 | **A8 — backend must tier its `FRONTEND_URL`.** It emails links built from that value (set-password for staff *and* patient invites, org landing, cross-org consent approve/deny). If tiers cross, a beta patient's invite lands on the wrong frontend calling the wrong API, and presents as *"the invite is broken"*. **Researched in their code before filing:** it is already env-driven (`settings/base.py:338`) with **no** per-tier override, so this needs **no code change on their side** — only the env var set per deployment. Two hazards raised with it: the default is `http://localhost:3000` (an unset tier emails localhost links to patients), and `patients/receptionist_views.py:287` carries a second hardcoded localhost default on the **consent** link specifically. Every path they build was verified against our routes — only the host is at risk. | ✅ **filed: backend [#107](https://github.com/HealthClouda/healthclouda-backend/issues/107)** — needed before `api-beta` exists (~31 Aug) |
| 2026-08-12 | **Login `redirect_to` drops the org slug** — built from `FRONTEND_ROLE_PATHS` (`settings/base.py:406`), so a doctor gets `/doctor/`, not `/<slug>/doctor`. We don't consume it (we use `redirect_url` from the 400 staff-portal response), so impact is zero today. **Do not wire `redirect_to` without checking `router.ts`.** | logged as **FLAG-010**, not filed upstream |
| 2026-08-10 | **Org-admin access-request review was removed by the backend as a security fix** — it let an org admin approve access to a patient's records *bypassing patient consent* (audit ORGADMIN-1). Read-only list stays. | ✅ frontend caller removed 2026-08-12 (A6) |
| 2026-08-10 | Referral workflow becomes **ORG_ADMIN-managed ~20 Aug** — re-read Swagger before D5 Doctor; don't build deep against today's shape. | ⏳ pending |
| 2026-08-08 | Contract claims in our docs are **July-sourced, not re-verified** against the live schema (FLAG-003). | ❗ open |

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

### 2026-07-17 — Design PR D: set-password + access-request respond + 404 (PR: feat/design-utility-screens)

**Context:** PR C (#61) merged (Qeeyat approved, no comments); local repo synced, merged branches
pruned. `API-doc.md` refreshed from the live schema (7361 lines) before any code, per last session's
TODO — the refresh surfaced everything PR D needed.

**Contract verifications (probed prod + seeded local Docker backend @ backend develop 4356140):**
- **Backend #66 SHIPPED** (their #67): validate response now carries `organization_name` +
  `organization_logo`, both **nullable** — null means "render HealthClouda branding". Verified live:
  `{valid, email, first_name, last_name, role, organization_name, organization_logo}`.
- **NEW endpoint `POST /auth/setup-password/resend/`** (their #68): public self-service re-request
  from an expired invite link; body `{token}` or `{email}`; **always a generic 200** (anti-enumeration).
- **Respond flow is GET + POST** (their FLAG-241): GET `?token=` is read-only
  `{organization, patient_name, status: PENDING|APPROVED|DENIED, expired}`; POST
  `{token, action: accept|deny}` performs the decision. ⚠️ Gotcha: "already approved/denied" 400s
  use a **`message` key, not `error`** — so the UI derives state from the GET (re-fetches after a
  rejected POST) instead of parsing POST bodies.
- **GET respond is missing `reason` + `requested_at`** (design's info block wants Organization /
  Reason / Requested rows) → **backend #71 filed** (additive ask). UI renders those rows
  conditionally, so they light up automatically when #71 ships.

**PR D `feat/design-utility-screens`** (→ develop, reviewer Qeeyat):
- **`/set-password` rebuilt to design screen 7** (new `SetPasswordForm`, page is a thin wrapper +
  noindex): welcome header "Welcome, **{name}**" (blue) + "Your account at **{Org}** as **{Role}**"
  (org phrase omitted when null), readonly email field, shared strength/requirements UI from PR B,
  submit disabled until valid → redirect `/signin`. Error state per design (red circle-x, new
  AuthCard `danger` icon variant) + **"Request a new link" resend button** on the expired state
  (Bastoh's heads-up on #66). `organization_logo` deliberately unused — design keeps HC chrome
  (README decision 3); logo has no slot on this screen.
- **`/access-request/respond` built** (design screens 9–10, `AccessRequestRespond` + noindex page):
  10-state machine — loading / invalid / pending / submitting / approved / denied / already-approved /
  already-denied / expired / connection-error (with retry). `action=accept|deny` URL param
  auto-submits once (per design README; POST-only mutation preserved). ⚠️ **Known design deviation:**
  info block adds a **Patient** row (patient_name is in the API; confirms whose records before
  consenting) — strike in review if unwanted. Reason/Requested rows ship dormant until backend #71.
- **404** — `src/app/not-found.tsx` per design screen 8 (brand nav, 110px "404", Back to Home);
  fires for unknown org slugs too (all `[slug]` pages already call `notFound()`).
- Plumbing: `SETUP_PW_RESEND` endpoint const; proxy routes `/api/auth/setup-password/resend` +
  `/api/access-request/respond` (GET+POST); `SetupTokenInfo` + `AccessRequestInfo` types.
- Verified: tsc clean, vitest **63/63** (13 new: respond state machine incl. re-GET-after-rejected-POST
  + auto-submit; set-password token states incl. resend), `next build` green, and **30/30 live checks**
  driven with Playwright against the seeded local backend — including a REAL end-to-end invite
  (org-admin `POST /org-admin/staff/` → token from DB → welcome screen → password set → **login 200
  with the new password**), expired-invite resend, approve + auto-deny + all outcome/edge cards,
  404 status code 404. Screenshots in scratchpad. DB reset to seed state after (one throwaway
  invitee `invitee.prd@demo.test` remains in the local DB, password `Ngz#Pass1`).

**Pending / TODOs:**
- [ ] Qeeyat: review PR D.
- [ ] Wire announcements cards when backend #69 ships; render Reason/Requested rows live when #71 ships.
- [ ] Then per the 2026-07-11 schedule: PR 5/6/doctor + write workflows. Bug list still owed by Bastoh.
- [ ] ARCH-7: ARCHITECTURE.md rewrite still pending (still describes the purged vanilla app).

---

### 2026-07-13 (later) — Design PR C: org landing rebuilt to the design (PR: feat/design-org-landing)

**Context:** Same session as the brand-asset PR below. PR C scoped against the design + live contracts
before building. Was briefly stacked on `fix/brand-assets` (needs its `.webp` + purged `public/`), but
Qeeyat merged #60 (with a merge commit ✓) before PR C went up → targets `develop` directly.

**Contract verifications (probed prod AND seeded local Docker backend):**
- **Announcements endpoint does NOT exist** (404 text/html on both, vs json 404 for by-slug with an
  unknown slug — i.e. route missing, not empty DB). Our `ORG_ANNOUNCEMENTS` constant was invented
  (GLOBAL-2 pattern) → removed. **Backend #69 filed** (public GET + expected shape). Page ships the
  design's empty state; wire cards when #69 lands.
- **`GET /org/by-slug/` is much richer than its stale schema docstring** — Bastoh was right that the
  fields exist: real response has `clinic_name/address/hours/phone/email`, `emergency_phone`,
  `city/state/country_name`, `page_title`, and **`logo_url` (NOT `logo`)**; **no `id`/`is_active`**.
  Backend #70 filed then corrected + closed (only stale-docstring note remains).
- **Two latent bugs fixed on the back of that:** `Organization` type rewritten to the real shape;
  all 5 org auth pages passed `org.logo` (always `undefined` — org logos NEVER rendered) → now
  `logo_url`; old landing's `is_active` check would 404 every org (field absent) → removed.
- `POST /org/<slug>/contact/` verified (public, `{name,email,phone,message}` all required).

**PR C `feat/design-org-landing`** (→ develop via stack, reviewer Qeeyat):
- `/[slug]` page fully rebuilt per design: fixed 70px nav ("Sign In to Portal" → org signin), dual-logo
  hero (HC mark × org logo, initial-tile fallback; org name blue in H1), announcements section (empty
  state w/ stroke-SVG icon — README decision 5, no emoji), wellbeing carousel, contact section
  (info column renders clinic fields when non-null + "Trouble signing in?" + emergency line block;
  form card posts via new `/api/contact/[slug]` proxy), 3-col dark footer (LinkedIn/X).
- `WellbeingCarousel` rebuilt to spec: 300px cards, design's final copy, rAF auto-scroll 0.7px/frame,
  pause-on-hover, seamless doubled loop. **Design's arrow buttons dropped (Bastoh, mid-session).**
- **`noindex` on ALL org routes** via new `src/app/[slug]/layout.tsx` (robots noindex,nofollow) —
  README decision 1. Verified: org landing + org signin carry the meta, general landing does not.
- Verified: tsc clean, vitest 50/50, `next build` green, and driven live against the seeded local
  backend — real org data rendered, carousel transform advances (no arrows), contact form submit
  → **DRF 201** + success state, screenshots of hero/sections/full page.

**Pending / TODOs:**
- [ ] Qeeyat: merge #60 (merge commit!) → then PR C (check base retargeted to develop).
- [ ] Wire announcements cards when backend #69 ships.
- [ ] **PR D** — set-password (org name/logo from #66) + access-request respond (`accept`|`deny`) + 404.
  Refresh local `API-doc.md` first (now double-stale: respond POST + by-slug shape).
- [ ] Then per the 2026-07-11 schedule: PR 5/6/doctor + write workflows. Bug list still owed by Bastoh.

---

### 2026-07-13 — Brand-asset fixes: favicon, logo sizing, image weight + old-app purge (PR: fix/brand-assets)

**Context:** PR B (#59) merged; Bastoh deployed `develop` to Vercel manually (free plan) and flagged
two landing-page issues: distorted/oversized favicon and a too-small nav logo. Root cause of BOTH:
`HealthClouda-icon-tight.png` is **341×171 (2:1)** but was used in square slots — browsers squash a
non-square favicon into the tab square, and a 34×34 `object-contain` box shrinks the mark to 17px
tall. The design file itself specified 34×34, so the bug was inherited from the design.

**PR `fix/brand-assets`** (→ develop, reviewer Qeeyat):
- **Favicon:** proper square icons generated with sharp (mark trimmed, centered, 8% padding) →
  `src/app/icon.png` (512², transparent, 8 KB) + `src/app/apple-icon.png` (180², white plate for
  iOS) via App Router file conventions; `metadata.icons` block removed from `layout.tsx`.
- **Logo mark at natural 2:1 aspect** everywhere it was squared: landing nav 34×34→56×28, hero
  portal mock 26×26→44×22, footer 30×30→56×28, AuthCard 24×24→48×24 (was visually OK via
  `h-6 w-auto`, srcset size fixed).
- **Asset diet** (sharp pipeline, script in scratchpad — not committed):
  `Backgroud_flare.png` 1.5 MB → **301 KB WebP** (1080w, q60 — blurred decoration; was a raw CSS
  background on every auth page, bypassing next/image; PNG deleted, AuthCard points at .webp);
  `Female_doctor.jpg` 805→108 KB (1600w mozjpeg); palette-compressed PNGs in place:
  `Frame 64` 565→208 KB, `unilogo` 259→74, `EHR` 155→43, P-1…P-6 ~52–101→23–36, `Hero_picture`
  90→32, `BENEFIT_ONE` 40→9. Total images: ~3.9 MB → ~1.0 MB. (Frame 64/unilogo/EHR are PR C's
  org-landing assets — compressed ahead of time, same filenames.)
- **Old Vanilla JS app purged from `public/`** (Bastoh approved): all legacy HTML/JS/CSS —
  root pages, 6 dashboard folders, organization/, access-request/, assets/js+css, stale
  sitemap.xml (placeholder domain, .html URLs) — ~900 KB that was deployed verbatim and publicly
  reachable (e.g. `/signin.html` with localStorage-token login hitting prod API). Kept:
  `robots.txt`, `assets/images/`. All recoverable from git history. NOTE: makes ARCHITECTURE.md
  (still describing that old app) fully historical — ARCH-7 rewrite still pending.
- Verified: tsc clean, vitest 50/50, `next build` green ×2 (pre- and post-purge), prod server
  driven with Playwright — icon links resolve (`/icon.png` 200), flare .webp 200 on `/signin`,
  screenshots of nav/hero/footer/signin + full-page (no compression artifacts).

**Pending / TODOs:**
- [ ] Qeeyat: review + merge `fix/brand-assets`.
- [ ] PR C — org landing `/[slug]` + `noindex` on org routes; PR D — set-password + access-request
  respond (`accept`|`deny`) + 404. Refresh local `API-doc.md` before PR D.
- [ ] Then per the 2026-07-11 schedule: PR 5/6/doctor + write workflows. Bug list still owed by Bastoh.

---

### 2026-07-12 — Design PR B (auth set) — sign-in + full recovery flow rebuilt to the design

**Context:** Bastoh shared the backend→frontend handoff MD. Two things mattered for the design PRs:
(1) **backend issue #66 landed** — `GET /auth/setup-password/validate/` now returns
`organization_name` + `organization_logo` (either nullable → fall back to HealthClouda). Clears the
"ship without org name" caveat for PR D. (2) New affordances for later PRs: public
`POST /auth/setup-password/resend/` (powers the set-password expired-state "Request a new link" button)
and `POST /auth/users/<id>/resend-setup-email/` (staff-table resend, PR 6).

**Verified live against Swagger** (`/api/v1/schema/`, saved locally) before building:
- **Access-request respond action enum = `accept`|`deny`** (in the POST operation description). The
  handoff MD's `approve|deny` is WRONG; our 2026-07-11 note was right. Swagger wins → PR D uses
  `accept`/`deny` (sending `approve` = silent 400). The POST exposes no formal requestBody serializer
  (plain APIView) — hand-write the `{token, action}` type. (`ReferralResponseRequest` in the schema is
  the *referral* accept/reject body — unrelated.)
- **Org login is email-only.** The login endpoints expose no request-body serializer in the schema
  (plain APIView), but the handoff documents `{email, password}` in two places and Bastoh confirmed it.

**PR B `feat/design-auth-set`** (→ develop, reviewer Qeeyat) — high-fidelity restyle of the *existing,
already-wired* auth components (not a from-scratch build). All login/recovery logic preserved; only
presentation + a few behaviour gaps changed:
- **Shared shell** `AuthCard` rebuilt: flare-image + gradient bg with two blurred blobs, 64px white top
  nav (brand left / outlined back-button right; org mode swaps brand → org logo 32px + org name),
  optional 56px icon chip + H1 + sub, 700px white card (`shadow-card`). One component, themed by org.
- New primitives: `authStyles.ts` (shared input/button/label classes), `AuthIcons.tsx` (mail/lock/
  shield/mail+/check/eye + requirement ticks — SVGs lifted verbatim from the design), `TextField`
  (left-icon labelled input); `PasswordInput` restyled to spec (lock + eye toggle).
- **Sign-in (general + org + admin)** one `SigninForm`: general H1 "Login to HealthClouda" (40px), org
  H1 "Sign in to **{Org}** HealthClouda" (org name blue, 36px) + org nav branding; Remember-me
  (**UI-only** — no session-length plumbing yet, commented), forgot link, `#ebf3ff` Notice box (no
  online account creation → visit reception). Admin variant = no Notice/Remember.
- **Recovery flow** all four screens restyled with org theming: forgot (lock chip, org email
  placeholder `e.g. user@<slug>.com`, back-to-login); check-email (OTP box states + **Verify disabled
  until 6 digits** + **resend countdown** "Resend email (0:24)"); reset (rebuilt `PasswordStrengthMeter`
  = single track + live 2×2 requirements grid + match message + **submit gated on full rule set**);
  success (72px chip w/ **animated blue check** + "Continue (5)" countdown).
- **Correctness bump:** reset-password zod schema now enforces the *full* backend rule
  (≥8 + upper + digit + special) client-side, via a shared `passwordChecks/passwordIsValid` helper that
  the meter UI and schema both consume (reused by set-password in PR D).
- ⚠️ **Known design deviation:** design labels the org sign-in field **"Email / HealthClouda ID"**, but
  backend login is **email-only** (verified above) → shipped as **"Email address"**, strict-email
  validation. HCL-ID login would need a backend `api-request`. (Same spirit as PR A's phone-field note.)
- Verified: tsc clean, vitest 50/50, `next build` green (22 routes), and **all six screens driven +
  screenshotted** (Playwright) — general sign-in, forgot, OTP (filled/active/empty box states),
  reset (Weak strength + requirements grid), success, and **org sign-in** (rendered via a throwaway
  preview route since the local backend isn't seeded → org logo + blue org name + email-only field +
  org Notice copy all correct). Set-password / 404 / access-request stay in PR D.

**Pending / TODOs:**
- [ ] Qeeyat: review + merge PR B.
- [ ] **PR C — org landing `/[slug]`** + `noindex` on all org routes (design has announcements +
  wellbeing carousel + org contact form). Then **PR D** — set-password (now with org name/logo from
  #66) + access-request respond (`accept`|`deny`) + 404. B/C/D are independent off develop.
- [ ] Then per the 2026-07-11 schedule: PR 5/6/doctor + write workflows. Bug list still owed by Bastoh.
- [ ] Refresh local `API-doc.md` (stale: GET-only respond) before PR D.

---

### 2026-07-11 (evening) — Delivery plan locked; design PR A shipped; PR D API gaps verified + filed

**Delivery decision (Bastoh):** ship **~Tue–Wed 2026-07-21/22**, scope = **Cut 2** (everything incl.
the P2 write workflows: receptionist check-in/register/appointments, doctor episode/prescription/
referral). Demo surface = **Vercel deployment on `develop`** (Bastoh is demoing to a potential
connection) → final smoke pass must run against the deployed URL + prod backend. Schedule:
weekend = design PRs A+B; Mon–Tue = PR 5 + C + PR 6 + doctor PR + CI; Wed–Thu = PR D + sweeps +
bug list (still owed); then write workflows; Fri 18 buffer.

**PR A `feat/design-foundations-landing`** (→ develop, reviewer Qeeyat):
- Design tokens into the styling layer: Lato added via `next/font` (`--font-lato`), Tailwind v4
  `@theme inline` tokens (`primary/primary-dark/ink/page/chip/panel/footer/hairline/input-*`,
  `font-heading`/`font-body`, card + button shadows). Dashboards untouched (still Inter).
- **General landing `/` recreated per the design** (nav w/ mobile drawer, flare hero + patient-portal
  mock, how-it-works, features, one-platform, benefits, about, security, contact, CTA banner,
  4-col footer). Wellbeing carousel REMOVED from `/` (design puts it on the org landing — PR C).
- `design_handoff_prelogin/` committed (Bastoh's call: Qeeyat sees design source in review).
  Only new asset was `HealthClouda-icon-tight.png` (all others already in `public/assets/images/`).
- ⚠️ **Known design deviation:** contact form has an added **Phone number** field — backend
  `ContactUsRequest` REQUIRES `phone_number`; full name split client-side, organisation prefixed
  into `message`. Verified live: proxy → DRF 201.
- Verified: vitest 50/50, tsc clean, build green, rendered page markers + compiled token utilities
  checked, contact submission created on local backend.

**PR D early API verifications (step 4 of the plan) — both answered:**
1. **Access-request respond:** live prod schema now has `GET /receptionist/access-requests/respond/?token=`
   (read-only details) + `POST {token, action: accept|deny}` (the mutation — backend fixed the
   GET-mutation hazard, their FLAG-241). Matches the design's assumption. Local `API-doc.md` is
   STALE (GET-only) → refresh it before PR D.
2. **Invite-token validate returns NO org branding:** `GET /auth/setup-password/validate/?token=`
   → `{valid, email, first_name, last_name, role}` (verified with a real token via local DB).
   Design needs org name in the welcome copy → **backend issue #66 filed** (additive field ask).
   If it doesn't land by PR D, ship without org name and pick up later.
- Bonus intel for **PR 6**: `POST /org-admin/staff/` requires `full_name` (not first/last) and
  **lowercase** `role` (`"nurse"`); 400 `{error, code, details}`. Note the casing inconsistency
  with the rest of the API (validate returns `"DOCTOR"`).

**Pending / TODOs:**
- [ ] Qeeyat: review PR A (blocks design PRs B/C/D).
- [ ] Next session: **design PR B (auth set)** — biggest design PR; also retires auth-page P1s.
  **Routing DECIDED (Bastoh, 2026-07-11): keep `/[slug]/…`** — the design README's `/org/[slug]`
  prefix was a doc mistake. All design PRs use the existing route structure.
- [ ] Then per the schedule above. Bug list still owed by Bastoh.

---

### 2026-07-11 (later) — NURSE-1 nurse vitals rebuild (PR: fix/nurse-vitals)

**Context:** Work plan step 1 (bug-list triage) skipped — Bastoh has no list yet — so straight to
step 2: NURSE-1, the last known P0. Decision made this session: `design_handoff_prelogin/` WILL be
committed (goes in design PR A so Qeeyat sees the design source in review).

**What was done:**
- **Full nurse contract verified live** (local Docker backend, nurse@demo.test):
  - `GET /nurse/my-patients/` → `{count, results}` envelope of **admissions** (nested
    patient/bed/ward/episode) — the old page parsed flat patients → every cell "—".
  - `GET/PATCH /nurse/patients/<patient_id>/vitals/` → `{patient_id, episode_id, vitals: latest|null}`.
    PATCH **appends** a reading; partial bodies fine; 400 `{error, code, details}` with probed bounds
    (temp 30–45°C, systolic ≥50, diastolic 20–200, pulse 20–250, resp 5–60, SpO2 50–100,
    weight 0.5–500, height 20–300); 404 = no active episode; **empty body stores an all-null
    reading** → form requires ≥1 field and omits untouched inputs.
  - `GET /nurse/dashboard/stats/` → ward/admission aggregates. `vitals_pending`,
    `critical_patients`, `total_patients` **do not exist** (GLOBAL-6 nurse slice) — the whole
    "Vitals Pending" concept had no backend support.
- **PR 4 `fix/nurse-vitals`** (→ develop, reviewer Qeeyat): all four nurse pages rebuilt on the
  real shapes. New Vitals page = patient picker → latest-reading panel + record form (the core
  nurse workflow, previously missing entirely). Overview cards now real stats; My Patients shows
  HCL-ID/ward/bed/complaint with per-row "Record vitals". New types: `NurseAdmission`,
  `VitalsReading`, `PatientVitals`; `NurseStats` rewritten; dead `VitalRecord` deleted.
  **8 pre-fix tests red→green**; carries CONTRACT-AUDIT updates (NURSE-1 closed, GLOBAL-6 nurse
  slice, P2 record-vitals row) + this HANDOFF entry.
- Verified: vitest 50/50, tsc clean, `next build` green, and driven end-to-end through the real
  Next login route + `/api/data` + `/api/action` proxies against the local backend (login →
  stats → my-patients → PATCH reading → 400 out-of-range → GET shows new latest → SSR page 200).

**Pending / TODOs:**
- [ ] Merge PR 4 (`fix/nurse-vitals`).
- [ ] Bug list from Bastoh → triage (still owed; anything P0 jumps the queue).
- [ ] Design PRs A–D per the plan below (commit `design_handoff_prelogin/` with PR A) + the
  step-4 early API verifications.
- [ ] Then PR 5 (patient grant/deny + notifications), PR 6 (org-admin), GLOBAL-2 doctor leftovers.

---

### 2026-07-11 — PRs #55/#56 merged ✓; pre-login design batch delivered; work plan agreed

**Short session — no code.** Bastoh delivered the Claude design handoff and we drafted the plan below;
execution starts next session.

**State changes:**
- Qeeyat merged **PR #55** (patient appointments) and **PR #56** (duty initial state). `develop`
  synced locally; both local branches deleted, remotes auto-pruned. All of PATIENT-1 + GLOBAL-4 is live.
- **Design batch 1 landed:** `design_handoff_prelogin/` (untracked, repo root) — high-fidelity designs
  + README covering ALL pre-login pages: general landing `/`, org landing `/org/[slug]`, and the
  10-screen auth set (sign-in general+org, 4-step recovery in both modes, staff-invite set-password,
  404, access-request respond + outcome states). Read its `README.md` before touching any of it —
  it has the design tokens, route map, and agreed product decisions.

**Agreed work plan (in order):**
1. **Triage Bastoh's bug list** (held until #55/#56 merged — now unblocked). He'll share it next
   session. Anything P0 jumps this queue. Triage against `CONTRACT-AUDIT.md` — some are likely
   known items (NURSE-1, UX-6 notification bell, doctor `?status=OPEN`); new ones get pre-fix tests.
2. **NURSE-1 — nurse vitals rebuild** (last known P0, own session). Broken logged-in functionality
   beats pre-login polish.
3. **Design batch as independent PRs off `develop`** (no stacking):
   - **PR A — foundations + general landing `/`:** assets into `public/`, design tokens (Inter/Lato,
     colors) into the styling layer, landing page. Blocks B–D; goes first.
   - **PR B — auth set:** sign-in (general + org mode) + 4-step recovery flow with org theming.
     Highest product value — replaces real functional pages.
   - **PR C — org landing `/org/[slug]`** + `noindex` on all org routes.
   - **PR D — set-password + access-request respond + 404** (token-driven utility screens, all
     outcome states).
   After PR A merges, B/C/D are parallel.
4. **Early API verifications (before/alongside PR D):** confirm access-request respond endpoint in
   current docs (old: `receptionist/access-requests/respond/`), and whether invite-token validation
   returns org name/logo. If missing → `api-request` issue on the backend repo NOW for lead time.

**Pending / TODOs:**
- [ ] Get bug list from Bastoh → triage (step 1).
- [ ] Decide: gitignore `design_handoff_prelogin/` (precedent: internal handoff docs stay out of git)
  or commit it so Qeeyat sees design source in review. **Unanswered — ask Bastoh.**
- [ ] Then steps 2–4 above; the 2026-07-09 leftovers (PR 5 patient grant/deny + notifications,
  PR 6 org-admin, GLOBAL-2 doctor leftovers, seed_demo ask, ARCH-2/3/7) queue behind them.

---

### 2026-07-09 — Backend watch-list shipped → PATIENT-1 + GLOBAL-4 wired (PRs #55, #56)

**Context:** Backend notified that both watch-list items landed (their PR #65, deployed to prod):
`GET /patients/me/appointments/` (PATIENT-1) and duty fields on `/auth/me/` (GLOBAL-4).
Goal: verify the contracts empirically, then wire both — pre-fix tests first.

**What was done:**
- **Both contracts verified live** (prod schema + seeded local Docker backend, all roles probed):
  - Appointments: route on prod schema ✓; envelope + item shape exactly as promised; `?status=`
    case-insensitive ✓; `?date=YYYY-MM-DD` ✓ (400 `{error, code, details}` on malformed) ✓.
  - Duty fields: `/auth/me/` has them for DOCTOR + NURSE; keys **omitted entirely** (not null) for
    other roles; **NOT on the login response** — backend's message was accurate on every point.
    Covered anyway: our login route enriches from `/auth/me/` (PR #49) — but that enrichment only
    copied `organization.*`, which was the real frontend bug.
- **PR #55 `fix/patient-appointments`** (→ develop, Qeeyat reviewing): overview panel drops the
  invented `?upcoming=` (GLOBAL-2 pattern — it silently showed ALL appointments) for
  `?status=scheduled`; list page gets status tabs (reset to page 1) + the real item shape incl.
  duration, reason, org name, cancellation reason. New `PATIENT_APPOINTMENTS` endpoint constant +
  strict `PatientAppointment` type. 4 pre-fix tests red→green. **Carries all doc updates**
  (CONTRACT-AUDIT: PATIENT-1 closed, #54 items checked off, watch list cleared; this HANDOFF entry).
- **PR #56 `fix/duty-initial-state`** (→ develop, Qeeyat reviewing, **independent — not stacked**):
  login enrichment copies `is_on_duty`/`duty_toggled_at` (preserving key-absence for other roles);
  DutyToggle now trusts the toggle response instead of blindly flipping local state (stale-tab bug).
  2 pre-fix tests red→green. **Code-only by design** so #55/#56 can't conflict on shared docs —
  merge in either order.
- Both PRs: vitest 38/38, tsc clean, `next build` green, and driven end-to-end through the real
  Next login route + `/api/data` proxy against the local backend (patient, doctor, receptionist).
- Post-#54 bookkeeping: develop synced, merged branch pruned (GitHub auto-delete worked ✓).

**Pending / TODOs:**
- [ ] Merge PR #55 and PR #56 (independent, either order).
- [ ] **PR 4: Nurse vitals rebuild (NURSE-1)** — the last P0, needs its own session.
- [ ] Then PR 5 remainder (patient grant/deny UI, notifications, mark-read) and PR 6 (org-admin:
  DELETE broken approve/deny per ORGADMIN-1, staff invite flow).
- [ ] GLOBAL-2 leftovers in doctor PR: `?status=OPEN`→`ACTIVE`, drop `?my=`/`?today=`/`?upcoming=`.
- [ ] Bastoh may connect Claude design to the repo — implement its designs when they land.
- [ ] Ask backend to run `seed_demo` on the deployed dev tier; ESLint + CI (ARCH-2/3); ARCHITECTURE.md
  rewrite (ARCH-7); delete `rewrite/react` once the rewrite lands on `main`.

---

### 2026-07-05 — Backend questions answered + PR #51 stranded-merge rescue + stacking rules

**Context:** Goal was to answer the 4 open backend questions at the bottom of `CONTRACT-AUDIT.md`.
Mid-session we discovered PR #51 had merged into a dead base and never reached `develop`.

**What was done:**
- **All 4 backend questions ANSWERED** — first verified empirically (live prod schema + FRONTEND_HANDOFF.pdf
  + probing the seeded local Docker backend with the demo logins), then confirmed with the backend side:
  1. **PATIENT-1:** confirmed gap (route 404s, dashboard has no appointment data). Backend will build
     paginated `GET /patients/me/appointments/` (`?status=`/`?date=`) — **queued, they'll notify**.
  2. **ORGADMIN-1:** removal INTENTIONAL (org-admin approval bypassed patient consent — security fix).
     PR 6: delete approve/deny, keep the read-only list.
  3. **GLOBAL-4:** backend will add `is_on_duty` + `duty_toggled_at` to `/auth/me/` AND login user for
     DOCTOR/NURSE — **queued, they'll notify**.
  4. **GLOBAL-2:** verified live — `?status=`/`?date=`/`?search=` work; `?today=`/`?upcoming=`/`?my=`
     silently IGNORED; episode enum is `ACTIVE` not `OPEN` (frontend's `?status=OPEN` → 0 rows). Frontend
     fixes go in the role PRs.
  - Bonus: **REC-3 verified** — on-duty doctors returns a paginated ENVELOPE, not a bare array (PR 3 fix).
  - All findings + decisions annotated in `CONTRACT-AUDIT.md` (this branch).
- **PR #51 stranded-merge discovered & rescued:** #51 (`fix/error-pagination`) was merged by Qeeyat into
  its stacked base `test/auth-regression` 33 min AFTER that base merged into `develop` (#50) — the
  retarget never happened, so PR 2's fixes never reached `develop`/Vercel. Opened **PR #52**
  (`test/auth-regression` → `develop`, diff = exactly #51's changes) — **awaiting Qeeyat**.
- **Root cause fixed:** repo setting `delete_branch_on_merge` was OFF → enabled (with Bastoh's approval).
  Stacking rules adopted — see the Branch Strategy section above.
- **`.gitignore`:** added `FRONTEND_HANDOFF.pdf` (internal doc policy) + `*.tsbuildinfo` (TS build cache).
- Dev-tier deployed backend is NOT seeded (`demo-clinic` 404s) — verification ran against local Docker.

**Pending / TODOs:**
- [x] Qeeyat merged **PR #52 and #53** (same day, 17:36/17:37) — auto-delete + auto-retarget worked exactly
  as designed on its first run. `develop`/Vercel now has PR 2's fixes.
- [x] Branch cleanup complete: stale remote `fix/error-pagination` + all merged locals deleted.
  Remotes now: `main`/`staging`/`develop` + `rewrite/react` + the open PR branch.
- [x] **PR 3 DONE same session — PR #54 open** (`fix/receptionist-contract` → `develop`, Qeeyat reviewing):
  GLOBAL-6 receptionist stats shape (verified live), REC-3 on-duty envelope, REC-2+GLOBAL-3 search fields
  (HCL-ID, masked_phone, access badges). 4 pre-fix tests red→green; vitest 34/34, tsc clean, build green.
- [ ] Tell Qeeyat: branches auto-delete on merge now + the merge-commit-for-stack-parents rule.
- [ ] Merge PR #54; then check off REC-2/REC-3/GLOBAL-6(rec) in CONTRACT-AUDIT.md.
- [ ] Watch for backend notifications: `GET /patients/me/appointments/` (PATIENT-1) and duty fields on
  `/auth/me/`+login (GLOBAL-4) — wire patient appointments + DutyToggle initial state when they land.
- [ ] Ask backend to run `seed_demo` on the deployed dev tier (enables verifying against the real URL).
- [ ] Delete `rewrite/react` once the rewrite lands on `main`; ESLint + CI (ARCH-2/3) still pending.

---

### 2026-07-04 — PR #49 regression tests + branch cleanup + PR 2 error/pagination hygiene

**Context:** PR #49 (`fix/auth-layer`) merged into `develop` (`447758b`). Per the pre-fix/post-fix
discipline adopted 2026-07-03, first task was to backfill regression guards for the auth fixes that
shipped without tests, then clean up merged branches.

**What was done:**
- **Branch hygiene** (our "merged → delete" principle): fast-forwarded local `develop` to `447758b`;
  deleted 5 stale remote branches (`fix/auth-layer` #49, `fix/vercel-deploy-handoff` #48,
  `fix/ward-edit-id-quoting`, `chore/repo-cleanup` #44, and the redundant `fix/vercel-nextjs-config`)
  and their local copies. Remaining remotes: `main`/`staging`/`develop` (protected) + `rewrite/react`.
- **Regression tests — 14 new, vitest 23/23 green** (`test/auth-regression` off `develop`):
  - `src/app/api/auth/refresh/route.test.ts` — refresh route persists the ROTATED refresh token;
    401 clears cookies; no-cookie short-circuits without calling DRF.
  - `src/middleware.test.ts` — gates on access OR refresh cookie (refresh-only nav passes through);
    never builds `/undefined/...`; org-aware + superadmin signin redirects.
  - `src/lib/client-api.test.ts` — single-flight refresh (concurrent 401s → ONE refresh → retry both);
    org-aware signin redirect when refresh fails.
  - `src/lib/router.test.ts` — `getOrgSlugFromPathname` slug vs. reserved-path handling.
  - **Verified genuine:** temporarily reverted the refresh-rotation and `/undefined/` fixes and confirmed
    the guards go red (buggy middleware reproduced exactly `/undefined/doctor`), then restored → green.
- **`CONTRACT-AUDIT.md` progress-tracked** (audit's own rule: "check items off as PRs land"): verified
  against the merged code which items PR #49 actually closed → checked off **AUTH-1..5, AUTH-5b, REC-1,
  ARCH-1** with per-item annotations + a top-of-file progress log. Confirmed **AUTH-6 is still open**
  (`serverFetch` swallows errors as `null`) → moved to PR 2; ARCH-6 marked in-progress.

**Decisions made:**
- `rewrite/react` is NOT deleted yet: merged into `develop` but the migration plan says "delete after
  final merge" and `main` has not received the rewrite. Delete once it reaches `main`.

**PR 2 (`fix/error-pagination`, stacked on `test/auth-regression`) — same session:**
- Pre-fix failing tests FIRST (6/6 red confirmed against buggy code):
  `ReceptionistDashboard.test.tsx` — page_size param, client stats fallback, error-state-not-empty-state,
  retry refetch, pagination controls, `?page=2` request. Plus a 429 friendly-message guard in
  `client-api.test.ts`.
- **GLOBAL-1:** all 8 `?limit=` call sites → `?page_size=` (DRF ignores `limit`).
- **UX-ERR-1:** new shared `ErrorState` component (+ Try again); every list/preview on all 6 dashboards
  now distinguishes failed fetch from empty. NOTE: patient appointments VISIBLY error until PATIENT-1
  is resolved (endpoint 404s — backend decision pending).
- **PERF-1:** new `usePaginatedList` hook (owns page state, builds `?page_size=/&page=`); `<Pagination />`
  wired on all full list pages (6 dashboards). Filter/tab switches reset to page 1.
- **AUTH-6:** all 6 dashboards fall back to client-side stats fetch when `initialStats` is null —
  client layer refreshes the session, so expired-token server renders recover instead of eternal shimmer.
- **GLOBAL-5:** 429 friendly message now visible via error states; guard test added.
- Verified: `tsc --noEmit` clean, vitest 30/30, `next build` green.

**Pending / TODOs:**
- [ ] Get PR #50 (`test/auth-regression`) reviewed + merged into `develop` — **merge with a MERGE COMMIT**
  (not squash/rebase) so the stacked PR 2 retargets cleanly.
- [ ] Then merge PR 2 (`fix/error-pagination`) — retarget base to `develop` after #50 lands.
- [ ] Delete `rewrite/react` once the rewrite lands on `main`.
- [ ] PR 3: receptionist contract fixes (REC-2, REC-3, GLOBAL-3 HCL-ID) — failing tests first.
- [ ] Remaining items carry over from the 2026-07-03 entry below.

---

### 2026-07-03 — Full-codebase audit (5 lenses) + auth-layer fix (PR: fix/auth-layer)

**Context:** Backend fix phase M0–M5 is complete (see `FRONTEND_HANDOFF.pdf`, gitignored-style local doc,
updated 2026-07-03 with `seed_demo` demo logins — all `@demo.test` / `Demo#Pass1`). Goal: catch all bugs,
align frontend with the new backend contract. Offline-first is DEFERRED to staging phase (backend decision
2026-07-02); build online-only but keep all data access behind a swappable layer.

**What was done:**
- Phase 0 baseline: install (flaky network corrupted 3 native binaries — fixed via cache verify + targeted
  re-downloads), build green (22 routes, 102–142 kB first load), vitest 9/9, dev server + local Docker
  backend (`localhost:8000`) verified end-to-end with seeded logins.
- Phase 1: **full codebase review** through 5 lenses (correctness/contract, security, performance,
  architecture, UX/a11y) against the handoff PDF + live OpenAPI schema + live backend.
  → **`CONTRACT-AUDIT.md`** (committed): ~9 P0s, ~20 P1s, ~25 missing workflows, proposed PR order,
  4 open backend questions. Read it before doing any Phase 2 work.
- Phase 2 started — **PR 1 (`fix/auth-layer`)**, all verified live against Docker backend:
  - Refresh route now persists the ROTATED refresh token (was discarded → 2nd refresh always 401'd).
  - New `src/lib/client-api.ts`: single data layer, 401 → single-flight refresh → retry → org-aware
    signin redirect. `use-api.ts` rewired on top (same interface). This is the offline swap seam.
  - Login route enriches user with `organization_slug/name` from `/auth/me/` (login response has none —
    staff used to be redirected to `/undefined/<role>`).
  - Middleware gates on access OR refresh cookie (access cookie expires hourly — page navs used to bounce
    to signin despite valid refresh token); never builds `/undefined/` redirects.
  - Logout + 401 redirects are org-aware; receptionist search param fixed (`?q=` → `?query=`).

**Decisions made:**
- Offline-first deferred to staging phase; `SYNC-CONTRACT.md` already designed (lives in backend repo).
- Fix order = CONTRACT-AUDIT.md "Phase 2 fix order" (auth → error/pagination hygiene → per-role PRs,
  mirroring backend app-by-app review).

**Pending / TODOs:**
- [x] Get PR `fix/auth-layer` reviewed + merged — **merged as PR #49** (`447758b` on `develop`).
- [x] **Adopt pre-fix/post-fix test discipline (agreed 2026-07-03):** every fix PR starts with a failing
  test reproducing the flagged issue, fix turns it green, test stays as regression guard.
  Regression tests for PR #49 backfilled 2026-07-04 (see that session entry).
- [ ] PR 2: error states + pagination + `?limit=`→`?page_size=` (see audit UX-ERR-1, PERF-1, GLOBAL-1).
- [ ] PR 3+: per-role contract fixes — NOTE stats field names mismatch backend on likely all roles (GLOBAL-6).
- [ ] Nurse vitals rebuild (NURSE-1) — biggest P0 remaining, needs its own session.
- [ ] Answer 4 open backend questions at the bottom of CONTRACT-AUDIT.md (patient appointments endpoint,
  org-admin review removal, `is_on_duty` source, list filters).
- [ ] ESLint config + GitHub Actions CI (ARCH-2/3) — still pending from May.
- [ ] ARCHITECTURE.md still documents the old Vanilla JS app — rewrite after PR 1–3 land.

---

### 2026-06-12 — Vercel deploy failures fixed (Output Directory override)

**What was done:**
- Diagnosed why every Vercel deployment failed after the React rewrite merged: builds errored with `NEXT_NO_ROUTES_MANIFEST` because the **dashboard Output Directory setting was still `public`** (leftover from the static site). Dashboard settings override `vercel.json`, so the `"framework": "nextjs"` fix in fe6b115 never took effect.
- Cleared the Output Directory override via the Vercel API (`outputDirectory: null` → Next.js default `.next`).
- Redeployed `develop` head (6e14a2c) — preview built green in 1m.
- Production was stuck on a stale commit (e17319e) with a real `module_not_found` build bug already fixed by PR #46, so the current develop build was promoted to production. `healthclouda-frontend.vercel.app` is live (HTTP 200).
- Verified `develop` branch ruleset: PRs required (1 approval), no direct pushes, no force-push/deletion.

**Decisions made:**
- Vercel production branch **stays `develop` for now** — the `main` → Production remap is deferred (to be discussed).
- Branch `fix/vercel-nextjs-config` is redundant — its only commit duplicates fe6b115 already on `develop`, and the actual fix was the dashboard setting. Safe to delete without merging.

**Pending / TODOs:**
- [ ] Delete the redundant `fix/vercel-nextjs-config` remote branch.
- [ ] Preview URLs return 401 (Vercel Deployment Protection) — decide whether previews should be publicly viewable.
- [ ] Remap Vercel environments (`main` → Production) — deferred, see decision above.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`) — still pending.

---

### 2026-06-11 — Full technical review + Next.js migration plan

**What was done:**
- Full codebase audit: measured all JS files (~8,500 lines), CSS (~1,680 lines), 22 HTML shells, 6 dashboards.
- Identified architecture ceiling: no module system, global scope pollution, 6× code duplication, zero tests, localStorage token security debt, memory leaks from uncleared intervals.
- Evaluated Vanilla JS → Next.js migration: verdict is **proceed**.
- Created `MIGRATION-PLAN.md` — full reference document covering audit, stack analysis, migration decision, step-by-step guide, phased timeline, and final recommendation.

**Decisions made:**
- Migrate to Next.js (App Router) via `rewrite/react` branch (existing branch strategy from HANDOFF.md applies).
- **Convert the existing repo** — do not create a new one. Git history is preserved.
- Do not rebuild — port `config.js`, `api.js`, `router.js` directly. Redesign only the structure.
- Phase 1 (auth) ships to `staging` as a standalone PR before dashboards are touched.
- No new features on `develop` (Vanilla JS) once Phase 1 ships.

**Pending / TODOs:**
- [ ] Start Phase 0: cut `rewrite/react` branch, init Next.js, port `config.js` → `config.ts`.
- [ ] Open backend `api-request` issues for 2 missing receptionist endpoints before Phase 3.
- [ ] Remap Vercel environments (`main` → Production, `staging` → Beta, `develop` → Dev) — still pending from prior session.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`) — still pending.

---

### 2026-05-25 — CLAUDE.md upgrade + ARCHITECTURE.md created

**What was done:**
- Replaced `CLAUDE.md` with a more structured version: login portal contract, auth flow notes, explicit session start/during/end workflow, key patterns to enforce.
- Created `ARCHITECTURE.md` — full documentation of file structure, routing (Vercel rewrites + `HC_ROUTER`), auth flows (3 portals), API layer, and API endpoint map per role.

**Decisions made:**
- `ARCHITECTURE.md` is now a required living doc — update it whenever routing, file structure, or API integration changes.

**Pending / TODOs:**
- [ ] Merge PR #44 (repo cleanup) once Qeeyat reviews.
- [ ] Add `ARCHITECTURE.md` to PR #44 or open a separate PR to track it.
- [ ] Remap Vercel environments: `main` → Production, `staging` → Beta, `develop` → Dev.
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`).
- [ ] Start `rewrite/react` branch when React work begins.

---

### 2026-05-25 — Branch Strategy Restructure + Repo Cleanup

**What was done:**
- Diagnosed state: `main` had only 1 commit (initial), `develop` had 89 commits, no `staging` existed, 36 stale remote branches.
- Opened PR #43 (`develop` → `main`) to align main — merged by Qeeyat.
- Created `staging` branch from `develop`.
- Updated GitHub ruleset ID `11328360` from `~ALL` to `main/staging/develop` only (was blocking all branch deletions and pushes).
- Deleted 36 stale remote branches and 30 stale local branches.
- Updated `CLAUDE.md` to add `## Session Handoff (REQUIRED)` instruction.
- Created `HANDOFF.md` (this file) and added it to version control.
- Fixed `.gitignore`: removed stale `claude.md` and `Backend-prompts.md` entries so `CLAUDE.md` and `HANDOFF.md` are tracked.
- Deleted `BACKEND-PROMPTS.md` — bugs were resolved; offline-first architecture saved to Claude memory.
- Deleted 9 unused placeholder/fictional images from `public/assets/images/`.
- PR #44 open (`chore/repo-cleanup` → `develop`) — awaiting Qeeyat review.

**Decisions made:**
- Branch structure mirrors the backend repo exactly (main / staging / develop).
- React rewrite goes through `rewrite/react` → `staging` → `develop` → `main` — never splits stack across environments.
- `CLAUDE.md` and `HANDOFF.md` should be committed (team/Claude reference), but `PRD.md` and `API-doc.md` stay gitignored (sensitive internal docs).

**Pending / TODOs:**
- [ ] Merge PR #44 (repo cleanup) once Qeeyat reviews.
- [ ] Remap Vercel environments: `main` → Production, `staging` → Beta, `develop` → Dev (needs Vercel dashboard — not yet done).
- [ ] Set up GitHub Actions CI (lint + build check on PRs to `develop`).
- [ ] Start `rewrite/react` branch when React work begins.

---

## Key Contacts

| Person | Role |
|---|---|
| Bastoh | Lead / owner |
| Qeeyat | Team reviewer |
