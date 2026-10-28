# TIP-V42-713 — implementation checkpoint (not completion)

Branch: `feature/TIP-V42-713-bot-workflows`, stacked on 712. Goal remains active; proceed without asking owner at checkpoints. Q-V42-713-1 records the safe global-pause interpretation.

## Committed and pushed

- `81e883ff`: TIP and question; scope manifests expanded before each subsequent stage.
- `023c537a`: persisted VN schedule API, shared date policy, admission/draft/publication fences. Missing setting is live; malformed state fails closed. Pause retains pending cursor; clearing dates does not resume pause. Permission/audit/validation covered.
- `97211f0d`: reply contracts, exact second cadence helper, atomic 12/group +60/system rolling Redis budget. **Budget is registered but not yet wired into publication.**
- `cc48b904`: durable bounded reply-run storage, public Chat candidate-scan port with latest-N-before-filter, top-ten/eight-preview projection. **Run storage/scan are not yet wired into a reply controller or scheduler.**
- `46655576`: completes that runtime wiring: permissioned settings/scan/current/stop API, 20s automatic scan, durable outbox-driven per-message progression, same-group enabled persona policy, second-based cadence, actual publication 12/60 budget, pause/stop/emergency fences and generation-failure advancement/retry. Automatic off stops new scans but an admitted run continues (Q-V42-713-2).
- `9edf944e`: GET reply overview with actual latest100 message history, top10 groups/8 previews and current persona counts. Partial covering history index and deferred join; no synthetic history or dependency on retained30 threads.

- `2ead530e`: per-group enabled-script rotation without required runAt, durable UUIDv7 cursor, 30-slot admission/retention, GIN group candidate IDs then deferred payload load, worker concurrency4. Optional generated conversations alternate after a stored script instead of starving; Q-V42-713-3 records null/past/future scheduling semantics.

- `a12b5b52`: exact integer1–60 minute script/auto spacing, strict request/response ranges, Admin field maximum, safe legacy normalization/in-flight deadline extension and DB constraints. Independent reply mock timing now defaults to5 seconds.

- `80e31019`: persistent custom conversation-type catalog, four shared immutable built-ins,
  permissioned read/create/delete endpoints, case-insensitive DB uniqueness, transactional
  audit and bounded keyset/deferred-ID pagination. Generation itself is the next stage.

- `1e03d1ef`: bulk input/result contracts, pure persona/prompt/completion validation,
  durable batch/result/selection storage, and indexed normalized-line deduplication for
  saved scripts and generated batch results. **No bulk generation endpoint/worker yet.**

## Actual verification

Logs: `.git/codex-v42-713/` (local, not committed).

| Stage | Verification |
|---|---|
| Schedule | full lint8 tasks, typecheck8 tasks, unit1701 passed +2 skipped; focused native7 passed; full existing bot integration98 passed across21 files (`stage1-bot-regression.log`) |
| Reply contracts/budget | full lint8, typecheck8, unit1720 passed +2 skipped; real Redis4 passed (`stage2a-native.log`) |
| Scan/storage | full lint8, typecheck8, unit1720 passed +2 skipped; native scan3 passed, DB migration13 passed |
| Query plan | 10,000 wide message rows; latest-N Index Only Scan on `messages_room_id_created_at_id_idx`, deferred PK body fetch, reply anti-join using `messages_bot_reply_trigger_key`; no Seq Scan on messages. Measured1.175ms; small groups table sequential scan is expected. |
| Live runtime/compatibility | full lint8, typecheck8, unit1723 passed +2 skipped; complete bot integration112 passed/24 files (`stage2d-bot-regression.log`); actual worker HTTP-stub pipeline proves5000ms deadline and keyword moderation. Seven obsolete assertions were replaced according to explicit D-112 changes, not loosened. |
| Overview/history | focused native11 passed/2 files after history changes; full lint8/typecheck8/unit1723+2skip pass (`stage2e-*`); depcheck passed2080 modules/6082 dependencies and944 modules/4348 dependencies. History EXPLAIN with10,000 wide replies plus10,000 sources uses `messages_bot_reply_history_idx`, no messages Seq Scan,1.025ms. |

Create-only migration `20261028162355_v42_bot_reply_run` reviewed to remove unrelated generated index drops/recreation, deployed to native `opchub_dev` and `opchub_test`, Prisma client regenerated. It adds only reply-run metadata and constraints; no existing chat content changes.
History migration `20261028165010_v42_bot_reply_history` likewise create-only/reviewed/deployed to both native databases. Initial history test hit30s due to per-row FK checks while deleting20,000 fixture rows, also contaminating the following history assertion/teardown. Bulk fixture now runs inside a savepoint and rolls back after unchanged assertions/EXPLAIN;11/11 rerun passed without raising timeouts. Precisely identified leftover test-only rows/groups were removed; no dev data was deleted.

### Rotation verification and corrections

