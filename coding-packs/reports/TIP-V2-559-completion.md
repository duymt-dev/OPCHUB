# TIP-V2-559 completion — P5 OPEN bugs

Branch `feature/TIP-V2-559-p5-open-bugs` from `dev` ecc1b687. Native lane: API 4020,
socket 4021, worker, Portal 3280, Admin 3282, `opchub_dev`, Redis db1
(`D:/opchub-local/tip558-native.env`). MSW lane: Playwright-owned `next start`
(MSW builds) on Portal 3000 / Admin 3001 and copies on 3380/3381 with
`NEXT_PUBLIC_PORTAL_URL` set for Admin. All counts below are from the logs in
`reports/evidence/v2-559/`.

## Results

| Bug | Status | Evidence (real counts) |
|---|---|---|
| P5-NATIVE-PAID-CACHE-01 (S2) | FIXED (fix 2876a5cf, native accepted) | UAT-09 bank-fee-link native 3/3 consecutive PASS (14.3s, 13.9s, 14.8s), MSW 1/1 (15.9s); same assertion; demo restored |
| P5-MSW-RESET-PENDING-01 (S3) + P5-E2E-FLAKE-01 | FIXED, merged into one root cause | unit FAIL before / PASS after; MSW cohort (a-01-login + auth-flows, 22) before: 1 fail in 5 runs, 1 fail in 88 (repeat 4); after MSW 176/176 ×3, native 22/22 ×3 |
| P5-MSW-DIAG-01 (S4) | CLOSED-not-a-defect (harness) | 526 cohort `affiliate-payout bot-auto portal-shell` with `DEBUG=pw:webserver`: run1 12/12 err0, run3 12/12 err0; run2 aborted with 0 tests on `serve` `EADDRINUSE :::4800` |
| P5-MSW-FEE-CLOCK-01 (S2) | title corrected to FIXED (545c) | AT-LK02 UAT-10 accountant-fee-link native 1/1 (18.5s), MSW 1/1 (15.9s) |

## UAT-11 root cause

In the failing run (`uat11-before-msw-run2.log`) the second login
`getByRole('button', { name: 'Đăng nhập', exact: true })` times out at 120s. In the
diagnostic trace (not committed because it has cookies), the button's accessible
name was `loading Đăng nhập` and no second `/auth/login` request was sent. AntD
Button keeps its loading icon, whose label is "loading", during the leave motion
after `pending` turns false. So the exact-name locator can't match, and the timing
depends on load. Credentials, the reset link and the backend were correct, so the
backend was not changed.

Fix: `packages/ui/src/auth/login-panel.tsx` adds `SubmitButton` with
`aria-label={labels.submit}`. This is the same approach as P5-AFF-A11Y-01. Test:
`packages/ui/src/auth/login-panel.spec.tsx` (`P5-MSW-RESET-PENDING-01 UAT-11 ...`)
fails on the old source (`uat11-unit-before.log`) and passes after
(`uat11-unit-after.log`). `e2e/behavior/auth-flows.spec.ts` is unchanged, with no
retries, timeout change or loosened assertion.

**Scope note:** the TIP lists `apps/portal/src/features/auth/**` for an FE login
fix. The login form itself lives in the shared `packages/ui/src/auth/`, which the
Portal page only wraps, so the fix went there. No theme or global change.
**Cohort note:** the cohort is `a-01-login.spec.ts` + `auth-flows.spec.ts` (22 cases).
Before the fix: 5 MSW runs and one `--repeat-each=4` run (88). After the fix: MSW
`--repeat-each=8` (176) ×3 and native 22 ×3. The 545d 35-case list was not rerun
as such. Both before-fix shapes reproduced the failure.

## P5-MSW-DIAG-01 classification

The historical line `[WebServer] Error:` (v2-526) and
`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL ... failed in apps/portal` (v2-404, v2-548) both
appear only after the last test has passed, during webServer teardown. The webServer
command is `pnpm --filter ... exec next start`. When Playwright terminates it, the
pnpm wrapper reports a non-zero child exit. The run exit code stays 0 and no test is
affected. The current repro does not print the line: run1 and run3 show a clean
`Terminating/Terminated the WebServer`. A separate harness race was observed: when a
run starts while the previous `serve` still holds port 4800, `serve` fails with
EADDRINUSE and Playwright aborts with 0 tests. That is a loud failure, not a hidden
pass, and it is out of scope here (recorded, not fixed).

## Gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0 (`gates.log`).

## Native HOLD

After measuring: `seed` 0, `seed:demo -- --affiliate` 0, `flush:dev-cache` 0 (26 keys,
db1). Health: API `/v1/health` 200, Portal/Admin `/login` 200, socket 4021
listening, worker running (`native-health.txt`). Services stay up.

## Not done

- 545d 35-case cohort was not rerun as such (see cohort note).
- Port 4800 EADDRINUSE harness race: recorded only.
- No VPS action.
