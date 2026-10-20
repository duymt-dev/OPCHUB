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
