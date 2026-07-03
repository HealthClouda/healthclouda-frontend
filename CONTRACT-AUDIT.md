# Contract Audit — Frontend vs Backend (2026-07-03)

> Phase 1 deliverable: every finding from the 5-lens audit of the Next.js rewrite against the
> backend contract (FRONTEND_HANDOFF.pdf 2026-07-03 + live OpenAPI schema + live Docker backend).
> This is the Phase 2 work queue. Check items off as PRs land.
>
> **Severity:** P0 = broken right now, blocks core use · P1 = contract mismatch, wrong/degraded behaviour ·
> P2 = backend feature with no frontend UI · P3 = quality/polish.

## Verification sources

- `FRONTEND_HANDOFF.pdf` (backend → frontend handoff, 2026-07-03, incl. seed logins §6)
- OpenAPI schema pulled from the live backend (`/api/v1/schema/`)
- Live checks against local Docker backend (`localhost:8000`, seeded via `seed_demo`)
- Where the schema says "No response body" (hand-rolled APIViews), shapes must be verified live — marked **[verify live]**.

---

## Lens 1 — Correctness / Contract alignment

### P0 — broken now

- [ ] **AUTH-1: Token refresh is never called.** `src/app/api/auth/refresh/route.ts` exists but no code calls it
  (only match for `auth/refresh` is the config constant). Access cookie `maxAge` = 1h; on expiry `/api/data`
  and `/api/action` return 401 and `use-api.ts:22` hard-redirects to `/signin`. **Every user is logged out
  every hour** despite a valid 7-day refresh token.
- [ ] **AUTH-2: Rotated refresh token discarded.** Backend rotates + blacklists refresh tokens
  (schema: `TokenRefresh` requires `access` **and** `refresh`). `refresh/route.ts:31-33` persists only
  `access` — the cookie keeps the blacklisted token, so the second refresh always 401s.
  Fix: also set the refresh cookie (options already exist in `lib/auth.ts`).
- [ ] **AUTH-3: Refresh must be single-flight.** Route handlers share no memory across invocations —
  dedupe client-side: one module-level shared promise wrapping `/api/auth/refresh`; on 401 → refresh once →
  retry original request → only then redirect to signin. (Backend explicitly warned: concurrent refreshes
  = blacklisted-token race = logout.)
- [ ] **AUTH-4: Staff login redirects to `/undefined/<role>`.** Verified live: the login response `user` object
  has NO `organization_slug`/`organization_name`/`is_on_duty` (fields the frontend `User` type assumes).
  `SigninForm.tsx:81` builds `roleDashboardPath(user.role, user.organization_slug)` → `/undefined/receptionist`.
  Same bug in `middleware.ts:62-71` (redirect away from signin). Fix: login route enriches the user cookie
  from `GET /auth/me/` server-side (returns `organization.slug/.name/.org_id`), and/or use the portal's own
  `orgSlug` prop for org logins.
- [ ] **NURSE-1: Vitals feature is miswired.** `NurseDashboard` Overview + Vitals page fetch
  `/nurse/my-patients/` (a *patients* endpoint) typed as `VitalRecord[]`, with invented params
  (`?vitals_pending=true`, `?include_vitals=true`). Real contract: per-patient
  `GET/PATCH /nurse/patients/<id>/vitals/` (structured VitalsRecord; PATCH appends a reading).
  Also **no UI to record vitals at all** — the core nurse workflow. Needs rebuild: patient list → vitals
  panel per patient (view + record).
- [ ] **PATIENT-1: Appointments endpoint doesn't exist.** `PatientDashboard` fetches
  `/patients/me/appointments/` (twice) — not in the schema → 404 → patients always see "No appointments".
  No patient appointments endpoint exists in the backend; either use dashboard stats + episodes, or open an
  `api-request` issue for one. **[backend decision needed]**
