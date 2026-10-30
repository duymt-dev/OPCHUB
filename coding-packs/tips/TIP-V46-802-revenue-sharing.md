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

Receipt/outbox slice (31/10/2026):

- `packages/shared/src/outbox/revenue-sharing.ts` and `revenue-sharing.spec.ts` (create)
- `packages/shared/src/outbox/events.ts` (modify: add typed snapshot event)
- `packages/shared/src/outbox/index.ts` (modify: export receipt contract)
- `packages/db/prisma/schema/revenue-sharing.prisma` (modify: customer/status/anchor index)
- `packages/db/prisma/migrations/20261031060000_v46_revenue_reanchor/migration.sql`, `down.sql` (create)
- `packages/db/test/revenue-sharing-migration.fixture.ts`, `migration-revenue-sharing.int.spec.ts` (modify: index evidence)
- `apps/server/src/modules/membership-fee/services/revenue-receipt.registry.ts` (create)
- `apps/server/src/modules/membership-fee/services/payment-receipt.service.ts` (create)
- `apps/server/src/modules/membership-fee/repositories/payment-receipt.repository.ts` (create)
- `apps/server/src/modules/membership-fee/repositories/payment-transaction.repository.ts` (modify: consistent bank row lock)
- `apps/server/src/modules/affiliate/repositories/revenue-reanchor.query.ts` (create: unpaid year correction)
- `apps/server/src/modules/membership-fee/services/membership-fee.service.ts` (modify)
- `apps/server/src/modules/membership-fee/membership-fee-core.module.ts`, `index.ts` (modify)
- `apps/server/src/modules/project/services/fundraising-review.service.ts`,
  `services/fundraising-manual.service.ts` (modify: transaction capture)
- `apps/server/src/modules/community/services/province-directory.service.ts` (modify: optional transaction)
- `apps/server/src/modules/affiliate/repositories/revenue-sharing.repository.ts` (create)
- `apps/server/src/modules/affiliate/services/revenue-capture.service.ts` (create)
- `apps/server/src/modules/affiliate/services/revenue-sharing.handler.ts` (create)
- `apps/server/src/modules/affiliate/affiliate-core.module.ts`, `index.ts` (modify)
- `apps/server/src/worker/processors/affiliate.processor.ts` (modify: register new event)
- `apps/server/test/affiliate/revenue-sharing.fixture.ts`, `revenue-sharing.int.spec.ts`,
  `revenue-sharing-payments.int.spec.ts` (create)

Reuse the existing cross-domain registry pattern (Account/Referral) instead of
introducing circular module imports. Capture beneficiary/policy in the payment
transaction and persist the ledger through outbox. Slot shared locks precede fee
locks, matching director appointment's region-before-fee lock order. The registry
fails closed if the Affiliate implementation is absent; it never drops receipts.

Payout/history slice (31/10/2026), exact files:

- `packages/shared/src/api-domains/revenue-payouts.ts`, `revenue-payouts.spec.ts` (create); `index.ts` export.
- Affiliate `repositories/revenue-payout.repository.ts`, `revenue-payout-history.query.ts` (create).
- Affiliate `repositories/revenue-payout-lock.query.ts` and `test/affiliate/revenue-query-plan.int.spec.ts` (create: exact-query 10k-row EXPLAIN).
- Affiliate `repositories/revenue-reanchor.query.ts` (modify if EXPLAIN shows untargeted heap scans).
- Affiliate `repositories/regional-director-bank.repository.ts` (create), `regional-director.repository.ts` (modify): beneficiary-bound bank retention across revocation/reappointment.
- `packages/db/prisma/schema/revenue-sharing.prisma` (modify); migration `20261031070000_v46_revenue_recipient_bank/{migration.sql,down.sql}` (create).
- Affiliate `services/revenue-payout.service.ts`, `revenue-payout-notify.handler.ts` (create).
- Affiliate `controllers/admin-revenue-payouts.controller.ts` (create); core/index wiring.
- `packages/shared/src/outbox/events.ts`, worker `affiliate.processor.ts` (modify).
- `apps/server/test/affiliate/revenue-payout.int.spec.ts`, `revenue-payout-api.int.spec.ts` (create);
  `revenue-sharing.fixture.ts` (modify: HTTP/consumer registration and cleanup).
