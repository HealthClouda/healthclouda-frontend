#!/usr/bin/env bash
# T3 — prove the gate suite can fail.
#
# `BETA_READINESS.md` Tier 1 item 4: "the suite exists, and at least one test in
# it has been proven able to fail — run against a deliberately weakened gate,
# the way the backend proved their cross-org control by sabotaging the rule and
# watching the test report the leak. A control that has never failed is
# indistinguishable from a control that cannot fail."
#
# This script weakens `src/lib/auth-server.ts` three ways, one at a time, runs
# the T3 matrix against each, and restores the file. It writes nothing to git
# and is not wired into CI — it is a measurement you re-run by hand whenever the
# gate is refactored, and the numbers it produced are recorded in
# `docs/T3-SABOTAGE.md`.
#
#   bash scripts/t3-sabotage.sh
#
# ⚠️ It edits a source file in place and restores it in an EXIT trap. If it is
# killed with SIGKILL the restore does not run — `git checkout src/lib/auth-server.ts`
# puts it back. Check `git status` before committing anything after a run.

set -uo pipefail
cd "$(dirname "$0")/.."

GATE=src/lib/auth-server.ts
BACKUP="$(mktemp)"
cp "$GATE" "$BACKUP"
restore() { cp "$BACKUP" "$GATE"; rm -f "$BACKUP"; }
trap restore EXIT

run_suite() {
  npx vitest run src/app/dashboard-gate.matrix.test.tsx \
    --testTimeout=30000 --pool=threads --hookTimeout=60000 2>&1 \
    | grep -E "Tests +[0-9]|Test Files +[0-9]|no tests"
}

echo "=== BASELINE — the gate as shipped. Expect all green. ==="
run_suite

echo
echo "=== SABOTAGE 1 — tenant check removed (a real doctor can walk into another org) ==="
node -e '
const fs=require("fs"),p="src/lib/auth-server.ts";let s=fs.readFileSync(p,"utf8");
const t="  if (slug && user.organization_slug !== slug) redirect(signin);";
if(!s.includes(t)) throw new Error("sabotage 1 anchor missing — the gate was refactored, update this script");
fs.writeFileSync(p,s.replace(t,"  // SABOTAGED: tenant check removed"));'
run_suite

cp "$BACKUP" "$GATE"
echo
echo "=== SABOTAGE 2 — role check removed (any signed-in user reaches any dashboard) ==="
node -e '
const fs=require("fs"),p="src/lib/auth-server.ts";let s=fs.readFileSync(p,"utf8");
const t="  if (!user || user.role !== role) redirect(signin);";
if(!s.includes(t)) throw new Error("sabotage 2 anchor missing — the gate was refactored, update this script");
fs.writeFileSync(p,s.replace(t,"  if (!user) redirect(signin); // SABOTAGED: role check removed"));'
run_suite

cp "$BACKUP" "$GATE"
echo
echo "=== SABOTAGE 3 — fails OPEN (an unconfirmable session is treated as identity) ==="
node -e '
const fs=require("fs"),p="src/lib/auth-server.ts";let s=fs.readFileSync(p,"utf8");
const t="  const user = await getAuthorizedUser();";
if(!s.includes(t)) throw new Error("sabotage 3 anchor missing — the gate was refactored, update this script");
fs.writeFileSync(p,s.replace(t,"  const user = (await getAuthorizedUser()) ?? ({ role, organization_slug: slug } as User); // SABOTAGED: fails open"));'
run_suite

echo
cp "$BACKUP" "$GATE"
echo "=== restored — this must show no diff ==="
git --no-pager diff --stat "$GATE"
