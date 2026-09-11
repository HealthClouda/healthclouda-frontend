#!/usr/bin/env python3
"""
Regenerate docs/frontend-sprint.ics from docs/FRONTEND_SPRINT_PLAN.md's Part 4.

IDEMPOTENT: running this twice produces byte-identical output. Dates, UIDs and
DTSTAMP are all fixed constants, never derived from "now" — so a re-run after an
unrelated edit does not churn the file in git.

A date change is a change HERE plus a re-run. Never hand-edit the .ics: the
folding rules (75 octets) and escaping are easy to break silently, and a broken
.ics fails at import with no useful error.

    python scripts/gen_frontend_calendar.py

Companion to the backend repo's scripts/gen_beta_calendar.py. Both calendars are
imported by the same people, so the standup UID here is deliberately DIFFERENT
from the backend's `standup-daily@healthclouda.com` — identical UIDs would make
one event overwrite the other.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from pathlib import Path

# ── Constants ──────────────────────────────────────────────────────────────
DOMAIN = "healthclouda.com"
TZID = "Africa/Lagos"
OUT = Path(__file__).resolve().parent.parent / "docs" / "frontend-sprint.ics"

# Fixed so re-runs are byte-identical. Bump only on a deliberate re-issue.
DTSTAMP = "20260810T120000Z"
SEQUENCE = 0

PLAN = "docs/FRONTEND_SPRINT_PLAN.md"

LANE_NOTE = (
    "Lane labels are ownership DEFAULTS, not walls - either dev may take any "
    "item, but claim its In Flight row in HANDOFF.md before cutting the branch."
)
OWNERS = {
    "INFRA": f"Default owner: @Bastoh (infra lane). {LANE_NOTE}",
    "DESIGN": f"Default owner: @Qeeyat (design lane). {LANE_NOTE}",
    "BOTH": f"Both devs. {LANE_NOTE}",
}

# ── The board ──────────────────────────────────────────────────────────────
# (date, lane, summary, description)
EVENTS: list[tuple[date, str, str, str]] = [
    # ── Week 1 — tiers live + the shared shell ──────────────────────────
    (
        date(2026, 8, 10), "INFRA",
        "B2 DNS request, A8 backend FRONTEND_URL issue, A2 stale hosts, A6 consent bypass",
        "TWO THINGS FIRST, both long-lead and both blocking:\n"
        "- B2: request the DNS records for dev./beta./apex. DNS is held outside "
        "Vercel, so propagation gates the 24 Aug target. Request TODAY.\n"
        "- A8: file the backend api-request issue - each backend tier must set "
        "FRONTEND_URL to its matching frontend. Tier separation only works if "
        "BOTH sides are tiered; otherwise emailed set-password, org landing and "
        "consent links point at the wrong tier.\n\n"
        "Then A2 (purge the dead railway host from next.config.ts:3, "
        "layout.tsx:12 metadataBase, .env.example, design README) and A6 (delete "
        "the org-admin approve/deny at OrgAdminDashboard.tsx:260 - the backend "
        "removed that endpoint as a security fix because it bypassed patient "
        "consent; keep the read-only list).",
    ),
    (
        date(2026, 8, 10), "DESIGN",
        "Onboarding + pair on DASH-1 kickoff",
        "Read ONBOARDING.md end to end. Set NEXT_PUBLIC_API_URL to "
        "https://api-dev.healthclouda.com/api/v1 (shared dev backend, synthetic "
        "data - experiment freely).\n\n"
        "Confirm the three verification commands pass on a clean clone:\n"
        "  npx tsc --noEmit   -> no output\n"
        "  npm test           -> 63 passed\n"
        "  npm run build      -> green\n\n"
        "If they don't pass, that is NOT you being new - say so and we fix it "
        "together.\n\n"
        "Then pair with @Bastoh on the DASH-1 kickoff: read "
        "design_handoff_dashboards/README.md, open the Superadmin .dc.html "
        "beside npm run dev, and agree the component boundaries before writing "
        "code.",
    ),
    (
        date(2026, 8, 11), "INFRA",
        "A3 cookie scoping, A4 fail-loud config, B3 env var contract",
        "A3 (SECURITY): do NOT set COOKIE_DOMAIN=.healthclouda.com. A "
        "dot-prefixed parent domain shares cookies across EVERY subdomain, so a "
        "dev-tier session cookie would be sent to the beta and production "
        "frontends. Host-only cookies (the current default) keep the tiers "
        "isolated. The var is documented in .env.example but never read in code "
        "- delete the documentation rather than leave a loaded footgun.\n\n"
        "A4: config.ts:16 falls back to http://localhost:8000/api/v1 when "
        "NEXT_PUBLIC_API_URL is unset. In a deployed build that fails silently "
        "and confusingly. Throw at build time outside development.\n\n"
        "B3: NEXT_PUBLIC_API_URL + NEXT_PUBLIC_SITE_URL, scoped per Vercel "
        "environment and branch.",
    ),
    (
        date(2026, 8, 11), "DESIGN",
        "DASH-1 shared shell - DashboardShell, StatCard, DataTable, Badge",
        "Build the shared primitives once, here. Everything DASH-2..6 needs "
        "comes from this PR, so the boundaries matter more than the pixels.\n\n"
        "Spec: design_handoff_dashboards/README.md -> 'Shared shell "
        "components'. 230px sidebar (logo row 64px, uppercase nav labels, "
        "active = #EBF3FF bg + primary text, user card + logout at bottom), "
        "64px sticky header.\n\n"
        "TRAP: the logo mark is 2:1 (341x171). Sidebar slot 44x22, gate slot "
        "64x32 - NEVER a square slot (see the 2026-07-13 brand-asset fix).",
    ),
    (
        date(2026, 8, 12), "INFRA",
        "B1 Vercel domains + branch mapping - dev.healthclouda.com LIVE",
        "Vercel -> Project -> Domains, using the 'Git Branch' field:\n"
        "  dev.healthclouda.com   -> branch develop  -> api-dev\n"
        "  beta.healthclouda.com  -> branch staging  -> api-beta (var set 31 Aug)\n"
        "  healthclouda.com + www -> main            -> marketing-only, no API\n\n"
        "TARGET: dev.healthclouda.com talking to api-dev.healthclouda.com. This "
        "is the E5 hard gate in the backend's plan and it must be live well "
        "before their UAT week opens on 24 Aug.\n\n"
        "Also confirm Vercel deployment protection doesn't 401 the beta org's "
        "testers (B5).",
    ),
    (
        date(2026, 8, 12), "DESIGN",
        "DASH-1 cont. - SlidePanel, Modal, Toast, EmptyState, SmallScreenGate",
        "SlidePanel 440px right sheet, overlay rgba(0,8,37,0.35) + 2px blur, "
        "slide-in 0.28s. Modal 420px centred, 52px icon chip. Toast "
        "bottom-right, 2.6s. EmptyState 44px stroke icon - EVERY list has one.\n\n"
        "SmallScreenGate: below 768px, staff/admin dashboards render ONLY a "
        "branded 'needs a bigger screen' notice. Applies to DASH-1..5.\n\n"
        "CRITICAL: DASH-6 Patient must NOT get this gate - it is the only "
        "mobile-responsive dashboard. Patients use phones. Easy to get "
        "backwards; the screenshot harness catches it.",
    ),
    (
        date(2026, 8, 13), "INFRA",
        "C2 Cloudflare hosting spike (timeboxed, scratch subdomain, torn down)",
        "ONE DAY, TIMEBOXED. Deploy develop to Cloudflare Workers via "
        "@opennextjs/cloudflare on a scratch subdomain, catalogue every "
        "failure, then TEAR IT DOWN. Same pattern as the backend's A8 "
        "DEBUG=False dry run - their plan calls it the highest-value "
        "de-risker.\n\n"
        "What it must specifically prove (C3) - every one of these is "
        "load-bearing for auth or PHI:\n"
        "- middleware.ts route gating\n"
        "- route handlers setting httpOnly cookies via next/headers\n"
        "- the /api/data + /api/action proxy\n"
        "- next/font/google and next/image\n"
        "- build output size limits\n\n"
        "Output is a WRITTEN LIST, not a migration. The decision happens at "
        "Gate 1 with evidence.",
    ),
    (
        date(2026, 8, 13), "DESIGN",
        "DASH-1 Superadmin pages - orgs, users, audit logs",
        "Pages: Dashboard, Organisations, Users, Audit Logs + coming-soon "
        "placeholders (Records, Billing, Messages, Settings).\n\n"
        "Decisions already made in the design README - don't re-litigate: "
        "Security Alerts card REMOVED (no backend endpoint); revenue/records "
        "stats deferred to Billing; user creation is INVITE-BASED, no password "
        "field.\n\n"
        "CHECK BEFORE BUILDING: superadmin-create may need a backend "
        "api-request - the old UI never offered it. Verify against live "
        "Swagger first; if it's missing, file the issue rather than "
        "improvising.",
    ),
    (
        date(2026, 8, 14), "INFRA",
        "C2 writeup, verify contracts vs live Swagger, E1 FLAG-004",
        "Write up the spike as a decision-ready list for Gate 1.\n\n"
        "Re-verify every Part-1 contract claim against live Swagger at "
        "https://api-dev.healthclouda.com/api/v1/docs/ - the current claims come "
        "from the July audit, not from today's schema (FLAG-003).\n\n"
        "E1/FLAG-004 is reserved as Qeeyat's first PR if she has capacity: "
        "DoctorDashboard.tsx:56 '?today=true' is silently ignored by DRF, and "
        ":58 '?status=OPEN' uses the wrong enum (it is ACTIVE), so that panel "
        "is ALWAYS empty. Small, verifiable, with a clear done-when.",
    ),
    (
        date(2026, 8, 14), "DESIGN",
        "DASH-1 CHECKPOINT - the shell must land + T5 screenshot harness",
        "HARD CHECKPOINT. DASH-2..6 all depend on this shell, so this is the "
        "single biggest schedule risk in the plan.\n\n"
        "IF IT HAS NOT LANDED: @Bastoh takes the shell over the float day and "
        "Qeeyat moves to DASH-3 Nurse (lowest contract risk) on the existing "
        "primitives. That is a planned branch, not a failure - say so at "
        "standup and claim the row.\n\n"
        "Also commit the T5 screenshot harness in e2e/design/: route vs "
        ".dc.html at fixed viewports, including the 768px boundary. See "
        "docs/DESIGN-VERIFICATION.md.",
    ),
    (
        date(2026, 8, 15), "BOTH",
        "FLOAT - catch-up day (not a work day by default)",
        "Named catch-up block for whatever slipped in week 1. If the week ran "
        "clean, this is not a work day.\n\n"
        "Most likely landing spot: the DASH-1 shell if Friday's checkpoint "
        "missed.",
    ),
    # ── Week 2 — dashboards + contract layer ────────────────────────────
    (
        date(2026, 8, 17), "INFRA",
        "A5/FLAG-001 - role gating off the client-writable cookie + T3 suite",
        "The one security defect rather than hygiene item. hc_user is "
        "httpOnly:false (auth.ts:30) so the UI can read name/role - but every "
        "role gate reads it too ([slug]/doctor/page.tsx:11 plus five siblings, "
        "middleware.ts:68). A user can edit document.cookie and reach another "
        "org's dashboard shell.\n\n"
        "Impact today is limited: every real fetch carries the bearer token and "
        "DRF enforces server-side, so they land in an empty skeleton getting "
        "403s. VERIFY THAT ASSUMPTION rather than trusting it - nurse token "
        "against a doctor-only endpoint should 403. If it ever doesn't, this "
        "stops being cosmetic.\n\n"
        "Done when: gating decides from a server-trusted source, hc_user is "
        "display-only, and T3 proves a tampered cookie renders nothing.",
    ),
    (
        date(2026, 8, 17), "DESIGN",
        "DASH-2 Org Admin - staff invite, read-only access requests",
        "Staff invite: POST /org-admin/staff/ requires full_name (NOT "
        "first/last) and a LOWERCASE role ('nurse'). Note the casing "
        "inconsistency with the rest of the API, which returns 'DOCTOR'.\n\n"
        "Access requests are READ-ONLY here. A6 removed approve/deny last week "
        "because it bypassed patient consent - do not re-add it from the "
        "design. If the design shows those buttons, that is the design being "
        "out of date, not a spec.",
    ),
    (
        date(2026, 8, 18), "INFRA",
        "E2 registration + portal-invite data layer (ahead of D4), E6 envelopes",
        "CONTRACT-FIRST: this must land before Wednesday's DASH-4 styles it.\n\n"
        "Endpoints, types, proxy routes and error handling for: patient "
        "registration (email OPTIONAL, phone REQUIRED when omitted, both "
        "omitted -> 400 phone error), has_portal_account, "
        "POST /receptionist/patients/<id>/send-portal-invite/ (400 no email, "
        "404 unknown, 409 email belongs to another account, 200), and patient "
        "email edit (400 if the address belongs to any other account; "
        "correcting then reissuing MOVES the login).\n\n"
        "E6: narrow the Ward[] | Paginated<Ward> type hedges now Swagger can "
        "settle them.",
    ),
    (
        date(2026, 8, 18), "DESIGN",
        "DASH-3 Nurse - vitals, ward/bed, admission",
        "Lowest contract risk of the six - the nurse pages were rebuilt on "
        "verified shapes in July, so this is mostly a restyle onto the new "
        "shell. Good confidence builder.\n\n"
        "Remember: vitals APPEND to a history, they never overwrite. The form "
        "requires at least one field and omits untouched inputs - an empty "
        "body stores an all-null reading.",
    ),
    (
        date(2026, 8, 19), "INFRA",
        "E3 patient consent data layer (ahead of D6), E4 announcements, A7 baseline",
        "CONTRACT-FIRST: E3 must land before Thursday's DASH-6.\n\n"
        "E3: wire PATIENT_ACCESS_REQUEST PATCH. Today patients can only VIEW "
        "access requests - consent works SOLELY through emailed token links, "
        "which is why tier-crossing is a total consent failure rather than an "
        "inconvenience.\n\n"
        "E4: re-add ORG_ANNOUNCEMENTS (public, unauthenticated, DRF-paged, "
        "is_public only) and wire it into the empty state already on the org "
        "landing page.\n\n"
        "A7: write SECURITY_BASELINE.md - scope agreed 2026-08-09. Cookie "
        "scoping (A3) and tier isolation now belong in it.",
    ),
    (
        date(2026, 8, 19), "DESIGN",
        "DASH-4 Receptionist - registration, HCL-ID, portal invite, check-ins",
        "THE DENSEST PHI-FACING PR. Everything a front desk does on day one.\n\n"
        "Registration: email OPTIONAL, phone REQUIRED when email is omitted. "
        "The form must allow submitting without an email. Surface the returned "
        "HCL-ID clearly - the receptionist reads it out to the patient.\n\n"
        "Also surface, at the front desk: an email-less patient has NO portal "
        "login and CANNOT approve cross-org access. That's a real-world "
        "consequence a receptionist needs to understand at the counter, not a "
        "footnote.\n\n"
        "Portal invite shows when has_portal_account is false AND an email "
        "exists. Error copy for the 409 (email belongs to another account) has "
        "to be comprehensible to a non-technical user.",
    ),
    (
        date(2026, 8, 20), "INFRA",
        "E5 notifications, E7 serverFetch, E8 ESLint + CI",
        "E5: staff + patient notification lists, unread count, mark-read, "
        "read-all. STAFF_NOTIFS and PATIENT_READ_ALL currently have ZERO uses. "
        "Backend notification delivery goes live this sprint - until now rows "
        "were created and nothing sent.\n\n"
        "E7/FLAG-005: serverFetch turns auth errors, 500s, network failures and "
        "malformed JSON all into null - indistinguishable from 'no data', and "
        "nothing is logged. Production incidents would present as a silently "
        "empty dashboard.\n\n"
        "E8/FLAG-006: there is NO eslint config (so 'next lint' has never run) "
        "and NO .github directory at all. Add the flat config + an Actions "
        "workflow running lint, tsc, test and build on every PR into develop.",
    ),
    (
        date(2026, 8, 20), "DESIGN",
        "DASH-6 Patient - in-app consent, notifications. NO SmallScreenGate",
        "PHI-CRITICAL and the most-used surface by non-staff.\n\n"
        "In-app consent approve/deny is the headline: today patients can only "
        "view requests, so consent depends entirely on emailed links.\n\n"
        "TWO THINGS TO GET RIGHT:\n"
        "1. This dashboard must NOT have SmallScreenGate. Patients are on "
        "phones. It is the only responsive one.\n"
        "2. Consent copy must state clearly WHO is asking and WHY. The reason "
        "and requested_at fields are already typed and render conditionally - "
        "if the backend is sending them, they must be visible. Asking someone "
        "to consent without showing the reason is a consent defect, not a "
        "cosmetic gap.",
    ),
    (
        date(2026, 8, 21), "INFRA",
        "T6 + T9 checklists authored, C4 Cloudflare decision written",
        "Author docs/UAT-CHECKLIST-FE.md (the T6 role journeys, executed next "
        "week by the backend team through this UI) and the T9 beta "
        "confirmation checklist for 1 Sep.\n\n"
        "C4: write the Cloudflare decision into HANDOFF.md - migrate before "
        "beta if the spike's failure list is short, otherwise it becomes the "
        "first post-hypercare project with its own plan. EITHER WAY IT IS "
        "WRITTEN DOWN, with the evidence from 13 Aug.",
    ),
    (
        date(2026, 8, 21), "DESIGN",
        "DASH-5 Doctor - re-read Swagger FIRST (referrals changed ~20 Aug)",
        "Scheduled last deliberately: the backend converts referrals to an "
        "ORG_ADMIN-managed workflow around 20 Aug - the receiving org's admin "
        "accepts as a capacity confirmation, then forwards to on-duty doctors. "
        "Today it is doctor-to-doctor.\n\n"
        "SO: re-read Swagger before writing referral code. Building deep "
        "against the old accept flow this week is wasted work.\n\n"
        "Episode create and prescription create are safe to build (complete and "
        "cancel already exist).\n\n"
        "Then FREEZE for Gate 1.",
    ),
    (
        date(2026, 8, 21), "BOTH",
        "GATE 1 - GO/NO-GO: is the UI ready for the backend's UAT week?",
        "Code freeze on develop.\n\n"
        "Check: all six dashboards merged and exercised against api-dev - suite "
        "green - tsc clean - build green - HANDOFF.md current - no unclaimed In "
        "Flight rows - the Cloudflare decision written - every week-1/2 item "
        "either done or explicitly carried with a named landing spot.\n\n"
        "IF NO-GO, what moves is decided HERE - not during UAT, and not on "
        "onboarding morning. The backend's own test week depends on this UI, so "
        "a silent slip costs them a week too.",
    ),
    (
        date(2026, 8, 22), "BOTH",
        "FLOAT - DASH-5 overflow + FLOAT items",
        "Named catch-up block. Landing spot for DASH-5 overflow and the FLOAT "
        "items: announcements editor, org settings, superadmin extras beyond "
        "suspend/activate/verify, and deep referral work.\n\n"
        "If the week ran clean, this is not a work day.",
    ),
    # ── Week 3 — UAT week ───────────────────────────────────────────────
    (
        date(2026, 8, 24), "BOTH",
        "T6 role-journey UAT part 1 (dev env, synthetic data)",
        "TEST WEEK OPENS. No new features - develop is frozen except for fixes "
        "arising from testing. The backend runs its role-by-role UAT THROUGH "
        "THIS UI, so we are on the hook for turnaround.\n\n"
        "Scripted end to end:\n"
        "- RECEPTIONIST: register WITH email / WITHOUT email -> HCL-ID handout "
        "-> portal invite -> patient sets password -> patient logs in\n"
        "- PATIENT PORTAL: dashboard, appointments, notifications, in-app "
        "consent approve/deny\n"
        "- DOCTOR: episode, prescription, vitals, duty toggle\n\n"
        "Deviations are LOGGED AS DEFECTS, not fixed in place.",
    ),
    (
        date(2026, 8, 25), "BOTH",
        "T6 role-journey UAT part 2 + referral end to end",
        "- NURSE: vitals, ward/bed, admission\n"
        "- ORG_ADMIN: staff CRUD, dashboards, access requests (read-only), "
        "announcements incl. the is_public toggle\n"
        "- SUPERADMIN: orgs, users, audit logs, suspend/activate/verify\n"
        "- REFERRAL JOURNEY END TO END through the new ORG_ADMIN-managed "
        "workflow\n\n"
        "Still logging, not fixing.",
    ),
    (
        date(2026, 8, 26), "BOTH",
        "T3/T4/T7 - security day on the live dev env",
        "T3: tampered hc_user cookie against the DEPLOYMENT, not just in "
        "vitest. Every role, every dashboard, both cross-role and cross-org.\n\n"
        "T4 PHI leakage: patient IDs and HCL-IDs in URLs (they reach browser "
        "history, server logs and Referer headers) - browser cache and bfcache "
        "(press Back after logout, you must not see a dashboard) - what an "
        "error tracker would ship if we added one.\n\n"
        "T7 THE TIER TEST, the one that matters most: trigger a REAL "
        "set-password email and a REAL consent link from the dev backend. Both "
        "must point at dev.healthclouda.com and complete end to end. "
        "FRONTEND_URL mistakes surface exactly here and nowhere earlier.\n\n"
        "Also: no cookie carries Domain=.healthclouda.com; the built output "
        "contains zero occurrences of railway.app.",
    ),
    (
        date(2026, 8, 27), "BOTH",
        "Defect triage + fixes, T8 accessibility pass, cut staging + deploy beta.",
        "Fix what UAT found - on develop, RED test first for anything real. "
        "Re-run T1 plus every failed journey.\n\n"
        "T8: the accessibility and performance lens, systematically - keyboard "
        "reachable, labelled, contrast, screen-reader sane, Lighthouse, "
        "oversized assets. Clinic staff use keyboards heavily and some will use "
        "assistive tech.\n\n"
        "B4: cut the staging branch from develop and deploy "
        "beta.healthclouda.com with NEXT_PUBLIC_API_URL still UNSET - it must "
        "fail LOUDLY, proving A4 works. api-beta does not exist until 31 Aug; "
        "beta must be deployable before it does.",
    ),
    (
        date(2026, 8, 28), "BOTH",
        "GATE 2 - GO/NO-GO on the Tier 1 gate; beta.healthclouda.com ready",
        "Every Tier-1 A-item evidenced, or explicitly accepted in writing by "
        "the owner: A1 tier separation - A2 stale hosts purged - A3 cookie "
        "scoping - A4 fail-loud - A5 role gating - A6 consent bypass removed - "
        "A7 security baseline - A8 backend FRONTEND_URL confirmed tiered.\n\n"
        "TARGET: beta.healthclouda.com ready, pending ONLY the api-beta "
        "variable.\n\n"
        "IF NO-GO: onboarding moves. That decision is made HERE, not on 3 Sep.",
    ),
    # ── Week 4 — beta stand-up, confirmation, onboarding ────────────────
    (
        date(2026, 8, 31), "BOTH",
        "api-beta created -> set the env var, redeploy, verify. NO CODE CHANGE",
        "The backend stands up staging today and creates "
        "api-beta.healthclouda.com. Our side is a VARIABLE FLIP:\n"
        "set NEXT_PUBLIC_API_URL on the staging branch env -> redeploy -> "
        "verify.\n\n"
        "IF THIS REQUIRES A CODE CHANGE, THE TIERING IS WRONG and that is the "
        "finding of the day.\n\n"
        "Done when: beta.healthclouda.com loads and authenticates against "
        "api-beta with a valid cert.",
    ),
    (
        date(2026, 9, 1), "BOTH",
        "T9 CONFIRMATORY TEST DAY on beta (synthetic data)",
        "Passing on dev says the APPLICATION is right; it says nothing about "
        "whether THIS ENVIRONMENT is wired right.\n\n"
        "(1) RE-CONFIRM against the new env: T6 role journeys, T3 isolation, T4 "
        "leakage, T8 accessibility.\n\n"
        "(2) PROVE WHAT ONLY BETA CAN PROVE: an invite emailed from the STAGING "
        "backend lands on beta.healthclouda.com - not dev, not the apex - and "
        "completes through to login. Same for a consent link. This is the exact "
        "failure the whole tiering plan exists to prevent, and today is the "
        "first time both tiers exist to test it.\n\n"
        "Failures are logged, not patched in place.",
    ),
    (
        date(2026, 9, 2), "BOTH",
        "Fix on develop, re-promote, smoke test after the DB wipe, freeze",
        "Fix anything T9 found ON DEVELOP and re-promote - never hot-patch "
        "staging.\n\n"
        "The backend wipes the staging database to empty today before "
        "provisioning the beta org. AFTER the wipe, smoke test the UI: every "
        "dashboard must render EMPTY STATES, not error states. An empty "
        "database is exactly the condition that makes a swallowed fetch error "
        "look identical to 'no data' (FLAG-005) - this is the day that bites if "
        "E7 didn't land.\n\n"
        "Then freeze.",
    ),
    (
        date(2026, 9, 3), "BOTH",
        "ONBOARDING DAY - first beta org live",
        "Staff walkthrough and training. Watch logs and monitoring live "
        "throughout.\n\n"
        "NO DEPLOYS.\n\n"
        "FIRST REAL PHI ENTERS HERE - and not one day earlier.",
    ),
    (
        date(2026, 9, 4), "BOTH",
        "Hypercare day 1",
        "Continues into the following week. Daily: error review, support "
        "triage, watch for anything the synthetic data never exercised.\n\n"
        "Landing spot for any remaining FLOAT item - including the Cloudflare "
        "hosting migration if Gate 1 deferred it.\n\n"
        "Nothing merges to staging without a reason.",
    ),
]


# ── ICS mechanics ──────────────────────────────────────────────────────────
def escape(text: str) -> str:
    """RFC 5545 text escaping. Order matters: backslash first."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def fold(line: str) -> str:
    """
    RFC 5545 content lines are max 75 OCTETS, continued with CRLF + one space.
    Fold on octet width, not character count, or non-ASCII silently overflows.
    """
    out, current = [], ""
    for ch in line:
        candidate = current + ch
        limit = 75 if not out else 74  # continuation lines lose one to the space
        if len(candidate.encode("utf-8")) > limit:
            out.append(current)
            current = ch
        else:
            current = candidate
    out.append(current)
    return "\r\n ".join(out)


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:60].rstrip("-")


