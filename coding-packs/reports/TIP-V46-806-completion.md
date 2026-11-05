# TIP-V46-806 — Completion report

## Status: DONE — ready for owner review and merge into dev

Branch `feature/TIP-V46-806-bank-reconcile-settings`, from dev `1378ed85`.
TIP checkpoint `2d6541c6`, D-135 checkpoint `f1a4206e`.
REQ-621 / BR-481–484 / TC-481–482 / D-104, D-123, D-134, D-135.
Source **3c4f6f94** committed and pushed; [PR #84 into dev](https://github.com/duymt-dev/OPCHUB/pull/84).
Checkpoints: c6e512ff feature; 3fa327b1 responsive UI; 4240c17a approved GIN fixture;
3c4f6f94 unprocessed-only pending count (SPEC7). No uncommitted production source.
No merge, auto-merge or main push. All non-pixel gates passed on this source.
The subsequent docs/evidence-only commit closes this report; its Git SHA is in PR history and handoff.

## Implementation

- Admin Settings → Đối soát ngân hàng: configured provider, read-only webhook URL,
  masked credential, confirmed one-time rotation, immediate audited auto-activation
  toggle, adapter connection check, fake-only development simulation.
- Three prototype provider buttons remain. Unsupported Casso/VCB are dimmed and
  labelled; provider changes remain environment configuration. No new live adapter.
- Eight validated endpoints; backend permission keys, not role-name checks.
  `settings.general` opens the tab; Fees permissions independently allow transaction
  list / manual match / short record. Manual match reuses the existing Fees dialog/API.
- Dynamic webhook key encrypted with SecretBox in the singleton DB record. Redis
  stores ciphertext/hint only, with epoch-checked cache population; rotation audits
  the hint only and invalidates cache. Plaintext is returned once, held only in local
  dialog state, never retained as mutation/query data.
- Auto-off records a durable deferred marker. Re-enabling does not replay that
  transaction, including subsequent job retries. Automatic activation, system audit
  and existing outbox events commit atomically; financial rules remain unchanged.
- Short record requires a note and conditional unmatched transition, with audit in
  the same transaction. It never activates a fee or aggregates transfers.
  Recorded short remains visible but leaves the unprocessed pending counter;
  unprocessed short-amount rows are database unmatched / display short.
- Recent transactions use strict keyset pagination (20 default), bounded ID lookup
  before payload/name joins, four display statuses and separate acknowledged-short
  flag. CSV exports all non-ignored transactions, safe spreadsheet cells, VN time,
  exact filename and export audit.
- Isolated MSW handlers, persisted mock settings/hints, shared five-row demo fixture;
  ordinary demo seed includes those transactions without creating financial periods.
  Small FE components/hooks/API modules preserve feature facades and file caps.

## Owner-approved database/runtime scope

Only `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai **6381**, dev DB1/test DB2.
Owner approved rolling the owned API/socket/worker from 805 to 806. Original
PostgreSQL 5432 PID5932 and Redis 6379 PID1244 are not restarted/reset/flushed.

- `20261109090000_v46_bank_reconcile`: enum short, nullable note/actor columns,
  encrypted singleton key table with CHECK constraints, default bank config without
  overwrite, partial covering recent-transactions index.
- `20261109091000_v46_bank_status_counts`: compact partial status index, added after
  actual initial EXPLAIN exposed a counts Seq Scan. Both private DBs have both migrations.
- `prisma migrate dev --create-only` was actually run; unrelated generated index/FK
  removals were removed before deployment. Applied migrations were not rewritten.
- Both migrations have down.sql. Rollback preserves notes/actor in raw history and
  leaves the unused PostgreSQL enum label in place (non-destructive rollback); it
  retains operator config/audits. Rollback reviewed/supplied, not executed on HOLD DBs.
- Actual three-query 10k-row plans: [query evidence](TIP-V46-806-query-plans.md).

## Verification checkpoints — 05/11/2026

Logs below are local ignored files in `test-results/`; results are actual completed runs.

| Gate | Actual result so far | Log |
|---|---|---|
| Baseline reconcile integration | PASS 16/16 | v46-806-baseline-int.log |
| Baseline full MSW E2E | PASS 359 +4 skipped | v46-806-baseline-e2e.log |
| Baseline settings parity | 12 image pass /8 image fail +2 harness pass; reference D-134 | v46-806-baseline-parity.log |
| Root lint + typecheck, final source | PASS 16/16, 10 cached +6 fresh, 1m5.35s; post-build rerun16/16 cached, 300ms; existing image warnings only | v46-806-quality-counts.log; v46-806-quality-final-built.log |
| depcheck, final source | PASS both boundaries, 2358/1064 modules | v46-806-depcheck-counts.log |
| Shared unit scope | PASS 664/664 | v46-806-shared-unit-r1.log |
| Integrations unit scope | PASS 105 +2 existing skipped | v46-806-integrations-unit-r1.log |
| Final Admin unit scope | PASS 6/6, including explicit query + mutation cache secret assertions, 15.24s | v46-806-admin-unit-frozen.log |
| Root unit final | PASS **2023 +2 existing skipped**, 6/6 tasks, 4 cached +2 fresh, 50.816s | v46-806-unit-counts.log |
| Final bank/reconcile/query plans + both legacy Bot suites | PASS **35/35**, six files, 82.04s; accountant writes + pending counter decrement included | v46-806-int-final-scope.log |
| DB integration standalone | PASS **126/126**, 26 files, 175.07s | v46-806-db-int-r1.log |
| Full integration final R3 | PASS **2018/2018**: server1892 in205 files + DB126 in26 files; 2/2 fresh tasks, 53m31.886s on3c4f6f94 | v46-806-full-int-r3.log |
| MSW root production build final | PASS **3/3 fresh**, 1m19.631s, includes final backend bundle | v46-806-build-msw-counts.log |
| Native production build final | PASS direct Portal + Admin builds; both manifests and proxied health verified4300 | v46-806-build-native-gateway-portal.log; v46-806-build-native-gateway-admin.log |
| New MSW E2E | PASS 6/6, 26.8s | v46-806-msw-scope-r1.log |
| Earlier full MSW E2E | PASS **365 +4 existing skipped**, R1 16.7m, c6 checkpoint15.4m, responsive checkpoint14.9m | v46-806-msw-full-r1.log; v46-806-msw-committed.log; v46-806-msw-responsive-full.log |
| Final-source full MSW E2E | PASS **365 +4 existing skipped**, 48.2m, one worker to reduce contention, no assertions changed | v46-806-msw-counts-full.log |
| Final MSW bank + price regression | PASS **9/9**, 1.1m; counter decrement/mobile stacking included | v46-806-msw-counts-scope.log |
| Native bank E2E R2 | PASS 6/6, 1.9m, C-drive intermediate build | v46-806-native-scope-r2.log |
| Final native bank E2E | PASS **6/6**, 1.1m, correct4300 gateway and counter decrement/mobile assertions | v46-806-native-gateway.log |
| Final parity MSW | **16 image fail /8 image pass +2 harness pass**, 3.5m, reference D-134 | v46-806-parity-counts.log |
| Final parity native Bank | **2 image fail +2 harness pass**, 51.8s, reference D-134 | v46-806-parity-native-gateway.log |

## Issues discovered and corrected

- New HTTP test ingress lacked Content-Type, so raw signature tests returned errors;
  fixed the test request, not production parsing/signature checks.
- Real counts query used Seq Scan at 10k rows; corrected runtime SQL/index, not
  EXPLAIN assertions or planner settings. Final scope proves three indexed paths.
- Production ENV is frozen; negative integration tests now instantiate separate
  Nest test applications with explicit ENV overrides, rather than mutating it.
- Existing reconcile regression selected unrelated accumulated fixture rows using
  broad substring matching; now selects the exact two contents ingressed by that test,
  preserving expected count/status/reason assertions.
- Real worker may win a simulation match job. Simulation response reads committed
  matched state rather than interpreting the losing caller's handled outcome as failure.
- Initial lint/type failures (function size, Buffer generics, component tone/query
  mock types) corrected through extraction and proper types; no suppression added.
- Native frontend build ran out of disk. Agent cache-cleanup command was rejected
  by execution policy; no alternative deletion bypass was used. Owner acknowledged
  request to free 8–10GB. At 14:28 D still had approximately 1.16GB. No data/HOLD
  server/static output was deleted by the agent. Intermediate native outputs were built
  into new C-drive folders through junctions, without deletion; runtime required explicit
  node_modules links at those output roots. Both intermediate native apps returned 200
  and native scope passed 6/6. Owner subsequently freed D to approximately 70GB;
  final MSW/native outputs are again ordinary D-drive directories, and native6/6 passed.
- Root unit R1 had 2017 passing tests +2 skips but failed due one fork-worker startup
  timeout (admin-groups did not run). R2 was stopped after zero-test import failures
  while a targeted Admin unit process also ran; concurrent Vite-cache activity is a
  suspected cause, not a proven product regression. R3 reran without another Admin
  Vitest process and completed all2023 +2skip. No test/pool assertion was relaxed.
- One MSW build attempt compiled/generated pages but pnpm exited1 with Windows
  "The system cannot find the path specified". The root sequential rerun passed3/3;
  no build script or source workaround was introduced.
- First Bank image review exposed real new layout errors: wrong switch panel,
  header action placement, off-screen desktop actions and unnecessary table card
  padding. Corrected these in Bank-only components/CSS and rebuilt/retested both
  targets. Reference pixel failure is not used to waive these actual UI errors.
- Further mobile review corrected the two-column details grid to stacked rows,
  restored the CSV toolbar alignment, and matched the short year format. Both
  targets assert actual mobile label geometry and page containment, not masks.
- Final SPEC7 review caught acknowledged short rows still included in pending.
  Corrected both runtime SQL and MSW; shared unit, real integration and both E2E
  targets now assert the counter decreases while the membership fee stays unchanged.
- Full integration R1: server **1891 pass /1 fail**, 204/205 files passed,
  1h14m29s; DB task aborted before results. The old 10k saved-script fixture exceeded
  its default 5s interactive transaction (6659ms); isolated unchanged rerun failed
  again at6675ms. Owner approved **one test-file-only** repair: autocommit preparation
  and finally cleanup by unique prefix, like its adjacent case. All collision/GIN/
  no-Seq-Scan assertions and production timeouts unchanged; fixed suite4/4 PASS.
- Partial full R2 stopped after a different old newest100 reply fixture failed at
  5.123s while full E2E used four workers. No error stack was emitted before stopping;
  a second transaction expiry is suspected, not claimed as proven. That file was
  **not modified** and reran4/4 unchanged when isolated (19.77s). Final six-file scope
  also passed35/35. Final full runs use one browser worker and no concurrent builds/unit.
- Turbo strict environment omitted custom API_PROXY_URL. The native root build
  compiled but its manifest pointed to4000, causing six login failures (connection
  refused); those are not native PASS evidence. Rebuilt both apps directly with pnpm,
  verified manifests target4300 and `/v1/health` through both frontends returns200 JSON.
  Final native6/6 then passed. No `.env` edit, assertion relaxation or service4000 added.

## Deviations / scope refinements

Exact extra files/reasons are recorded in the TIP Execution file refinements section.
List/query/CSV/simulation and one-time-key UI are separate modules rather than
expanding legacy files. MatchDialog is exported through the Fees facade; depcheck
confirms no feature-internal cross-import. Additional count index responds to real
query evidence. No dependency or stack change; only the explicitly owner-approved
legacy GIN test fixture is outside the feature scope; no Bot production code changed.

Q-V46-806-1–5 are recorded as **already decided** by owner D-135, not pending.
No live SePay credential/provider request is tested; fake dynamic-key integration
and a negative real-provider simulation guard are used. Poll behavior is preserved.

## Acceptance criteria

All functional scope cases and final full regression runs passed. Pixel comparisons remain reference failures under D-134, as detailed below.

| AC | Evidence |
|---|---|
| TC-481 exact transfer activates, system audit/outbox atomic | bank-reconcile-admin integration + rollback/retry |
| Auto-off waits; enabling/retry never replays marked-waiting transaction | integration + identical MSW/native E2E |
| TC-482 existing manual match and fee activation | integration + MSW/native assign case |
| Short note required, no activation/aggregation, repeat409 | shared schema/mock + integration + MSW/native short case |
| Unprocessed pending counter excludes recorded short | shared/integration delta + both E2E2/1 assertion |
| Immediate key rotation, old401/new200, encrypted storage and hint-only audit | integration + adapter unit + both E2E |
| One-time plaintext removed; absent from query/mutation data | bank-tab unit cache inspection + both E2E close/reload |
| D-123 OPCHUB syntax and fake-only simulation | shared/Admin unit, integration production/real-provider404, both E2E |
| D-135 read-only providers and unsupported labels | fake/SePay unit variants + both E2E |
| Backend keys / accountant writes / lecturer403 | integration permissions + both E2E hidden tab |
| Keyset20, tied45 rows, four states, indexed10k paths | list/CSV integration + actual three-query plans |
| CSV exact filename, formula protection, audit | integration + both E2E download |
| Existing Fees/reconcile/fundraising + price settings regressions | reconcile/reconcile-v42 integration + price E2E |
| D-134 measure and inspect real layout/mobile | paired MSW/native images; geometry/containment assertions; owner review pending |

## Parity — reference and owner image review (D-134)

Final measured Bank on3c4f6f94: **MSW11.59% /7.28%**, **native11.58% /7.27%**
at1440 /390. The threshold remains3%; CLI image assertions remain red, not relabelled PASS.
MSW renewal regression is6.36% /20.60%; its existing draft-save/no-Zalo/fixture
differences are described in805. Native renewal was not rerun here; retained805 rows
keep their original SHA, not presented as806 measurements.

Bank pairs were visually inspected on desktop/mobile. Real new errors were fixed:
switch placement, action toolbars, table padding/desktop clipping and responsive
details grid. Remaining Bank differences include D-135 unsupported labels/fake fourth
button, D-123 longer OPCHUB text, actual five-row fixture/manual status, account name,
times, hint and counts rather than prototype values. No ledger/data rewritten for pixels.

Baseline → final settings percentages, 1440 /390:

| Screen | 1440 | 390 |
|---|---|---|
| D-66 | 0.70 →6.55 | 9.94 →7.43 |
| D-67 | 0.42 →0.43 | 5.96 →5.33 |
| D-68 | 0.43 →0.44 | 5.65 →4.93 |
| D-69 | 2.84 →2.85 | 2.92 →3.56 |
| D-70 | 0.81 →0.82 | 13.24 →11.62 |
| D-71 | 0.63 →0.65 | 11.84 →8.99 |
| D-72 | 0.63 →0.65 | 14.35 →10.32 |
| D-73 | 0.84 →6.68 | 10.44 →7.96 |
| D-74 | 1.18 →1.18 | 1.72 →1.72 |
| D-75 | 1.94 →7.72 | 13.54 →10.32 |

Do not hide the four newly above-threshold old rows: D-66/73/75 desktop and D-69
mobile. Adding the required Bank navigation row changes full-page capture height;
the pre-existing settings navigation still has legacy Security/Language/AI entries
instead of the prototype's AI Provider/App-notification arrangement (811 scope).
This makes short desktop screens about48px taller and changes alignment. Existing
mobile differences mostly improve; no unrelated navigation redesign was made in806.
Owner should review the paired images, including these navigation-height deltas.

## Native HOLD

Final runtime: API4300, socket4301, worker; Portal3700/Admin3701 (native gateway),
MSW3800/3801. Only owned806 services rolled; original5432/6379 not stopped/reset.
Demo `--affiliate` seeded twice after the last native run; stable counts:
users80, affiliates62, referrals51, commissions53, periods65, shares53, payouts1,
anchors50, directors3, bank transactions5; unbalanced shares0. Memurai6381 DB1 cache
only was flushed. Evidence `test-results/v46-806-hold-counts-final.log` and hold.json.
No source is held uncommitted. Final process/health recheck: both native frontend
`/v1/health` proxies and API4300 returned200 JSON; original PostgreSQL PID5932 and
Redis PID1244 remain listening. API26488/socket22020/worker29740 remain running.

## Files changed (implementation checkpoints)

Exact source/scope paths since the owner D-135 checkpoint; A=create, M=modify.
Report, query-plan, progress and generated parity artifacts are added in the evidence commit.

| Change | Path |
|---|---|
| M | `apps/admin/messages/vi/settings.json` |
| M | `apps/admin/src/features/fees/index.ts` |
| A | `apps/admin/src/features/settings/bank-api.ts` |
| A | `apps/admin/src/features/settings/components/bank-config.tsx` |
| A | `apps/admin/src/features/settings/components/bank-copy-button.tsx` |
| A | `apps/admin/src/features/settings/components/bank-key-field.tsx` |
| A | `apps/admin/src/features/settings/components/bank-short-dialog.tsx` |
| A | `apps/admin/src/features/settings/components/bank-tab.spec.tsx` |
| A | `apps/admin/src/features/settings/components/bank-tab.tsx` |
| A | `apps/admin/src/features/settings/components/bank-transactions.tsx` |
| A | `apps/admin/src/features/settings/components/bank-txn-cells.tsx` |
| A | `apps/admin/src/features/settings/components/bank-txn-table.tsx` |
| A | `apps/admin/src/features/settings/components/bank.module.css` |
| M | `apps/admin/src/features/settings/components/settings-screen.tsx` |
| A | `apps/admin/src/features/settings/hooks/use-bank-key.ts` |
| A | `apps/admin/src/features/settings/hooks/use-bank-reconcile.ts` |
| M | `apps/admin/src/features/settings/types.ts` |
| A | `apps/admin/src/mocks/handlers/bank-reconcile.ts` |
| M | `apps/admin/src/mocks/handlers/fees.ts` |
| M | `apps/admin/src/mocks/handlers/settings.ts` |
| M | `apps/server/.env.example` |
| M | `apps/server/src/common/config/env.schema.ts` |
| M | `apps/server/src/common/errors/app-error.ts` |
| A | `apps/server/src/modules/membership-fee/controllers/admin-bank-reconcile.controller.ts` |
| M | `apps/server/src/modules/membership-fee/controllers/dev-bank.controller.ts` |
| M | `apps/server/src/modules/membership-fee/membership-fee-core.module.ts` |
| A | `apps/server/src/modules/membership-fee/repositories/bank-key.repository.ts` |
| A | `apps/server/src/modules/membership-fee/repositories/bank-transactions.query.ts` |
| A | `apps/server/src/modules/membership-fee/repositories/bank-transactions.repository.ts` |
| M | `apps/server/src/modules/membership-fee/repositories/payment-transaction.repository.ts` |
| A | `apps/server/src/modules/membership-fee/services/bank-csv.service.ts` |
| A | `apps/server/src/modules/membership-fee/services/bank-key.service.ts` |
| A | `apps/server/src/modules/membership-fee/services/bank-reconcile-admin.service.ts` |
| A | `apps/server/src/modules/membership-fee/services/bank-simulation.service.ts` |
| M | `apps/server/src/modules/membership-fee/services/reconcile.service.ts` |
| M | `apps/server/src/modules/settings/app-settings.service.ts` |
| M | `apps/server/test/bot/bot-bulk-lines-v42.int.spec.ts` |
| A | `apps/server/test/membership-fee/bank-reconcile-admin.int.spec.ts` |
| A | `apps/server/test/membership-fee/bank-reconcile-plan.int.spec.ts` |
| M | `apps/server/test/membership-fee/reconcile.int.spec.ts` |
| M | `coding-packs/standards/global/domain-glossary.md` |
| M | `coding-packs/tips/TIP-V46-806-bank-reconcile-settings.md` |
| A | `e2e/behavior/admin-bank-reconcile.spec.ts` |
| M | `e2e/behavior/admin-price-config.spec.ts` |
| M | `e2e/parity/scenarios/admin-settings.ts` |
| A | `packages/db/prisma/migrations/20261109090000_v46_bank_reconcile/down.sql` |
| A | `packages/db/prisma/migrations/20261109090000_v46_bank_reconcile/migration.sql` |
| A | `packages/db/prisma/migrations/20261109091000_v46_bank_status_counts/down.sql` |
| A | `packages/db/prisma/migrations/20261109091000_v46_bank_status_counts/migration.sql` |
| M | `packages/db/prisma/schema/membership-fee.prisma` |
| M | `packages/db/prisma/schema/settings.prisma` |
| M | `packages/db/seed/catalog.ts` |
| M | `packages/db/seed/demo/index.ts` |
| A | `packages/db/seed/demo/payment-transactions.ts` |
| A | `packages/integrations/src/bank-webhook/dynamic-secret.spec.ts` |
| M | `packages/integrations/src/bank-webhook/fake.provider.ts` |
| M | `packages/integrations/src/bank-webhook/sepay.provider.ts` |
| M | `packages/integrations/src/bank-webhook/types.ts` |
| A | `packages/shared/src/api-domains/bank-reconcile.spec.ts` |
| A | `packages/shared/src/api-domains/bank-reconcile.ts` |
| M | `packages/shared/src/api-domains/index.ts` |
| M | `packages/shared/src/errors.ts` |
| A | `packages/shared/src/mock-data/domains/bank-reconcile-seed.ts` |
| A | `packages/shared/src/mock-data/domains/bank-reconcile.spec.ts` |
| A | `packages/shared/src/mock-data/domains/bank-reconcile.ts` |
| M | `packages/shared/src/mock-data/domains/index.ts` |

### Hard rules 1–14 — source review

1. Modular FE/BE files, extracted table cells/dialogs/key hook/CSV/simulation; lint enforces caps.
2. Strict shared zod input/output schemas; no any/ts-ignore added.
3. Public feature facade for MatchDialog; both dependency boundary checks pass.
4. Backend permission keys on every Admin endpoint; negative and accountant tests.
5. Deferred/keyset list, covering/partial indexes; actual 10k-row plans, no per-row query.
6. No chat/socket recipient or fan-out changes.
7. Conditional unmatched writes; existing domain activation/manual transition reused.
8. Activation plus outbox and system audit atomic; rollback/retry integration test.
9. Integer VND and UTC persistence, Asia/Ho_Chi_Minh display/CSV.
10. Settings/rotation/manual match/short/export/simulation audits; rollback tests.
11. Bank provider adapter only; fake test/dev, no live provider request.
12. API_PUBLIC_URL example + env schema; encrypted keys, no actual .env edits or secrets logged.
13. Dedicated unit/integration/E2E files, no inline production test suite.
14. Source3c4f6f94 committed/pushed with hooks; final report/artifact checkpoint is
    docs/evidence only. Explicit paths, no hook bypass, clean-tree/push checked at handoff.

### Quality Gate: Self-Review

- Completeness: 14/14 acceptance rows mapped; all required non-pixel gates passed, full regression included.
- Cross-reference: D-135, D-123, D-104 and approved private runtime scope preserved.
- Gaps: D-134 owner image review; no live SePay credential test or HOLD rollback execution.
  These are disclosed limitations, not passing tests. No remaining non-pixel gate failure.
- Action: owner reviews PR84 and paired images, then merges into dev; agent does not merge.