- [ ] **REC-1: Patient search sends the wrong param.** `ReceptionistDashboard.tsx:223` sends `?q=`;
  backend expects `?query=` (schema-confirmed). Search never works.
- [ ] **ORGADMIN-1: Access-request review endpoint doesn't exist.** Approve/Deny buttons POST
  `{decision}` to `/org-admin/access-requests/<id>/review/` — absent from the schema → 404. Per the consent
  model only the **patient** grants/denies (`PATCH /patients/me/access-requests/<id>/` with
  `{"action":"grant"|"deny"}`). Remove/replace the org-admin review UI. **[confirm intent with backend]**

### P1 — contract mismatches / wrong behaviour

- [ ] **GLOBAL-6: Dashboard stats field names don't match the backend.** Verified live (receptionist):
  backend returns `{todays_checkins, awaiting_assignment, waiting_queue, bed_occupancy_rate, on_duty_doctors, …}`;
  frontend `ReceptionistStats` expects `{check_ins_today, pending_assignments, incoming_referrals,
  available_emergency_beds}` — every stat card reads undefined. Check ALL role stats types against live
  responses (likely systemic) and fix in each role PR. Search response field is `masked_phone` (not `phone`).
- [ ] **REC-2: Search results render dropped fields.** Table shows Email + DOB — the minimised search
  response deliberately omits them. Must show `healthclouda_id` (HCL-…), masked `phone`, and the 3 access
  flags (`has_visited_org`, `has_pending_access_request`, `has_approved_access`) instead.
- [ ] **GLOBAL-1: `?limit=` is not a DRF pagination param** (`?page_size=` is). Used in ~6 places
  (rec check-ins, doctor appts/episodes, patient notifs, superadmin orgs, org-admin access requests) —
  silently ignored; every "preview" list actually pulls 20.
- [ ] **GLOBAL-2: Unverified/invented query params** — `?today=true`, `?upcoming=true`, `?my=true`,
  `?status=OPEN` (doctor episodes) **[verify live]**; org-admin `?status=PENDING` is documented ✓.
  If unsupported, "Today's Appointments" etc. show unfiltered data — worse than erroring, in a clinic.
- [ ] **GLOBAL-3: No `healthclouda_id` anywhere in the app.** Patients must be identified by HCL-ID
  (wristbands), never raw UUIDs (patient "My Health" shows UUID fragments `#a1b2c3d4`).
- [ ] **GLOBAL-4: `is_on_duty` initial state is never provided** (not in login user, not in `/auth/me/`).
  DutyToggle always starts "off duty" regardless of truth. **[api-request: expose duty state]**
- [ ] **REC-3: Doctors on-duty response shape unknown** (schema: "No response body"). Code assumes a bare
  array; if it's an envelope, the assign-doctor dropdown never renders. **[verify live]**
- [ ] **GLOBAL-5: No 429 handling.** Login route surfaces its own local 429, but DRF 429s from data/action
  proxies surface as raw "HTTP 429" errors. Contract says show "try again shortly".
- [ ] **UX-ERR-1: Fetch errors render as empty states.** Most pages ignore `useApi`'s `error` and render
  "No check-ins" etc. when the backend is down/erroring. Clinically dangerous (empty queue ≠ failed fetch).
  Every list needs a distinct error state + retry.
- [ ] **AUTH-5: 401 redirect loses org context.** `use-api.ts` sends staff to `/signin` (patient portal)
  instead of `/{slug}/signin`.

## Lens 2 — Security

- [x] httpOnly + SameSite=Strict cookies for tokens (good — the localStorage debt is paid).
- [ ] **SEC-1: `/api/data` + `/api/action` are unrestricted proxies.** Any authenticated client can hit any
  backend path via `path=`. The backend enforces authz, but constrain anyway: require leading `/`, reject
  `..`/absolute URLs. Low effort, closes SSRF-shaped surface.