- Full bot integration **119 passed /27 files**, `stage2f-bot-regression-rerun.log`, before the final optional-AI alternation addition. After that addition: focused **17 passed /6 files**, `stage2f-final-native.log`. Final UUIDv7 cursor bulk-write adjustment: **8 passed /2 files**, `stage2f-cursor-final.log`.
- Final full lint8/typecheck8/unit1723+2skip passed (`stage2f-lint/types/unit.log`). Depcheck passed2080/6082 and951/4383 modules/dependencies.
- Actual BullMQ worker + local HTTP barrier proves two independent groups reach the provider **before either response is released**, both publish one actual message; duplicate cursor cannot make a third request/publication. No mocked Prisma/business provider, no paid AI.
- Rotation: racing ticks, independent groups, busy-group exclusion, wrap, script deletion, thread retention, future runAt, disabled/global pause, missing default room/deleted group, max30 slots, outbox and unique group cursor verified. Old consumed-once scheduler/worker assertions explicitly replaced by D-112 rotating behavior; original cursor idempotency remains asserted.
- Create-only/reviewed/deployed dev+test migrations `20261028171417_v42_bot_rotation` and `20261028172358_v42_bot_rotation_index_cleanup`. Unrelated generated index changes removed; first applied migration never rewritten. Second drops the unused ordered-ID index and makes read-heavy script GIN updates immediate.
- Initial query used ordered-PK filtering across unassigned groups:877–935ms. Rewritten to GIN group seek + two-part top-N cursor/wrap ordering; final10000 wide scripts EXPLAIN **10.520ms** (repeat11.593ms), no Seq Scan on bot_scripts. Only selected ≤30 payloads loaded after slot reservation.
- Initial fixture tried soft-deleting a default room;709 correctly rejected it. Fixture now removes its empty test-only room to test the missing-room fence. Refactoring the fixture to a class exposed stale local references/type errors; fixed, no lint suppression or timeout/assertion weakening.
- Repeated initial8000-future-row rollback fixtures bloated the old scheduled index to188 pages for0 live indexed rows; legacy EXPLAIN correctly failed on a Seq Scan. Test-only maintenance rebuilt **only `opchub_test.bot_scripts_schedule_due_idx`**, then VACUUM/ANALYZE; index1 page, original legacy assertions pass unchanged. Final stress fixture still has10000 wide scripts, now9999 eligible plus1 future (more candidates to rank, no needless8000-row pollution of the unrelated scheduled index). No dev index/data maintenance was performed.

### Minute-gap verification and corrections

- Final full lint8/typecheck8 and unit **1736 passed +2 skipped**, `stage2g-lint/types/unit.log`; shared496, server230, Admin463, Portal392, UI52, integrations103+2skip. Obsolete random30s–5min tests were replaced by explicit D-112 exact1/2/5/6/15/60-minute and invalid-range cases; no ignored random parameter remains.
- Full bot + Dashboard thread native regression **133 passed /29 files**, `stage2g-bot-regression.log`. New native minute-gap6 verifies script1/6/60 and actual-HTTP generated6/60 deadlines, rejects publication one millisecond early without extra LLM calls, idempotent cursor, and HTTP400 delayMinutes field + accepted60.
- Full database suite **92 passed /23 files**, `stage2g-db-all.log`; new migration suite12 tests actual legacy temporary PostgreSQL tables, retained enable flags, untouched first-turn/reply/terminal deadlines, never-shortened existing later deadlines, idempotent backfill, script/global DB constraint rejection. Migration `20261028173908_v42_bot_minute_gap` create-only/reviewed/deployed to native dev+test; no unrelated generated index changes retained. Q-V42-713-4 records legacy normalization.
- Depcheck passed2082 modules/6087 dependencies and952 modules/4393 dependencies.
- Initial assertions assumed the wrong HTTP error envelope / Prisma adapter metadata shape; corrected to shared `apiErrorSchema` and actual SQLSTATE23514 adapter cause, then native6/6 and DB12/12 passed. No errors were accepted as success.
- Old MSW tests used unsupported zero-minute scripts or30-second reply deadlines. Fixtures now use1 minute /5 seconds, including exact pre-deadline, midnight and burst-window boundaries. Full unit catches and fixes a private persistence coupling: reply snapshots may retain their zero-minute N/A marker, but automatic/script snapshots cannot. New response and persistence tests reject invalid ranges rather than loosening public schemas.
- **Not claimed:** full MSW reply policy/rotation parity. The legacy MSW hour/quota/cooldown/30-per-minute reply policy and one-shot schedule behavior still need the full workflow cutover alongside new UI; green legacy tests do not prove D-112 parity.

## Next work — do not mark TIP complete

### Conversation-type verification

- Full lint8/typecheck8 and unit **1749 passed +2 skipped** (`stage3a-*-final.log`):
  shared509, server230, Admin463, Portal392, UI52, integrations103+2skip.
- Native catalog **18 passed /2 files**, including the10000-row query-plan test;
  complete bot + Dashboard thread native regression **151 passed /31 files**,
  `stage3a-bot-regression.log`,182.84s. Tests cover real API restart persistence,
  401/403/400/404/409/413, sanitization, concurrent duplicate names with one audit,
  immutable built-ins, deleted cursor pagination, retained saved script labels/content,
  and transaction rollback when the actual audit insert rejects an invalid IP.
