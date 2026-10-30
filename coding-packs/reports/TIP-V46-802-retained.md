# V46-802 — retained revenue read-model checkpoint (PARTIAL)

Source: **`bf8ffbf4`**, committed and pushed on
`feature/TIP-V46-802-revenue-sharing`. This is not TIP-DONE.

## Implemented

- `/admin/affiliate/revenue/retained`, guarded by `affiliate.view`, returns exact
  decimal strings: `allReceipts` and `affiliateAttributed`. The future outer
  Affiliate header must use the latter, not the legacy reference-commission net.
- Includes vacant-region and retired-beneficiary snapshots. Payout changes
  settlement status, not earned allocation: it never deducts the share again.
- Reserved Affiliate metric `affiliate_revenue_retained` in existing
  `stats_daily`, dimensions `all` / `attributed`, grouped by Vietnam receipt day.
  Reporting seed/job use other metrics and empty dimensions; no ownership overlap.
- Statement-level PostgreSQL delta triggers maintain totals transactionally for
  insert, update/reanchor, delete and truncate. Bulk writes group first; upserts
  lock day/scope rows in consistent order. Replayed source inserts contribute zero.
- Atomic additive migration backfills existing ledger snapshots only. It does not
  infer past director rights or manufacture ledger entries from old commissions.
  Rollback removes only the new metric/index/functions/triggers, not financial rows.
- Request reads the narrow daily read-model, never the complete receipt ledger.
  Partial covering index `(metric, dimension, day) INCLUDE (value)`.

## Verification at source SHA

| Check | Actual result |
| --- | --- |
| Root `pnpm lint` | 8/8 tasks pass; existing image warnings only |
| Root `pnpm typecheck` | 8/8 pass |
| Root `pnpm test` | **2174 passed +2 existing skips**, 6/6 tasks; 4 cached |
| Root `pnpm depcheck` | Pass: 2355 FE/shared modules, 1054 server modules |
| Retained contract focused unit | **9/9** |
| Real DB migration + related revenue seed suites | **15/15**, three files |
| Real server retained/EXPLAIN/sharing/payments/payout/dashboard suites | **42/42**, six files |
| Strengthened exact-bigint EXPLAIN rerun | **1/1**, already included in the 42 unique cases |
| Migration deploy | Applied on both allowed native DBs; **94 migrations** |

Unit breakdown: Admin612, Portal418, shared719, server266, UI56,
integrations103 +2 pre-existing S3 skips. Final standalone root lint also passed
after strengthening the plan assertion; no production source changed after gates.

Integration commands:

```text
pnpm --filter @opchub/db exec node --env-file-if-exists=.env node_modules/vitest/vitest.mjs run test/revenue-retained-migration.int.spec.ts test/revenue-demo.int.spec.ts test/seed-revenue.int.spec.ts
pnpm --filter @opchub/server exec vitest run --project int test/affiliate/revenue-retained.int.spec.ts test/affiliate/revenue-retained-plan.int.spec.ts test/affiliate/revenue-sharing.int.spec.ts test/affiliate/revenue-sharing-payments.int.spec.ts test/affiliate/revenue-payout.int.spec.ts test/affiliate/revenue-dashboard.int.spec.ts
```

Evidence under ignored `e2e/.parity-out/`:
`v46-802-retained-precommit.log`, `v46-802-retained-lint-final.log`,
`v46-802-retained-db.log`, `v46-802-retained-int-final.log`,
`v46-802-retained-plan-final.log`, `v46-802-retained-query-plan.json`.
All runner handles terminal, exit0 for these accepted runs.

The exact production query was measured with 10,000 new ledger rows and 10,000
unrelated stats rows: **Index Only Scan** on `stats_daily_revenue_retained`, no
Seq Scan or ledger read, execution **0.075ms** in this run (not a performance SLA).
Heap fetches remain visible in the plan; this is not a claim of zero heap I/O.
The test also verifies an exact increment of `9007199254740993`, not a rounded Number.

Migration tests cover direct versus attributed scope, VN midnight, concurrent
duplicates, bigint totals, changed day/scope, transaction rollback, 10k-row bulk
insert, deletion/truncate, unrelated reporting preservation, and actual down/up
backfill SQL in an isolated schema on `opchub_test`.

Development failures were fixed, not waived: malformed decimal strings initially
reached `BigInt` inside the Zod refinement (now guarded); the backdated-receipt
test initially delivered the helper's latest period instead of the older receipt.
It now selects the actual older period and asserts both the intermediate reanchor
total61 and final111. An early server run overlapped a seed runner near its end;
the accepted 42/42 rerun ran after the seed runner finished, without a concurrent
DB suite. Assertions/timeouts were not loosened.

## Native HOLD and remaining work

SQL-only migration follows the already documented create-only shadow/CITEXT
deviation in the foundation report; no reset/rewrite of old migrations to bypass
it. Deploy used guarded localhost5432 URLs for `opchub_dev` / `opchub_test` only.
Seed regression touched test DB only. No production build, held binary overwrite,
process restart or dev demo reset. API28484/socket33408/worker16200 retain their
original 30/10 start times. The held API still runs old source, not this endpoint;
HTTP proof here is the real integration TestApp, not final native-dev acceptance.

Next: MSW retained response + outer-header exact-string/error-state wiring, then
same browser assertion for attributed retained3120000 versus all-receipt6720000.
Repair stale bank-inheritance E2E assertions; finish prototype parity, full
integration/build/regression and native-dev acceptance. Earlier browser evidence
at68a3152e is historical, not a new final gate for this migration. Q-V46-802-1/2/3
remain recorded, not reasons to block the entire goal. 801 remains pending acceptance.
