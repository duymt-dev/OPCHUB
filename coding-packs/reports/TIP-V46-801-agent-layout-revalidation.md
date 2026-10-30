# V46-801 — rejected agent-table layout experiment (PARTIAL)

Previous turn made progress with exact code selection. This continuation
revalidated AGENTS, whole GOAL, progress, branch and clean source at4ff6649b.
It disproves the proposed next layout change; **no production/test-source
change is retained** and no acceptance criterion has changed.

## Correction to the previous checkpoint

The inline prototype markup declares a1300px grid, but actual mobile rendering
is **cards**, not a horizontal table. `docs/spec/index.html:84–92` overrides
`[data-m="tbl"]`, removes the min-width, hides the header, transforms grid rows
to wrapping flex cards and gives the last action a full row. This applies to
the Affiliate agent list. The customer table fixed atad0d5e3f is different:
its flex-based markup is not targeted by those grid rules and stays horizontal.

The earlier statement that agent mobile cards are obsolete was an incorrect
inference from inline markup, not verified computed style. Read-only row
inspection preserved `getAttribute('style')`, which does not account for
stylesheet `!important` rules. Current screenshots of both interfaces prove
the difference; do not generalize the CUS fix to all lists.

## Rejected experiment and evidence

Trial removed mobile-card/header-hiding CSS while keeping nine existing
columns/1080px table and all selection/detail/paging controls. Responsive tests
were correspondingly updated to scroll every cell. Initial MSW13-case run had
12 pass/1 fail because empty guidance expanded60px (required<=28). Specificity
correction restored compact guidance; experimental MSW13/13 and native13/13
then passed. Experimental Admin MSW/native builds and root precommit checks
also passed (unit2085 +2 existing skips, Admin592 fresh). These are **not**
proof of visual alignment or evidence for a new committed source.

Actual unmasked mobile parity became worse:

| State          | Committed cards | Rejected table |
| -------------- | --------------: | -------------: |
| D-84-AFF       |      26.746280% |     60.752092% |
| D-84-AFF-Q     |      30.281490% |     35.934617% |
| D-84-AFF-BULK  |      29.116042% |     34.601570% |
| D-84-AFF-EMPTY |       1.913051% |      5.051370% |

Experimental parity10 cases:5 pass/5 fail,1.4m,exit1 (two harness cases
included). Its reporter SHA4ff6649b identifies HEAD only; source was dirty.
Do not attribute this rejected runtime/table layout to committed4ff6649b.

All five trial files were restored exactly from HEAD, including the TIP edit;
`git diff --name-only -- apps e2e coding-packs/tips` is empty. Never commit a
known misaligned change just because functional tests pass. All original
card geometry/empty guidance tests and one-row/selection assertions are kept.
No prototype, baseline, capture area, masks, threshold, timeout or seed changed.

Only after original browser jobs were terminal, rebuild Admin from clean
committed source in `.next-v46-msw-build` (msw, Portal relaylocalhost:3000)
and `.next-server` (off, API127.0.0.1:4000). Remeasure the existing unmodified
AFF journeys to replace experimental report rows with actual committed code
measurements, not a manual FAIL→PASS edit. Restored verification follows below.

Restored actual committed code: parity6 pass/4 fail,10 cases,36.0s,exit1;
all eight rows captured at4ff6649b with original card values above. AFF-EMPTY
mobile returns to1.913051% PASS and the reporter removes its experimental
diff. All other FAIL diffs return byte-for-byte to their prior committed form.
Original browser files now pass5/5 MSW (18.0s) and5/5 native (43.2s), without
trial test edits. Required seed/demo/cache restore again exit0 after this
native run; original held process start times retained.

The missing final frontend regression was then started from this clean source:
root `pnpm e2e`, source4ff6649b,346 collected/two workers, isolated MSW outputs, local Portal
relay. Handle34354 is running; log `v46-801-full-msw-4ff6649b.log`. This is not
a PASS claim or a reason to restart an existing runner. Poll the same handle;
do not overwrite frontend outputs/launch overlapping suites while it is live.
Later documentation commits do not change this source scope.

Ignored logs under `e2e/.parity-out/`: `v46-801-agents-{precommit,build,
build-final,native-build,native-build-final,msw,msw-final,native,parity,
msw-restore-build,native-restore-build,restore-data,restored-parity,
restored-msw,restored-native}.log`. Required seed/demo/cache restore exit0;
native API28484/socket33408/worker16200 retained, binaries unchanged.

Remaining mobile differences include actual803 region field/card contents,
distinct HAOPC/HAOPC84 search results and802/803 financial policy totals. They
cannot be fixed by fake history, dropped agents or empty placeholder columns.
Sidebar/P16/final frontend regression and other Affiliate gates remain open.
TIP801 is not complete and802 is not started.