- Full DB suite **101 passed /24 files**, `stage3a-db-all.log`,53.54s;9 new migration
  tests verify citext spelling/uniqueness, built-in protection and size constraints.
  Migration `20261028180803_v42_bot_conversation_types` was create-only/reviewed and
  deployed to native dev+test; unrelated generated index operations were removed.
- New API: `GET/POST /admin/bot/conversation-types`, `DELETE /:id`;
  GET query `{after?: UUID, limit:1..100 default50}`, response `{builtins,items,nextCursor}`.
  Built-ins are returned on every page and never inserted as mutable rows. Custom names
  retain casing, max60 matches saved script.type; optional descriptions max2000.
  No total catalog limit, no paid AI and no fake-generated content.
- EXPLAIN10000 wide definitions: deep cursor page **0.322ms**, case-insensitive name
  equality **0.241ms**, `stage3a-native-final.log`; index-only ID seek then at most51
  payload fetches, name unique index seek, no table Seq Scan. Fixture uses a savepoint
  rollback; no stress rows remain and no dev catalog rows were created.
- Depcheck:2085 modules/6092 dependencies and958 modules/4422 dependencies, no violations.
  Initial lint caught Vitest's untyped asymmetric matcher; replaced it with shared
  `apiErrorSchema` parsing plus concrete assertions, not a suppression.

### Immediate remaining work

### Bulk storage/dedup verification

- Full lint8/typecheck8 and unit **1783 passed +2 skipped**, `stage3b-*-final.log`:
  shared543, server230, Admin463, Portal392, UI52, integrations103+2skip. New34 tests
  cover topic dedup/bounds, defaults, group preference, disabled personas, two-turn
  opener/closer, prompt framing and strict distinct response validation.
- Final complete bot + Dashboard thread native regression **155 passed /32 files**,
  `stage3b-bot-regression-final.log`,202.53s. Full DB **124 passed /25 files**,
  `stage3b-db-all.log`,42.22s;23 new storage tests cover actor-scoped request uniqueness,
  cursor/status/lease/error constraints, result position uniqueness, hash integrity and
  parent/result cascading cleanup. No paid AI call or new dev draft/result was created.
- Four new native index tests compare JavaScript normalization/SHA256 against PostgreSQL
  for Vietnamese, combining marks, dotted I, Greek sigma and Kelvin sign; exercise direct
  script insert/edit/delete index maintenance; and EXPLAIN10000 wide saved scripts plus
 10000 wide generated results. Focused final plans: **0.032ms saved**, **0.080ms batch**,
  `stage3b-native-final.log`, GIN/bitmap seeks, no Seq Scan on either large table.
- Three create-only/reviewed migrations applied dev+test: `20261028182820_v42_bot_bulk_storage`,
  `20261028183637_v42_bot_bulk_normalization`, `20261028184503_v42_bot_bulk_hash_cost`.
  Earlier applied migrations were not rewritten. Unrelated generated index operations
  were discarded. The batch position UNIQUE INCLUDE(id) index is SQL-managed because
  Prisma cannot round-trip INCLUDE; do not reintroduce a competing plain unique index.
- Initial native tests exposed Windows-default lowercase differing from JavaScript for
  dotted I/Kelvin. Follow-up pins existing `und-x-icu`, recomputes stored hashes and
  rebuilds the script expression index. Another follow-up computes each normalized body
  once, avoiding repeated regex work; output hashes remain unchanged.
- Bulk fixture insertion/index construction exceeded Prisma's5s interactive-transaction
  deadline. Generated10000-result setup now uses standalone statements and precise parent
  cleanup in finally. The existing10000-wide-script rotation fixture likewise moves setup
  outside that short transaction and deletes only owned IDs. All original count/candidate/
  index/no-Seq-Scan assertions and test timeouts remain unchanged; final rotation query
  **10.499ms** (`stage3b-rotation-final.log`). A test-only VACUUM/ANALYZE and new hash-index
  REINDEX was attempted before this fixture correction; no dev data maintenance or
  service restart occurred. Initial failing runs are retained in local logs.
- Depcheck passed2090 modules/6101 dependencies and962 modules/4434 dependencies.
  Q-V42-713-5 records explicit100-topic/500-script workload bounds (no truncation),
  prototype two-turn behavior and accepted single-character bulk topics.

### Stage 3c — actual HTTP bulk generation and selected-save runtime

Source commit: **5626203f**, pushed. `POST /admin/bot/bulk-scripts`, own latest,
batch metadata, keyset item pages, persisted selection, retry and save now exist.
Mutations require `bots.action`, reads `bots.view`; audit and outbox are transactional.
Actor/requestId replay coalesces creation. Type name/description are snapshotted.
Live-group checks cross the public Community service, not a Bot cross-domain query.

