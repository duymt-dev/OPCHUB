# TIP-V2-404 — selection/empty state checkpoint (IN-PROGRESS)

Registration **`4ab2b73`**, UI **`a853ba9`**, readiness **`2a589cb`**, committed
and pushed. P4 remains open; finish Affiliate then stop, no P5.

## Scope and delivered changes

- Four new comparable states (selection and no-result in both list tabs) expand
  the measured group from seven states/14 images to **11 states/22 images**.
  Impossible-query checks first assert a nonempty baseline, then zero rows.
  Selection checks identify the actual owner/customer and exact selected count;
  no arbitrary JS state, changed seed, hidden controls or masks.
- Feature-local bulk styling matches prototype action placement/28px controls,
  spacing, radius, count copy and white selected-row background. Selected
  checkboxes/count remain visible, preserving all selected IDs and callbacks.
  Keep required extra bulk-rate action and existing cancellation dialog.
- No shared UI component, API, price, ledger, bank, permissions or seed changed.
  Zero selection still renders no bulk wrapper, so baseline list layout is not
  padded by an empty child. Unit action/clear/export wiring remains checked.
- [Admin state inventory](../audit/V2-P4-ADMIN-STATE-INVENTORY.md) records these
  states and remaining dialog/pending/error/permission/receipt/native work.
  The inventory is OPEN, not a claim that 22 images cover the whole feature.

## Verified terminal runs

| Gate | Result |
|---|---|
| Forced lint/typecheck/unit | **22/22**, **804 units + 2 existing skips** |
| Unit breakdown | Admin 318, Portal 163, shared 140, server 115, UI 43, integrations 25 |
| Focused bulk units | **4/4**, included in 804; count-copy assertions added, actions retained |
| Final helper lint/typecheck | Both exit 0; exact count assertion tolerates whitespace only |
| Depcheck | Both pass: **1465/4026**, server **671/2935** |
| Fresh Admin builds | MSW/native pass, separate dist directories |
| Committed Affiliate/RBAC MSW | **44/44**, 1.5 minutes on UI `a853ba9` |
| Final raw parity | **16/22**, all rows measured on `2a589cb`, 56.9 seconds |

No native browser was run. Prior native API/contract 55/55 on `986930c` remains
historical API evidence, not a new browser run or a test-count addition.

## Before/after on the expanded group

Committed registration baseline `4ab2b73`: **14/22**, eight visual failures.
Final group `2a589cb`: **16/22**, six visual failures. The original seven-state
subset is unchanged at **11/14**; denominator expansion is not a regression of
all the previously passing screens.

| New state | Before desktop/mobile | Final desktop/mobile |
|---|---|---|
| Commissions selected | 4.2493% / 5.1552% | **1.4513% PASS** / **5.5311% FAIL** |
| HAOPC selected | 1.5546% / 5.5361% | **1.1244% / 1.9151% PASS** |
| Commissions no result | 0.5285% / 7.7236% | **0.5285% PASS** / **7.7236% FAIL** |
| Agents no result | 0.7289% / 6.5047% | **0.7289% PASS** / **6.5047% FAIL** |

Commissions mobile worsened despite fixing the bulk structure; no blanket
improvement claim. Existing failures remain agents default 24.1407%/27.6858%
and mobile policy 16.5967%. Both empty mobile screenshots were inspected:
prototype labels extend below/outside its card, while the app shows an explicit
empty message. No automatic waiver or attempt to hide that message.

## Failed attempts and evidence integrity

1. Initial prototype selector omitted CSS serialization whitespace and matched
   no rows: four selection cases failed; four empty cases falsely passed from
   that invalid selector. The corrected selector plus positive baseline guard
   produces **8/8 prototype-only paths**, not eight passing app comparisons.
2. First post-layout parity run had **13 pass / 9 fail**: five pixel failures
   plus four selected-label locator failures. Empty `BulkBar.unit` leaves a
   trailing text space; DOM/ARIA and unit trim assertions confirmed exact count.
   Readiness fix accepts whitespace only, retaining count, business assertions
   and the same 3% threshold. No target-dependent relaxation.
3. Those four failures happened before screenshots, so four old baseline rows
   remained in the merged JSON. A metadata check rejected that mixed-SHA group
   as current evidence. The final rerun asserts **all 22 rows SHA `2a589cb`**.
   Old screenshots/rows are not silently represented as new measurements.

## Remaining

Fix/review six current image failures; complete remaining inventory and SRS-only
visual evidence/deviation approval; native AT-AF/CSV audit/RBAC/locked browser,
seeded C1–C6/audit E2E and UAT/§22.6 reconciliation; final reports/P4 main merge.
No rejected native startup was retried. Final check found no listeners on the
seven P4 app/prototype ports; DB/Redis and protected services were not stopped.

Evidence: [`evidence/v2-404/list-states/`](evidence/v2-404/list-states/).
