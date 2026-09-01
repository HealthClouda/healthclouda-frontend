# HealthClouda Frontend — Shared Brain

> **This file is the operating manual for every agent and every human working in this repo.**
> Two developers work this codebase, each driving their own AI assistant, and **those assistants
> cannot see each other's memory.** The documents in this repo are the *only* channel between
> them. If it isn't written down here, the other side does not know it.
>
> Treat every rule below as binding. They exist because something broke without them.

---

## 1. Project Context

**HealthClouda** is an API-first, multi-tenant EHR/EMR platform for Nigerian healthcare
organisations. Hospitals and clinics store patient records with us, and those records move with
the patient between facilities.

**Multi-tenancy is the core constraint.** Many organisations share one system and must never see
each other's data. Org slugs in URLs, three separate login endpoints, org-scoped API paths — all
of it exists to enforce that boundary. Never weaken it for convenience.

**Roles:** `SUPERADMIN`, `ORGANIZATION_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `PATIENT`.

**The two repos:**

| Repo | Stack | Deploys to |
|---|---|---|
| `healthclouda-frontend` (this one) | Next.js 15 App Router, React 19, TypeScript, Tailwind v4 | Vercel |
| `healthclouda-backend` | Django REST Framework | Railway |

**Timeline pressure that shapes every decision:** the beta org engagement is underway and **real
patient data (PHI) arrives within roughly a month.** Anything we let slide now must be findable
later. That is what `CODEBASE_FLAGS.md` is for.

### The contract seam

The **live `/api/v1/schema/` (Swagger) is the single source of truth** for the API. Not a PDF,
not a doc committed here, not what a component currently assumes, and not this file.

- Verify against the live schema **before** building anything that calls the backend.
- Missing endpoint or field → **open a GitHub issue on the backend repo tagged `api-request`**
  stating what you need, why, and the shape you expect. Never guess; never silently work around it.
- Backend changes we must consume are tracked in the **BACKEND CONTRACT NOTES** banner in
  `HANDOFF.md`.

> **Backend base URL (confirmed 2026-08-12):** `https://api-dev.healthclouda.com` for the dev tier —
> `.env.example` now carries the full per-tier map. The old Railway host is dead (HTTP 400
> `DisallowedHost`) and will not be restored. **One build serves exactly one backend tier**, so the
> URL is per-environment and never hardcoded; a missing value fails the build deliberately.

---

## 2. North Star — Progressive Hardening, Not a Rewrite

We harden this codebase in place. We do not stop and rewrite.

| Branch | Standard | Meaning |
|---|---|---|
| `develop` | Demo-functional | Shortcuts allowed — **only if logged** |
| `staging` | Production-grade | No known shortcuts |
| `main` | Production | Live |

**Every "good enough for now" decision must leave a tracked breadcrumb.** If you take a shortcut,
hardcode a value, stub a state, skip a validation, or knowingly leave a gap — it goes in
`CODEBASE_FLAGS.md` in the same PR. An undocumented shortcut is the actual problem. A documented
one is a plan.

An agent that silently "works around" a backend gap has done real damage: the workaround looks
like intent to the next reader.

---

## 3. Team & Multi-Dev Workflow

### Identify yourself — never ask the user who they are

At session start, run:

```bash
git config user.name
```

That is the developer you are working for. **Do not ask the user to identify themselves.** Use
the result to pick the correct session log and FLAG number range.

### Document ownership

| File | Who writes | Contains |
|---|---|---|
| `HANDOFF.md` | Everyone | **Durable shared state only** — snapshot, branches, env/deploy facts, 🚧 In Flight table, **📥 Cross-Lane Asks inbox**, BACKEND CONTRACT NOTES. **No session narrative.** |
| `HANDOFF-<Name>.md` | **Owner only** | That dev's session log — narrative, findings, decisions |
| `CODEBASE_FLAGS.md` | Everyone, own range | Issues found and shortcuts logged |
| `ONBOARDING.md` | Everyone | New-dev orientation |
| `docs/ARCHITECTURE.md` | Everyone | What is **actually built** |
| `TARGET_ARCHITECTURE_CHECKLIST.md` | Everyone | Current → target, dependency-ordered |
| `BETA_READINESS.md` | Everyone | Prioritised backlog, Tier 1 → Tier 5 |

**Never edit another developer's session log.** Not to tidy it, not to add a note, not to correct
it. If you need to tell them something, it goes in `HANDOFF.md` where it's shared state.

