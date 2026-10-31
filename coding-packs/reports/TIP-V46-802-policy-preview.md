# V46-802 — configured policy matrices checkpoint

Source **72345a1e**, on `feature/TIP-V46-802-revenue-sharing`, based on
12f2d9e0. Progress checkpoint, **not TIP-DONE**.

## Implemented — REQ-617 / D-118 / D-119

- Policy page now shows the customer-year allocation and all three configured
  plan prices/splits, rather than the superseded direct-affiliate payout rules.
  Legacy default/fundraising percentages remain registered and are sent back
  unchanged. D-91's editable terms dialog and cookie duration remain available.
- Draft percentages update the preview without a PUT. Rates and whole-VND splits
  use shared financial functions; no production price/rate defaults. The actual
  floor year is shown (63/7/21 reaches year7), including constant/zero policies,
  early floors and the bounded101-year maximum schedule. A free plan previews0,
  without creating a financial receipt. Historical ledger/payout data is untouched.
- Price loading/error/retry and invalid-policy feedback are explicit. Native
  semantic matrices have keyboard-focusable horizontal scroll regions; the
  mobile form keeps two columns and no page overflow. Components/math/types/CSS
  remain separated, with tests outside production files and no new dependency.
- Measured AntD label line boxes, percent-input padding and cookie-control
  minimum height now match the actual prototype layout, without fixed row
  heights, clipping, negative spacers or hiding required controls.
- D-84-POL now waits for the visible loaded plan matrix on both sides before
  capture. Network idle alone was insufficient: a read-only DOM probe found the
  policy skeleton after the old readiness steps, while screenshot dimensions
  could be measured before the larger form painted. No global harness,
  reference, viewport, threshold, mask or timeout was changed.

803 still owns its broader reference-only commission actions/list migration;
its policy-page acceptance should reuse/recheck this implementation.

## Evidence

Ignored logs are under `e2e/.parity-out/v46-802-preview-`.

| Scope | Result | Log suffix |
|---|---|---|
| Four focused math/form/preview suites |34/34,54.08s; later covered by full Admin unit run |`unit.log` |
| Final MSW browser |6/6,34.9s |`browser-msw-measured.log` |
| Final native browser |5/5,27.5s plus1/1,14.1s |`browser-native-measured.log`, `browser-native-admin-measured.log` |
| Final Admin production MSW build |1/1,0cached,18.135s |`build-msw-measured.log` |
| Final Admin production native build |1/1,0cached,24.925s |`build-native-measured.log` |
| D-84-POL default state |2/2,26.4s before commit; source-anchored rerun below |`parity-measured.log` |
| Source-anchored parity at72345a1e |2/2,15.6s, same percentages |`parity-72345a1e.log` |

Browser command: `pnpm --filter @opchub/e2e exec playwright test --project=behavior
affiliate-policy-responsive.spec.ts affiliate-ui-debt-policy.spec.ts
regional-revenue-policy.spec.ts admin-affiliate.spec.ts --grep policy`.
For native, run the first three files together, then `admin-affiliate.spec.ts
--grep 'policy saves'`. MSW uses3000/3001 and `.next-v46802-msw-build`; native
uses4730/4731, API4732 and `.next-v46802-native-build`, with E2E_TARGET=server,
SERVER_PORTAL_PORT/SERVER_ADMIN_PORT matching and SKIP_SEED=1. Both use one worker.
Parity command: `PARITY_IDS=D-84-POL pnpm --filter @opchub/e2e exec playwright
test --project=parity parity/parity.spec.ts` with MSW production outputs.

The same six browser tests/assertions run in both modes: save/validation,
terms/F5, cookie persistence, geometry1440/390 plus360, keyboard table scrolling,
draft preview/no writes, live dashboard refresh and unchanged complete historical
ledger/history. Native runs use guarded AF0 on opchub_test5432/Redis2 and
SKIP_SEED=1; the admin-save test runs last to avoid leaking its cookie45 setting
into tests whose prerequisite is cookie30. No mode-dependent assertion.

Final mandatory root precommit result: lint/typecheck/unit **2237passed
+2existing skips**/depcheck PASS. Lint8/8 (6cached),50.153s; typecheck8/8
(6cached),8.432s; unit6/6 (5cached),2m49.765s, including Admin655/133files.
Other package results: shared739,Portal418,server266,UI56,integrations103
+2existing S3 skips. Depcheck2396frontend/1061server modules PASS. Final runner
55422 exited0 with source stable; code was committed/pushed immediately afterward.
Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`, sequentially;
logs `commit-{lint,types,unit,deps}.log`. Existing image/jsdom warnings and the
two existing S3 skips are not claimed as new failures or silently removed.

## Visual evidence and failed iterations

Final complete, unmasked D-84-POL captures:

| Viewport | Difference | Result |
|---|---:|---|
|1440|0.40944567354965583%|PASS|
|390|0.8465086937665102%|PASS|

Both final images were visually inspected, including rules and save/terms actions.
The post-commit rerun records72345a1e directly in results.json; no hand-edited SHA.
Obsolete FAIL diffs were removed by the existing reporter only after passing
captures. Initial worktree results5.390054%/9.016152% were followed by a
skeleton-sized capture13.603276%/12.670294%; explicit loaded-state readiness
gave3.298840%/6.244505%. Final measured layout corrections produced the PASS
above. All use the unchanged3% threshold; none of these failures was waived.
The original parent-policy34.790233%/16.312345% FAIL remains in the prior report.

Initial lint/typecheck found untyped AntD form reads, incomplete query mocks and
an optional CSS class; fixed before successful builds. Browser geometry checks
were corrected to measure the60px outer percent control and the visible hint's
6px text gap (not its padded box). The final assertions pass unchanged in both
modes. No feature test was removed, skipped, retried or made mode-dependent.

## Retained gates and remaining work

- Backend/shared/API/DB logic is unchanged from d7e080c1: its native11/11,
  shared104/104 and isolated server build remain applicable to that scope.
  This frontend checkpoint does not claim a new full integration run.
- Prior P7 eight-state PASS captures remain at f147809a; this is new evidence
  for the default policy page only, not all policy/payout substates.
- Remaining802: payout/policy-substate parity, full corresponding regression,
  the documented calendar integration failure Q-V46-802-4, and native-dev final
  acceptance. No completion report or TIP-DONE;801 and803–812 are not closed.
- Native base demo restored, Redis2 flushed, pending outbox `[]`. Owned API32128
  stopped after command-line verification; original API28484/socket33408/
  worker16200 and their start times remain unchanged. No held binary overwrite,
  dev DB mutation, external provider call, merge or push to main.
- `gh auth status` still reports no logged-in host; keep the existing stacked
  compare link in progress. No token discovery or owner merge was attempted.
