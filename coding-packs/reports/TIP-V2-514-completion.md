# TIP-V2-514 — MSW bot permissions and successful-command audit boundary

## Reproduced and corrected
All **17 original HTTP cases failed before** the change against the actual
Admin handler registry. They now pass unchanged: six read routes require
`bots.view`; nine write routes require `bots.action`; invalid persona creation
has no phantom audit; successful creation records the actual actor/new ID.

- Bot handlers are a small orchestrator over separate catalog/runtime/emergency
  modules. Shadow legacy bot routes/imports were removed from admin-system;
  unrelated services/settings/category handlers were not expanded or rewritten.
- The existing Admin guard runs before worker advancement, validation, mutation
  or audit. No role-name authorization. Read-only accounts can inspect data, but
  may not mutate; current grants are re-read each request (NA-28). Action-only
  grants work even without bots.view and are not treated as a role shortcut.
- Successful catalog/settings writes emit one private bot audit, one shared
  machine audit and one visible moderation-tagged activity row with actual
  actor/ID/time. Run/stop propagate actor to their existing domain audit, avoiding
  duplication. Explicit manual replay still audits; failed/terminal commands do not.
- Shared upsert schemas preserve defaults/DTOs, postCount and script destination
  deduplication. JSON is parsed strictly, never converting malformed/null into{}.
  Every one of the nine writes enforces the native768KiB JSON byte limit,
  including run/stop/delete requests whose payload is otherwise unused.
- The old happy-path bot suite now supplies its legitimate Admin token; all its
  assertions remain unchanged. Seventeen initial failing assertions remain
  unchanged; expanded coverage includes CRUD, read-only/current grants, replay,
  validation fields, 400/404/409/413 and preservation of state on failure.

## Test-design correction disclosed
The first expanded run had43 passes and one new test failure: it incorrectly
expected page=0 to return400. Native and mock share `pageQuerySchema` whose
`.catch(1)` deliberately normalizes that page. Production/schema behavior was
not changed to satisfy this mistaken new expectation. The400 negative case now
uses a truly invalid repeated search parameter, matching Express's array query
shape; mock query parsing now preserves duplicate keys. An additional exact
response test requires page=0/size=bad to normalize to page1/size10 and the
actual stored items/total, with no worker side effects. All failed receipts are
retained. This is not removal/relaxation of any original17 regression assertions.

## Verification
- Initial17/17 fail; post-correction17/17 pass. Expanded cohort **54/54 in5 files**
  (45 new cases plus9 existing bot/scheduler cases) passes before final root gates.
- Root lint8/8 (seven cached), typecheck8/8 (six cached) pass. Forced repository
  units **1112 passed + 2 existing storage skips**, six tasks, zero cached:
  Admin422/shared220/Portal172/server203/UI43/integrations52.
  Depcheck: zero violations, FE1550 modules/4354 dependencies, server765/3388.
  `evidence/v2-514/` retains sanitized initial failures, corrected/expanded HTTP
  runs and all root gate receipts, including initially failed lint.
- Initial lint flagged two unbound methods and an unsafe matcher value; wrappers
  and typed zod error-field assertions fix them without lint suppression.

## Remaining goal scope
No native production/schema/process/data change or real-provider call. The last
full native1300/1300 receipt is at6ce5094b, not a new run of this checkpoint.
Full storage/avatar ownership/cascade catalog alignment, mock auto/limits/day
metrics/live transport/bridge, human warn/lock effects, both browser lanes,
real-provider browser E2E, UAT/AT/LK/audits/parity, final reports/dev integration
and owner-reviewed dev-to-main PR remain open. No main merge or new UI waiver.
