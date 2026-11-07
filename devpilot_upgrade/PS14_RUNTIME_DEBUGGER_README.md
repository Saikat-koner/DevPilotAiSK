# PS14 Runtime Visual Debugger — additive upgrade

## What was added
- `/debugger` now runs JS/TS snippets in an opaque-origin sandboxed browser iframe, with a restrictive CSP and a 3-second watchdog.
- `POST /api/debug/trace` instruments source code using TypeScript AST transformations and returns compiled instrumentation without executing it on the server.
- Actual execution checkpoints, line numbers, and best-effort in-scope variable snapshots are recorded and shown as React Flow nodes.
- Previous/Next replay controls, source highlighting, actual console output, expected-output comparison, and runtime exception display.
- `POST /api/debug/explain` calls the project's existing OpenAI/Gemini model service if configured, providing trace-grounded root-cause hypotheses, evidence, debugging steps, and suggested fixes.
- The previous static analyzer and all existing agents, API routes, and other pages are retained.

## Run
Node.js 22+, `npm install`, `npm run dev`, open `/debugger`. For AI explanations configure `OPENAI_API_KEY` or `GEMINI_API_KEY` per `.env.example`. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` in a network-enabled development environment.

## Limitations / safety
- The trace is statement-level, not a full instruction-by-instruction VM debugger. Snapshots include available variables declared in the same block and function parameters; closure state and complex side effects may be omitted.
- Browser sandbox has an opaque origin, no same-origin permission, no forms and no network via CSP. The 3-second timeout removes the iframe, but this is a hackathon prototype, **not a hardened multi-tenant code execution service**. Run only trusted demo snippets until stronger process/container isolation is implemented. Infinite loops may freeze the UI thread before the watchdog can fire.
- A 600-checkpoint limit caps stored traces but cannot interrupt an infinite tight loop without instrumented checkpoints.
- AI explanations require configured credentials, are suggestions rather than proof, and should be verified with reproducible test cases. The expected-output comparison is literal text comparison.
- Full project dependency install and regression checks were not completed in this execution environment. No claim of verified build is made.
