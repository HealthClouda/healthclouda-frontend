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

**Signs in for real against `api-dev` — no mocked auth.** Credentials come from the environment,
never this repo. Set in `.env.local` (gitignored) before running, one pair per role you're testing:

```
E2E_SUPERADMIN_EMAIL=...
E2E_SUPERADMIN_PASSWORD=...
E2E_ORG_SLUG=demo-clinic      # used for every staff role except superadmin
```

Any spec whose role credentials aren't set **skips itself** with a clear message rather than
failing — see `e2e/design/helpers.ts`. That means `npx playwright test e2e/design` is always safe
to run, even before you have credentials for every role.

🪤 **Run `npm test` with the harness's dev server stopped.** Playwright starts `npm run dev` and
leaves it running, and vitest forks a worker per test file. With both alive, workers time out
waiting to start and the suite reports **failures that are pure resource contention** — measured on
2026-09-04: **40 failed / 211**, and on a worse run only 8 of 23 files loaded at all. The same
suite, with the dev server stopped, is **211/211 in 16 seconds**. Nothing was wrong with the code.
If `npm test` goes red right after a harness run, kill the dev server and stray browsers and re-run
**before** believing it — the failure text (`Timeout waiting for worker to respond`) names the cause
if you scroll up past the assertion noise.

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


### Coverage, and what is NOT covered

| Spec | Roles | State |
|---|---|---|
| `superadmin.spec.ts` | Superadmin (DASH-1) | ✅ |
| `roles.spec.ts` | Org Admin (DASH-2), Receptionist (DASH-4), Doctor (DASH-5) | ✅ added 2026-08-31 |
| `roles.spec.ts` | **Nurse (DASH-3)** | ✅ **added 2026-09-04 — rendered for the first time, 6/6 green** |
| `roles.spec.ts` | **Patient (DASH-6)** | ⏸️ **wired and skipping** — no `E2E_PATIENT_*` credentials exist |
| `smallscreen.spec.ts` | FLAG-203 gate, with real CSS | ✅ |

🎉 **Nurse came back clean** — the first dashboard whose stats interface matches the live payload
exactly (11 of 11 fields), now confirmed from a third source: the published `NurseDashboardStats`
component lists those same eleven. The same run found FLAG-212 has worsened into two disagreeing bed
totals on one screen.

🔴 **But the count went up, not down, and it was Patient that moved it.** Later the same day the
newly published schema showed **two of four Patient tiles read fields `/patients/me/dashboard/` does
not return** (`upcoming_appointments`, `pending_access_requests` — **FLAG-231**). So the class now
stands at **five of seven**, and the one nobody has rendered is one of them. Found without a single
credential, which is the whole argument for checking the schema *and* rendering rather than choosing.

⏸️ **Patient is now the only dashboard nobody has ever rendered.** It has been *reachable* since
#100 merged, which is not the same as having looked at it — it needs one pair of credentials and
nothing else. Its entry is already in `roles.spec.ts`, including the two things that make it
structurally unlike the staff roles: it signs in at the slug-less general portal, and at 390px it
must render **responsively with no gate** (asserting the gate there would be asserting a bug).

⚠️ **Do not read a green harness run as "the dashboards are verified", for two separate reasons.**
One is Patient, above. The other is **FLAG-229: the harness photographs each page's landing state
only.** Every form, modal, slide panel and row action — including the Nurse record-vitals form,
which is the only write workflow that role has — is behind a second interaction and is rendered by
nobody. A green run means "each dashboard's front page loads and its tiles carry real values."

### ⚠️ Quoting credentials in `.env.local` — this looks exactly like a wrong password

**If a value contains `#`, it must be quoted.** dotenv treats an unquoted `#` as the start of a
comment and silently truncates the rest of the line:

```bash
E2E_NURSE_PASSWORD=abc#1234      # ← the browser receives "abc"
E2E_NURSE_PASSWORD="abc#1234"    # ← correct
```

This cost a diagnostic cycle on 2026-09-04. The credential was correct; only its first four
characters were ever sent, the backend answered *"Invalid email or password"*, and the harness
reported a bare 45-second `waitForURL` timeout — which reads as "the dashboard never loaded", so
you go and look at the dashboard. `signInAs` now races the form error against the navigation and
says which one happened, naming this trap in the message. **The four roles that already worked were
quoted; the newly added one was not.**

### The assertion that matters more than the pixels

`roles.spec.ts` checks that **no stat tile renders `—` or `NaN` once data has loaded.**

`StatCard` renders `{value ?? '—'}`, so an em dash is the signature of the component reading a field
the backend never sent. Unit fixtures are typed from the same wrong interface and agree with the bug,
so they cannot see it — which is why this check found FLAG-227 on the first Doctor run.

> 🔄 **Updated 2026-09-04 — the schema half of that argument has changed.** This section used to say
> the schema documents `200: No response body` for all eleven stats endpoints (FLAG-225) and so
> "a live render is the only layer that can see it". **Backend #161 (merged 3 Sep) published response
> bodies for all seven dashboard/stats endpoints**, verified against the live schema. So a **presence**
> check — does the component actually publish the field this tile reads? — is now possible, costs one
> `curl`, and **needs no credentials**. That is how **FLAG-231** was found on the Patient dashboard,
> which still nobody can sign into.
>
> **Do both, and in this order:** check the schema first because it is free and needs no token, then
> render, because two things a schema still cannot tell you are whether the field arrives *populated*
> and what actually reached the screen. And per **FLAG-554**, six fields in that same backend batch
> publish with the wrong *type* — a confidently wrong schema is worse than a silent one, because it
> removes the reason to measure.

When it fails, **capture the live payload and retype the interface. Never add the field to the
fixture** — that is precisely how the bug survives a green suite.

**Mask anything that legitimately changes** — timestamps, "2 minutes ago", live counts — or the
harness cries wolf on every run and you'll start ignoring it.

🚨 **Never run this harness against `api-beta`, and never commit a baseline captured from it.**
These PNGs are screenshots of patient records. Today that is safe — `api-dev` is synthetic seed data
and this repo is **public**. From **3 Sep** `api-beta` carries **real PHI**, and a baseline captured
against it would commit patient data to a public git history, where deleting the file does not remove
it. `NEXT_PUBLIC_API_URL` in your `.env.local` decides which backend you just photographed — check it
before `--update-snapshots`, not after.

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
