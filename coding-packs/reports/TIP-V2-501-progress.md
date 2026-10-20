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
