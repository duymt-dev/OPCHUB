# TIP-V2-548 — Focused P5 browser acceptance, IN PROGRESS

Existing8 bot cases are running in separate MSW/native lanes (548 runners).
Both have passed the4 Admin CRUD/settings cases; automatic lifecycle waits
actual five-minute spacing. No completed8/8 result claimed at this checkpoint.

Added one missing REQ141/D51 browser case plus a separate UI fixture helper:
actual eligible persona configuration/automatic publication, emergency stop,
hide from open member chat without reload, real-member message preservation,
Dashboard absence, terminal thread beyond its original nextAt deadline.
No lane branches, HTTP fulfillment or direct database setup. All typed results
use shared schemas. Permission/audit/race integration controls are separate.

New case NOT RUN yet: await the current lanes before resetting native or
binding MSW runner ports. Thus9 focused cases exist, current runners collected8.
Initial root lint failed because BrowserContext is not re-exported by the
custom fixture; import its type directly from Playwright, no fixture changes.
Final548b lint/typecheck/test/depcheck all0,1318pass+2existing skips (cached).
Original root failure and final gate receipts are kept in evidence/v2-548-gates.

Owner scope remains bot P5 only. No claim that global V2 matrix gaps or prior
membership/reset findings are resolved. Native binaries/processes unchanged.

## Completed focused runs

- Existing8 bot E2E: MSW8/8 PASS13.2min on fresh547 mock builds;
  native8/8 PASS18.6min, backend159fc82b/UIed9dbccc. Native required/demo/flush
  all0, restored=true. UAT15 full automatic lifecycle10.2/10.3min; native
  UAT14 actual reply4.5min (wall-clock deadline retained, no shortened assertion).
- New emergency/hide E2E: MSW1/1 PASS5.5min, including original nextAt wait.
  Native case is running separately; do not yet claim9/9 native.
- Fresh bot integration:106/106 PASS in23files,694.80s, native opchub_test5432
  and Redis2, FakeLlm.19 bot files + bot HTTP contract +3 Dashboard bot files.
  This is scoped P5 integration, NOT the full repository suite.

Receipts: `evidence/v2-548-bot/`. Source root gates remain548b all0.
Final bot-only requirement reconciliation, remaining native emergency result,
P5 parity and dev integration/owner PR are still required.
