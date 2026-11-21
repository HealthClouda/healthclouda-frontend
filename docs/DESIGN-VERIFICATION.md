# Design Verification — how to check a dashboard before you push

> **Who this is for:** whoever is building the DASH-1…6 dashboards from
> `design_handoff_dashboards/`. Written for someone new to this repo — no prior context assumed.
>
> **Why it exists:** "it looks right on my screen" is not verification. This file turns that into a
> repeatable check you can run before every push, and produces the screenshots the design handoff
> already asks for in each PR description.

---

## The one thing to understand first

**The design files are static mockups with invented data. Your app shows real data from `api-dev`.**
They will never be pixel-identical, and chasing that is a waste of your time.

So you are *not* comparing content. You are comparing:

- **structure** — is the same thing in the same place?
- **spacing and size** — sidebar 230px, header 64px, cards 14px radius
- **tokens** — the colors and fonts from the design system, not hand-picked hexes
- **states** — does every list have a loading, empty, *and* error state?

A dashboard showing three patients where the mockup shows eight is **correct**. A dashboard using
`#0080ff` where the token says `#0075FF` is **not**.

---

## Setup — two windows, side by side

```bash
npm run dev          # http://localhost:3000
```

Then open the design straight from disk — they're self-contained interactive HTML, no build step:

```
design_handoff_dashboards/designs/HealthClouda Superadmin Dashboard.dc.html
```

Drag it into a browser tab. Put it beside your `localhost:3000` tab. That's the whole setup.

**Read `design_handoff_dashboards/README.md` first**, before either window. It carries the tokens,
the shared-component specs, and the product decisions already made — things like "Security Alerts
card removed, no backend endpoint." Rebuilding something the README already decided against is the
most common way to waste a day here.

---

## Before you write any code: check the contract

The live API schema is the source of truth — **not** the design, and not what a component currently
assumes. The mockups were drawn before some endpoints existed.

1. Open `https://api-dev.healthclouda.com/api/v1/docs/`
2. Find every endpoint your dashboard needs.
3. Confirm the fields you're about to render actually exist.

**If a field or endpoint is missing, do not improvise.** Open a GitHub issue on the backend repo
tagged `api-request` saying what you need, why, and the shape you expect. Then build the UI so the
missing part renders conditionally — it lights up automatically when the backend ships.

> This repo has a recurring bug class worth knowing about: **invented query parameters.** If you send
> a filter DRF doesn't implement, it is *silently ignored* — no error, and the page shows wrong data
> confidently. There are live examples in `CODEBASE_FLAGS.md` (FLAG-004). Verify filters exist.

---

## The check, per dashboard

### 1. Structure and tokens

- Sidebar 230px · logo row 64px · header 64px sticky
- Active nav item: `#EBF3FF` background + primary text
- Cards 14px radius, controls 8px, badges 999px
- Fonts: **Inter** for UI, **Lato 700–900** for page titles and stat values
- Colors come from the token layer (`text-primary`, `bg-chip`, …), never a raw hex in a component

> ⚠️ **The logo is 2:1 (341×171), not square.** Sidebar slot 44×22, gate slot 64×32. Putting it in a
> square box squashes it — that exact bug shipped once already (see the 2026-07-13 brand-asset fix).

### 2. The 768px boundary — easy to get backwards

- **DASH-1…5** (Superadmin, Org Admin, Nurse, Receptionist, Doctor): below 768px these render
  **only** the branded `SmallScreenGate` notice. Staff use desktops.
- **DASH-6 Patient**: **must NOT have the gate.** It is the only mobile-responsive dashboard.
  Patients are on phones.

Check both by resizing the window to ~500px wide. Two seconds, and it's the mistake most likely to
reach review.

### 3. Every list needs three states — this is the important one

Every list, table and panel must handle:

| State | What it looks like |
|---|---|
| **Loading** | Shimmer / skeleton |
| **Empty** | `EmptyState` — 44px stroke icon, bold title, hint line |
| **Error** | `ErrorState` — with a working **Try again** |

🔴 **Empty and error look identical if you're careless, and that's a real bug in this repo**
(`CODEBASE_FLAGS.md` → FLAG-005: `serverFetch` turns every failure into `null`, which is
indistinguishable from "no data").

**Why it matters beyond tidiness:** on **2 Sep** the backend wipes the staging database before the
beta org is provisioned. Every dashboard will be empty that day. If an empty list renders as an
error — or a failed fetch renders as "no patients" — we find out with the org watching.

**How to test it deliberately:** open devtools → Network → set throttling to **Offline**, then
reload. You should get the error state and a working retry. Set it back to Online and confirm
recovery. Then find a genuinely empty list (a fresh org, or a filter matching nothing) and confirm
it shows the empty state instead.

### 4. Accessibility — the five lenses include it for a reason

Clinic staff work fast and keyboard-first, and some will use assistive tech.

- **Tab through the whole page.** Every button, link and input reachable, in a sensible order.
- **Focus is visible.** If you can't see where you are, neither can they.
- **Every input has a real `<label>`** — placeholder text is not a label.
- **Modals and slide panels trap focus** and close on `Esc`.
- **Icon-only buttons have an accessible name** (`aria-label`).

