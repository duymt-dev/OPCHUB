# TIP-V2-501 automatic generation ? IN PROGRESS

## Implemented
- Scheduler admits due scripts first, then one automatic conversation per idle
  assigned group. Active script/auto/reply threads block auto admission there.
  Global/autoGenerate switches, Vietnamese activity windows, durable daily counts,
  shared terminal-only retention and per-group assignment are applied before admission.
- Plan shape follows prototype behavior, without copying prototype code: distinct
  opener/member, optional third participant, opener closes. Opener needs two daily
  slots; topics rotate from the latest retained auto topic. New plans contain IDs
  and empty text, not a pre-generated bulk conversation.
- Each due auto turn invokes the selected LLM adapter with persona and history.
  Script bodies bypass generation. A reviewed additive create-only migration adds
  BotTurnDraft, composite (thread_id, turn) key, bounded body/nonnegative turn checks,
  and cascading ownership. Applied only to native opchub_test; dev is untouched.
- Durable 180s lease/fencing separates network calls from DB transactions. Cached
  generated text survives posting rollback/rate-limit retry without another call.
  A competing live lease skips; expired claims can be reclaimed; late old replies
  cannot overwrite a newer draft or post twice. No automatic fake fallback.
- Provider output is validated with shared zod and sanitized before storing. Empty
  unsafe HTML is rejected. Global pause and audited HTTP stop remain available
  while a provider call is blocked; late text cannot publish after stop.
- Extracted BotRetentionService is shared by script/auto admission. Rollback-based
  native fixtures prove oldest-done eviction at 31, refusal of 31 active threads,
  and capacity-limited batch admission without touching existing test history.

## Verified
- Final targeted native run: **62/62, 14 files**: bot API/storage/publication/
  scheduling, seven generation cases, three auto-admission, three retention,
  socket, cross-DB PubSub, B5, settings contract and large-matrix audit regression.
- Repo units **927 passed + 2 existing skips**: server 195, Admin 334, Portal 163,
  shared 140, UI 43, integrations 52. Lint/typecheck/depcheck passed; raw logs
  disclose cache/task counts and existing Next img warnings.
- Full integration exploratory run before refinements: DB package succeeded;
  server **1198 passed / 3 failed in 107 files**, not green. Retained raw failures
  led to TIP-504/505/506; their focused rerun is green but does not substitute for
  a later stable full-suite run. Source work continued during that exploratory
  invocation, so it is not an immutable final-commit acceptance record.
- Initial generation test hook accidentally returned a spy as a cleanup callback;
  fixed hook ownership, not production behavior/assertions. Initial create-only
  diff failed on UTF-8 BOM in a private snapshot; corrected encoding, regenerated
  SQL and reviewed it before native test migration. All raw failures retained.
- Evidence: `evidence/v2-501/automatic/`.

## Pending business confirmation

P5-PLAN-01: source/tests currently propose 3-4 automatic turns with an opener
closing; SRS does not prescribe a turn count. Owner was asked asynchronously
whether to keep that plan or have each persona speak once. This choice is not
recorded as approved and must be resolved before final automatic acceptance.

## Still open
No TIP-501/502/503 completion, UI parity or real-LLM E2E PASS is claimed. MSW
full auto generation, updated approval-free bot behavior browser cases on both
lanes, member replies, emergency hide, real Dashboard threads, full UAT/AT/LK,
final stable integration, audits and parity remain required. Fake is still the
integration default. The real private provider has NOT been used by these tests.
Native demo ports are unchanged and still run the earlier build. Deployment needs
coordinated API/socket/worker builds plus migrations and advance notice; do not
mix old/global and new/DB-namespaced PubSub processes during deployment.
