# Handoff: HealthClouda Pre-Login Pages (Batch 1)

Target codebase: `HealthClouda/healthclouda-frontend` @ `develop` (Next.js App Router, Vercel).
Backend contract: `HealthClouda/healthclouda-backend` — `FRONTEND_HANDOFF.md` + live API docs at
`https://healthclouda-backend-production.up.railway.app/api/v1/docs/`.

## Overview

This batch covers **everything a user sees before logging in**:

1. **General landing page** — public marketing site for HealthClouda.
2. **Org landing page** — per-organization portal entry (`/org/[slug]`), public but unlisted.
3. **Auth set (10 screens)** — general + org sign-in, password recovery flow (4 screens, each with a general and an org-branded mode), staff-invite set-password, 404, and access-request respond (pending + 3 outcome states).

## About the Design Files

The files in `designs/` are **design references created in HTML** — prototypes showing intended look and behavior, NOT production code to copy. Your task is to **recreate these designs in the Next.js codebase** using its established patterns (App Router, existing component conventions, Tailwind or the styling approach already in the repo). Open each `.dc.html` in a browser to view it (keep `support.js` and `assets/` next to it). All styles are inline on the elements — inspect any element to read its exact values.

These designs are themselves grounded in the pre-React-rewrite vanilla code on the repo's `main` branch (`public/*.html`, `public/organization/`, `public/access-request/`) — the agreed visual source of truth — with deliberate cleanups noted below.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, copy, and states are final. Recreate pixel-perfectly. The HTML files are the source of truth for any value not listed in this README.

## Design Tokens

- **Fonts:** Inter (headings, labels, buttons — weights 400–800), Lato (body — 300/400/700). Google Fonts.
- **Colors:**
  - Primary `#0075ff`, hover `#005fcc`
  - Ink `#000825`; body text `#374151`; muted `#6b7280`; faint `#9ca3af`; icon-muted `#b0b8c9`
  - Backgrounds: page `#f8faff`; tinted panels `#e9f3ff` / `rgba(0,117,255,0.055)`; chip `#ebf3ff`; footer `#1a1a2e`
  - Borders: `#e2e8f0`, `#e8edf5`, inputs `#dde3ee`, card border `rgba(0,117,255,0.1)`
  - Success `#16a34a` (hover `#15803d`, tint `#dcfce7`); danger `#dc2626` (tint `#fee2e2`); warning `#d97706`/`#f59e0b` (tint `#fef3c7`)
- **Radii:** inputs/buttons 11px; info blocks 10px; cards 20px; frames/panels 16px; pills 999px.
- **Shadows:** card `0 4px 32px rgba(0,117,255,0.09)`; primary button `0 3px 14px rgba(0,117,255,0.28)`.
- **Controls:** inputs 48px tall, 1.5px border, left icon at 13px, focus = `border-color #0075ff` + `box-shadow 0 0 0 3px rgba(0,117,255,0.09)` + white bg (rest bg `#fafbff`). Primary buttons 48px, Inter 600 15px.
- **Icons:** stroke SVGs (feather-style, stroke-width 2), never emoji. Icon chips: 56px rounded-square (16px radius) or 64px circle, tinted bg.
- **Auth page background:** `assets/Backgroud_flare.png` cover + `linear-gradient(145deg, #f4f8ff 0%, #ffffff 50%, #eef4ff 100%)`, plus two blurred blobs (420px/`#c7daff` top-left, 340px/`#bdd4ff` bottom-right, `blur(80px)`, opacity 0.35).

## Route Map (Next.js)

| Design screen | Route |
|---|---|
| General landing | `/` |
| Org landing | `/org/[slug]` |
| General sign-in | `/signin` |
| Org sign-in | `/org/[slug]/signin` |
| Forgot password (general / org mode) | `/forgot-password` and `/org/[slug]/forgot-password` |
| Check email / OTP (general / org mode) | `/check-email` and `/org/[slug]/check-email` |
| Reset password (general / org mode) | `/reset-password` and `/org/[slug]/reset-password` |
| Password success (general / org mode) | `/password-success` and `/org/[slug]/password-success` |
| Set password (staff invite) | `/set-password?token=…` (global only — no org route) |
| Access request respond | `/access-request/respond?token=…&action=…` |
| 404 | Next.js `not-found` |

**One component per screen**, themed by org context — do NOT duplicate pages per org. The `.dc.html` auth canvas has an `orgMode` toggle (Tweaks) demonstrating exactly what changes between the two modes.

## Files

