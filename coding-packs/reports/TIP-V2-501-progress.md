# TIP-V2-501 — IN-PROGRESS

User reopens P5 after P4. Implement TIP-501, TIP-502, then TIP-503 acceptance;
functional tests before parity. Branch `feature/V2-P5-bot-acceptance` starts
from dev `e734f52`. Integrate into dev; owner reviews/merges the dev-to-main PR.
Do not follow old TIP instructions that tell the agent to merge main directly.

## Scheduling-domain checkpoint

- Small pure modules for VN activity windows/day boundary, due-time selection,
  bounded turn delay and scheduled/running/done lifecycle transition rules.
- Explicit-date/sample tests cover time boundaries, legacy separators, invalid
  persisted hours, VN midnight, overnight/full-day ranges, delay limits,
  manual-only/consumed schedules and all nine state edges.
- Existing activity count calls the extracted day-start helper with unchanged
  arithmetic. The new lifecycle helpers do not enable the scheduler by themselves.
- **44/44 domain units in three files**, included in server **174/174 in 36
  files**. Repository unit task passes, server executed/five other tasks cached.
  Lint/typecheck/depcheck pass; original Next img warnings are not new errors.
- Evidence: `evidence/v2-501/domain/`. No native DB/cache reset, migration,
  server rebuild/stop, new native integration/e2e or parity run at this point.

## Remaining implementation / verified baseline

Runtime still uses pending/posted DB states, review APIs and batch thread posts;
bot worker processor is absent. Existing persona posting already invokes sent
hooks and ChatFeed; retain these instead of claiming they are missing.
At the initial checkpoint LLM supported complete() only; the next checkpoint
below adds the turn interface and DI boundary.

Next: reviewed migration/indexes, shared contracts/CoreModule, queue scheduler
and processor, idempotent transactional single-turn runner, pause/rate/caps/
retention, Admin/MSW semantics, integration/negative/replay tests and e2e.
TIP-502 replies/kill switch and TIP-503 full acceptance also remain pending.
**Not TIP-501 DONE, not P5 DONE.** Native acceptance services remain on HOLD.

## Turn adapter / real-LLM acceptance requirement

- `LlmProvider.generateTurn` now accepts a typed persona/topic/history context;
  existing complete() stays compatible. FakeLlm is deterministic and does not
  make network requests; four dedicated adapter tests prove output/context
  stability and no fetch. This is not a real-model quality test.
- Global `LLM` DI token resolves via the configured provider factory. The
  default `BOT_LLM_PROVIDER=fake` is documented in env example and parsed by
  zod; unknown providers are rejected, never silently treated as fake.
- Actual Nest module resolution plus development/test defaults and unknown
  configuration rejection pass four focused server cases. The unit test supplies
  a global ENV provider rather than replacing the LLM provider under test.
- Initial all-unit run failed in the in-progress DI test factory (undefined
  createLlmProvider in the test). Corrected test wiring; retained failed log.
  Final repo lint/typecheck/unit/depcheck pass. Server **178/178** and integrations
  **29 passed + 2 existing skips**; focused cases are included, not extra totals.
- User explicitly requests real-LLM e2e too, overriding fake-only wording for
  that additional acceptance lane. Provider/model, private env location and
  spending limit were requested; credentials were not yet supplied at that checkpoint. Do not run unbounded chargeable calls,
  choose a provider for the user or count fake tests as real-LLM evidence.
- The selected real provider will be opt-in with bounded requests/timeouts and
  synthetic seed data; preserve FakeLlm regression/negative/retry coverage.
  Required native real-LLM worker-to-chat-to-UI acceptance remains **NOT RUN**.
- Evidence: `evidence/v2-501/llm/`. No migration, native reset/restart or parity
  work occurred in this checkpoint. Scheduler/runner and TIP-502/503 remain open.

User subsequently supplied a local/tunnel provider and requested private storage.
Credentials are saved only in `D:/opchub-local/v2/llm-local.env`, outside Git.
Do not copy its contents into reports, fixtures, env examples, logs or frontend.
Model compatibility and the opt-in real-provider implementation/native e2e are
separate pending work; credentials being present is not proof of a passing run.

## Opt-in local provider checkpoint

- User endpoint advertises the configured model (GET models HTTP 200).
  One direct short completion probe returns HTTP 200, finish stop, four output
  tokens. A subsequent smoke through the actual LocalLlmProvider.generateTurn
  adapter also returns nonempty text. These are **provider smoke checks**, not
  native worker/chat/browser e2e; that acceptance requirement remains open.
