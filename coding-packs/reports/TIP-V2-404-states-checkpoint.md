# TIP-V2-404 — additional state checkpoint (IN-PROGRESS)

Continue Affiliate/P4, then stop per the user's latest instruction; no P5 work.
This is not a completion report or approval of a visual deviation.

**Source committed and pushed: `5894b5b`.** Forced workspace unit gate: 739 passed
plus two existing skipped tests (Admin 262, Portal 163, shared 135, server 111,
UI 43, integrations 25). Forced lint/typecheck 16/16 tasks passed; subsequent
E2E-only lint/typecheck 2/2 and receipt-file lint passed after the final scoped
edits. Depcheck passed both graphs (1433/3939 and 666/2913). Final Admin MSW build
and fresh native Admin build passed. No assertion of new native browser
acceptance follows from these gates.

**Final MSW rerun on test follow-up `5a4349c`: 37/37 passed (1.6m).** The focused
mobile case is included, not added again to that total. Production/UI source
remains 5894b5b; 5a4349c changes only the mobile test's visible control selector.
This passing MSW suite does not close six raw parity failures or missing native
browser/audit acceptance.

## Committed-source verification

On `5894b5b`, the full Affiliate + Admin RBAC MSW rerun was **36/37**, not a
passing suite. Inline cancel/save/F5, concurrent writes, cross-origin bank/rate/
policy, first fee, renewal, lifecycle, payout retries and frozen-clock relay
passed. The mobile status/selection regression timed out; a
focused trace then proved AntD's radio input is intentionally invisible. Follow-up
`5a4349c` clicks its visible label without `force`, still asserts the radio is
checked and retains every URL/money/row/selection/reload assertion. Focused mobile
rerun passed 1/1; E2E lint/typecheck passed 2/2. The original exact-text selector
depended on whether the asynchronously loaded count was present; targeting the
visible segmented control avoids both accidental row clicks and a hidden input.
The raw trace stays private because it can contain authentication/network data;
only a selector/visibility diagnostic is archived. Its code excerpt reflects a
source edit made while tracing; the recorded action itself is `check` on 5894b5b.

The committed parity run was **8/14**, with unchanged threshold 3%:

| State | 1440 | 390 |
|---|---:|---:|
| D-84 default commissions | 1.42% | 1.12% |
| D-85 default detail | 0.93% | 2.26% |
| D-84-AFF default agents | 35.27% FAIL | 20.35% FAIL |
| D-84-AFF-Q actual HAOPC search | 1.10% | 5.80% FAIL |
| D-84-POL policy | 5.37% FAIL | 15.48% FAIL |
| D-85-CUS customer history | 1.82% | 4.92% FAIL |
| D-85-RATE visible inline editor | 0.93% | 2.24% |

Generated `ui-parity/results.json` records this exact source SHA; six failed
diffs are retained. Passing default/edit images do not waive failing states.

## Actual defects and corrections

- Added five independent states: default agents, HAOPC search, policy, customer
  history and individual rate editing, at both 1440 and 390. Default agents remain
  measured independently; searching HAOPC never replaces their failing image.
- The prototype edits a single agent inline, whereas the app opened a modal.
  The new leaf editor/hook retain backend permission checks, integer 1–50 input,
  cancellation, pending locks and error/retry semantics. Bulk editing still uses
  its separate dialog. The rate parity scenario now waits for the actual editor;
  its initial screenshot without that assertion did not prove edit mode opened.
- The customer badge must count history, including cancelled customers, not the
  converted statistic. HAOPC has 14 history entries but 13 converted customers.
  The previous geometry checkpoint's use of statistic 13 for the badge was wrong.
  A bounded size-1 customer query reads the backend total; no history is hidden,
  backend aggregate changed or amount calculated in the frontend. Unknown count
  is not shown as zero. Permission-denied and empty-id cases make no request.
- Detail history defaults to 8 rows, as the prototype does; the main list still
  defaults to 10. Explicit URL sizes remain valid, and 8 stays available after a
  size change. Paid receipts use the API's immutable bank, amount and paid date,
  never the live bank. A test supplies a commission deliberately different from
  fee × rate to prevent accidental frontend recomputation.
- Customer geometry now uses the prototype's column proportions/minimum widths,
  compact two-line receipts and per-table badge sizing. No screenshot masks,
  thresholds, seed timestamps, money, roles or business ordering were changed.

## Intermediate measurements (uncommitted work over d942d73)

The initial ten new-state images had only two pixel passes, one of which was the
unproven edit-mode state described above. Those results are diagnostic, not an
acceptance result. The first inline/history implementation then passed 6/8 for
default list/detail, editing and customers; customer images were 3.67% / 14.91%.
After the table geometry correction, 7/8 passed: customer desktop 1.82%, mobile
4.92%. Desktop/mobile default list/detail and actual edit mode stayed below 3%.
These runs carry the base commit in generated metadata because the source was
still dirty. A committed-source run is required before using them as final proof.

The first full MSW run was 35/37, not a pass. One test installed a ticking clock
and then tried to pause at its already-past initial instant; installation now
starts one minute earlier and pauses at the unchanged exact baseline, in both
the frozen-clock regression and parity harness. The mobile test selected exact
text that disappears once an asynchronously loaded count is appended. It now
selects/checks the status radio by accessible name and still asserts the URL,
actual cancelled row, money, selection and reload behavior. Neither correction
relaxes the financial or frozen-clock assertions. Full rerun remains required.

## Still open

- Customer mobile and the remaining agent/policy states are not accepted. The
  mobile customer footer retains the required page-size selector, absent from
  the prototype; it must not be hidden merely to obtain a passing screenshot.
- The genuine default agent set contains 62 automatic agents, not the
  prototype's six. Do not filter out paid members or rewrite the ledger to make
  that image pass. The mobile agent table still needs the prototype card layout.
- Policy must retain editable terms required by SRS/TIP. The prototype's static
  example does not authorize inventing a commission amount missing from the
  policy API or replacing the editable terms with fixed copy.
- Native browser AT-AF, audit/regression, all required state verification,
  TIP/P4 completion reports and main merge remain incomplete. Native API 44/44
  from the previous checkpoint is not evidence of native browser completion.

Evidence: `evidence/v2-404/states/`; both failed builds (initial strict CSS prop
type error, later invalid local build flag), the failed lint attempt, and failed
parity measurements are retained rather than silently treated as passes.