- `designs/HealthClouda Landing.dc.html` — general landing
- `designs/HealthClouda Org Landing.dc.html` — org landing
- `designs/HealthClouda Auth Pages.dc.html` — all 10 auth/utility screens on one canvas
- `designs/assets/` — all images (logos, hero, flare bg, feature icons, wellbeing cards)
- `designs/support.js` — prototype runtime only; ignore for implementation

## Screens

### 1. General landing (`/`)

Single scrolling page. Fixed 68px nav (white, blur, bottom hairline) with logo + anchor links (`How it works`, `Features`, `About`, `Security`, `Contact`) and a primary `Sign In` button. Sections in order:

1. **Hero** — centered, radial blue flare bg; pill kicker "Healthcare's connective infrastructure"; H1 58px Inter 750 `letter-spacing -0.025em` ("One patient record…"); 18px sub; primary + secondary CTAs; hero image (`Hero_picture.png`).
2. **How it works** (`#network`) — kicker (13px, 700, uppercase, `#0075ff`, `letter-spacing 0.1em` — this kicker pattern repeats on every section), H2 36px, 3-step cards.
3. **Features** (`#features`) — white band with hairline top/bottom borders; icon-card grid (icons from `assets/`: cloud, encrypted, pill, person_add, etc.).
4. **One platform** — 2-col grid (1.1fr/0.9fr, 72px gap): copy + 2-col role checklist, image (`Female_doctor.jpg`).
5. **Benefits** — 3 alternating image/copy rows (42/58 grid), pill badges, images `BENEFIT_ONE.png`, `Heart.png`, `target.png`, `noun-africa.png`.
6. **About** (`#about`) — tinted band `rgba(0,117,255,0.055)`.
7. **Security** (`#security`) — 2-col: shield icon + checklist of HIPAA/NDPR items.
8. **Contact** (`#contact`) — `#e9f3ff` band, facility onboarding form.
9. **CTA banner** — solid `#0075ff`, white H2 34px, white/outline CTAs.
10. **Footer** — `#1a1a2e`, 4-col grid (2fr 1fr 1fr 1fr), muted `#94a3b8` text.

**Behavior:** nav anchors smooth-scroll; `Sign In` → `/signin`. NO links to any org portal from this page (see Decisions).

### 2. Org landing (`/org/[slug]`)

Data-driven by org (name, logo, contact details) from the backend. Sections:

1. **Nav** — HealthClouda logo/wordmark left; `Sign In` button right → org sign-in.
2. **Hero** — dual logos (HealthClouda + org logo, 72px, side by side with divider), H1 "Welcome to **{Org}**" (clamp 32–51px, org name in primary blue), sub "Your gateway to health services and information.", primary CTA → org sign-in.
3. **Health Announcements** — centered heading + card grid. Cards have urgency states (normal / urgent accent). **Empty state** exists (see `emptyAnnouncements` tweak in the prototype): illustration-free quiet notice.
4. **Wellbeing carousel** — "Your Wellbeing Matters..." card carousel (images `P-1.png`…`P-6.png`), left/right arrow buttons, one card advance per click.
5. **Contact** (`#contact-us`) — patient→facility form. Posts to the **org's** contact inbox, NOT HealthClouda. Show clinic address/hours/phone/email + emergency phone from org config.
6. **Footer** — `#1a1a2e`, 3-col (2fr 1fr 1fr).

**Behavior:** carousel arrows cycle cards; announcements render from API (with loading/empty handling); all sign-in CTAs carry the org slug.

### 3. Auth canvas (10 screens)

All screens share: the flare/gradient background, a 64px white top nav (brand left, outlined back-button right), centered heading block (56px icon chip + H1 32px Inter 700 + muted sub), and a 700px-max white card. The canvas `data-screen-label`s:

