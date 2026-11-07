# DevPilot PS-001 Upgrade Report

## Implemented in this upgrade

- Added a canonical six-role roster: five core agents plus a separate independent verifier.
- Added explicit, deterministic developer tool selection with permission classes and rationale.
- Integrated tool-selection decisions into the streamed mission event log.
- Added unit tests for the roster and tool-selection policy.
- Added five controlled evaluation fixtures and a scenario/evidence guide.
- Updated README with the LangGraph design, agent count, evaluation instructions, and honest evidence requirements.

## Architecture confirmation

- LangGraph is a direct runtime dependency (`@langchain/langgraph`) and the mission runner builds a `StateGraph` with typed shared state.
- Reviewer and security agents run as parallel graph branches; the verifier waits at the join barrier.
- Test failures and review/security/verification blockers can route back to the developer within the configured five-iteration limit.
- Human approval remains a separate gate; the workflow does not self-approve.

## Actual checks performed during this packaging session

| Check | Result |
|---|---|
| Feature fixture baseline (`node --test`) | Passed: 1 test |
| Bug fixture seeded baseline (`node --test`) | Expected failure confirmed: actual 99.8, expected 80 |
| Recovery fixture baseline (`node --test`) | Passed: 1 test |
| npm dependency installation | Not completed: install command timed out in this environment |
| Project Jest suite / TypeScript typecheck / Next build | Not run: dependencies could not be installed |
| Full UI-driven multi-agent end-to-end mission | Not run: requires installed dependencies and configured model credentials |

The fixture test runs are not represented as successful DevPilot missions. The seeded bug is intentionally left failing so it can be used to demonstrate diagnosis and repair during an actual mission.

## Still required before a formal evaluation

1. Install dependencies on a machine with registry access (`npm install`).
2. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`; resolve any failures.
3. Configure an OpenAI or Gemini key locally in `.env.local` (never commit it).
4. Execute test-enabled missions only in a network-disabled disposable container/VM with CPU, memory, PID, and filesystem limits.
5. Capture at least one real mission where a failing check changes the developer's next action, then a real passing rerun.
6. Complete and retain all five evaluation scenario logs.
7. Add user/tenant authorization to every repository and mission API before exposing the app to multiple users.

## Known limitations

- Test execution is disabled by default and the current runner invokes `npm test -- --runInBand`; the Node built-in test fixture scripts require an adapter or an isolated compatible test runner before being run through DevPilot itself.
- Static security scanning is heuristic and cannot prove the absence of vulnerabilities.
- Application-level command allowlisting is not an OS sandbox.
- The Supabase integration does not yet establish complete user ownership checks on all mission/repository routes.

## Additional controlled fixture verification (2026-11-04)

The dependency-free evaluation harness `evaluation/run-fixtures.sh` was added and run successfully:

| Scenario | Result | Evidence |
|---|---|---|
| Feature implementation baseline | PASS | `evaluation/logs/fixture-run-2026-11-04.txt` |
| Test-driven recovery baseline | PASS | Same run log |
| Security planted SQL interpolation | PASS (detector fixture) | Same run log; confirms the planted interpolation pattern is present, not that the application scanner catches it |
| Ambiguous request | PASS (fixture policy) | Same run log; fixture's local policy requests clarification |
| Bug investigation | EXPECTED FAIL | Seeded defect returns 99.8 where test expects 80 |
| Bug repair demonstration | PASS in disposable copy | Applied `price * (1 - percent)` to a temporary copy; test passed. Seeded original fixture remains unchanged |

The bug repair demonstration is a manual controlled fixture repair, not an autonomous DevPilot agent mission. The security test validates that the planted vulnerability exists; it does not establish that the production scanner reliably detects all SQL injection risks.

## Environment limitation remains

A project-level `npm install --no-audit --no-fund` attempt timed out after 120 seconds. No project `node_modules` were available, so project Jest tests, TypeScript typecheck, lint, and Next.js production build remain unverified. No model credentials were provided, so no live LLM mission was executed. These must be run on a machine with package registry access and valid local model credentials.
