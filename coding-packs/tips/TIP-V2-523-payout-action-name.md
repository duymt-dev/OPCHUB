# TIP-V2-523 — Stable accessible payout action during loading

## Scope / evidence
REQ-309 / AT-AF06 native full217/221 and unchanged focused1pass/1fail.
The retained private trace shows first POST409 and Portal bank PUT200, but no
second payout POST. The confirmation remains visible; its AntD loading icon has
role=img and accessible label `loading`, including its leave-motion phase.
The exact action-name locator waits rather than sending a request. Background
tab motion is a suspected timing contributor, not a proven backend failure.

## Correction / acceptance
- Preserve a stable translated accessible payout button name while its spinner
  enters/leaves. Keep pending-click protection and all financial behavior.
- Dedicated component regression must fail before/pass after; retain existing
  conflict/same-key/snapshot assertions and unchanged both-lane browser cases.
- No API, SQL, permission, idempotency or business-rule changes; no assertion
  loosening, icon-name regex workaround or backend-specific test branches.
- Run root lint/typecheck/test/depcheck, fresh Admin builds and both-lane payout
  browser tests. Full acceptance remains pending regardless of this scoped fix.
- Commit/push feature from dev; no main merge. Restore native demo after tests.

Standards: testing/testing, frontend/antd-ui, global/code-structure,
global/git-workflow. Touch only payout dialog, separate regression, reports and
findings/task traceability. Native UI cutover requires verified process ownership.
