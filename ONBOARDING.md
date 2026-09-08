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

`.env.example` also carries the **T5 design-harness credentials** (`E2E_*`), commented out. You only
need them to run `e2e/design/` — every role whose pair is unset skips itself. Ask the other dev for
them out of band; they never go in this repo, which is **public**. 🪤 **Quote any value containing
`#`** — dotenv treats an unquoted `#` as a comment and silently truncates the rest, which presents as
a wrong password rather than a quoting bug. It cost a session on 2026-09-04. See
[`docs/DESIGN-VERIFICATION.md`](docs/DESIGN-VERIFICATION.md).

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

Full detail is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The five things you need on day one:

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

If an endpoint doesn't exist, or a response is missing a field: **open a GitHub issue on the
backend repo tagged `api-request`** — what you need, why, and the shape you expect. Do not guess,
and do not silently work around it.

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

### Your AI assistant's config — `.claude/`

Both of us drive this repo through an AI assistant, so the assistant's setup is project setup.

| File | Committed? | What it is |
|---|---|---|
| `.claude/settings.json` | ✅ **yes** | **Shared** project config. Pre-approves the read-only commands this repo runs constantly — `tsc --noEmit`, `npm test`, `npm run build`, lint, Playwright, read-only `git`/`gh`, and fetching the public API schema — so neither dev spends their session approving the same six commands. |
| `.claude/settings.local.json` | ❌ gitignored | **Yours alone.** Personal grants. Never commit it — your permission decisions must not silently become the other dev's. |

**The deny list is the part to read before you change anything.** It is grouped by what it protects,
and every group exists because of something that already happened here:

| Group | Blocks | Why |
|---|---|---|
| **Secrets** | reading `.env*` and `API-doc.md`, and `cat`/`head`/`tail` on `.env*` | Both are gitignored and carry values that must not enter a transcript — **this repo is public** |
| **Review integrity** | `gh pr review`, `gh pr merge`, `gh pr close`, `gh ruleset`, and every writing `gh api` method | Ruleset 11328360's one-approval requirement is **the only quality gate this repo mechanically has.** An assistant that can approve, dismiss or merge can spend it |
| **Shared branches** | pushing to `develop`/`main`/`staging`, all force-push forms, branch deletion, `reset --hard`, `--no-verify` | Nobody rewrites shared history, and a deleted branch closes any PR stacked on it |
| **Baselines** | `playwright test --update-snapshots` / `-u` | Silently rewriting a design baseline turns a real visual regression into a green check |
| **Infrastructure** | `vercel`, `wrangler`, `railway` | Infra has an **owner, not a PR**. Railway variables, Cloudflare DNS and Vercel env are not version controlled — an assistant reports what needs changing; the owner changes it |

⚠️ **Two honest limits, so nobody mistakes this list for a sandbox:**

1. **A `Read()` deny does not stop the shell.** `Read(./.env.local)` is blocked, but a sufficiently
   creative `Bash` invocation can still print the same file — the named `cat`/`head`/`tail` patterns
   close the obvious spellings, not the class. **This list raises the cost of a mistake; it does not
   make one impossible.** Treat it as a guardrail, not a boundary.
2. **Per-developer rules cannot live here.** The rule *"never edit another dev's session log"*
   (`CLAUDE.md` §3) cannot be expressed in this file, because a deny on `HANDOFF-Qeeyat.md` would
   block @Qeeyat from writing her own log. That one belongs in **your** `settings.local.json` —
   deny the *other* dev's file, whoever that is for you. This is the same reason the personal file
   is gitignored: your permission decisions must never gate the other dev's session.

**Adding to the allow list:** read-only and verification commands are fine — add them and say so in
your PR. Anything that writes, deploys, or spends money stays out, and belongs in your own
`settings.local.json` if you want it at all.

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
| `docs/ARCHITECTURE.md` | What is actually built |
| `TARGET_ARCHITECTURE_CHECKLIST.md` | Current → target, in dependency order, each with a "Done when". ⚠️ **Not written yet (as of 2026-09-05)** — don't go looking. It is derived *from* `BETA_READINESS.md`, so it could not be written until that landed |
| `BETA_READINESS.md` | Prioritised backlog, Tier 1 (beta-blocking) → Tier 5 (roadmap). ✅ **Landed 2026-09-04 (PR #121)** — it had been listed as required reading since day one while not existing, so every session before this silently read nothing |
| `CODEBASE_FLAGS.md` | Known issues and logged shortcuts. Each dev owns a FLAG number range — see the top of that file. |

---

## 7. Your first week

Nobody expects output in week one. Suggested order:

1. **Get it running** (§3) and confirm the three verification commands pass.
2. **Click through the app as each role.** Ask the team for demo logins. Seeing the product beats
   reading about it.
3. **Read `docs/ARCHITECTURE.md`**, then open `src/lib/config.ts` and skim `ENDPOINTS` — the entire API
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
