# TIP-V2-501 — Implementation and focused acceptance complete

Verified code: `3f9967b2`, including owner-merged dev/i18n. Backend is unchanged
from `99100691`; the later corrections are UI Escape readiness and locale keys.
Release integration/owner-review PR is tracked separately in the P5 handoff.

## Criteria and evidence

All seven numbered acceptance criteria are mapped to actual assertions in
[P5 spec reconciliation](V2-P5-spec-reconciliation.md): due admission and per-turn
deadlines, skip-and-continue, pause/resume, 120-message/30-thread limits, NA-07,
concurrent idempotency. Additional tests cover quotas, actual BullMQ deadlines,
draft fencing, provider failures, real context, and 3–4-turn opener-closes plans.

- Fresh focused native integration: **108/108 in 24 files**, TIP551. No later
  backend/shared/db/integrations source changes; this is not a whole-repo
  integration claim.
- Final combined root gates: lint/typecheck/test/depcheck all zero, **1468 passed
  and 2 existing skipped**; five of six unit tasks cached. Root test graph was
  serialized after a Windows cache startup race, without dropping tests.
- Nine distinct P5 browser cases have passing evidence in both MSW/native lanes.
  TIP552 MSW9/9; native8/9 exposed script-drawer Escape. TIP553 corrected it and
  reran all four original Admin bot cases successfully in both lanes.
- TIP556, after latest dev/i18n integration: original Admin4 plus live reply1
  **5/5 in each lane**, same assertions. Actual automatic lifecycle remains
  proven by TIP552 (MSW10.2min/native10.4min), with real spacing and Dashboard.

Receipts: `evidence/v2-551-integration`, `v2-552-merged-browser`,
`v2-553-drawer`, `v2-555-dev-integration`, and final P5 handoff evidence.

## UI and scope

Owner accepted spec-required Admin deviations (DV-V2-P5-1) and native Dashboard
unmatched-data visual-testing debt (DV-V2-P5-2). Raw differences remain red;
no pixel parity PASS, full V2 acceptance, or full real-provider suite is claimed.
Native providers stay fake. Historical real-provider evidence is bounded by
TIP527, not represented as a new real-provider run.

No pending bot behavior defect identified by this focused acceptance. Preserve
native ports/data for owner review; `main` may only change through owner merge.
