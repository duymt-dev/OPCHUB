# TIP-V2-404 — commission status menu checkpoint (IN-PROGRESS)

Source **`cbf9eaa`**, committed/pushed. Finish Affiliate/P4 then stop; no P5 work.
This fixes one real presentation gap, not overall P4 acceptance.

## Cause and correction

The prototype keeps the status-menu trigger on every commission. The app rendered
an action only for recorded rows. Paid/cancelled mobile cards consequently lost
their inspection control and their action areas collapsed. Fresh 390px geometry
showed identical summary and first recorded-row positions; the table was **1676px
versus prototype 1844px**, not a misplaced bulk bar.

The feature-local `CommissionStatusMenu` now renders all three status options for
every row. Only recorded-to-cancelled may delegate to the existing required-reason
confirmation. Direct payment and restore are disabled; paid/cancelled remain
terminal. View-only inspection is safe, while permission keys, preview/revocation,
the parent guard and backend still gate cancellation. No role-name checks.

The corrected table measures **1844px**, matching the prototype. The full app
card remains 54px taller because required controls/layout remain; no empty padding,
hidden data, seed change, synthetic financial calculation or comparison mask.
No backend API/ledger/permissions/schema/dependency/shared component changed.

## Verified terminal gates

| Gate | Result |
|---|---|
| Forced lint/typecheck/unit | **22/22 tasks**, **828 passed + 2 existing skips** |
| Unit breakdown | Admin 327, Portal 163, shared 140, server 130, UI 43, integrations 25 |
| New menu units | **6/6**, included in 828: only cancellation delegates; terminal/read-only/preview/revoked actions blocked |
| Depcheck | **1471/4045**, server **680/2954**, both pass |
| Admin production builds | Separate MSW `.next-msw-v2` and native `.next-server`, both pass |
| Final e2e lint/typecheck | Both exit 0 |
| Full committed Affiliate/RBAC MSW | **50/50 in 21 files**, 1.7 minutes; two new 360/390 menu cases included |
| Fresh raw parity | **17/22 on `cbf9eaa`**, 53.9 seconds; every row's SHA verified |

The new browser cases inspect all statuses on recorded/paid/cancelled rows,
check the paid menu fits the viewport, require the reason dialog for cancellation,
and prove closing it makes zero Affiliate writes. Disabled terminal actions never
restore/pay; cancelled status persists after F5. These are browser mock tests with
the same assertions registered for server mode, **not a native browser run**.

The previous native API/contract **57/57 on `bc03c9f`** is historical here; no
new native integration/browser result is claimed. Static C4/C5/C6 remain the
separately documented source preflight, not the requested final seeded audit.

## Raw visual result

| State | Before `2a589cb` | Current `cbf9eaa` |
|---|---|---|
| Selected commissions, 1440 | 1.4513% PASS | **1.2932% PASS** |
| Selected commissions, 390 | 5.5311% FAIL | **2.4252% PASS** |

The other twenty measured rows are unchanged. Expanded group improves **16/22 →
17/22**; original seven-state group remains **11/14**. The selected-mobile diff
is removed by the report generator because it now passes, not by a manual waiver.
Before/after actual app/prototype PNGs were inspected and retained in evidence.

Five raw failures remain: default agents **24.1407%/27.6858%**, policy mobile
**16.5967%**, empty commissions mobile **7.7236%**, empty agents mobile **6.5047%**.
Keep all 62 actual agents, editable terms and empty guidance. Existing deviations
remain pending review; no threshold relaxation, mask, skip or approved exception.

## Evidence integrity and remaining acceptance

Initial unit helpers used unavailable jest-dom matchers; exact DOM attribute
checks replaced them. The first build rejected a Testing Library `exact` option;
an anchored name regex fixed its type error without relaxing matching. Those
terminal failures are retained; the final forced gate and both builds passed.

Fresh before/after geometry used the existing stabilized parity navigation;
supplemental diagnostic runs are not additional application acceptance tests.
Historical before PNGs are from `2a589cb`, fresh baseline geometry from `a5683d3`,
and after geometry/PNG/parity from the unchanged UI in `cbf9eaa`.

Open-menu pixel states, other inventory/receipt/error/permission states, native
Portal/Admin/CSV audit/AT-AF/AT-RB/AT-LK/UAT/§22.6, post-seed final audits, final
TIP/P4 reports and main merge remain open. Do not mark P4 or the goal complete.

Evidence: [`evidence/v2-404/status-menu/`](evidence/v2-404/status-menu/).
