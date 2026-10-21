# TIP-V2-514 — MSW bot permission and successful-mutation audit boundary

Priority P1; parent TIP-V2-501/502, REQ-208 / D-50 / D-63 / NA-28.
Status IMPLEMENTED / scoped verified. Serial on feature/V2-P5-bot-acceptance.

## Finding / reproduction
P5-MSW-04:17 new HTTP tests fail against the actual Admin registry: six reads
bypass bots.view, nine writes bypass bots.action, invalid creation writes a
phantom audit and successful creation audits entityId=new without actor/shared
audit. Raw failure retained at D:/opchub-local/v2/514-before.log.

## Scope / acceptance
- Independent catalog/runtime handlers enforce existing Admin guard before
  parsing/worker/mutation/audit, using bots.view/bots.action, never role names.
- Shared schemas/DTO/statuses; strict bounded JSON768KiB (native body-limits.ts);
  invalid400, oversized413, missing404, terminal/disabled409; no failed audit.
- Successful create/update/delete/settings/run/stop has exact actor/action/real
  ID in private bot audit plus shared machine/visible activity log, once per
  command. Scheduled ticks have no Admin command audit; manual replay does.
- Replace pre-validation audit-through handlers; remove shadow legacy routes
  from admin-system without new logic there. Keep17 failed assertions and add
  read-only/NA-28/CRUD/validation/replay/negative tests. Old happy-path test gets
  legitimate auth, no changed assertions. Root lint/typecheck/forced units/
  depcheck, evidence/report/traceability and scoped commit/push/clean tree.

Files: Admin mocks/handlers/{bots,bot-catalog,bot-runtime,bot-handler-utils,
admin-system}.ts; mocks/{bot-permissions,bot-catalog-contract,bot-handler-errors,
bot-handlers}.spec.ts and tests/bot-contract.fixture.ts; shared mock domains
bot-execution.ts (optional actor propagation); this TIP/completion/evidence,
P5 findings/task graph/TEST-GAPS/progress.

No native production/schema/process changes or provider calls. Avatar ownership,
full auto/live bridge/limits and browser acceptance remain separate pending work.
Standards: testing/testing.md, backend/auth-rbac.md, global/code-structure.md,
global/git-workflow.md.

Evidence: reports/TIP-V2-514-completion.md. Original17 failures unchanged;
expanded HTTP54/54, forced units1112 +2 existing storage skips;
lint/typecheck/depcheck pass. Parent P5/browser acceptance remains open.
