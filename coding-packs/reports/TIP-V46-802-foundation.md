# V46-802 foundation — implementation checkpoint, NOT TIP completion

Source: `218b49bd`, pushed on `feature/TIP-V46-802-revenue-sharing`.
Owner directed continuation on 31/10/2026; TIP authored/pushed at `5bc97005`.
Stacked on 801 `e0ded1fa`; 801 remains pending acceptance with its FAILs intact.

## Implemented

- Separate Prisma models for customer first-receipt epoch, revenue allocation
  snapshots and durable director payout receipts. Per-payment VND is Int;
  aggregate payout totals are BigInt. No cascading deletion of earned ledger
  snapshots when an affiliate/director is removed.
- D-119 policy fields (50/10/20 defaults in migration only), independent of
  legacy reference commission percentages. Shared strict zod contract.
- Exact customer-year/calendar-anniversary and configurable rate functions;
  Vietnam leap-day boundaries, nearest-dong allocation with exact remainder,
  explicit Media Soft-only allocation and settlement transition guard.
- Positive amount, source/plan, policy/rate, beneficiary, complete bank snapshot,
  month and settlement constraints; source uniqueness and payout request-key
  uniqueness; partial covering payable and keyset history indexes.
- D-122 migration backfills earliest actual positive receipt across membership
  and fundraising. Uses bank receipt time or bankless manual collection time;
  excludes zero/trial/unpaid/legacy/unmatched/ignored transactions. No retrospective
  director shares or payouts are manufactured.

## Actual checks

| Command / scope | Result |
| --- | --- |
| Root `pnpm lint` | 8/8 tasks pass, 5 cached; existing image warnings retained |
| Root `pnpm typecheck` | 8/8 tasks pass, 5 cached |
| Root `pnpm test` | 2110 passed + 2 existing skips; 6/6 tasks, 4 cached |
| Server new calculation suite | 18/18 (also included in root run) |
| Shared new policy suite | 3/3 (included in root run) |
| DB migration integration, real native `opchub_test` | 16/16; repeat shuffled seed 802 also 16/16 |
| Root `pnpm depcheck` | pass, 2289 + 1011 modules |
| Prisma generate | pass |
| Migration deploy | applied on `opchub_dev` and `opchub_test`, 90 migrations |
| `git diff --check` | pass |

Unit breakdown: Admin596, Portal418, UI56, integrations103+2 skips,
server266, shared671. Precommit log:
`e2e/.parity-out/v46-802-foundation-precommit.log`; runner43267 terminal exit0.
No full integration/build/E2E/parity run for this intermediate foundation commit.
Old 801 integration results are not acceptance evidence for changed 802 code.

## Migration generation deviation (not a goal blocker)

Attempted `migrate dev --create-only` with a guarded `opchub_dev` target and
an isolated shadow schema on allowed `opchub_test` (no additional database).
The historical init failed replay because CITEXT is installed in public but
not visible in the isolated shadow search path. No reset was accepted.

Generated additive DDL with Prisma's read-only before/after schema diff, then
added hand-written financial constraints, covering indexes and epoch backfill.
Existing migrations/indexes were not rewritten. Both native deploys succeeded.
Dedicated migration tests exercise the actual SQL on an isolated test schema.
The temporary shadow schema was removed; native public/demo records were not reset.
Create-only diagnostic: `e2e/.parity-out/v46-802-create-only.log`.

## Payment investigation — next implementation constraints

- Membership source is `membership_fee.confirmed`, including renewals, not only
  first legacy commissions. Fundraising source is `fundraising.paid`, not approval.
- Event `listAmount`/`amount` are list prices: use actual receipt values from
  domain-owned public readers. Manual under/overpayment must not use list price.
- Snapshot entitlement at reconciliation, not whichever director happens to be
  current when a delayed worker runs. Preserve earned shares after revocation.
- Handle event replay/concurrency and customer epochs across plan types. Do not
  wire a live consumer that silently credits old receipts to a new appointee.
- Existing manual membership period creation omits explicit `createdAt: now`;
  preserve reliable collection timestamps when adding the receipt capture path.

## Not implemented / not yet accepted

No live sharing outbox capture/consumer, actual-payment readers, payout service,
HTTP permission checks, Admin tab, MSW/demo integration, browser/parity or 10k-row
EXPLAIN evidence yet. Database tables and pure functions alone are not the feature.
Continue those slices in 802; policy redesign/reference-only affiliate flow stays
in 803 and Portal region view in 804. Do not reopen cosmetic-only 801 loops.

Native HOLD retained: API28484 (15:28:55), socket33408 (15:29:20), worker16200
(15:29:11), all started30/10/2026. No held binary overwrite or service restart.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
