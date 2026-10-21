# TIP-V2-546 — Fresh bank payment linkage (PARTIAL)

Added same-assertion UAT-09/AT-NR01/LK-02/REQ-402 flow with unique registration,
own transfer content, real fake-bank plumbing, live activation, actual Admin
fee identity/amount/time/calendar period and persisted Portal membership.
Only native FakeBank delivery differs; no assertions branch by lane.

MSW on fresh545c builds:1/1 PASS19.7s. Native fails twice at Community access:
payment toast and both popup closures pass, but Community shows load error.
Second run with trace confirms /groups returned402 before payment, with NO
subsequent /groups request after activation. No backend500 inferred. Admin
fee assertions are not reached in native. Preserve failure; refine547 retries
only membership-denied queries upon activation. No test reload workaround.
Both native runs restored required/demo/cache, all0. Backend159fc82b/UIed9dbccc.

Root546 lint/typecheck/test/depcheck all0; unit1315pass+2existing skips (cached).
Registry233, not a full233 execution. Evidence `evidence/v2-546/`; private trace
retained outside Git because it may contain auth/session/request details.

Previous545d expanded MSW35:34PASS/1FAIL4.7min. UAT-11 password-reset login
times out at the exact login button; snapshot shows `loading Đăng nhập` and
previous invalid-password message. This is a separate unresolved observation,
not proof that reset credentials are wrong; original log preserved. Do not
claim expanded regression green or erase it with a rerun.

P5 remains active; full current native/MSW, outstanding UAT/AT/LK, audit,
parity and final dev/owner-review PR remain required.
