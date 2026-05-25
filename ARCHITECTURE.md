# HealthClouda Frontend — Architecture

> Update this file whenever routing, file structure, or API integration changes.

---

## Tech Stack

- **Language:** Vanilla HTML / CSS / JavaScript (no framework, no build step)
- **Hosting:** Vercel — `outputDirectory: public`
- **Backend:** Django REST Framework on Railway
- **Script load order (every dashboard page):** `config.js` → `api.js` → `router.js` → `auth.js` → `dashboard.js`

---

## File Structure

```
public/
├── index.html                   # Landing page
├── signin.html                  # General portal login (patients only)
├── forgot-password.html         # Step 1 of OTP reset flow
├── check-email.html             # Step 2 — OTP entry
├── reset-password.html          # Step 3 — new password
├── password-success.html        # Step 4 — confirmation + redirect
├── set-password.html            # Invite setup for new staff
├── 404.html
├── robots.txt / sitemap.xml
│
├── assets/
│   ├── js/
│   │   ├── config.js            # ALL constants: API base URL, endpoints, token keys, roles
│   │   ├── api.js               # apiRequest(), token refresh, hc_formatApiError()
│   │   ├── router.js            # HC_ROUTER — URL construction, org slug extraction
│   │   ├── auth.js              # Login forms, logout, OTP flow, password setup
│   │   ├── animations.js        # Shared UI animations
│   │   └── contact-form.js      # Landing page contact form
│   ├── css/
│   │   ├── style.css            # Global / landing page styles
│   │   └── signin.css           # Shared auth page styles
│   └── images/
│
├── organization/                # Org-branded portal (served via /:slug routes)
│   ├── index.html               # Org landing page
│   ├── signin.html              # Org staff + patient login
│   ├── org-forgot-password.html
│   ├── org-check-email.html
│   ├── org-reset-password.html
│   ├── org-password-success.html
│   ├── org-config.js            # Org branding config (logo, hero image)
│   ├── script.js                # Org portal JS
│   └── style.css
│
├── doctor/
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
├── nurse/
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
├── receptionist/
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
├── patient/
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
├── org-admin/
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
├── superadmin/
│   ├── index.html
│   ├── dashboard.js
│   ├── dashboard.css
│   └── signin.html              # Superadmin-only login page
│
└── access-request/
    └── respond.html             # Public page — receptionist access request token link
```

---

## Routing

All routing is handled by Vercel rewrites in `vercel.json`. There is no client-side router.

### URL Scheme

| URL pattern | Resolves to | Notes |
|---|---|---|
| `/` | `index.html` | Landing page |
| `/signin` | `signin.html` | Patients only |
| `/superadmin/signin` | `superadmin/signin.html` | Superadmin only |
| `/superadmin` | `superadmin/index.html` | Superadmin dashboard |
| `/set-password` | `set-password.html` | Staff invite setup |
| `/forgot-password` | `forgot-password.html` | General OTP reset |
| `/check-email` | `check-email.html` | |
| `/reset-password` | `reset-password.html` | |
| `/password-success` | `password-success.html` | |
| `/:slug` | `organization/index.html` | Org landing page |
| `/:slug/signin` | `organization/signin.html` | Org staff + patient login |
| `/:slug/forgot-password` | `organization/org-forgot-password.html` | Org-scoped OTP reset |
| `/:slug/doctor` | `doctor/index.html` | Doctor dashboard |
| `/:slug/nurse` | `nurse/index.html` | |
| `/:slug/receptionist` | `receptionist/index.html` | |
| `/:slug/patient` | `patient/index.html` | |
| `/:slug/org-admin` | `org-admin/index.html` | |
| `/access-request/respond` | `access-request/respond.html` | Public — no auth |

**`HC_ROUTER`** (`router.js`) is the single source of truth for building URLs in JS. Never hardcode paths — always use `HC_ROUTER.roleDashboardPath()`, `HC_ROUTER.signinPath()`, etc.

---

## Authentication

### Login portals (three separate endpoints)

| Portal | URL | Endpoint | Who |
|---|---|---|---|
| General | `/signin` | `POST /auth/login/` | Patients only |
| Org | `/:slug/signin` | `POST /auth/login/<slug>/` | Staff + patients |
| Superadmin | `/superadmin/signin` | `POST /auth/login/admin/` | Superadmin only |

**Staff hitting the general portal** get a 400 with `org_slug` + `redirect_url` — the app auto-redirects with a 5s countdown.

### Token storage

Tokens stored in `localStorage` under keys defined in `HC_CONFIG.TOKEN_KEYS`:
- `hc_access_token`
- `hc_refresh_token`
- `hc_user` (JSON-serialised user object)

> **XSS risk noted** — migrate to `httpOnly` cookies when moving to React.

### Token refresh

`api.js` intercepts any 401 response, calls `POST /auth/refresh/` once, and retries the original request. A singleton promise (`_refreshPromise`) prevents concurrent refresh races. On refresh failure → clear tokens → redirect to login.

### Session timeout

30-minute inactivity timeout (reset on `mousedown`, `keydown`, `scroll`, `touchstart`). Checked every 60s via `setInterval`. Defined in `HC_CONFIG.SESSION_TIMEOUT_MS`.

### Password flows

| Flow | Steps |
|---|---|
| OTP reset | forgot-password → check-email (OTP) → reset-password → password-success |
| Invite setup | `/set-password?token=<uuid>` → validate token → set password → redirect to `/signin/` |

---