### The 🚧 In Flight table

Lives at the top of `HANDOFF.md`. It is how devs avoid colliding.

1. **Claim BEFORE cutting a branch** — not after, not at PR time.
2. **Clear the row on merge.**
3. **Read it at session start**, every session.

A stale claim is worse than no claim. If you abandon work, clear the row.

### The 📥 Cross-Lane Asks table

Also at the top of `HANDOFF.md`, under In Flight. **In Flight says what I am doing; this says what is
waiting on you.** Two different questions — and until 2026-09-01 nothing in this repo answered the
second.

> **An escalation is not delivered until a row exists there.** A `CODEBASE_FLAGS.md` entry is a
> catalogue. Your session log is narrative. Saying it out loud is nothing at all — **the other dev's
> assistant cannot see your memory, only the text you leave where they are told to look.**

- **Raise a row** when the work belongs to the other lane: it needs infra, secrets or spend you don't
  hold, it's a product or design call, or it blocks you. One sentence plus a link — don't restate the
  detail.
- **The owner clears the row, not the raiser** — and says *where it landed* (PR, doc section, FLAG).
- **If the ask has a GitHub issue, closing it is part of clearing the row.** Otherwise the tracker
  says done while GitHub says open, and GitHub is what sends the email.
- **Check your own rows before you pick work.** An open row may outrank what you planned to start.

Cross-repo asks get a row here **and** a GitHub issue on the backend repo tagged `api-request`. The
row is how the other frontend dev knows; the issue is how the backend knows.

### Branches

- Cut `feat/*` or `fix/*` **from an up-to-date `develop`**.
- PR back into `develop`. **Merge within roughly a day** — long-lived branches cause conflict pain.
- **Rebase onto `develop`. Never merge `develop` into your branch.**
- **Never force-push `develop`.**

