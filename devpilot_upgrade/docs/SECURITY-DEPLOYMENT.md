# Security and deployment hardening

## Authentication

- `src/middleware.ts` protects every `/api/*` route except the public Supabase status probe.
- With Supabase configured, requests must carry a valid `Authorization: Bearer <access-token>`; the token is verified with Supabase Auth.
- Browser calls in the mission console and code studio use `apiFetch`, which attaches the current access token.
- Local unauthenticated development is allowed only when `NODE_ENV !== production` and `DEVPILOT_LOCAL_MODE=true`. Production fails closed when Supabase is missing.
- Supabase RLS policies remain required. Apply both SQL migrations before using cloud identity/history.

## Generation history

Successful generations are saved in the local SQLite `studio_generations` table. When Supabase Auth is configured, the same generation metadata is also inserted into `public.studio_generations`, whose RLS policies restrict access to the owning user. The generated source payload remains in local SQLite; the cloud table intentionally stores metadata only.

## LLM rate limiting

The code-generation route applies a 10-requests-per-minute per-IP in-process limit and returns HTTP 429 with `Retry-After`. This is a single-process safety guard, not a distributed production limiter. For multi-instance deployments, place a Redis/Upstash or API-gateway rate limiter in front of `/api/code/generate` and `/api/missions`.

## Test execution boundary

Repository tests execute untrusted code. Keep `DEVPILOT_ENABLE_TEST_EXECUTION=false` unless the host enforces an OS/container sandbox. Recommended runtime controls: non-root user, no network (`--network none`), read-only source mount, bounded CPU/memory/PIDs, no Docker socket, no host secrets, short timeout, and a disposable writable temp directory. `docker/test-runner.Dockerfile` is a starting image definition; it is not automatically used by the app. Build it in trusted CI and orchestrate test runs in an isolated runner service before enabling execution.

DNS/network isolation must be enforced by the container runtime or network policy; application-level command allowlists are not a substitute.

## Browser and fonts

Tailwind now uses a system font stack rather than undefined Geist CSS variables. This avoids a font-loading mismatch and does not require a remote font request.

## Remaining operational requirements

- Configure HTTPS, secure reverse-proxy headers, and a distributed rate limiter.
- Apply Supabase migrations and enable email confirmation / appropriate password policies.
- Keep service-role keys server-side only; this project uses the anon key plus user JWT and RLS.
- Back up SQLite data and define retention limits before public deployment.
- Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` in CI. Do not label the deployment production-ready until these checks pass in the target environment.
