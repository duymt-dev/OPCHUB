# TIP-V42-713: Bot schedule, per-message replies and bulk AI scripts

## HEADER

- TIP-ID: TIP-V42-713
- Project: OPCHUB
- Module: bot (Admin, API, worker, shared contracts)
- Priority: P0
- Depends on: TIP-V42-712 (`aaf97830`); stacked branch `feature/TIP-V42-713-bot-workflows`
- Estimated: XL; implement sequential stages within this TIP, not parallel TIPs.
- Parallel-safe with: none; sequential, shares `apps/server/src/modules/bot/bot-core.module.ts` and `packages/shared/src/api-domains/index.ts` with TIP-V42-712.
- Files touched: exact stage manifests below. Amend the manifest before subsequent stage implementation, never use an unrestricted directory wildcard.

## CONTEXT

- Working directory: `D:/CODING/OPCHUB/CODING`.
- Stack: `../product/tech-stack.md`, existing NestJS/Prisma/PostgreSQL/Redis/BullMQ and Next.js/AntD/TanStack Query. No new dependency or deployment architecture.
- Authority: REQ-607, D-99, D-112, ADR-0008; `../audit/SPEC-V4.2-FULL-AUDIT.md:100-101`; prototype `docs/spec/index.html:3419,3542,4998-5250` (reference only).
- Reuse execution advisory lock, conditional cursor transitions, durable draft claims, outbox, actual chat writer/NA-07, encrypted Admin LLM runtime from 712.
- Preserve native HOLD and original goal; questions go in `../reports/ui-parity/questions.md`, not a stop at each checkpoint.

## APPLICABLE STANDARDS

- `../standards/global/code-structure.md`, `../standards/global/git-workflow.md`
- `../standards/backend/nestjs-modules.md`, `../standards/backend/auth-rbac.md`, `../standards/backend/api-conventions.md`, `../standards/backend/queues-workers.md`
- `../standards/database/query-indexing.md`, `../standards/database/prisma-migrations.md`
- `../standards/realtime/socket-chat.md`, `../standards/security/security.md`, `../standards/integrations/adapters.md`
- `../standards/frontend/nextjs-structure.md`, `../standards/frontend/data-state.md`, `../standards/frontend/antd-ui.md`, `../standards/frontend/routing-auth.md`, `../standards/frontend/ui-parity.md`
- `../standards/testing/testing.md`

## TASK / SEQUENTIAL STAGES

Implement persisted VN-date scheduling and pause/resume, then per-message reply scanning and bulk real-AI script generation. Build matching Admin controls and test the same behavior through MSW and native HTTP; retain existing emergency-stop semantics separately from reversible pause.

1. Schedule contract, pure date-state policy, persisted control API and execution fences.
2. Reply scanner/run progress/history, second-based cadence and reply-only rate/policy changes; rotate enabled scripts by free group.
3. Persistent conversation types and bulk generation/deduplication/selected save using actual configured LLM.
4. Admin components/hooks/mock boundaries, behavior and visual evidence, complete regression gates.

## FILES TOUCHED — stage 1 (exact)

Create:
- `packages/shared/src/api-domains/bot-schedule.ts`
- `packages/shared/src/api-domains/bot-schedule.spec.ts`
- `packages/shared/src/bot/schedule-window.ts`
- `packages/shared/src/bot/schedule-window.spec.ts`
- `apps/server/src/modules/bot/control/bot-schedule.service.ts`
- `apps/server/src/modules/bot/control/bot-schedule.controller.ts`
- `apps/server/test/bot/bot-schedule-window.int.spec.ts`
- `coding-packs/tips/TIP-V42-713-bot-workflows.md`
- `coding-packs/reports/TIP-V42-713-progress.md`

Modify:
- `packages/shared/src/api-domains/index.ts`
- `packages/shared/src/index.ts`
- `apps/server/src/modules/bot/bot-core.module.ts`
- `apps/server/src/modules/bot/bot.module.ts`
- `apps/server/src/modules/bot/services/bot-admission.service.ts`
- `apps/server/src/modules/bot/services/bot-auto-admission.service.ts`
- `apps/server/src/modules/bot/services/bot-reply.service.ts`
- `apps/server/src/modules/bot/services/bot-scheduler.service.ts`
- `apps/server/src/modules/bot/services/bot-turn-draft.service.ts`
- `apps/server/src/modules/bot/services/bot-runner.service.ts`
- `coding-packs/reports/V4.2-progress.md`
- `coding-packs/reports/ui-parity/questions.md`