Generation claims one cursor with a180-second lease, calls the existing configured
LLM outside transactions, parses/sanitizes strict JSON and server-assigns personas.
Exact turn counts and normalized distinct content are mandatory. Saved/batch hashes
are checked before accepting an item. At most three real attempts per cursor,
provider retry backoff60s and invalid/duplicate retry1s; terminal errors preserve
completed items and selection. Late/duplicate worker results are fenced by claim ID.
The existing outbox/single bot worker processes strict `bot.bulk_due`/`bulkGenerate`
payloads; indexed tick recovery restores lost delivery without another consumer.

Selected save rechecks collisions under the existing execution lock shared with
manual script creates/updates/deletes. One set-based insert allocates script IDs and
updates saved markers; one audit bulk insert records every created script. Saved
markers survive script deletion, so a replay never silently recreates a deleted script.
Read counts and batch metadata use one repeatable-read snapshot.

Evidence so far:
- Actual local HTTP API/generation/worker tests:20 passed across3 files. Includes
  permission/input413, failed-audit rollback, simultaneous request/save replay,
  restart-persisted selection, provider401, invalid JSON/count/duplicate failures,
  expired-claim fencing, type snapshot, group/persona eligibility, actual Admin LLM
  config/key/model/maxTokens, no fake fallback when disabled, outbox and recovery.
- 10000-row persona/item/recovery plans:3 passed; initially0.192/0.162/0.041ms,
  membership GIN plus ID-only fallback and primary-key profile joins, ordinal covering
  seek followed by page payload join, status/nextAt recovery index-only seek.
- Root lint/typecheck/unit gates passed (1783 unit tests +2 existing skipped); depcheck
  passed2090/6101 frontend/shared and979/4559 server modules/dependencies.
- Initial audit-count test counted older preserved audit records whose script sequence
  IDs were reused by test resets. Scope now includes this test's unique actor and still
  requires exactly one create audit for the saved script.
- Full bot regression found one duplicate-index naming regression (170 passed/1 failed):
  the new persona membership GIN duplicated existing `personas_enabled_groups_idx`.
  Follow-up migration20261028192338 reuses the original index and removes the redundant
  new one; original reply assertions remain unchanged. Rerun evidence follows below.
- Maximum4000-hash selected-save EXPLAIN exposed a real sequential scan on10000 saved
  scripts (1668.806ms). The correction uses one set-based SQL query with parameterized
  single-hash GIN probes, not an application query loop or forced planner configuration.
  Corrected maximum-case plan34.704ms,4000 index probes, no wide-table scan;
  maximum500-script/4000-line atomic save and marker/audit/replay tests plus existing
  hash-index tests all passed (5 tests). Root lint/typecheck/unit passed again.
  The persona fallback fixture now includes disabled rows so its partial enabled-ID
  index has meaningful selectivity; exact index/no-sequential-scan assertions remain.
  Corrected persona/item/recovery plans0.180/0.178/0.041ms passed in the full rerun;
  full bot rerun passed172 tests/36 files, including the unchanged original reply
  storage/GIN assertions. DB migration suite passed124 tests/25 files across85 migrations.
- Final stage3d source **25587692**, pushed. Root lint/typecheck/unit passed;
  depcheck passed2090 modules/6101 dependencies and980 modules/4565 dependencies;
  server build passed. No full-app build/MSW/native-browser/parity claim for713 yet.
  Evidence logs: `.git/codex-v42-713/stage3d-{bot-all,db,lint,typecheck,unit,depcheck,server-build,hash-fixed}.log`.
  Initial failed plan/regression logs are retained; no assertion/timeout masking.

### Immediate remaining work

1. Admin reply/bulk components/hooks and remaining MSW persistence/handlers.
   Schedule UI/MSW are implemented in stage4a below; reply/bulk screens remain.
   Existing MSW still needs D-112 repeating rotation and reply policy cutover.
2. Full713 gates, identical native/MSW behavior assertions, raw parity evidence,
   completion report; then714/M4/final acceptance. No713 DONE claim yet.

Native HOLD processes unchanged. Migrations applied without restarting protected
4000/4001/worker; API4041 still serves712. Tests use Postgres5432 opchub_test,
Redisdb2, ephemeral API ports and actual local HTTP stubs, not paid providers.
No dev fixture/provider config changes, source secrets or env edits.

### Next stage handoff (stage4, append exact manifests before edits)

- API contracts now stable: shared `bot-schedule.ts`, `bot-replies.ts`,
  `bot-conversation-types.ts`, `bot-bulk.ts`. Existing `features/bots/api.ts` should
  remain a narrow catalog facade; add independent workflow API/hook modules.
- `components/bots-screen.tsx` is110 lines and orchestrates `AutoPanel`, `BotTabs`,
  `BotDrawers`; keep new schedule/reply/bulk views extracted. Existing AutoPanel has
  old global-enabled switch, autoGenerate/replyToMembers toggles and topics input.
  Reconcile pause/schedule display with existing emergency disabled state explicitly.
