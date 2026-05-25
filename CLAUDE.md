# HealthClouda Frontend – Claude Assistant

## Purpose
This file is for Claude (or any AI assistant) to understand the frontend project context, objectives, and production considerations. Use it to validate the frontend code against the PRD, suggest improvements, or ensure alignment with MVP goals.

## Project Context
- Multi-role web portals: Patient, Receptionist, Doctor, Nurse, Org Admin, Super Admin.
- Tech Stack: Vanilla HTML/CSS/JS with REST API backend.
- MVP Focus:
  - Patient dashboard, episodes, referrals (internal & inter-org), access requests, notifications.
  - Receptionist: patient registration, queue, appointments, ward/bed overview.
  - Doctor: episodes, prescriptions, internal dept referrals, inter-org referral letters.
  - Nurse: ward/bed management, admissions, vitals.
  - Org Admin: staff management, org settings, ward/bed overview.
  - Super Admin: org/user management, audit logs, system health.

## Key Features to Validate
- **Authentication & Security**
  - JWT login/refresh/logout flows.
  - Password reset via OTP.
  - Role-based redirects.
  - Session timeout handling.
- **Patient Workflows**
  - Episodes, prescriptions, access requests, referral viewing, PDF downloads.
- **Referral Handling**
  - Internal dept referrals recorded automatically; no letter.
  - Inter-org referrals: PDF letter generation and download.
- **Receptionist**
  - Patient registration/search, appointments, queue, ward/bed overview.
  - Ensure receptionist **does not coordinate referrals**.
- **Notifications**
  - Polling-based unread counts.
  - Staff notifications for referral & patient events.
  - Patient notifications for episodes/referrals/access requests.
- **Ward/Bed Management**
  - Accurate occupancy display and updates.

## Production Considerations
- Sub-2s page load on modern browsers.
- Minimal JS bundle, asset cache-busting.
- Responsive layout, accessibility (keyboard navigation, focus states).
- Graceful error handling (modals/toasts).
- Security considerations: no inline secrets, safe redirects, JWT storage in `localStorage` (with potential XSS risk noted).

## Guidance for Claude
- Read through the PRD and check that all implemented features match MVP scope.
- Validate that authentication flows, referral workflows, and ward management are correctly implemented.
- Highlight missing or incomplete features relative to PRD.
- Suggest optimizations for performance, security, and UX.
- Detect possible inconsistencies between frontend and backend contract (API usage, payload structure).
- Write all code for production.
- Read API-doc.md to know endpoints.
- Whatever code is written should be written for production as we've deployed already to Vercel. You can connect to it through the MCP server.

## Session Handoff (REQUIRED)
- At the end of every session where meaningful work was done, update `HANDOFF.md` in the repo root.
- Log: what changed, decisions made and why, what's pending, any gotchas or context not obvious from the code.
- This file is for the next session (Claude or any developer) to pick up cold without losing context.
- Read `HANDOFF.md` at the start of every session before doing any work.