- `apps/server/test/affiliate/revenue-recipient-bank.int.spec.ts` (create: replacement/retention regressions);
  DB migration fixture/spec (modify: complete beneficiary bank constraint).
- `coding-packs/reports/TIP-V46-802-payout.md` (create), progress/decisions as evidence requires.

Use durable idempotency receipts and row locks before summing. Payout never locks
customer anchors after shares (avoids reanchor inversion). Recipient is the earned
director ID, not the region's replacement: current bank of that same incumbent
per prototype; after revocation retain that beneficiary's last confirmed bank
independently of the regional slot. Appointment never inherits a predecessor's bank.
Receipt freezes the actual payout destination. No bank transfer is executed.

Admin read-model slice (31/10/2026), before UI wiring:

- `packages/shared/src/api-domains/revenue-ledger.ts`, `revenue-ledger.spec.ts` (create); `index.ts` export.
- Affiliate `repositories/revenue-ledger.query.ts`, `revenue-ledger.repository.ts`,
  `services/revenue-ledger.service.ts`, `controllers/admin-revenue-ledger.controller.ts` (create); core wiring.
- `packages/db/prisma/schema/revenue-sharing.prisma` (modify index declarations);
  migration `20261031080000_v46_revenue_read/{migration.sql,down.sql}` (create).
- DB revenue migration fixture/spec (modify: covering indexes).
- `apps/server/test/affiliate/revenue-ledger.int.spec.ts`, `revenue-ledger-plan.int.spec.ts`
  and `revenue-ledger-plan.fixture.ts` (create).
- `coding-packs/reports/TIP-V46-802-read.md` (create); progress update.

Read only: director-scoped ledger (keyset/deferred join), exact aggregate balances
and paginated monthly totals. Retired beneficiaries retain access through Admin;
current slot changes never reassign historical rows. Batched public MemberDirectory
lookups enrich display names, not financial snapshots. Aggregate VND/counts use
decimal strings; no unsafe Number conversion. Unknown director returns404;
affiliate.view required. Tests cover tied cursors, payout refresh, revocation,
malformed queries, negative permissions and exact queries on >=10k rows. Global
dashboard enumeration/KPIs and UI remain subsequent work, not claimed complete.

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

Dashboard/UI slice (31/10/2026), exact additional files:

- Shared `api-domains/revenue-dashboard.ts` and export index.
- Affiliate `repositories/revenue-dashboard.query.ts`, `revenue-dashboard.repository.ts`,
  `services/revenue-dashboard.service.ts`, `controllers/admin-revenue-dashboard.controller.ts`, core wiring.
- Server `test/affiliate/revenue-dashboard.int.spec.ts`, existing ledger-plan fixture/spec (dashboard query plans).
- Admin affiliate `revenue-sharing-api.ts`, `revenue-presentation.ts`, `revenue-types.ts`;
  hooks `use-revenue-sharing.ts`, `use-revenue-payout.ts`, `use-revenue-search.ts`; components
  `revenue-sharing-tab.tsx`, `revenue-sharing-table.tsx`, `revenue-sharing-columns.tsx`,
  `director-revenue-detail.tsx`, `director-revenue-history.tsx`, `director-revenue-payout.tsx`,
  `revenue-sharing-header.tsx`, `former-revenue-directors.tsx`, `revenue-director-identity.tsx`,
  `director-revenue-month-select.tsx` (extract subviews to keep functions <=80 lines),
  `revenue-sharing.module.css`; separate `revenue-presentation.spec.ts`,
  `revenue-sharing-api.spec.ts`, `components/revenue-sharing-tab.spec.tsx`, fixture `tests/revenue.ts`.
- Existing Admin model, affiliate-content/screen/tabs, use-regional-directors
  (invalidate sharing after appointment/bank edits), query tests as affected.
