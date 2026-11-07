#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
scenarios=(feature recovery security unexpected)
failed=0
for scenario in "${scenarios[@]}"; do
  echo "===== ${scenario} ====="
  if (cd "$ROOT/evaluation/fixtures/$scenario" && node --test); then
    echo "RESULT ${scenario}: PASS"
  else
    echo "RESULT ${scenario}: FAIL"
    failed=1
  fi
done
# The bug fixture is intentionally red in its seeded state.
echo "===== bug (seeded defect; expected red) ====="
if (cd "$ROOT/evaluation/fixtures/bug" && node --test); then
  echo "RESULT bug: UNEXPECTED PASS (seed may have been removed)"
  failed=1
else
  echo "RESULT bug: EXPECTED FAILURE CONFIRMED"
fi
exit "$failed"
