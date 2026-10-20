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
LLM currently supports complete() only, not the required turn interface.

Next: reviewed migration/indexes, shared contracts/CoreModule, queue scheduler
and processor, idempotent transactional single-turn runner, pause/rate/caps/
retention, Admin/MSW semantics, integration/negative/replay tests and e2e.
TIP-502 replies/kill switch and TIP-503 full acceptance also remain pending.
**Not TIP-501 DONE, not P5 DONE.** Native acceptance services remain on HOLD.
