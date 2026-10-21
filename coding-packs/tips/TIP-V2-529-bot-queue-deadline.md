# TIP-V2-529 — Bot delayed-job timestamp consistency

Full integration at a7f68d00 retains one UAT-14 worker failure: expected one
persisted reply, got zero after its actual deadline. Do not relax the assertion,
skip the test or infer a root cause from a passing retry.

Source inspection finds BotWorkQueueService supplies a fixed BullMQ timestamp
but computes delay against a later Date.now(). Their sum can be earlier than
the persisted nextAt; BotTurnDraftService correctly refuses an early execution.
Prove this producer inconsistency using actual Postgres/Redis queue jobs and
controlled advancing Date.now(), with a no-drift control, before correction.

Scope: bot queue deadline calculation and a separate integration regression.
Keep the durable emergency fence timestamp, fixed job IDs, outbox boundary,
30s–5min policy and worker not-before checks intact. No Prisma mock, migration,
provider call, broad timeout extension or weakened acceptance assertions.
Run deadline regressions, original worker/publication/emergency cohorts and
mandatory root gates. Preserve original full failure; full integration must
eventually be rerun green. Native HOLD still uses its existing immutable bundle
until an announced ownership-checked backend rebuild/cutover after live E2E.
