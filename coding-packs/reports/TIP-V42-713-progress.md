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

1. **Real-AI bulk generation/deduplication/selected save**. Types are now implemented;
   consume `BotConversationTypesService.get(id)` and snapshot its name/description into
   durable batch inputs. Append exact manifests before edits. Existing
   `LlmProvider.complete(prompt, opts)` and `LlmRuntimeService.complete` already support
   a real arbitrary prompt through the configured HTTP adapter/shared60-request-minute
   guard. No new provider API is needed; generate each validated JSON conversation with
   one actual call rather than adding per-turn calls or fake templates. The adapter
   enforces configured maxTokens,64k input/response budgets and failure behavior.
2. Admin schedule/reply/bulk UI and complete MSW schedule/rotation/reply policy persistence/handlers. Server schedule/reply/rotation/minute runtime is implemented. Preserve same assertions for native/MSW, add parity and full713 gates, then completion report and714/M4/final acceptance.
3. Remaining bulk design must respect prototype `index.html:4998–5010`: newline case-insensitive topic dedup; per-topic1–5/default2, turns2–8/default4, delay1–60/default5, groups required, ≥2 enabled personas, generated results selected initially, save only selected. No fabricated suffix/template fallback. Use indexed normalized saved-line fingerprints and durable generation results; local HTTP stubs only for tests. No bulk-generation endpoint/storage/worker or713 UI has been implemented yet. The type catalog alone is not AC8/AC9 completion.

Native HOLD processes unchanged. New713 migrations were applied while services remained running; do not restart/kill protected4000/4001/worker. Existing API4041 serves712 build, not713. No source secrets/env edits.
