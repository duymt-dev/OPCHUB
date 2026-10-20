# TIP-V2-404 — agent bank and period presentation (IN-PROGRESS)

**UI source `10a3c71`; browser-readiness follow-up `fc642f6`, both pushed.**
This is a P4 checkpoint, not TIP-404/P4 completion. Finish Affiliate/P4 and
stop; do not implement P5.

## Implemented

- Agent identity renders the API's current bank holder/name/account, or the
  explicit missing-bank warning. It does not substitute a historical receipt
  or derive an account from `hasBank`; detail/customer receipts remain separate.
- Customer/revenue columns use `lifetime`; monthly commission/count/status use
  `period`. A paid September displays its paid commission, not zero unpaid
  balance, while lifetime values stay unchanged. No frontend monetary arithmetic,
  additional row-detail calls, ledger/seed changes or API changes were added.
- Agent tab defaults to the current Vietnam calendar month. Explicit all months
  persists as URL `month=all`, survives F5 and is omitted from API queries; it
  is never sent to the API's YYYY-MM validator. Selecting a month resets page 1.
  The recent 24-month calendar retains an explicit older selection.
- The column header follows actual response metadata during placeholder loading,
  rather than labeling old amounts with a newly requested month. Switching to
  commissions clears the agent-only month filter.
- Mobile toolbar and pager geometry retain all-page CSV, month selection, every
  data cell, row selection and page-size control. Nothing is hidden to lower a
  screenshot diff. New leaf components/types/calendar helper remain modular;
  the largest touched TS/TSX/CSS file is 227 lines.

## Terminal verification

- Forced workspace lint/typecheck/test **22/22 tasks passed**, **758 unit passed
  + 2 existing skips**: Admin 276, Portal 163, shared 140, server 111, UI 43,
  integrations 25. The final gate includes the browser-readiness follow-up.
- Depcheck: **1448 modules / 3977 dependencies**, server **668 / 2924**; both pass.
- Final Admin MSW and native production builds pass. The test-only follow-up
  changes no production file, so those final artifacts still match UI source.
  Native build is not native browser acceptance; no native service was started.
- Focused MSW **3/3**: 360/390px cards retain all nine cells inside the viewport,
  selection/clear/detail/F5 and full-width empty state; the new period case
  verifies real bank, October 750k, September 900k/6 customers with lifetime
  13/7.8m unchanged, and all-month 1.95m/13 customers after F5.
- Final committed-source Affiliate + Admin RBAC MSW **40/40 passed (1.4m)**.
  Focused cases and repeats are included or reruns, not extra distinct tests.
- Ten additional unit cases cover supplied bank versus display name, API money
  versus unpaid balance, all four period statuses, Vietnam month boundary,
  all-month omission, historic calendar retention and query orchestration.

## Initial failures retained, not relabeled as passes

Initial typecheck found identity fixtures missing required `bank`; they now
provide explicit null and a separate real-bank case. Initial unit expectation
still expected no month for the newly current-month default; it now asserts the
current month, while a separate all-month test proves omission. A non-null
assertion in header selection failed lint; explicit narrowing replaces it.

The first full MSW run was **39/40**, with AT-AF02's Admin row absent after F5.
Three unmodified traced repeats passed. The test had checked a possibly already
visible row, not that its debounced search URL had committed. Follow-up adds
explicit query URL assertions before and after F5, preserving all money, owner,
bank, commission and cross-app assertions. Six focused repeats then passed,
followed by full **40/40**. The passing trace does not prove an unobserved failed
trace had a particular cause; no speculative production patch or weakened
native/MSW assertion was made. Raw credential-bearing traces remain private.

## Remaining acceptance

Fresh Admin parity on **`fc642f6` is 9/14**, not globally accepted. All fourteen
metadata rows reference that commit; threshold/masking policy is unchanged.

| State | 1440px | 390px |
|---|---:|---:|
| Commissions default | 1.42% | 1.12% |
| Agents default | **24.14% FAIL** | **27.69% FAIL** |
| Actual HAOPC search | 1.09% | 1.97% |
| Policy | **5.37% FAIL** | **15.48% FAIL** |
| Detail default | 0.93% | 2.26% |
| Customer history | 1.82% | **4.92% FAIL** |
| Inline rate editor | 0.93% | 2.24% |

The legitimate filtered mobile state improved from 6.99% to 1.97%; its old
failing diff is removed automatically. Default agents instead worsened from
16.58%/20.66% to 24.14%/27.69%, now rendering real bank/period information for
ten actual first-page agents rather than the prototype's six. This is not an
across-the-board visual improvement. The five failing diffs remain committed.

Default dataset remains 62 real automatic agents versus six prototype agents;
no real agents were removed to make pixels match. Policy, customer/mobile and
remaining state parity/native acceptance are not waived by functional passes.

Native browser AT-AF/CSV-audit/permissions, regression audit C1–C6 and audit E2E,
UAT/AT-RB/AT-LK/§22.6 reconciliation, live requirement trace, completion reports
and P4 main merge still require actual evidence. Prior native integration
**48/48 on `79f7073`** is historical evidence for the list contract, not a newly
run native browser suite. No retry bypassed the earlier rejected stack startup.

Evidence: [`evidence/v2-404/agent-presentation/`](evidence/v2-404/agent-presentation/).