### Stage 2a — reply contract and independent publication budget

Create:
- `packages/shared/src/api-domains/bot-replies.ts`
- `packages/shared/src/api-domains/bot-replies.spec.ts`
- `packages/shared/src/bot/reply-timing.ts`
- `packages/shared/src/bot/reply-timing.spec.ts`
- `apps/server/src/modules/bot/replies/bot-reply-limits.service.ts`
- `apps/server/test/bot/bot-reply-limits-v42.int.spec.ts`

Modify: `packages/shared/src/api-domains/index.ts`, `packages/shared/src/index.ts`,
`apps/server/src/modules/bot/bot-core.module.ts`, and this TIP.
This stage adds contracts and an atomic rolling-minute Redis budget; stage 2b must wire it at actual publication, not at AI generation or admission.
### Stage 2b — durable reply-run storage and Chat scan port

Create:
- `packages/db/prisma/schema/bot-reply-run.prisma`
- `packages/db/test/migration-bot-reply-run.int.spec.ts`
- `apps/server/src/modules/chat/repositories/bot-reply-scan.repository.ts`
- `apps/server/src/modules/chat/services/bot-reply-scan.service.ts`
- `apps/server/test/bot/bot-reply-scan-v42.int.spec.ts`

Modify: `apps/server/src/modules/chat/chat-core.module.ts`,
`apps/server/src/modules/chat/index.ts`, and this TIP.
Create-only migration generated and reviewed: `packages/db/prisma/migrations/20261028162355_v42_bot_reply_run/migration.sql` and `packages/db/prisma/migrations/20261028162355_v42_bot_reply_run/down.sql` (create). Unrelated generated index drops/recreation removed. Run storage has a single active run, bounded IDs/progress and a durable current-thread identity; stopped/done history is not a replacement for actual chat reply history.
### Stage 2c — live reply coordinator and publication policy

Create:
- `apps/server/src/modules/bot/replies/bot-reply-settings.service.ts`
- `apps/server/src/modules/bot/replies/bot-reply-progress.service.ts`
- `apps/server/src/modules/bot/replies/bot-reply-runs.service.ts`
- `apps/server/src/modules/bot/replies/bot-reply-queue.service.ts`
- `apps/server/src/modules/bot/replies/bot-reply-runs.controller.ts`
- `apps/server/src/modules/bot/replies/reply-persona.ts`
- `apps/server/src/modules/bot/replies/reply-persona.spec.ts`
- `apps/server/test/bot/bot-reply-runs-v42.int.spec.ts`

Modify:
- `packages/shared/src/api-domains/bot-replies.ts`
- `packages/shared/src/outbox/events.ts`
- `packages/shared/src/queues/queues.ts`
- `apps/server/src/modules/bot/bot-core.module.ts`
- `apps/server/src/modules/bot/bot.module.ts`
- `apps/server/src/modules/bot/index.ts`
- `apps/server/src/modules/bot/services/bot-reply.service.ts`
- `apps/server/src/modules/bot/services/bot-turn-draft.service.ts`
- `apps/server/src/modules/bot/services/bot-runner.service.ts`
- `apps/server/src/modules/bot/services/bot-kill-switch.service.ts`
- `apps/server/src/modules/bot/services/bot-thread-control.service.ts`
- `apps/server/src/modules/chat/services/persona-reply-context.service.ts`
- `apps/server/src/worker/processors/bot.processor.ts`
- `apps/server/src/worker/schedules.ts`
- `coding-packs/reports/ui-parity/questions.md`

Automatic flag governs starting scans; an admitted run continues until explicit run stop/global pause, matching prototype timer behavior without bypassing the safe global-pause fence. Legacy member-send events only request a cadence-gated ranked scan, not individual bypass admission. Run cursor updates and next-work outbox commit with publication. Failure/stop cannot strand an active run; scheduled tick recovers queue loss.
### Stage 2d — superseded reply regression contracts

