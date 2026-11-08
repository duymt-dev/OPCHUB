# COMPLETION REPORT — TIP-V46-818

**STATUS: IN-PROGRESS** — implementation and focused verification complete;
full regression and parity runs are still in progress. Not a DONE claim.

- Branch: `feature/TIP-V46-818-admin-log-search`, from dev merge `dee26a97`;
  approved TIP/decision documentation at `7c4f917c`.
- Scope: D-139; B11 audit filters/shared region labels, B13 keyboard navigation,
  B14 candidate selection/cache invalidation/notification links.
- PR: pending. No merge or release to `main` is authorized by this execution.
- Implementation: `4f90b24e`, committed with normal hooks and pushed.

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
| Append-only retention | Unchanged; full integration pending |
| FE filter/reset/export/empty/mobile390 | Unit4/4 and MSW/native E2E PASS |
| Unchanged short/director labels | Shared snapshot tests and production-map search PASS |
| Keyboard across groups/wrap/Enter/ARIA/new results | UI tests and both E2E lanes PASS |
| Strong old need survives250 newer province-only candidates | Focused integration PASS |
| Close/delete/store-save invalidation and Redis fallback | Focused integration PASS |
| Encoded notification link | Focused real notification integration PASS |
| Full regression | Running; not yet claimed PASS |

## Actual verification so far

- `pnpm lint`:8 tasks PASS; final rerun after type extraction PASS.
- `NEXT_PUBLIC_API_MOCKING=msw pnpm typecheck --env-mode=loose`:8 tasks PASS.
- `pnpm depcheck`: both frontend/shared and server boundaries PASS.
- `pnpm test`:6 tasks PASS (2221 passed,2 existing adapter skips) before the final
  pager-reset correction. Latest-source Admin regression4/4 and shared733/733
  (including both retained legacy pagination cases) PASS. Full latest-source
  unit rerun is in progress; do not represent earlier counts as the final batch.
- Focused real integration:4 files, **24/24 PASS** (audit page/export/actor
  permission, need matches/cap/invalidation, real notifications and need SQL plan).
- MSW build:3 tasks PASS. Final MSW build uses explicit Portal origin3980 for the
  Admin mock bridge; native build3 tasks PASS with separate dist directories.
- Focused E2E: **7/7 MSW PASS**, **7/7 native PASS**, identical assertions;
  audit filter/CSV at1440/390, VN calendar dates, search in both apps and routing.
  Both7/7 lanes also reran successfully after rebuilding the final pager fix.
- Migration chain:105 migrations on empty DB,818 down/up, schema dumps identical;
  both reused private DBs deployed105 migrations successfully.
- `pnpm test:int`, full `pnpm e2e`, native/MSW parity: running/pending.
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
  No alternative deletion bypass was attempted. Remaining gates continue while
  there is enough room for their output.
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
- Remaining: full regression results, paired-image review/classification,
  final clean commit/push and PR todev, completion counts/SHA.
