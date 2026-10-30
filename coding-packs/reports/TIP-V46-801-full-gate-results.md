# V46-801 — terminal full gates and notification isolation (PARTIAL)

Latest frontend full-run source: `4ff6649b`; retained backend integration
source: `302174ed`. Later documentation-only checkpoint `c754548f` changes no
source/build input. #801 is not complete; visual gates remain.

## Current full MSW regression after frontend CSS changes

Root `pnpm e2e`, original handle **34354**, now **terminal exit0**:

```text
4 skipped
342 passed (23.0m)
```

**346 collected**, two workers, `.next-v46-msw-build` outputs, mocking=msw,
Admin Portal relaylocalhost:3000. This covers current Portal pricing/sidebar
CSS and Admin customer-table correction; it supersedes the outstanding final
frontend regression requirement, not the failing visual gates. All three801
browser files pass inside this whole run (cases319–321), customer responsive
360/390 cases113–114 and complete shell284–291 also pass. Same three existing
server-only DLPL cases and one existing@live skip; no test-count loss, new
skip/retry/deadline/assertion relaxation. Slow existing bot lifecycle10.4m and
emergency5.5m files explain the quiet verified waits; neither was restarted.

Log: `e2e/.parity-out/v46-801-full-msw-4ff6649b.log`. Source equality confirmed
with `git diff 4ff6649b..HEAD -- apps packages e2e` (empty). The rejected agent
table trial is absent from source and both current builds. Those actual
original browser files pass in the full run, not the trial's edited assertions.

Retain integration1894/1894 below: `git diff 302174ed..HEAD -- apps/server
packages/shared packages/db` is empty. No unrelated backend rerun. Native demo
was restored before this MSW run; this suite mutates only mock state. API28484,
socket33408, worker16200 keep original15:28–15:29 start times/binaries. No live
test runner remains; do not poll/restart terminal34354.

## Historical initial full-run and notification follow-up

The remaining sections preserve302174ed full-run evidence and db0a6df4
notification follow-up; their original unchanged-output statement applied at
that historical checkpoint, not after the later frontend CSS corrections.

## Full MSW regression — actual command passed

`pnpm e2e`, session **52127**, terminal **exit0**:

```text
4 skipped
342 passed (22.3m)
```

**346 collected**, two workers, current `.next-v46-msw-build`, mocking=msw,
Portal relay localhost:3000. The four skips are the three existing server-only
DLPL-stub cases and one pre-existing `@live` external-provider case. No new
skip/test removal/deadline increase/retry was introduced. The three new801
browser files all passed within this full run. Earlier322/20/4 failed result
is retained in historical reports, not relabelled green.

Log: `e2e/.parity-out/v46-801-full-msw-final-302174ed.log` (ignored local artifact).

## Full native integration — actual command passed

`pnpm test:int`, session **71620**, terminal **exit0**, root **23m39.947s**:

```text
DB:     Test Files 27 passed (27) / Tests 128 passed (128)
Server: Test Files 190 passed (190) / Tests 1766 passed (1766)
Tasks:  2 successful, 2 total / 0 cached
```

Total **1894 passed across217 files**, real native Postgres test/Redis2,
serial package execution. Server duration1321.19s. This is now a whole green
command, not a sum of a failed full run and selective reruns.

**Stderr retained:** four `Missing key ... moveToFinished` messages occur in
the existing `bot-reply-worker.int.spec.ts` stderr block. That test passes,
terminal summary reports190/190 files and1766/1766 tests, and no unhandled-error
summary is emitted. PG client deprecations remain. Do not call this log
error-free, suppress stderr, or claim the unrelated worker issue was fixed.
Log: `e2e/.parity-out/v46-801-full-int-final-302174ed.log`.

## Q-V46-801-15 — deterministic native notification precondition

The old REQ-210 initial2-unread check raced a legitimate daily onboarding
reminder. `db0a6df4` adds one setup call and a separate64-line helper, no
production/domain/seed change. MSW already seeds the demo as reminded today;
native now performs the real public auto-reminder action before UI login,
marks **only that actual reminder** read, verifies the second call does not
remind again, and requires exactly the original unread IDs m1-s1/m1-s2.
No notification deletion, fake notification, disabled reminder, mark-all-read,
arbitrary-count assertion or mode-dependent behavior assertion.

The complete unchanged-behavior shell file after setup:

- Native session74363: **8/8**,1.2m,exit0.
- MSW session46113: **8/8**,24.0s,exit0.
- Logs `v46-801-notification-native.log` / `v46-801-notification-msw.log`.
- Root precommit lint/typecheck8/8 each, unit6/6 **2085 +2 existing S3 skips**,
  depcheck2280 frontend/shared/e2e +1008 server modules,exit0. Unit cache is the
  immediately preceding forced all-package run: no unit/production file changed.

The helper was added only after full MSW52127 was terminal. Integration71620
briefly remained live, but imports no E2E helper/test file and its source was
unchanged; native follow-up uses dev/Redis1, not the integration DB/Redis2.
The helper is a no-op for MSW, preserving full342/4 evidence; the complete
affected shell file was nevertheless rerun in both modes. No new full E2E
run is required merely for a test-only server precondition with no MSW effect.

## Build scope, HOLD and open gates

Current forced MSW Portal/Admin build at302174ed:2/2,0cache,3m15.958s. Previous
server all-three-entrypoint build remains applicable: the only shared change
was a mock transaction error, not imported by production server. These actual
commands are in `TIP-V46-801-parser-checkpoint.md` and the earlier final-gate
checkpoint; do not claim an unfiltered `pnpm build` command that was not run.

After native follow-up, required seed + demo seed + dev-cache flush exit0;
HOLD binaries/listeners were not stopped or replaced, no `.env` change. All
verification handles in this report are terminal. Held runtime still4ba6fe16,
not the later SQL source. Full gate proof is not permission to close the TIP:
Portal pricing/mobile sidebar, P16 reachability and related Affiliate parity
remain FAIL/unverified as listed in `TIP-V46-801-acceptance-audit.md`. No802
started, no completion report/TIP-DONE, no threshold or scope reduction.
