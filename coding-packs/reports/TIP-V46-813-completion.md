# TIP-V46-813 — IN PROGRESS

## Scope and environment

- Approved TIP: A1–A12 only; A13–A22 belong to814. Branch `feature/TIP-V46-813-debt-code`, TIP commits9098999c/7a165a82 on dev fd540d1d. No application/package/E2E code difference from dev before execution.
- Owner approved reuse of `opchub_v46_812_dev`, integration `opchub_v46_801_test`, Memurai6381; rolling restart ONLY the separate812 runtime to813 when ready. Original native PostgreSQL/Redis6379 and older HOLD remain untouched. Never run two outbox workers against the same DB during cutover.
- Q1–Q4 use explicit TIP defaults: retain module directory names; custom403 only three writes, not candidate GET; overlapping renewal send409 without queueing; joined-group technical cap1000.
- Q5 explicit provider override OR local HTTP stub is approved for tests; no environment-driven fake runtime. Q6 covers EVERY manifest domain denial branch, with additional rollback cases for rule8 domains.
- Additional owner approval: modify `apps/server/src/worker/processors/bot.processor.ts` narrowly to preserve original IntegrationError in terminal UnrecoverableError.cause. Necessary so WorkerFactory can inspect `reason` without string matching or changing retry/failure semantics.
- Additional owner approval: `apps/server/vitest.config.ts` excludes `**/*.int.spec.ts` from the unit project's broad audit glob; the integration project retains every integration case and its test-DB setup. This prevents the new A12 suite from running without DB-test guards.

## Baseline (before functional edits)

Source7a165a82 is application-equivalent to dev fd540d1d. Separate logs `test-results/v46-813-baseline-*` retain actual results; cached commands are labeled as cached.

|Gate|Current evidence|
|---|---|
|lint|8/8 PASS,8 cached; existing nine no-img warnings replayed|
|typecheck|8/8 PASS,8 cached, explicit valid build env|
|build|3/3 PASS,zero cache,3m2.083s; isolated `.next-v46-813-baseline`, no active Next dist overwritten|
|unit|6/6 PASS,3 cached,16m21.715s;2139 passed +2 existing skips|
|integration|Server2005 passed/1 failed (222 files),40m41s. Failure: newest100-replies interactive fixture exceeds5s (A16→814). DB standalone143/143 PASS,59.58s. Root stopped before DB; standalone execution is recorded separately.|
|MSW behavior|Full388 passed/1 failed/4 existing skips,25.2m. Affiliate mobile bulk-rate login timed out; unchanged focused replay1/1 PASS6.6s. Full result remains failed, not relabeled green.|
|depcheck|PASS:2489 modules/7553 dependencies and1143/5334; the latter includes three newly drafted integration files, not functional edits|

The first implementation edits are A6 comments only, after baseline build completed. They do not change rendered markup or server/integration behavior. Server/shared code remains unchanged while baseline integration runs. Final gates will be rerun after functional edits; no earlier checkpoint is substituted for a final result.

## A1–A12 progress

- A6: nine targeted next/no-img-element explanations in the seven approved files; preserve img, dynamic storage URLs and onError fallback. Focused Admin/Portal lint both exit0, zero warnings. Targeted existing regressions Admin23/23, Portal16/16 PASS.
- A1: membership-first seek and deferred group payload join, technical cap1000; one avatar batch and existing room/unread batches. Both named new regressions PASS, plus existing chat REST/contract regressions. Actual10000-group/10003-membership EXPLAIN has index seeks/no Seq Scan; see `TIP-V46-813-query-plans.md`. Scoped lint and server typecheck exit0. Focused A1/A7/A9 run31 passed/4 failed: the four failures were new A9 fixture cleanup FK constraints, not A1. Corrected exact-ID CustomerYear cleanup; subsequent A9+A12 run25/25 PASS.
- A8: shared audit-prefix helper used by capture/restore/schema; preserves affiliate, regional-share and regional-director audits, unrelated audit retained. Actual payout exposed a second boundary: its structured diff was rejected by the old strict snapshot schema. Preserve and validate JSON diff rather than dropping financial audit metadata. Focused23/23 PASS, shared typecheck/lint exit0; initial failed strict-diff run retained.
- A1–A5/A7–A12: implementation/final acceptance not complete.

## Not complete

No DONE claim, PR or merge yet. Full baseline/final gates, all named acceptance tests, joinedBy query plans and final parity evidence remain required. Test timeouts/assertions are not relaxed; A14 audit-scan stabilization remains outside813.