Modify `apps/server/test/bot/bot-reply.int.spec.ts`,
`apps/server/test/bot/bot-reply-worker.int.spec.ts`, and `apps/server/test/helpers/llm-http-stub.ts`.
D-112 explicitly replaces old30s–5m/120s-cooldown/hour/quota expectations with exact5s default and enabled same-group personas. Preserve duplicate/identity/visibility/outbox assertions and use actual HTTP stub in worker test. No timeout increase or assertion weakening; update incompatible business expectations with direct D-112 assertions.
### Stage 2e — actual reply overview/history

Create `apps/server/src/modules/bot/replies/bot-reply-overview.service.ts`.
Modify `apps/server/src/modules/bot/replies/bot-reply-runs.controller.ts`,
`apps/server/src/modules/bot/bot-core.module.ts`,
`apps/server/src/modules/chat/repositories/bot-reply-scan.repository.ts`,
`apps/server/src/modules/chat/services/bot-reply-scan.service.ts`,
`apps/server/test/bot/bot-reply-scan-v42.int.spec.ts`,
`apps/server/test/bot/bot-reply-runs-v42.int.spec.ts`, and
`packages/db/prisma/schema/chat.prisma` (index documentation only).
Create-only migration generated: `packages/db/prisma/migrations/20261028165010_v42_bot_reply_history/migration.sql` and `packages/db/prisma/migrations/20261028165010_v42_bot_reply_history/down.sql` (create). Discard all unrelated generated index drops/recreation; add a partial covering reply-history index only. History reads latest100 actual replies via index IDs then joins bodies, not retained30 bot-thread records; group preview remains10×8 and persona counts reflect current group membership.
Rotation and stages3–4 manifests will be appended before their edits.

## SPECIFICATIONS

### Stage 3a — persistent conversation-type catalog

Create:
- `packages/shared/src/api-domains/bot-conversation-types.ts`
- `packages/shared/src/api-domains/bot-conversation-types.spec.ts`
- `packages/db/prisma/schema/bot-conversation-type.prisma`
- `packages/db/test/migration-bot-conversation-type.int.spec.ts`
- `apps/server/src/modules/bot/bulk/bot-conversation-types.repository.ts`
- `apps/server/src/modules/bot/bulk/bot-conversation-types.service.ts`
- `apps/server/src/modules/bot/bulk/bot-conversation-types.controller.ts`
- `apps/server/test/bot/bot-conversation-types-v42.int.spec.ts`
- `apps/server/test/bot/bot-conversation-types-plan-v42.int.spec.ts`

Modify `packages/shared/src/api-domains/index.ts`,
`apps/server/src/modules/bot/bot-core.module.ts`,
`apps/server/src/modules/bot/bot.module.ts`, this TIP and existing progress/questions reports.
Create-only migration: `packages/db/prisma/migrations/20261028180803_v42_bot_conversation_types/migration.sql`
and `down.sql`. Remove unrelated generated index drops/recreations before deployment.
Keep the four built-ins immutable and shared, persist custom names/descriptions in PostgreSQL,
enforce case-insensitive uniqueness with the existing citext extension, and audit each mutation.
Keyset/deferred-ID pagination bounds the custom catalog payload without imposing a business
limit on how many types exist. The name's60-character bound matches saved script.type;
description is bounded at2000 characters for request/prompt safety. Bulk generation remains
the next stage, not claimed by this catalog implementation.

### Stage 3b — bulk contracts, durable batch/results and indexed line deduplication

Create:
- `packages/shared/src/api-domains/bot-bulk.ts`
- `packages/shared/src/api-domains/bot-bulk.spec.ts`
- `packages/shared/src/bot/bulk-plan.ts`
- `packages/shared/src/bot/bulk-plan.spec.ts`
- `packages/db/prisma/schema/bot-bulk.prisma`
- `packages/db/test/migration-bot-bulk.int.spec.ts`
- `apps/server/src/modules/bot/bulk/bot-bulk-lines.repository.ts`
- `apps/server/test/bot/bot-bulk-lines-v42.int.spec.ts`

