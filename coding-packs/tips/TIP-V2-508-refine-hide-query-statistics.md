# TIP-V2-508 — Refine correlated bulk-hide query statistics

Status: IMPLEMENTED, under the P5 scoped bug-fix authorization. Depends on
TIP-V2-502 hide SQL/index. No business-rule, API or stack change.

## Finding / scope
REQ-141 scoped/global hide must remain one conditional UPDATE with indexed
selection. Native PostgreSQL on a mixed history of human/hidden/visible persona
messages can multiply independent column estimates and overestimate visible
personas by orders of magnitude, choosing Seq Scan despite a suitable partial
index. Earlier, an overly uniform fixture also allowed a different valid persona
index. Preserve raw before plans and the exact index/no-Seq assertions.

## Change
Add a partial covering seek index `(is_simulated, hidden_at, room_id) INCLUDE(id)
WHERE is_simulated`. Equality/null search keys must precede room scope, not live
only in the partial-index predicate. Retain competing indexes; no forced plan.
Add separately reviewed create-only SQL migrations with MCV / dependency
statistics matching the query's column NullTest `(is_simulated, hidden_at)`, then
ANALYZE. Preserve the unsuccessful expression-statistics migration/receipt and
correct it in a new migration rather than editing applied checksums.
Do not edit an already applied migration, drop competing indexes, force planner
settings or weaken guards/assertions. Only native test
storage may be migrated now. Refine the fixture to contain >10000 wide human
rows, >10000 already-hidden persona rows and 40 eligible rows. Reset only those
40 eligible fixture rows between the two actual EXPLAIN UPDATE executions.

Measured test-environment contamination: 40 live partial-index tuples occupied
485 pages after repeated rolled-back 10k-row suites (heap670 pages). Preserve
before metadata/plans. A diagnostic test-only rebuild was insufficient in the
broader suite and is NOT in the final fixture. Final SQL plans must pass without
REINDEX/VACUUM, planner switches or test-created indexes; use actual deployed
migrations. This does not implement a production index-maintenance policy.

## Acceptance / verification
- Actual production scoped and global UPDATE SQL each has one Update node,
  uses `messages_persona_visibility_seek_idx` with actual `Index Cond` for both
  `is_simulated = true` and `hidden_at IS NULL`, no Seq Scan on messages, and changes
  exactly the eligible rows. Full ANALYZE/BUFFERS plans printed before assertions.
- Fixture obeys message body constraints and rolls back; no mock database,
  disabled constraints or planner hint. Test `bot-hide-storage.int.spec.ts`.
- Existing hide HTTP/socket and full bot/chat/moderation regression remain green;
  lint/typecheck/test/depcheck, receipts, scoped commit/push and clean tree.
- Keep the current P5 scope open: no browser/parity/full-repository acceptance
  is inferred from this performance refinement.

Evidence: `reports/TIP-V2-508-completion.md` — final native105/105, unit938 +2
existing skips, lint/typecheck/depcheck green. All failures and final plans retained.
