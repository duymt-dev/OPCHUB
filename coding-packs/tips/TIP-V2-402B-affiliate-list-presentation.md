# TIP-V2-402B — Affiliate list presentation contract

Status: approved execution under the existing full V2 goal, following V2Q-178.
Bounded corrective API work for the required ver2 agent list, not server work
silently inserted into TIP-404 or a new financial/business rule.

## Scope

- Extend the existing protected list response with required `bank` (live account,
  nullable), `lifetime` (valid customer count/revenue) and `period` (requested
  month or null for all months, valid customer count, total commission, payable,
  paid and recorded/paid/mixed/none status).
- Keep every old field and its month-filter semantics unchanged. Do not conflate
  recorded balance with paid-period commission or lifetime with selected month.
- Add a dedicated list schema/type; keep detail/legacy row contracts unchanged.
- Fetch bank columns only after the existing deferred ID pagination join. Reuse
  existing bounded aggregate queries for page IDs; one extra aggregate only for
  a selected month, never SQL in a loop or one detail request per agent.
- MSW returns the same required schema. No migration, endpoint, permission,
  seed/timestamp, financial transition, audit/outbox or stack change.
- TIP-404 owns subsequent display, default month, parity and browser acceptance.

## Acceptance

1. Real native integration proves lifetime counts/revenue remain constant while
   selected-month aggregates change; recorded/paid/cancelled/mixed/empty periods,
   unequal rates and bank/null states are explicit. Old fields retain semantics.
2. Shared list schema rejects missing/invalid presentation fields. Mock tests use
   the same schema/expected values, without altering underlying ledger data.
3. Existing native Affiliate/contract/query-plan tests and forced workspace
   lint/typecheck/unit/depcheck pass; preserve equality/range indexes and deferred
   pagination. No new filter/sort or index is required for late-joined payload.
4. Commit/push scoped source and an evidence-based report; do not claim full P4
   or native browser completion from integration tests/builds.

Read AGENTS and backend/auth-rbac, backend/nestjs-modules,
database/query-indexing, testing/testing standards before implementation.
