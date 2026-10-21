# TIP-V2-517 — Moderation member lock and stale-session revocation

P1, TIP-V2-502 / REQ-207 / NA-16 / UAT-24. Serial approved P5 feature.
Status IMPLEMENTED / scoped verified. Four Portal HTTP failures reproduced before edits: moderation
lock does not lock the sender; locked refresh remains valid; unlock resurrects
old access/refresh; correct credentials still log into a locked account.
Raw517-before.log retained privately.

Scope: independent member lifecycle/session epochs, captured report-source lock,
note/default reason and exact moderation/user audit. Reuse transitions for single/
bulk lock/unlock; guard Admin status routes with members.action/bounded JSON.
Fake tokens/refresh cookies carry non-secret epochs, epoch0 keeps old token
compatibility. Locked status blocks access/login; old epochs stay revoked after
unlock. Existing cookie-only test precondition remains supported. Central decoder
preserves actor/user identity. Keep4 original failures, expand HTTP/domain/negative
audit/reason/bulk/refresh/persona/reset tests, root gates, evidence/report, clean push.

Files: shared mock member-{sessions,lifecycle}.ts/moderation-lock.ts (new),
report-actions/ops-admin/admin-members/audit-store/settings-log/index; Portal
session/domain-util/mock-auth-session; Admin moderation/member-status/admin-json/
bot-helper and legacy status route removals; dedicated specs and P5 artifacts.
Native source is contract. No native production/schema/dev/process/provider changes.
Owner-group D-55/project visibility, cross-origin/live socket, ghost-account seed
and full dual-browser acceptance stay explicitly open, not full NA-16/P5 DONE.
Standards: testing/testing.md, backend/auth-rbac.md, global/code-structure.md,
global/git-workflow.md. No real credentials/tokens in mock session state.

Evidence: reports/TIP-V2-517-completion.md. Original4 failures unchanged; shared12,
Admin29/Portal8 cohorts, forced units1166 +2 existing skips; lint/typecheck/depcheck
pass. Full P5/dual-browser/live acceptance stays open.