- [ ] **SEC-2: In-memory login rate limiter is a no-op on serverless** (resets per instance) — rely on the
  backend's real throttles; keep as best-effort. Note only.
- [ ] **SEC-3: CSP allows `unsafe-inline` + `unsafe-eval`** in script-src. Tighten post-migration (nonces).
- [ ] **SEC-4: 30-min inactivity timeout not implemented** (`SESSION_TIMEOUT_MS` unused). Clinics =
  shared computers. Reimplement (was in the old app).
- [ ] SEC-5: Middleware gates on cookie *presence* only (no JWT validation) — fine as UX gating since the
  API enforces; document the intent.

## Lens 3 — Performance / low-bandwidth (Nigeria lens)

- [x] Bundle sizes healthy: 102–142 kB first load, all routes.
- [ ] **PERF-1: No pagination UI anywhere** — `Pagination.tsx` exists but is never imported. Every list
  silently truncates at 20 rows (DRF default). Wire it up on all list pages.
- [ ] **PERF-2: Dashboard tab switches refetch everything, state resets** (nav is in-component `useState`,
  not routes). No deep links, no back button, no cache. Consider per-tab routes or cached fetches —
  also the seam the offline layer will need.
- [ ] PERF-3: Double hop on every request (browser → Next proxy → Django). Accepted trade-off for
  httpOnly cookies; revisit only if latency hurts on real connections.

## Lens 4 — Architecture / maintainability

- [ ] **ARCH-1: Consolidate the data layer** (offline-readiness requirement from backend, 2026-07-02).
  `useApi`/`apiAction` is already a decent seam — formalize it: one module owns all fetching (incl. the
  401→refresh→retry logic from AUTH-3), components never call `fetch` directly. This is the swap point for
  IndexedDB-first at staging phase. (`PatientSearchPage` calls `fetch` directly today — fold it in.)
- [ ] **ARCH-2: ESLint has no config** — `npm run lint` prompts interactively and `next lint` is deprecated.
  Add flat `eslint.config.mjs` + migrate script. Blocks CI.
- [ ] **ARCH-3: No CI.** Add GitHub Actions: lint + typecheck + vitest + build on PRs to develop
  (HANDOFF TODO since May).
