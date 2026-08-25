# Welcome to HealthClouda Frontend 👋

> **Who reads this:** every new developer joining this repo — **and their AI agent.**
> If you work with Claude (or any assistant) in this repo, it is required reading at the start
> of your first sessions; `CLAUDE.md` points every agent here.
>
> **Keep it alive.** This file describes a moving project. When something here goes out of date —
> a command, a URL, a folder, a rule — **fix it in the same PR that made it stale.** Onboarding
> docs rot faster than code, and a wrong onboarding doc is worse than none. Editing this file is
> never "not my job"; it is a completely legitimate contribution, including on your first week.

---

## Before anything else

You're new here, so a few things worth saying plainly:

- **You are not expected to understand this codebase yet.** It's a multi-tenant medical records
  system. It is genuinely complicated. Nobody reads it once and gets it.
- **Asking beats guessing, and we prefer it.** No question here is too small. "What does org slug
  mean?" is a good question. Ask it.
- **You will not break production.** `develop` runs on synthetic data only — there are no real
  patients in it. Experiment freely.
- **Your first PR doesn't need to be impressive.** It needs to exist. Small and merged beats big
  and stuck.
- **Two hours stuck is two hours we didn't need to spend.** Ask at thirty minutes.

Welcome — genuinely glad you're here.

---

## 1. What we're building

**HealthClouda** is an API-first, multi-tenant EHR/EMR platform for Nigerian healthcare
organisations. In plain terms: hospitals and clinics store patient records with us, and those
records travel with the patient between facilities instead of living in a paper file at one
hospital.

**Multi-tenant** means many organisations share one system but can never see each other's data.
This is the single most important idea in the codebase. Most of the complexity you'll meet — org
slugs in URLs, three separate login endpoints, org-scoped API paths — exists to enforce it.

Six roles:

| Role | Who they are |
|---|---|
| `SUPERADMIN` | Us. Platform operators, across all orgs. |
| `ORGANIZATION_ADMIN` | Runs one hospital/clinic on the platform. |
| `DOCTOR` | Sees patients, opens episodes, prescribes, refers. |
| `NURSE` | Records vitals, manages ward admissions. |
| `RECEPTIONIST` | Front desk — checks patients in, books appointments, requests record access. |
| `PATIENT` | Sees their own records, approves/denies access requests. |

**Two repos:**

| Repo | Stack | Deploys to |
|---|---|---|
| `healthclouda-frontend` (here) | Next.js 15, App Router, TypeScript | Vercel |
| `healthclouda-backend` | Django REST Framework | Railway |

See `HANDOFF.md` for who currently works on what.

---

## 2. Domain glossary — read this before the code

The code uses these words constantly with no explanation. Here they are.

| Term | What it actually means |
|---|---|
| **Org / organisation** | One hospital or clinic. The tenant. |
| **Org slug** | The org's URL-safe short name, e.g. `demo-clinic`. Appears in URLs as `/demo-clinic/doctor`. This is how the app knows which tenant you're in. |
| **HCL-ID** | HealthClouda ID — a patient's permanent ID that follows them across every org on the platform. The whole point of the product. |
| **Episode** | One continuous course of care for a complaint. A doctor opens an episode, works within it, then completes it. Roughly "a visit, but it can span days." |
| **Admission** | A patient occupying a bed in a ward. Nurse-facing. Not the same thing as an episode. |
| **Vitals** | Temperature, blood pressure, pulse, respiration, SpO2, weight, height. Nurses record them; readings **append** to a history, they never overwrite. |
| **Referral** | One doctor sending a patient to another doctor, usually at another org. Generates a referral letter PDF. |
| **Access request** | A clinic asking permission to view a patient's records held by another org. **The patient approves or denies it — not an admin.** This is a consent mechanism and it is deliberate. |
| **Check-in** | Front desk marking a patient as physically present today. |
| **Duty toggle** | Doctors and nurses mark themselves on/off duty. Reception uses it to see who's available. |

