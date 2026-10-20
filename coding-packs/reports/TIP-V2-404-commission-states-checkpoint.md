# TIP-V2-404 — commission filter/menu coverage (IN-PROGRESS)

Registration/behavior **`2f4f2b1`**, capture guards **`33ac56d`**, paused-clock
paint readiness **`b2913fb` / `c353134`**, committed/pushed. No P5 work.

## Delivered scope

Six additional comparable states: recorded/paid/cancelled filters and each
filtered list with its first-row status menu open, at 1440 and 390. The registry
expands from **11 states/22 images to 17 states/34 images**; this is coverage
expansion, not proof that previously failing images improved.

Both sides navigate real controls. A positive nonempty baseline precedes every
filter; counts are 19 recorded, 31 paid, one cancelled, with at most ten rows on
page one. Every displayed row must have the requested status. No writes, seed
changes, arbitrary prototype-state injection, masks or threshold relaxation.

Two new behavior cases at 1440/390 verify all three filters, exact pager totals,
600,000 VND fee cells, URL state and F5 preserving the actual first row/status.
They use the same assertions in MSW/server modes; native execution is not claimed.

## False-looking green captures rejected

The first mechanical 27/34 result on `2f4f2b1` did **not** certify six open-menu
states. Image inspection showed missing menus. Shared `settle()` moves the pointer
away after scenario steps, closing the prototype hover menu. AntD's popup could
also be present in DOM while its parent remained at opacity zero on the paused
requestAnimationFrame clock. A pre-settle visibility assertion was insufficient.

The optional `beforeCapture` hook re-establishes/asserts transient UI **after**
fonts/network/animation stabilization. Only the new menu scenarios opt in; default
pointer clearing, masks, comparison thresholds and all existing scenarios remain
unchanged. Real hover/click actions reopen menus. They must have three items,
intersect the viewport and have actual popup opacity one before capture.

The first guarded run correctly failed all six app-menu captures at opacity zero,
leaving mixed old/new JSON rows. That mixed store is rejected as current evidence.
Advancing the already-paused clock before paint checks fixes RAF preparation,
without deleting the opacity assertion or editing runtime styles/DOM state.
Filter readiness also advances the clock after network settles and requires the
checked label's actual blue background, rather than accepting a stale motion frame.

## Verified gates

- Forced full gate after capture changes: **22/22**, **828 unit passed + 2 existing
  skips**. Same count: Admin 327, Portal 163, shared 140, server 130, UI 43,
  integrations 25. No new unit cases are claimed for the two browser tests.
- Final paint-readiness gate: **22/22**, twenty unaffected tasks cached, two
  e2e lint/typecheck tasks executed. Do not call that a second forced unit run.
- Depcheck **1473/4051**, server **680/2954**, both pass.
- Prototype-only navigation **12/12** before final capture guards: path evidence,
  not twelve passing app comparisons; its original hover screenshots are not
  treated as valid menu-image evidence.
- Focused filter behavior **2/2**, included in committed full Affiliate/RBAC
  MSW **52/52 in 22 files**, 3.2 minutes on `2f4f2b1`. Later commits change only
  parity harness/helper readiness; behavior assertions and production sources
  are unchanged. Focused repeats do not increase the unique count to 54.
- Production `apps/` and `packages/` are unchanged since `cbf9eaa`; reuse its
  verified MSW assets. No new native build/integration/browser run is claimed.
  Historical native Affiliate/contract remains 57/57 on `bc03c9f`.

## Final visual result

Final run on **`c353134`: 27/34**, seven raw pixel failures, 1.7 minutes. All
34 metadata rows are freshly on that source; no readiness timeout or stale menu
row is accepted. The original 22-image subset is unchanged at **17/22**; the
twelve new images are **10/12**, not a visual improvement of the original group.

| New state | 1440 | 390 |
|---|---:|---:|
| Recorded filter | 1.3803% | 1.0632% |
| Recorded menu | 1.5307% | 1.3336% |
| Paid filter | 1.5522% | 1.2628% |
| Paid menu | 1.6691% | 1.5115% |
| Cancelled filter | 0.6264% | **5.2758% FAIL** |
| Cancelled menu | 0.6550% | **5.1425% FAIL** |

All three app/prototype mobile menu pairs were inspected: menus are actually
painted, unlike the rejected first captures. Their popup placement/style and
short cancelled-list layout still need work; passing a full-frame threshold is
not a claim of identical popup geometry. Preserve the disabled restore/direct
payout operations and the app's required pager/CSV controls while fixing layout.

The five older failures remain default agents 24.1407%/27.6858%, mobile policy
16.5967%, and mobile empty lists 7.7236%/6.5047%. They were not replaced by filtered
rows or silently waived. Keep all real automatic agents and required terms/empty
guidance. Seven raw failures now reflects broader measurement, not seven new
product regressions. All remain OPEN without an approved visual exception.

## Acceptance still open

All remaining raw image failures, other inventory states (dialogs, receipts,
pending/error/permission/CSV/month/pagination), native browser AT-AF/AT-RB/AT-LK/
UAT/§22.6, final post-seed C1–C6/audit E2E, completion reports and P4 main merge
remain open. No persistent native startup was retried. Finish P4 then stop;
neither P4 nor the overall goal is marked complete here.

Evidence: [`evidence/v2-404/commission-states/`](evidence/v2-404/commission-states/).
