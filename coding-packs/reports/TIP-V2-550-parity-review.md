# P5 parity review ? measured, not all green

Source83ff10b7; MSW fresh547 build, native backend159fc82b/UIed9dbccc.
Native required/demo/cache restore all0 and restored=true. No production edits.
Same unmasked pixelmatch0.1 threshold and3% gate, no assertion relaxation.
MSW7/14PASS, native5/14PASS. All14 comparisons completed in each lane.

| Lane | Screen | Width | Raw diff | Gate |
|---|---|---|---|---|
| msw | P-01 | 1440 | 0.20% | PASS |
| msw | P-01 | 390 | 2.25% | PASS |
| msw | D-36 | 1440 | 2.04% | PASS |
| msw | D-36 | 390 | 8.21% | OVER 3% |
| msw | D-37 | 1440 | 8.92% | OVER 3% |
| msw | D-37 | 390 | 7.78% | OVER 3% |
| msw | D-38 | 1440 | 2.26% | PASS |
| msw | D-38 | 390 | 0.12% | PASS |
| msw | D-39 | 1440 | 10.39% | OVER 3% |
| msw | D-39 | 390 | 11.04% | OVER 3% |
| msw | D-40 | 1440 | 0.88% | PASS |
| msw | D-40 | 390 | 0.15% | PASS |
| msw | D-41 | 1440 | 22.30% | OVER 3% |
| msw | D-41 | 390 | 18.53% | OVER 3% |
| native | P-01 | 1440 | 40.61% | OVER 3% |
| native | P-01 | 390 | 38.08% | OVER 3% |
| native | D-36 | 1440 | 2.01% | PASS |
| native | D-36 | 390 | 7.81% | OVER 3% |
| native | D-37 | 1440 | 8.94% | OVER 3% |
| native | D-37 | 390 | 7.86% | OVER 3% |
| native | D-38 | 1440 | 2.29% | PASS |
| native | D-38 | 390 | 0.12% | PASS |
| native | D-39 | 1440 | 10.41% | OVER 3% |
| native | D-39 | 390 | 11.16% | OVER 3% |
| native | D-40 | 1440 | 0.91% | PASS |
| native | D-40 | 390 | 0.15% | PASS |
| native | D-41 | 1440 | 8.50% | OVER 3% |
| native | D-41 | 390 | 25.97% | OVER 3% |

## Owner decision2026-10-21

Owner explicitly accepted P5 deviations required by spec and requested they be
listed in PR. This covers scheduled/running/turn-progress instead of approval,
automatic conversation history, emergency stop/hide controls and their layout
impact in D36/37/39/41. The seven MSW failures were disclosed (8?22% rounded).
It does NOT turn the raw pixel gates green or approve all unrelated differences.

Inspected actual D36 mobile, D39 desktop and D41 mobile app/prototype captures:
- App preserves controls required by D50/D51/REQ141 absent from prototype.
- Additional emergency action row shifts Persona/script panels vertically.
- D41 prototype still shows approval and three seed threads; app shows four
  including generated conversation, running progress and Stop instead.
- Copy wrapping and live seed log/count differences also contribute; the total
  percentages are not isolated measurements of one cause.

## Native Dashboard caveat, not part of the approval above

P01 raw38.08/40.61% compares different data: native shows9 real seeded members,
actual presence/messages and no currently qualifying discussion card; prototype
shows simulated activity/feed. Whole-page layout height consequently differs.
This is not a40% measurement of the bot card itself. P5 functional Dashboard
opening/reply/privacy/hide is proven by integration and real lifecycle browser
runs, not this empty-card parity snapshot. Native bot-card visual parity with
matched data remains unproven; keep this limitation visible in the PR. Do not
reintroduce fake Dashboard data or reopen other-phase behavior to match pixels.

Evidence logs/results: evidence/v2-550-parity. Raw failed diff images remain
under ui-parity/diffs and ui-parity/server/diffs. Local app/prototype capture
archive: D:/opchub-local/v2/550-msw-captures (native captures in e2e/.parity-out).

Remaining: integrate current remote dev changes safely, re-run gates on the
combined tree, prepare owner-review dev-to-main PR and disclose this caveat.
