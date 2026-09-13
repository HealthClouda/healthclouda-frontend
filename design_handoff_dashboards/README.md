# HealthClouda — Role Dashboards Design Handoff (Batch 2)

> For Claude Code in VS Code. Implements the 6 role dashboards in `healthclouda-frontend`
> (Next.js App Router, `develop`). Read alongside `design_handoff_prelogin/README.md`
> (batch 1) — tokens and brand foundations are already in the styling layer from PR A.
> Open each `designs/*.dc.html` in a browser to inspect the interactive design.

## Delivery plan — 6 PRs, in this order

1. **PR DASH-1 — Superadmin** + the shared dashboard shell components (build once here, reuse everywhere)
2. **PR DASH-2 — Org Admin**
3. **PR DASH-3 — Nurse**
4. **PR DASH-4 — Receptionist**
5. **PR DASH-5 — Doctor**
6. **PR DASH-6 — Patient** (the only mobile-responsive one)

Each PR: verify contracts against live Swagger first (per repo CLAUDE.md), pre-fix tests
where replacing broken behavior, screenshots in PR description.

## Design tokens (same as batch 1)

- Fonts: **Inter** (UI/body), **Lato 700–900** (page titles, stat values, modal titles)
- Colors: primary `#0075FF`, primary-dark `#005FCC`, primary-light `#EBF3FF`,
  ink `#000825`, text-mid `#374151`, text-soft `#6b7280`, page bg `#f8faff`,
  border `#e8edf5`, row-hairline `#f3f6fb`, placeholder `#b0bcc8`
- Status: success `#16a34a`/`#dcfce7` · danger `#dc2626`/`#fee2e2` ·
  warning `#d97706`/`#fef3c7` · info `#2563eb`/`#dbeafe` · purple `#7c3aed`/`#ede9fe`
- Radii: cards 14px, controls 8px, badges 999px. Card shadow `0 1px 4px rgba(0,8,37,0.05)`.
- Logo: `HealthClouda-icon-tight.png` is **2:1 (341×171)** — sidebar slot 44×22,
  gate slot 64×32. NEVER square slots (see 2026-07-13 brand-asset fix).

## Shared shell components (build in PR DASH-1)

- `DashboardShell` — 230px white sidebar (logo row 64px, nav sections with
  10.5px uppercase labels, active item = `#EBF3FF` bg + primary text, user card +
  logout at bottom) + 64px sticky header (portal title, org/context badge, right cluster).
- `StatCard` — label uppercase 11.5px, 38px icon chip, Lato 800 29px value, 12px sub-line.
- `DataTable` — thead 10.5px uppercase on `#f8faff`, rows 13px with hairline dividers,
  toolbar row (search inputs 36px, filter selects, Clear ghost), footer count line.
- `Badge` — pill, 11px/700, tinted bg + strong fg per status maps in each design's logic.
- `SlidePanel` — 440px right sheet, header/scroll-body/footer, overlay `rgba(0,8,37,0.35)`
  + 2px blur, slide-in 0.28s.
- `Modal` — 420px centered card, 52px icon chip, spring-in animation.
- `Toast` — bottom-right pill, success green default, danger red, 2.6s.
- `EmptyState` — 44px stroke icon, bold title, hint line. Every list has one.
- `SmallScreenGate` — below 768px, staff/admin dashboards render ONLY a branded
  "This dashboard needs a bigger screen" notice (logo + device icon). Applies to
  DASH-1..5. The patient dashboard (DASH-6) must NOT have it.
- Avatars: initials on a deterministic 6-color palette
  (`#0075ff #7c3aed #16a34a #d97706 #0891b2 #dc2626`, hash of name).

## Per-dashboard specs & decisions

### DASH-1 Superadmin (`designs/HealthClouda Superadmin Dashboard.dc.html`)
Pages: Dashboard, Organisations, Users, Audit Logs + coming-soon placeholders
(Records, Billing, Messages, Settings — "Soon" chip in nav, roadmap page).
- Stats: total users, total orgs, active orgs, **pending invites** (users not yet set up).
  Revenue/records stats deferred to Billing (decision 2026-07-29).
