# COMPLETION REPORT — TIP-V46-818

**STATUS: PARTIAL** — implementation, static/unit/build/browser gates and parity
classification complete; full server integration has one reproducible legacy
fixture-isolation failure awaiting scope approval. Not a DONE claim.

- Branch: `feature/TIP-V46-818-admin-log-search`, from dev merge `dee26a97`;
  approved TIP/decision documentation at `7c4f917c`.
- Scope: D-139; B11 audit filters/shared region labels, B13 keyboard navigation,
  B14 candidate selection/cache invalidation/notification links.
- PR: [#104](https://github.com/duymt-dev/OPCHUB/pull/104), draft while final full
  integration closure remains. No merge or release to `main` is authorized by this execution.
- Implementation: `4f90b24e`; URL persistence correction `6c5800b4`, both pushed
  with normal hooks. Scoped fixture corrections `6143cd97` also pushed; they
  do not change production.

## Approved environment

- Development: `opchub_v46_812_dev`, Memurai 6381 DB3; API/socket 4310/4311,
  Portal/Admin 3710/3711. Owner approved rolling only private817 services to818.
- Integration: `opchub_v46_801_test`, Memurai 6381 DB2.
- Owner approved disposable `opchub_v46_818_chain_test`; created empty, tested,
  then dropped. No down migration on a reused development/integration/HOLD DB.
- No real AI call. Existing provider credentials are never read into reports or
  replaced; bot flags were all false in the before snapshot.

## Implementation / scope connections

1. Strict optional audit filters (`tag`, `actorId`, `from`, `to`) apply inside
   ID-first keyset selection and the existing 90-day bounds. Invalid range or
   unknown keys return400. `system` means SQL `actor_id IS NULL`.
2. CSV job params retain optional filters; old `{kind:'audit'}` remains valid.
   The registered builder is the existing settings audit export service, not a
   new cross-domain SQL builder. Request and filter-bearing audit commit together.
3. Compact accessible tag/actor/range controls reset the first-page query key;
   day boundaries use Asia/Ho_Chi_Minh explicitly. Selected filters also reach CSV.
   Revisiting a previously cached filter removes that exact infinite-query entry
   first, so clearing filters cannot resurrect its previous page2/cursor. The
   regression preserves the original page append assertions and additionally
   checks that the old second page is absent after clearing.
   URL state uses the existing validated URL-params hook, preserves unrelated
   Settings keys, restores the audit tab and filters after reload, and sends
   only the four validated fields to the API. Unit and both browser lanes cover
   hydration/reload; unknown URL keys cannot leak into the strict API query.
4. Admin directory supplies ID/name only at `GET /admin/audit-logs/actors` under
   unchanged `settings.log`. This narrow connection avoids requiring
   `settings.admins` or exposing account-management fields to a log-only reader.
   It reuses the existing `ADMIN_DIRECTORY_PORT`; no audit DISTINCT scan.
5. Shared short/director maps preserve all existing displayed labels and export
   names; no production copies of the three-region label map remain elsewhere.
6. Keyboard selection crosses groups, wraps, supports Enter/default first hit,
   hover/focus selection and active-descendant/selected semantics. New result
   arrays discard selection. The <=1023px search hiding rule is unchanged.
7. Two visibility-filtered 200-ID candidate windows are UNION ALL/deduplicated
   before late payload loading and unchanged shared scoring/top3 selection.
8. Store saves (including product changes) invalidate the owner's match cache
   after commit. Close/delete atomically write `need.unpublished`; the existing
   worker consumer reuses the816 audience query and one multi-key DEL.
9. Narrow payload extension: unpublished events include `{needId,audience:
   {ownerId,field,province}}`. Need deletion is physical, so ID-only lookup cannot
   reconstruct its audience after commit. Snapshot contains no contact/description
   data and survives deletion. Repository deletion now accepts the transaction;
   the existing processor registers the event consumer. Invalidations are
   idempotent/noncritical; Redis failure warns and the60s TTL remains the fallback.
10. Need notification deep link now encodes the title in `/needs?q=...`; no new
    detail page or personal/investor recommendation access.

### Files beyond literal TIP paths

- `common/auth/permission-check.ts`, admin-account directory service, shared audit
  actor response, Admin settings API and types: minimal names-only directory
  connection required by the actor filter without changing management grants.
- `local-business/repositories/need.repository.ts`, audience query,
  `worker/processors/need-notify.processor.ts`, shared outbox schema: transaction,
  deleted-record audience and durable consumer wiring for SPEC10.
- Shared root barrel and global-search/settings type files: public exports/types.
- Existing MSW audit domain/settings-log fixture: preserve actor IDs for filtering.
- Admin `package.json`/lock: direct `dayjs` catalog dependency already used by
  packages/ui and AntD; needed for explicit VN timezone picker boundaries. No new
  library family, major upgrade or external service.
- E2E audit/search journeys plus small audit date helper: same assertions in
  MSW/native, desktop/mobile filtering and keyboard ARIA checks.

## Acceptance criteria

| AC | Evidence / current result |
|---|---|
| Audit tag/actor/date, system, keyset/90-day bounds | Focused integration PASS |
| Filtered CSV, old queued params, audited filters | Focused integration + shared schema PASS |
| Append-only retention | Unchanged; audit-retention suite PASS in full integration |
| FE filter/reset/export/empty/mobile390/URL reload | Unit5/5 and MSW/native E2E PASS |
| Unchanged short/director labels | Shared snapshot tests and production-map search PASS |
| Keyboard across groups/wrap/Enter/ARIA/new results | UI tests and both E2E lanes PASS |
| Strong old need survives250 newer province-only candidates | Focused integration PASS |
| Close/delete/store-save invalidation and Redis fallback | Focused integration PASS |
| Encoded notification link | Focused real notification integration PASS |
| Full regression | MSW397+5 existing skips PASS; integration2126/2127, one legacy fixture failure |

## Actual verification so far

- `pnpm lint`:8 tasks PASS; final rerun after type extraction PASS.
- `NEXT_PUBLIC_API_MOCKING=msw pnpm typecheck --env-mode=loose`:8 tasks PASS.
- `pnpm depcheck`: both frontend/shared and server boundaries PASS.
- `pnpm test`:6 tasks PASS, no cache, **2224 passed +2 existing adapter skips**
  on final production source6c5800b4: shared733, UI67, integrations126+2skip,
  Portal455, server263, Admin580. Duration16m37.674s. Both legacy shared
  pagination tests remain alongside the new cases. Nonfailing Vitest fork
  termination warnings occurred in two Admin files; outer command exited0.
- Focused real integration:4 files, **24/24 PASS** (audit page/export/actor
  permission, need matches/cap/invalidation, real notifications and need SQL plan).
- Forced recovery MSW build:3 tasks PASS, no cache,1m9.654s, explicit Portal
  origin3980 for the Admin mock bridge. Forced native build:3 tasks PASS,
  no cache,1m41.643s. Both use separate dist directories on production6c5800b4.
- Focused E2E: **7/7 MSW PASS**, **7/7 native PASS**, identical assertions;
  audit filter/CSV at1440/390, VN calendar dates, search in both apps and routing.
  Both7/7 lanes also reran successfully after rebuilding the final pager fix.
- Migration chain:105 migrations on empty DB,818 down/up, schema dumps identical;
  both reused private DBs deployed105 migrations successfully.
- Full integration first run: server2121 passed,1 failed,5 blocked by a suite
  bootstrap error; DB144/144 passed. Contract fixture sent53 roles to the valid
  maximum50 schema. AI-router suite failed obtaining a transaction during
  beforeAll; all five assertions passed unchanged in the focused rerun.
  Owner approved bounding only that contract batch, preserving whole-response
  equality and production limit50, plus exact-owned audit fixture cleanup.
  All three affected suites reran **19/19 PASS**. Fresh full server run completed
  **2126 passed /1 failed**,239/240 files passed,41m44.95s. All three repaired
  suites passed in that full run; AI-router no longer has bootstrap skips.
  Remaining failure: `moderation/violations.int.spec.ts:204` expects precisely
  `{autoLockDays:7}` but receives `{autoLockDays:7,ai:false}`. Running unchanged
  AI-moderation first (7/7 PASS), then unchanged violations (4/5) reproduces it:
  the AI suite restores through a merging service, leaving the optional AI key.
  Proposed exact-row snapshot/default/restore isolation for the legacy fixture
  is awaiting owner approval; no extra file was modified without that approval.
  Root Turbo stops on server failure, so the second full batch did not complete
  its DB task; the separate final private-DB rerun passed **144/144**,29 files,
  49.85s, exit0. Server+DB observations total2270 passed/1 failed, not a clean
  root `pnpm test:int` pass.
- Full MSW recovery:396 passed,1 failed,5 existing skips. EV-R02 used a static
  upcoming-event fixture that expired after16h08/11. Owner approved fixing only
  this case's browser date to16/10 in both modes, retaining native preparation
  and every assertion. Events file **9/9 MSW**, EV-R02 **1/1 native** then passed.
  The next full batch passed EV-R02 but ended396 passed/1 failed/5 existing
  skips: the first auth-registration case remained on the login tab after its
  click (expected registration heading absent). No auth/app/assertion change
  was made. A fresh complete two-worker confirmation finished **397 passed,
  5 existing skips,0 failures** in23.4min, exit0. Failed batches are not relabeled
  PASS or hidden by focused-only retries. All402 cases remain collected.
- Final native/MSW parity: all8 paired captures per lane completed, plus4
  harness checks. Each raw result10 passed/2 pixel-threshold failures (exit1),
  solely audit D-75, classified D-139 addition/data under D-134, not functional
  failure. [Paired evidence and measurements](TIP-V46-818-parity.md).
- Detailed command logs: ignored `test-results/v46-818-*`; final counts and
  screenshot evidence will be recorded before DONE.

## Issues / honest rerun notes

- First typecheck omitted the mocking build env; Portal correctly failed env
  validation. Subsequent commands explicitly choose MSW/native build environment.
- Initial focused integration wrapper set DATABASE_URL/DIRECT_URL but omitted
  TEST_DATABASE_URL. The integration setup consequently used configured
  `opchub_test`, not the approved private test DB. Three suites failed during
  app initialization reading missing `app_settings.ai`, before business fixtures;
  the plan suite used connection-local TEMP tables. No migration/seed was run
  there. Do not claim that no connection to native test occurred. The wrapper now
  sets all three URLs to the approved private target; subsequent focused/full
  runs use `opchub_v46_801_test`. Read-path inspection finds no business write in
  that failed initialization; no before/after native-DB snapshot was captured.
- Initial UI smoke test needed ResizeObserver/matchMedia JSDOM stubs for the real
  AntD picker/select controls. Assertions were retained; final4/4 pass.
- Initial MSW E2E used the Admin bridge's default Portal origin and returned503
  at login. Rebuilt with explicit `NEXT_PUBLIC_PORTAL_URL`, not a production fix,
  test skip, timeout increase or assertion relaxation; final7/7 passed.
- Create-only Prisma dev diagnostic failed attempting process termination under
  the existing DB role. Reviewed additive index-only SQL/down was authored
  without reset/role escalation; deploy and blank migration chain succeeded.
- D drive fell to about280MB after builds. Generated-cache cleanup was rejected
  by the execution tool; owner was asked to free only caches, not server/static.
  No alternative deletion bypass was attempted. External cleanup subsequently
  removed custom build directories and many closed ignored logs/helpers, not
  just caches. First full E2E was stopped after asset/login failures; EV-R02 had
  already failed earlier and is separately diagnosed above. Both owned818
  build variants were forced/rebuilt and frontends restored before recovery
  gates. Original backend private818 processes remained running; no blanket
  continuity claim is made for old HOLD assets removed externally. Tracked
  reports/tool results preserve historical observations, not nonexistent logs.
  Actual audit query plans were rerun and raw JSON is now tracked.
- Private provider/settings before-after fingerprint equality was verified after
  earlier focused native/parity runs, with all bot flags false. Those ignored
  snapshots were later lost in external cleanup; do not claim that baseline
  covers the subsequent recovery runs or fabricate a replacement baseline.
  No test in this TIP calls real AI or intentionally changes its configuration.
  Final metadata at19:00 confirms all three bot flags false, custom provider
  enabled with an encrypted key, and zero provider/bot/AI-setting updates after
  17:45. [Safe metadata](evidence/v46-818-final-ai-metadata.json) contains no key.

## Runtime handoff / constraints

- Recovered818 API4310 (PID16288), socket4311 (24076), worker (25868),
  Portal3710 (13992), Admin3711 (28904) remain running. Health/login endpoints
  returned200; listening sockets checked. These are owned private services only.
- No main release or auto-merge. PR104 targets dev. GitHub workflows currently
  trigger on main, so an empty dev-PR check list is **not** a CI-pass claim.
- Builders/filters/schemas/hooks/types remain modular; lint enforces file caps.
  No added `any`, ignore directive, inline massive test, secret or console log.
  Permission checks remain backend permission-key based; actor directory exposes
  only ID/name. Export audit and need-unpublish side effects retain same-tx
  outbox/audit semantics. Queries are bounded/keyset/deferred-join with explicit
  index plans; money/time semantics, fake external providers and import borders
  are unchanged. Detailed evidence is above and in the query/parity companions.
- First exploratory native Dashboard mobile parity captured a real error state
  during a transient Next-to-API ECONNRESET. It was not accepted as a data/design
  difference. An unchanged-harness Dashboard rerun completed6/6, including both
  healthy captures below3%. Final committed-source parity runs are separate.

## Parity / remaining work

- D-139 intentionally adds audit controls absent from the prototype. Pixel
  thresholds are reference-only under D-134; genuine layout defects still need
  correction. Owner image review is not fabricated.
- Six Q-V46-818 defaults remain unchanged. No mobile search, all-results action,
  new result domains, phone search, need detail page, new recommendation audience,
  purge,15-second unlock cycle or settings-tab redesign.
- Remaining: approval and narrow isolation of the one legacy moderation fixture,
  focused reproduction/regression plus a clean full integration rerun, then
  final DONE report/task/debt updates and ready PR104. No production defect is
  asserted from that extra optional-key fixture mismatch. PR remains draft.
  Image approval belongs to owner review; paired classification is archived.
