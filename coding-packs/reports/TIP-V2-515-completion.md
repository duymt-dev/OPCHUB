# TIP-V2-515 — Shared posting limits and Vietnamese-day activity counts

## Reproduction / correction
All six original shared cases failed before implementation; their assertions
are unchanged and now pass. Script posting previously invented group-general
destinations after deletion/room changes, ignored hidden persisted quota after
cache loss and the shared group burst gate, and exposed lifetime todayCount.

- Script turns are extracted into their own worker. Actual existing groups and
  default room IDs determine destinations, intersected with snapshot groups and
  current persona assignments. Invalid persona/hours/destinations/daily quota
  skip exactly one turn with native diagnostics; disabled scripts remain paused.
- All destination messages must fit the current persona's Vietnamese-day quota.
  All groups must pass the shared30/min gate before publication. A blocked group
  leaves the entire turn pending, with no cursor/deadline/activity/quota mutation;
  a later due tick retries once. Script/reply kinds share these limit helpers.
- Private publication metadata now retains timestamps, including hidden/pruned
  rows, to match native durable soft-deleted quota rows. Daily cache loss cannot
  reset the count after120-row display retention. A pruned global message ID is
  fenced against reuse by another execution as well as same-turn replay.
- Script/reply activity records store their successful message counts separately
  from public DTOs. todayCount aggregates from the Vietnamese day boundary like
  native BotThreadService, including paused midnight rollover. All-time persona
  postCount remains unchanged; historical activity remains visible, latest40,
  while the day total includes all successful messages even after display pruning.
- Existing reply-context limit exports remain facades; no duplicate limit rules.
  Script bodies/groups remain snapshots and live delay is unchanged. Worker
  turns generate no fictitious Admin command audit; NA-07 publication is retained.

## Evidence
- Original **6/6 fail**; focused mixed pre-expansion cohort31/31 passes.
- Expanded new shared **14/14**, including all six original cases, plus two new
  Admin HTTP workflows. HTTP uses actual run/activity/settings endpoints and
  checks midnight history/counts and whole-turn rate deferral/retry/idempotency.
- Actual HTTP regression cohort **11/11 in3 files** passes (two new workflows
  and nine existing bot/scheduler cases). Root lint8/8 and typecheck8/8 pass
  (six cached tasks each). Forced repository units **1128 passed + 2 existing
  storage skips**, six tasks, zero cached: shared234/Admin424/Portal172/server203/
  UI43/integrations52. Depcheck zero violations: FE1556 modules/4383 dependencies,
  server765/3388. Sanitized receipts in `evidence/v2-515/` include the original
  six failures and initial lint failure (unused test import, removed without suppression).
- Original raw failures stay at D:/opchub-local/v2/515-before.log, never overwritten.

## Remaining full goal
This fixes bounded MSW posting/counter drift, not all TIP-501/502/503 acceptance.
Automatic generation still has an unresolved business turn-plan decision. Native
catalog/avatar/cascade alignment in mocks, live transport/bridge and human warn/
lock effects, both full browser lanes, real-provider browser E2E, UAT/AT/LK/audits/
parity, final reports/dev integration and owner-reviewed dev-to-main PR remain open.
No native production/schema/process/dev data changes or provider calls. The last
uncached native1300/1300 receipt is at6ce5094b, not a new run of this checkpoint.
Main is not merged; no new UI waiver is claimed.
