# TIP-V46-802 — Sổ chia sẻ Media Soft ↔ GĐ Vùng

## HEADER

- **TIP-ID:** V46-802
- **Module:** Affiliate / revenue sharing; membership-fee, fundraising event boundaries
- **Priority:** P0
- **Depends on:** V46-801 implementation at `e0ded1fa`; acceptance remains pending.
- **REQ / D:** REQ-617; D-119, D-120, D-121, D-122; D-110 rounding.
- **Branch:** `feature/TIP-V46-802-revenue-sharing`, stacked on 801.
- **Parallel-safe with:** none (single implementation agent, sequential TIPs).
- **Owner direction:** 31/10/2026, “sang 802,.....”. Proceed now; preserve 801
  FAILs and recheck dependencies after 802/803. This is not acceptance of 801.

### Files touched (create unless marked modify)

First implementation slice — schema, calculation and customer epoch:

- `packages/db/prisma/schema/revenue-sharing.prisma`
- `packages/db/prisma/schema/affiliate.prisma` (modify: policy fields)
- `packages/db/prisma/schema/account.prisma` (modify: customer relation)
- `packages/db/prisma/migrations/20261031040000_v46_revenue_sharing/migration.sql`
- `packages/db/prisma/migrations/20261031040000_v46_revenue_sharing/down.sql`
- `packages/db/test/migration-revenue-sharing.int.spec.ts`
- `packages/db/test/revenue-sharing-migration.fixture.ts`
- `packages/shared/src/api-domains/revenue-sharing.ts`
- `packages/shared/src/api-domains/revenue-sharing.spec.ts`
- `packages/shared/src/api-domains/index.ts` (modify: export)
- `apps/server/src/modules/affiliate/domain/revenue-sharing.ts`
- `apps/server/src/modules/affiliate/domain/revenue-sharing.spec.ts`
- `coding-packs/standards/global/domain-glossary.md` (modify: sharing terms)

Subsequent slices within this TIP (expand exact files before each slice):

- Affiliate `repositories/revenue-sharing.repository.ts`,
  `services/revenue-sharing.service.ts`, `services/revenue-sharing.handler.ts`,
  `controllers/admin-revenue-sharing.controller.ts`; core/index wiring (modify).
- Membership-fee and project public payment readers: resolve actual received
  amount/time without reading another domain's tables from Affiliate.
- Worker `processors/affiliate.processor.ts` and outbox routing (modify).
- `apps/server/test/affiliate/revenue-sharing.int.spec.ts` and separate payout,
  permission, outbox and query-plan suites.
- Admin affiliate `revenue-sharing-api.ts`, `hooks/use-revenue-sharing.ts`,
  `components/revenue-sharing-tab.tsx`, `components/director-payout-history.tsx`,
  separate component tests; existing tab orchestration (modify).
- Shared mock revenue-sharing domain, Admin handlers, dedicated seed fixture;
  `e2e/behavior/regional-revenue-sharing.spec.ts` and parity cases.
- `coding-packs/reports/V4.6-progress.md`, `ui-parity/decisions.md`,
  `ui-parity/questions.md`, `ui-parity/deviations.md` (modify as evidence requires).

## CONTEXT

Delta P6/P7/P8; specification §31.1–31.3, §32 AT-GDV04; prototype Admin
Affiliate › GĐ Vùng (`docs/spec/index.html` around 5963). D-121 overrides
CS-13 manual region assignment. D-122 overrides registration-based age.
Current commissions cover first membership payment/approved fundraising;
they cannot be used as the ledger source because renewals must also share
and fundraising must record at reconciliation, not approval.

## APPLICABLE STANDARDS

- `global/code-structure.md`, `global/git-workflow.md`, `global/domain-glossary.md`
- `backend/nestjs-modules.md`, `backend/auth-rbac.md`
- `database/prisma-migrations.md`, `database/query-indexing.md`
- `frontend/nextjs-structure.md`, `frontend/data-state.md`, `frontend/ui-parity.md`
- `testing/testing.md`; AGENTS testing cadence and full TIP gate.

