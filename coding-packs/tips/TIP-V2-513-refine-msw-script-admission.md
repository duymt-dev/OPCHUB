# TIP-V2-513 — MSW scheduled script admission

Priority P1; parent TIP-V2-501, UAT-15/LK-11/NA-08/D-50.
Status IMPLEMENTED / scoped verified, serial on feature/V2-P5-bot-acceptance.

## Reproduction
Seven new deterministic shared tests fail before implementation: advanceMockBot
does not admit any due scripts; manual pending work uses old snapshot spacing
instead of the live script delay. Native BotAdmissionService/Runner are the
contract. Original raw receipt: D:/opchub-local/v2/513-before.log.

## Scope / acceptance
- Shared admission helper for manual/scheduled scripts; snapshots lines/groups,
  real request-clock log timestamps, terminal-only30 retention, active dedupe.
- Tick admits enabled non-null due schedules ordered runAt/id, max30, with
  lastRunAt one-shot/rearm semantics. Manual run never consumes lastRunAt.
- Feature/global pause consumes nothing; scheduled admission emits no Admin audit.
- Live script delay governs subsequent turn spacing; snapshots retain bodies/groups.
- Preserve all seven failing assertions; extend capacity/order/retention and
  paused manual/duplicate/reset regressions. Run root lint/typecheck/forced units/
  depcheck, retain sanitized raw evidence, commit/push clean.

Files: Admin mocks/bot-scheduler-handlers.spec.ts (new); shared mock domains bot-script-admission.ts (new), bot-execution.ts,
bot-state{,-types}.ts, bot-script-scheduler.spec.ts (new), tests/bot-schedule-fixture.ts
(new); this TIP, completion/evidence, P5 findings/graph/REQ traceability.
No native changes, migrations, provider calls, process/dev data changes.
Auto-generation, total/day counters, per-group scripted posting/rates and browser
transport are separate remaining TIP-501/502 work; do not claim them complete here.

Standards: global/code-structure.md, testing/testing.md, global/git-workflow.md.

Evidence: reports/TIP-V2-513-completion.md. Original seven failed assertions
retained; expanded shared13/13, Admin HTTP2/2; forced units1067 +2 existing
storage skips, lint/typecheck/depcheck pass. Full parent/browser acceptance open.
