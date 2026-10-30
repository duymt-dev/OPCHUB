# V46-802 — director ledger read-model checkpoint

**IN PROGRESS, not TIP-DONE.** Source **`e22fa123`**, pushed on
`feature/TIP-V46-802-revenue-sharing`. Native HOLD is not running this source.

## Implemented

- Permission-guarded `GET /admin/affiliate/revenue/:directorId/{shares,balance,months}`.
- Ledger keyset `(received_at,id)` with deferred payload join; batched names through
  the public Account directory, no cross-domain table access. Missing/deleted display
  identities return null names without deleting or changing financial snapshots.
- Exact per-beneficiary aggregate VND/counts as decimal strings, including paid/due,
  and month-keyset totals. No global unfiltered ledger count on every request.
- Revoked beneficiaries keep their own ledger; replacements start with only their
  own entitlements. Unknown IDs404; no bank payload in ledger rows.
- Two additive indexes, including covering monthly totals, deployed to both allowed
  native databases (93 migrations). Existing payout/capture transitions unchanged.

## Verified

| Scope | Result |
| --- | --- |
| Root lint/typecheck/unit/depcheck | PASS; **2119 passed +2 existing skips** |
| New ledger integration + EXPLAIN + affected payout HTTP | **11/11**,3 files,34.27s |
| Revenue migration integration | **17/17**, real isolated schema on opchub_test |

Root unit breakdown: Admin596, Portal418, UI56, integrations103+2 existing skips,
server266, shared680. Final root unit run6/6 cache hits; same source tested in
the preceding run. Lint/typecheck8/8; depcheck2295 frontend/shared +1042 server
modules, no violations. Terminal handles8086/98051 returned exit0.

Logs (ignored local artifacts): `e2e/.parity-out/v46-802-read-precommit-final.log`,
`v46-802-read-int-final.log`, `v46-802-read-migration-int.log`.
Initial test `v46-802-read-int.log` correctly rejected appointment into an occupied
slot. Fixture fixed to revoke first via the real service; no production guard or
assertion weakened. Final replacement test verifies both old/new balances.

Exact production queries, EXPLAIN ANALYZE BUFFERS,10k rows, no planner switches:

| Query | Execution ms | Index |
| --- | ---: | --- |
| ledger page |0.133|director_ledger + PK|
| ledger cursor |0.126|director_ledger + PK|
| beneficiary balance |0.196|director_months|
| monthly page |0.134|director_months|
| monthly cursor |0.153|director_months|

All five lack Seq Scan on revenue_shares. Full plans in
`v46-802-ledger-query-plans.json`; synthetic rows are rolled back. This is local
query evidence, not a load/SLA claim. Prior five payout/reanchor plans were measured
at cc5e34e9; do not relabel their old execution plans as measured on this commit.

Create-only attempted in a temporary shadow schema again hit historical init
CITEXT visibility (42704), no reset accepted. Read-only Prisma before/after schema
diff generated exactly two indexes; INCLUDE added manually. Shadow schema removed.
Diagnostics: `v46-802-read-create-only.log`, `v46-802-read-diff.log`, deploy logs.

## Remaining

Dashboard-wide beneficiary enumeration/KPIs, Admin GĐ Vùng tab, MSW/demo (including
beneficiary-owned bank persistence), same-assertion browser tests and parity;
full integration/build/regression gate. These endpoints alone are not the complete
Admin screen. Q-V46-802-1/2 remain explicit, not whole-goal blockers.

API28484/socket33408/worker16200 retain original30/10 start times. No dist overwrite,
restart, new database, external transfer or native demo mutation. Only additive
schema deployed; do not claim802 native browser evidence from held801 binaries.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
