# TIP-V2-505: Bounded audit captions for large permission matrices

## HEADER
- Priority: P1; status: IMPLEMENTED / scoped regression verified; phase: V2-P5.
- Depends on existing implementation: TIP-V2-201 admin RBAC.
- Execution authorized by active P5 goal (scoped regression refinement).

## CONTEXT / RAW FINDING
Full integration and targeted rerun rejected an unchanged role permission matrix with HTTP 400 because its concatenated audit summary exceeded 500 characters.
Raw failures: `D:/opchub-local/v2/501-lifecycle-all-integration.log` and
`501-gates-refine-reproduce.log`; retain normalized/redacted copies in evidence.

## SCOPE
`apps/server/src/` / `apps/server/test/`: modules/admin-account/domain/role-audit-summary.ts + unit tests; admin-roles.service.ts one-line facade; test/admin-account/role-audit-caption.int.spec.ts.
No stack/version, business flow, UI parity or deployment changes.

## ACCEPTANCE
Preserve exact short captions; bound long captions to 500 with a visible role count. Keep the entire permission matrix in audit diff and commit permissions/audit atomically. A valid 50-role HTTP regression must succeed; 60 roles must still be rejected without changing validation limits.

## TESTS / GATES
domain/role-audit-summary.spec.ts; test/admin-account/role-audit-caption.int.spec.ts; test/contract/settings.int.spec.ts.
Repo lint/typecheck/test/depcheck; targeted native regression, then full integration
before final P5 acceptance. No weakened assertions, hidden retries or fake PASS.

## DELIVERY
Scoped commit and push on current dev-derived feature; record actual evidence in
reports. Main is unchanged; final delivery is owner-reviewed dev -> main PR.