### 5. Screenshots for the PR

The design handoff asks for screenshots in every PR description. Take them at **1440×900** (desktop)
and **390×844** (mobile — proves the gate behaviour), for each page of the dashboard.

---

## The contract checks (`e2e/contract/`)

🗓️ **Run before every `develop` → `staging` promotion.** They are not in CI (CI holds no
credentials), so that is the one moment they are guaranteed to run.

```bash
npm run test:contract
```

They sign in **for real** against `NEXT_PUBLIC_API_URL` (no mocked auth) and check two things a unit
test structurally cannot:

| Spec | What it proves |
|---|---|
| `dashboards.spec.ts` | No stat tile renders `—`, `NaN` or `undefined` once data has loaded (FLAG-222), on Org Admin, Nurse, Receptionist, Doctor and Patient. At 390px, staff dashboards are **absent** behind `SmallScreenGate` and the patient portal has **no** gate |
| `smallscreen.spec.ts` | The FLAG-203 gate with real CSS at a real viewport, which jsdom cannot evaluate |

> 🗑️ **Until 21 Nov 2026 this folder was `e2e/design/`, the T5 screenshot harness**, with 35
> committed baselines. They existed so the Claude Design exports could be matched while the
> dashboards were built. That job is done, the baselines (last refreshed 26 Sep) drifted daily with
> the clock (FLAG-235), and they were removed. The checks above never depended on pixels.

**Credentials** come from `.env.local` (gitignored), never this repo. One pair per role you test:

```
E2E_SUPERADMIN_EMAIL=...
E2E_SUPERADMIN_PASSWORD=...
E2E_ORG_SLUG=demo-clinic      # used for every staff role except superadmin
```

A role whose pair is unset **skips itself** with a clear message, so the command is always safe to run.

### ⚠️ Quoting credentials in `.env.local`: this looks exactly like a wrong password

**If a value contains `#`, quote it.** dotenv treats an unquoted `#` as a comment and silently
truncates the rest of the line:

```bash
E2E_NURSE_PASSWORD=abc#1234      # ← the browser receives "abc"
E2E_NURSE_PASSWORD="abc#1234"    # ← correct
```

It cost a diagnostic cycle on 2026-09-04. `signInAs` now says when the backend rejected the sign-in,
naming this trap.

🪤 **Run `npm test` with Playwright's dev server stopped.** Playwright starts `npm run dev` and leaves
it running; with both alive, vitest workers time out and report failures that are pure resource
contention (measured 2026-09-04: 40 failed / 211, then 211/211 with the server stopped). The text
`Timeout waiting for worker to respond` names the cause.

### Why the tile check matters

`StatCard` renders `{value ?? '—'}`, so an em dash is the signature of a component reading a field the
backend never sent. Unit fixtures are typed from the same wrong interface and agree with the bug.

**Do both, in this order:** first `npm run audit:contracts` (free, no credentials: it diffs every
`*Stats` interface in `src/types/dashboard.ts` against the published schema), then the browser check,
because a schema cannot tell you whether a field arrives *populated* or what reached the screen. When
either fails, **capture the live payload and retype the interface. Never add the field to the
fixture**, which is precisely how this bug survives a green suite.

🚨 **Never point these checks at `api-beta`.** It carries **real PHI**, and Playwright's traces and
report (`test-results/`, `playwright-report/`) contain screenshots of whatever rendered. Check
`NEXT_PUBLIC_API_URL` in `.env.local` before you run.

---

## Before you push — the checklist

- [ ] Contracts verified against live Swagger; anything missing has an `api-request` issue
- [ ] Structure, spacing and tokens match the design (not the fake content)
- [ ] Logo at its natural 2:1 aspect everywhere
- [ ] Resized below 768px: gate on DASH-1…5, **no gate on DASH-6**
- [ ] Every list has loading / empty / error, and error has a working retry
- [ ] Tested offline (error state) **and** with an empty list (empty state)
- [ ] Tab through the page: reachable, visible focus, labelled inputs, `Esc` closes overlays
- [ ] Screenshots captured at both viewports, attached to the PR
- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] Row claimed in the 🚧 In Flight table in `HANDOFF.md`
- [ ] Anything noticed but not fixed → a FLAG in `CODEBASE_FLAGS.md` (your range: **200–399**)

---

## When something looks wrong in the design itself

It happens — the mockups predate some backend changes, and one design bug has already shipped.

**Don't silently "fix" it, and don't silently follow it.** Note the deviation in the PR description
under a **Known design deviation** heading, saying what you did and why. There's precedent in the
session logs: the org sign-in field is labelled "Email / HealthClouda ID" in the design, but backend
login is email-only, so it shipped as "Email address" with that noted for review.

A written deviation is a decision. An unwritten one looks like a mistake to whoever reads it next.

---

*Last updated 2026-11-21 (screenshot harness removed, FLAG-235). If something here is stale, fix it in the same PR that made it stale.*
