# V46-802 — expanded ledger layout correction

Implementation checkpoint, **not TIP-DONE**. Source: `ff1deb38` on
base `4a25a01d`. No financial, seed, API, schema or payout eligibility changes.

## What changed

- Expanded outer cell no longer adds a second inset. Detail padding now matches
  the reference's14px top/16px right/16px bottom/40px left.
- The pale detail surface is derived from theme primary/background tokens
  instead of the much stronger primary-background token. No global theme change.
- Nested ledger headers no longer inherit the parent55px height or opaque
  background; the nested container no longer inherits the900px minimum width.
- All empty/error states, ledger/history columns, immutable bank details and
  former-beneficiary access remain. No fixture data or control is hidden.
- Existing1440/390 browser cases now also expand/collapse, verify four actual
  revenue-demo records and exact amount, padding/header geometry, history access,
  and absence of document overflow. Assertions are identical across modes.

## Verified checks

- MSW related behavior **3/3**,23.8s, runner76645 terminal exit0: both responsive
  cases plus years/revoke/month-payout/reload flow. Production Next, not dev.
- Admin production MSW build **1/1,0 cached**,19.216s, runner95361 exit0.
  Command: `NEXT_DIST_DIR=.next-v46802-msw-build NEXT_PUBLIC_API_MOCKING=msw
  NEXT_PUBLIC_API_URL=/v1 NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
  API_PROXY_URL='' pnpm build --filter=@opchub/admin --force --env-mode=loose`.
- Isolated native-mode Admin +Portal production builds **2/2,0 cached**,
  2m24.36s, runner34353 exit0. Same root build command with both app filters and
  `--concurrency=1`, `NEXT_DIST_DIR=.next-v46802-native-build`, mocking`off`,
  Portal URL`http://localhost:4730`, API proxy`http://localhost:4732`.
  Building does not start the native API or touch DB; these outputs are ready
  for the new same-assertion native browser run after integration finishes.
- Root precommit runner86171 terminal exit0: lint8/8, typecheck8/8, unit6/6
  task groups (5 cached), **2187 passed +2 existing S3 skips**; Admin620 reran,
  including sharing component6/6. Depcheck2365/1057 modules PASS.

Runtime logs: `e2e/.parity-out/v46-802-detail-{msw,build,native-build,
precommit,parity}.log`.

## Actual parity, not an improvement claim

Eight fresh captures on default AF0, runner73333 terminal exit1:
**2 passed /6 image failures**,2.9min. All navigation/state assertions succeeded.
Capture HEAD`4a25a01d` with this CSS in the working tree; results preserve the
actual capture HEAD. Production Admin was rebuilt with exactly this CSS.

| State | 1440 | 390 |
|---|---:|---:|
| Default | 6.503844% FAIL | 8.290283% FAIL |
| Expanded north ledger/history | 23.052057% FAIL | 22.786458% FAIL |
| Search Miền Trung | 1.453858% PASS | 7.814347% FAIL |
| Empty search | 1.189892% PASS | 10.747790% FAIL |

The expanded whole-image score is **worse** than21.476849%/21.715411%, despite
corrected local geometry/surface. The app still has an empty ledger/history and
is shorter than the populated reference; correcting header height does not
supply missing history. Retain the failure and actual diff, not the old lower
number. Other six captures are pixel-identical to the prior checkpoint.
No masks, threshold relaxation, reference edits or blanket financial exception.

## Remaining and retained scope

Full native integration at5a3ca36b is still live on38636. Backend unchanged by
this CSS: continue that original runner, no competing native seed/API/worker.
Do not use the earlier native layout2/2 as proof of these new assertions.
Same-assertion native run remains required after the runner releases test DB.

Full MSW351/4-existing-skips at44994da5 remains broad regression evidence for
unchanged scopes, supplemented here by all affected sharing behavior cases.
This isolated feature CSS does not alter another feature, shared component or
runtime contract; a new full MSW run is not needed solely for this scoped change.
Unchanged server build and Portal MSW output retain prior source attribution.

Next substantive gap is the default financial demo: D-119 explicitly allows
regeneration before go-live. A coherent replacement must include actual first
receipts, account/referral chronology, historical appointments and payout
receipts, with matching native/MSW seeds. This is not permission to assign old
runtime payments to today's incumbent or put prototype totals in UI constants.
Q-V46-802-3 records the existing mismatch, not a requirement to wait for approval
of every demo fixture. Expanded/payout/history fidelity remains unaccepted.

Owned3000/3001 test listeners released. Original native HOLD and test DB remain
untouched by this layout slice; no merge or force push.
