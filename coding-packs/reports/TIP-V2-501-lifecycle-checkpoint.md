# TIP-V2-501 lifecycle checkpoint ? IN PROGRESS

This is an incremental checkpoint, **not TIP-501/502/503 completion**.

## Implemented and exercised

- Reviewed create-only lifecycle migration maps pending -> scheduled and posted ->
  done, adds running, initializes legacy due snapshots and removes requireReview.
  Adds partial terminal-GC and persona/day indexes. Only native opchub_test was
  migrated; no opchub_dev migration/reset/restart occurred.
- BotCoreModule is shared by HTTP and worker. Manual run schedules immediately;
  due-script admission snapshots once under a transaction advisory lock. The same
  lock serializes settings, script edit/delete, turn execution and explicit stop.
- One turn/deadline: cursor/status condition, domain transition validation,
  per-turn idempotency key, messages/count/activity/outbox in one transaction.
  VN activity windows, daily quota including deleted history, Redis-loss recovery,
  rolling 30/min/group reservation and rollback/retry are exercised on native DB.
  Existing writer/publication tests retain the 120-room cap and NA-07 evidence.
- Global/script pause does not advance a thread. Completed postTurn jobs are
  removed: a paused no-op cannot strand the fixed job ID forever. A real BullMQ
  BotProcessor regression consumes the paused outbox job, re-enables scheduling,
  and verifies one posted message and terminal cursor after resume.
- API retires approval/discard in favor of POST stop. Stop retains history,
  rejects terminal replay, records audit, and rejects bots.view-only with 403
  VIEW_ONLY before changing the thread. Contract table now has 214 actual routes
  (215 minus two retired routes plus stop); coverage checks still require every
  declared route and forbid extra routes.
- Admin shows scheduled/running/done, cursor/total and Stop, polling every 3s.
  MSW advances one due turn instead of approving/batch posting; identity remains
  indistinguishable on Portal. Shared pure VN-time/delay functions prevent mock
  and backend window/delay drift. Disabled scripts cannot reuse an active run.

## Evidence

- Targeted native regression: **34/34 in 9 files**, including five new scheduler
  cases, one real-worker resume case, storage/publication, bot API, contract and
  admin-ops gate. Additional stop permission/audit assertions: bot API **4/4**.
- Repo unit gate: **915 passed + 2 existing integration-provider skips**, with
  Admin 334, Portal 163, shared 140, server 183, UI 43, integrations 52.
- Repo lint/typecheck and depcheck passed at this checkpoint (cache/task details
  retained in raw logs). Existing Next img warnings remain, not new failures.
- Raw initial failures and successful reruns are retained under
  `evidence/v2-501/lifecycle/`. Failures found: Prisma void advisory-lock result,
  retired contract/MSW expectations, missing test module exports/imports, a disabled
  persona fixture, and cross-file injected-clock history affecting newest-first
  activity assertion. Fixes preserve the new lifecycle and original identity,
  message-count, permission, audit and newest-first assertions.
- Full repository integration gate is running separately; a socket metrics.subscribe
  assertion has failed and is not dismissed as passing. Its final result must
  be recorded before claiming that gate. Targeted success is not full-suite success.

## Open work / no acceptance claim

Auto-generated conversations/LLM turn orchestration, member replies, emergency
hide, terminal-cap boundary regression, complete MSW/native behavioral browser
suite (the old approval-based bot browser case must be rewritten to D-50), C1-C6
and native browser audit, all UAT/AT/LK traceability, and new ver2 parity measurement
remain open. Real-provider adapter probes are **not** real-LLM browser/worker E2E.
No UI parity waiver is inferred. Native acceptance ports remain on the prior
running build; source changes are **not deployed** there. A coordinated migration,
fresh builds and restart require advance notice before changing acceptance data.
No main merge/push or PR auto-merge occurred; final delivery remains dev -> main
PR for owner review after the complete P5 gates.
