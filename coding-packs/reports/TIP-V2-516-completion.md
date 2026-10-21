# TIP-V2-516 — Moderation warning delivery / report-correlated retry identity

## Reproduced failures, not hypothetical acceptance
- MSW **2/2 failed**: resolving warn never delivered a member notification, and
  warning after source removal lost its sender/room identity.
- Native **1/1 failed** on opchub_test: retrying the same warned payload created
  two notification rows instead of one report-correlated notification.
  Both original MSW assertions and the exact native row assertion remain intact.

## Implementation
- Runtime report creation captures the actual sender/room/message FK identity in
  private state. Both manual and NA-07 automatic cases use it. Display names are
  never used to pick a warning recipient; personas/null senders queue no warning.
- Successful warn resolves/audits and enqueues a contract-validated deferred
  `moderation.warned` payload in the same synchronous mock action commit. The
  inbox worker/read path drains it once per report; no immediate notification in
  the Admin action, no warning on a failed/replayed409 action or other action.
- Native new outbox events include reportId; it is optional in the shared schema
  for compatibility with already persisted payloads. The native consumer supplies
  a stable per-report notification ID to the existing duplicate-safe repository.
  Different reports about the same message remain different warnings.
- A shared pure helper supplies the ID and warning type/title/body/link in both
  implementations. Source deletion does not lose captured identity; missing
  rooms are consumed without creating a notification, matching native behavior.
- Independent mock notification publication retains newest50 per recipient and
  stable runtime timestamps. The existing historical-seed time rebasing remains
  unchanged; mark-read retains the live timestamp and recipient isolation.

## Verified scope
- Expanded shared warning **11/11** plus old inbox **5/5**, **16/16 total**.
  Includes manual/automatic case identity, persona same-name isolation, delayed
  delivery/source removal, missing rooms/replay,50-row retention, timestamp
  stability, non-warning actions and reset isolation.
- Actual Admin HTTP **1/1** and Portal HTTP **1/1** workflows pass independently:
  deferred action/audit/409 replay and recipient inbox/mark-read/timestamp behavior.
  Shared domain preconditions are not cross-origin browser or socket evidence.
- Native focused notification/moderation **14/14 in3 files**, including three new
  integration controls: same-report retry, two reports/same message, legacy payload
  parsing and missing-room behavior. Redis2/Fake/native loopback5432 opchub_test.
- Root lint8/8 and typecheck8/8 pass (four cached tasks each). Forced repository
  units **1141 passed + 2 existing storage skips**, six tasks, zero cached:
  shared245/Admin425/Portal173/server203/UI43/integrations52. Depcheck zero
  violations, FE1563 modules/4417 dependencies and server767/3396.
  `evidence/v2-516/` retains sanitized before/after/native/HTTP/root gate receipts.
  Private raw failures remain as516-{msw,native}-before.log without overwrite.

## Explicit remaining acceptance / compatibility limits
- Legacy native payloads lacking reportId keep their previous delivery semantics;
  retry identity is proven for new case-correlated events, not guessed for old
  events whose distinct report identity was never stored.
- Human lock/account/session effects, historical ghost-account seed alignment,
  full auto/business-plan approval, catalog/live bridge, both complete browser
  lanes and real-provider E2E, UAT/AT/LK/audits/parity, final reports/dev integration
  and owner-reviewed dev-to-main PR remain open. This is not full NA-07/P5 DONE.
- No migration, dev data/build/process change or provider call. Last full native
 1300/1300 is the prior6ce5094b checkpoint; this is a new focused14/14 run only.
  Main is not merged and no new UI waiver is claimed.