- [ ] **ARCH-4: Types are optional-everything** (`PatientSummary.email?` etc.) — hides contract drift.
  Tighten to actual serializer shapes as each screen is fixed; consider OpenAPI codegen (handoff tip #1).
- [ ] ARCH-5: 6× duplicated icons + TableWrap/Th/Td across dashboards — extract to shared modules.
- [ ] ARCH-6: Test coverage is 2 files (StatCard, config). Add hook tests (MSW) + Playwright flows per role
  using seeded logins (`@demo.test` / `Demo#Pass1`).
- [ ] ARCH-7: `ARCHITECTURE.md` still documents the Vanilla JS app — full rewrite needed.

## Lens 5 — UX / Accessibility

- [x] Good foundations: shimmer loading, empty states, confirm dialogs, toasts, status badges.
- [ ] UX-1: Error states (see UX-ERR-1 above — highest UX priority).
- [ ] UX-2: Assign-doctor `<select>` and OTP inputs need labels/aria; a11y pass on tables + focus traps in modals.
- [ ] UX-3: Long-name truncation — verify against seeded `long.name@demo.test`.
- [ ] UX-4: Show org name in dashboard header (currently impossible pre-AUTH-4; comes free after).
- [ ] UX-5: Patient notifications lack mark-read / read-all (endpoints exist).

## P2 — Backend features with no frontend UI (build-out backlog)

**The dashboards are read-mostly; most role workflows can't be *done* yet.** Existing write actions:
assign doctor, complete episode, cancel prescription, duty toggle, org suspend/activate/verify,
org-admin review (broken, see ORGADMIN-1).

| Role | Missing workflow | Backend contract |
|---|---|---|
| Receptionist | Create check-in | `POST /receptionist/check-ins/` (expect 400 on duplicate active check-in) |
| Receptionist | Register patient | `POST /patients/` |
| Receptionist | Book/edit appointment | `POST/PATCH /receptionist/appointments/` (400 on past `scheduled_at`) |
| Receptionist | Access-request respond page | `GET`(read-only)+`POST /receptionist/access-requests/respond/` `{token, action}` — public confirmation page missing entirely (old app had `/access-request/respond`) |
| Receptionist | Notify doctors re: referral | `POST /receptionist/referrals/<id>/notify-doctors/` |
| Receptionist | Emergency beds view | `GET /receptionist/emergency-beds/` |
| Doctor | Create episode / clinical notes | `POST /doctor/episodes/`, `PATCH /doctor/episodes/<id>/` |
| Doctor | Create prescription | `POST /doctor/prescriptions/` |
| Doctor | **Create referral** | `POST /doctor/referrals/` — 5-level urgency enum (EMERGENCY/URGENT/SEMI_URGENT/ROUTINE/ELECTIVE) + required `patient_consent_obtained` + `consent_destination_disclosed`; note managed accept/reject workflow is the next backend milestone — confirm Swagger before building receiving-org side |
| Doctor | View vitals + history | `GET /doctor/patients/<id>/vitals/`, `/vitals/history/` (paginated; 404 = no active episode) |
| Nurse | **Record vitals** | `PATCH /nurse/patients/<id>/vitals/` (appends reading) — see NURSE-1 |
| Org-admin | **Invite staff** + resend email | `POST /org-admin/staff/`, `POST /auth/users/<id>/resend-setup-email/` (async email, returns 200 immediately) |
| Org-admin | Deactivate/edit staff | `PATCH /org-admin/staff/<id>/` |
| Org-admin | Org settings | `GET/PATCH /org-admin/settings/` |
| Org-admin | Activity feed | `GET /org-admin/activity/` |
| Org-admin | Contact submissions | `GET /org/contacts/` (paginated; 403 for non-admin; has `responded_by_name`) |
| Org-admin | Ward/bed/admission management | `/ward/` CRUD + admissions + transfers (gender M/F/O; 400 mismatch → `override: true` resend; transfer returns NEW admission) |
| Patient | **Grant/deny access requests** | `PATCH /patients/me/access-requests/<id>/` `{"action":"grant"\|"deny"}` |
| Patient | Audit trail ("who saw my data") | `GET /audit/my-trail/` (`who` = name/role, org per entry, date filters) |
| Patient | Referral letter download | `GET /referrals/<uuid>/download-letter/` |
| Patient | Profile edit | `PATCH /patients/me/` |
| Patient | Prescriptions view | dashboard `active_prescriptions` {organization, medication, dosage, frequency, duration, instructions, prescribed_at} |
| Superadmin | Create org | `POST /org/` |
| Superadmin | Create/manage users | `POST /auth/users/`, activate, reset-pw — org-scoped calls need explicit `?organization_id=` (400 without) |
| Superadmin | System health | `GET /superadmin/health/` |
| Superadmin | Access logs | `GET /audit/access-logs/` |
| All | **Do NOT build "revoke access"** — backend incomplete, hide until finished (handoff §4) |

## Second pass — auth flows, API routes, layout, e2e (full-codebase completion)

- [ ] **AUTH-6: `serverFetch` fails silently → dashboards stuck in skeleton.** Returns `null` on any
  non-OK/exception; pages pass `initialStats: null` and `StatCard loading={!stats}` shimmers forever.
  After token expiry the server render can't refresh either. Fold into PR 1 + PR 2 (error surface).
- [ ] **AUTH-5b: Logout redirects to `/signin`** (Sidebar.tsx) — same org-context loss as the 401 redirect.
- [ ] **UX-6: Header notification bell is never wired.** No dashboard passes
  `notifications`/`notificationCount`/`onMarkAllRead` to `DashboardShell` — bell always shows 0 despite
  endpoints + seeded unread notifications. Wire staff/patient notification endpoints per role.
- [ ] **SEC-6: OTP + email travel in URL query strings** (`/reset-password?email=…&otp=…`) — lands in
  browser history/server logs. Pass via client state/sessionStorage instead.
- [ ] **P1: Password validation weaker than backend rule.** Zod only checks length ≥8; backend requires
  ≥1 uppercase + digit + special. Users pass client validation then get server errors. Align schema +
  strength meter in ResetPasswordForm and set-password page.
- [ ] **P1: Set-password token validation string-matches `detail !== 'Token is valid.'`** instead of
  checking `res.ok` — fragile; breaks if backend wording changes. Also ignores the returned name/role
  (contract says validate returns them — show "Welcome, Dr. X" on the form).
- [ ] **P1 [verify live]: reset-password body field names** `{email, otp, password, password2}` — confirm
  against backend serializer (schema shows request body for these views is undocumented).
- [ ] **P1 [verify live]: `formatTime()` assumes ISO datetimes** — if `appointment_time` is a bare
  time string ("14:30"), `new Date("14:30")` = Invalid Date in every appointment row.
- [ ] P3: Resend-OTP button calls forgot-password again instead of the dedicated `/auth/resend-otp/`.
- [ ] P3: After invite setup, staff are routed to `/signin` (patient portal) — use validate response
  role/org to route to their org portal directly.
- [ ] P3: Logout blacklists using the access token — confirm backend expects `{refresh}` body [verify live].
- [ ] P3: `api/contact/route.ts` hardcodes its path instead of `ENDPOINTS.CONTACT_FORM`.
- [ ] P3: Dashboard pages don't check URL slug against user's org (backend scopes data, so cosmetic —
  a doctor visiting another org's URL sees their own data under the wrong branding).
- [x] Verified clean: OTP/forgot/reset/setup/logout/contact proxy routes are simple pass-throughs;
  `publicFetch` (direct Django calls) is server-component-only → no CORS exposure; anti-enumeration
  generic 200 on forgot-password respected; logout clears all three cookies.
- ARCH-6 (updated): e2e = 2 shallow smoke specs (signin renders, unknown slug 404s) — no logged-in flows.

## Phase 2 fix order (proposed)

1. **PR 1 — Auth layer:** AUTH-1..5 + ARCH-1 (single data-layer module with 401→single-flight refresh→retry). Everything sits on this.
2. **PR 2 — Error/pagination hygiene:** UX-ERR-1, PERF-1, GLOBAL-1, GLOBAL-5 (shared list-fetch handling).
3. **PR 3 — Receptionist contract fixes:** REC-1, REC-2, REC-3, GLOBAL-3 (HCL-ID display).
4. **PR 4 — Nurse vitals rebuild:** NURSE-1 (view + record).
5. **PR 5 — Patient fixes:** PATIENT-1 (pending backend decision), grant/deny UI, notifications.
6. **PR 6 — Org-admin:** remove broken review (ORGADMIN-1), staff invite flow.
7. **Then P2 build-out** in workflow-value order: check-in creation → vitals (done in 4) → prescriptions/referrals → appointments → the rest.
8. **Parallel any time:** ARCH-2/3 (ESLint + CI), ARCH-7 (ARCHITECTURE.md rewrite).

## Open questions for the backend side

1. PATIENT-1: should `/patients/me/appointments/` exist, or how do patients see appointments? (`api-request`)
2. ORGADMIN-1: is org-admin access-request review intentionally removed (patient-only consent)?
3. GLOBAL-4: where should `is_on_duty` come from at login/me? (`api-request`)
4. GLOBAL-2: which list filters exist (`?today=`, `?upcoming=`, `?status=` on doctor endpoints)? Will verify live; annotate `@extend_schema` on custom APIViews when convenient so Swagger shows response shapes.