- `apps/admin/src/mocks/handlers/bots.ts` composes catalog/runtime/emergency handlers.
  Add separate workflow handlers, not new logic in a large unrelated file. Runtime
  handlers currently expose only settings/activity/threads. Shared mock runtime state
  lives in `mock-data/domains/bot-state.ts`/`bot-state-types.ts`; D-112 schedule,
  repeating rotation, latest-N reply runs and bulk persistence still need integration.
- Bulk batch latest is scoped to current actor; item pages max50 use ordinal keyset.
  Keep persisted selection and load-more rather than silently treating only first50
  results as the whole batch. Max100 topics/500 scripts and errors must be visible.
  Saved items cannot be deselected/re-saved; counts and retry survive reload.
- Mock providers are allowed only in explicit MSW mode; native UI must use configured
  HTTP runtime and never invent results. Actual local HTTP worker coverage is ready.
- Protected dev workers share the fixed Bull prefix/Redisdb1. Before713 browser native
  worker verification, inspect ownership/isolation; do not create a competing consumer
  with a disjoint job-handler map, stop HOLD processes, or change env files.

### Stage 4a — persisted schedule UI and mock publication fences

Implemented separate schedule API/hook/header/bar components and audited MSW handlers.
Main switch and pause button preserve pending work; clearing dates does not resume.
Explicit emergency recovery clears pause before re-enabling, serialized with existing
emergency controls. Invalid dates return field errors without optimistic changes.
The shared mock snapshot persists schedules and every admission/publication entrypoint
rechecks the same VN-date policy as native. No protected native process/data reset.

Evidence:
- Root `pnpm test --force`: **1805 passed +2 existing skipped**, all6 tasks fresh,
  no cached suite. Admin479, Portal392, shared549, server230, integrations103, UI52.
- Root lint/typecheck passed; depcheck passed2104/6175 frontend and980/4565 server.
- New tests:6 shared schedule,6 Admin handler,5 hook and5 component cases.
- Admin/Portal isolated MSW production builds passed; identical browser schedule
  assertions passed at1440/390 (**2 tests**): pause, edit both dates, reload, clear
  while paused, keyboard resume, no horizontal overflow.
- A fresh regression run exposed an obsolete Portal30-second expectation hidden by
  Turbo's prior cache. It now tests4999/5000ms per D-112, retaining publication counts
  and idempotency assertions. Full fresh rerun passed; original failed log retained.
- Initial full-page schedule parity: **0/10 captures <=3%**, two capture-helper tests
  passed. Desktop3.66–4.08%, mobile6.03–10.56%. These are real FAIL rows, not an
  exception converted to PASS. Inspecting actual screenshots found missing upcoming
  reply tab, mobile heading/badge wrapping, unequal post-click scroll position and
  the prototype's still-frozen toast. Initial raw evidence is retained.
- Actual prototype computed styles showed date input14px, date label12px/gap4,
  action13px with semibold pause/resume. CSS corrected after the initial captures;
  corrected-build parity remains to run. No hiding controls or threshold changes.
- Initial browser invocation had the wrong Admin relay build origin; rerun with
  explicit local Portal origin passed. No app assertion was relaxed.

Logs: `.git/codex-v42-713/stage4a-{unit-fresh,lint-final,types-final,depcheck,relay-build,behavior-relay,parity}.log`.
Native browser schedule verification, complete reply/rotation/bulk UI/MSW, full713
regression and final visual measurement remain. Continue directly; no713 DONE claim.

Stage4a source **5fb88716**, pushed. The next visual correction uses the actual
prototype flex-wrap/badge metrics and identical clock advance/scroll origin on both
sides, allowing the real2200ms toast to expire rather than hiding it. Corrected Admin
build passed. Remeasurement: **5/10 captures pass** (all desktop2.08–2.12%); mobile
remains4.62–4.78%, notably with the still-unimplemented reply tab changing lower-page
height. Raw mobile FAILs remain; initial measurements are preserved in5fb88716.
The two capture-helper tests also passed. Logs: `stage4a-visual-{build,parity}.log`.
No native browser or complete713 visual acceptance claim is made.

Visual correction source **ba704360**, pushed; root lint/typecheck/unit passed again
(1805 passed +2 existing skipped). Current focused browser regression uses the
unchanged14-test bot suite; its automatic lifecycle deliberately waits for two actual
five-minute gaps. Do not cancel or call it blocked merely because it takes ten minutes.
Live evidence: `.git/codex-v42-713/stage4a-bot-browser.log`.

### Stage4b-0 — latest-N mock scan foundation

Added independent `bot-reply-scan.ts` plus6 focused tests. It takes the latest N
before filtering, excludes hidden/non-human/non-text/topic/already-answered messages,
retains deduplication after hidden replies and display pruning through publication
metadata, ranks pending groups deterministically, and bounds display to10×8 without
dropping totals. Persona counts intentionally ignore script hours/quota but retain
enabled/group assignment. This is the scanner foundation, not a wired reply-run API.

