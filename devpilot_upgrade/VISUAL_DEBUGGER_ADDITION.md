# PS14 Visual Debugger — additive update

This update **preserves all existing agents, mission workflows, repository analysis, and code generation**. It adds:
- `/debugger`: source editor, interactive React Flow source map, step navigation, highlighted source lines, debugging findings.
- `POST /api/debug/analyze`: bounded JavaScript/TypeScript static analysis using the existing TypeScript dependency.
- Links in the main navigation and Code Studio.

## Scope and honest limitations
This is an **initial static-analysis MVP**, not a full runtime visual debugger. Source-order edges do not represent observed execution. No code is executed, variables are not tracked at runtime, and root-cause suggestions are heuristic except for parser diagnostics. No external AI model is called by this new endpoint. A production PS14 implementation should add isolated execution tracing, verified variable snapshots, failing-test inputs/outputs, and an AI explanation service grounded in those traces. Do not present this version as already providing those features.

## Running
`npm install`, then `npm run dev`, visit `/debugger`. For full project verification run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` in a supported Node 22+ environment.
