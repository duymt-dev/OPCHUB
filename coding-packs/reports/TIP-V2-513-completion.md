# TIP-V2-513 — MSW scheduled script admission and live spacing

## Contract correction
Native BotAdmissionService.due/manual and BotRunnerService are authoritative.
Previously mock ticks only advanced manually admitted threads; runAt was inert,
and spacing used admission-time snapshots instead of the current script setting.
Seven deterministic regression cases failed before the correction; all original
assertions remain in place and now pass.

- New independent admission module shares manual/scheduled creation and the
  existing terminal-only30 retention helper. Actual admission-clock timestamps
  replace the historical MOCK_NOW log timestamp on this execution path.
- Enabled due scripts are ordered runAt/id, excluding active scripts before
  limiting to30. Successful automatic admission stores a private lastRunAt per
  script, retained beyond thread GC; an unchanged schedule is one-shot. A new
  runAt later than lastRunAt rearms it. Manual run never consumes the schedule.
- Global/feature pause admits nothing; manual work can still be scheduled while
  paused and is deduplicated. Only explicit manual commands emit script.run
  audit, including idempotent replay; automatic tick emits no fictitious Admin audit.
- Bodies/destinations remain immutable admission snapshots. Live script delay
  sets the next deadline, matching native behavior; no batching of due turns.
- Shared boundaries cover capacity/order/GC checkpoints/reset, null/future/
  disabled schedules, flag pause, manual dedupe and emergency terminal history.
  Admin HTTP tests use the actual handler registry, validate the real thread DTO,
  require one stored message per due turn and prove manual/run polling shares
  execution identity. A duplicate legacy fallback handler is shadowed by the
  existing bot handler order; it is not used or expanded by this correction.

## Evidence
- Before: **7/7 fail**, private raw `D:/opchub-local/v2/513-before.log` retained.
- After: expanded shared **13/13** plus Admin HTTP **2/2** pass.
- Root lint8/8 and typecheck8/8 pass (six cached tasks each).
  Forced repository units **1067 passed + 2 existing storage skips**: shared220,
  Admin377, Portal172, server203, UI43, integrations52; six tasks, zero cached.
  Depcheck: zero violations, FE1543 modules/4327 dependencies, server765/3388.
  `evidence/v2-513/` retains sanitized before/after/expanded/HTTP and all gate
  receipts, including the initially failed lint run. No assertion suppression.
- Initial lint rejected two non-null assertions in the candidate sort; replaced
  with null-safe parsing, not a rule suppression. That failed invocation remains
  preserved privately as `513-lint-before.log`.

## Not full TIP-501/502/503 acceptance
No native source/schema/data/process changes or provider calls. The previous
uncached native1300/1300 evidence is at6ce5094b, not a new run of this checkpoint.
Mock automatic generation still awaits its unresolved turn-plan decision;
complete per-kind group/daily metrics/limits, bot CRUD/run/stop permission and
actor-audit alignment, live transport/bridge, human warn/
lock effects, both browser lanes, real-LLM browser E2E, audits/UAT/AT/LK/parity,
final reports, dev integration and owner-reviewed dev-to-main PR remain open.
No main merge or new UI waiver. Native demo services remain running unchanged.