Remaining reply integration is explicit: durable run/control snapshot,20-second auto
scan cadence, serial cursor/publication and run stop; reply-only12/group60/system/min
policy; Admin handlers/API/hooks/tab/history; existing reply regression contracts must
be updated to D-112 without weakening identity/quote/idempotency assertions. The
current mock immediate admission still has legacy hours/quota/cooldown until that
cutover. No complete mock/native parity claim for reply behavior yet.

Actual reply prototype was opened at1440/390; local reference captures are
`.git/codex-v42-713/proto-replies-{desktop,mobile}.png`. It shows the visible reply tab,
auto toggle, latest-N/delay inputs, manual scan, group ranking, selected-group preview
and history. Native overview `groupCount` counts pending groups, not all monitored
groups; total monitored-group text can reuse the existing group catalog.

Scanner gates: root lint/typecheck and `pnpm test --force` passed (**1811 passed
+2 existing skipped**,0 cached tasks); depcheck passed2106/6185 frontend/shared and
980/4565 server modules/dependencies. Focused scanner suite6/6 passed. Logs:
`.git/codex-v42-713/stage4b-scan-{test,lint,types,unit,depcheck}.log`.


### Stage4b-1 — persisted mock reply runtime and HTTP controls

Completed the scanner cutover: persisted settings/run/cursor/history, 20-second
scan cadence, serial delayed publication, manual scan with auto off, explicit stop,
schedule/emergency fences, latest100 actual publications independent of display GC,
and reply-only12/group60/system rolling-minute budgets. Hours/quota/120-second
cooldown no longer gate replies; enabled assigned personas and source validity do.
Strict validated Admin handlers expose overview/settings/run/scan/stop and audit
successful writes in both logs. Legacy snapshots default missing workflow state;
malformed snapshots are rejected atomically. The browser bridge wraps all /v1
handlers and captures community snapshots, including this validated workflow.

Fresh root tests passed **1832 +2 existing skipped**, zero cached tasks: shared568,
Admin487, Portal392, server230, integrations103, UI52. Added11 coordinator tests,
2 rate tests and8 Admin HTTP cases. Existing quote/identity/idempotency assertions
remain; script-only fixtures explicitly disable unrelated new auto scanning of
seed messages. Original failing lint/type/fixture logs remain alongside corrections.
Typecheck passed; final lint correction removes redundant test method assertions.
Depcheck passed2115/6240 frontend/shared and980/4565 server modules/dependencies.
Logs: `.git/codex-v42-713/stage4b-runtime-{unit-final,types-pass,lint-pass,depcheck}.log`,
`stage4b-handlers-pass.log`, `stage4b-run-final.log`.

The unchanged14-test browser regression completed successfully (18.9 minutes),
including actual five-minute lifecycle gaps and emergency hide/reload. This used
the preceding stage4a build, NOT the new reply runtime; new isolated builds and
browser verification are following work. Do not substitute those14 passes as new
runtime browser evidence. Native HOLD processes/data remain untouched.

Remaining: reply Admin tab/hooks/history and browser evidence; rotating mock
stored scripts; bulk UI/MSW; full713 regression/native/parity, then714. No713 DONE.


Runtime source **486ff39e**, pushed. Both isolated production builds passed;
new-runtime browser reply/quote/F5 plus schedule desktop/mobile passed **3/3**.
Logs: `stage4b-runtime-{admin-build,portal-build,browser}.log`.

### Stage4b-2 — Admin reply UI

Implemented `/bots/replies`, validated API client, serialized permission-gated
mutations, polling overview, bounded settings, manual scan/stop, actual run progress,
pending-group ranking/preview and latest20 actual history rows. Canonical settings
and reply toggles invalidate each other. Monitored count comes from group catalog;
Q-V42-713-8 records the absence of a promised persona in the native preview contract.

Fresh root unit **1845 passed +2 existing skipped**, zero cached tasks (Admin500,
shared568, Portal392, server230, integrations103, UI52). Added5 hook,5 control and3
ranking/history tests; extended route assertions. Root lint/typecheck passed after
extracting the control header/run and delete prompt; depcheck passed2131/6296
frontend/shared and980/4565 server modules/dependencies. Isolated Admin build passed.
Browser controls/reload/manual-auto-off/stop passed **2/2** at1440/390; reply/quote/F5
and schedule regressions passed **3/3** on the new UI build. An initial browser
observer captured an old-document invalidation response before reload; corrected
it to observe a fresh post-navigation poll, preserving all persistence assertions.

Raw full-page parity: **5/12 pass**. Schedule/log desktop2.00–2.04%; mobile3.32–3.45%
(improved from4.62–4.78% after adding the reply tab). Reply tab3.20% desktop/9.08%
mobile remains FAIL. Actual images expose correctable active-run layout differences
(stop control placement/progress bar), schedule caption height and empty-log gap,
as well as recorded truthful-preview differences. No masking/threshold relaxation.
Original raw results are committed before further corrections. Two capture-helper
tests also passed; do not count them as visual passes. Capture SHA is parent486ff39e
because measurements preceded this UI source commit.

