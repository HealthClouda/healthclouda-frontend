# T3 — proving the role-gate suite can fail

> **Measured 2026-09-08 by @Qeeyat**, on `develop` @ `7c9275d` + `test/t3-role-gate-isolation`.
> Re-run it with `bash scripts/t3-sabotage.sh` whenever `requireDashboardUser` is touched.

`BETA_READINESS.md` Tier 1 item 4 does not ask for a suite. It asks for a suite **plus a
demonstration that the suite can fail**:

> *"the suite exists, and **at least one test in it has been proven able to fail** — run against a
> deliberately weakened gate, the way the backend proved their cross-org control by sabotaging the
> rule and watching the test report the leak. **A control that has never failed is indistinguishable
> from a control that cannot fail.**"*

That sentence is the whole reason this file exists. `FLAG-221` is this repo's standing record of
green tests that asserted nothing — including one that was green **on a live PHI leak** — so a T3
suite that had only ever been observed passing would be evidence of nothing at all.

---

## What was sabotaged

`scripts/t3-sabotage.sh` edits **`src/lib/auth-server.ts`** in place, one weakening at a time, runs
`src/app/dashboard-gate.matrix.test.tsx` against each, and restores the file from a backup in an
`EXIT` trap. Nothing is committed sabotaged; the script ends by printing `git diff --stat` on the
gate, which must be empty.

| # | Weakening | The real-world defect it recreates |
|---|---|---|
| **1** | `if (slug && user.organization_slug !== slug) redirect(signin);` deleted | The pre-#99 gate. A **real** doctor at `demo-clinic` types `/other-clinic/doctor` and gets that org's dashboard shell. No tampering, no tooling — just a typed URL, against the constraint `CLAUDE.md` §1 calls the core of the product |
| **2** | `user.role !== role` dropped, leaving only `!user` | Any signed-in user reaches any dashboard. This is FLAG-001's named escalation |
| **3** | `getAuthorizedUser()` returning `null` treated as the requested identity | Failing **open**. `serverFetch` returns `null` on *any* failure (FLAG-005) — no token, a 401, a 500, a network blip — so this is what a backend wobble would do to the gate if the null check were ever "simplified" |

---

## The result

```
BASELINE — the gate as shipped        Tests  58 passed (58)
SABOTAGE 1 — tenant check removed     Tests   8 failed | 50 passed (58)
SABOTAGE 2 — role check removed       Tests  32 failed | 26 passed (58)
SABOTAGE 3 — fails OPEN               Tests  12 failed | 46 passed (58)
restored                              (no diff on src/lib/auth-server.ts)
```

**Every sabotage was caught, and each was caught by exactly the tests that should have caught it:**

| Sabotage | Failed | The set, named |
|---|---|---|
| 1 | **8** | the 4 cross-org walks + the 4 `organization: null` cases — one pair per slug-scoped dashboard |
| 2 | **32** | all **30** role-escalation cases (6 dashboards × 5 wrong roles) + the 2 slug-less "org membership grants nothing" cases, which depend on the role check |
| 3 | **12** | all **12** fail-closed cases (6 dashboards × {`null`, a 200 with no `role`}) |

🎯 **The three failure sets do not overlap, and together they account for the whole suite.**
8 + 32 + 12 = **52 distinct tests**, and 52 + the **6** legitimate-render cases = **58**. So:

- **Every single deny assertion in the matrix is load-bearing.** Not one of the 52 is decoration —
  each one is the only thing standing between a specific weakening and a silent pass.
- **The 6 tests no sabotage can break are exactly the ones that must not break** — the legitimate
  user of each role rendering their own dashboard. They exist to catch the opposite failure: a gate
  that denies everyone satisfies all 52 deny assertions and is still broken.
- **The partition is itself a finding.** It says role, tenant and fail-closed are three genuinely
  independent controls in this codebase rather than one control observed three ways. Breaking any
  one leaves the other two green — which is precisely how a partial refactor would ship.

---

## What this does *not* prove

Stated plainly, because the gap between "the gate logic is right" and "no PHI reaches the wrong
browser" is where this repo has been bitten before:

- **These are unit tests against a mocked `serverFetch`.** They prove the gate *decides* correctly
  given an `/auth/me/` answer. They do not prove the deployed app behaves this way against
  `api-dev`, and **nobody has yet clicked through a cross-org URL on `dev.healthclouda.com`.**
  That is the same gap `HANDOFF.md` records against #99's hour-boundary claims.
- **The redirect is asserted, the response body is not.** A denial is proven to `redirect()` to the
  right portal. Nothing here measures what a *server-rendered* response contained before the
  redirect — that is **T4**, and FLAG-203's server channel is still open.
- **Middleware is a separate layer with separate tests.** `src/middleware.test.ts` covers the
  edge-level checks; this suite covers the page-level gate. Neither substitutes for the other, and
  the gate is deliberately the authoritative one (`middleware.ts:91`).
- **`/auth/me/` is trusted absolutely.** That is correct — it is the server's answer, keyed off an
  httpOnly token the browser cannot read — but it means the control's strength is the backend's, and
  **FLAG-026** records that the session's lifetime depends on a number in the other repository that
  we neither control nor can see.

---

## Re-running it

```bash
bash scripts/t3-sabotage.sh
```

Takes roughly six minutes on a loaded Windows machine (four full runs of the file; see FLAG-233 for
why the timeout flags are there). If it aborts partway, `git checkout src/lib/auth-server.ts`
restores the gate — **check `git status` before committing anything after a run.**

The script asserts its own anchors: if `auth-server.ts` is refactored so a sabotage string no longer
matches, it throws with a message saying so rather than silently sabotaging nothing and reporting a
clean pass. That failure mode — a sabotage harness that quietly stops sabotaging — would be the
worst possible bug in this file, since it would keep printing green forever.
