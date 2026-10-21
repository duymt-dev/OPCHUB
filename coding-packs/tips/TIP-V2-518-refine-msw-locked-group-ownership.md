# TIP-V2-518 — Deferred D-55 locked-owner group transfer

P1, parent TIP-V2-502/517, D-55 / NA-16 / UAT-24.
Status IMPLEMENTED, serial approved P5 feature. Four original shared failures:
locked ownership is never transferred, unlock leaves the old owner, Chat still
uses prototype constants, and no system transfer audit/count correction occurs.
Raw518-before.log retained privately.

Scope: extract shared GroupAdmin state behind existing exports, align initial
owners with native demo seed membership/locked-user rules, and share live owner
lookups across Admin/Chat. Enqueue locked-member effects only on actual status
changes, drain as a mock worker with current locked-status check, oldest active
Super Admin selection, ordinary membership retention/demotion, idempotent member
count and null-actor system audit. Unlock never returns ownership. Missing Admin
keeps work pending for retry. No warning/owner-change notification is generated.

Keep original4 failures; extend replay/unlock-before-consume/existing membership/
bulk/reset/system audit/HTTP and canonical owner seed controls. Root gates,
evidence/report/traceability, scoped commit/push clean. Generic audit supports
native null system actor; financial snapshot rules are not weakened.

Files: shared mock group-admin-state.ts/group-lock-jobs.ts/group-staff.ts (new), group-admin.ts,
chat-store.ts/chat-ops.ts, member-lifecycle.ts, audit-store.ts/settings-log.ts,
index.ts; dedicated shared/Admin/Portal specs; TIP/report/evidence/graph/findings/
TEST-GAPS/progress. Native GroupLockEffects/GroupAdminRepository and demo
community.ts are authoritative. No SQL/migration/native/dev/process/provider change.
Project visibility, cross-origin/live push, ghost seed and full P5 acceptance stay open.
