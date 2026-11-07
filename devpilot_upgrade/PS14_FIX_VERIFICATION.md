# PS14: automated verification of suggested fixes

## Added
- AI explanation requests a `fixedCode` field containing complete runnable corrected source.
- The debugger displays the proposed source as an editable candidate.
- **Verify Suggested Fix** compiles/instruments candidate source with the existing trace endpoint and runs it in a separate opaque-origin iframe sandbox.
- Reports original output, proposed output, expected output, runtime errors, checkpoint count and pass/fail/inconclusive.
- A PASS requires original output to fail the expected-output check, and corrected code to execute without exception and match the expected console output.
- The existing agents, routes, and source debugger remain in place.

## Limitations
- Verification is for one specified expected console output, not a comprehensive test suite. It cannot guarantee the absence of other regressions.
- The sandbox is suitable only for trusted demo code; infinite loops may freeze the browser despite the timeout.
- AI-generated fixed code needs a configured LLM; otherwise users can paste a candidate after AI analysis is available.
- Run npm install, npm run typecheck, npm test, npm run build in your environment.
