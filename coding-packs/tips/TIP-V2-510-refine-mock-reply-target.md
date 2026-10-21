# TIP-V2-510 — validate MSW chat reply targets before insert/idempotent return

Status: IMPLEMENTED under the P5 scoped-refinement authorization. Priority P1.
Parent: TIP-V2-502; prerequisite: existing native Chat send/replyTarget contract.

## Verified finding / scope
During member-reply mock implementation, native `MessageService.send` was found
to validate `replyTo` existence and same-room ownership before idempotent insert.
MSW instead accepted a missing or cross-room target, and returned an old message
for a replay carrying an invalid changed target. HTTP reproduction: three new
404 assertions fail with 201; the valid delayed-reply scenario still passes.
Finding `P5-MSW-01`, S3 (mock-only contract drift; native already enforces 404).

## Files / bounded correction
- `packages/shared/src/mock-data/domains/chat-messages.ts`: validate a supplied
  target exists and belongs to the destination room BEFORE duplicate detection.
- `apps/portal/src/mocks/bot-reply-handlers.spec.ts`: missing/cross-room targets,
  invalid-target replay, plus the already authorized member-reply workflow.
- Report, finding ledger/task row and retained before/after evidence.

## Acceptance / exclusions
- Missing or cross-room target =>404, no message insert, no bot admission.
- Existing `clientMsgId` does not bypass target validation on another request.
- Valid same-room replies and idempotent requests still work; hidden sources
  retain the existing masked-preview semantics (native does not reject them).
- Preserve every new 404 assertion; full lint/typecheck/units/depcheck green.
- No new API, business decision, role, schema, dependency or native behavior.
- Scoped commit/push, clean status, report actual Git SHA. This does not close
  TIP-502/P5 or imply browser/native/final-parity acceptance.

Evidence: `reports/TIP-V2-510-completion.md`; three failures reproduced before
the fix, all four HTTP cases pass after it, final forced repo units1014 +2
existing skips. Lint/typecheck/depcheck green. Final P5/browser acceptance pending.
