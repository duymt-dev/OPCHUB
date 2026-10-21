# TIP-V2-523 — Stable accessible payout action

## Failure and bounded correction

Full native browser217/221 and unchanged focused payout1pass/1fail retain the
failure. Trace confirms first payout POST409, bank PUT200 and no retry POST:
the exact button locator waits. The confirmation is still visible. Its AntD
loading icon contributes `loading` to the accessible name, including leave
motion. This is an action-name/accessibility defect, not evidence of a backend
idempotency or payment failure. Background motion timing is not independently
proven as its only trigger.

One translated aria-label on the payout button keeps its action name stable.
No backend, permission, bank, idempotency key, response or test assertion changed.
Dedicated component case fails before the fix, passes after, and checks that
clicking while pending does not submit twice. Existing conflict/same-key controls
remain unchanged. Initial typecheck caught a Playwright-only `exact` option in
Testing Library queries; removing the unsupported option retains exact string
matching. That diagnostic is retained.

## Evidence

- Focused component cohort: **11/11** in3files, including financial intent tests.
- Fresh MSW Admin build: unchanged payout **2/2**,54.3s.
- Native final Portal/Admin builds (mocking off, demo-account display off):
  unchanged A-01 + payout cohort **10/10**,1.0min. Includes the original failed
  V2Q-163 and AT-AF06, same dialog/key retry, paid amount and immutable snapshots.
- Root lint8/8 and typecheck8/8 (seven cached each) pass. Forced root units:
  **1198pass +2 existing storage skips**, six tasks/zero cached,2m31.079s:
  shared280/Admin436/Portal184/server203/UI43/integrations52.
- Depcheck: zero violations, FE1583modules/4519dependencies,
  server768/3400. Fresh builds pass.

Receipts: `evidence/v2-523/`. Native UI cutover checked both process identities,
absolute app paths and listening ports before either stop. Initial ownership
check rejected Windows path separators and stopped nothing; normalized absolute
paths then verified both. Only Portal/Admin restarted. API/socket/worker stayed
unchanged at4c1fd891; Portal includes0aef409f. Both login pages and correct API
`/v1/health` return200 (initial `/health` probe was the wrong route, not outage).
Required seed + demo seed + scoped Redis1 cache flush completed after tests.

## Scope limits

Full MSW221/221 at0aef409f precedes this aria-label-only patch; post-patch MSW is
the2case cohort, native the10case cohort, not a new full221PASS. Two other full
native failures (bot empty-history fixture and Dashboard bot precondition) are
still open. UAT/AT/LK worklists are not complete, real-provider calls have not
run, audits/parity/current full integration remain pending. No P5-DONE,
ready-for-review PR or main merge claimed. Native HOLD remains available.