---

## 3. Day one — get it running

You need **Node 20+** and Git.

```bash
git clone https://github.com/HealthClouda/healthclouda-frontend.git
cd healthclouda-frontend
npm install
cp .env.example .env.local
```

Open `.env.local` and set `NEXT_PUBLIC_API_URL`. Unless you're running the backend in Docker
locally, use the shared dev tier:

```
NEXT_PUBLIC_API_URL=https://api-dev.healthclouda.com/api/v1
```

> **One build serves exactly one backend tier** — the value is baked in at build time. If it's
> unset, the build now **fails loudly** rather than falling back to localhost: a deployed build
> quietly pointing at localhost looks like "the backend is down" instead of a config mistake.
> The old Railway URL is dead (HTTP 400 `DisallowedHost`) and will not be restored.

```bash
npm run dev     # http://localhost:3000
```

**Verify your setup** — these three commands are the ones you'll run constantly, and all three
must be green before you open any PR:

```bash
npx tsc --noEmit    # type check  → expect no output
npm test            # unit tests  → expect all passing
npm run build       # prod build  → expect green
```

If they don't pass on a clean clone, that isn't you being new — say so and we'll fix it together.

> `npm run lint` currently does nothing useful — there's no ESLint config yet (see
> `CODEBASE_FLAGS.md`). Don't be confused when it behaves oddly.

---

## 4. How the app is put together

Full detail is in `ARCHITECTURE.md`. The five things you need on day one:

**1. It's Next.js App Router — folders under `src/app/` *are* the URLs.**
`src/app/[slug]/doctor/page.tsx` serves `/demo-clinic/doctor`. `[slug]` is the org slug; that's
how one codebase serves every tenant.

**2. The browser never talks to the backend directly.** Every browser request goes to our own
server routes — `/api/data` for reads, `/api/action` for writes — and *those* attach the JWT and
call Django:

```
browser → /api/data?path=/doctor/my-patients/ → [server attaches token] → Django
```

This exists so auth tokens stay in httpOnly cookies, where injected JavaScript can't read them.

**3. Therefore: never call `fetch()` against the backend from a component.** Use `useApi()` /
`dataGet()` / `dataAction()` (`src/hooks/use-api.ts`, `src/lib/client-api.ts`). If you're writing
a raw `fetch` to Django in a component, stop — you're going around the auth layer.

**4. Every endpoint string lives in `src/lib/config.ts`.** Never hardcode `/doctor/episodes/` in
a component. Add it to `ENDPOINTS` and import it — one file to fix when the backend moves something.
Same rule for URLs: build paths with `src/lib/router.ts`, don't hand-write them.

**5. Lists come back paginated.** Django returns `{count, next, previous, results}`, not a bare
array — so it's `data.results.map(...)`, not `data.map(...)`. `usePaginatedList()` handles this
for you; prefer it.

---

## 5. How we work

### The contract with the backend

The **live API schema is the single source of truth** — not a PDF, not a doc in this repo, and not
what a component currently assumes. Check it before building anything that calls the backend.

**You do not need a login to read it.** This surprises everyone, including people who have been here
weeks:

```bash
curl -s "https://api-dev.healthclouda.com/api/v1/schema/?format=json" > schema.json
```

200, no token, the whole thing. Only live *data* needs credentials. So "I can't check the contract
until someone sends me a login" is never true, and believing it has already cost this team time
more than once.

**Three habits that will save you a day each.**

**1. Read the `description`, not just the fields.** This API writes a lot of its contract in prose
that never reaches the structured parts. The patients viewset spells out its role rules in the
description — `CREATE (POST): SUPERADMIN, RECEPTIONIST only`, `RECEPTIONIST: contact info only` —
and `/receptionist/appointments/` declares **no** parameters while its description names three.
That matters because DRF **ignores an unknown query param silently**: you get 200, plausible-looking
data, and no hint you filtered nothing.

