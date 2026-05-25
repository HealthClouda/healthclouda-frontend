# HealthClouda Frontend – Claude Assistant

## Purpose
This file is for Claude (or any AI assistant) to understand the frontend project context and
maintain consistent workflow across sessions.

## Project Context
- Frontend for a multi-tenant EHR/EMR platform (HealthClouda).
- Connects to the HealthClouda backend API (Django REST Framework).
- Multi-role portals: Patient, Receptionist, Doctor, Nurse, Org Admin, Super Admin.
- API base URL (production): https://healthclouda-backend-production.up.railway.app/api/v1/

## Key Documents (maintain these — same discipline as the backend repo)
- `HANDOFF.md` — session log, current state, TODOs
- `ARCHITECTURE.md` — component structure, routing, state management, API integration map

## Login Portals (Backend Contract)
Three separate login endpoints — do not mix them up:
- `POST /api/v1/auth/login/` — patients only (general portal)
- `POST /api/v1/auth/login/<org_slug>/` — staff + patients (org portal)
- `POST /api/v1/auth/login/admin/` — superadmin only

Staff trying the general portal get a 400 with `org_slug` and `redirect_url` in the response
— use that to redirect them automatically to their correct org portal.

## Auth Flow Notes
- JWT: store access + refresh tokens securely (avoid localStorage — XSS risk).
- Invite setup: new staff land on `/set-password?token=<uuid>` — validate token first via
  `GET /api/v1/auth/setup-password/validate/?token=<uuid>` then POST to set password.
- OTP reset: forgot-password → verify-otp → reset-password (three-step flow).

## Session Workflow (REQUIRED — follow this every session)

### Session Start
1. Read `HANDOFF.md` and `ARCHITECTURE.md`.
2. Ask the user: **"What would you like to work on today?"** — wait for their answer.
3. If the goal is large, break it into numbered steps and confirm the breakdown before starting.

### During the Session
- Track progress against agreed steps.
- If scope changes mid-session, restate the updated goal explicitly.

### Session End
1. Confirm which steps were completed and which remain.
2. Update living documents:
   - `HANDOFF.md` — every session, new dated entry at top of Session Log
   - `ARCHITECTURE.md` — if component structure, routing, or API integration changed
   - This file (`CLAUDE.md`) — if workflow or project context changed
3. Recommend what to tackle next session.

## Key Patterns to Enforce
- All authenticated requests: `Authorization: Bearer <access_token>` header.
- All org-scoped staff endpoints require the user to be logged in via their org portal.
- Never expose raw patient data across org contexts.
- Handle token expiry gracefully — use the refresh token before forcing re-login.
