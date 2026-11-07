# DevPilot PS-001 hardening report

## Changes applied from the supplied screenshots

1. **API authentication:** Added `src/middleware.ts`. All API endpoints except the non-sensitive Supabase status probe require a valid Supabase bearer token when Supabase is configured. In production, missing Supabase configuration fails closed. Local unauthenticated use is explicitly limited to non-production with `DEVPILOT_LOCAL_MODE=true`.
2. **Browser auth propagation:** Mission Console and Code Studio now use `apiFetch`, which attaches the current Supabase access token.
3. **Jest diagnostics:** Removed `diagnostics: false`; ts-jest diagnostics now fail tests on TypeScript diagnostics.
4. **Font mismatch:** Replaced unresolved Geist CSS-variable references in Tailwind with a system font stack; no remote font download is needed.
5. **Generation persistence:** Added local SQLite persistence for successful generations and Supabase metadata insertion for authenticated users. Added a history endpoint and user-scoped local history queries.
6. **LLM rate limiting:** Added a basic per-process 10 requests/minute limit to the code-generation route. This is not a distributed limiter; use Redis/API gateway for multi-instance production.
7. **Sandbox deployment guidance:** Added a Docker runner image template and documented network isolation, read-only mounts, resource limits, non-root execution, and secret isolation.
8. **Documentation:** Added security/deployment notes and updated README.

## Important boundaries / unresolved production work

- The Dockerfile is a starting image, not an integrated remote execution service. Repository test execution remains disabled by default. Do not enable host execution for untrusted repositories.
- SQLite repository/mission records are currently single-instance local data. Although API authentication is enforced when Supabase is configured, full per-user ownership and RLS-backed storage for every repository/mission endpoint is not implemented. Do not deploy this as a multi-tenant service until that data-ownership layer is completed.
- The in-memory rate limiter resets on restart and does not coordinate across instances.
- Supabase Auth, email confirmation, migrations, HTTPS, and production secrets must be configured by the operator.

## Verification performed in this environment

- Source/configuration changes and ZIP packaging completed.
- Dependency installation was attempted but timed out; therefore Jest, TypeScript, ESLint, and Next production build were not run on this final source tree.
- No live Supabase or LLM credentials were available, so cloud auth, cloud generation writes, and real model missions were not exercised.

## Commands to run in a trusted local/CI environment

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

Only enable repository test execution after wiring a disposable isolated runner with network disabled and resource limits. Do not claim production readiness until all checks pass and multi-user ownership is implemented.