Modify `packages/shared/src/api-domains/index.ts`, `packages/shared/src/index.ts`, this TIP,
`coding-packs/reports/TIP-V42-713-progress.md`, `coding-packs/reports/V4.2-progress.md`,
and `coding-packs/reports/ui-parity/questions.md`.
Create-only migration: `packages/db/prisma/migrations/20261028182820_v42_bot_bulk_storage/migration.sql`
and `down.sql`; remove all unrelated generated index changes before deployment.
Follow-up create-only migration: `packages/db/prisma/migrations/20261028183637_v42_bot_bulk_normalization/migration.sql`
and `down.sql`, pin Unicode lowercase to existing ICU `und-x-icu` and rebuild affected
hashes/index after the function replacement. Initial Windows-default lowercase differs
from JavaScript for dotted I/Kelvin sign; keep the Unicode assertions, fix the implementation.
Cost correction create-only migration: `packages/db/prisma/migrations/20261028184503_v42_bot_bulk_hash_cost/migration.sql`
and `down.sql`; compute each normalized body once, not once for filtering and again for hashing.
Output semantics stay identical; this avoids doubling regex work on every existing script write.
Also modify `apps/server/test/bot/bot-rotation-plan-v42.int.spec.ts`: prepare the same10000
wide-row fixture outside a short interactive transaction and delete only its owned IDs in
finally. Keep all original candidate/limit/index/no-Seq-Scan assertions and test timeout;
fixture index construction is not the production rotation-query latency being measured.
Batch metadata, cursor/lease and durable result selection are separate from published
scripts/threads. A GIN expression index on normalized saved-line hashes stays synchronized
for every script insert/update/delete, including seed/direct SQL, without a fragile
application-only projection. Batch result hashes have their own GIN index.
This is the storage/contract stage; actual HTTP generation, worker and selected-save wiring
follow and remain required before AC8/AC9 can be claimed.

### Stage 2g — exact 1–60 minute spacing

Create:
- `packages/shared/src/api-domains/bot-delay.spec.ts`
- `apps/server/test/bot/bot-minute-gap-v42.int.spec.ts`
- `packages/db/test/migration-bot-minute-gap.int.spec.ts`

Modify:
- `packages/shared/src/bot/runtime-time.ts`
- `packages/shared/src/api-domains/bot.ts`
- `packages/shared/src/mock-data/domains/bot-script-worker.ts`
- `packages/shared/src/mock-data/domains/bot-reply-admission.ts`
- `packages/shared/src/mock-data/domains/bot-reply-admission.spec.ts`
- `apps/server/src/modules/bot/domain/schedule.spec.ts`
- `apps/server/src/modules/bot/services/bot-runner.service.ts`
- `apps/server/test/bot/bot-provider-failure.int.spec.ts`
- `apps/server/test/bot/bot-generation.int.spec.ts`
- `apps/server/test/bot/bot-auto-admission.int.spec.ts`
- `apps/server/test/bot/bot-scheduler.int.spec.ts`
- `apps/server/test/bot/bot-schedule-window.int.spec.ts`
- `apps/server/test/bot/bot.int.spec.ts`
- `apps/server/test/dashboard/bot-threads.int.spec.ts`
- `apps/admin/src/features/bots/model.ts`
- `apps/admin/src/features/bots/model.spec.ts`
- `apps/admin/src/features/bots/components/script-drawer.tsx`
- `packages/db/prisma/schema/bot.prisma`
- This TIP and existing progress/questions reports.

Remove the obsolete random-delay injection from runner callers, not their assertions.
Shared helper validates integer1–60 and returns exactly minutes*60000; reply mocks use
the independent five-second helper. Server reply timing already uses its own stored setting.
Legacy61–120 values normalize to60 (new behavior is slower than the old five-minute cap);
in-flight non-reply deadlines are extended where needed, never shortened. Add DB constraints
and migration data tests. Create-only/reviewed migration: `packages/db/prisma/migrations/20261028173908_v42_bot_minute_gap/migration.sql` and `down.sql`; unrelated generated index changes removed.
Timing fixture/caller corrections additionally modify
`packages/shared/src/mock-data/domains/tests/bot-schedule-fixture.ts`,
`packages/shared/src/mock-data/domains/bot-script-scheduler.spec.ts`,
`packages/shared/src/mock-data/domains/bot-posting-limits.spec.ts`, and
`packages/shared/src/mock-data/domains/bot-reply-worker.spec.ts`, and
`apps/admin/src/mocks/bot-scheduler-handlers.spec.ts`.
Existing zero-minute fixture becomes the supported one-minute minimum; publication boundary
assertions remain exact. Full MSW reply-policy/rotation cutover remains in the UI stage.
Persistence validation also modifies
`packages/shared/src/mock-data/domains/community-persistence/bot-schema.ts` and
`packages/shared/src/mock-data/domains/community-persistence/snapshot.spec.ts`:
only reply snapshots retain the legacy zero-minute N/A marker, while scripts/auto require1–60.

