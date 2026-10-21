# P5 spec/behavior reconciliation

Scope: TIP-V2-501/502 only. Checked against actual assertions, not filenames alone.
Fresh native integration evidence: TIP548 (106 cases,23 files), TIP549 (2 cases).
Browser evidence: 8 original +1 emergency case per lane, same test source and
assertions for MSW/native. This document does not claim UI parity or release DONE.

## Numbered acceptance criteria (order in each TIP)

| Criterion | Assertion evidence | Result |
|---|---|---|
|501 AC1 due script, one turn per deadline, running then done, no approval|bot-scheduler.int: concurrent due admission creates one snapshot; concurrent turn calls return true/false; one message; nextAt60s; pre-deadline rejects; final turn finishes. bot-scheduling browser observes running and absence of approval.|PASS|
|501 AC2 skip out-of-hours and continue|bot-scheduler.int: first turn writes no message, advances cursor, records skip activity; next eligible turn publishes.|PASS|
|501 AC3 global/script pause|bot-scheduler.int: each disabled switch prevents enqueue and runner progress; re-enable preserves cursor and publishes once. bot-worker.int uses real BullMQ/outbox.|PASS|
|501 AC4 retain120 simulated, preserve humans|persona-turn.int: exact prune assertions plus partial-index EXPLAIN over10k rows; publication delivery markers bounded separately.|PASS|
|501 AC5 retain30 threads|bot-retention.int: oldest done evicted; active rows preserved;31st active refused; batch capacity enforced in rollback fixture.|PASS|
|501 AC6 NA07|persona-publication.int: real socket message still visible, one automatic moderation report through worker; no personaId/isSimulated leak.|PASS|
|501 AC7 concurrent tick/idempotency|bot-scheduler.int concurrent admission/turn; persona-turn/publication tests assert one message, count, feed and socket emission.|PASS|
|502 AC1 eligible member reply in30s?5m|bot-reply-worker/queue-deadline integration and bot-replies browser: actual worker, exact source quote and generated body appear live then persist.|PASS|
|502 AC2 disabled/unassigned/out-of-hours|bot-reply.int table cases reject admission/provider calls; skipped activity once; pause/resume retains cursor.|PASS|
|502 AC3 three messages/cooldown|bot-reply.int admits first only; second/third blocked;120s boundary and uniqueness survive Redis loss, GC and deleted history.|PASS|
|502 AC4 emergency stop/audit|bot-emergency.int verifies permission, actor audit, transaction rollback, late LLM fence, durable cleanup/replay; browser waits original nextAt after stop, cursor remains1.|PASS|
|502 AC5 hide bot/preserve humans|bot-hide.int scoped/all hiding, Admin marked history,200/201 socket branch and rollback; browser removes bot live without reload, human retained.|PASS|
|502 AC6 real Dashboard conversation|dashboard/bot-threads.int asserts real opening/persona/body, reply preview,10s TTL, hidden removal/privacy; bot-auto-lifecycle browser covers full3turn conversation and Dashboard persistence.|PASS|
|502 AC7 no bots.action =>403|bot-emergency/bot-hide integrations assert VIEW_ONLY and no mutation/audit; unauthenticated requests also rejected.|PASS|

## Additional goal requirements

- Self-generation: auto-plan unit covers3/4 turns and opening persona closes;
  auto-admission integration gates switches/idle group/topic rotation; generation
  integration validates real history, claims and fencing; full browser3-turn
  lifecycle passes both lanes with real spacing (no shortened delay assertion).
- Provider errors: new TIP549 verifies retryable/terminal errors leave cursor,
  deadline, draft/publication safe; explicit recovery/replay posts once.27 adapter
  unit cases cover provider boundary. This is NOT a claim of automatic recovery
  from terminal failures. Actual turn/reply queue opts specify attempts3 and
  exponential30s backoff; processor converts terminal IntegrationError to
  UnrecoverableError. Generic bot queue default is overridden for these jobs.
- Daily quota/rate limiting: scheduler integration counts deleted history,
  rejects full group window without cursor mutation, then permits one retry.
- Required unit/gates: root549 lint/typecheck/test/depcheck all0 (5/6 test tasks
  cached); focused native integration fresh. Full-repository integration results
  from earlier reports are historical, not a fresh whole-repo PASS in this audit.
- Original planned bot-live.spec scenarios are implemented in bot-replies,
  bot-auto-lifecycle and bot-emergency files; no skipped lane or weaker native
  branch used to replace them.

## Still open before P5 release

- P5 parity: raw MSW7/14 under3%; seven failed screenshots must remain reported.
  Native5/14 under3%. Owner has now approved spec-required P5 deviations;
  see TIP-V2-550-parity-review.md, including separate native Dashboard limitation.
- Integration into dev and owner-review PR dev-to-main not yet performed.
- Native hold kept; after each reset, require required/demo/flush exit0 and
  restored=true receipt before reporting the runtime ready for acceptance.
