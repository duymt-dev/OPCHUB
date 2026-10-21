# TIP-V2-510 completion — scoped mock reply-target contract correction

## Finding and correction
Source inspection of native `MessageService.send`/`MessageRepository.replyTarget`
establishes a404 for missing/cross-room targets BEFORE duplicate insert/return.
New MSW HTTP tests reproduced201 for all three invalid cases: missing target,
cross-room target and existing client ID replay with a changed invalid target.
This is `P5-MSW-01`, S3 mock/native contract drift, not a native authorization
vulnerability finding.

The shared mock send now validates target existence/room before duplicate
detection and before any insert/admission/side effect. Valid same-room quote,
hidden-source masked previews and valid idempotent requests retain existing
behavior. No native code/schema/business/permission/dependency change.

## Evidence
- Before: Portal HTTP **3 failed / 1 passed**, all invalid-target responses201.
- After: **4/4 passed** with the exact same404 assertions, including the positive
  delayed member-reply chat/Dashboard workflow.
- Final forced repository units **1014 passed + 2 existing storage skips**;
  six tasks ran uncached. Lint/typecheck8/8; depcheck zero violations.
- Receipts: `evidence/v2-510/`; original raw failures remain private. No assertion
  removal/relaxation, `onServer` branch, native stack/data mutation or provider call.

## Scope limits / handoff
The bounded correction is implemented with current HTTP/unit evidence. Actual
MSW/native browser lanes, full native integration, UAT/AT/LK/audits/parity and
P5 completion remain required under TIP-501/502/503. This report does not claim
native HTTP re-execution for unchanged code or a ready dev→main PR. The source
and this evidence are committed/pushed together; use their Git commit SHA,
not a test-binary digest. Main remains owner-merge-only.
