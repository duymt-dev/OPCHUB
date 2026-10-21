# P5 browser/parity closure before latest i18n integration

Code boundary: backend/Portal99100691; Adminfcba9e79 (build553 base d351da0e
plus the exact committed Escape fix). Report source363f756a.

-552 MSW9/9PASS18.2min.
-552 native8PASS/1FAIL23.7min; only failure was script drawer Escape.
-553 after fix, all4 original Admin bot cases PASS on both lanes; native23.8s.
  Thus all9 distinct bot cases have passing evidence in both lanes, with the
  native drawer case proven after correction. NOT a single native9/9 rerun.
-553 root1349PASS+2 existing skips; all four gates0. Focused integration108PASS.
-554 parity14 comparisons per lane complete. Raw red images retained.
  Owner-approved DV-V2-P5-1 and DV-V2-P5-2 apply; no blanket pixel PASS.
- All native553/554 final required/demo/cache restores0, restored=true.

| Lane | Screen | Width | Raw difference |
|---|---|---|---|
| msw | P-01 | 1440 | 0.22% |
| msw | P-01 | 390 | 2.30% |
| msw | D-36 | 1440 | 2.04% |
| msw | D-36 | 390 | 8.21% |
| msw | D-37 | 1440 | 8.92% |
| msw | D-37 | 390 | 7.78% |
| msw | D-38 | 1440 | 2.26% |
| msw | D-38 | 390 | 0.12% |
| msw | D-39 | 1440 | 10.39% |
| msw | D-39 | 390 | 11.04% |
| msw | D-40 | 1440 | 0.88% |
| msw | D-40 | 390 | 0.15% |
| msw | D-41 | 1440 | 22.30% |
| msw | D-41 | 390 | 18.53% |
| native | P-01 | 1440 | 40.76% |
| native | P-01 | 390 | 38.09% |
| native | D-36 | 1440 | 2.01% |
| native | D-36 | 390 | 7.81% |
| native | D-37 | 1440 | 8.94% |
| native | D-37 | 390 | 7.86% |
| native | D-38 | 1440 | 2.29% |
| native | D-38 | 390 | 0.12% |
| native | D-39 | 1440 | 10.41% |
| native | D-39 | 390 | 10.99% |
| native | D-40 | 1440 | 0.91% |
| native | D-40 | 390 | 0.15% |
| native | D-41 | 1440 | 31.09% |
| native | D-41 | 390 | 10.48% |

Runtime remains available on3280/3282, API4020/socket4021, fake providers.
No external calls in these runs. Historical actual-provider UAT14 passed under
TIP527's two-call cap; original real opening locator failure is retained and
has not been rerun. No claim of a full real-provider conversation suite.

At final fetch remote dev advanced from d158a36d to d2e984f6 (owner merged
PR6 i18n,26 new commits). This checkpoint is not evidence for that combined
source. Preserve i18n, integrate and run root gates/affected P5 boundary checks
before promoting to dev and updating PR5. No main push/merge or auto-merge.