Logs: `.git/codex-v42-713/stage4b-ui-{unit-final,lint-pass,types-pass,depcheck,build,browser,browser-fixed,parity}.log`.
Continue visual corrections, rotating mock scripts and bulk UI/MSW, then full713
native/regression/acceptance. This is IN-PROGRESS, not713 DONE and not blocked.


UI source **8fce507b**, pushed.

### Stage4b-3 — measured layout corrections

Corrected schedule caption type/spacing and retained the prototype's separate
empty-log/list siblings. Schedule/log now **10/10 visual passes**, desktop0.43–0.45%
and mobile0.19–0.24%. Initial raw failures remain in prior commits, not overwritten
as if they had passed. Active reply layout now places Stop in the scan action slot,
adds a true processed/total progress bar, shows the running-group badge, and uses
observed typography, switch size, grid columns and responsive control layout.
Q8 preview keeps a truthful “Chọn khi trả lời” column instead of a fabricated name.

Root lint/typecheck/unit/depcheck passed. Fresh unit **1846 +2 existing skipped**
(Admin501; other package counts unchanged); subsequent root unit rerun also passed.
Added actual running-group badge coverage and progressbar bounds; replacing Scan
with Stop retains the assertion that a second scan cannot be triggered while running.
Browser manual-auto-off/stop/reload and schedule at1440/390 passed **4/4**.
Latest isolated build and final reply capture are recorded below after completion.
Logs: `.git/codex-v42-713/stage4b-visual-{unit,final-lint,final-types,final-unit,final-depcheck,browser}.log`.

Final reply capture passed **2/2**:0.98% desktop and1.50% mobile. Combined current
schedule/log/reply evidence is **12/12 <=3%**. The final correction preserves normal
word wrapping in the narrow source-name column (prototype computed26/24/220px grid)
and uses a one-line group label; no masks or hidden required controls. Final build
passed; logs `stage4b-visual-wrap-{build,parity}.log`. Old raw FAIL images remain in
8fce507b; the harness removes only current passing diffs. No native713 visual claim.

### Stage4c — persisted stored-script rotation in MSW

Implemented native-equivalent free-group stored rotation: null/past timestamps
remain eligible, future timestamps are a not-before fence, and each group retains
its own cursor across reload/history pruning. Optional eligible AI gets the slot
after stored work; unavailable AI does not starve rotation. Manual multi-group
admission/coalescing and audit remain distinct from group-local automatic work.
UI labels now describe rotation rather than falsely promising manual-only behavior
(Q-V42-713-3); no native business contract was changed.

Seven new rotation tests cover cycle/wrap, independent groups, capacity/fences,
deleted-script cursor, strict legacy-compatible snapshot restore and AI alternation.
Focused scheduler/persistence run passed94/94. Initial root regressions exposed
reply-only fixtures admitting unrelated scripts, manual multi-room tests relying
on the superseded automatic model, and an activity read that requested another
cycle. Explicitly isolated those fixture domains while retaining all exact quota,
publication and feed assertions. A moderation test reusing the reply-only fixture
now explicitly enables its script;13/13 focused moderation tests passed.
Dependency check caught a circular re-export; callers now import rotation directly.

Actual browser proof added: create two null-date scripts through Admin, allow real
one-minute spacing, reload between cycles and observe A → B → A with fresh execution
IDs. No synthetic clock or direct API writes. Final gates/browser results follow.

Final root lint/typecheck/unit/depcheck passed. Fresh unit **1853 +2 existing skipped**
(shared575, Admin501, Portal392, server230, integrations103+2skip, UI52).
Admin manual-only fixtures now fence automatic rotation with future timestamps,
not disabled scripts; seeded/manual work still executes normally. Emergency HTTP
coverage asserts no publication while disabled and fresh IDs after explicit resume,
with all stopped IDs terminal. Focused HTTP regressions passed22/22.
Browser **5/5 passed**, including real A → B → A across two reloads (2.3minutes),
plus settings/manual reply stop/schedule controls at1440/390. Both isolated builds
passed. Current D-39/D-40 parity **4/4 passed**: scripts0.51/0.43%, drawer0.12/0.40%.
Capture SHA is parent50cb9ad5 because captures preceded this source commit.
The full17-test bot browser regression is running separately; no final result claimed.
Logs: `.git/codex-v42-713/stage4c-{gates-lint,gates-types,gates-unit,gates-depcheck,browser,parity,http-fixed,bot-regression}.log`.
Next: persistent bulk mock/API/UI and conversation-type catalog, then full/native713
verification. TIP713 remains IN-PROGRESS; no checkpoint blocking.

Rotation source/evidence committed and pushed as **3ff89360**.

### Stage4d-1 — persisted mock conversation-type catalog

