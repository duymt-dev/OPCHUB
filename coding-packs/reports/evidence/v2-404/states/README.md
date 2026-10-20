# Affiliate Admin state audit — source 5894b5b

Test-only follow-up 5a4349c: final full Affiliate + Admin RBAC MSW **37/37 pass**
in `404-states-final-msw.log`. Focused 1/1 is included, not counted twice.

P4 remains IN-PROGRESS; this directory is not a P4 completion certificate.
Source files are listed in `source-files.txt`, directly from the Git commit.
Logs are UTF-8/newline-normalized with ANSI and sensitive lines removed.

## Gates

- `404-states-unit-all-final.log`: forced workspace tests, 739 passed plus two
  existing skips, six successful tasks. Earlier unit logs are diagnostic only.
- `404-states-lint-typecheck.log`: forced workspace lint/typecheck, 16 successful
  tasks. `404-states-e2e-gates.log` and `404-states-receipt-lint.log` check the
  final scoped changes. Existing image warnings remain, no lint error.
- `404-states-depcheck-final.log`: both import graphs passed.
- `404-states-build-final.log`: final Admin MSW production build passed.

## Failures retained

- `404-inline-admin-build.log`: strict CSS class prop typing failed initially.
- `404-customer-layout-build.log`: invalid local bots flag; corrected build uses
  `on`, not `true`. These are not passing builds.
- `404-states-gates.log` / `404-states-gates-final.log`: two lint failures in
  the new pending test's `act` callback, fixed without rule suppression.
- `404-states-msw.log`: 35/37, exact-time pause race and count-sensitive text
  selector. The committed rerun, not partial passes, is authoritative.
- `404-states-committed-msw.log`: 36/37 on 5894b5b; mobile regression timed out.
  This is not a passing suite. `404-states-committed-parity.log`: 8/14, six raw
  failures retained in the normal parity results/diffs, all with source SHA.
- `404-states-native-admin-build.log`: fresh native Admin build passed; this
  starts no native service and proves no native browser flow.
- `hidden-radio-diagnosis.txt`: selector/visibility-only extraction from the
  failed private trace. `5a4349c` clicks the visible label without forcing an
  invisible input and still asserts checked/URL/rows/money/selection/reload.
  `404-states-responsive-label.log` passed 1/1; segment gates passed 2/2.
  The raw trace is deliberately not committed (possible authentication data).
- Parity-before/inline/customer-layout logs retain real pixel failures; dirty
  runs show base SHA d942d73 and must not be mislabeled as committed proof.

## Runtime scope

MSW uses Portal 3236, Admin 3238 and prototype 4800, built with
`NEXT_DIST_DIR=.next-msw-v2`, mocking `msw`, bots `on`, Portal origin 3236.
Native build uses `.next-server`, mocking `off`, API 4020 and Portal origin 3280.
No native browser acceptance or audit is implied by a successful native build.
The earlier rejected native startup has not been retried by an equivalent bypass.

No masks/threshold changes or modified financial seed data are used to make
images pass. See `../../../TIP-V2-404-states-checkpoint.md` for open UI/data gaps.
