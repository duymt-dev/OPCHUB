# V46-801 — exact affiliate selection identity (PARTIAL)

Source `849c579e`, committed/pushed. Previous turn was progress: v4.6 customer
layout correction passed D-85/CUS/RATE and same-mode responsive checks. This
continuation restores the remaining uncaptured Affiliate bulk journey, without
changing production code/data or declaring the unrelated visual gaps accepted.

## Read-only reproduction

Executed the existing normal D-84-AFF-Q prototype journey at1440/390 with
standard stabilization; measurement2/2,6.9s. Search remains `HAOPC`, deliberately
not changed to an exact search/filter that would hide a legitimate result.

Both widths return two separate actual agent rows, not a duplicate/ancestor
selector: Lê Thu Hà, code **HAOPC**, and Phạm Thu Hà, code **HAOPC84**. Both have
`min-height:60px`, ten direct grid cells, no nested matching row. The old whole-
row substring matcher finds both; its exact one-row assertion correctly failed.

Selection now requires the exact referral-code descendant for affiliate rows.
Commission selection still uses the same member-name matcher. Preserve exact
one-row assertion, actual checkbox click, one-selected counter and complete
filtered result set/capture. No `.first()` fallback, hidden row, prototype
state injection, relaxed count/timeout, screenshot mask or baseline change.

Ignored measurement JSON: `affiliate-rows-{1440,390}.json`, log
`v46-801-affiliate-rows-measure.log` under `e2e/.parity-out/`. Temporary specs
removed before root checks; no authenticated trace/HTML snapshot committed.

## Verification and limits

Root precommit lint/typecheck8/8 each, unit2085 passed +2 existing S3 skips
(six cached tasks; only parity source changed), depcheck2280+1008 pass.
Prettier/git diff --check pass. No build/native rerun needed for this test-only
selection change; held services/demo data and current compiled app are untouched.

Initial related run:6 passed/4 failed,10 collected,35.0s,exit1. Eight full-page
images were captured plus two passing harness tests. All four failures are
actual image differences; there is no longer an AFF-BULK selector failure.
The first run used uncommitted selector source, reporter SHA9df8e349, not yet
849c579e. Post-commit same scope is terminal exit1:6 passed/4 failed,31.8s,
same eight image values below, actual849c579e SHA recorded by the reporter.
No capture timeout/selection failure, new skip or repeat-until-green claim.
Logs `v46-801-affiliate-exact-code-{precommit,parity,849c579e}.log` under
`e2e/.parity-out/`. All runner handles are now terminal.

| State                |            1440 |             390 |
| -------------------- | --------------: | --------------: |
| AFF-BULK exact HAOPC |  1.573765% PASS | 29.116042% FAIL |
| COM-BULK             | 14.038611% FAIL |  9.063134% FAIL |
| AFF-EMPTY            |  0.986420% PASS |  1.913051% PASS |
| COM-EMPTY            |  1.571219% PASS |  6.420965% FAIL |

Actual mobile AFF-BULK failure replaces the stale historical0b76e98a PASS row;
it is not waived because selection now works. Related image failures remain.
Correction after browser revalidation: the1300px inline prototype grid is
transformed to mobile cards by stylesheet rules84–92. The previous horizontal-
table inference was wrong; app cards must be retained. The experiment was
discarded before any source commit. See `TIP-V46-801-agent-layout-revalidation.md`;
do not remove card/empty-state tests or introduce803 data to fake visual parity.

Native/backend/shared are unchanged; integration1894/1894 at302174ed remains
scoped evidence. Earlier full MSW342/4 skips predates changed frontend CSS and
is not a new current full gate. Sidebar/P16/other Affiliate work remains open;
TIP801 not complete,802 not started. No merge or goal/acceptance edits.