1. **Sign in (general)** — `/signin`. Email + password (eye toggle), Remember me, Forgot password link, Sign In button, and a "Notice" info box (`#ebf3ff` bg, `#1a4b8c` text): accounts cannot be created online — visit reception.
2. **Sign in (org portal)** — same card but: nav shows **org logo (32px) + org name (19px)**; H1 "Sign in to {Org} HealthClouda" with org name in blue; identifier field is **"Email / HealthClouda ID"** (staff AND patients of that org sign in here).
3. **Forgot password** — email field + `Reset Password` button; "← Back to login" below card.
4. **Check email (OTP)** — 6 OTP boxes (52×56px, 11px radius; filled = blue border; active = blue caret + focus ring; empty = `#dde3ee`/`#fafbff`), disabled `Verify` until complete, resend link with countdown ("Resend email (0:24)" — disabled/grey while counting).
5. **Reset password** — password + confirm with: strength bar (4px track `#e5e7eb`; fill color by score — amber `#f59e0b` shown at 50% "Fair"), helper text, 2×2 live requirements grid (met = green filled-circle check `#16a34a`, unmet = grey outline circle), match message, button disabled until valid.
6. **Password success** — 72px circular chip with animated blue check (pop-in, `cubic-bezier(0.34,1.56,0.64,1)`), "Continue (5)" auto-redirect countdown button.
7. **Set password (staff invite)** — `/set-password?token=…`. Read-only email field; welcome header: "Welcome, **{Name}**" + "Your account at **{Org}** has been created as **{Role}**. Set a password to get started." Same strength/requirements UI as screen 5. Also has an **invalid/expired-token error state** (red circle-x icon replacing the header — see old `set-password.html` on `main`).
8. **404** — brand nav, 110px `#0075ff` Inter 800 "404", "Page not found", copy, primary `Back to Home`.
9. **Access request (pending)** — `/access-request/respond?token=…`. Centered 480px card on plain `#f8faff`: lock icon chip, "Access Request", info block (Organization / Reason / Requested rows on `#f9fafb`), green `Approve Access` + red-tint `Deny Access` buttons, "Powered by HealthClouda" footer link.
10. **Access request (outcomes)** — three card states: **Approved** (green check, "You have granted {Org} access…"), **Denied** (red X, "…Your records remain private."), **Link Expired** (amber triangle). Additional states from the old code to implement: *Already Approved / Already Denied* (same layouts as Approved/Denied with "already" copy), *Invalid Link* (missing token), *Connection Error*, and a loading spinner state.

#### Org mode (screens 3–6)

Recovery screens exist in **general** and **org** mode (toggle `Org portal mode` in the prototype's Tweaks panel to compare):

- Nav brand: HealthClouda icon+wordmark → **org logo (32px) + org name (19px Inter 700)**
- Forgot-password email placeholder: "Enter your email" → org-specific hint (e.g. `e.g. user@demo-clinic.com`)
- Back-links return to the **org** sign-in
- Screens 1–2 and 7–10 never change with org mode.

## Interactions & Behavior (implementation notes)

- **OTP flow:** auto-advance between boxes, paste support, resend countdown timer.
- **Password validation (both reset + set-password):** ≥8 chars, 1 uppercase, 1 number, 1 special; live requirement ticks; strength bar; confirm-match message; submit disabled until all pass.
- **Success screen:** ~5s countdown then redirect to the (org-aware) sign-in.
- **Access request respond:** on load, GET request details by token → show pending card; `action=accept|deny` URL param auto-submits; POST response → outcome state. Handle 404 (already responded/not found), 410 (expired), network error. Old endpoint: `receptionist/access-requests/respond/` — confirm against current API docs.
- **Set-password:** validate token on load → welcome state or error state; POST password → redirect to sign-in.
- **Hover states:** primary buttons darken to `#005fcc`; outlined back-button fills blue with white text; deny button fills solid red; links underline.

## Decisions (agreed with product — do not revisit)

1. **Org landing is public but unlisted.** No links to it from the general landing; add **`noindex` meta on all org portal routes**; facilities distribute the link themselves. Org portal serves staff AND that org's patients; the general portal is patients-only.
2. **Org recovery pages are the same components as general ones**, themed by slug — never duplicated per org.
3. **Staff-invite set-password keeps HealthClouda chrome** (org unknown before token validation; it's a platform account). The institution appears in the welcome copy after validation. ⚠️ **Verify the invite-validation endpoint returns org name (and ideally logo)** — if not, it's a small backend ask.
4. **Org contact form posts to the org's inbox**, not HealthClouda. No online account creation anywhere — copy points users to the reception desk.
5. **Emoji and Plus Jakarta Sans from the old access-request page were deliberately dropped** — use Inter/Lato + stroke SVG icons everywhere.

## Engineering follow-ups (staging hardening, not part of this batch's UI)

- CAPTCHA on repeated login failures; alerting on account-lockout spikes (backend already rate-limits + locks accounts).
- `noindex` on org portal routes (part of this batch).

## Assets

Everything in `designs/assets/` (PNG/JPG): `HealthClouda-icon.png` + `HealthClouda-icon-tight.png` (logo marks), `unilogo.png` (placeholder org logo — real ones come from the API), `Backgroud_flare.png` (auth bg), `Hero_picture.png`, `Female_doctor.jpg`, benefit/feature icons (`cloud`, `encrypted`, `pill`, `person_add`, `chat_bubble`, `eye`, `science`, `target`, `Heart`, `BENEFIT_ONE`, `noun-africa`), wellbeing cards `P-1`–`P-6`. Copy these into the repo's public assets. Inline SVG icons are embedded in the HTML — lift them verbatim.
