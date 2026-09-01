# Session Log — @Bastoh

> **This file is mine.** Only I write in it. Nobody else edits it — not to tidy, not to correct.
> If another dev needs to tell me something, it goes in `HANDOFF.md` where it's shared state.

---

## What goes in here

My **narrative**: what I worked on, what I found, what I decided and why, what's left unfinished.

**Not** here: durable shared facts (branch strategy, env values, In Flight claims, backend contract
notes) — those live in `HANDOFF.md` so everyone sees them. Issues noticed but not fixed go in
`CODEBASE_FLAGS.md` (my FLAG range: **001–199**).

**Why it matters:** each dev drives their own AI assistant, and those assistants **cannot see each
other's memory.** This file is how my work becomes visible to them.

### Entry template

```markdown
### YYYY-MM-DD — <short title> (branch: <branch-name>)

**Goal:** what I set out to do.
**What I did:** …
**What I found:** …
**Decisions:** … and why.
**Verified:** tsc / tests / build, plus anything checked against the live schema.
**Left undone / next:** …
```

> **Migration note (2026-08-09):** entries dated 2026-07-17 and earlier were moved here verbatim
> from `HANDOFF.md`, which is being restructured to hold durable shared state only. The
> "Pending / TODOs" lists inside those older entries are **historical snapshots** — they record what
> was open *at the time*. Live TODOs belong in `HANDOFF.md`, `CODEBASE_FLAGS.md`, or
> `BETA_READINESS.md`, not in this file.

---

## Session Log

### 2026-09-01 — Levelled the frontend against the backend: CI, lint, coverage, and the e2e suite nobody had run (branches: feat/e8-ci-eslint-gating, feat/b-test-infrastructure, fix/flag-024-stale-e2e-specs)

**Goal:** started as the 31 Aug beta stand-up. Became a deliberate detour into tooling, after the
owner asked what it would take to work both repos properly instead of alternating between them. The
detour paid for itself before I wrote any code, and that is the useful part of this entry.

**What I did:**
- **PR #116 — E8/FLAG-006.** ESLint flat config + GitHub Actions CI, three jobs, gating at zero
  findings. **This repo now has CI and it has run** — two green runs.
- **PR #117 — B7 coverage** (stacked on #116). Baseline **55.64% statements**. Raised FLAG-023/024.
- **PR #118 — FLAG-024.** e2e suite repaired, **9 failing → 13/13**. Raised FLAG-025.
- **Held the required-status-checks flip** and wrote why on #116.
- Read the backend repo properly for the first time from a frontend session.

**What I found:**

- 🎯 **The T6 answer Qeeyat needed was in my own backend repo.** Her Gate 2 said *"I cannot tell from
  this repo whether it happened… this needs an answer from the backend team, not a guess from me."*
  `docs/UAT-CHECKLIST.md`, last touched **27 Aug by me**: *"T6 re-run VERIFIED LIVE on api-dev — 20
  blocked steps → 6."* And the precise answer is better than yes or no: **those steps are API-level
  curl, not through this UI.** So the API journeys are walked and the **UI journeys are not.** She
  waited three days on something that lived in the folder I was not in that day.
- 🔴 **`FRONTEND_HANDOFF.md` — the designated cross-repo channel — is seven weeks stale** and still
  names the dead Railway host as "SOURCE OF TRUTH". The one document whose entire job is crossing the
  gap cannot be trusted by the person on the other side of it.
- 🎯 **`BETA_READINESS.md` and `TARGET_ARCHITECTURE_CHECKLIST.md` exist — in the backend.** Frontend
  `CLAUDE.md` has listed them as required reading since day one and says they do not exist. They do,
  next door. We do not need to invent them; we need to port them.
- **The backend was already ahead on every item I "discovered" the frontend needed:** `ci.yml`,
  `ruff.toml`, 621 tests, `.claude/settings.local.json`. **I solved this once and it did not cross.**
- 📊 **The lag has a direction.** Last 60 days: **207 backend commits, 77 frontend.** Roughly 73/27,
  and the 27% side is the one with no CI, ten open PRs and A5 still open.
- 🚨 **`next lint` was worse than "never run".** With no config it drops into an **interactive
  prompt**, so in CI it would hang until the timeout rather than fail. FLAG-006 understated it.
- 🔴 **FLAG-023: the proxy boundary has zero test coverage.** `/api/data` and `/api/action` — the
  layer §5 says attaches the JWT server-side — are both 0%, as is every auth route. Nothing fails
  today if the `if (!token)` guard is deleted. `security-headers.test.ts` mentions those paths, which
  is exactly why a grep looks reassuring and coverage did not.
- 🔴 **FLAG-024: 9 of 13 Playwright tests were failing on `develop`.** `npm test` is vitest only, the
  e2e suite is in no ritual, so nothing reported it. Not environmental — identical result against
  `api-dev` and against an unroutable host. The specs described the pre-redesign landing page.
- **FLAG-025 is FLAG-203 one component over.** The mobile drawer is mounted unconditionally and
  hidden with `translate-x-full`, so its controls stay in the accessibility tree and in tab order when
  closed. No PHI, hence P3 — but the same mistake in two independently written components is a
  pattern, not an accident, and the next instance may be somewhere that matters.
