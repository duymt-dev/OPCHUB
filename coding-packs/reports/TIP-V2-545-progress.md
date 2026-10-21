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