- **Security Alerts card removed** — no backend endpoint (old code confirmed).
- **Pending Invites card** with one-click resend → `POST /auth/users/<id>/resend-setup-email/`.
  Resend buttons also on user rows + view-user panel; button flips to "Invite sent ✓" ~6s.
- User creation is **invite-based** (no password field). Role "Super Admin (platform)"
  hides the org selector and shows a red full-platform-access warning; must be audit-logged.
  ⚠ CHECK: superadmin-create may need a backend `api-request` — old UI never offered it.
- Panels: view org (contact/identifiers/stats), add/edit org (one form, two modes),
  view user (chips, invite-pending notice, activity grid), invite user.
- Working: search/filters/sort on all tables, notifications dropdown (mark-all/clear),
  suspend/activate with instant row update, suspended rows tinted `#fff5f5`.

### DASH-2 Org Admin (`designs/HealthClouda Org Admin Dashboard.dc.html`)
Pages: Dashboard, Staff, Patients, Wards & Beds, Access Requests, Notifications, Settings.
- Stats map to `ORG_ADMIN_STATS`: total_staff, active_patients, todays_appointments,
  bed_occupancy, pending_access_requests, critical_alerts.
- **Access Requests page is READ-ONLY** (ORGADMIN-1: backend removed org-admin
  approve/deny — patient consent). Blue banner explains; no action buttons.
- Staff: duty dot for doctors/nurses (GLOBAL-4 fields), invite-based add
  (`POST /org-admin/staff/` — `full_name`, **lowercase** `role`), resend invite.
- Wards: bed-grid cards (52×40 cells, occupied=primary fill, available=outline),
  occupancy bar (red when full, amber ≥75%).
- Settings: **org name LOCKED** (verified identity — change via platform support;
  frontend must not send `name` in PATCH; backend hardening ask: reject it).
  Address/support email/phone editable. "Your Account" card = personal password change
  (CHANGE_PW); confirm org-admin password changes are audit-logged.

### DASH-3 Nurse (`designs/HealthClouda Nurse Dashboard.dc.html`)
Pages: Dashboard, My Patients, **Vitals** (new workspace), Ward & Beds, Admissions,
Care Plans (coming soon), Notifications. Header **duty toggle** (GLOBAL-4).
- Contract per NURSE-1 rebuild: my-patients = admissions envelope (nested
  patient/bed/ward/episode); vitals `GET/PATCH /nurse/patients/<id>/vitals/`.
- Vitals workspace: patient picker → latest reading grid (temp ≥38 and SpO₂ <95 red)
  → record form with the probed bounds (BP sys 50–300 / dia 20–200, temp 30–45,
  pulse 20–250, resp 5–60, SpO₂ 50–100, weight 0.5–500, height 20–300) shown in labels.
  **Require ≥1 field** (empty PATCH stores an all-null reading).
- My Patients rows: bed (mono, primary), allergies red+600 unless "None", per-row
  "Record vitals" → vitals page with that patient selected.
- Admissions: Active/Discharged/Transferred tabs; admit panel uses a **patient picker**
  (active-episode patients only — resolve episode client-side, never raw UUID inputs);
  ward→bed cascading selects (available beds only); discharge modal (summary +
  instructions), transfer modal (ward→bed).
- Care Plans: "Soon" nav item + roadmap page (future backend `api-request`).

### DASH-4 Receptionist (`designs/HealthClouda Receptionist Dashboard.dc.html`)
Pages: Dashboard, Patients, Queue, Appointments, Referrals, Emergency Beds,
Access Requests, Messages, Notifications.
- Patients = search-first (≥3 chars; name/email/phone/HCL-ID). Result cards show
  **access badges** (Full access / Consent pending / No access) per REC-2/GLOBAL-3
  (HCL-ID + masked_phone + access fields). Actions adapt: with access → Assign Doctor
  + Book Appointment; none → Request Access (modal, reason required, sends consent
  request → badge flips to pending); pending → disabled "Consent requested…".
