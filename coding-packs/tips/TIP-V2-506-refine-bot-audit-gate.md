# TIP-V2-506: D-50 audit gate contract migration

## HEADER
- Priority: P1; status: IMPLEMENTED / scoped regression verified; phase: V2-P5.
- Depends on existing implementation: TIP-V2-501 lifecycle implementation.
- Execution authorized by active P5 goal (scoped regression refinement).

## CONTEXT / RAW FINDING
The B5 gate still asserted a retired approve audit. A targeted run had previously passed against historical audit rows; the full gate correctly exposed the stale expectation.
Raw failures: `D:/opchub-local/v2/501-lifecycle-all-integration.log` and
`501-gates-refine-reproduce.log`; retain normalized/redacted copies in evidence.

## SCOPE
`apps/server/src/` / `apps/server/test/`: test/gates/b5-admin-ops.int.spec.ts only.
No stack/version, business flow, UI parity or deployment changes.

## ACCEPTANCE
Assert exactly one script.run audit for the actual script AND unique current actor; do not rely on historical summaries or reused seed sequence IDs. Preserve all message identity, campaign, permissions, request and other audit assertions.

## TESTS / GATES
test/gates/b5-admin-ops.int.spec.ts.
Repo lint/typecheck/test/depcheck; targeted native regression, then full integration
before final P5 acceptance. No weakened assertions, hidden retries or fake PASS.

## DELIVERY
Scoped commit and push on current dev-derived feature; record actual evidence in
reports. Main is unchanged; final delivery is owner-reviewed dev -> main PR.