Added the native-equivalent type catalog behind actual MSW GET/POST/DELETE routes:
four immutable builtins, case-insensitive custom-name uniqueness, UUID keyset pages,
strict request validation, permission checks and successful-write audits. Custom
definitions persist through the existing snapshot boundary with a legacy empty
default. Deleting a definition preserves previously saved script labels.
Focused shared contracts/domain tests passed17/17 and HTTP tests passed3/3.
Seven new tests cover domain/persistence/paging and real handler permissions/audit;
no provider calls, UI-only state or native fallback was introduced.
Fresh root unit passed **1860 +2 existing skipped**; an unsafe asymmetric matcher
in the HTTP test was replaced with typed parsed-field assertions, not a lint bypass.
Final root gates follow; bulk draft generation/selection/save UI is still next work.

Final root lint/typecheck/unit/depcheck all passed. Logs:
`.git/codex-v42-713/stage4d1-{shared,http,unit,final-lint,final-types,final-unit,final-depcheck}.log`.
The ongoing17-test browser regression has also passed the real10.3-minute automatic
three-turn lifecycle with chat persistence; remaining tests are still running.
This catalog change has no rendered UI yet; browser catalog management will be
verified with the bulk UI, not claimed from handler tests.

Conversation-type catalog source committed/pushed as **78cc815b**.

### Stage4d-2 — persistent mock bulk drafts and API

Implemented the approved bulk contracts in independent mock modules and actual
MSW handlers: actor/request replay, actor-specific latest, ordinal result pages,
persisted cursor/selection, three-attempt retry budget, strict draft validation,
normalized deduplication, missing-group/persona failures, explicit atomic selected
save and permanent saved-item markers. Deleting a saved script cannot recreate it
through save replay. Draft generation remains available during publication pause.
MSW's completion function is explicitly test-only; native configured AI never falls
back to it. Successful controls, generated items, terminal failures and saved scripts
produce actual mock audit records. No frontend-local fake workflow was introduced.

Added19 tests (shared15 + HTTP4), including the full500-result/eight-turn workload,
reload round trip and corrupt-snapshot atomic rejection, partial ready results through
provider/invalid/duplicate failure, retry deadlines, late-save collisions, permissions
and repeated save. Focused shared31/31 initially and HTTP4/4 passed; final fresh root
unit **1879 +2 existing skipped** passed (shared594, Admin508, other counts unchanged).
Root lint/typecheck/depcheck all passed. Fixed non-null assertions with validated
mapping/paired item-script plans; no rule suppression. Logs:
`.git/codex-v42-713/stage4d2-{shared,http,http-fixed,final-lint,pass-types,final-unit,final-depcheck}.log`.

The broad rotation-build browser run completed **16 passed /1 failed** in21.4minutes.
All10-minute auto lifecycle, emergency stop/hide, reply/chat reload and rotation tests
passed. The single manual-stop test retained its stopped cursor correctly, but its
unique activity-text locator saw3 legitimate later automatic rotations. Its fixture
now sets the selected script's future not-before date through the real Admin UI;
manual run remains immediate. No assertions, timeouts or production behavior were
weakened. Both helper callers (manual-stop + automatic admission) passed **2/2** on
rerun. Keep the raw16/1 run distinct from that corrected subset, not a fabricated
17/17 full run. Logs `stage4c-bot-regression.log`, `stage4c-browser-manual-fixed.log`.

Next: render and verify bulk modal/type management/results controls at1440/390,
then full/native713 gates and completion. Bulk UI/browser proof remains incomplete.

### Stage4d-3a — Admin bulk data hooks

Added strict-schema API clients and independent TanStack hooks for bulk draft
recovery, bounded ordinal pages, running-only polling, explicit selection/retry/save
and paged conversation-type management. All writes use `bots.action`, a same-frame
lock and the existing bot-control mutation scope. Confirmed server responses are
the only source of progress/selection; saving invalidates the real script catalog.
Create request IDs survive uncertain same-input failures, normalize duplicate
topics, and change after a confirmed success or changed input. Oversized input is
rejected, never silently truncated. Older selection responses cannot replace a
newer recovered draft. No native/provider/runtime behavior changed.

Focused tests **22/22 passed** across six files: strict client contracts, replay,
permissions, write serialization, error/field retention, server-state invalidation,
cursor traversal, reload recovery and running-to-done polling under a test clock.
Initial test failures exposed assertions before TanStack's asynchronous observer
notification; corrected them to await the exact expected state, not loosen it.
Lint findings were fixed without suppression. Question Q-V42-713-5/6 reiterates
the owner's instruction to record differences and continue, not checkpoint-block.

This increment is the UI data layer, not the rendered bulk modal. Bulk form,
conversation-type picker/editor, progress/results/selection/save controls and their
browser/parity evidence are still next. TIP713 remains IN-PROGRESS.

Root lint/typecheck/unit/depcheck all passed. Unit total **1901 passed +2 existing
skipped** (Admin530 freshly executed; shared594, Portal392, server230,
integrations103+2skip, UI52 reused unchanged Turbo results). Dependency checks:
2167 frontend/shared modules, 6457 dependencies; server980/4565, no violations.
Logs `.git/codex-v42-713/stage4d3a-{scoped-pass,lint,types,unit,depcheck}.log`.
No browser capture claimed for this unrendered data layer; native HOLD untouched.
