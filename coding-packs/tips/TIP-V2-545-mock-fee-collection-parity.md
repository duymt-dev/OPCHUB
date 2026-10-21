# TIP-V2-545 — Mock accountant collection parity

Bounded refinement under approved503, triggered by TIP544 raw failure.
Requirements: AT-LK02/UAT-10/REQ-402; native implementation is the reference.

1. Fix the MSW Admin collection boundary to use the actual operation time,
   retaining injectable clocks for deterministic domain tests.
2. Match native calendar twelve-month validity, including leap-year edges;
   do not silently substitute 365 days. Inspect native policy before editing.
3. Re-run unchanged544 browser assertions. Only if the open Portal gate then
   fails, trace membership propagation and fix its scoped mock subscription;
   do not insert a reload, lane branch or polling-only test workaround.
4. Add separate focused unit/HTTP regressions for changed behavior. No new
   dependency, provider call, backend/DB change or unrelated mock redesign.
5. Root lint/typecheck/test/depcheck and fresh MSW builds; relevant both-lane
   browser tests. Announce native reset and restore required/demo/cache.

Read standards/testing/testing.md, frontend/data-state.md and
global/code-structure.md. Keep modules below caps; preserve original544 red
evidence. Record exact scoped results, pending full registry and any further
findings. Commit/push explicit paths; never integrate main.
