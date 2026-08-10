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

## The screenshot harness

Lives in `e2e/design/` — built as part of DASH-1, then reused by DASH-2…6.

```bash
npx playwright test e2e/design           # capture / compare
npx playwright test e2e/design --update-snapshots   # accept intentional changes
```

Shape of a spec:

```ts
// e2e/design/superadmin.spec.ts
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },  // proves SmallScreenGate
];

for (const vp of VIEWPORTS) {
  test(`superadmin dashboard @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await signInAs(page, 'superadmin');
    await page.goto('/superadmin');
    await expect(page).toHaveScreenshot(`superadmin-${vp.name}.png`, {
      fullPage: true,
      mask: [page.locator('[data-testid="live-timestamp"]')], // ignore churn
    });
  });
}
```

**Mask anything that legitimately changes** — timestamps, "2 minutes ago", live counts — or the
harness cries wolf on every run and you'll start ignoring it.

**Commit the reference screenshots.** They're the record of what "correct" looked like; a diff in a
later PR is then a real signal.

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

*Last updated 2026-08-10. If something here is stale, fix it in the same PR that made it stale.*