def event(day: date, lane: str, summary: str, description: str) -> list[str]:
    uid = f"{day:%Y%m%d}-{lane.lower()}-{slug(summary)}@{DOMAIN}"
    body = f"{description}\n\n{OWNERS[lane]}\n\nPlan: {PLAN}"
    return [
        "BEGIN:VEVENT",
        fold(f"UID:{uid}"),
        f"DTSTAMP:{DTSTAMP}",
        f"SEQUENCE:{SEQUENCE}",
        f"DTSTART;VALUE=DATE:{day:%Y%m%d}",
        f"DTEND;VALUE=DATE:{day + timedelta(days=1):%Y%m%d}",
        fold(f"SUMMARY:[{lane}] {escape(summary)}"),
        fold(f"DESCRIPTION:{escape(body)}"),
        f"CATEGORIES:{lane}",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
    ]


def standup() -> list[str]:
    """
    21:30-22:00 WAT, weekdays, 10 Aug - 4 Sep.

    Deliberately NOT the backend calendar's `standup-daily@healthclouda.com`:
    identical UIDs make one calendar's event overwrite the other's. This one
    follows the backend standup at 21:00.
    """
    body = (
        "30 minutes, all three of us, straight after the backend standup at "
        "21:00.\n\n"
        "Pull develop BEFORE reading any doc - every project doc is a "
        "working-tree file, so a stale tree gives a stale answer with no "
        "error.\n\n"
        "Read the In Flight table in HANDOFF.md. Say what you are taking today, "
        "especially when crossing lanes, and CLAIM THE ROW before cutting the "
        "branch.\n\n"
        "Call out contract-first ordering explicitly: the E-items must land "
        "before the DASH PR that styles them. A design PR built on the wrong "
        "data shape is a rewrite, not a fix."
    )
    return [
        "BEGIN:VEVENT",
        f"UID:frontend-standup-daily@{DOMAIN}",
        f"DTSTAMP:{DTSTAMP}",
        f"SEQUENCE:{SEQUENCE}",
        f"DTSTART;TZID={TZID}:20260810T213000",
        f"DTEND;TZID={TZID}:20260810T220000",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260904T235900Z",
        fold("SUMMARY:[BOTH] Frontend standup - git pull, In Flight, blockers, "
             "who's taking what"),
        fold(f"DESCRIPTION:{escape(body)}"),
        "CATEGORIES:BOTH",
        "END:VEVENT",
    ]


def build() -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//HealthClouda//Frontend Beta Sprint Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:HealthClouda - Frontend Beta Sprint",
        f"X-WR-TIMEZONE:{TZID}",
        fold(
            "X-WR-CALDESC:" + escape(
                "Tiers + dashboards (10-21 Aug) - UAT on dev (24-28 Aug) - "
                "beta stand-up, confirmation and onboarding (31 Aug - 4 Sep). "
                "Source of truth: docs/FRONTEND_SPRINT_PLAN.md"
            )
        ),
        "BEGIN:VTIMEZONE",
        f"TZID:{TZID}",
        "BEGIN:STANDARD",
        "DTSTART:19700101T000000",
        "TZOFFSETFROM:+0100",
        "TZOFFSETTO:+0100",
        "TZNAME:WAT",
        "END:STANDARD",
        "END:VTIMEZONE",
    ]
    for day, lane, summary, description in sorted(EVENTS, key=lambda e: (e[0], e[1])):
        lines += event(day, lane, summary, description)
    lines += standup()
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(build().encode("utf-8"))
    print(f"Wrote {OUT} ({len(EVENTS)} work items + 1 recurring standup)")
