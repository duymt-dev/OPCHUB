# TIP-V2-404 — renewal, relay readiness, compact toolbar (IN-PROGRESS)

## Source checkpoints

- `8d04869`: AT-AF04 really renews the first-fee customer's membership, then checks
  one unchanged commission in Admin and the owner's Portal after reload. Initial
  focused MSW 2/2; forced 714 unit passed + 2 existing skipped.
- `8635d63`: relay host announces readiness after hydration to the exact same-host
  HTTP(S) parent origin. Six new unit cases; focused frozen-clock/renewal/mobile
  browser 3/3. Forced 720 unit passed + 2 existing skipped; fresh MSW builds pass.
- `4ea72de`: constrain the mobile toolbar wrapper to the card; test its actual outer
  compact box, not only the clipped inner input. Wait for both filtered AF0 namesakes
  before selecting the specific customer/agent pair in the cross-origin test.

## Final authoritative runs

- `committed-msw.log`: **36/36 passed on committed/pushed `4ea72de`**. Includes the
  focused cases; do not add counts from overlapping runs. Covers Affiliate behavior
  and Admin RBAC, not every UAT/audit/native case.
- `compact-{lint,typecheck,unit-all,depcheck}.log`: forced 8/8 lint, 8/8 typecheck,
  6/6 test tasks, **720 passed + 2 existing skipped**; two dependency graphs pass.
  E2E lint/typecheck rerun after the final test synchronization edit.
- `compact-admin-build-final.log`: fresh MSW Admin build before final browser runs.
  Portal build from the relay checkpoint is unchanged by the CSS/test-only commit.
- `committed-parity.log`: **1/4 pass**, unchanged 3% threshold, no masks or skips.
  D-84 desktop 3.493087855%, mobile 4.135059824%; D-85 desktop 1.379861111%,
  mobile 4.204616522%. Exact measurements/SHAs and failed diffs are in ui-parity/.

## Retained diagnostics (not passing gates)

- `responsive-before.log`: initial test-author fixture-name mistake, corrected using
  the actual cancelled AF0 customer. Not a product defect.
- `renewal-parity-before.log`: first D-84 timed out at login with the clock paused;
  run interrupted after identifying the missing hydration handshake. No pixel result.
- `relay-ready-parity.log`: readiness restored, but the three existing visual failures
  remained. Its recorded base SHA is `8d04869`; readiness code was not committed yet.
- `relay-ready-msw-regression.log` / `compact-admin-build.log`: interrupted run/build
  after a build was mistakenly started against a dist in use by browser services.
  Not a valid full-suite gate; services stopped and Admin rebuilt before later runs.
- `compact-msw-regression.log`: **34/36**, first-fee redirect timed out at 5 seconds
  under concurrent unit load; cross-app checkbox clicked while the debounced search
  still displayed old rows. First-fee timing root cause is not proven fixed.
- `compact-filter-count-diagnostic.log`: **35/36**; first-fee passed unchanged,
  cross-app failed a newly added but incorrect expected row count. AF0 has two
  different customers named Kiều Văn Sơn (`c16/a3`, `c35/a5`), not duplicated money.
  Correct synchronization waits for both filtered customers, then selects the exact
  customer/agent pair. Final 36/36 passes without a timeout increase or skipped case.
- `compact-focused.log`: corrected cross-app + outer-wrapper browser assertions 2/2.

Logs are normalized UTF-8 and conservatively redacted. Browser trace ZIPs remain
private, not in the repository. Native seed regression 15/15 is earlier evidence in
payout-browser/; it is not native browser acceptance of these new cases.

**P4 remains open:** native browser/CSV audit, UI parity, regression audit, completion
reports and merge. Honor the user's stop after Affiliate/P4; do not start P5.
