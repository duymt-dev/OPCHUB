# V46-802 — measured ledger geometry

Source **4c4eba9d**, committed/pushed. Implementation checkpoint, not TIP-DONE.
Scope is feature-local layout and
same-assertion browser coverage; no API, schema, seed, financial or payout change.

## Evidence driving the correction

Read-only browser measurement of the live prototype at1440/390 finds a ledger
content width1036/844px, fixed90px date column, and relative weights
12:12:10:12:9:10 for customer/affiliate/amount/rate/share/status. The header is24px
high with4px6px padding; body cells use6px padding and normal line height.
Rows wrap naturally:30/47px at desktop and47px in the first mobile rows.
The previous app used intrinsic max-content sizing, different proportions and
inherited line height, so rows stayed too short and the history started too high.

Keep AdminTable and constrain its owning table to available/minimum width, with
horizontal scrolling intact. The nested detail is an inline-size container;
column lengths use its actual content width rather than unsupported percentage
calculations on table columns. No fixed row/filler height. Text wraps top-aligned;
date stays90px and remaining columns share the measured proportions. Header/body
padding and title spacing match the reference. More button remains functional
and compact; bank snapshots, history dates and all ledger records remain visible.

The old broad section reset also stripped borders/padding from history rows.
Restrict it to the ledger table shell, retaining actual history separators.
No prototype code copied, masks, baseline edits, financial constants or deletion.

## Iteration evidence, not hidden failures

- Standalone geometry probe collected prototype metrics; its app login timed out.
  No app metric claimed from that failed probe. A probe-only transpilation helper
  error was fixed before collecting prototype measurements. Functional app
  verification uses the standard production Playwright harness below.
- First related browser attempt:3PASS/2FAIL. Percentage calc on table columns
  combined with intrinsic sizing expanded the table pathologically; exact-width
  assertions caught it. Inline-size containment bounded it, but percentage column
  lengths still distributed incorrectly: second attempt3PASS/2FAIL.
- Fixed actual column length resolution using container-width units and bounded
  the owning table. Related5/5 PASS,42.5s. Added an explicit table-width bound
  rather than relaxing the proportional assertion. Final compact-button styling
  is checked again on the final builds below.
- Focused sharing component suite8/8 PASS,18.30s; no financial test weakened.
- Root lint caught the component exceeding80 lines/function after adding column
  definitions. Extracted the typed columns into `revenue-ledger-columns.tsx`;
  did not suppress lint or inflate limits. Focused extracted-file lint passes.
- Intermediate parity after bounded columns:3PASS/5FAIL. Detail improved to
  3.925983%/5.406356%, but fixed outer columns exposed an inherited header line
  height that added7px when labels wrapped. Corrected normal header line height
  and bank-line gap, with an exact55px header assertion at both widths.

## Final related checks

- Production Admin builds: MSW1/1,12.998s; native1/1,11.616s, no cache.
- MSW browser5/5 PASS,37.6s. Native default history/pagination/reload2/2 PASS,
  18.3s; native functional layout/years/revoke/payout/reload3/3 PASS,24.7s.
  Same assertions in both modes: exact90px date, proportional customer column,
  bounded table,55px outer header, top-aligned wrapped text; eight→sixteen rows,
  amount/year/policy, immutable recipient bank/history, reload and no document
  overflow. All earlier functional and nested-header bounds remain unchanged.
- Final root precommit runner92555 terminal exit0: lint8/8,typecheck8/8,
  unit6/6 tasks(5cached), **2196 passed +2 existing S3 skips**; Admin622 reran.
  Depcheck2378frontend/1060server modules PASS. Full mandatory precommit command
  `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`, no bypass.

Logs: `e2e/.parity-out/v46-802-ledger-*`, specifically
`build-{msw,native}-header.log`, `browser-{msw,native}-header.log`,
`native-functional-header.log`, `precommit-header.log`, `parity-header.log`.
The earlier `precommit-final.log` passed before the last header CSS/assertion
correction and is not substituted for the final precommit run.
Build/browser commands use the isolated production modes/ports documented in
[default demo evidence](TIP-V46-802-default-demo.md), with default/functional
native scenarios seeded separately. Portal/server source/output unchanged.

## Current parity

Final eight captures: **4PASS/4FAIL**,1.6m, runner61872 exit1. Actual capture
HEAD2d509723 plus exactly the working tree committed as4c4eba9d; no masks,
baseline or3% threshold changes. Reporter retains the actual capture HEAD.
All navigation/state assertions succeeded; failed ratios remain failed.

| State |1440 |390 |
|---|---:|---:|
| Default |1.692824% PASS |3.361053% FAIL |
| Expanded north ledger/history |3.357075% FAIL |4.488970% FAIL |
| Search Miền Trung |1.251003% PASS |2.918618% PASS |
| Empty search |1.080247% PASS |6.320352% FAIL |

Expanded mobile improves from9.076522% and mobile search now passes. Do not
declare TIP acceptance: four states still exceed3%. Latest actual FAIL images
are retained; search390's old FAIL diff removed only after its real passing run.
Reference mobile detail is1920px and current image1933px, replacing the previous
large shortfall with natural row wrapping, not artificial image padding.

Next remaining layout work: compact pagination presentation and history metadata
alignment while preserving actual bank snapshots and access; mobile outer/empty
state fidelity. Do not remove useful data or an empty-state message for parity.
The separate payout-cutoff question, full integration calendar failure, shared
AF0 full regression and final native-dev acceptance remain open. No full
integration rerun solely for this isolated frontend correction. Goal remains active.

## Cleanup

All test/build handles terminal. Native payout outbox was processed by the real
own worker; audit returned `[]` before shutdown. Stopped only own API17892 and
worker14240, restored base demo on opchub_test, cleared Redis2, confirmed pending
audit `[]` again. Original API28484/socket33408/worker16200 retain30October start
times. Owned3000/3001/4730/4731/4732 listeners released. No opchub_dev reset,
held binary overwrite, migration, external-provider call, merge or force push.