### Stage 2f — persistent per-group script rotation and parallel worker

Create:
- `packages/db/prisma/schema/bot-rotation.prisma`
- `apps/server/src/modules/bot/rotation/bot-rotation.repository.ts`
- `apps/server/src/modules/bot/rotation/bot-rotation.service.ts`
- `apps/server/test/bot/rotation-fixture.ts`
- `apps/server/test/bot/bot-rotation-v42.int.spec.ts`
- `apps/server/test/bot/bot-rotation-plan-v42.int.spec.ts`
- `apps/server/test/bot/bot-parallel-worker-v42.int.spec.ts`
- `apps/server/test/helpers/llm-barrier-stub.ts`

Modify: `packages/db/prisma/schema/community.prisma`,
`apps/server/src/modules/bot/bot-core.module.ts`,
`apps/server/src/modules/bot/services/bot-admission.service.ts`,
`apps/server/src/worker/processors/bot.processor.ts`,
`apps/server/test/bot/bot-scheduler.int.spec.ts`,
`apps/server/test/bot/bot-worker.int.spec.ts`, this TIP and existing progress/questions reports.
Create-only migration: `packages/db/prisma/migrations/20261028171417_v42_bot_rotation/migration.sql` and `down.sql`. Unrelated generated index changes removed before deploy.
Follow-up create-only/reviewed migration: `packages/db/prisma/migrations/20261028172358_v42_bot_rotation_index_cleanup/migration.sql` and `down.sql` remove the unused ID index and turn GIN fastupdate off for this read-heavy catalog. The applied first migration is not edited.
Use a durable per-group cursor independent of terminal-thread retention, indexed candidate IDs,
then fetch at most 30 selected script payloads. Keep future runAt as a not-before fence;
null/past runAt joins the repeating rotation, per D-112. No new auto-enable switch or fake AI.
Four worker slots allow overlapping HTTP generation while the execution lock still serializes
claims/publication and the existing retention service enforces 30 active/retained threads.
Minute-gap changes and MSW parity remain a separate following stage (not claimed here).
Additional rotation regression paths: modify
`apps/server/src/modules/bot/services/bot-auto-admission.service.ts`,
`apps/server/src/modules/bot/services/bot-scheduler.service.ts`, and
`apps/server/test/bot/bot-auto-admission.int.spec.ts` to preserve the prototype's
alternation with optional generated conversations rather than starving them behind scripts.

1. Schedule stores nullable ISO calendar dates and paused flag. Date boundaries use Asia/Ho_Chi_Minh: from inclusive midnight, to inclusive entire day. Priority: paused, waiting, ended, live. Clear dates does not silently resume a manual pause. Pause preserves queued threads; emergency stop remains destructive/fenced as before.
2. Recheck schedule under the execution lock at admission, draft claim and publication. No LLM request inside DB transaction; a pause while generation is in flight prevents publication. Missing schedule preserves existing live behavior. Invalid persisted schedule fails closed.
3. Reply scanning every 20 seconds; N default 50, range 1–200 latest messages in each default room, then filter human visible text with no bot answer. Rank groups by pending count; one response per message with replyToId. UI top 10 groups, preview 8, history retain 100/display 20 and group link. Auto toggle is distinct from global pause; explicit scan works when auto is off. Stop prevents pending publication.
4. D-112 replies: enabled personas belonging to the group only; seconds default 5, maximum 600; no activity-hour/daily-quota/120-second cooldown restriction. Keep NA-07 and 12/group/minute, 60/system/minute guards. No fake fallback.
5. Auto conversations execute by group, maximum 30 retained/active threads, rotate enabled scripts without requiring runAt. Script gaps 1–60 minutes, never capped at five minutes.
6. Bulk AI: newline topics deduplicated, four built-in types and persistent custom types, per-topic 1–5/default 2, turns 2–8/default 4, gap 1–60/default 5. Groups required; at least two enabled personas, prefer group members; opener/conversation/closer. Deduplicate normalized lines against generated and saved content. Select results, count and save selected scripts, no fabricated suffix/template fallback.
7. Shared strict zod inputs; date validation rejects nonexistent/reversed dates and unknown fields. `bots.view` on reads, `bots.action` on writes. Every Admin write audited in its transaction. Preserve API error envelope: 400 fields, 401/403, 404 for missing entity, 409 invalid state, bounded request-body 413 and rate 429.

