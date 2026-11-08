# TIP-V46-818 parity - D-134 / D-139

**STATUS: DONE (classified reference measurements).** Not a claim that every raw pixel assertion passed.

- Frontend implementation `6c5800b4`; backend `4f90b24e` (unchanged by the URL correction).
- Recovered native and MSW production builds after external artifact cleanup.
- Each lane: 4 harness checks passed, 8 paired captures completed; raw result 10 passed / 2 above-3% threshold, process exit1.
- All six non-audit captures are below3%. Both audit captures are classified below.
- No masks added, baseline edited, threshold relaxed, capture scope shortened or test removed.
- Owner image approval remains PR review, not an approval fabricated by the builder.

| Scenario | MSW1440 | MSW390 | Native1440 | Native390 |
|---|---:|---:|---:|---:|
| D-75 | 12.2704% | 10.5369% | 70.0631% | 67.9037% |
| P-V46-SEARCH | 0.9951% | 0.1094% | 0.8788% | 0.1115% |
| D-V46-SEARCH | 0.5063% | 0.3491% | 0.5586% | 0.4964% |
| P-01 | 1.0051% | 2.9670% | 1.0634% | 2.9683% |

## Classification

- **D-75, D-139 design addition:** the compact tag/actor/VN-date controls do not exist in the prototype. Mobile stacks them without horizontal overflow. The retained heading, export action and row layout are not redesigned.
- **D-75, native data:** append-only real login/export/action history is retained and the existing50-row first page is measured in full; the prototype has six static rows. Different content, row wrapping and full-page height/pink padding dominate the large percentage. No history was deleted or hidden to imitate the prototype.
- **D-75, MSW:** same D-139 control-height addition on the prototype-shaped fixture; both percentages are reference differences, not an unimplemented behavior.
- Other small differences: D-133 approved country flag instead of globe; live unread counts/member counts; actual recommendation type/keywords/score and onboarding state. Scoring/routing assertions remain functional tests, not pixel guesses.
- Initial exploratory native P-01 mobile had an actual proxy ECONNRESET/error state. It was not classified as acceptable data: an unchanged recheck completed6/6 and the final committed-source batch contains healthy captures in both viewports.

## Evidence

- [MSW ledger](ui-parity/v46-818/msw/ledger.json), [native ledger](ui-parity/v46-818/native/ledger.json).
- Each directory contains all eight original app/prototype/diff triples. Compare matching filenames; images are unmodified Playwright captures.
- [MSW audit1440](ui-parity/v46-818/msw/D-75-1440.app.png) / [prototype](ui-parity/v46-818/msw/D-75-1440.proto.png).
- [MSW audit390](ui-parity/v46-818/msw/D-75-390.app.png) / [prototype](ui-parity/v46-818/msw/D-75-390.proto.png).
- [Native audit1440](ui-parity/v46-818/native/D-75-1440.app.png) / [prototype](ui-parity/v46-818/native/D-75-1440.proto.png).
- [Native audit390](ui-parity/v46-818/native/D-75-390.app.png) / [prototype](ui-parity/v46-818/native/D-75-390.proto.png).

Functional evidence: audit filtering/CSV/VN dates and URL persistence after reload at1440/390, plus Portal/Admin keyboard ARIA and target routing, all pass in both lanes.
