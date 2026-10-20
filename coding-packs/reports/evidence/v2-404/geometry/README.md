# Affiliate geometry evidence — source `94b60c0` (P4 still IN-PROGRESS)

## Authoritative final runs

- `geometry-{lint,typecheck,unit-all,depcheck}-final.log`: forced 8/8 lint, 8/8
  typecheck, 6/6 test tasks, **725 unit passed + 2 existing skipped**; both import
  graphs pass. Admin has 248 tests, including the five new focused cases.
- `geometry-admin-build-verified.log`: fresh MSW build after extracting the bulk
  actions to honor the function line cap.
- `geometry-behavior-focused.log`: **8/8** Admin/operations/mobile, including
  checkbox select/clear and both financial cells on the mobile cancelled row.
- `geometry-committed-msw.log`: **36/36**, full Affiliate Portal/Admin/RBAC suite
  on pushed `94b60c0`. Includes the focused eight; do not sum overlapping counts.
- `geometry-committed-parity.log`: **4/4** default D-84/D-85 images on `94b60c0`,
  unchanged 3% threshold, no masks or skips. Exact numbers and source SHA are in
  ui-parity/results.json; the reporter deletes diff PNGs for passed images.
- `geometry-native-api.log`: **44/44** integration tests, 18 files, 174.16 seconds,
  after checking the exact local opchub_test:5432 target; setup pins Redis DB 2.
  Not browser-native acceptance or the complete server integration suite.
- `geometry-native-{portal,admin}-build.log`: fresh native builds, mocking off,
  separate `.next-server` output. No native runtime/browser test is implied.

## Diagnostics, not additional acceptance-test counts

- `geometry-before.json`: compact geometry/font/spacing excerpts from the actual
  prototype/app before changes. Synthetic AF0 data only; no source prototype code.
- `row-label-before-{proto,app}.json`: row measurements during the fourth iteration.
  The app label still had a 22px line box around its 16px checkbox, versus 16px in
  the prototype; row heights were 193px versus 190px. The final patch fixes that
  wrapper rather than offsetting screenshots or trimming financial history.
- `layout-probe.log` / `row-probe.log`: temporary read-only probes; removed before
  gates. Their execution is not counted as parity acceptance tests.
- First/second/third/fourth parity logs retain the actual 1/4 and 3/4 failures;
  the pre-commit final run reached 4/4. They recorded base SHA `6719f9c` while the
  source was dirty; use the committed run for the final result.
- `geometry-unit.log`: initial accessible-name failure, fixed in the component.
- `geometry-lint.log`: initial 84-line function failure, fixed by extraction, not
  by suppressing the rule. Later passing logs do not erase these diagnostics.

No SQL, API, migration, money/order, bank snapshot or permission was changed.
Page-size controls and every financial cell remain available. Logs are UTF-8,
line endings normalized and conservatively redacted; private trace ZIPs are not
committed. Native browser/CSV audit, other UI states, regression audit, final P4
reports and main merge are still required. Stop after Affiliate/P4, not P5.
