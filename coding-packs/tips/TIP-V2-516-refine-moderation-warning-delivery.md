# TIP-V2-516 — Deferred moderation warning delivery and retry identity

P1; parent TIP-V2-502, REQ-207/NA-07 and notification NA-10.
Status IMPLEMENTED / scoped verified, serial feature/V2-P5-bot-acceptance.

Reproduced: MSW2/2 failures (no member notification, sender identity lost after
source removal) and native1/1 failure (same warned payload creates duplicate
notifications). Raw516-{msw,native}-before logs retained outside Git.

Scope: capture runtime report source identity by actual sender ID, enqueue a typed
warning event in the same synchronous mock action commit, drain via inbox worker
read path with per-report retry fencing and recipient isolation. Never infer an
account from display names or warn a persona. Native producer adds optional
reportId to existing outbox payload (backward compatible), consumer uses stable
per-report notification ID; existing legacy payloads still parse. Share warning
content/ID helper. New live notifications preserve timestamps and obey50-row
retention without changing historical seed rebasing.

Keep both MSW and native failing assertions; extend multi-case same-message,
persona/null sender, deleted room/source, retry, retention/reset, HTTP inbox/audit
and protocol cases. Root lint/typecheck/forced units/depcheck and focused native
notification/moderation gates. No migration or dev process/data/provider changes.

Files: shared moderation/warning-notification.ts + index.ts; outbox/events.ts;
mock domains report-context.ts, moderation-warning-jobs.ts, notification-runtime.ts
(new), report-actions.ts, ops-community.ts, moderation-jobs.ts, inbox.ts, index.ts;
shared moderation-warning.spec.ts; Admin/Portal warning HTTP specs; native
AdminModerationService/NotificationEventsHandler and dedicated warning integration
spec; TIP/report/evidence/findings/graph/TEST-GAPS/progress.

Warn delivery only: human lock/account/session effects and historical ghost-account
seed alignment remain separate open acceptance work. No claim of full NA-07/P5,
cross-app live/browser acceptance, or native legacy-no-reportId retry guarantees.
Standards: testing/testing.md, backend/nestjs-modules.md, global/code-structure.md,
database/query-indexing.md, global/git-workflow.md.

Evidence: reports/TIP-V2-516-completion.md. Original MSW2+native1 failures retained;
shared warning/inbox16/16, two HTTP workflows, native14/14; forced root units1141
+2 existing storage skips, lint/typecheck/depcheck pass. Full goal remains open.