**2. Check each endpoint. Don't generalise to its neighbours.** `/ward/beds/` documents three
parameters and a paginated envelope. `/nurse/wards/overview/`, one path segment away, documents
nothing at all. Assuming the two behaved alike shipped a ward board that silently showed only the
first 20 beds — invisible against 7 seeded beds, wrong at a real hospital.

**3. A path existing is not a contract.** Plenty of endpoints appear in the schema with **no request
body and no response body** — they're hand-written views the generator can't introspect. If you find
two endpoints that do the same job, prefer the documented one.

**When the contract has a gap, say so — don't route around it.** Open a GitHub issue on the backend
repo tagged `api-request`: what you need, why, and the shape you expect.

And the part worth internalising early, because it is what makes this a medical system rather than a
CRUD app: **when a gap has a tempting workaround, ask what a wrong answer does to a patient.**

> Registering a patient is supposed to end with the receptionist reading them their HealthClouda ID.
> The create response doesn't include it. The obvious fix is to search for the patient you just made
> and show the first result — except two people with the same name registered minutes apart are
> indistinguishable, so the desk could hand someone another patient's medical identifier with
> nothing visibly wrong anywhere.
>
> We shipped the gap instead: the screen says the ID isn't available yet and offers a search where
> the receptionist can *see* who they pick. **A gap the user can see beats a guess they cannot.**

Nobody will be annoyed that you asked rather than guessed. Guessing in a records system is how
someone else's data ends up attached to the wrong human being.

### North Star: progressive hardening, not a rewrite

Three branches, three standards:

| Branch | Standard |
|---|---|
| `develop` | Demo-functional. Shortcuts allowed — **only if logged.** |
| `staging` | Production-grade. |
| `main` | Production. |

**"Only if logged" is the rule that makes this work.** If you take a shortcut, leave a `TODO`,
hardcode something, or knowingly leave a gap — record it in `CODEBASE_FLAGS.md`. An undocumented
shortcut is the actual problem; a documented one is a plan.

This matters more than it sounds: real patient data (PHI) is coming. Everything we let slide now
has to be findable later.

### Branches

- Cut `feat/*` or `fix/*` **from an up-to-date `develop`**.
- PR back into `develop`. Aim to merge within about a day — long-lived branches hurt.
- **Rebase onto `develop`.** Never merge `develop` into your branch.
- Never force-push `develop`.
- **Claim your work in the 🚧 In Flight table in `HANDOFF.md` _before_ you cut the branch**, and
  clear the row when it merges. That table is how the other devs know not to touch your files.

> **Honest warning:** branch protection is **not enforced** on GitHub — it needs Pro on private
> repos. None of the above is mechanically prevented. It is all honour system. That is exactly
> why it's written down.

### Session logs are owner-only

Each dev keeps their own log: `HANDOFF-<YourName>.md`. **Never edit another dev's log.**
Durable shared state goes in `HANDOFF.md`; your narrative goes in your own file.

At the start of a session, read **every** dev log — yours *and* the others'. Reading only your own
fails silently, and it's the easiest way to duplicate work or clobber someone.

### Review language — important

When someone says **"let's fix that" during a code review, it means _add a FLAG_ — not edit the
source.** Reviews produce a written record, not immediate commits. This catches everyone out at
first, so: review → `CODEBASE_FLAGS.md` → separate PR.

### Review lenses

When reviewing anything — including your own work before you open the PR — pass over it five times:

1. **Security** — can a user reach data that isn't theirs?
2. **Accessibility** — keyboard reachable? labelled? sufficient contrast? sane to a screen reader?
3. **Correctness** — does it do the thing, including edge cases?
4. **Consistency** — does it match how the rest of this repo does it?
5. **Performance** — extra round trips, re-renders, oversized images?

### Working style

- **Narrate as you go.** Say what you're doing, what you found, what you changed. Silence is
  expensive on a small team.
- **Investigate read-only first, show evidence, then choose a direction.** Don't start editing in
  order to find out how something works.

