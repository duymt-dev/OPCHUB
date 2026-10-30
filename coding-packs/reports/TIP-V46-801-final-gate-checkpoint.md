# V46-801 — full verification runners (IN PROGRESS)

Source under test: `4719e2ea` (production `9a9ad3ea`), docs-only HEAD
`498b59c0`. No source/test edits while these full runners are live.

## Build coverage — all three apps compiled, HOLD outputs isolated

| Scope | Command | Result |
|---|---|---|
| Server / all three entrypoints | `pnpm --filter @opchub/server build --out-dir dist/verify-v46-4719e2ea` | PASS, 17 files, 2.652s |
| Portal + Admin | `pnpm build --concurrency=1 --filter=@opchub/portal --filter=@opchub/admin` | PASS, 2/2 tasks, 0 cached, 3m11.698s |

Frontend env: `NEXT_DIST_DIR=.next-msw-v46-gate`,
`NEXT_PUBLIC_API_MOCKING=msw`, `NEXT_PUBLIC_PORTAL_URL=http://localhost:3000`.
Both Next builds compiled and ran their TypeScript/static-page steps. The server
uses the unchanged tsdown configuration with only its documented output-dir CLI
option overridden; no backend entrypoint omitted, no fake build/check script.
These are the actual commands, not a claim that unfiltered `pnpm build` ran.

The active E2E build `.next-v46-msw-build` and native `.next-server` were not
overwritten. The server's ordinary `dist/main-api.mjs` retained its 15:27:45
mtime; new output is nested in its separately owned ignored verification
directory. Original lazy chunks and held processes are untouched. Held runtime
remains `4ba6fe16`, not silently upgraded to later SQL. API/socket/worker PIDs
28484/33408/16200 still live. No `.env`, source configuration or DB-dev change.

Logs (local, ignored): `.parity-out/v46-801-server-build.log` and
`.parity-out/v46-801-frontend-build.log` under `e2e/`.

## Full integration — one runner, still live

`pnpm test:int` at `4719e2ea`; root uses `--concurrency=1`. Unified exec session
**20082**, log `e2e/.parity-out/v46-801-full-int.log`.

- DB **128/128 passed**, 27 files, 57.64s.
- Server suite continues; no whole-suite PASS claimed before terminal output.
- Worker stderr contains `Missing key ... moveToFinished/retryJob` around the
  existing real bot-worker suite. Record and inspect the terminal error summary;
  do not suppress errors, restart the run or infer success from a passing case.
- Only this one native integration runner uses Postgres test/Redis db 2. No
  second integration run or native E2E was started alongside it.

## Full MSW E2E — one runner, already exposes regressions

Actual command `pnpm e2e`, two workers, existing current MSW frontend builds.
Unified exec session **31525**, log
`e2e/.parity-out/v46-801-Full-MSW-e2e.log`. **346 tests collected**.

`git diff dev -- e2e/behavior` shows only three added test files (one case each),
no edits/removals of existing behavior tests. Do not skip old cases to retain a
nominal count. Full result is not yet terminal and is not green so far.

Concrete early failures to investigate once the runner exits:

- `admin-fees.spec.ts:30`: old expected `16.800.000đ` absent; actual current
  snapshot has total 10, paid 5, exempt 3, expiring 0 and annual summary
  `13.200.000đ`. The ordinary-fee status cohort changed with seeded directors.
  Confirm the exact native counterpart and existing summary definition before
  changing expected values; do not fabricate revenue or prior paid history.
- `admin-fees.spec.ts:61`: old six-tab / eight-member expectations exclude the
  required GDV tab and two newly included members. Other fee actions also fail;
  inspect each terminal trace, not just replace every number mechanically.
- `admin-members.spec.ts` several cases fail inside common setup waiting for
  literal `· 8 tài khoản`, before reaching their actual actions. Validate the
  native/demo ten-account precondition and preserve action assertions.

No test edits, retries, timeout increases or assertion relaxation were made
during this run. Full-MSW failures must be resolved and affected regression
scope rerun under the established cadence. Existing Portal/P16 visual findings
remain open; this checkpoint does not close #801 or authorize #802.
