# TIP-V2-512 — Dashboard persisted-source fixture correction

## Failure retained / diagnosis
The full uncached root integration invocation at **f70bdd44** failed:
DB21/21 and server1277/1278, hence **1298 passed / 1 failed** overall.
The failing original Dashboard negative assertion found the canonical seeded
member `m5`: its `name` and `org` legitimately contain the prototype labels.
`packages/db/seed/demo/account.ts` persists the shared member/business fixtures;
`DashboardBlocksRepository.members` queries these real tables, not static cards.
The sanitized complete failed invocation is `evidence/v2-512/full-int-before.log`;
the original private raw failure is unchanged. This is a test-precondition defect,
not evidence that production should blacklist legitimate member names.

## Correction / stronger control
- The original negative case explicitly relabels only canonical `m5` and its
  profile on **opchub_test** while the case runs. Finally restores original values
  and `updatedAt`, and invalidates the actual content-cache epoch before/after.
  The fixture also works when this optional demo member is absent.
- All three original forbidden-label assertions and every original count,
  online and country assertion remain unchanged; no assertion was removed.
- Every returned member is checked against its actual DB primary key, name and
  business company in one batched DB read, not one query per rendered card.
- A separate HTTP positive control creates a real member named Somchai Prasert
  with company Siam AI Labs and requires its exact ID/name/company to appear.
  Renaming that member/profile in the DB then requires the changed response.
  This prevents a production name filter from passing the repaired suite.
- The new member is soft-deleted in finally and content/feed/total caches are
  invalidated. No source seed deletion, production change or schema migration.

## Verification
- Focused native Dashboard **6/6 in two files** pass, including all five original
  cases and the new positive/rename control. Test target is native loopback5432
  `opchub_test`, Redis2, Fake provider; native acceptance services remain intact.
- Repository lint8/8 and typecheck8/8 pass (seven cached tasks each). Units
  **1052 passed + 2 existing storage skips**, six successful tasks, five cached:
  server203 executed; Portal172/UI43/shared207/integrations52/Admin375 cached.
  Depcheck: zero violations, FE1538 modules/4309 dependencies, server765/3388.
  Receipts: `evidence/v2-512/{focused,lint,typecheck,units,depcheck}.log`.
- Fresh full uncached **`pnpm run test:int --force` at 6ce5094b** passes:
  server **1279/1279 in122 files** plus DB **21/21 in4 files**, hence
  **1300/1300 overall**, two successful tasks, zero cached, **10m56.572s**.
  All40 test DB migrations already applied; no migration was pending.
  `evidence/v2-512/full-int-after.log` and `full-int-after-state.json` retain
  the complete sanitized receipt and SHA/target/start/finish/exit metadata.
  The previous failed invocation remains preserved separately, not overwritten.

## Scope / remaining acceptance
This is a bounded TIP-503 fixture correction only, not full P5 acceptance.
MSW auto/scheduler/live bridge and human moderation effects, fresh native/demo
builds, both complete browser lanes, bounded real-provider browser E2E, UAT/AT/LK,
audits/parity and final reports remain open. No real-provider call, dev data change,
native process restart or main merge occurred. Owner-only dev-to-main PR remains
the delivery gate; the current feature checkpoint is committed/pushed separately.