---

## 6. Where things live

```
src/
├── app/                    ← routes (folders = URLs)
│   ├── api/                ← OUR server routes (proxy + auth) — not the Django API
│   ├── [slug]/             ← everything org-scoped: landing, signin, 5 dashboards
│   └── …                   ← public pages: signin, set-password, recovery flow, 404
├── components/
│   ├── ui/                 ← generic primitives (Button, Modal, Pagination…)
│   ├── forms/              ← auth screens
│   ├── dashboard/          ← one folder per role
│   ├── layout/             ← shell, sidebar, header
│   └── landing/
├── hooks/use-api.ts        ← how you fetch data. start here.
├── lib/
│   ├── config.ts           ← ALL endpoints + roles + constants
│   ├── client-api.ts       ← browser data layer (401 → refresh → retry)
│   ├── server-fetch.ts     ← server-side fetching
│   ├── auth.ts             ← cookie handling
│   └── router.ts           ← URL building — never hardcode paths
├── types/                  ← shared TypeScript types
└── middleware.ts           ← route guarding; runs before every request
```

**Docs you should know exist:**

| File | What it's for |
|---|---|
| `CLAUDE.md` | The shared brain — project context and the session rituals, for humans and AI agents |
| `HANDOFF.md` | Durable shared state + the 🚧 In Flight claim table. Read every session. |
| `HANDOFF-<Name>.md` | Per-dev session logs. Owner writes only. |
| `ARCHITECTURE.md` | What is actually built — ⚠️ **currently stale wholesale** (ARCH-7): it still describes the vanilla-JS app deleted in July. Read it for history, not truth. |
| `docs/FRONTEND_SPRINT_PLAN.md` | The dated plan to beta onboarding — the nearest thing to a live backlog. Read the current week. |
| ~~`TARGET_ARCHITECTURE_CHECKLIST.md`~~ | ⚠️ **Does not exist yet.** Listed here and in `CLAUDE.md` since day one, so every session has silently skipped it. Still owed (sprint plan §F). |
| ~~`BETA_READINESS.md`~~ | ⚠️ **Does not exist yet either** — same story. A7's Tier-1 list is meant to land here. |
| `CODEBASE_FLAGS.md` | Known issues and logged shortcuts. Each dev owns a FLAG number range — see the top of that file. |

---

## 7. Your first week

Nobody expects output in week one. Suggested order:

1. **Get it running** (§3) and confirm the three verification commands pass.
2. **Click through the app as each role.** Ask the team for demo logins. Seeing the product beats
   reading about it.
3. **Read `ARCHITECTURE.md`**, then open `src/lib/config.ts` and skim `ENDPOINTS` — the entire API
   surface on one screen.
4. **Follow one request end to end.** Pick the nurse vitals form and trace it: component →
   `useApi` → `client-api.ts` → `/api/data` → Django. When that click-to-database path makes sense,
   you understand this codebase's spine.
5. **Pick up a Tier 1 item from `BETA_READINESS.md`**, or a small FLAG, and open a PR.

**Your first PR checklist:**

- [ ] Claimed in the 🚧 In Flight table in `HANDOFF.md`
- [ ] Branch cut from an up-to-date `develop`
- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] Reviewer assigned
- [ ] Logged in your own `HANDOFF-<YourName>.md`
- [ ] In Flight row cleared after merge
- [ ] Anything you noticed but didn't fix → added to `CODEBASE_FLAGS.md`

---

## 8. Getting unstuck

Roughly in order:

1. **Search the repo.** `CODEBASE_FLAGS.md` and the dev session logs answer a lot — someone has
   probably already hit it.
2. **Check the live API schema** if it's a "what does the backend actually return" question.
3. **Ask the team** — workflow, architecture, anything.
4. **Backend contract gaps → GitHub issue on the backend repo**, tagged `api-request`.

---

*This file is maintained by everyone who uses it. Last updated 2026-08-09.*
