# TIP-V2-539 — Registration mock records and delivery links

Scoped implementation complete; final gate receipts below. P5 remains IN PROGRESS.

## Changes and contract

Independent registration modules retain allowlisted public personal/business
fields, pending registration, activated Admin profiles and deterministic local
Fake mail queue/log. No submitted password/hash, OTP value, JWT or provider
credential enters community snapshots. Admin member filtering/sorting and mail
log/summary include the actual new identity, not a matching seed substitute.
Activation uses existing fee/referral/group functions, consumes pending state
once and queues one welcome. Snapshot restoration replaces registration-owned
admissions rather than replaying them; repeated restore does not inflate counts.
Composition validation rejects injected credentials/seed-ID replacement before
mutating any domain; legacy community payloads remain readable.

Native RegisterService/OtpService and HTTP_STATUS establish30minute pending,
10minute OTP, resend without pending still202, and OTP_INVALID422. Added expiry,
resend, one-shot activation and non-disclosure regressions. One legacy mock-only
unit expected400 for OTP_INVALID: initial root gate fails precisely there;
corrected to native422 plus exact error-code/message, not a loosened assertion.

## Browser failure analysis and verification

Retained original538 MSW0/2. The new native four-case run first passes mobile2
and fails both sent-mail polls (2pass/2fail). Its activation, new Admin row and
profile assertions already pass. The poll reloaded and synchronously counted
before client query render on every attempt. Replaced this with retrying the
same exact recipient/kind row count1 and sent-status count1 after reload, keeping
the same20second outer budget and identical code for both lanes. No endpoint
fulfillment, lane-dependent assertion, seed proxy, status alternative or skip.
Native rerun **4/4 PASS,52.1s**, required/demo/flush restoration all0.

Fresh isolated Portal/Admin `.next-msw-v2p5-539` production builds both pass.
MSW cohort includes registration2, mobile2 and existing auth/Marketing20; all24
individual results pass (terminal receipt captured alongside root gates).
P5-MSW-REGISTRATION-01 is fixed for these personal registration links. Business
activation/profile parity, all LK-01 Dashboard fields and other acceptance
requirements are not inferred from this personal-only browser scenario.

## Full native baseline received

The earlier535 native invocation is terminal0: **224/224 PASS,38.8minutes**,
native UI source ed9dbccc, backend159fc82b, test source2a853b89. Its finally
required seed/demo seed/dev-cache flush all0 and restored=true. These224 exclude
the four later mobile/registration cases. Do not call this one228-test run or
a full post539 mock regression. Native runtime was not rebuilt or restarted.
The matching full MSW224 receipt remains in538 evidence.

## Gate receipts and limitations

Initial focused shared cohort27/27 predates the additional expiry regression.
Final root gates: lint8/8 (6cached), typecheck8/8 (6cached), unit6/6
(5cached;1289passed +2existing skips), depcheck FE1633modules/4705edges and
BE774/3417, all exit0. MSW24/24 is terminal0,1.8minutes; webServer teardown
emits child-exit noise after the completed tests, not a case failure.
Original root wrong-status failure and both native red mail polls are retained
alongside passing reruns; secrets are excluded line-by-line, not asserted absent
from private raw logs. No production backend/DB migration/dependency/provider
change, no new real LLM call. Native demo remains available on3280/3282.

Evidence: `evidence/v2-539/`. Remaining work: full current-registry regression,
remaining UAT/AT/LK mappings/cases, audit C1-C6/browser, parity, final P5 reports,
dev integration and owner-reviewed dev→main PR. No P5-DONE or merge-main claim.