- **Both devs commit under two git identities.** Qeeyat as `Qeeyat` and as `Mohammed Muteqeeyat
  Wuraola` (34 of the last 60 days' commits), same email; Eric likewise. §4 identifies the dev via
  `git config user.name`, so about a third of the time that returns a string matching no session log
  and no FLAG range. It will not error — the assistant will simply guess. **Identify by email.**
- **Eric authored this frontend** — phases 0–5 on 11 Jun, plus the initial commit in December. Last
  touched it **12 Jun**. "Backend only" is true of today, not of history.

**Decisions:**
- **Held the required-status-checks flip rather than doing it when asked.** Measured first: `ci.yml`
  is not on `develop`, so **0 of 3 checks report on any open PR**. Making them required would have
  left all ten — including **#99** (the must-close-before-PHI item) and **#98** (beta promotion) —
  stuck on *"Expected — waiting for status to be reported"*, two days before onboarding, and
  unfixable until #116 merged, which needs a review I cannot give myself. Merge #116, then flip.
  Written on the PR with the exact command so it is not rediscovered.
- **Ignored `design_handoff_*/` in ESLint** — the directory where all 4 errors live. Verified rather
  than assumed: all five `design_handoff` hits under `src/` are comments naming a design. Said
  plainly in the config file, because ignoring the directory that contains every error looks like
  hiding debt and deserves the reasoning next to it.
- **Flagged Avatar's `<img>` instead of fixing it (FLAG-022).** `next/image` needs
  `images.remotePatterns` naming a **per-tier** backend host in `next.config.ts` — precisely what A2
  purged and A4 exists to prevent. A tier-aware config decision, not a component edit.
- **Did not add e2e to CI in #117.** A 9/13-red suite is exactly FLAG-370's permanently-red check.
  Fixed the specs first, in their own PR, so the job can be added to something green.
- **Pinned `@vitest/coverage-v8` to 4.1.8.** Left uncapped, npm resolved ^4.1.11 and dragged **vitest
  itself** from 4.1.8 to 4.1.11 — a test-runner bump two days before PHI, in exchange for a coverage
  reporter.
- **Restored the `libc` fields the local npm strips on every lockfile write** (44 packages). Verified
  the JSON round-trip is byte-identical to npm's own formatting before touching it. Both lockfile
  diffs are now pure additions, 0 deletions.
- **#118 branched off `develop`, not stacked** — spec files only, no dependency. This log **is**
  stacked on #113 so the entries stay chronological instead of both inserting at the top of one file.

**Verified:** every claim above measured, not reported. #116: tsc clean · 192/192 · build green ·
lint clean at `--max-warnings=0` · **CI green on its own PR, twice**. #117: the same, plus
`npm ci --dry-run` exit 0. #118: **13/13 Playwright**, plus eslint run with #116's config borrowed so
these files cannot turn that PR red on arrival. The A4 fail-loud guard is proved **in the real
runner** — and my first local attempt at that test PASSED, because `.env.local` on disk supplied the
value, so the job now asserts *why* the build failed rather than only that it did.

**Left undone / next:**
- [ ] 🔴 **Merge #116, THEN flip required status checks.** The exact command is on the PR. Until then
      CI runs for signal only and nothing is actually gated.
- [ ] 🔴 **`api-beta` and `beta.` are both still NXDOMAIN.** The 31 Aug row did not happen, and the
      backend half does not exist either — confirm with them before spending a day on ours.
- [ ] 🔴 **#99 still needs Qeeyat's re-review.** Unchanged since 30 Aug. A5 cannot close without it.
- [ ] 🟠 **Tell the backend team the UI half of T6 was never walked.** I can answer their question now.
- [ ] 🟠 **Refresh `FRONTEND_HANDOFF.md`** — the courier doc is the only thing that scales, since I am
      the only person in both repos.
- [ ] 🟠 **Port `BETA_READINESS.md` + `TARGET_ARCHITECTURE_CHECKLIST.md`** from the backend, then
      restore them to `CLAUDE.md` §4 and delete the note saying they do not exist.
- [ ] 🟠 **Parity list C–F** (docs, handoff structure, `.claude/` config, contract seam). **D15 — a
      Cross-Lane Asks table in `HANDOFF.md`, which the backend already has — is the single highest
      value item on it**, and is the exact hole the T6 answer fell through.
- [ ] 🟠 **B8 second half** — the design specs need decisions, not fixes: real credentials in CI, and
      baselines that are `*-chromium-win32.png` only.
- [ ] 🟠 **B9 / FLAG-221 instance 3** still open, and it concerns #99.
- [ ] 🟢 **Fix dev identification to key on email**, not `git config user.name`.
- [ ] 🟢 Update **FLAG-024**'s status line once #117 and #118 have both landed.

---

### 2026-08-30 — Fixed #99's hourly logout, reviewed Qeeyat's whole queue, and found out we have had a real merge gate all along (branches: fix/flag-001-server-trusted-auth, docs/branch-protection-and-flag-021, docs/stale-doc-sweep)

**Goal:** unblock #99, merge #100 and #98 behind it, then clear Qeeyat's six open PRs. The first
half did not go the way I planned it, and the reason is the most useful thing in this entry.

**What I did:**
- **Fixed the regression Qeeyat blocked #99 for** — the server gate logging every user out every
  hour. Middleware now resumes the session; FLAG-020 logged for what remains.
- **Reviewed all six of her PRs**, re-running the three commands myself on each rather than
  trusting the bodies: **#106 ✅ · #109 🔴 · #107 🔴 · #108 ✅ · #110 ✅ · #105 ✅.**
- **PR #111** — `CLAUDE.md` §3's branch-protection claim corrected, FLAG-021 logged.
- **PR #112** — the stale-doc sweep: `README.md` and `ARCHITECTURE.md` rewritten (ARCH-7 closed),
  four reference docs moved into `docs/`, 28 sprint-plan state cells refreshed.

**What I found:**

- 🎯 **We have had a mechanically enforced merge gate the entire time, and `CLAUDE.md` told everyone
  we didn't.** Qeeyat found it on 29 Aug; I re-queried the API rather than take it: the repo is
  **public** (so rulesets were never Pro-only), ruleset `11328360` is **active** on
  main/staging/develop, one approving review required, force-push and deletion blocked, **bypass
  list empty**. §3 has said "honour system… nothing is mechanically prevented" since the day it was
  written. That is the sentence that makes someone comfortable merging their own work.
- 🔴 **`dismiss_stale_reviews_on_push = false`, and it changed tonight's plan.** Pushing the fix did
  **not** clear her changes-requested on #99. Merging over a standing change request is not a
  decision the author gets to make — GitHub refuses it. I had told the owner it was his call. It
  was not, and I said so as soon as I knew.
- 🎯 **FLAG-225 is bigger than she wrote it.** She counted 11 stats endpoints documenting no
  response body. I counted every GET in the schema whose 200 carries no `content`: **48 of 125
  paths**, including `/auth/me/` — which is exactly what `requireDashboardUser()` asks on every
  dashboard render in my own #99. Roughly two in five GETs document no response shape at all. That
  reframes the backend ask from "publish the stats serializers" to something much larger.
- **FLAG-226 sharpened, not settled.** `/episodes/` documents *field* visibility for patients in
  prose ("NO clinical_notes, NO treatment_plan") and says nothing about *row* scoping. So patients
  are expected callers, and the silence is specifically about which rows. Still needs a live patient
  token, which needs #100.
- **#107 tells the desk "copied" whether or not it copied.** `navigator.clipboard?.writeText(...)`
  then an unconditional success toast: no clipboard, or a rejected promise, and the receptionist
  trusts it and pastes whatever was there before. A wrong identifier entering a record — the exact
  harm that PR's search-and-guess refusal exists to prevent, arriving through the clipboard.
- **#109's substituted tile navigates somewhere it isn't.** "Admissions Under Care" routes to
  Episodes and kept the prescriptions beaker icon; the doctor has no admissions page.
- **#106's gate cannot reach one hook.** The early return stops everything passed as `children`,
  but each dashboard's own `useApi(initialStats ? null : STATS)` runs in the *parent*. On a failed
  server fetch a phone still pulls aggregate counts — **FLAG-021**, P3.
- **`README.md` told new developers to store JWTs in `localStorage`**, contradicting `CLAUDE.md` §5,
  in the first file anyone opens, four days before real PHI.

**Decisions:**
- **Put the session refresh in middleware, not the gate.** A Server Component cannot set cookies in
  Next, so `requireDashboardUser()` structurally cannot repair its own problem; middleware already
  owns the "refresh cookie means the session is alive" invariant. The new token is handed to the
  *same* request via a mutated request cookie — with only `Set-Cookie` the gate still sees nothing
  on the navigation that refreshed, and the bug survives its own fix by one render.
- **Distinguished `rejected` from `unreachable`.** A refusal clears the cookies; a network blip
  keeps them. Destroying a live seven-day session because the API wobbled once is the worse failure.
- **Did not try to fix the concurrent-refresh race — logged it.** It cannot be fixed by coordinating
  on the edge: no shared state, and the loser's request was sent before the winner's `Set-Cookie`
  existed. FLAG-020 names what a real fix needs (a backend grace window, or a serialising store).
- **Changes-requested on #107 and #109 rather than folding the fixes in myself.** §6 puts fixes in
  their own commit with the author's name on them, and #109's tile question is about what the tile
  *means*, not a tidy-up.
- **Archived `MIGRATION-PLAN.md` and `CONTRACT-AUDIT.md` rather than deleting them.** FLAG-009's
  "Done when" accepts "clearly marked historical", and both still explain decisions visible in
  today's code.
- **Kept the session-ritual docs at root.** They are named by bare filename across the rituals, the
  sprint plan and Qeeyat's log; moving them mid-sprint means trusting another agent not to keep
  reading the old path.
- **No In Flight row for this branch.** #110, #111 and #112 all touch that table already; a fourth
  edit is a guaranteed conflict for a docs-only log. Recording the skip rather than doing it
  silently — same call Qeeyat made on 29 Aug, and the rule still says claim before cutting.

**Verified:** every review re-ran the three commands myself — #106 **176/176**, #109 **180/180**
(matching her numbers exactly), #107 **157/157**, all tsc clean and build green. On my own work:
#99 tsc clean · **184/184** · build green, with **7 of 10 new middleware tests confirmed RED**
against the pre-fix code first. #111 and #112: tsc clean · **171/171** · build green. Against live
sources rather than documents: the ruleset and repo visibility via the GitHub API · the OpenAPI
schema pulled unauthenticated (125 paths, 391 KB) to confirm FLAG-223/224/225/226 myself ·
`beta.healthclouda.com` NXDOMAIN · `dev.` 200 · `origin/staging` still at 2026-04-12 · and Next
15.3.3's own `resolve-routes.js` to confirm `x-middleware-request-cookie` is deleted before response
headers are emitted, because it carries a bearer token and I was not willing to assume that.

**Left undone / next:**
- [ ] 🔴 **#99 needs Qeeyat's re-review.** The fix is pushed and written up; nothing else unblocks it,
      and #100 (patients cannot sign in) is stacked behind it.
- [ ] 🔴 **Mon 31 Aug — `api-beta`.** Merge #98 first, then set the `staging`-scoped
      `NEXT_PUBLIC_API_URL` **before** attaching `beta.`, or the beta host serves against the dev
      backend. Both failure modes are silent. `beta.` is still NXDOMAIN — DNS is the long pole.
- [ ] 🔴 **Ask the backend team whether their UAT week actually ran through this UI.** Qeeyat raised
      it on #108 and neither of us can answer it from this repo. If it did not, we onboard onto
      journeys nobody has walked.
- [ ] 🟠 **C4 — the Cloudflare decision is still unwritten**, and the C2 spike was never run. Gate 1
      said so on 22 Aug and nothing has changed. Write the decision, even if the decision is "after
      hypercare".
- [ ] 🟠 **The apex is described three different ways** across #97/#100/#102 and the sprint plan.
      Where the beta org's patient signs in on 3 Sep needs to be settled in `HANDOFF.md`.
- [ ] 🟠 **FLAG-225 class-level `api-request` issue** — 48 operations, with the list attached.
- [ ] 🟠 **FLAG-216 → resolved** once #107 lands; I said on that PR I would do it rather than leave
      it to her.
- [ ] 🟠 **`docs/UAT-CHECKLIST-FE.md` was never written**, and the sprint plan still lists it as a
      companion artifact.

### 2026-08-28 — Review pass (5 PRs merged), the dev tier finally live, and I blocked a PR I was wrong about (branches: several, `infra/b1-b3-dev-tier`)

**Goal:** clear the six-PR review queue, then Gate 2. Both happened; the second one turned into B1/B3
actually landing after two weeks of me calling it my most overdue item.

**What I did:**
- **Reviewed all six open PRs and merged five** — #85, #86, #93, #95, #94. Re-ran tsc/tests/build on
  each myself rather than trusting the PR bodies. `develop` ended at **tsc clean · 155/155 · build
  green**. #96 is left with one wording fix.
- **#93 and #95 and #94 each conflicted in `CODEBASE_FLAGS.md`** — unavoidable by ordering, I
  trial-merged three different sequences to confirm. All were purely additive; resolved by keeping
  both sides in flag-number order, re-verifying after each, nothing dropped.
- **B1/B3 done.** `dev.healthclouda.com` is live and proved end to end.
- Raised **FLAG-017** (deployment protection off) and **FLAG-018** (production stale + un-redeployable).

**🔴 What I got wrong, and it blocked another dev for half a day:**

I put CHANGES_REQUESTED on **#94** because its receptionist filters send `?date=`/`?status=`/`?doctor_id=`
and I could not find those params anywhere in the live schema — not in `parameters`, not in the
descriptions. I checked thoroughly and concluded they were invented.

Then I got receptionist credentials working and **measured** it:

```
/receptionist/appointments/?date=1999-01-01   -> 0    (unfiltered: 7)
/receptionist/check-ins/?date=2026-08-27      -> 5
       ...&status=WAITING                     -> 2
/receptionist/check-ins/?status=WAITING       -> 0    (date applies first)
```

They all work. **I made the exact inference my own FLAG-205 correction forbids** — *"absence from the
schema is not evidence of non-support on this backend"* — a sentence I wrote after Qeeyat disproved me
on `?role=`, and then repeated four days later, more confidently because I had the schema open.

The asymmetry I missed: an unverified param fails in *two* directions. I reasoned carefully about
shipping a filter that does nothing, and not at all about dropping one that works — which my suggested
"ship it without the params" would have done, leaving the queue reading 0 while five patients sat on
the 27th. **Retracted, approved, merged, and the retraction is in the PR in full.**

**What I found:**
- 🎯 **The Vercel project had ZERO environment variables.** That is the entire cause of three weeks of
  red checks and "no visual verification in eight merges" — A4's fail-loud guard firing exactly as
  designed. Not anyone's code. I had been carrying it as "needs dashboard access"; it needed one API call.
- **`vercel whoami` fails with a project-scoped token.** Looks like a dead credential, isn't. That is
  what made me report B1/B3 as blocked on access earlier in the day.
- **The seeded check-ins moved from 13 Aug to 27 Aug.** Seed data is not stable — anything hardcoding a
  date is already stale, and "today's queue is empty" is currently the *correct* render.
- **The receptionist account is `reception@demo.test`, not `receptionist@demo.test`.** Cost me twenty
  minutes and a wrong "these credentials are broken" conclusion.
- **Production has not deployed since 13 July, and from `develop`, not `main`** (FLAG-018). The apex
  serves the whole app including a Sign in page, not the marketing-only site the tier map claims.

**Decisions:**
- **Preview-wide env vars, but `beta.` deliberately NOT attached.** Preview-wide fixes every PR preview;
  the cost is that `staging` is also a preview target and would inherit `api-dev`. Holding the domain
  until 31 Aug means the tier-crossing cannot happen through the beta host at all. On 31 Aug the
  `staging` override goes in **first**, domain second.
- **DNS-only rather than proxied** for `dev.`, unlike the apex — Cloudflare's proxy can break Vercel's
  cert challenge and leave a host that looks configured and serves TLS errors. Flip it later if wanted.
- **Disabled deployment protection rather than leaving B5 open**, since password protection needs a paid
  plan. Logged as FLAG-017 with the one-line inverse command, because the same setting governs beta,
  which carries real PHI from 3 Sep.

**Verified:** every merge re-checked by me (tsc/tests/build). `dev.` proved by logging in through the
**deployed** proxy: 200, `role=DOCTOR`, `org_slug=demo-clinic`, cookies `Secure; HttpOnly;
SameSite=strict` with **no `Domain=`** (A3), and **zero `railway.app`** in the deployed chunks (A2).
Live schema re-fetched unauthenticated (200, 391 KB) — @Qeeyat's finding, confirmed.

#### Part 2, same session — P1 cleared down, and four schema lies in one day

**What I did:** fixed and shipped **A5/FLAG-001** (#99), **FLAG-210** (#100, stacked), **A7
SECURITY_BASELINE.md** (#102), **E7/FLAG-005** (#103), **FLAG-220** (#104). Filed backend
[#155](https://github.com/HealthClouda/healthclouda-backend/issues/155) and frontend issue #101.

**🔴 THREE THINGS THAT NEED A HUMAN — carried forward deliberately, do not let these evaporate:**

**1. The schema is a lead, never a verdict. Four mismatches in one day.**
   - `?date=`/`?status=`/`?doctor_id=` on the receptionist endpoints: documented **nowhere**, and they
     **work**. I blocked PR #94 over it and was wrong.
   - `/patients/` documents its entire role matrix **only in a prose description string**.
   - `POST /patients/` documents the *request* serializer as its response; it actually returns
     `{message, patient:{id, healthclouda_id}}`. That is FLAG-216, disproven, and it unblocks the
     HCL-ID handout.
   - `/referrals/received/` is documented as one 28-field object; it returns a **DRF envelope with
     14-field items**.

   **Two of these cost real work and one of them cost another dev half a day.** The rule I wrote after
   Qeeyat disproved me on `?role=` — *absence from the schema is not evidence of non-support* — I then
   broke myself, four days later, with more confidence because I had the schema open. **Types on this
   backend must be CAPTURED, not derived.**

**2. FLAG-203 is, on my reading, the most serious unfixed item in the codebase — and nothing on the
   P1 list ranked above it.** `SmallScreenGate` is CSS-only: below 768px the dashboard still mounts,
   still fetches, and the patient records **land in the DOM** behind a polite notice. On a phone that
   is PHI in the document. It sits in @Qeeyat's range as a P1 and has been open since 13 Aug. I have
   written it into `SECURITY_BASELINE.md` §3 as Tier 1. **Someone needs to decide whether it outranks
   what is left on the board; I think it does.**

**3. One judgement call I want challenged.** The referral action buttons gate by **exclusion**
   (anything not `ACCEPTED`/`DECLINED`/`CANCELLED`/`COMPLETED` is actionable). There is **no status
   enum in the schema** and the seed data only ever showed two values, so naming the pending state
   would be inventing an enum member — the FLAG-004 trap. Inclusion would read tidier and would hide
   the buttons on exactly the rows that need them, silently. Flagged for @Qeeyat in #104.

**Decisions taken today (mine, recorded so nobody re-litigates them):**
- **The apex is marketing + the PATIENT portal, pointing at `api-beta` from 3 Sep; `beta.` is org
  staff only.** This settled FLAG-210 as a slug-less route rather than a backend home-org, and it is
  why backend #155 exists — patient invite emails must reach the apex while staff links reach `beta.`
- **Preview-wide env vars, `beta.` deliberately unattached** until 31 Aug, so the beta host cannot
  serve against the dev backend.
- **FLAG-017: re-enable SSO at beta stand-up, not today** — flipping it now would re-block `dev.` for
  the backend team's UAT.
- **Gate 2 parked**, because FLAG-017 and FLAG-018 must land before a verdict means anything.
- **No self-merging.** I offered it on #97 when the queue got long; @Bastoh declined and was right —
  the reviewer is the only real gate this repo has.

**🚨 The 31 Aug runbook is the riskiest half-hour on this project.** Four ordered steps; wrong order
means either `beta.` serving the dev backend or `dev.` going dark mid-UAT. Written into **FLAG-017**
and the deployment section of `HANDOFF.md`. **It is not in anybody's head — read it, do not improvise.**

**Verified (part 2):** every PR re-run by me — tsc clean, suites green (155 → 159 → 165 → 161 per
branch), builds green. `dev.healthclouda.com` proved end to end: login through the **deployed** proxy
returns 200 with `role=DOCTOR`, cookies `Secure; HttpOnly; SameSite=strict` and **no `Domain=`** (A3),
zero `railway.app` in deployed chunks (A2). Live schema and live payloads re-fetched for every
contract claim above.

**Left undone / next:**
- [ ] 🔴 **Eight PRs queued on @Qeeyat.** ⛓️ **#99 must merge via a MERGE COMMIT, not a squash**, or
      the stacked #100 breaks with phantom conflicts.
- [ ] 🔴 **Mon 31 Aug runbook** — FLAG-017 step order. Invite testers → staging env override →
      attach `beta.` → re-enable SSO → **verify `dev.` still works**.
- [ ] 🔴 **FLAG-018 execution** — apex needs `NEXT_PUBLIC_API_URL=api-beta` and a fresh production
      deploy. It cannot be redeployed today and the live apex is a **13 July** build.
- [ ] 🔴 **@Bastoh: check Vercel team seats.** If Hobby cannot invite members, FLAG-017's chosen path
      collapses into the paid option it was picked over. Our project-scoped token gets 403 on
      `/v2/teams` and cannot check.
- [ ] 🟠 **Revoke the Vercel + Cloudflare tokens** — the work they were minted for is done; they were
      created with a 7-day expiry as a net, not a plan.
- [ ] 🟠 **FLAG-005's third clause** — stat cards still render empty rather than errored. Deferred
      because it means threading a prop through all six dashboards, which is the design lane's active
      surface.
- [ ] 🟠 Gate 2 verdict, once FLAG-017/018 land. **The backend team still needs a signal either way.**
- [ ] `CLAUDE.md` §3 is factually wrong — branch protection **is** enforced (ruleset 11328360, active,
      no bypass actors) and the repo is **public**. Both need correcting, and the public-repo status
      needs confirming as deliberate.

---

**Left undone / next:**
- [ ] 🔴 **GATE 2 verdict is still unwritten** — and it cannot be a clean pass: A5/FLAG-001, A7 and now
      FLAG-018 are open. The descope call needs the backend team, not just me.
- [ ] 🔴 **FLAG-018** — production stale and un-redeployable. New, and it is P1.
- [ ] 🔴 **FLAG-210** patient sign-in, still mine, still blocking D6 and a whole role.
- [ ] 🔴 **A5/FLAG-001** — role gating off the client-writable cookie. Untouched for another week.
- [ ] **B4** — `staging` still holds the April vanilla app; recreate from `develop` before beta.
- [ ] **31 Aug:** `staging` env override, THEN attach `beta.` — in that order (FLAG-017 note).
- [ ] Send @Qeeyat the corrected `reception@demo.test` credentials and the doctor account.
- [ ] **#96** needs one bullet reworded, then it merges.
- [ ] A7 `SECURITY_BASELINE.md` — now has two more flags with nowhere to land.

---

### 2026-08-17/19 — Review week: #76/#77/#78 merged, three flags logged, and two of my own review calls were wrong (branches: docs/flags-013-015, fix/restore-role-filter)

**Goal:** clear Qeeyat's review backlog. Three PRs were open when I started; all three are merged.

**What I did:**
- **Reviewed #77** (token cleanup) → approved. Measured the swap rather than eyeballing it:
  `bg-blue-600` (5.17:1, passing) → `bg-primary` (4.21:1, failing). Grepped before concluding, found
  white-on-`bg-primary` is already app-wide (landing CTAs, auth submit, 404, sidebar badge), so it
  was bringing a stray component **into line** with an inaccessible system rather than introducing a
  failure. Logged as FLAG-014, didn't block.
- **Reviewed #76** (Superadmin) → CHANGES_REQUESTED on two: Edit Organisation silently destroyed the
  stored address (prefilled from a list row that carries neither `address` nor `country_code`, then
  **PUT** — a full replace), and both search inputs had no accessible name. Verified every contract
  claim in the PR against the live schema myself; all held.
- **Reviewed #78** (Org Admin) → CHANGES_REQUESTED, then approved after her round 2.
- **Merged #76** (merge commit, per the stacking rule) over a **failing Vercel check** — confirmed
  first that the failure is our own A4 guard throwing on unset `NEXT_PUBLIC_API_URL`, i.e. **my**
  outstanding B1/B3, not her code.
- **Reviewed #80** (approved) and **#81** (her session log — CHANGES_REQUESTED on one factual point).
- **PR #79** — FLAG-013/014/015 written up. **PR #82** — this branch: restores the `?role=` filter and
  corrects the `usePaginatedList` doc comment.

**What I got wrong — worth recording, because both were caught by review, not by me:**
1. **I reviewed #76 and #77 against a stale local `develop`,** four commits behind, because I fetched
   two feature branches by name instead of fetching everything. Consequences: I told Qeeyat she was
   owed credentials that PR #74 had recorded as delivered on 13 Aug, and I nearly issued a FLAG-012
   that already existed. Renumbering after that is what caused the 013/014 collision below.
   **Lesson: `git fetch --prune` at session start, before reading anything.**
2. **I recommended a fix that doesn't work.** I told her to copy `useEffect(() => setPage(1), [search])`
   from #76 to fix pagination-on-filter. She wrote the test first and it caught the effect running
   *after* the render that had already requested the stale page — a narrower race, not a fix. She
   moved the reset into `usePaginatedList` during render instead. I'd recommended a pattern that was
   already in the codebase without checking that it held.
3. **FLAG-015's target-size claim was false.** I asserted the row buttons were "~22px, under the 24px
   minimum" — measured off the content box. Border box is 27.25px (11.5 × 1.5 line-height + 8 padding
   + 2 border) and clears WCAG 2.5.8. She recomputed it. Retracted in place, contrast half kept.
4. **FLAG-013's prescribed fix was worse than the bug.** I wrote "derive page size from
   `results.length`" — on a partial last page, 57 records at 20/page gives page 3 = 17 rows and
   `ceil(57/17)` = 4 phantom pages. She caught it. Now prescribes `next`/`previous`.

**What I found:**
- **`?page_size=` is ignored** on `/org/`, `/auth/users/`, `/audit/logs/` — raised by me, **settled by
  her measurement**. Real page size is 20, which is exactly what `usePaginatedList` hardcodes, so it's
  correct *by coincidence, not contract*. The trap that hid it since July: **the `next` URL echoes
  `page_size` back while ignoring it.**
- **FLAG-205 is half wrong** (her finding): `?role=` on `/auth/users/` works despite being
  undocumented, so #76 dropped a working dropdown — under my approval. The generalisation is the
  keeper and belongs next to the invented-param rule: **absence from the schema is not evidence of
  non-support on this backend.** Schema absence justifies verifying, never concluding.
- **`HANDOFF.md` PR #68 line misled a review.** "Cleared on merge: FLAG-011 token contrast — PR #68"
  reads as though the contrast bug was fixed; #68 was docs-only and merely logged it. It misled her
  too. Corrected, with a standing note that "cleared on merge" refers to the **In Flight row**.

**Decisions:**
- **Flag numbers follow who *raised* them; `Owner:` says who fixes them.** FLAG-013/014/015 sit in my
  range but are owned by @Qeeyat. Taking numbers from her range would have collided with the 205–209
  she was adding in open PRs.
- **Swapped 013/014 rather than editing merged source.** Three merged comments cite FLAG-013 for
  `page_size`; changing the unmerged docs was cheaper than changing merged code. Her rule is sharper
  than the one I'd written: *an unmerged PR reserves flag numbers, but so does a review comment.*
- **Restored the `?role=` dropdown on her evidence, not mine.** I have no `api-dev` credentials in
  this environment, so I could not re-run her measurement. The tests here prove only that we *send*
  the param; that it's *honoured* rests on her live check. Said so in the PR rather than implying I
  verified it.

**Verified:** every review re-ran the three commands myself rather than trusting the PR body —
#76 97/97 then 103/103, #77 88/88, #78 91/91 then 108/108, all with tsc clean and build green. Live
schema re-fetched from `api-dev` and used to check `OrganizationList` / `OrganizationOrgAdminRequest`
/ `UserCreateRequest` / `RoleEnum` / every `org-admin` path. On this branch: 4 new tests confirmed
**RED before the fix**, then green.

**Left undone / next:**
- [ ] 🔴 **B1/B3 — Vercel domains + per-env vars. Mine, and now the oldest blocker on the board.**
  Preview deploys have failed since #65; **four PRs have merged with no visual verification of a
  running dashboard**, which Qeeyat correctly calls the oldest unpaid debt. Needs dashboard access.
- [ ] 🔴 **A5/FLAG-001** — role gating off the client-writable cookie. This was Mon 17's row and has
  not been started; the whole week went to review.
- [ ] **FLAG-013 proper fix** — stop sending the ignored param, derive page count from
  `next`/`previous`. Repo-wide, its own PR.
- [ ] Superadmin invite dropdown is capped at 20 orgs — can't invite into the 21st.
- [ ] **A7 `SECURITY_BASELINE.md`** — still unwritten, and FLAG-203 has nowhere to land.
- [ ] Migrate `SuperadminDashboard`'s inline `Field`/`inputClass`/`SearchInput` onto the shared
  `ui/` versions #78 introduced.

---

### 2026-08-13 — Review day: #69/#71/#73 reviewed + merged, api-dev seeding verified, doc debt paid (branches: docs/handoff-seeded-contract-notes, docs/creds-handover, docs/session-log-bastoh-2026-08-13)

**Goal:** started as a review of PR #69; became a review-and-unblock day. **No application code
changed by me this session** — all five PRs I touched were docs, design source, or Qeeyat's.

**Reviews (all four verified by re-running the three commands myself, never from the PR body):**
- **#69 D1 overlays — CHANGES_REQUESTED, then APPROVED.** Round 1 found a real regression she'd
  introduced: white toast text on solid `success`/`warning` fills measured **3.30:1 / 3.19:1**
  against AA's 4.5. Distinct from FLAG-011 — there the failing values came from the design README,
  so the fault was upstream; here the README specifies no hex and no white text, so the pairing was
  an implementation choice and correctly a change request. Also: `Modal` had silently lost its close
  button when `footer` became optional, and `SmallScreenGate` turned out to be **CSS-only** — the
  dashboard still mounts, still fetches, and the PHI still lands in the DOM below 768px. Round 2
  verified her fixes at **5.02:1 / 5.18:1** and approved with two fold-ins.
- **#70, #71, #73 reviewed and merged.** #73's claims I checked individually rather than trusting
  the summary: 24 em dashes remain across the six design files and **all 24 are the `'—'`
  empty-value placeholder** — correctly untouched.

**What I found:**
- 🎯 **The Vercel preview builds have been failing since #65 merged, and it is mine.** The red check
  on #69 was **not her code**: `NEXT_PUBLIC_API_URL` is unset on Vercel, so A4's fail-loud config
  throws at build time exactly as designed. Reproduced locally with the var removed. **This means
  her visual verification was never only blocked on credentials — there was no preview URL either.**
  Two PRs went through review unverified visually because of B1/B3 sitting undone.
- ❗ **I told Claude I had working `api-dev` credentials and a real org slug. That was wrong.** The
  backend checked the database directly: 112 migrations, **zero rows**. No credential could have
  worked. Probing `/org/by-slug/demo-clinic/` before sending anything caught it — the 5 July
  HANDOFF line ("dev tier is NOT seeded") was the accurate one and the sprint plan's "real seeded
  data" was aspirational. **Lesson worth keeping: probe before handing someone credentials**, or
  they verify against empty dashboards and call it verified.
- `api-dev` is now seeded and I verified it **through the proxy path**, not by report: both orgs
  200, staff-on-general-portal **400** (not 401) carrying `redirect_url`, org login 200. Login's
  `user` object has no organization/duty fields — but `api/auth/login/route.ts:96-117` already
  enriches from `/auth/me/`, so **no code change was needed**.
- **FLAG-010 reproduced live** — `redirect_to` came back `/doctor/`, confirming the dropped org slug
  in the deployed build rather than only in their source.
- **`CLAUDE.md` §4 required reading two files that have never existed** (`TARGET_ARCHITECTURE_CHECKLIST.md`,
  `BETA_READINESS.md`), so every session since the file was written has silently skipped two steps.
- **`HANDOFF.md` still held all 15 migrated session-log entries** — the 2026-08-09 restructure copied
  them into this file but never deleted the originals, so two copies drifted for four days in a file
  whose own header says "no session narrative". Removed (603 lines). They are **condensed, not
  verbatim** copies: substance survives, granular detail doesn't. Original text is at
  `25f3189:HANDOFF.md`.

**Decisions:**
- **Did not fold the toast-stack finding into my own FLAG range.** It was my finding, but Qeeyat was
  already in `CODEBASE_FLAGS.md` and ranges follow the person, not the finding — so it went to her
  as FLAG-204, consistent with FLAG-201/202/203 which were also my findings in her range.
- **Approved #69 rather than demanding a third round** for a one-line CSS fix the day before a hard
  checkpoint. Bad economics, and nothing in it was unsafe to merge.
- **FLAG-012 raised rather than fixed** — PR #73's punctuation convention exists in one place while
  the shipped landing page still contradicts it. Review discipline: a decision that was made but not
  written down is invisible to the other agent.

**Mistakes I made, for the record:** wrote the seeding contract note as though Qeeyat already had
the credentials when she didn't (caught before commit — the cell now says so plainly); corrupted
`HANDOFF.md` with a PowerShell `Get-Content`/`Set-Content` round-trip that double-encoded every em
dash and emoji (reverted, redone with .NET UTF-8 I/O — **PowerShell console output is unreliable for
judging encoding in both directions; check via `git diff`**); and pushed a commit onto the
already-merged `docs/handoff-seeded-contract-notes` branch, resurrecting it after auto-delete
(deleted via the API, work moved to a clean branch).

**Verified:** `npx tsc --noEmit` clean · `npm test` **88/88** · `npm run build` green — run on the
#69 branch, on the docs branch, and again before this PR.

**Left undone / next:**
- [ ] 🎯 **B1/B3 — Vercel domains + per-env vars. Now three things at once:** the A1/E5 hard gate,
  the reason every preview build fails, and the reason the T5 harness has no URL to screenshot.
  Still needs dashboard access. **The single most overdue item on my list.**
- [ ] **PR #74 open** — clears my stale In Flight row (#72 merged without clearing it) and flips the
  credentials cell. Needs Qeeyat.
- [ ] **Fri 14: FLAG-003 re-verification against live Swagger** — blocked since 8 Aug by the dead
  host, now genuinely possible and due **ahead of E2/E3**, since a design PR built on the wrong
  shape is a rewrite.
- [ ] **E1/FLAG-004 ownership is contradictory** — the sprint plan's E-table marks it "🎓 Qeeyat's
  first PR", the Fri 14 infra row assigns it to me. Settle before either of us cuts a branch.
- [ ] **The D1 checkpoint call (Fri 14).** Shell + overlays both merged; Superadmin pages and the T5
  harness outstanding. My read: not a takeover situation.
- [ ] C2 Cloudflare spike not started — Thu 13's row. Slips to the Sat 15 float; Gate 1 is 21 Aug.

---

### 2026-08-12 — In Flight table + Tier-1 infra batch A2/A3/A4/A6 (branch: fix/tier1-infra-batch)

**Goal:** clear the infra lane's Mon 10 + Tue 11 backlog before Friday's D1 checkpoint, and finally
put the 🚧 In Flight table into `HANDOFF.md`.

**What I found first (checked the code, not the docs):** every infra item from Mon 10 and Tue 11 was
still open — A2, A3, A4 and A6 were all untouched in source. Only docs had been committed since the
sprint plan landed. Worth knowing that the plan's own status column was ahead of reality.

**What I did:**
- **🚧 In Flight table + 📡 Backend Contract Notes banner** added to the top of `HANDOFF.md`. This
  was sprint item F and had never existed, despite `CLAUDE.md` treating it as the collision-avoidance
  mechanism. Pushed as its own commit *first* so Qeeyat's agent could see the claim before any code
  landed. Claimed my batch; recorded her D1 row as unclaimed-but-in-progress for her to fill in.
- **A2 — stale host purge.** `next.config.ts` CSP `connect-src` is now `'self'` only, with a comment
  explaining it should never name a backend origin at all (the browser only ever calls our
  same-origin proxies, and the value would be wrong per-tier anyway). `.env.example` rewritten around
  the per-tier map; `layout.tsx` `metadataBase` reads `NEXT_PUBLIC_SITE_URL`;
  `design_handoff_prelogin/README.md` docs URL updated.
- **A3 — cookie-domain footgun deleted.** The commented `COOKIE_DOMAIN=.healthclouda.ng` is gone,
  replaced by an explicit "do not set this, and here's why" block. A dot-prefixed parent shares the
  session cookie across every subdomain, so a dev JWT would be sent to beta and production. It was
  never read in code — the risk was purely that it read as a knob someone should turn.
- **A4 — fail loudly on missing config.** New exported `resolveApiBaseUrl(configured, nodeEnv)` in
  `config.ts`; throws outside development/test instead of falling back to `localhost:8000`.
  ⚠️ **Design note for whoever touches this next:** it takes plain arguments rather than reading
  `process.env` internally, because Next only inlines `process.env.NEXT_PUBLIC_*` where it appears
  as a *literal*. Passing the env object into a function would compile fine and silently break the
  client bundle. The literal read stays at module scope.
- **A6 — org-admin consent bypass removed.** Deleted the `ORG_ADMIN_ACCESS_REVIEW` endpoint
  constant, the Approve/Deny buttons, the Actions column and the confirm dialog from
  `OrgAdminDashboard`. The list stays read-only with a line of copy saying why. The endpoint 404s
  today, so this wasn't *working* — but the UI still presented the decision as an admin's to make,
  which is exactly the model the backend deleted for security. A broken control is not a safe one.

**Decisions:**
- **Docs that say "backend deploys to Railway" were left alone.** Only the dead *URL* is purged. The
  host was removed from `ALLOWED_HOSTS` because it bypassed Cloudflare — that strongly implies
  Railway is still the origin, now fronted properly. I have not verified the platform, so I did not
  assert a change to it. `ARCHITECTURE.md` likewise untouched: it is stale wholesale (ARCH-7) and
  patching one line would make it look maintained.
- **FLAG-002 marked PARTIALLY FIXED, not closed.** The codebase half is done; the Vercel env vars
  and a verified request from a deployed build (B1/B3) are not. Closing it would have been a lie.
- **Dropped one of my own tests.** I wrote "never issues a write to /review/" and it passed *before*
  the fix — nothing in it clicks anything, so it was trivially true. Replaced with an assertion that
  the pending row contains no interactive element at all. Left the reasoning in a comment because
  it's an easy trap to re-introduce.
- Left `TOKEN_KEYS` / `SESSION_TIMEOUT_MS` in place — that's FLAG-008 and needs its idle-timeout
  decision recorded, not a silent deletion riding along in an unrelated PR.

**Verified:** 16 new tests, all confirmed RED against pre-fix code first (11 red on the first run;
the 12th revealed the trivial-pass problem above and was rewritten). `npx tsc --noEmit` clean ·
`npm test` **79/79** (was 63) · `npm run build` green. Two extra proofs beyond the standard three:
- **A4 proven by building with the var unset** → build aborts with our error message and produces no
  artifact. This is the sprint plan's stated tier check ("building with `NEXT_PUBLIC_API_URL` unset
  fails loudly, no localhost fallback").
- **`grep -ril railway .next/` → 0 hits**, the plan's other tier check, now true at the source too.

**Later the same day — PR #65 merged (Qeeyat reviewed), then A8 filed:**
- **Backend issue [#107](https://github.com/HealthClouda/healthclouda-backend/issues/107) filed**
  (`api-request` — I had to **create that label**, it didn't exist on the backend repo despite
  `CLAUDE.md` mandating it).
- **Read their code before writing the ask**, which changed it substantially. `FRONTEND_URL` is
  already env-driven (`settings/base.py:338`) with no override in `dev.py`/`staging.py`/`prod.py`,
  so tiering needs **no code change from them** — just the env var per deployment. Much smaller ask
  than the sprint plan assumed. But two things are *worse* than assumed: the default is
  `http://localhost:3000` (an unset tier emails patients links to their own machine — our A4 failure
  mode, except it reaches patients by email), and `patients/receptionist_views.py:287` carries a
  **second** hardcoded localhost default on the consent link, the worst-case flow. Also verified
  every path they build matches a real route of ours, so only the host is at risk — put that table
  in the issue so they don't have to ask.
- **FLAG-010 raised** for a separate find: `_get_redirect_url` (`accounts/views.py:217`) takes
  `org_slug` and ignores it, so login's `redirect_to` is `/doctor/` rather than `/<slug>/doctor`.
  Zero impact — we consume `redirect_url` from the 400 response, not this — which is precisely why
  it's worth logging. Kept **out** of #107 on purpose: different concern, and #107 is time-critical.

**Reviewed PR #67 (Qeeyat, DASH-1 shared shell) — CHANGES_REQUESTED:**
- **Good work structurally**, and worth saying so: `DataTable` *composes* `ErrorState`/`EmptyState`/
  `Pagination` instead of reimplementing them, which keeps PR 2's UX-ERR-1/PERF-1 fixes from being
  forked six ways across DASH-2…6. `NavItem` stayed backward compatible, she rebased rather than
  merging `develop` in, and she cleared my merged In Flight row unprompted.
- **Three change requests:** (1) status badges collapsed `NO_SHOW`/`MAINTENANCE`/`OCCUPIED`/
  `SUSPENDED` into the same token as `PENDING`/`AWAITING` — suspended and pending now look identical
  in a list, which is a clinical-scanning regression, not styling; (2) sign-out became an unlabelled
  ~28px icon with `title`/`aria-label` disagreeing, and the header dropped the identity block — on
  shared clinic machines with PHI arriving, sign-out discoverability is a control, not a preference;
  (3) `DataTable` has five render branches and zero tests, and is the component all five remaining
  dashboard PRs sit on.
- **Contrast logged as FLAG-011 instead of requested as a change** — the failing tokens come from
  `design_handoff_dashboards/README.md`, so she implemented the spec faithfully. Measured, not
  eyeballed: `nav-muted` **1.68:1**, `placeholder` **1.93:1**, badges **2.86–4.24:1**, all against
  AA's 4.5:1 (11px bold does not qualify as "large text"). Same class as the 2:1 favicon inherited
  from a design file in July. Fix belongs at the token level, once, before six dashboards inherit it.

**Left undone / next:**
- [ ] ❗ **api-dev demo credentials are owed to Qeeyat — by me.** `CLAUDE.md` §7 puts this on the
  existing team. It's why #67 has no visual verification and it blocks the T5 screenshot harness due
  at Friday's checkpoint. Committed to it in the review.
- [ ] 🎯 **B1/B3 — Vercel domains + per-env vars. Today's actual scheduled row, still not done.**
  Needs dashboard access; I can't do it from here. `dev.healthclouda.com → api-dev` has NOT happened.
- [ ] ⚠️ **`NEXT_PUBLIC_SITE_URL` is new and unset in Vercel.** Until B3, deployed builds fall back
  to the apex in OpenGraph/canonical URLs — cosmetic, but wrong on dev/beta shares.
- [ ] Fri 14: C2 Cloudflare spike writeup, E1 (FLAG-004), and the 🔴 D1 checkpoint.

---

### 2026-08-09 — Multi-dev doc discipline: onboarding set + flags (branch: develop, uncommitted)

**Goal:** bring this repo up to the same doc discipline as `healthclouda-backend`, so two devs each
driving their own Claude can work it without the agents seeing each other's memory. Docs/process
only — **no application code changed this session.**

**Context:** @Qeeyat is joining the frontend (@Ericmoore207 is backend). The doc set has to work for
her *and* for any dev onboarded later, so nothing is written to one person.

**Read-only codebase survey first (reported before writing any docs):**
- Next.js `^15.3.3` App Router, React 19, TS 5, Tailwind v4 via `@theme inline` (no
  `tailwind.config.js`), Zustand used for **toasts only** — no global store for domain data.
- Data layer is three clean tiers: `serverFetch` (SSR), `publicFetch` (unauth SSR), `client-api.ts`
  (browser). **The browser never calls DRF directly** — everything goes through `/api/data` and
  `/api/action`, which attach the JWT server-side. Tokens in httpOnly cookies.
- Single env var (`NEXT_PUBLIC_API_URL`); only 2 `process.env` reads in all of `src/`.
- Baseline verified green: `tsc --noEmit` clean, **vitest 63/63**.

**What I found — raised as FLAG-001…009 in the new `CODEBASE_FLAGS.md`:**
- **FLAG-001 (P1, security):** `hc_user` is `httpOnly:false` **and** is what every dashboard role
  gate + middleware reads. A user can edit `document.cookie` to `role:"DOCTOR"` + any
  `organization_slug` and load another org's dashboard shell. Data stays safe (DRF enforces
  server-side, they'd get 403s into an empty skeleton) — but it's a client-trusted authorization
  decision, which stops being theoretical when PHI lands.
- **FLAG-002/003 (P1):** the backend URL changed; the old Railway URL is still hardcoded in
  `next.config.ts` (CSP `connect-src`) and `.env.example`. Blocked me from re-fetching the live
  schema, so **every contract claim in our docs is still July-sourced, not verified today.**
- **FLAG-004 (P2):** `DoctorDashboard.tsx:56/58` still send `?today=true` (silently ignored) and
  `?status=OPEN` (enum is `ACTIVE` → always 0 rows). Logged as GLOBAL-2 in July, never fixed.
- **FLAG-005…009:** `serverFetch` swallows all errors as `null`; **no ESLint config exists at all**
  (so `npm run lint` has never run) and **no `.github/` directory** (no CI); login rate limiter is
  in-memory (per-lambda on Vercel, ~decorative); `TOKEN_KEYS`/`SESSION_TIMEOUT_MS` are dead
  constants implying an idle timeout that isn't implemented; `API-doc.md` is gitignored, which
  contradicts our own "live schema is the seam" rule since other agents can't see it.
- Worth noting: **the paged-envelope worry was largely already handled** — every list site uses
  `?.results ?? []` and `usePaginatedList` tolerates both shapes. Remaining exposure is *typing*
  (hedged `Ward[] | Paginated<Ward>` unions nobody has confirmed), not crashes.

**What I created:**
- **`ONBOARDING.md`** — generic new-dev orientation, explicitly addressed to the dev **and their AI
  agent**. Domain glossary (org slug, HCL-ID, episode vs admission, access request = *patient*
  consent), day-one setup, the 5 architectural facts, working agreements, repo map, first-week path,
  first-PR checklist. Carries a standing rule that stale content gets fixed in the same PR that
  made it stale.
- **`CLAUDE.md`** — rewritten as the shared brain: project context, contract seam, North Star,
  Team & Multi-Dev Workflow, the session ritual, codebase working rules, review discipline, and a
  generic "Onboarding a New Dev" process section. Session-start now *requires* reading
  `ONBOARDING.md` when the dev is new; session-end requires updating it when stale.
- **`CODEBASE_FLAGS.md`** — FLAG-001…009 with severity, file:line, honest impact, and a verifiable
  "Done when". Ranges: @Bastoh 001–199, @Qeeyat 200–399, 400+ unallocated.
- **`HANDOFF-Qeeyat.md`** — pre-seeded so she never faces a blank file.
- **`HANDOFF-Bastoh.md`** — this file; migrated the 15 historical entries out of `HANDOFF.md`.

**Decisions:**
- Onboarding lives in its own `ONBOARDING.md`, with `CLAUDE.md` holding only the *process* and
  pointing at it — avoids duplicating content between the two.
- Per-dev logs are `HANDOFF-Bastoh.md` / `HANDOFF-Qeeyat.md`. The original spec said
  `HANDOFF-Ericmoore207.md`, but Eric is backend — frontend is Bastoh + Qeeyat.
- **`TARGET_ARCHITECTURE_CHECKLIST.md` deliberately NOT written yet** — we don't have an agreed
  target architecture, and inventing one would have put fiction into a doc other agents treat as
  binding. Needs a design conversation first.
- **Target-architecture framing DROPPED in favour of `SECURITY_BASELINE.md`** (decided end of
  session). Bastoh's actual concern is not architectural elegance — it's that the frontend ends up
  weak on security while the backend is solid, with PHI arriving. "Target architecture" is too
  abstract to act on and he can't review it. A PHI security baseline is concrete, checkable, and
  will *drive* `BETA_READINESS.md` Tier 1 instead of us inventing tiers.
- **Diagram scope cut.** A full C4-style multi-page draw.io set (as in the backend repo) is
  over-built for this frontend — folder structure is self-evident and UI diagrams rot fast. Agreed
  instead on **two diagrams that earn their place, both security artifacts**: (1) token & session
  lifecycle (login → httpOnly cookies → proxy → 401 → single-flight refresh → rotation → logout),
  (2) trust boundaries + PHI flow (user's machine / our server / Django). Still generated from an
  idempotent script.
- **Bastoh is not a frontend dev** and has asked to be taught as we go. Practical consequence:
  explain the *why* and the tradeoff, never assume frontend knowledge, and **surface risks he can't
  be expected to spot — his silence is not approval.**

**Verified:** PR #62 (design PR D) merged into `develop` as merge commit `742f494`; remote branch
auto-deleted; local `develop` fast-forwarded; merged local branch pruned. All four design PRs
(A–D) are now in. Working tree clean apart from this session's docs.

**START HERE NEXT SESSION → write `SECURITY_BASELINE.md`.** Scope agreed with Bastoh:

1. **The framing that makes the rest make sense:** the frontend runs on the user's machine, so it
   can never *enforce* security — the backend is the lock, the frontend is a sign on a door.
   Consequence: a frontend auth bug is a cosmetic bypass, not a data breach, **provided the backend
   really enforces.** ⚠️ That assumption is currently *inferred from July audit notes, not tested* —
   verify it (nurse token → doctor-only endpoint → expect 403) before relying on it. If it's ever
   false, FLAG-001 stops being cosmetic.
2. **Credential handling** — already strong (httpOnly cookies + server-side proxy; JS cannot read
   tokens). Document *why* so nobody "simplifies" it later.
3. **How the frontend sends and receives data** *(Bastoh's addition, end of session)* — the
   `/api/data` + `/api/action` proxy contract: what may travel in a URL vs a body (patient IDs and
   HCL-IDs in query strings leak into browser history, server logs and `Referer` headers), cache
   headers on PHI responses, error/response shapes, and what a future error tracker (e.g. Sentry)
   would ship to a third party by default.
4. **PHI leakage channels** — browser cache/bfcache (Back button after logout), URL history,
   third-party scripts, screenshots/printing.
5. **Shared-device session hygiene** — likely the highest *practical* risk given Nigerian clinic
   reality: no idle timeout exists (FLAG-008) and the refresh cookie lasts **7 days**, so a
   walked-away machine stays usable for a week.
6. **Supply chain / CSP** — every npm dep runs with full DOM access; CSP currently allows
   `unsafe-inline` + `unsafe-eval`, weakening the main browser-level XSS defence.
7. **Consent correctness** — genuinely frontend-owned. The access-request screen currently asks
   patients to approve access **without showing the reason** (Reason/Requested rows dormant pending
   backend #71). Not a crash; for a consent mechanism it's a substantive gap.

Write it in plain language — Bastoh must be able to judge each item without frontend knowledge.
Each item: why it matters, who owns it, verifiable "done when". It then drives `BETA_READINESS.md`
Tier 1. Estimate to close the gaps: likely days, not weeks — the hard architectural parts are
already right.

**Also left undone:**
- [ ] Restructure `HANDOFF.md` → durable state only (+ 🚧 In Flight table + BACKEND CONTRACT NOTES
  banner). It still contains the narrative duplicated here.
- [ ] `ARCHITECTURE.md` full rewrite — still describes the Vanilla JS app deleted in July (100% fiction).
- [ ] `BETA_READINESS.md`; `TARGET_ARCHITECTURE_CHECKLIST.md` after the target-arch conversation.
- [ ] Task 4: `docs/frontend-design.drawio` via an idempotent Python generator. **Note:** a partial
  hand-made file already exists (2 pages: App Shell & Routing – target, Auth & Session – target),
  with no generator script — it should be superseded by generated output.
- [ ] **Blocking input needed:** the new backend base URL, and the real beta dates.
- [ ] Commit all of this on a `docs/*` branch — currently uncommitted on `develop`.
- [ ] ⚠️ The session-start ritual in `CLAUDE.md` currently points at three files that don't exist
  yet. Finish them before Qeeyat clones, or her agent will silently skip steps.

---

### 2026-07-17 — Design PR D: set-password + access-request respond + 404 (branch: feat/design-utility-screens)

**Context:** PR C (#61) merged (Qeeyat approved, no comments); local repo synced, merged branches
pruned. `API-doc.md` refreshed from the live schema (7361 lines) before any code, per last session's
TODO — the refresh surfaced everything PR D needed.

**Contract verifications (probed prod + seeded local Docker backend @ backend develop 4356140):**
- **Backend #66 SHIPPED** (their #67): validate response now carries `organization_name` +
  `organization_logo`, both **nullable** — null means "render HealthClouda branding". Verified live:
  `{valid, email, first_name, last_name, role, organization_name, organization_logo}`.
- **NEW endpoint `POST /auth/setup-password/resend/`** (their #68): public self-service re-request
  from an expired invite link; body `{token}` or `{email}`; **always a generic 200** (anti-enumeration).
- **Respond flow is GET + POST** (their FLAG-241): GET `?token=` is read-only
  `{organization, patient_name, status: PENDING|APPROVED|DENIED, expired}`; POST
  `{token, action: accept|deny}` performs the decision. ⚠️ Gotcha: "already approved/denied" 400s
  use a **`message` key, not `error`** — so the UI derives state from the GET (re-fetches after a
  rejected POST) instead of parsing POST bodies.
- **GET respond is missing `reason` + `requested_at`** (design's info block wants Organization /
  Reason / Requested rows) → **backend #71 filed** (additive ask). UI renders those rows
  conditionally, so they light up automatically when #71 ships.

**PR D `feat/design-utility-screens`** (→ develop, reviewer Qeeyat):
- **`/set-password` rebuilt to design screen 7** (new `SetPasswordForm`, page is a thin wrapper +
  noindex): welcome header "Welcome, **{name}**" (blue) + "Your account at **{Org}** as **{Role}**"
  (org phrase omitted when null), readonly email field, shared strength/requirements UI from PR B,
  submit disabled until valid → redirect `/signin`. Error state per design (red circle-x, new
  AuthCard `danger` icon variant) + **"Request a new link" resend button** on the expired state
  (Bastoh's heads-up on #66). `organization_logo` deliberately unused — design keeps HC chrome
  (README decision 3); logo has no slot on this screen.
- **`/access-request/respond` built** (design screens 9–10, `AccessRequestRespond` + noindex page):
  10-state machine — loading / invalid / pending / submitting / approved / denied / already-approved /
  already-denied / expired / connection-error (with retry). `action=accept|deny` URL param
  auto-submits once (per design README; POST-only mutation preserved). ⚠️ **Known design deviation:**
  info block adds a **Patient** row (patient_name is in the API; confirms whose records before
  consenting) — strike in review if unwanted. Reason/Requested rows ship dormant until backend #71.
- **404** — `src/app/not-found.tsx` per design screen 8 (brand nav, 110px "404", Back to Home);
  fires for unknown org slugs too (all `[slug]` pages already call `notFound()`).
- Plumbing: `SETUP_PW_RESEND` endpoint const; proxy routes `/api/auth/setup-password/resend` +
  `/api/access-request/respond` (GET+POST); `SetupTokenInfo` + `AccessRequestInfo` types.
- Verified: tsc clean, vitest **63/63** (13 new: respond state machine incl. re-GET-after-rejected-POST
  + auto-submit; set-password token states incl. resend), `next build` green, and **30/30 live checks**
  driven with Playwright against the seeded local backend — including a REAL end-to-end invite
  (org-admin `POST /org-admin/staff/` → token from DB → welcome screen → password set → **login 200
  with the new password**), expired-invite resend, approve + auto-deny + all outcome/edge cards,
  404 status code 404. Screenshots in scratchpad. DB reset to seed state after (one throwaway
  invitee `invitee.prd@demo.test` remains in the local DB, password `Ngz#Pass1`).

**Pending / TODOs (historical):**
- [ ] Qeeyat: review PR D.
- [ ] Wire announcements cards when backend #69 ships; render Reason/Requested rows live when #71 ships.
- [ ] Then per the 2026-07-11 schedule: PR 5/6/doctor + write workflows. Bug list still owed by Bastoh.
- [ ] ARCH-7: ARCHITECTURE.md rewrite still pending (still describes the purged vanilla app).

---

### 2026-07-13 (later) — Design PR C: org landing rebuilt to the design (branch: feat/design-org-landing)

**Context:** Same session as the brand-asset PR below. PR C scoped against the design + live contracts
before building. Was briefly stacked on `fix/brand-assets` (needs its `.webp` + purged `public/`), but
Qeeyat merged #60 (with a merge commit ✓) before PR C went up → targets `develop` directly.

**Contract verifications (probed prod AND seeded local Docker backend):**
- **Announcements endpoint does NOT exist** (404 text/html on both, vs json 404 for by-slug with an
  unknown slug — i.e. route missing, not empty DB). Our `ORG_ANNOUNCEMENTS` constant was invented
  (GLOBAL-2 pattern) → removed. **Backend #69 filed** (public GET + expected shape). Page ships the
  design's empty state; wire cards when #69 lands.
- **`GET /org/by-slug/` is much richer than its stale schema docstring** — Bastoh was right that the
  fields exist: real response has `clinic_name/address/hours/phone/email`, `emergency_phone`,
  `city/state/country_name`, `page_title`, and **`logo_url` (NOT `logo`)**; **no `id`/`is_active`**.
  Backend #70 filed then corrected + closed (only stale-docstring note remains).
- **Two latent bugs fixed on the back of that:** `Organization` type rewritten to the real shape;
  all 5 org auth pages passed `org.logo` (always `undefined` — org logos NEVER rendered) → now
  `logo_url`; old landing's `is_active` check would 404 every org (field absent) → removed.
- `POST /org/<slug>/contact/` verified (public, `{name,email,phone,message}` all required).

**PR C `feat/design-org-landing`** (→ develop via stack, reviewer Qeeyat):
- `/[slug]` page fully rebuilt per design: fixed 70px nav ("Sign In to Portal" → org signin), dual-logo
  hero (HC mark × org logo, initial-tile fallback; org name blue in H1), announcements section (empty
  state w/ stroke-SVG icon — README decision 5, no emoji), wellbeing carousel, contact section
  (info column renders clinic fields when non-null + "Trouble signing in?" + emergency line block;
  form card posts via new `/api/contact/[slug]` proxy), 3-col dark footer (LinkedIn/X).
- `WellbeingCarousel` rebuilt to spec: 300px cards, design's final copy, rAF auto-scroll 0.7px/frame,
  pause-on-hover, seamless doubled loop. **Design's arrow buttons dropped (Bastoh, mid-session).**
- **`noindex` on ALL org routes** via new `src/app/[slug]/layout.tsx` (robots noindex,nofollow) —
  README decision 1. Verified: org landing + org signin carry the meta, general landing does not.
- Verified: tsc clean, vitest 50/50, `next build` green, and driven live against the seeded local
  backend — real org data rendered, carousel transform advances (no arrows), contact form submit
  → **DRF 201** + success state, screenshots of hero/sections/full page.

**Pending / TODOs (historical):**
- [ ] Qeeyat: merge #60 (merge commit!) → then PR C (check base retargeted to develop).
- [ ] Wire announcements cards when backend #69 ships.
- [ ] **PR D** — set-password (org name/logo from #66) + access-request respond (`accept`|`deny`) + 404.
  Refresh local `API-doc.md` first (now double-stale: respond POST + by-slug shape).

---

### 2026-07-13 — Brand-asset fixes: favicon, logo sizing, image weight + old-app purge (branch: fix/brand-assets)

**Context:** PR B (#59) merged; Bastoh deployed `develop` to Vercel manually (free plan) and flagged
two landing-page issues: distorted/oversized favicon and a too-small nav logo. Root cause of BOTH:
`HealthClouda-icon-tight.png` is **341×171 (2:1)** but was used in square slots — browsers squash a
non-square favicon into the tab square, and a 34×34 `object-contain` box shrinks the mark to 17px
tall. The design file itself specified 34×34, so the bug was inherited from the design.

**PR `fix/brand-assets`** (→ develop, reviewer Qeeyat):
- **Favicon:** proper square icons generated with sharp (mark trimmed, centered, 8% padding) →
  `src/app/icon.png` (512², transparent, 8 KB) + `src/app/apple-icon.png` (180², white plate for
  iOS) via App Router file conventions; `metadata.icons` block removed from `layout.tsx`.
- **Logo mark at natural 2:1 aspect** everywhere it was squared: landing nav 34×34→56×28, hero
  portal mock 26×26→44×22, footer 30×30→56×28, AuthCard 24×24→48×24 (was visually OK via
  `h-6 w-auto`, srcset size fixed).
- **Asset diet** (sharp pipeline, script in scratchpad — not committed):
  `Backgroud_flare.png` 1.5 MB → **301 KB WebP** (1080w, q60 — blurred decoration; was a raw CSS
  background on every auth page, bypassing next/image; PNG deleted, AuthCard points at .webp);
  `Female_doctor.jpg` 805→108 KB (1600w mozjpeg); palette-compressed PNGs in place:
  `Frame 64` 565→208 KB, `unilogo` 259→74, `EHR` 155→43, P-1…P-6 ~52–101→23–36, `Hero_picture`
  90→32, `BENEFIT_ONE` 40→9. Total images: ~3.9 MB → ~1.0 MB.
- **Old Vanilla JS app purged from `public/`** (Bastoh approved): all legacy HTML/JS/CSS — root
  pages, 6 dashboard folders, organization/, access-request/, assets/js+css, stale sitemap.xml —
  ~900 KB that was deployed verbatim and publicly reachable (e.g. `/signin.html` with
  localStorage-token login hitting prod API). Kept: `robots.txt`, `assets/images/`. All recoverable
  from git history. NOTE: makes ARCHITECTURE.md (still describing that old app) fully historical.
- Verified: tsc clean, vitest 50/50, `next build` green ×2 (pre- and post-purge), prod server driven
  with Playwright — icon links resolve (`/icon.png` 200), flare .webp 200 on `/signin`, screenshots
  of nav/hero/footer/signin + full-page (no compression artifacts).

---

### 2026-07-12 — Design PR B (auth set): sign-in + full recovery flow rebuilt (branch: feat/design-auth-set)

**Context:** Bastoh shared the backend→frontend handoff MD. Two things mattered: (1) **backend issue
#66 landed** — `GET /auth/setup-password/validate/` now returns `organization_name` +
`organization_logo` (either nullable → fall back to HealthClouda). (2) New affordances for later PRs:
public `POST /auth/setup-password/resend/` and `POST /auth/users/<id>/resend-setup-email/` (PR 6).

**Verified live against Swagger** (`/api/v1/schema/`, saved locally) before building:
- **Access-request respond action enum = `accept`|`deny`** (in the POST operation description). The
  handoff MD's `approve|deny` is WRONG; our 2026-07-11 note was right. Swagger wins → PR D uses
  `accept`/`deny` (sending `approve` = silent 400). The POST exposes no formal requestBody serializer
  (plain APIView) — hand-write the `{token, action}` type.
- **Org login is email-only.** The login endpoints expose no request-body serializer in the schema
  (plain APIView), but the handoff documents `{email, password}` in two places and Bastoh confirmed it.

**PR B `feat/design-auth-set`** — high-fidelity restyle of the *existing, already-wired* auth
components (not a from-scratch build). All login/recovery logic preserved:
- **Shared shell** `AuthCard` rebuilt: flare-image + gradient bg with two blurred blobs, 64px white top
  nav (brand left / outlined back-button right; org mode swaps brand → org logo 32px + org name),
  optional 56px icon chip + H1 + sub, 700px white card (`shadow-card`).
- New primitives: `authStyles.ts`, `AuthIcons.tsx` (SVGs lifted verbatim from the design), `TextField`;
  `PasswordInput` restyled to spec.
- **Sign-in (general + org + admin)** one `SigninForm`: general H1 "Login to HealthClouda" (40px), org
  H1 "Sign in to **{Org}** HealthClouda" (org name blue, 36px); Remember-me (**UI-only** — no
  session-length plumbing yet, commented), forgot link, `#ebf3ff` Notice box. Admin variant = no
  Notice/Remember.
- **Recovery flow** all four screens restyled with org theming: forgot (lock chip, org email
  placeholder); check-email (OTP box states + **Verify disabled until 6 digits** + **resend countdown**);
  reset (rebuilt `PasswordStrengthMeter` + **submit gated on full rule set**); success (72px chip w/
  **animated blue check** + "Continue (5)" countdown).
- **Correctness bump:** reset-password zod schema now enforces the *full* backend rule (≥8 + upper +
  digit + special) client-side, via a shared `passwordChecks/passwordIsValid` helper consumed by both
  the meter UI and the schema (reused by set-password in PR D).
- ⚠️ **Known design deviation:** design labels the org sign-in field **"Email / HealthClouda ID"**, but
  backend login is **email-only** (verified above) → shipped as **"Email address"**, strict-email
  validation. HCL-ID login would need a backend `api-request`.
- Verified: tsc clean, vitest 50/50, `next build` green (22 routes), all six screens driven +
  screenshotted (Playwright), incl. org sign-in via a throwaway preview route.

---

### 2026-07-11 (evening) — Delivery plan locked; design PR A shipped; PR D API gaps verified (branch: feat/design-foundations-landing)

**Delivery decision (Bastoh):** ship **~Tue–Wed 2026-07-21/22**, scope = **Cut 2** (everything incl.
the P2 write workflows: receptionist check-in/register/appointments, doctor episode/prescription/
referral). Demo surface = **Vercel deployment on `develop`** → final smoke pass must run against the
deployed URL + prod backend. Schedule: weekend = design PRs A+B; Mon–Tue = PR 5 + C + PR 6 + doctor
PR + CI; Wed–Thu = PR D + sweeps + bug list; Fri 18 buffer.

**PR A `feat/design-foundations-landing`:**
- Design tokens into the styling layer: Lato added via `next/font` (`--font-lato`), Tailwind v4
  `@theme inline` tokens (`primary/primary-dark/ink/page/chip/panel/footer/hairline/input-*`,
  `font-heading`/`font-body`, card + button shadows). Dashboards untouched (still Inter).
- **General landing `/` recreated per the design** (nav w/ mobile drawer, flare hero + patient-portal
  mock, how-it-works, features, one-platform, benefits, about, security, contact, CTA banner,
  4-col footer). Wellbeing carousel REMOVED from `/` (design puts it on the org landing — PR C).
- `design_handoff_prelogin/` committed (Bastoh's call: Qeeyat sees design source in review).
- ⚠️ **Known design deviation:** contact form has an added **Phone number** field — backend
  `ContactUsRequest` REQUIRES `phone_number`; full name split client-side, organisation prefixed
  into `message`. Verified live: proxy → DRF 201.
- Verified: vitest 50/50, tsc clean, build green, contact submission created on local backend.

**PR D early API verifications — both answered:**
1. **Access-request respond:** live prod schema now has `GET /receptionist/access-requests/respond/?token=`
   (read-only details) + `POST {token, action: accept|deny}` (the mutation — backend fixed the
   GET-mutation hazard, their FLAG-241).
2. **Invite-token validate returns NO org branding:** `{valid, email, first_name, last_name, role}`
   (verified with a real token via local DB) → **backend issue #66 filed** (additive field ask).
- Bonus intel for **PR 6**: `POST /org-admin/staff/` requires `full_name` (not first/last) and
  **lowercase** `role` (`"nurse"`); 400 `{error, code, details}`. Note the casing inconsistency with
  the rest of the API (validate returns `"DOCTOR"`).

**Routing DECIDED (Bastoh, 2026-07-11): keep `/[slug]/…`** — the design README's `/org/[slug]`
prefix was a doc mistake. All design PRs use the existing route structure.

---

### 2026-07-11 (later) — NURSE-1 nurse vitals rebuild (branch: fix/nurse-vitals)

**Context:** Work plan step 1 (bug-list triage) skipped — Bastoh has no list yet — so straight to
step 2: NURSE-1, the last known P0.

**Full nurse contract verified live** (local Docker backend, nurse@demo.test):
- `GET /nurse/my-patients/` → `{count, results}` envelope of **admissions** (nested
  patient/bed/ward/episode) — the old page parsed flat patients → every cell "—".
- `GET/PATCH /nurse/patients/<patient_id>/vitals/` → `{patient_id, episode_id, vitals: latest|null}`.
  PATCH **appends** a reading; partial bodies fine; 400 `{error, code, details}` with probed bounds
  (temp 30–45°C, systolic ≥50, diastolic 20–200, pulse 20–250, resp 5–60, SpO2 50–100, weight
  0.5–500, height 20–300); 404 = no active episode; **empty body stores an all-null reading** → form
  requires ≥1 field and omits untouched inputs.
- `GET /nurse/dashboard/stats/` → ward/admission aggregates. `vitals_pending`, `critical_patients`,
  `total_patients` **do not exist** (GLOBAL-6 nurse slice) — the whole "Vitals Pending" concept had
  no backend support.

**PR 4 `fix/nurse-vitals`:** all four nurse pages rebuilt on the real shapes. New Vitals page =
patient picker → latest-reading panel + record form (the core nurse workflow, previously missing
entirely). Overview cards now real stats; My Patients shows HCL-ID/ward/bed/complaint with per-row
"Record vitals". New types: `NurseAdmission`, `VitalsReading`, `PatientVitals`; `NurseStats`
rewritten; dead `VitalRecord` deleted. **8 pre-fix tests red→green.**
- Verified: vitest 50/50, tsc clean, `next build` green, driven end-to-end through the real Next
  login route + `/api/data` + `/api/action` proxies against the local backend.

---

### 2026-07-11 — PRs #55/#56 merged; pre-login design batch delivered; work plan agreed

**Short session — no code.**

- Qeeyat merged **PR #55** (patient appointments) and **PR #56** (duty initial state). `develop`
  synced locally; both local branches deleted. All of PATIENT-1 + GLOBAL-4 is live.
- **Design batch 1 landed:** `design_handoff_prelogin/` (repo root) — high-fidelity designs + README
  covering ALL pre-login pages. Read its `README.md` before touching any of it — design tokens,
  route map, agreed product decisions.

**Agreed work plan (in order):** triage Bastoh's bug list → NURSE-1 nurse vitals rebuild → design
batch as independent PRs off `develop` (PR A foundations+landing → PR B auth set → PR C org landing
→ PR D utility screens) → early API verifications before/alongside PR D.

---

### 2026-07-09 — Backend watch-list shipped → PATIENT-1 + GLOBAL-4 wired (PRs #55, #56)

**Context:** Backend notified that both watch-list items landed (their PR #65, deployed to prod):
`GET /patients/me/appointments/` (PATIENT-1) and duty fields on `/auth/me/` (GLOBAL-4).

**Both contracts verified live** (prod schema + seeded local Docker backend, all roles probed):
- Appointments: envelope + item shape exactly as promised; `?status=` case-insensitive ✓;
  `?date=YYYY-MM-DD` ✓ (400 `{error, code, details}` on malformed) ✓.
- Duty fields: `/auth/me/` has them for DOCTOR + NURSE; keys **omitted entirely** (not null) for
  other roles; **NOT on the login response**. Covered anyway: our login route enriches from
  `/auth/me/` (PR #49) — but that enrichment only copied `organization.*`, which was the real bug.

**PR #55 `fix/patient-appointments`:** overview panel drops the invented `?upcoming=` (GLOBAL-2 —
it silently showed ALL appointments) for `?status=scheduled`; list page gets status tabs (reset to
page 1) + the real item shape. New `PATIENT_APPOINTMENTS` const + strict `PatientAppointment` type.
4 pre-fix tests red→green. **Carries all doc updates.**

**PR #56 `fix/duty-initial-state`** (**independent — not stacked**): login enrichment copies
`is_on_duty`/`duty_toggled_at` (preserving key-absence for other roles); DutyToggle now trusts the
toggle response instead of blindly flipping local state (stale-tab bug). 2 pre-fix tests red→green.
**Code-only by design** so #55/#56 can't conflict on shared docs — merge in either order.

Both: vitest 38/38, tsc clean, build green, driven end-to-end against the local backend.

---

### 2026-07-05 — Backend questions answered + PR #51 stranded-merge rescue + stacking rules

**Context:** Goal was to answer the 4 open backend questions at the bottom of `CONTRACT-AUDIT.md`.
Mid-session we discovered PR #51 had merged into a dead base and never reached `develop`.

**All 4 backend questions ANSWERED** — verified empirically first, then confirmed with backend:
1. **PATIENT-1:** confirmed gap. Backend will build paginated `GET /patients/me/appointments/`.
2. **ORGADMIN-1:** removal INTENTIONAL (org-admin approval bypassed patient consent — security fix).
   PR 6: delete approve/deny, keep the read-only list.
3. **GLOBAL-4:** backend will add `is_on_duty` + `duty_toggled_at` to `/auth/me/` AND login user.
4. **GLOBAL-2:** verified live — `?status=`/`?date=`/`?search=` work; `?today=`/`?upcoming=`/`?my=`
   silently IGNORED; episode enum is `ACTIVE` not `OPEN` (frontend's `?status=OPEN` → 0 rows).
- Bonus: **REC-3 verified** — on-duty doctors returns a paginated ENVELOPE, not a bare array.

**PR #51 stranded-merge discovered & rescued:** #51 was merged into its stacked base
`test/auth-regression` 33 min AFTER that base merged into `develop` (#50) — the retarget never
happened, so PR 2's fixes never reached `develop`/Vercel. Opened **PR #52** (diff = exactly #51's
changes).

**Root cause fixed:** repo setting `delete_branch_on_merge` was OFF → enabled. **Stacking rules
adopted:** independent work always branches off up-to-date `develop` — never stack, never wait.
Stack ONLY when the new work needs code from an unmerged PR, and stack parents MUST merge via
**merge commit** (squash breaks the retargeted child with phantom conflicts).

---

### 2026-07-04 — PR #49 regression tests + branch cleanup + PR 2 error/pagination hygiene

**Context:** PR #49 (`fix/auth-layer`) merged into `develop` (`447758b`). Per the pre-fix/post-fix
discipline adopted 2026-07-03, first task was to backfill regression guards for the auth fixes that
shipped without tests.

- **Branch hygiene:** fast-forwarded local `develop`; deleted 5 stale remote branches + local copies.
- **Regression tests — 14 new, vitest 23/23 green** (`test/auth-regression`): refresh route persists
  the ROTATED refresh token / 401 clears cookies / no-cookie short-circuits; middleware gates on
  access OR refresh cookie, never builds `/undefined/...`, org-aware + superadmin signin redirects;
  single-flight refresh (concurrent 401s → ONE refresh → retry both); `getOrgSlugFromPathname` slug
  vs reserved-path handling.
  - **Verified genuine:** temporarily reverted the refresh-rotation and `/undefined/` fixes and
    confirmed the guards go red (buggy middleware reproduced exactly `/undefined/doctor`), then restored.
- **`CONTRACT-AUDIT.md` progress-tracked:** checked off AUTH-1..5, AUTH-5b, REC-1, ARCH-1 with
  per-item annotations. Confirmed **AUTH-6 still open** (`serverFetch` swallows errors as `null`).

**PR 2 (`fix/error-pagination`, stacked on `test/auth-regression`) — same session:**
- Pre-fix failing tests FIRST (6/6 red confirmed against buggy code).
- **GLOBAL-1:** all 8 `?limit=` call sites → `?page_size=` (DRF ignores `limit`).
- **UX-ERR-1:** new shared `ErrorState` component; every list/preview on all 6 dashboards now
  distinguishes failed fetch from empty.
- **PERF-1:** new `usePaginatedList` hook; `<Pagination />` wired on all full list pages.
- **AUTH-6:** all 6 dashboards fall back to client-side stats fetch when `initialStats` is null.
- **GLOBAL-5:** 429 friendly message now visible via error states.
- Verified: tsc clean, vitest 30/30, build green.

**Decision:** `rewrite/react` is NOT deleted yet — merged into `develop` but the migration plan says
"delete after final merge" and `main` has not received the rewrite.

---

### 2026-07-03 — Full-codebase audit (5 lenses) + auth-layer fix (branch: fix/auth-layer)

**Context:** Backend fix phase M0–M5 complete. Goal: catch all bugs, align frontend with the new
backend contract. Offline-first is DEFERRED to staging phase (backend decision 2026-07-02); build
online-only but keep all data access behind a swappable layer.

- Phase 0 baseline: install (flaky network corrupted 3 native binaries — fixed via cache verify +
  targeted re-downloads), build green (22 routes, 102–142 kB first load), vitest 9/9, dev server +
  local Docker backend verified end-to-end with seeded logins.
- Phase 1: **full codebase review** through 5 lenses (correctness/contract, security, performance,
  architecture, UX/a11y) against the handoff PDF + live OpenAPI schema + live backend.
  → **`CONTRACT-AUDIT.md`**: ~9 P0s, ~20 P1s, ~25 missing workflows, proposed PR order, 4 open
  backend questions.
- Phase 2 — **PR 1 (`fix/auth-layer`)**, all verified live against Docker backend:
  - Refresh route now persists the ROTATED refresh token (was discarded → 2nd refresh always 401'd).
  - New `src/lib/client-api.ts`: single data layer, 401 → single-flight refresh → retry → org-aware
    signin redirect. `use-api.ts` rewired on top. **This is the offline swap seam.**
  - Login route enriches user with `organization_slug/name` from `/auth/me/` (staff used to be
    redirected to `/undefined/<role>`).
  - Middleware gates on access OR refresh cookie (access cookie expires hourly — page navs used to
    bounce to signin despite a valid refresh token); never builds `/undefined/` redirects.
  - Logout + 401 redirects are org-aware; receptionist search param fixed (`?q=` → `?query=`).

**Decision adopted:** **pre-fix/post-fix test discipline** — every fix PR starts with a failing test
reproducing the flagged issue, the fix turns it green, the test stays as a regression guard.

---

### 2026-06-12 — Vercel deploy failures fixed (Output Directory override)

- Diagnosed why every Vercel deployment failed after the React rewrite merged: builds errored with
  `NEXT_NO_ROUTES_MANIFEST` because the **dashboard Output Directory setting was still `public`**
  (leftover from the static site). Dashboard settings override `vercel.json`, so the
  `"framework": "nextjs"` fix in fe6b115 never took effect.
- Cleared the Output Directory override via the Vercel API (`outputDirectory: null` → `.next`).
- Redeployed `develop` head (6e14a2c) — preview built green in 1m. Production was stuck on a stale
  commit (e17319e) with a real `module_not_found` bug already fixed by PR #46, so the current
  develop build was promoted to production.
- Verified `develop` branch ruleset: PRs required (1 approval), no direct pushes, no force-push/deletion.

**Decision:** Vercel production branch **stays `develop` for now** — the `main` → Production remap
is deferred.

---

### 2026-06-11 — Full technical review + Next.js migration plan

- Full codebase audit: measured all JS files (~8,500 lines), CSS (~1,680 lines), 22 HTML shells,
  6 dashboards.
- Identified architecture ceiling: no module system, global scope pollution, 6× code duplication,
  zero tests, localStorage token security debt, memory leaks from uncleared intervals.
- Evaluated Vanilla JS → Next.js migration: verdict **proceed**. Created `MIGRATION-PLAN.md`.

**Decisions:** migrate to Next.js (App Router) via `rewrite/react`; **convert the existing repo** —
do not create a new one (git history preserved); port `config.js`, `api.js`, `router.js` directly,
redesign only the structure; Phase 1 (auth) ships to `staging` as a standalone PR before dashboards
are touched; no new features on `develop` (Vanilla JS) once Phase 1 ships.

---

### 2026-05-25 — CLAUDE.md upgrade + ARCHITECTURE.md created

- Replaced `CLAUDE.md` with a more structured version: login portal contract, auth flow notes,
  explicit session start/during/end workflow, key patterns to enforce.
- Created `ARCHITECTURE.md` — file structure, routing (Vercel rewrites + `HC_ROUTER`), auth flows
  (3 portals), API layer, and API endpoint map per role.

**Decision:** `ARCHITECTURE.md` is a required living doc — update it whenever routing, file
structure, or API integration changes.

---

### 2026-05-25 — Branch strategy restructure + repo cleanup

- Diagnosed state: `main` had only 1 commit (initial), `develop` had 89 commits, no `staging`
  existed, 36 stale remote branches.
- Opened PR #43 (`develop` → `main`) to align main — merged by Qeeyat. Created `staging` from `develop`.
- Updated GitHub ruleset ID `11328360` from `~ALL` to `main/staging/develop` only (was blocking all
  branch deletions and pushes).
- Deleted 36 stale remote branches and 30 stale local branches.
- Created `HANDOFF.md`; fixed `.gitignore` so `CLAUDE.md` and `HANDOFF.md` are tracked.
- Deleted `BACKEND-PROMPTS.md` and 9 unused placeholder images.

**Decisions:** branch structure mirrors the backend repo exactly (main / staging / develop); React
rewrite goes `rewrite/react` → `staging` → `develop` → `main` — never splits stack across
environments; `CLAUDE.md` + `HANDOFF.md` committed, `PRD.md` + `API-doc.md` stay gitignored.