- Real adapter is selected only by BOT_LLM_PROVIDER=local. Shared zod parses
  config and completion responses; empty/truncated responses fail rather than
  becoming successful chat messages. No fake fallback, internal retry, credential
  URL, insecure remote HTTP or redirects carrying authorization.
- Bounded requests include failures, input/output limits, output token ceiling
  and timeout. Default ten requests is **per worker process**, resets on restart,
  and is not a global billing or currency limit. Real adapter smoke uses one
  request maximum and 64 output tokens with synthetic context.
- Network/provider errors expose only normalized errors, not raw body/header,
  credentials or causes. 4xx (including 429) are nonretryable; 5xx/network failures
  are retryable within the eventual job policy. Aborted calls spend the budget.
- Integrations adds the existing @opchub/shared workspace dependency to reuse
  external config/response schemas rather than duplicate boundary definitions;
  no SDK/new external package. Lockfile updated, no schema/Prisma change.
- Protocol tests first had an assertion mismatch for absent error.cause, then
  strict lint rejected async mocks/asymmetric any values. Corrected with typed
  transport mocks and explicit no-cause/no-key assertions; raw failed logs kept.
  Final lint/typecheck/unit/depcheck pass; 23 protocol tests are mock-HTTP, not
  23 real requests. Server units 183/183; integrations 52 passed + 2 existing skips.
- Initial external smoke script failed before HTTP due to Windows ESM path
  syntax. Corrected to a file URL; final actual adapter smoke passes. Private
  env/probe script stay outside Git; only redacted terminal logs are archived
  under `evidence/v2-501/local-provider/`.
- No native worker/API restart, DB migration/reset, scheduler activation or
  parity work yet. Continue the actual scheduler/runner implementation next.

## Atomic single-turn storage checkpoint

- Chat exports a small PersonaTurnWriter accepting the caller's DbTx, so future
  runner cursor/status updates can commit or roll back with messages, post count,
  retention and durable bot.turn_posted records. It does not open its own tx.
- One sanitized text turn per assigned/enabled persona/default room; reply
  targets must be visible and in that room. Stable room/persona locking plus
  the existing persona/client-message unique index handles concurrent replay.
  Only actual inserts increment postCount; partial-room retry does not overcount.
- Retention runs immediately in the same transaction, preserving 120 simulated
  messages per touched room and never deleting member messages. Publication
  uses one outbox row per message in one createMany, not N database calls or a
  payload-size cap on the number of target groups.
- Native tests cover commit/outbox, parallel replay, partial retry, rollback,
  disabled/unassigned/invalid content, reply visibility/same-room and retention.
  Integration setup explicitly pins FakeLlm; the opt-in real native E2E lane is
  separate, so inherited real credentials cannot accidentally bill int tests.
- The initial correlated-unnest prune EXPLAIN used a full-table hash update on
  a skewed 10k fixture. Fixed the actual query (not planner flags/assertions):
  bind each room's indexed ID selector and UNION ALL them in ONE SQL statement,
  then update by PK. The exact runtime fragment is checked with ANALYZE/BUFFERS
  on 10,242 synthetic messages: partial Index Only Scan + PK Index Scan, no
  messages Seq Scan; measured execution 0.450ms at the focused checkpoint.
- Intermediate wrong fixture size and an optional-ID TypeScript error are
  retained in raw logs. No threshold/scan assertion was weakened. Final command
  outcomes and exact full-folder count are in `evidence/v2-501/turn-storage/`.
  Native `test/bot` passes **12/12 in two files** (eight new storage cases and
  four legacy bot API cases). Repo lint/typecheck/unit/depcheck pass; 915 unit
  passed + 2 existing skips across cached/executed tasks, not a forced rerun.
- This writer is not yet called by the scheduled bot runtime. The new outbox
  event's worker publication consumer, NA-07 delivery/retry proof, runner/state
  migration and scheduler wiring remain OPEN. No P5 behavior/e2e PASS is claimed.
  Existing live native stack, opchub_dev and Redis1 remain unchanged.

## Durable worker publication checkpoint

- BotPublicationProcessor now registers bot.turn_posted -> validated publishTurn
  jobs with stable message job IDs and three bounded exponential attempts.
  The real worker app imports ChatCore and this processor. Scheduler/tick/runner
  handlers are still pending; this does not close BUG-008 or complete TIP-501.
- Publisher reads one visible simulated message and emits the actual Portal DTO
  with no personaId/isSimulated field. No DB query per recipient. Hidden,
  deleted or deleted-group messages are not exposed by delayed publication.
- Keyword sent hooks have an explicit durable mode for this outbox path: failed
  NA-07 enqueue propagates to retry instead of disappearing in a best-effort
  catch. Existing member/direct-post callers keep their original default.
