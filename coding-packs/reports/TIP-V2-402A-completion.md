# TIP-V2-402A — DONE (bounded summary contract only)

Source `0a9fc8d`, pushed on `feature/V2-P4-affiliate`. This closes the missing
paid-total contract identified in V2Q-174; it does not complete Admin TIP-404,
P4, or the full V2 goal.

## Changes

- Shared `affiliateSummarySchema` requires nonnegative integer VND `paid`.
  An old response missing this field fails parsing rather than showing a false 0.
- Existing summary SQL adds `sum(amount) FILTER (WHERE status='paid')`, coalesced
  to 0, within the same aggregate and optional month predicate. No extra request,
  DB loop, pagination, financial transition, migration, or index is introduced.
- Existing fields and auth remain unchanged; no frontend monetary calculation.
- Separate schema unit file and real DB integration file; existing summary
  regression assertion includes the additive paid field.

## Acceptance evidence

| Criterion | Proof |
|---|---|
| Empty month paid/existing totals = 0 | `summary-paid.int.spec.ts`, endpoint on opchub_test |
| Paid-only total, mixed rates and cancellation excluded | Same integration: recorded 30%, paid 20%, cancelled 50%; actual payout/cancel APIs; delta assertions for month/all-month |
| Month isolation and existing totals preserved | Different month unchanged; revenue/commission/payable/net deltas verified |
| Response requires integer/nonnegative paid | Two shared schema unit tests, including missing/negative/fractional values |
| Existing summary and guards still pass | `admin-commissions.int.spec.ts`, `guards.int.spec.ts` |

Focused integration: **9/9, 3 files, exit 0**, including two new integration
tests. Full unit: **613 passed, 2 existing skipped**, six forced tasks; shared
now 101/101. Forced lint/typecheck: 8/8 tasks each; depcheck both graphs pass.
Prettier and `git diff --check` pass. No cached task accepted as evidence.

Normalized/redacted UTF-8 logs:
[`evidence/v2-402a/`](evidence/v2-402a/).

## Verification commands / limitations

```text
pnpm --filter @opchub/server exec vitest run --project int test/affiliate/summary-paid.int.spec.ts test/affiliate/admin-commissions.int.spec.ts test/affiliate/guards.int.spec.ts
pnpm exec turbo run lint --force
pnpm exec turbo run typecheck --force
pnpm exec turbo run test --force
pnpm depcheck
```

The integration app uses real test Postgres/Redis with fake external providers;
no native API/socket/Portal/Admin preview process was started. Existing external
processes and protected ports were untouched. Full server integration, E2E,
build and pixel parity were not rerun for this additive response change and
must be checked at TIP-404/P4 acceptance. No claim of UI or MSW runtime coverage.
