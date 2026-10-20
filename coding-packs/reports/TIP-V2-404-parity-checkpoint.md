# TIP-V2-404 — geometry checkpoint (IN-PROGRESS)

**Source: `94b60c0`, committed and pushed.**

Correction from the subsequent state audit: the detail customer badge must use
the history total (14 for HAOPC), not the converted statistic (13). Source
`5894b5b` corrects this; the original observation below records the earlier
implementation, not the final expected badge. See
[additional state checkpoint](TIP-V2-404-states-checkpoint.md) for the expanded
coverage, inline editor and remaining failing states.

## Scope and measurement

Continue approved P4 on `feature/V2-P4-affiliate`; finish Affiliate, then stop as
requested by the user. This is not TIP-404/P4 completion and does not authorize P5.

Measured the actual prototype and app at 1440/390 with the existing fixed-clock,
external-image/font stabilization. Temporary probes only recorded DOM geometry and
were removed before the gates; their successful execution is not an acceptance test.

- The detail stat labels used an 18px line box instead of the prototype's normal
  16px box. Rate panel padding/gaps, 24px versus 22px value, 500 versus 400 button
  weight, tab labels/counts and table border/gaps displaced the monthly table.
- The detail customer badge uses the agent statistic returned by the API, not the
  current page length. HAOPC's statistic is 13 recorded/paid customers; its history
  also retains a cancelled customer (14 history rows). No history is hidden and no
  financial aggregate is recalculated in the frontend.
- The compact-search padding and inline segmented-control baseline inflated the
  toolbar height. The list card/tab spacing and table border now follow the live
  prototype instead of introducing a screenshot offset or mask.
- Mobile body rows were using a grid approximation. The prototype wraps the same
  financial cells as flex items. The 16px checkbox's AntD label still had a 22px
  line box, making a row 193px instead of 190px and accumulating vertical drift.
  Explicit label sizing restores the measured layout; both checkbox selection and
  clearing are covered by the mobile behavior test, with fee/commission visible.
- Pagination retains the required page-size control, with domain units “giao dịch”
  and “tháng”. Do not remove an acceptance-required control to lower pixel diff.

No API, migration, seed history, commission amount/order, paid bank snapshot,
permission, ended-month payout rule or production side effect was changed. The
prototype's static date-range control was not copied as a fake functional filter.

## Modular implementation

- Extract detail tabs into `affiliate-detail-tabs.tsx`; URL tab changes still reset
  page one. Explicit accessible names separate the label from its numeric badge.
- Add tests for the API statistic, zero and tab transition, plus the pagination
  unit without losing size controls.
- Adding the pagination unit pushed `CommissionTable` past its 80-line function
  limit. Extract its selection actions into `commission-bulk-bar.tsx` with dedicated
  callback/empty tests; no line-limit suppression or compact-format workaround.
- Update the two existing browser selectors to the exact new customer-tab name.
  Both MSW and native continue to execute the same assertions.

## Diagnostic history (not final acceptance evidence)

All figures below are raw pixel comparisons with the unchanged 3% threshold,
without masks, skipped screens or self-approved deviations:

| Iteration | D-84 desktop | D-84 mobile | D-85 desktop | D-85 mobile | Result |
|---|---:|---:|---:|---:|---|
| Before this checkpoint (`4ea72de`) | 3.4931% | 4.1351% | 1.3799% | 4.2046% | 1/4 |
| Initial typography/detail changes | 3.3749% | 3.9131% | 1.1863% | 4.4742% | 1/4 |
| Toolbar and detail spacing | 1.6511% | 3.3726% | 0.7973% | 1.7664% | 3/4 |
| Mobile flex rows, label still 22px | 1.6511% | 4.5307% | 0.7973% | 1.7664% | 3/4 |
| Flex alignment alone | 1.6511% | 4.5248% | 0.7973% | 1.7664% | 3/4 |
| Correct checkbox label/heading/money weight | 1.4234% | 1.1162% | 0.7973% | 1.7664% | 4/4 |

The old `4ea72de` baseline was D-84 3.4931%/4.1351%, D-85 1.3799%/4.2046%
(desktop/mobile). Pre-commit iterations record base SHA `6719f9c` in the generator;
they must not be presented as measurements of unchanged `6719f9c` source.

The first focused unit run caught an accessible-name concatenation (“đại lý73”);
the component now exposes a properly separated accessible name rather than relaxing
the test. The initial full lint caught the 84-line function and was fixed by the
bulk-bar extraction. Failed diagnostics are retained, not replaced by later passes.

## Verified gates on the final source

- Forced lint/typecheck: **8/8** tasks each; unit **725 passed + 2 existing skipped**,
  **6/6** tasks (Admin 248); depcheck both graphs pass.
- Fresh MSW Admin build after extraction; focused Admin operations/mobile **8/8**.
- Full Affiliate Portal/Admin/RBAC MSW on committed `94b60c0`: **36/36**, 2.7 minutes.
  Includes the focused cases; do not add overlapping runs into a larger total.
- Parity rerun after that suite on committed `94b60c0`: **4/4**. D-84 desktop/mobile
  **1.423449311% / 1.116163122%**; D-85 **0.797299383% / 1.766350076%**.
  Passed diff PNGs are removed by the existing reporter, not hidden by masks.
- Native Affiliate integration rerun: **44/44**, **18/18 files**, 174.16 seconds.
  Preflight verified exact local **opchub_test:5432** before starting; setup pins
  Redis database 2. Covers the actual domain/API/races/history/guards/query plans;
  this is not a native browser suite or the complete server integration suite.
- Fresh native Portal and Admin builds both exit 0, mocking off, `.next-server`,
  API/socket 4020/4021 and Portal origin 3280. Builds are not runtime acceptance.
- Browser services are shut down by Playwright. Final listener check found none
  on 3236/3238/4800 or native 4020/4021/3280/3282. No native startup bypass.

Evidence: [`evidence/v2-404/geometry/`](evidence/v2-404/geometry/).

## Remaining P4 gates

Default D-84/D-85 are only two states at two widths. Agent/policy/customer tabs,
dialogs and other required states still need coverage; do not claim every Affiliate
screen has passed from four images. Native browser acceptance/CSV audit, regression
audit, final reports and main merge remain required. No new native service is started
by these UI probes; the earlier rejected native startup is not retried via a bypass.
