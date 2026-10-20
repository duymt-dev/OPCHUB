# TIP-V2-502 emergency-stop backend checkpoint — IN PROGRESS

## Scope implemented
- `POST /admin/bot/emergency-stop`, shared response schema, `bots.action` guard.
  Fresh settings preserve configuration except `enabled=false`; all scheduled /
  running threads transition conditionally to done with no next deadline. The
  domain transition table determines valid source states. Audit and cleanup
  outbox event commit in the same transaction.
- Internal `app_settings.bot_control` stop fence prevents old member-send
  outbox/job replay from admitting a new reply after re-enable or Redis loss.
  This record is independent of public bot settings and survives thread GC.
  No new environment variable, secret, table or migration was introduced.
- Both turn producers (outbox and scheduler) batch-revalidate live thread
  cursor/status/deadline under the execution advisory lock before queueing.
  No per-turn SQL loop. Reply producer validates the source/settings/fence;
  admission and final runner independently recheck current state.
- Queue cleanup is a durable, idempotent consumer: 100-job pages, token lease,
  retained original pause state and crash-recovery marker. It removes old
  pending reply/postTurn jobs, not tick/publication/active jobs or newly accepted
  post-stop work. In-flight generation cannot publish after terminal transition.
  Failed cleanup stays retryable via outbox; settings are invalidated there too.
- Ordinary settings pause is deliberately NOT emergency stop: its existing
  outbox/worker/resume behavior remains intact. No old assertion was weakened.

## Evidence and limitations
- New native cases: six emergency HTTP/domain/outbox cases and five actual
  BullMQ cleanup cases. Includes VIEW_ONLY/401, actor audit, repeat stop,
  in-flight LLM stop/re-enable, rollback on actual invalid audit inet, stale
  member and turn replay, delayed cleanup preserving new work, >300 mixed
  waiting/delayed/prioritized jobs, publication/tick preservation, paused-state
  preservation/recovery, competing lease and active-job protection.
- Focused final cases **11/11 in 2 files**. Broader pre-final-assertion cohort
  **47/47 in 9 files** includes existing scheduler, auto admission, generation,
  replies, real pause/resume worker, bot HTTP contract and endpoint coverage.
  Full bot/contract cohort **76/76 in 16 files**, including actual reply and
  pause/resume workers, storage constraints and 10,001-row EXPLAIN fixtures.
  The reply worker waited its actual **51,390ms** deadline and produced one
  reply/one keyword report with FakeLlm. After strengthening the rollback
  assertion to include an active thread's status/cursor/deadline/update time,
  the latest focused run again passes **11/11**. This is not the full repo's
  integration gate or any browser/real-LLM acceptance.
- Final repo gates: lint **8/8 tasks** (7 cached), typecheck **8/8** (7 cached),
  units **935 passed + 2 existing skips** across six successful tasks (5 cached):
  server203/Admin334/Portal163/shared140/UI43/integrations52. Depcheck has no
  violations: 1,489 FE/shared modules/4,082 dependencies; 745 server modules /
  3,278 dependencies. Existing UI lint warnings remain disclosed in receipts.
- Raw initial failures retained: error envelope fixture expected a top-level
  code instead of `error.code`; rollback fixture incorrectly assumed an audit
  actor FK (audit supports historical actors); baseline restore SQL needed the
  existing enum cast. They were corrected without mocking Prisma/audit. The
  failed cleanup left an internal test fence. A guarded loopback5432/opchub_test
  cleanup verified and removed that internal record after the final test run;
  subsequent suites now restore the saved fence/baseline. No dev data changed.
- Broader regression caught producer suppression during ordinary pause. The
  implementation was corrected to preserve the existing active-thread worker
  contract; the original worker call/removal/message assertions remain unchanged.
- Raw logs: `evidence/v2-502/emergency/`. Private originals are under
  `D:/opchub-local/v2/502-stop-*`; tracked receipts are redacted, not substituted
  for original failures. PowerShell informational stderr wrappers are retained.
- Test storage only: native loopback PostgreSQL/opchub_test and Redis DB2.
  Native acceptance services/dev data were not restarted, migrated or reset.
  All providers in this checkpoint are FakeLlm; not real-provider browser E2E.
- Hide-messages/realtime reload, real Dashboard feed, Admin controls/MSW,
  both browser lanes, full integration/audits/UAT/AT/LK/parity and final reports
  remain required. TIP-501 auto-turn shape approval is still pending. No
  completion claim, main merge or main push. Feature/dev workflow remains active.
- HOLD recheck: Portal3280/PID1904, Admin3282/PID23388, API4020/PID18936 and
  socket4021/PID7436 still listen with the same owners. These are the pre-existing
  acceptance builds, not evidence that the new P5 source has been deployed.
