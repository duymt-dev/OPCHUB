# V46-802 — remaining-count pagination and history layout

Source **88ceb8e4**, committed/pushed. Implementation checkpoint, not TIP-DONE.
No API, schema, seed, financial-policy
or payout-date change; this is an Admin sharing presentation/accessibility slice.

## Implementation

- Pass the director's existing exact receipt count into its detail. Subtract all
  loaded rows with BigInt, not Number; the load-more control displays the actual
  remaining count. The cursor remains authoritative: a stale exhausted count
  does not hide a real next page, and a stale large count cannot invent one.
- Keep the pagination control keyboard-operable, with a stable accessible name
  and explicit `aria-busy`. No hardcoded41/33 counts in production code.
- Present immutable payout bank metadata between period/date and amount. Keep
  full holder/bank/account text and wrap long values rather than truncate it.
  Horizontal table scrolling still makes the entire destination accessible.
- Read-only prototype geometry reveals6px between each ledger row and between
  header/body, in addition to30/47px natural row heights. Translate that to
  table border spacing and top separators. Cancel only the table's duplicate
  outer spacing, because the section already owns those gaps. Collapse the
  empty AntD measurement row's layout contribution while retaining its cells
  for column measurement; no business row/control is hidden or removed.
- Add separate component tests and strengthen the same browser test used in
  both modes: actual6px gaps, full bank identity/alignment/access, keyboard
  pagination41→33,8→16 records and reload to8. Prior exact width/column bounds,
  policy/year/amount checks remain unchanged.

## Iterations retained, not relabeled green

- Initial focused component run14/14 PASS. Initial Admin MSW build failed strict
  optional-property typing on the CSS-module class; explicit empty fallback
  corrected it, no compiler relaxation.
- Initial MSW browser5/5 PASS; native default1PASS/1FAIL. Its snapshot showed the
  correct33-count control named `loading + 33 khoản khác`: AntD spinner affected
  the accessible name. Fixed the production control, retained the exact browser
  assertion and added an explicit completed `aria-busy=false` assertion plus a
  deferred-response unit test. Did not add retries or increase timeouts.
- That test first used an API outside the configured TS lib, so both builds
  failed typechecking. Replaced it with a typed standard Promise; did not change
  tsconfig or exclude tests. Focused15/15 passed before the compatibility edit;
  final root unit run includes the corrected test (7 detail +8 tab tests).
- Initial eight-state parity4PASS/4FAIL. Expanded regressed to
  **5.421381%/5.831597%** when history and the pagination control became compact:
  that exposed the missing row gaps previously offset by extra history height.
  Keep this failure, not an improvement claim for the intermediate layout.
- First table-spacing browser checks caught12px instead of6px across the hidden
  measurement row: MSW3PASS/2FAIL; native default0PASS/2FAIL. Corrected its layout
  contribution, keeping the exact6px assertions and all column bounds.

## Final checks and parity

- Final production Admin builds MSW1/1,25.464s and native1/1,27.051s, no cache.
  These are the `build-{msw,native}-gap.log` outputs, not intermediate builds.
- Final MSW related browser5/5 PASS,48.6s. Native default2/2 PASS,31.0s;
  functional layout/years/revoke/payout/reload3/3 PASS,22.7s. Same assertions at
  both widths and in both modes, including completed loading state and exact
  inter-row gaps. Commands/scenario isolation follow the prior default-demo
  report; native AF0 and functional revenue seeds are separate.
- Final root precommit runner68979 terminal exit0: `pnpm lint && pnpm typecheck
  && pnpm test && pnpm depcheck` PASS. Lint8/8 and typecheck8/8 (7cached each),
  unit6/6 (5cached): **2203passed +2existing S3 skips**, including rerun Admin629
  across128files,206.06s. Shared731,Portal418,server266,UI56,integrations103.
  Depcheck2379frontend/1060server modules PASS. Log `precommit-gap.log`.
  No source edits during this final gate; prior precommit outputs are not
  substituted for the final table-spacing correction. Source committed
  immediately after the gate, with normal formatting/commit hooks, then pushed.

Final unchanged eight-state parity: **5PASS/3FAIL**,1.7m, runner86952 exit1.
Captured HEAD699d8ffb plus the source changes committed as88ceb8e4. Keep that actual
capture HEAD in generated results; no reference edits, masks or threshold change.

| State |1440 |390 |
|---|---:|---:|
| Default |1.692824% PASS |3.361053% FAIL |
| Expanded north ledger/history |2.687766% PASS |3.752962% FAIL |
| Search Miền Trung |1.251003% PASS |2.918618% PASS |
| Empty search |1.080247% PASS |6.320352% FAIL |

Expanded desktop now passes and mobile improves from4.488970% to3.752962%,
but is not accepted. Reporter removes only the now-passing desktop detail diff;
all three current FAIL images remain. Three mobile states still exceed3%.
Next inspect mobile outer rule/table spacing and empty-state fidelity without
removing bank data or the required empty message. Do not distort real payout
dates or commission totals to match a reference illustration.

Logs under `e2e/.parity-out/v46-802-history-*`: `focused-final.log`,
`build-{msw,native}-gap.log`, `browser-{msw,native}-gap.log`,
`native-functional.log`, `parity-final.log`, and final precommit evidence below.

## Native cleanup

Real own worker processed payout outbox; audit returned `[]`. Stopped only own
API22184/worker22136 after command-line verification, restored opchub_test base
demo, cleared Redis2 and rechecked pending `[]`. Owned3000/3001/4730/4731/4732
listeners released. Held API28484/socket33408/worker16200 retain their original
30October start times; no opchub_dev reset, held binary overwrite or provider call.
All runner handles are terminal/reaped; none need polling or restarting.

## Remaining gates

Unchanged server/Portal runtime retains source-attributed evidence in earlier
reports; no full integration/regression rerun just for each CSS edit. The native
full integration calendar failure, corresponding shared-AF0 full MSW regression,
payout-cutoff question and final native-dev acceptance remain open. See
[full gates](TIP-V46-802-full-gates.md). Goal remains active; questions do not
block implementation and this checkpoint does not accept801 or802.