- `packages/ui/src/admin-table/admin-table.tsx` (optional standard AntD expandable prop).
- `packages/ui/src/filter-bar/filter-bar.tsx` (accessible search label; reuse shared FilterBar).
- Admin `messages/vi/revenue.json` (new namespace; tab label reuses it, existing affiliate JSON unchanged),
  `src/i18n/messages.ts`, affiliate test context (namespace registration).
- Reports/progress/TIP and parity questions/deviations as evidence requires.

Dashboard KPIs are server-derived: allocation/receipt caption stay global to current
regions; due/paid follow the name/scope filter exactly as the live prototype does.
past recipients have a separate paginated section so AT-GDV04 debt never disappears.
No query-in-loop, no frontend commission-derived financial values. Read current
policy from DB. Payout dialog uses the existing ended-month contract and stable retry
key; Q-V46-802-2 remains explicit until cutoff reconciliation, not silently waived.
MSW/native demo and final browser gates remain required subsequent work.

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

MSW financial slice (31/10/2026), exact additional paths before implementation:

- `packages/shared/src/revenue-sharing/math.ts`, root export; server
  `domain/revenue-sharing.ts` becomes a facade to the same tested pure math.
- `packages/shared/src/fixtures/revenue-sharing.ts` (mock policy seed only).
- Shared mock `domains/revenue-sharing/{schema,state,capture,read,dashboard,payout,payment}.ts`
  and separate `*.spec.ts` / fixture files; domain export index.
- Shared mock `regional-directors/{schema,storage,state,write,empty.fixture}.ts`
  plus new `bank.ts` and bank tests: retained beneficiary bank, no replacement inheritance.
- Shared mock `affiliate-persistence/{schema,snapshot}.ts` and revenue persistence tests:
  validate/restore entire ledger, outbox and idempotency state atomically, no replay on reload.
- Shared mock `ops-admin.ts`, `fees-admin.ts`, `fundraising.ts`: actual successful
  receipt boundary calls; no retroactive allocation from legacy commission rows.
- Admin `mocks/handlers/revenue-sharing.ts`, handler index, dedicated HTTP tests.
- Existing director tests updated only where they assert now-invalid transfer of a
  vacant slot's bank; preserve assertions and add retained-owner/replacement checks.
- TIP/progress/TEST-GAPS/checkpoint report with actual evidence.

Use the existing browser financial lease for serialized persistence, not a new
client store. New receipt sources use one typed pending-event snapshot; drain is
idempotent and preserves original policy/beneficiary. Backfill only the customer
epoch from existing positive receipts. Pending/zero/rejected-before-payment do not
create shares. Native/MSW common demo and final browser gates remain mandatory.

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

Retained-total read-model slice (before outer-header wiring):

- SQL-only migration `20261031100000_v46_revenue_retained/{migration.sql,down.sql}`:
  transactionally maintain the reserved `affiliate_revenue_retained` metric in
  existing `stats_daily`, dimensions `all` and `attributed`, by Vietnam receipt day.
  Statement-level delta triggers cover insert, reanchor update, delete and reset;
  backfill only existing ledger snapshots. No legacy commission-derived amounts.
- Shared `api-domains/revenue-dashboard.ts` and new `revenue-retained.spec.ts`:
  exact decimal-string response with explicit all-receipt/affiliate scopes.
- Affiliate `repositories/revenue-retained.query.ts`, existing dashboard
  repository/service/controller: read-only `/revenue/retained`, `affiliate.view`.
- DB `test/revenue-retained-migration.{fixture.ts,int.spec.ts}`: isolated actual
  migration/backfill/rollback/transaction tests, no native public-data reset.
- Server `test/affiliate/revenue-retained.int.spec.ts` and
  `revenue-retained-plan.int.spec.ts`: receipt/replay/reanchor/payout/revocation,
  authorization and exact EXPLAIN with >=10k ledger/stat rows.
- Checkpoint `reports/TIP-V46-802-retained.md`, progress and TEST-GAPS evidence.

