# TIP-V2-545 — Collection clock/calendar correction (PARTIAL)

Admin MSW fee-action HTTP boundary now supplies Date.now(), while the domain
retains an injectable fixture clock. Separate calendar helper matches native
membership-fee/domain/fee-period.ts: twelve UTC months, clamped month end.
No production backend change or provider call.

Focused tests: shared4/4 and Admin HTTP1/1 (direct command output). Cover leap
year, leap-day clamping, preserved milliseconds and future-expiry renewal.
Initial root test exposed two old assertions requiring exactly365 days across
a leap year. Their fixtures now explicitly set future2027-10-31 and assert
exact2028-10-31; native BR-05 requires calendar months, not fixed milliseconds.
Original failures retained. No E2E assertion changed.

Fresh immutable `.next-msw-v2p5-545` Portal/Admin builds both exit0.
Browser: MSW2pass/1fail53.8s. The original paidAt failure is passed, as are
exact12months and Admin status. Now the live Portal gate remains present after
20seconds: this is newly observed, not merely inferred from code. Existing
two new-member regressions pass. Need mock membership-change subscription;
do not hide this failure with reload, waiting-state injection or a lane fork.

Native same3/3 PASS42.5s; required/demo/flush all0, restored=true. Native
source backend159fc82b/UIed9dbccc remains unchanged. No full232 result claimed.

Evidence: `evidence/v2-545/`. Root final rerun recorded separately. This is
only the clock/calendar checkpoint; TIP545 remains PARTIAL until live mock
membership propagation and unchanged browser acceptance pass. Final P5
coverage, audit/parity and dev-to-main owner-review PR remain pending.

Final545b root lint/typecheck/test/depcheck all exit0. Unit1302 passed and
2 existing skips;6 successful tasks,4 cached. This does not override the
still-red MSW live-update browser assertion. Clock/calendar changes are
checkpointed separately so the remaining propagation fix stays traceable.

## Live propagation correction (545c)

Added a mock-only, same-origin relay storage subscription. Validated financial
snapshots are compared only for the current member's fee status/expiry/code/
amount; unrelated accounts, identical reads, malformed data and wrong relay
origin/path/fixture do not trigger a read. The hint is not session data: Portal
fetches the ordinary authenticated membership API and updates Query/session.
No broad polling or test reload added. Listener is cleaned on unmount/user
change; late dynamic imports cannot install it. Native socket path unchanged.

Shared10 new invalidation controls and Portal3 hook controls pass. Focused
results were direct tool output. Final545c root lint/typecheck/test/depcheck
all exit0:1315 passed +2 existing skips,6 successful unit tasks/4 cached.
Fresh545c Portal/Admin MSW builds pass; unchanged browser3/3 PASS including
live closure before reload. Original544 clock failure and545 live closure
failure remain committed. Evidence: `evidence/v2-545c/`.

Native same assertion3/3 passed42.5s in545 with demo restored; native binaries
remain backend159fc82b/UIed9dbccc. New hook is disabled on native (unit checked),
but a final fresh native build/full registry is still required before P5 signoff.
P5-MSW-FEE-CLOCK-01 and P5-MSW-FEE-LIVE-01 now fixed in scoped regression.
This supersedes the earlier PARTIAL propagation finding, not overall P5 status.