- Queue: **read-only** + doctor-load chips (on-duty envelope per REC-3; load color:
  green <3, amber 3, red ≥4). Search param is `?query=`.
- Assign doctor: on-duty doctors only, queue counts in the option labels; episode
  type + chief complaint (opens episode).
- Book appointment: **patient picker** (not raw HC-ID text). Appointment actions:
  check-in, cancel.
- Referrals: accept/decline on pending; urgent = red left card border; accepted →
  "Notify Staff" modal (doctor/nurse checkboxes + optional message).
- Messages: org-to-org, inbox/sent, Emergency type badge red; compose panel.
- Access Requests page = log of SENT consent requests (status + responded date).

### DASH-5 Doctor (`designs/HealthClouda Doctor Dashboard.dc.html`)
Pages: Dashboard (+ Today's Schedule), My Patients, Episodes (+ **detail workspace**),
Prescriptions, Referrals, Appointments, Notifications. Header duty toggle.
- Episode status enum is **ACTIVE / COMPLETED** — never "OPEN" (GLOBAL-2). Drop
  invented `?my=` / `?today=` / `?upcoming=` params.
- My Patients: age/sex, blood badge, latest-vitals summary (red when temp ≥38 or
  SpO₂ <95), read-only vitals modal (nurses record, doctors review), "Open episode".
- Episode detail: patient header + type/status chips, actions (Add Clinical Note panel —
  GENERAL/EXAMINATION/FOLLOW_UP/PROCEDURE; New Prescription; Complete Episode modal
  with required final diagnosis), notes timeline, per-episode prescriptions.
- Prescriptions: Active/Completed/Cancelled tabs; create against an ACTIVE episode
  (episode picker, never UUID input); complete/cancel row actions.
- Referrals: Incoming (accept/reject — response enum verified elsewhere as referral
  accept/reject body) / Outgoing (Download Letter PDF). Critical+pending = red border.
  New referral: type toggles internal (doctor picker) vs inter-org (org picker);
  urgency LOW/MEDIUM/HIGH/CRITICAL.
- Appointments: 4 tabs; scheduled rows get Mark completed / No show.

### DASH-6 Patient (`designs/HealthClouda Patient Dashboard.dc.html`) — MOBILE-RESPONSIVE
Pages: Dashboard, Appointments, Visit History, My Referrals, Access Requests,
My Profile, Notifications.
- **Fully responsive**: <900px sidebar becomes hamburger + off-canvas drawer with
  scrim; stats/cards use auto-fit grids; ≥44px touch targets; HCL-ID header badge
  hides on small screens (it stays in the welcome banner). NO small-screen gate.
- Dashboard: gradient welcome banner (primary→primary-dark) with HCL-ID chip;
  "Currently Admitted" banner state; active prescriptions; care instructions;
  organisations visited chips.
- Appointments (PATIENT-1 endpoint: `GET /patients/me/appointments/`, `?status=`,
  `?date=`): Upcoming/Completed/Cancelled tabs, date-block cards. Booking is via
  reception — empty state says so; no self-booking UI.
- **Access Requests: Approve / Deny** (the patient side of consent — PR 5 scope).
  Pending cards amber-bordered; history shows "You approved / You denied".
  "You're in control" explainer banner.
- Visit History: episode cards → detail panel (summary, doctor, diagnosis,
  prescriptions from the visit).
- Profile: read-only personal + medical info (blood type/genotype/allergies red),
  note: corrections happen at a facility's reception desk.

## Cross-cutting follow-ups (carry into PR descriptions)
- [ ] Backend check: can superadmin invite another SUPERADMIN? If not → `api-request`.
- [ ] Backend hardening: reject `name` on org-admin settings PATCH.
- [ ] Confirm org-admin/staff password changes hit the audit log.
- [ ] Care Plans = future backend `api-request` (nurse).
- [ ] Referral letter PDF download endpoint — verify before wiring the buttons.
- [ ] All sample data in designs is illustrative; wire to real endpoints, keep the
  empty/error states (ErrorState + retry per UX-ERR-1) everywhere.
