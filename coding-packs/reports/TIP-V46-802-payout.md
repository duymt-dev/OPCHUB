# V46-802 payout/history checkpoint — NOT TIP completion

Source **`cc5e34e9`**, pushed on `feature/TIP-V46-802-revenue-sharing`.
Continues receipt capture `5851fdc6`. 801 remains pending acceptance; this is
implementation progress in 802, not a waiver of either TIP's remaining gates.

## Implemented

- `POST /admin/affiliate/revenue/:directorId/payouts`: permission
  `affiliate.payout`, strict month/body validation, required idempotency key.
  Region locks → director/month transaction lock → lock earned share rows
  **before** totaling. No anchor-after-share lock inversion with reanchoring.
- Durable payout receipt, conditional recorded→paid transition, transactional
  audit/outbox; Redis cache loss/replay and competing keys cannot double pay.
  Aggregate VND uses BigInt and exact decimal strings in JSON, not lossy Number.
- `GET /admin/affiliate/revenue/payouts`: permission `affiliate.view`, optional
  director filter, bounded keyset cursor and deferred payload join. Paid amounts,
  bank destination, actor/time and beneficiary are immutable receipt snapshots.
- Registered outbox consumer notifies only the earned beneficiary, idempotently.
  No actual bank transfer or direct affiliate payment is introduced.
- Fixed two review findings: new appointee previously inherited predecessor bank;
  bank configured/corrected after last earning was lost on revocation. Separate
  beneficiary-keyed bank storage now persists configuration/clearing, retains on
  revoke and restores only the same person's bank on appointment. Payout never
  resolves a replacement's bank. Receipt-capture bank snapshots are not rewritten.

## Actual checks

| Scope | Result |
| --- | --- |
| Root lint/typecheck | 8/8 tasks each; existing image warnings retained |
| Root unit | **2116 passed + 2 existing skips**, six tasks (final run cache hits) |
| Root depcheck | pass, 2293 frontend/shared + 1034 server modules |
| Affected native integration | **71/71 across 10 files**, 83.62s, runner35906 exit0 |
| Migration integration | **17/17**, real `opchub_test` isolated schema |
| Migration deploy / generate | pass on both allowed DBs, 92 migrations / Prisma generated |
| Exact-query EXPLAIN | five plans on 10k shares + 10k payouts; no large-table Seq Scan |
| File limits / diff check | pass; largest changed TS file239 lines |

Unit breakdown: Admin596, Portal418, UI56, integrations103+2 existing skips,
server266, shared677. Three new shared contract checks cover exact VND, strict
request/cursor validation and durable outbox receipt IDs.

Integration files: payout9, payout-API4, beneficiary-bank5, query-plan1,
receipt capture11, cross-plan payments12, outbox consumers2, and related
regional-directors/access/mail27 combined. Covers actual relay/replay, 403/400/
413/404/409, tied history cursors, >32-bit VND totals, concurrency with late
receipt correction, outbox failure rollback, paid history after older receipts,
revocation/replacement/reappointment and explicit bank clearing.

Logs under `e2e/.parity-out/`: `v46-802-payout-precommit-final.log` (runner47525,
exit0), `v46-802-payout-int.log`, `v46-802-bank-migration-int.log`,
`v46-802-bank-deploy.log`, `v46-802-revenue-query-plans.json`.

## Query evidence and fixes

The first 10k-row EXPLAIN found a full-table scan in the reanchor self-join.
Removed the unnecessary join and constrained both affected source and UPDATE
target by customer/status/anchor. No planner switches or relaxed assertions.
All five queries execute their production SQL with ANALYZE/BUFFERS; synthetic
rows and UPDATE effects roll back. Final measured execution times:

| Query | ms | Indexes used |
| --- | ---: | --- |
| Director payout history | 0.189 | director-history covering + payout PK |
| History with cursor | 0.200 | director-history covering + payout PK |
| Global payout history | 0.169 | global-history covering + payout PK |
| Lock payable rows | 0.419 | partial `revenue_shares_payable` |
| Correct unpaid epoch | 6.074 | `revenue_shares_customer_history` customer seek |

The planner chose customer-history for this reanchor distribution; do not claim
it used the newer anchor index. These are local measurements, not load/SLA proof.
Initial scan failure is retained in `v46-802-payout-int-before-plan-fix.log`.
Fixture/type errors were corrected, including a partial bank update that correctly
failed the bank CHECK after appointment stopped inheriting predecessor fields.

Create-only again failed historical init CITEXT visibility in an isolated shadow
schema. No reset accepted; schema cleaned. Prisma read-only schema diff generated
the additive recipient table; complete-or-null bank CHECK added manually.
Diagnostics: `v46-802-bank-create-only.log`, `v46-802-bank-diff.log`.

## Remaining work

Admin sharing dashboard/read model, MSW/seed, matching E2E and parity, full TIP
integration/build/regression gate still pending. Mirror beneficiary-owned bank
behavior in MSW; the old 801 browser results do not prove this changed behavior.
Q-V46-802-1 tracks already-paid financial corrections; Q-V46-802-2 explicitly
tracks end-of-month cutoff versus prototype current-month behavior. Neither is
a reason to block unrelated goal work, and neither is marked approved/resolved.

Native HOLD remains API28484/socket33408/worker16200 with original30/10 start
times. Only additive DB schema deployed; held binaries/processes and native demo
data untouched. Payout source is verified in integration, not running on HOLD.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
