# TIP-V2-404 — Popup layout checkpoint (IN-PROGRESS)

## Scope and source

Production UI **f394dc5**, strict browser paint readiness **f91f499**; both
committed and pushed on `feature/V2-P4-affiliate`. This is not TIP/P4 completion.
Continue native acceptance, complete inventory and final audits/report/merge;
stop after Affiliate/P4, do not implement P5.

Feature-local `commission-status-menu.tsx` and new CSS module now use a full-row
anchor, bottom-right placement, 180px popup, compact options, colored status dots
and a trailing current-state check. Current state remains aria-disabled but
readable. Default overflow adjustment remains enabled. The semantic trigger is
keyboard focusable; no shared UI, money calculation, seed, API, ledger, dependency,
permission or migration changes.

Only recorded-to-cancelled with the existing permission/preview/revocation guard
can open the mandatory reason dialog. Paid/cancelled restoration and direct
payment remain disabled. Safe read-only inspection is not a write exemption;
parent/backend guards remain authoritative.

## Red checks retained, not hidden

- First typecheck/build rejected optional CSS-module exports under strict exact
  optional property types. Fixed with empty-string fallbacks, not any/ts-ignore.
- Initial focused browser **0/2** measured a 264/294px popup, not the required
  180px: rc-dropdown matched its new full-row anchor via inline min-width.
  Scoped CSS `min-width: 180px !important` fixes that real sizing conflict.
- First committed full MSW on f394dc5 was **51/52**: the 360px keyboard case
  measured width zero while the popup was opening. f91f499 explicitly awaits
  visibility, real parent opacity 1 and measured width 180 before asserting
  viewport bounds. Same final width/bounds assertions; no timeout increase,
  force-click, injected opacity, retry increase or relaxed target.

## Verified gates

| Check | Terminal evidence / scope |
|---|---|
| Final production lint/typecheck/unit gate | 22/22, 19 cached / 3 executed; Admin 330 units freshly executed; repo total **831 pass + 2 existing skips**, including unchanged cached tasks. Not a forced whole-repo rerun |
| Final test-readiness gate | 22/22, 20 cached / 2 executed (e2e lint/typecheck) |
| Menu component units | **9**, including three new current-marker/disabled cases; included in 831, not additional |
| Dependency boundaries | 1475 modules/4055 dependencies and server 680/2954, no violations |
| Final Admin builds | MSW `.next-msw-v2` and native `.next-server` both pass after width correction; native build is not native browser acceptance |
| Focused menu browser | 2/2 at 360/390; final readiness repeats **6/6 executions = two distinct cases times three**, not six new cases |
| Full Affiliate/RBAC MSW on f91f499 | **52/52**, 2.2 minutes, both keyboard cases included; no fresh native browser/API claim |
| Full raw parity on UI f394dc5 | **27/34**, all 34 rows verified at that SHA; later f91f499 only changes behavior-test waits, not UI |

The final keyboard cases open the paid menu using focus + Enter, require 180px
width and viewport bounds, inspect disabled terminal operations and recorded
reason-dialog behavior, check zero writes when closing, and verify F5 state.
Existing lint warnings remain visible in logs; no zero-warning claim.

## Raw parity, unchanged 3% threshold

| Open menu | 1440 before → after | 390 before → after |
|---|---|---|
| Recorded | 1.5307% → 1.5381% | 1.3336% → 1.2027% |
| Paid | 1.6691% → 1.6624% | 1.5115% → 1.3973% |
| Cancelled | 0.6550% → 0.6640% | **5.1425% → 4.7331% FAIL** |

Before: c353134 snapshot in `evidence/v2-404/commission-states/`. After:
`evidence/v2-404/popup-layout/parity-f394dc5.json`. Two desktop menus regress
slightly while still passing; no claim that every image improves. Several other
desktop rows also change slightly from the full-row wrapper. Pass/fail membership
stays the same: old 22-image subset 17/22, added twelve 10/12. This remains only
17 registered states, not the complete acceptance inventory.

Seven failures remain OPEN: default agents 1440 **24.1407%**, 390 **27.6858%**;
policy 390 **16.5967%**; empty commissions **7.7236%**; empty agents **6.5047%**;
cancelled filter **5.2758%**; cancelled menu **4.7331%**. No mask, threshold,
skip, seed reduction, hidden required controls or automatic deviation waiver.

Inspected real cancelled-menu app/prototype mobile images: current blue row,
trailing marker and 180px popup now render. Small placement differences and a
full-page sticky-header position difference remain. Required pager/control height
must not be removed or compensated with fake padding just to force a pass.

## Evidence and remaining acceptance

`evidence/v2-404/popup-layout/` contains thirteen normalized/redacted terminal
logs (including the failed attempts above), source file manifests and the 34-row
snapshot. Live aggregate `ui-parity/results.{json,md}` retains historical results
outside this group; do not treat every aggregate row as freshly rerun.

Native API/contract **57/57 on bc03c9f** remains historical, not a new native
browser run. Native browser/UAT/AT-AF/AT-RB/AT-LK/§22.6, remaining visual and
error/pending states, native CSV audit correlation, seeded final C1–C6/audit e2e,
completion reports and main merge remain unproven. P4 is not complete.

After the browser suite, the seven task ports 4020/4021/3280/3282/3236/3238/4800
had no listeners. Native Postgres/Redis and protected ports were not stopped.