## API Layer (`api.js`)

All HTTP calls go through one of these — never use `fetch()` directly in HTML or dashboard files:

| Function | Use |
|---|---|
| `apiGet(endpoint)` | Authenticated GET |
| `apiPost(endpoint, body)` | Authenticated POST |
| `apiPatch(endpoint, body)` | Authenticated PATCH |
| `apiPut(endpoint, body)` | Authenticated PUT |
| `apiDelete(endpoint)` | Authenticated DELETE |
| `publicApiRequest(endpoint, options)` | Unauthenticated (login, contact, org branding) |
| `hc_formatApiError(data, fallback)` | Converts any DRF error shape to a human-readable string |

`HC_CONFIG.API_BASE_URL` auto-detects environment:
- `localhost` → `http://localhost:8000/api/v1`
- `staging.healthclouda.ng` → `https://api-staging.healthclouda.ng/api/v1`
- `healthclouda-frontend.vercel.app` → Railway production backend
- Everything else → `https://api.healthclouda.ng/api/v1`

---

## API Integration Map (by role)

### Patient
| Action | Endpoint |
|---|---|
| Dashboard stats | `GET /patients/me/dashboard/` |
| Profile | `GET /patients/me/` |
| Notifications | `GET /patients/me/notifications/` |
| Unread count | `GET /patients/me/notifications/unread-count/` |
| Access requests | `GET /patients/me/access-requests/` / `PATCH /:id/` |
| Referrals | `GET /referrals/my-referrals/` / `GET /referrals/:uuid/` |
| Referral letter PDF | `GET /referrals/:uuid/download-letter/` |

### Receptionist
| Action | Endpoint |
|---|---|
| Dashboard stats | `GET /receptionist/dashboard/stats/` |
| Patient search | `GET /receptionist/patients/search/?query=` |
| Create patient | `POST /patients/` |
| Access requests | `GET/POST /receptionist/access-requests/` |
| Doctors on duty | `GET /receptionist/doctors/on-duty/` |
| Assign doctor | `POST /receptionist/assign-doctor/` |
| Check-ins | `GET/POST/PATCH /receptionist/check-ins/` |
| Appointments | `GET/POST/PATCH /receptionist/appointments/` |
| Received referrals | `GET /referrals/received/` |
| Notify doctors | `POST /receptionist/referrals/:id/notify-doctors/` |
| Staff notifications | `GET /auth/me/notifications/` |

### Doctor
| Action | Endpoint |
|---|---|
| Dashboard stats | `GET /doctor/dashboard/stats/` |
| My patients | `GET /doctor/my-patients/` |
| Episodes | `GET/POST /doctor/episodes/` / `PATCH /:id/` / `POST /:id/complete/` |
| Prescriptions | `GET/POST /doctor/prescriptions/` / `PATCH /:id/cancel/` |
| Referrals out | `POST /doctor/referrals/` |
| Referrals in | `GET /doctor/referrals/incoming/` |
| Appointments | `GET /doctor/appointments/` |
| Vitals | `GET /doctor/patients/:id/vitals/` |
| Duty toggle | `POST /auth/me/toggle-duty/` |

### Nurse
| Action | Endpoint |
|---|---|
| Dashboard stats | `GET /nurse/dashboard/stats/` |
| Wards overview | `GET /nurse/wards/overview/` |
| My patients | `GET /nurse/my-patients/` |
| Vitals | `GET/PATCH /nurse/patients/:id/vitals/` |
| Duty toggle | `POST /auth/me/toggle-duty/` |

### Org Admin
| Action | Endpoint |
|---|---|
| Dashboard stats | `GET /org-admin/dashboard/stats/` |
| Activity feed | `GET /org-admin/activity/` |
| Staff management | `GET/POST/PATCH /org-admin/staff/` |
| Patient directory | `GET /org-admin/patients/` |
| Wards overview | `GET /org-admin/wards/overview/` |
| Access requests | `GET /org-admin/access-requests/` / `PATCH /:id/review/` |
| Org settings | `GET/PATCH /org-admin/settings/` |

### Superadmin
| Action | Endpoint |
|---|---|
| System stats | `GET /superadmin/dashboard/` |
| System health | `GET /superadmin/health/` |
| Activity log | `GET /superadmin/activity/` |
| Orgs | `GET/POST /org/` / `PATCH/DELETE /org/:id/` |
| Suspend/activate/verify org | `POST /superadmin/organizations/:id/{suspend\|activate\|verify}/` |
| Users | `GET/POST /auth/users/` / `PATCH /auth/users/:id/` |
| Audit logs | `GET /audit/logs/` |
| Access logs | `GET /audit/access-logs/` |

### Shared (Ward / Bed / Admissions)
| Action | Endpoint |
|---|---|
| Wards | `GET/POST /ward/` / `GET/PUT/DELETE /ward/:id/` |
| Beds | `GET/POST /ward/beds/` / `PATCH /ward/beds/:id/` |
| Rooms | `GET/POST /ward/rooms/` |
| Admissions | `GET/POST /ward/admissions/` |

---

## Key Invariants

- `config.js` must load before any other JS file on every page.
- All endpoints live in `HC_CONFIG.ENDPOINTS` — never hardcode a URL string in a dashboard file.
- All URL path construction goes through `HC_ROUTER` — never hardcode a path string.
- All authenticated fetch calls go through `apiRequest()` — never call `fetch()` directly.
- Org-scoped staff endpoints always require the user to have logged in via their org portal (`/:slug/signin`).
