# TIP-V2-519 — Preserve omitted group owner on metadata PATCH

P1 bounded refinement of TIP-V2-518 / REQ-229 / NA-29 / UAT-24.
Status IMPLEMENTED on approved serial P5 feature off dev.

Evidence: unchanged Admin MSW regression requires omitted owner to preserve the
current owner, as documented by shared GroupAdminUpsert. Native HTTP reproduction
519-before.log confirms PATCH silently transfers ownership to the editing Admin
and increases member count. Keep the new failed assertion and existing tests.

Scope: reuse existing transactional owner lookup in GroupAdminRepository.setStaff
to resolve omitted owner to current owner, with actor fallback only for ownerless
groups/create. Return the resolved ID for notification decisions. Deduplicate
staff IDs. Explicit owner changes still demote the previous owner and notify via
the existing outbox. No new SQL statement, migration/index or public API schema.

Files: group-admin.repository.ts, group-admin.service.ts, dedicated
test/community/group-owner-omission.int.spec.ts, TIP/report/evidence/traceability.
Run native HTTP reproduction plus existing admin-groups and lock propagation;
root lint/typecheck/test/depcheck. Only native opchub_test/Redis2 fixtures, restore
borrowed province in finally; do not change opchub_dev or native HOLD processes.
Full browser lanes, project visibility, full P5 acceptance remain outside scope.
