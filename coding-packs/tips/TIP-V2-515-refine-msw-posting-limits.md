# TIP-V2-515 — MSW scripted posting limits and Vietnamese-day activity counts

Priority P1; parent TIP-V2-501/502, REQ-208/UAT-15/NA-08/S-11.
Status IMPLEMENTED / scoped verified. Serial feature/V2-P5-bot-acceptance.

Six original shared cases fail: deleted group/default room still accepts script
messages; synthetic general IDs replace actual default rooms; daily cache loss
ignores persisted hidden messages; group burst limit is bypassed; todayCount is
lifetime rather than Vietnamese-day scoped. Raw515-before retained privately.

Scope: extract script-turn worker, shared private daily/burst helpers and activity
counter module. Verify actual destinations, all-room daily quota and all-group burst
before publication; rate denial leaves cursor/deadline/activity/quota unchanged.
Preserve private publication timestamps across120-row pruning so durable daily
quota cannot reset after cache loss. Both script/reply activity counts use VN day,
including paused/day rollover; persona.postCount remains all-time. No actor audit
for worker turns. Keep six original failing assertions; extend cross-kind/rate/
retention/idempotency/window/quota/activity and HTTP boundary regressions.

Files: shared mock domains bot-{script-worker,posting-limits,activity}.ts (new),
bot-execution.ts, bot-reply-{context,worker}.ts, bot-state{,-types}.ts,
bot-message-{types,store}.ts; dedicated bot-script-limits.spec.ts and
bot-posting-limits.spec.ts; Admin mocks/bot-activity-handlers.spec.ts; this TIP,
completion/evidence, findings/graph/TEST-GAPS/progress.

Native BotRunnerService/BotTurnLimitsService/BotThreadService.activity are the
contract. No native code/schema/process/dev data/provider changes. Automatic
generation/business turn-plan approval, live bridge and full browser/real-provider
acceptance remain outside this bounded correction, not declared complete.
Standards: testing/testing.md, global/code-structure.md, global/git-workflow.md.

Evidence: reports/TIP-V2-515-completion.md. Six original failures unchanged;
expanded shared14/14, HTTP11/11 (two new workflows), forced units1128 +2 existing
storage skips; lint/typecheck/depcheck pass. Full P5/browser acceptance remains open.