## TASK

Implement immutable, idempotent revenue allocation from actual reconciled
payments; customer age across plan types; month-end director settlement and
history; matching Admin, MSW and native behavior. No direct bank transfer.

## SPECIFICATIONS

1. D-119: persisted policy has year-one %, annual decrement %, floor %. Defaults
   exist only in migration/seed/test. Rate = max(floor, first − decrement × (y−1)).
2. D-122: customer year starts at first positive actual receipt across all plans,
   not registration, trial or commission creation. Backfill the epoch only;
   do not fabricate historical director entitlements (D-121).
3. D-119/D-110: positive received VND; nearest-dong director share; Media Soft
   receives exact remainder. Zero/trial/cancelled payments do not create shares.
4. D-121: derive region from referring affiliate's community province. No referral,
   unassigned province or vacant slot gives 100% Media Soft. Snapshot beneficiary,
   region, rate and policy; future appointment must never receive older shares.
5. Reconciliation outbox consumers run independently of legacy first-commission
   consumers. Unique source key prevents replay/double credit. Use actual receipt
   data, not list-price event fields. Audit important writes within transaction.
6. §31.3: settle only ended Vietnam-calendar months, separately per director;
   durable receipt + conditional transition + idempotency key. Preserve earned
   amounts after revocation (AT-GDV04), bank snapshot, actor and payment history.
7. Preserve old contracts until 803 changes policy UI/reference commission model.
   Do not recalculate old financial snapshots when policy/province changes.

## ACCEPTANCE CRITERIA

| Given / When / Then | Test / evidence |
| --- | --- |
| First receipt / cross-plan anniversary / years 1,2,3,4+ and leap-day boundary are correct | `revenue-sharing.spec.ts` |
| Configured policy / odd VND / rounded shares conserve the total | shared/server unit suites |
| Historical paid and unpaid sources / migration / only actual positive earliest receipt backfills; no retroactive ledger | `migration-revenue-sharing.int.spec.ts` |
| Fee renewal or fundraising reconciliation / relay and replay / one correct ledger entry | revenue-sharing outbox integration |
| Referral province, vacant or replaced director / allocation / correct immutable beneficiary | revenue-sharing integration |
| Previous month / pay twice and concurrent requests / one receipt, audit/outbox, no duplicate amounts | payout integration |
| Missing permission, malformed/oversized request, unknown ID, open month / request / 403,400,413,404,409 | endpoint integration |
| Director revoked after earning / payout / accrued balance remains payable | AT-GDV04 integration/E2E |
| Admin GĐ Vùng / read, settle, reload / matching MSW and native assertions | behavior suite |
| Related screens / 1440 and 390 captures / ≤3%, no masks or changed baselines | parity + query EXPLAIN ≥10k rows |

## CONSTRAINTS

DO NOT modify prototype, held native binaries/processes, GOAL or 801 evidence.
DO NOT pay affiliates, assign region manually, hardcode production rates, invent
receipts or mark pending gates PASS. SKIP 803 policy redesign/reference-only
commission migration and 804 Portal; keep them separate, record dependencies.

## BUILDER-CHECKLIST

- [x] Read current code, decisions, specification and sequential owner direction.
- [x] Branch stacked on latest 801; `origin/dev` does not contain 801.
- [ ] Foundation migration, math, backfill and dedicated tests.
- [ ] Actual-receipt readers + outbox ledger, replay/concurrency tests.
- [ ] Monthly payout, audit, history, authorization and EXPLAIN.
- [ ] Admin + MSW + seed + same-assertion E2E + parity.
- [ ] Before each code commit: lint/typecheck/unit/depcheck; push clean SHA.
- [ ] Final full integration/build/regression gates; report actual results.