- A single atomic Redis script deduplicates message IDs while applying unread,
  Dashboard activity/count and both socket envelopes together. Cache key types
  are checked before mutations; delivery markers are bounded to 120 timestamp/
  ID entries per room, consistent with the writer's DB retention. Replay of
  pruned messages is rejected by the DB visibility check. This does not claim
  durable exactly-once socket delivery across loss/flush of Redis state.
- Integration starts actual BotPublication/Moderation processors on Redis2:
  write -> outbox relay -> BullMQ -> socket Redis envelope -> actual auto report;
  repeated/concurrent publication leaves one message/bump/counter/feed entry;
  a failed durable hook retries in BullMQ then publishes once; wrong cache type
  fails before counters and repair permits retry; delayed hidden/deleted turns
  stay hidden; marker cardinality remains 120. No fake worker or HTTP stub.
- Native `test/bot` **18/18 in three files** (six publication, eight storage,
  four legacy API). Repo lint/typecheck/unit/depcheck pass; final unit tasks are
  four cached/two executed, typecheck six cached/two executed. Existing unit
  total remains 915 passed + 2 existing skips. Evidence in
  `evidence/v2-501/publication/`; not native browser or real-LLM e2e evidence.
- The publication consumer/NA-07 delivery gap from the previous storage
  checkpoint is closed for this path. Remaining: scheduled/running/done schema
  and contract migration, automatic tick/admission/runner, daily/rate/active-hour
  enforcement, 30-thread retention, Admin/MSW transition semantics, then TIP-502
  automatic replies/kill switch and TIP-503 complete behavior-first acceptance.
  No native dev reset/restart or parity work occurred.

## Execution-fields migration checkpoint (expand only)

- Reviewed migration `20261021023000_bot_execution_fields` adds script lastRunAt
  and thread nextAt/cursor/personaQueue/kind/unique triggerMessageId. Cursor must
  be nonnegative; kind is script/auto/reply. Ordered personaQueue is text[], not
  an unparsed JSON object. Existing posted snapshots initialize cursor/order and
  auto kind without changing their timestamps or messages.
- Creation was offline/create-only via Prisma migrate diff from an exact schema
  snapshot, then manual SQL review: no shadow DB and no destructive migrate-dev
  reset. This uses the two-schema diff rather than claiming a migrate-dev
  --create-only run that would need another shadow DB outside the allowed pair.
- **Deliberate staged cutover, not the final lifecycle**: pending/posted remains
  unchanged and nextAt stays null for legacy API writes. The required
  scheduled/running/done replacement, review endpoint removal and runner/tick
  activation still must ship together. Do not claim compatibility with the old
  review flow completes D-50; these storage columns merely make that cutover safe.
- Only loopback native 5432/opchub_test was migrated, after exact target guard;
  Prisma client regenerated. No opchub_dev migration/reset/restart. Existing
  native Admin bot-list API still returns HTTP 200 after regeneration.
- Native tests verify UTC/defaults, exact migration backfill in a rolled-back
  fixture, unique trigger/null coexistence, DB cursor/kind constraints and both
  covering due indexes. ANALYZE/BUFFERS on 10,001 wide threads and 10,001 wide
  scripts confirms Index Only Scan with status/enabled equality before due-time
  ordering, cursor/lastRunAt INCLUDE payload, no Seq Scan. Raw plans retained.
- Dedicated migration/storage file **5/5**; full native test/bot **23/23 in four
  files**. Repo lint/typecheck/unit/depcheck pass; exact cache/task counts are in
  `evidence/v2-501/execution-fields/`. Unit test total remains 915 + 2 existing skips.
- No automatic scheduled turn, reply, real-LLM browser e2e or parity PASS is
  claimed. Next is the lifecycle/API/runtime cutover, not additional cosmetic work.

## Lifecycle/runtime checkpoint

See [lifecycle checkpoint](TIP-V2-501-lifecycle-checkpoint.md) for scheduled/running/
done cutover, native turn execution, real-worker pause/resume regression and raw
failure/rerun evidence. TIP-501 remains IN PROGRESS: automatic generation, full
browser acceptance and terminal-cap boundary coverage are not yet complete.

## Automatic-generation checkpoint

See [automatic checkpoint](TIP-V2-501-automatic-checkpoint.md): real per-turn LLM
orchestration with durable fenced drafts, idle-group auto planning and terminal-cap
boundary coverage. Combined native regression 62/62; repo units 927 + 2 existing
skips. Full prior integration had 3 failures; scoped TIP-504/505/506 regressions
are fixed, but final stable full integration/browser acceptance remain pending.
