# V46-802 receipt/outbox checkpoint — NOT TIP completion

Source **`5851fdc6`**, pushed on `feature/TIP-V46-802-revenue-sharing`.
Continues foundation `218b49bd`. Owner-directed move to 802 remains in effect;
801 is pending acceptance and no historical FAIL has been changed.

## Implemented

- Actual positive membership/renewal and fundraising receipts captured inside
  reconciliation transactions; fundraising does not wait for project approval.
  Actual bank amount/time, including manual under/overpayments, not list price.
- Public payment facade and fail-closed registry avoid reverse domain imports.
  Snapshot referral province, incumbent, bank and policy before worker delay;
  no referral/vacancy/unassigned/pre-appointment receipt gives a phantom share.
- Typed outbox event and registered worker consumer write the durable ledger.
  Source uniqueness handles replay/concurrent delivery. Region locks precede
  fee/project locks; all matching kinds first lock the bank transaction row.
- Customer epoch serialized across plans. Late older receipts correct queued
  and materialized unpaid shares using original policy/beneficiary snapshots.
  Paid shares/receipts are immutable; audit identifies review-required counts
  only on real epoch changes. Accounting resolution is Q-V46-802-1, not an
  invented clawback or a reason to block unrelated goal work.
- New covering index `(customer_id, status, first_received_at) INCLUDE
  (id, received_at)` supports affected-range lookup; additive migration deployed
  on both allowed databases (91 migrations). Existing deployed SQL not rewritten.

## Actual checks for this source

| Scope | Result |
| --- | --- |
| Root lint / typecheck | 8/8 tasks each; existing image warnings only |
| Root unit | **2113 passed + 2 existing skips**; 6/6 tasks, 4 cached |
| Root depcheck | pass; 2291 frontend/shared and 1022 server modules |
| Affected native integration, six files | **35/35**, 59.66s; final runner47742 exit0 |
| DB migration integration | **16/16**, real test DB; includes new index definition |
| Formatting / file limits / diff check | pass; largest changed TS file274 lines |

Unit breakdown: Admin596, Portal418, UI56, integrations103+2 skips, server266,
shared674. Six integration files: new `revenue-sharing.int.spec.ts` (11),
`revenue-sharing-payments.int.spec.ts` (12), existing affiliate lifecycle,
membership reconcile-v42, receipt mail and outbox consumers (12 combined).
Coverage includes real relay/replay, years1/2/3/4+, revoked/replaced director,
rollback, trial/zero, absent registry, all plans, leap day, paid immutability,
and concurrent same-transfer membership/fundraising conflict without deadlock.

Logs under `e2e/.parity-out/`: `v46-802-capture-precommit.log` (runner56141,
exit0), `v46-802-affected-int.log`, `v46-802-anchor-migration-int.log`,
`v46-802-anchor-deploy.log`. Earlier failures were fixed, not waived: invalid
fixture director-name access, fixture function length and original setup issues.

Create-only again hit the historical init CITEXT/search-path shadow failure.
Guarded native targets, isolated test shadow schema cleaned, no reset accepted.
Read-only Prisma before/after schema diff generated the additive index; INCLUDE
was added explicitly. Diagnostics: `v46-802-anchor-create-only.log` and
`v46-802-anchor-diff.log`. This is a tooling deviation, not a goal blocker.

## Next work / no acceptance claim

Implement director payout/history and HTTP permissions, then Admin/MSW/demo,
same-assertion E2E and parity. Payout must lock shares **before** totaling and
use lock ordering compatible with customer-epoch correction. Pending: 10k-row
EXPLAIN (including reanchor), full integration/build/regression at TIP closure,
and Q-V46-802-1 accounting disposition. No final gate has run for this slice.
Do not reuse old 801 full-gate results for changed backend/shared code.

Native HOLD unchanged: API28484 (30/10 15:28:55), socket33408 (15:29:20),
worker16200 (15:29:11). No held binary overwrite/restart or demo reset. New
source is tested in integration, **not deployed to held API/worker**.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
