# Agent definitions — how the two-repo flow works

> Committed deliberately. `CLAUDE.md` §1: the documents in this repo are the **only** channel
> between two devs whose assistants cannot see each other's memory. An agent definition that lives
> only on one machine is the same failure — the 22-item parity list agreed on 31 Aug existed in one
> session's context and was lost, which is precisely the seam this directory closes.

## The shape

```
                    owner (@Bastoh)
                          ▲
                          │  verified findings + raw evidence
                          │
                 ┌────────┴────────┐
                 │  Opus 5 session │  ← the main Claude Code session
                 │  (verifier)     │     plans, delegates, re-measures, reports
                 └────────┬────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   frontend-worker              backend-worker
   Sonnet 5                     Sonnet 5
   healthclouda-frontend        healthclouda-backend
```

**The main Opus session is the verifier.** It is not a third worker sitting between the owner and
the two Sonnets. That layer was tried on 2 Sep and deliberately dropped:

> *"Every summary loses the detail that makes a finding actionable, and this repo has a live example
> of why — three near-miss false findings in one week, each resolved by returning to the raw
> measurement, not by re-reading a summary."*

The separate **`verifier`** agent exists for one case the main session cannot cover honestly: when
the main session did the work itself, it should not mark its own homework. Spawn `verifier` then.

## Why this exists at all

The two repos move at different speeds and the seam between them is where this project's bugs live.
Working both at once is only safe if each side is worked by something that has actually read that
repo's own rules — the backend's ritual, flag ranges, migration discipline and merge policy are all
different from the frontend's, and an agent that assumes otherwise does damage that reads as intent
to the next person.

## Rules that bind every agent here

| Rule | Why |
|---|---|
| **Measure, never report** | Every number must come from a command run this session. "Not run" is always an acceptable answer; a wrong number never is |
| **One agent per working tree** | Two agents doing git operations in one directory produce unstable reads that look exactly like regressions. Use `git worktree` or wait |
| **Workers never merge** | They open PRs and stop. Merging is a human decision, and on the frontend the ruleset enforces it |
| **Review mode ⇒ add a FLAG, not a fix** | `CLAUDE.md` §6. Fixes get their own branch and PR |
| **No PHI, no credentials, ever** | Both repos are public. Synthetic data only |
| **Infra has an owner, not a PR** | Railway, Cloudflare, Vercel, R2, DNS — report, do not touch |

## Using them

```
frontend-worker   bounded implementation in healthclouda-frontend
backend-worker    bounded implementation in healthclouda-backend
verifier          read-only re-measurement of work someone else did
```

Give a worker a **scoped** task with a definition of done. They are not for deciding *what* to work
on — that is the session ritual's job, and it needs the owner.
