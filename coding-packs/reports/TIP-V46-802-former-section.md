# V46-802 — contextual former-beneficiary access

Implementation checkpoint, not TIP-DONE. Source **b65ba6f7**, committed/pushed.
Scope: Admin revenue-sharing UI/hook and browser tests;
no database, seed, shared/runtime contract or financial calculation change.

## Correction

The optional former-beneficiary section previously always added a separate row,
even when the endpoint had no former beneficiary. The UI now requests the first
bounded page on entry (only with `affiliate.view`). A successful empty response
omits the optional section. Pending/error states remain accessible; an opened
section stays open even if retry returns empty. Error retry and pagination are
unchanged. Ledger/history remains lazy until a beneficiary is expanded.

This is data-dependent rendering, not CSS hiding or deletion of a prototype
control. Actual former beneficiaries reappear after revocation/cache invalidation;
retained debt, original recipient bank, payout and reload remain available.
No search-specific shortcut, screenshot-mode branch or financial data edit.

## Related checks

- Focused component suite8/8 PASS,13.11s: existing policy/search/readonly/payout
  behavior, former discovery with lazy detail, confirmed-empty result followed by
  invalidation, lookup failure/retry, and no request without view permission.
- Native default history/pagination/reload at1440/390:2/2 PASS,25.6s.
- Native functional layout at1440/390 and years/revoke/payout/reload:3/3 PASS,
  32.7s. Same browser assertions as MSW, production Next and isolated native API.
- Admin production builds: MSW1/1 PASS20.518s; native1/1 PASS33.54s.
  Portal/server binaries unchanged and retain prior source attribution.
- MSW default/layout/financial browser5/5 PASS,1.1m, runner62313 terminal exit0.
- Root precommit final runner91075 terminal exit0: lint8/8,typecheck8/8,
  unit6/6(all cached on final run), **2196 passed +2 existing S3 skips**.
  Admin622 reran on first root pass51043; final rerun includes the last E2E
  contract update. Depcheck2376frontend/1060server modules, no violations.

Initial failures are retained: component test used the wrong empty-state copy
(7pass/1fail), corrected to existing exact copy; first build caught optional CSS
class typing, fixed before final build. First MSW related run3pass/2fail because
the layout cases still asserted an unconditional former toggle for an empty
dataset. Updated both modes to the explicit contextual contract; the financial
flow still requires visible access after actual revocation, retained bank/payout
and reload. No weakened financial/geometry assertion or mode-dependent branch.

Logs: `e2e/.parity-out/v46-802-former-*`, specifically `precommit-final.log`,
`msw-browser-final.log`, `native-default.log`, `native-functional.log`,
`unit-final.log`, `msw-build-final.log`, `native-build.log`, `parity.log`.
Commands retain the production output/port isolation in the
[default demo report](TIP-V46-802-default-demo.md); native default and functional
datasets seeded separately. Root command remains lint/typecheck/test/depcheck;
no hook bypass or test-count reduction.

## Measured parity, including regression

Runner17827 terminal exit1: **3PASS/5FAIL**,eight captures,1.7m. Unchanged3%
threshold, no masks/prototype edits. Capture HEAD2de80624 with exactly the UI
working tree subsequently committed as b65ba6f7; retain actual capture SHA.

| State |1440 |390 |
|---|---:|---:|
| Default |1.720910% PASS |4.045606% FAIL |
| Expanded north ledger/history |4.107719% FAIL |9.076522% FAIL |
| Search Miền Trung |1.270525% PASS |3.138132% FAIL |
| Empty search |1.100231% PASS |6.328609% FAIL |

Desktop default now passes; old FAIL diff removed by reporter after actual PASS.
Expanded mobile is **worse** than6.682425%, despite the other improvements.
Do not report all-state improvement or reuse the previous smaller result.
The remaining expanded ledger has visibly different wrapping/row heights and
history details; removing an unrelated empty section does not fix those gaps.
The prototype expanded image is1920px tall, app shorter; blank comparison area
is part of the real FAIL, not grounds to pad/crop/mask. Next inspect actual ledger
column geometry and wrapping, preserving recipient bank and functional pagination.
Legacy parent Affiliate summary/count differences remain visible and are not
overwritten with screenshot constants in this802 slice.

## Safety

Native payout completed through own worker; pending802 outbox audit returned `[]`.
Stopped only own API33076/worker15052, restored test base, cleared Redis2 and
confirmed pending `[]` again. Original API28484/socket33408/worker16200 retain
30October start times. Owned3000/3001/4730/4731/4732 listeners released.
No devDB reset, held dist overwrite, migration, external-provider call or merge.
All test/build handles terminal; no runner needs polling or restarting.

## Remaining acceptance

Previous full integration remains FAIL on the separate fundraising month-overflow
defect (Q-V46-802-4). Shared default-fixture change from d880150b still requires
corresponding full regression at final gate. Q1/Q2, required remaining UI states,
native-dev acceptance and801 acceptance remain open. No new full integration is
needed merely for this scoped frontend change; no full gate rerun after each edit.
