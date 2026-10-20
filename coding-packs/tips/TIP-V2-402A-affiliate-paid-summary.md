# TIP-V2-402A — Affiliate paid summary contract follow-up

Status: approved execution under the existing full V2 goal; bounded correction
identified by V2Q-174 while implementing TIP-404, not a new business rule.

## Scope

- Add integer VND `paid` to `affiliateSummarySchema` and the existing aggregate
  response `/admin/affiliate/summary`.
- Compute it in the same repository aggregate as revenue/totalCommission/payable:
  sum amounts whose status is `paid`, with the same optional month filter.
- Preserve all existing summary fields, auth, totals, endpoint and indexes.
- No migration, new endpoint, list query, financial transition or FE calculation.

## Acceptance / tests

1. Empty month returns paid = 0 and all existing totals = 0.
2. Recorded/paid/cancelled, mixed rates and different months: paid includes only
   paid amounts in the requested month, all-month aggregate remains correct.
3. Shared response schema requires nonnegative integer paid; existing summary
   integration assertion includes the additive field.
4. Focused integration on opchub_test + forced lint/typecheck/unit + depcheck pass.
5. Commit/push explicit paths; report source SHA and actual evidence.

## Files / standards

`packages/shared/src/api-domains/affiliate-admin.ts`,
`apps/server/src/modules/affiliate/repositories/commission-admin.repository.ts`,
`apps/server/test/affiliate/summary-paid.int.spec.ts`, existing summary test,
shared schema unit test. Read AGENTS, backend/auth-rbac, database/query-indexing,
testing/testing. No new index is necessary for another FILTER column in the
same existing aggregate; month/status predicate and query plan remain unchanged.

TIP-404 still owns UI/mock rendering and MSW/native E2E/parity acceptance.