## ACCEPTANCE CRITERIA (Given / When / Then)

- AC1: Given missing schedule, when read/tick, then live with null dates and unpaused; existing settings response remains compatible.
- AC2: Given VN from/to dates, when testing just before/from/last millisecond/end, then waiting/live/live/ended; invalid dates and reversed range yield field errors.
- AC3: Given queued or in-flight work, when paused, then no further publication; resume retains cursor and schedule rather than resurrecting stopped threads; clearing schedule preserves pause.
- AC4: Given auto reply off and eligible human messages, when manual scan requested, then a durable bounded run replies once per eligible message; replay/stop races cannot duplicate/post after stop.
- AC5: Given mixed rooms/messages/personas, when scan runs, then only default-room latest-N eligible human text, ranked groups, same-group enabled personas; hidden/deleted/already-replied messages excluded.
- AC6: Given reply runs, when hours/quota/cooldown would previously block, then D-112 allows replies subject to NA-07 and 12/60 rate limits, respecting configured seconds.
- AC7: Given enabled unscheduled scripts in free groups, when scheduler ticks, then scripts rotate in parallel by group within 30 slots; next turns respect 1–60 minute delay including values above five.
- AC8: Given configured actual HTTP LLM and topics/types, when bulk generate/save selected, then validated distinct real responses create exactly selected scripts; provider failure yields actionable error, never fake content.
- AC9: Given custom types and generation state, when reload/retry, then persisted types and durable results remain consistent; built-in types cannot be deleted.
- AC10: Given unauthorized requests or invalid inputs, when invoking each new write, then permission/validation rejects without DB mutation; successful writes have audit/outbox where required.
- AC11: Given 1440/390 viewports, when exercising schedule/reply/bulk screens, then keyboard/loading/error/empty states work; behavior assertions identical for MSW/native; raw parity measured at ≤3% without masks or hidden controls.

## CONSTRAINTS / VERIFICATION

- DO NOT change goal, merge branches, use real paid providers in tests, weaken assertions, copy prototype code, remove raw parity failures or modify unrelated domain contracts.
- REUSE Admin LLM config, DB transactions/outbox, shared chat moderation and permission checks. No query in per-message/persona loops; deferred joins/keyset and equality-first indexes, EXPLAIN on ≥10k rows for new lists.
- SKIP deployment/VPS, new payment policy, unrelated UI repairs. Record ambiguities and choose safest existing D-xx behavior without checkpoint blocking.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm depcheck`, `pnpm build`, full MSW and focused native behavior. Preserve demo fixtures after native verification.
- Parity: existing bot D-31→D-41 flows plus schedule, reply tab, bulk modal/result/type states at both widths. Exact registry IDs recorded before capture.

## Quality Gate: Self-Review

- Single TIP batch: pairwise file intersection empty; prior 712 explicitly sequential and complete functionally.
- Task graph already contains V42-713; no duplicate row. Source authority and acceptance criteria mapped above.
- Gap: exact stage 2–4 manifests pending targeted code discovery; amend before implementation. Test/parity gates not yet run; no implementation DONE claim.

## BUILDER-CHECKLIST

- [ ] Exact stage manifest before edits; no monolith expansion.
- [ ] AC1–AC11 individually verified with real counts/evidence.
- [ ] Native Postgres/Redis integration; LLM HTTP stub only in tests.
- [ ] Execution lock + conditional transition + durable outbox; no DB-per-recipient loop.
- [ ] `bots.*` permissions, audit and NA-07 preserved; no provider fake fallback.
- [ ] Full gates, native/MSW behavior, honest parity and EXPLAIN evidence.
- [ ] Commit explicit paths, push branch, clean status, report actual Git SHA; proceed to 714 without waiting for merge.
