# TIP-V46-815 — DONE (D-134 reference parity)

## Delivery

- Branch `feature/TIP-V46-815-live-ai-check`, based on `dev` `7ceb26d7`.
- Matrix source **a49ed5cd**; final source **d1f2a37d**, pushed. PR [#97](https://github.com/duymt-dev/OPCHUB/pull/97), **base dev**. Later commits are report-only. No merge/auto-merge.
- [Live matrix](TIP-V46-815-live-matrix.md): **custom/9router PASS, REQ-208 PASS, UAT-14 PASS**. Five providers without keys are NOT TESTED, not PASS.
- No application UI/domain/adapter/catalog/dependency/business-rule changes or migrations. No automatic merge.

## Files / implementation

- New `e2e/llm/provider-matrix.spec.ts`: six independent provider cases; enabled/stored-key prerequisite, Admin verification, one real worker/member reply, Portal visibility and digest/usage receipt.
- New `e2e/llm/provider-matrix.ts`: non-secret configuration whitelist; cap256, no fallback, unchanged budget; one-message sampling instead of draining history; stop prior reply runs; restore configuration/sampling and stop bot on cleanup. Bounded indexed time-range metadata query only.
- `e2e/env.ts`: owner-approved Zod parsing of existing DB URL and live-only loopback/private-DB guard before spending tokens. No new variable or AI-key env access.
- `e2e/playwright.llm.config.ts`: skip-seed mandatory, one worker, zero retries, no fail-fast matrix, trace/video/screenshots off, no unrelated parity teardown.
- `e2e/llm/native-real-provider.spec.ts`: owner-approved REQ-208 destination from removed Dashboard LIVE feed to chat c1 (D-89). Still requires one visible persisted opening, cursor1/three planned turns, empty remaining turns and stopping. Unique fixture topic prevents matching completed historical executions.
- Reports: this completion, live matrix, progress row15, debt B2 and questions815.

## Actual verification

| Gate | Result |
|---|---|
| lint | PASS, root8 tasks; closure rerun also8/8 |
| typecheck | PASS, root8 tasks; closure8/8; explicit build-mode environment |
| unit | PASS2142 +2 existing skips in full initial run7m50.482s; closure PASS6 tasks,3 cached,3m55.068s |
| test:int | **2200/2200 PASS**: server2056/228 files +DB144/29 files;41m29.71s |
| depcheck | PASS,2495 modules7601 edges +server1150 modules5411 edges |
| build | Forced MSW and native PASS,3 tasks each; separate815 dist; owned Next cutover |
| full E2E MSW | **391 PASS /4 existing skips**,17.1m |
| native matrix | **1 PASS /5 no-key skips**,1.2m; real verify and bot |
| native existing cases | **REQ-208 PASS, UAT-14 PASS**; original obsolete-assertion failure retained in live history |
| safety guards | Unsafe implicit seed rejected;4 DB cases PASS: native dev/test and remote rejected, approved DB accepted |
| full MSW parity |492 fresh captures:434 within3%,58 threshold-only;8 existing prototype failures;78 existing registry skips. Raw438 passed/66 failed/78 skipped, exit1,21.4m. D-134 reference, not relabeled zero exit. |
| secret scan / Git / PR | Source committed/pushed, PR97 into dev; secret-scan details below |

Unit packages: UI63, shared705, server253, Portal440, integrations107+2 skips, Admin574. Live directory is opt-in, excluded from ordinary E2E/CI.

## Parity disposition

No application UI source changed. Same8 prototype journey failures as814: P-05/P-100/P-101/P-102 at both widths; same78 registry skips. Existing D-134/814 dispositions remain, not new app regressions. Decisions that differ from prototype are not called app failures.

492 fresh measurements only;8 old store rows excluded. Runner also has4 successful prototype-only checks, hence438 is not the capture count. Fresh JSON: ignored `test-results/v46-815-parity-fresh.json`; paired images: `e2e/.parity-out`. Historical shared report/images were restored after preserving815 data instead of committing regenerated unrelated artifacts.

No full ordinary native behavior-suite rerun against the live-key DB: those fixtures replace AI keys. Native verification here is the requested matrix and both real journeys. Prior814 full-native results are historical, not an815 run.

## Approved deviations / findings

1. Private dev `opchub_v46_812_dev`/Memurai6381 DB3, test `opchub_v46_801_test`/DB2 and owned rolling restart approved. Native DB/Redis6379 untouched.
2. Four requests approved to resolve TIP's contradictory three-call cap; fifth explicitly approved for corrected REQ-208. **Five used**, each configured for at most256 output tokens (verify16), unchanged budget.
3. API forbids disabling final provider. Owner approved exact pre-run AI configuration restoration with provider retained and bot automation off, not SQL bypass/backend expansion. Encrypted key unchanged.
4. Prior scheduled c1 execution occupied the group. Existing isolation helper stops unfinished executions and defers seeded scripts; actual fresh opening then generated/published correctly.
5. Original REQ-208 failed on Dashboard article assertion (LIVE removed by D-89). Corrected destination preserving publication assertions. A zero-call stale-topic attempt was stopped; unique topics prevent old-execution matches. No scheduler/adapter fix was justified.
6. Initial build/typecheck lacked Portal internal API URL; explicit mode fixed the command, not code. Initial MSW E2E503 was missing local Portal relay origin; interrupted attempt is not counted. Corrected full run391/4 passed.
7. Owner approved the narrow env file extension and narrow existing-test correction; no secret was obtained from environment or command input.

## Restore / runtime

AI non-secret configuration compared after cleanup: allocations/fallback/prices/budget/settings/model restored; limit back to original1024 **after** stopping automation. All test calls capped256 or less. Bot enabled/auto-generation/automatic replies off; original sample size restored, key retained. No seed/reset of live-key DB.

API/socket4310/4311; native Portal/Admin3710/3711; MSW3930/3931; prototype4830. API/socket/worker application unchanged; owned Next815 builds running. Ignored state: `test-results/v46-815-runtime-state.json`.

## Safe reproduction

Owner must explicitly approve a fresh budget and enable/configure the intended stored provider in Admin. Set native target/ports, the approved private DB via existing wrapper, and **SKIP_SEED=1**. Run `pnpm --filter @opchub/e2e exec playwright test -c playwright.llm.config.ts --project provider-matrix` (two calls per enabled/keyed provider). Run existing real-provider cases with cap256, prior-execution isolation and one-message sampling; restore config and stop bot afterward. Do not blindly rerun against the exhausted budget of this report.

## Closure

- Final source `d1f2a37d`; source commits are pushed. Report-only delivery commit does not alter tested source.
- PR97 into dev; ready-for-review after report push. Owner reviews/merges, never automatic merge.
- Secret scan covers added implementation/report lines since initial `02613aae` plus cited live receipt artifacts. No credential-prefix/header pattern matches; exit1 (zero matches). Traces/videos/screenshots absent in live output directories. No credential suffix, prompt or generated answer in these reports.
- Safety evidence: matrix metadata has exactly1 worker call; full live interval has4 worker calls +1 unlogged verify; failed stale-topic attempt0. Final configuration restoration assertions passed and bot automation is off.
- Pending vendor evidence: Claude/OpenAI/Gemini/DeepSeek/USGate need owner-provided keys. B3–B18 and TIP816 Web Push remain outside scope.