> ⚠️ **Corrected 2026-08-30 — this section used to say branch protection was NOT enforced. It was
> wrong, and it had been wrong since the day it was written.** It claimed GitHub branch rules
> "require Pro on private repos, which we don't have". **This repo is public**, so rulesets were
> never a paid feature here. Found by @Qeeyat on 29 Aug (and by @Bastoh the same night, via a
> rejected push on #98); verified against the API before this edit:
>
> ```
> repo                  PUBLIC   (isPrivate: false)
> ruleset 11328360      enforcement: active  ·  refs/heads/{main,staging,develop}
> bypass_actors         []       ← nobody, repo admins included
> rules                 deletion · non_fast_forward
>                       pull_request: required_approving_review_count = 1
>                                     dismiss_stale_reviews_on_push  = false
> ```
>
> **What IS mechanically enforced on `main` / `staging` / `develop`:** a PR is required, it needs
> **one approving review**, and force-pushes and branch deletion are blocked — for everyone, with no
> bypass list.
>
> 🔑 **`dismiss_stale_reviews_on_push = false` is the part that surprises people.** A
> CHANGES_REQUESTED review is **not** cleared by pushing a fix — the reviewer must come back and
> approve. Merging "over" a standing change request is not a judgement call available to the author;
> GitHub refuses it. Plan around the reviewer's availability. (Hit on PR #99 on 30 Aug.)
>
> **What remains honour system:** everything else on this page — rebase-don't-merge, claiming In
> Flight *before* cutting a branch, merging within a day, running the three verify commands, logging
> shortcuts in `CODEBASE_FLAGS.md`. Nothing checks those, and that is why they are written down —
> violating one silently is a real cost to the other dev.
>
> ⚠️ **CI now exists, and it still gates nothing.** PR #116 closed FLAG-006: GitHub Actions runs
> `tsc`, the test suite, the build, and ESLint at `--max-warnings=0` on every PR. But ruleset
> 11328360 carries **no required status checks** — verified against the API 2026-09-02, the rules
> are `deletion`, `non_fast_forward`, `pull_request` and nothing else. **So a green tick implies a
> gate that is not wired up**: a red CI run does not block a merge today. Making the three jobs
> required is a repo-settings change only @Bastoh can make.

### Reviewers — always set one, and it is always the other dev

Every PR gets a reviewer assigned **when it is opened**, never later:

| PR author | Reviewer |
|---|---|
| @Bastoh | **@Qeeyat** |
| @Qeeyat | **@Bastoh** |

```bash
gh pr create --reviewer <the other dev> ...
```

This is binding on agents too: after opening a PR, confirm the reviewer is set. An unreviewed PR
merged into `develop` defeats the only quality gate this repo mechanically has, because branch
protection is not enforced (below).

### Cross-repo communication

Frontend ↔ backend asks are **GitHub issues on the backend repo**, tagged `api-request`. Not
Slack, not a doc in this repo, not an assumption in code.

---

## 4. Session Ritual

### Session start — in this exact order

1. **Identify the dev** — `git config user.name`. Never ask.
2. **Read `HANDOFF.md`** — shared state, In Flight claims, backend contract notes, and the
   **📥 Cross-Lane Asks inbox. Check your own rows there before picking work** — it is the only place
   that answers *"is anything waiting on me?"*, and an open row may outrank your plan for the day.
3. **Read _every_ per-dev log — `HANDOFF-<Name>.md` for ALL devs, not just this one.**
   ⚠️ Reading only your own **fails silently.** Nothing errors; you simply miss what the other dev
   did, duplicate their work, or contradict a decision they already made. This is the single
   easiest way to break the multi-dev workflow.
4. **Read `docs/ARCHITECTURE.md`** — what actually exists. ✅ **Rewritten 2026-08-30**, closing
   ARCH-7: it had described the vanilla-JS app deleted in July for eleven weeks. It now documents
   `develop` as it stands, and marks what is approved-but-unmerged as pending rather than done.
5. **Read `docs/FRONTEND_SPRINT_PLAN.md`** — the dated plan to the 3 Sep beta onboarding, and the
   nearest thing this repo has to a live backlog. Read the current week's row.
6. **Read `CODEBASE_FLAGS.md`** — open issues and logged shortcuts, including anyone else's range.
7. **Then ask the user what they want to work on.** Not before.

> ⚠️ **`TARGET_ARCHITECTURE_CHECKLIST.md` and `BETA_READINESS.md` do not exist yet.** They were
> listed here as required reading from the day this file was written, so every session since has
> silently skipped two steps — nothing errors, you just read nothing. They are still owed (sprint
> plan section F; `BETA_READINESS.md` is also where A7's Tier-1 list is meant to land). Steps 5–6
> above name what actually exists today. **When those two files are written, restore them here and
> delete this note.**

**If the dev is new to this repo, also read `ONBOARDING.md` in full** — and point them at it.
It is written for both of you.

### During the session

- **Narrate as you work.** Say what you're doing, what you're finding, what you're changing.
- **Investigate read-only first and show evidence before choosing a direction.** Do not start
  editing files to discover how something works.
- If scope changes, restate the updated goal explicitly.
- Claim In Flight before cutting the branch.

### Session end

1. Confirm what was completed and what remains.
2. **Update `HANDOFF-<YourName>.md`** — new dated entry at the top.
3. **Update `HANDOFF.md`** if durable state changed (In Flight rows, env/deploy facts, backend
   contract notes).
4. **Update `docs/ARCHITECTURE.md`** if routes, components, state, or the API layer changed.
5. **Update `CODEBASE_FLAGS.md`** with anything noticed but not fixed.
6. **Tick off `TARGET_ARCHITECTURE_CHECKLIST.md` / `BETA_READINESS.md`** items that are now done —
   only where the "Done when" is genuinely satisfied.
7. **Update `ONBOARDING.md` if anything in it went stale** — a changed command, URL, folder, or
   rule. Do this in the same PR that made it stale.
8. Recommend what to tackle next session.

---

## 5. Working Rules for This Codebase

**Data access**
- The browser **never** calls the backend directly. All browser traffic goes through our own
  proxy routes (`/api/data` reads, `/api/action` writes), which attach the JWT server-side.
- Never `fetch()` the backend from a component. Use `useApi()` / `dataGet()` / `dataAction()`.
- `src/lib/client-api.ts` is also the intended swap point for the deferred offline-first layer.

**Constants**
- Every endpoint string lives in `src/lib/config.ts` → `ENDPOINTS`. Never hardcode a backend path
  in a component.
- Every URL path is built via `src/lib/router.ts`. Never hand-write app paths.
- `RESERVED_PATHS` in `config.ts` must stay in sync with the `src/app/` directory, or org slugs
  will shadow real routes.

**Backend shapes**
- DRF list endpoints return `{count, next, previous, results}` — not bare arrays. Use
  `usePaginatedList()`.
- Pagination params are `?page=` and `?page_size=`. `?limit=` is silently ignored.
- **Invented query params are a recurring bug class here.** If a filter isn't in the live schema,
  DRF ignores it silently and the UI shows wrong data with no error. Verify before using.

**Auth**
- JWTs live in **httpOnly cookies**. Never move a token anywhere JavaScript can read it.
- SimpleJWT **rotates and blacklists** refresh tokens: the rotated token must be persisted, and
  concurrent refreshes log the user out. The single-flight refresh in `client-api.ts` is load-bearing
  — don't "simplify" it.

**Verification before any PR**

```bash
npx tsc --noEmit    # must be clean
npm test            # must be green
npm run build       # must be green
```

Never report work as done without running these. Report failures honestly, with output.

---

## 6. Review Discipline

### "Let's fix that" during a review means ADD A FLAG — not edit the source

This is the rule agents break most often. During a **review**, the output is a written record,
not commits. When the user says "let's fix that," "that's wrong," or "we should change that"
while reviewing code:

> **→ Add an entry to `CODEBASE_FLAGS.md`. Do not modify source files.**

Fixes happen in a separate, deliberate session with their own branch and PR. If you're genuinely
unsure whether you're in review mode or fix mode, ask — once.

### The five review lenses

Pass over any change — including your own, before opening the PR — through each:

1. **Security** — can a user reach data that isn't theirs? Is a trust decision made client-side?
2. **Accessibility** — keyboard reachable, labelled, sufficient contrast, sane to a screen reader?
3. **Correctness** — does it work, including edge cases and error paths?
4. **Consistency** — does it match how the rest of this repo does it?
5. **Performance** — extra round trips, avoidable re-renders, oversized assets?

### FLAG number ranges

Each dev owns a range so numbers never collide across agents that can't see each other. The
authoritative allocation table is at the top of `CODEBASE_FLAGS.md`. Frontend numbering is
**independent** of the backend repo's.

---

## 7. Onboarding a New Dev

This section is the *process*. The material a newcomer actually reads is **`ONBOARDING.md`** —
keep the two in sync and don't duplicate content between them.

### When a new developer joins

**The existing team:**

1. Add them to `HANDOFF.md` (team table) and allocate them a **FLAG range** in the table at the
   top of `CODEBASE_FLAGS.md`.
2. Create their session log, `HANDOFF-<Name>.md`, pre-seeded with the file's purpose and rules so
   they never face a blank file.
3. Give them the **current backend base URL** and demo logins for each role — neither is committed
   to this repo.
4. Point them at `ONBOARDING.md` as the first thing they read.

**The new developer, and their AI assistant:**

1. **Read `ONBOARDING.md` end to end.** It carries the domain glossary, local setup, the request
   flow, and the working agreements. Both the human and the agent read it — an agent that skips it
   will invent conventions this repo already has.
2. Then follow the normal §4 session-start ritual.
3. **Keep it current.** Anything in `ONBOARDING.md` found stale gets fixed in the same PR that
   made it stale. This is explicitly everyone's job, including on week one.

### What we expect of a new dev

- Not to understand this codebase yet. It's a multi-tenant medical records system; nobody reads it
  once and gets it.
- To ask early — thirty minutes stuck, not two hours.
- To ship something small and merged before something big and stuck.
- To experiment freely on `develop`: synthetic data only, no real patients.

Be warm. A newcomer's first week sets how safe they feel asking questions for the next year, and
a dev who doesn't ask is a dev who guesses in a codebase that handles medical records.

---

## 8. Login Portals (backend contract — do not mix these up)

| Portal | Endpoint | Who |
|---|---|---|
| General | `POST /auth/login/` | Patients only |
| Org | `POST /auth/login/<org_slug>/` | Staff **and** patients |
| Superadmin | `POST /auth/login/admin/` | Superadmin only |

Staff who try the general portal get a **400 carrying `org_slug` + `redirect_url`** — use it to
redirect them to their org portal automatically.

**Other auth flows:**
- **Invite setup:** `/set-password?token=<uuid>` → validate via
  `GET /auth/setup-password/validate/?token=` → POST to set. Expired links can be re-requested
  via the public resend endpoint.
- **OTP reset:** forgot-password → verify-otp → reset-password (three steps).
- **Access request respond:** GET with `?token=` is read-only; POST performs the decision. The
  action enum is `accept` / `deny`.

---

*Last updated 2026-08-09. This file is binding on humans and agents alike — if a rule here is
wrong, change it deliberately and say so in your session log.*
