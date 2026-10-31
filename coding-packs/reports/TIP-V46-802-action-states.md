# V46-802 — policy draft / payout action checkpoint

Test source **586d9010**, branch `feature/TIP-V46-802-revenue-sharing`.
Progress only, **not TIP-DONE**. No production, financial cutoff, API or seed change.

## Coverage

- Policy scenario reaches55/10/25 through public inputs, checks the actual
  whole-VND preview and captures the full page at1440/390. No save or synthetic
  financial state. The visual score does not authorize historical recalculation.
- Payout scenario presses the first director's real Chi trả action on each
  side. Prototype immediately pays15,720,000VND including the open month; app
  opens the existing ended-month confirmation and leaves money unchanged.
  This is Q-V46-802-2, not accepted equivalent behavior.
- Browser test at both widths opens the confirmation, checks actual bank
  identity, month selector, disabled unselected action and horizontal bounds.
  Escape and Close each send zero payout POSTs; the complete ledger and payout
  history remain unchanged after both cancellations and reload. Identical tests
  and assertions run on native and MSW. No eligibility claim from a cancellation
  test, and no browser-only clock manipulation of server financial eligibility.

## Results

Logs: `e2e/.parity-out/v46-802-actions-` (ignored local evidence).

| Scope | Result | Log suffix |
|---|---|---|
| Payout cancellation MSW |2/2,16.2s |`browser-msw.log` |
| Same native browser |2/2,12.7s |`browser-native.log` |
| Root lint |8/8,7cached,17.249s |`root-lint.log` |
| Root typecheck |8/8,7cached,6.444s |`root-types.log` |
| Root unit |6/6cached,2237passed +2existing skips |`root-unit.log` |
| Root depcheck |2398frontend/shared +1061server modules, no violations |`root-depcheck.log` |
| Corrected parity readiness |2PASS/2FAIL,30.0s |`parity-ready.log` |
| Source-anchored parity586d9010 |2PASS/2FAIL,30.4s, same percentages |`parity-586d9010.log` |

Browser command: `pnpm --filter @opchub/e2e exec playwright test
--project=behavior regional-revenue-payout-dialog.spec.ts`.
MSW uses production `.next-v46802-msw-build`,3000/3001. Native uses
`.next-v46802-native-build`,4730/4731 with API4732, E2E_TARGET=server,
SKIP_SEED=1 and guarded AF0 on opchub_test5432/Redis2. One worker, base config.
No native devDB seed or reset.

Parity command: `PARITY_IDS=D-V46-POL-EDIT,D-V46-GDV-PAYOUT pnpm --filter
@opchub/e2e exec playwright test --project=parity parity/parity.spec.ts`.
Same MSW builds, unchanged full-image comparison,1440/390 and3% threshold.

| State |1440 |390 | Acceptance |
|---|---:|---:|---|
| D-V46-POL-EDIT |0.670272% |1.477480% |Visual PASS |
| D-V46-GDV-PAYOUT |85.329244% |38.096884% |FAIL, financial behavior also differs |

The initial run reported3PASS/1FAIL (26.5s), with payout2.310494%/4.361954%.
Image inspection found the app dialog absent: the paused parity clock had not
completed its enter lifecycle before global freeze CSS. Those scores are **not
valid payout-state acceptance**. Scenario now advances both clocks350ms (as the
existing modal scenarios do) and requires opacity1 before capture. This is only
animation readiness, not a calendar/cutoff change. Actual images show the app
dialog versus prototype's success toast and changed balances. No mask, hidden
control, auto-confirmation, date shift, baseline edit or weakened assertion.

## Retained gates and remaining work

Production Admin builds remain72345a1e; isolated backend remainsd7e080c1.
This test-only slice changes no runtime imports, so prior application build,
financial integration and policy behavior evidence retain their exact source
scopes. Root precommit gates reran; cached unit results are explicitly cached.
The new failing parity test is retained, not skipped or called a passing gate.

Q-V46-802-2 remains open; no self-approved cutoff or one-click payout change.
Q-V46-802-4 full-integration fundraising calendar failure remains uncorrected.
Corresponding full regression after shared fixture/policy changes, final native-dev
acceptance, other open financial questions and801 gates remain.803–812 not started.
Continue safe goal work; neither a question nor this checkpoint blocks the goal.

Native AF0 seed/reset completed; base test demo restored, Redis2 cleared, pending
audit returned `[]`. Owned API18832 stopped only after command-line verification.
HOLD API28484/socket33408/worker16200 retain their30October start times and original
backend dist. No migration, real-provider call, merge or force push.
All browser/root runners are terminal; owned browser listeners are released.
