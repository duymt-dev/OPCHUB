# TIP-V2-543 — Actual registered-member fee/session and private credentials

Scoped implementation/regression complete; not P5-DONE.

Registration activation now returns the real allocated fee/memberCode and retains
submitted phone. Login builds Me from actual registration profile/current fee/
account status, not a demo proxy or stale activation copy. Fee codes use the
same six-digit padding as native; initial focused test exposed TV1001 after
removing OPCHUB NEW, so the allocator itself was corrected, not the regex.
That first focused shared cohort was1pass/1fail; rerun10/10 includes8 existing
registration controls and2 fee/session tests. The first failure was returned
directly by the command tool, not captured in a private raw logfile.

Portal-only mock credential adapter stores salted PBKDF2/SHA-256 verifiers in
a dedicated Portal-origin localStorage namespace. Submitted passwords never
persist, never enter Admin/cross-origin community/financial snapshots. Pending
credentials require valid OTP activation; absent/wrong passwords, unknown users,
expired pending, wrong ID, passwordless and malformed/injected records fail
closed. Fresh adapter instances/browser reload retain the actual verifier.
The existing locked-session guard remains authoritative on login.

Tests execute real Web Crypto. jsdom lacks SubtleCrypto; dedicated test setup
installs Node's real Web Crypto instead of bypassing password verification.
New Portal controls cover credential boundaries plus HTTP registration→wrong
OTP/login401→correct OTP→replay422→logout→wrong-password401→same-ID login.
Public snapshot exclusion checked in Portal and shared tests. Focused Portal
14/14 in3files. New modules/tests are separate and within file caps.

Initial root lint/build failed because the new HTTP test imported a snapshot
capture not yet exposed by the mock facade; added its narrow public facade
export, preserving the exclusion assertion. Both fresh543b MSW builds pass.
Root final lint8/8 (6cached), typecheck8/8 (5cached), unit6/6 (4cached;
1297pass +2existing skips), depcheck FE1641/4733 and BE774/3417, all0.

Strengthened canonical542 re-login with a real page reload after logout. Native
same2/2 PASS24.6s, required/demo/flush all0, restored=true. Native source/runtime
unchanged; no real-provider call. Fresh MSW targeted regression runs separately
after old540 runner is terminal and its ports are released.

Old540 full MSW is terminal0 **228/228,24.4minutes**, immutable539 builds; includes
the four537/538 mobile/personal-registration additions, but excludes later541
business and542 new-account cases. This is not a full post543231-case result.
Its full bot auto lifecycle10.2min/member reply38.4s also pass, original assertions.

Remaining: full current-registry regression,
other UAT/AT/LK fields/cases, audit, parity and final dev/PR deliverables.
Evidence: `evidence/v2-543/` (sanitized original failures and final receipts).

### Final browser outcome and stronger navigation check

Fresh543b MSW **34/34 PASS,2.1min**: auth14, Marketing6, affiliate3, membership4,
mobile2, personal registration2, business1, new-account2. Then strengthened the
blocked-menu action from clicking the current Community route to a different
Projects menu. Same2/2 PASS on MSW29.4s and native1.0min; re-login includes F5.
Native required/demo/flush all0 and restored=true. No new backend deployment.
Final543c root gates all0 after that test change (separate receipts); native
hold recheck uses the actual versioned `/v1/health` endpoint and all owned PIDs.
An initial diagnostic incorrectly probed unversioned `/health` and got404;
retained as a diagnostic mistake, not an API availability failure.

P5-MSW-NEW-MEMBER-01 fixed with these regressions, retaining original5420/2.
Registry stays231. Full post543231 run and remaining acceptance gates still
pending; neither old228 nor scoped34 is represented as full current acceptance.
