# TIP-V2-531 — Addressed-persona history fixture chronology

Post529 full integration retains one failure in bot-reply.int.spec.ts: the case
expects all10 newest context entries from another persona, but the real HTTP
trigger is newer than the ten rows anchored to a fixed05:00 date. Earlier runs
before that date could pass accidentally. Do not remove/narrow the all10
assertion, change production context filtering or count a passing retry as fix.

Reproduce the original case unchanged. Correct only chronology/preconditions:
an older addressed message, actual member question, then ten newer other-persona
messages before injected reply admission/deadline. Derive those timestamps from
the actual HTTP source plus the existing injected clock, not wall-clock ordering
against a calendar constant. Preserve every original expectation.

Add a separate opposite-order integration control proving that, when the real
member trigger actually is newest, bounded history includes that human trigger
and the nine most recent preceding messages. This prevents filtering human
history just to satisfy the addressed-persona test. Use real Postgres/FakeLlm;
no Prisma mocks, production changes, migration, native HOLD reset or paid calls.
Run both files, mandatory root gates and a subsequent forced full integration.
Keep the original full failure and scoped reproduction as evidence.
