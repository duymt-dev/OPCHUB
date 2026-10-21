# TIP-V2-509 — partial execution identity index / prune regression

Status: IMPLEMENTED under P5 scoped refinement authorization. Parent TIP-V2-502.

## Evidence / bounded scope
Native Dashboard/bot/chat/moderation run:120 passed, one existing prune-plan test
failed. New unfiltered `(room_id, bot_thread_id, bot_turn)` identity index included
all human/legacy NULL contexts and displaced the ordered simulated-message prune
index, adding heap filters and Sort. Preserve that raw failure and the original
`persona-turn.int.spec.ts` index/PK/no-Seq assertions unchanged.

## Change and acceptance
- Replace only the newly introduced identity index with an equivalent partial
  UNIQUE excluding NULL bot contexts. The context CHECK pairs nullable fields,
  so valid non-NULL identities remain protected and legacy NULLs were already
  distinct. Do not remove older competing indexes or force planner settings.
- Prisma cannot declare this partial identity index in the current schema, so
  retain its handwritten migration declaration rather than a misleading full
  `@@unique`. No public API/business-rule/stack changes.
- Separate invariant/read paths: the final partial identity index is turn-first
  (all three keys bind equality on conflict checks), while opening existence uses
  its own unique opening marker. Hidden/soft-deleted markers remain authoritative.
  Preserve the new response index assertions; exercise actual visible/direct /
  hidden/deleted response data and counts, not empty lookups alone.
- Apply separately reviewed corrective migration to native opchub_test only;
  no applied migration rewrite/dev reset/VPS action.
- Existing prune test, metadata identity/opening concurrency, >20k Dashboard
  SQL plans, full focused bot/chat/Dashboard cohort and repo gates must pass.
- Completion report/raw receipts, scoped commit/push and clean tree. Full P5
  acceptance remains required; this refinement is not browser/parity evidence.

Evidence: `reports/TIP-V2-509-completion.md` — native121/121, focused19/19,
unit938 +2 existing skips; lint/typecheck/depcheck green. No original prune
assertions were edited. Applied corrective migrations are preserved separately.