Prototype outer net is affiliate-attributed receipts less their earned director
allocation, including vacant and former recipients, not current-slot totals and
not reference commissions. Direct registration belongs to the separate all-receipt
scope. Existing reporting snapshots use dimension `''` and do not own this metric.
This slice deliberately leaves MSW/header/browser wiring for the next increment.
SQL-only DDL uses the already recorded create-only shadow/CITEXT deviation; do not
reset native databases or rewrite historical migrations to force generation.

Common sharing scenario/browser slice (opt-in, explicit historical chronology):

- Shared `fixtures/revenue-demo.ts`, fixture export and mock-domain export.
- Shared mock `revenue-sharing/scenario.ts`, `scenario.spec.ts`; Admin/Portal
  `mocks/handlers/affiliate-demo.ts` add the same opt-in cookie precondition.
- Shared `affiliate-persistence/{schema,snapshot}.ts` and new `memberships.ts`:
  persist affiliate-owned province memberships, including explicit empty lists.
  Browser reload must not lose the demo agent's province or restore a deliberate
  leave. Preserve legacy snapshots and validate the entire state before mutation.
- Native `seed/demo/revenue-scenario.ts`, `revenue-scenario-accounts.ts`, demo
  orchestrator/CLI option; `test/revenue-demo.int.spec.ts` tests exact agreement.
- `e2e/server/test.ts` opt-in `revenueDemo` setup and
  `e2e/behavior/regional-revenue-sharing.spec.ts` same UI assertions in both modes.

Use a dedicated historical affiliate and five paid customers, not retroactive
rights inferred from the legacy AF0 rows. The optional fixture explicitly starts
the existing north director's tenure in August (after account creation), with an
appointment history record. September receipts cover years1/2/3/4 and direct
registration, making an ended payout month available without changing clocks or
cutoff rules. Historical first receipts establish epochs only. Receipt/period
records substantiate seeded ledger snapshots; no fake external transfer, payment
command, email or outbox dispatch is claimed by seed. Runtime capture/relay is
covered separately by existing financial integration. Default demo stays unchanged.

Demo baseline repair slice (before adding the opt-in sharing scenario):

- `packages/db/seed/demo/revenue-baseline.ts` (create): materialize the existing
  demo paid-period receipts, backfill customer epochs without retroactive shares.
- `packages/db/seed/demo/revenue-reset.ts` (create), `reset.ts` and `index.ts`
  (wire): clear snapshot tables in dependency order; refuse reset while revenue
  outbox work is pending, preserving events instead of pretending delivery.
- `packages/db/test/seed-revenue.int.spec.ts` (create): real PostgreSQL reset,
  payment/epoch provenance, idempotence, MSW comparison and rollback checks.
- `packages/db/test/affiliate-demo.int.spec.ts` (modify): exact receipt count
  includes the previously omitted expired m4 period; add direct historical
  receipt/epoch/access assertions in the new suite, do not suppress the row.
- `packages/shared/src/mock-data/domains/revenue-sharing/demo.ts`, `demo.spec.ts`
  (create), `affiliate-demo.ts` (wire): seed epochs even if revenue state was
  initialized before the optional affiliate dataset; never synthesize shares.

This slice repairs seed provenance and repeatability only. It does not assert
prototype synthetic customer years or assign pre-appointment receipts to current
directors. Browser sharing data, retained totals and acceptance gates remain open.

- [x] Read current code, decisions, specification and sequential owner direction.
- [x] Branch stacked on latest 801; `origin/dev` does not contain 801.
- [x] Foundation migration, math, backfill and dedicated tests (`218b49bd`).
- [x] Actual-receipt readers + outbox ledger, replay/concurrency tests (35 affected integration checks; paid corrections tracked in Q-V46-802-1).
- [x] Monthly payout, audit, history, authorization and EXPLAIN (`cc5e34e9`); director ledger reads (`e22fa123`). Cutoff question remains tracked, not accepted by this checkbox.
- [ ] Admin + MSW + seed + same-assertion E2E + parity.
- [ ] Before each code commit: lint/typecheck/unit/depcheck; push clean SHA.
- [ ] Final full integration/build/regression gates; report actual results.
