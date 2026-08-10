# Session Log — @Qeeyat

> **This file is yours.** Only you write in it. Nobody else edits it — not to tidy it, not to
> correct it, not to add a note. If someone needs to tell you something, it goes in `HANDOFF.md`
> where it's shared state.
>
> Welcome to the team, Qeeyat — genuinely glad you're here.
>
> You're our **baby dev**: the newest member, and the one we're all invested in bringing up. Around
> here that's a term of affection, not a ceiling — you're expected to grow into owning whole
> features, and this repo was deliberately prepared so you can. Start with `ONBOARDING.md`.

---

## What goes in here

Your **narrative**: what you worked on, what you found, what you decided and why, what confused
you, what you left unfinished.

**Not** here: durable shared facts (branch strategy, env values, In Flight claims, backend contract
notes) — those go in `HANDOFF.md` so everyone sees them. Issues you noticed but didn't fix go in
`CODEBASE_FLAGS.md` (your FLAG numbers are **200–399**).

**Why it matters:** @Bastoh and any other dev drive their own AI assistants, and those assistants
**cannot see each other's memory.** This file is how your work becomes visible to them. If it isn't
written down, the rest of the team does not know it happened.

## How to write an entry

- **New entry at the TOP**, dated. Newest first.
- Write for someone who wasn't there — including a future assistant with no context.
- **Record dead ends and confusion, not just wins.** "I spent an hour thinking X was broken, it was
  actually Y" saves the next person that hour. This is one of the most valuable things in the file.
- Note anything you verified against the live API schema, and the date you verified it.
- Don't polish. Notes beat prose.

### Template — copy this

```markdown
### YYYY-MM-DD — <short title> (branch: <branch-name>)

**Goal:** what you set out to do.

**What I did:**
- …

**What I found:**
- …

**Decisions:**
- … and why.

**Verified:** tsc / tests / build results, plus anything checked against the live schema.

**Left undone / next:**
- [ ] …
```

---

## Session Log

### (no entries yet)

Your first entry goes here. A reasonable first one is just getting the project running:
what you set up, what didn't work first time, and what you had to ask about. That's genuinely
useful — setup friction you hit is friction the next person hits, and writing it down is how
`ONBOARDING.md` gets better.

---

## Quick reference

**Before opening any PR:**

```bash
npx tsc --noEmit    # must be clean
npm test            # must be green
npm run build       # must be green
```

**Session start, in order:** `git config user.name` → `HANDOFF.md` (incl. 🚧 In Flight) → **every**
dev's `HANDOFF-<Name>.md`, not just this one → `ARCHITECTURE.md` →
`TARGET_ARCHITECTURE_CHECKLIST.md` → `BETA_READINESS.md`.

**Branches:** cut `feat/*` or `fix/*` from an up-to-date `develop` · claim it in 🚧 In Flight
**before** cutting · rebase onto `develop`, never merge `develop` in · never force-push `develop` ·
clear your In Flight row on merge.

**Reviewer:** always **@Bastoh**, set when you open the PR — `gh pr create --reviewer Bastoh`.
Never merge your own PR unreviewed; branch protection isn't enforced here, so the reviewer is the
only real gate.

**Your sprint work:** the design lane, DASH-1…6 — see `docs/FRONTEND_SPRINT_PLAN.md` for the dated
plan and `docs/DESIGN-VERIFICATION.md` for how to check a dashboard before you push.

**In review, "let's fix that" means _add a flag_ — not edit source.**

**Stuck?** Search `CODEBASE_FLAGS.md` and the dev logs first, then check the live API schema, then
ask. Thirty minutes, not two hours.
