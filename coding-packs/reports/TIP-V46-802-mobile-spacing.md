# V46-802 — outer spacing, native CSS and visible empty feedback

Source **f147809a**, committed/pushed. Implementation checkpoint, not TIP-DONE.
No API, DB, financial data or policy change.

## Measured correction

Read-only production/prototype probes at1440/390 found:

- Search and policy belong to one group with12px gap; the app put both in the
  outer14px stack. Group them without negative positioning or filler heights.
- Director identity uses normal line height with2px between its17px name and
  32px wrapped metadata. Bank uses the same normal typography and2px gap. Keep
  natural wrapping; actual default rows become72px rather than72.78125px.
- Native browser then exposed a real style-order bug: AntD CSS overrode the
  table's13px font with14px, producing74px rows. A live native DOM probe verified
  the computed font/line sizes. Increased feature-local selector specificity;
  retained the exact72px assertion and added explicit13px verification. No
  mode-dependent expectations, font injection or assertion relaxation.
- Empty feedback remains a complete visible live status in the actual empty
  row. It uses natural12px typography and the secondary-text token; remove only
  redundant cell vertical padding. No clipping, zero/fixed height, offscreen text,
  overlay, image mask, baseline edit or removal of a required control/message.

Browser checks now cover search/policy12px separation, actual row geometry,
header/column bounds, immutable bank and ledger contents, keyboard pagination,
empty status readability/access, URL-preserving reload, clearing/recovery and no
document overflow at both widths. Separate table tests prove empty status and
recovery without fabricated rows or writes.

## Retained intermediate results

- Initial focused15/15 PASS. First geometry correction: MSW5/5 PASS; native
  default0/2 because actual74px rows failed the new72px assertion. The native
  functional layout/financial3/3 passed separately; do not merge that into5/5.
- Intermediate parity7PASS/1FAIL: only empty390 failed at4.887878%. Keep that
  failure; it motivated compact **visible** empty feedback, not hiding it.
- Initial root precommit57511 passed2203+2existing skips before the native-font
  and empty-feedback fixes. It is not substituted for the final precommit run.

## Final related checks

- Component suites:17/17 across3files,14.18s (`mobile-unit-final.log`).
- Final Admin production builds: MSW1/1,17.643s; native1/1,17.744s, no cache.
- Same-assertion browser: MSW5/5,35.9s; native default2/2,12.4s plus functional
  layout/years/revoke/payout/reload3/3,20.6s. Final native checks retain the exact
  row size/font assertion and verify complete readable empty feedback.
- Final mandatory root precommit85115 terminal exit0: `pnpm lint && pnpm
  typecheck && pnpm test && pnpm depcheck` PASS. Lint8/8,typecheck8/8 (6cached
  each); unit6/6 (5cached), **2205passed +2existing S3 skips**. Admin631 across
  129files reran in167.63s; shared731,Portal418,server266,UI56,integrations103.
  Depcheck2382frontend/1060server modules PASS. No source edits during this final
  gate; committed immediately with normal formatting/commit hooks, then pushed.

Logs: `e2e/.parity-out/v46-802-mobile-{unit,build-msw,build-native,browser-msw,
browser-native,native-functional,parity,precommit}-final.log`.
Production output/port isolation follows the prior default-demo report. Portal
and server runtime source/output are unchanged; no held binary was rebuilt.

## Final measured P7 parity

Runner13759 terminal exit0: **8/8 PASS**,46.0s. Captured HEADf500fd9b plus the
working tree committed asf147809a. Evidence retains the actual capture HEAD.
No threshold, reference, viewport, mask or comparison-harness changes.

| State |1440 |390 |
|---|---:|---:|
| Default |0.749769% |1.029613% |
| Expanded ledger/history |1.165172% |1.385576% |
| Search Miền Trung |0.628858% |1.146357% |
| Empty search |0.582870% |2.807833% |

All8 remain below3%. Reporter removes only the3 now-passing mobile FAIL images.
The app still shows real bank/receipt data and empty feedback absent from the
prototype; passing ratios are actual full-image results, not semantic waivers.

## Completion audit — next required implementation, not a new blocker

GOAL step2 and REQ-617/D-119 explicitly require **three configurable sharing
parameters in Chính sách**. Current code has DB fields and the validated
`revenueSharingPolicySchema` consumed by ledger/dashboard calculations, but:

- `packages/shared/src/api-domains/affiliate.ts:affiliatePolicySchema` exposes
  only defaultRate/cookieDays/fundraisingRate/terms.
- `PolicyRepository` GET/select/locked update omit yearOneRate/annualDecrease/
  minimumRate; `AdminAffiliatePolicyController` uses that old contract.
- Admin `PolicyFields`/`PolicyForm` have no controls for these three values.

Thus configuring the three sharing parameters through Admin/API/MSW is still
**missing**, not covered by read-only rate display or existing math tests. This
is authorized by D-119 and belongs to802. Implement it next with actual update,
permission/audit/validation, snapshot semantics, MSW/native tests and policy-state
parity. Do not defer it merely because803 owns the broader policy-page redesign
and reference-only commission migration. Extend exact TIP file scope before code.

Payout-state parity/cutoff, the recorded fundraising calendar failure, shared-AF0
full regression and native-dev/final acceptance also remain. These8 P7 captures
do not prove the whole TIP or goal complete. No full integration/E2E rerun for
each CSS edit; run the required whole gate after the remaining changes settle.

## Operational notes

Initial native build completed but its cache write warned about disk space. D:
had19054592 free bytes. Safely removed7 old disposable `.turbo/cache/*.tar.zst`
archives (>500MiB, older than1hour) after verifying exact workspace paths/no
reparse point. Reclaimed4760305708 bytes; source, DB, held outputs and services
untouched. Final two builds passed without that warning.

`gh auth status` still reports no logged-in host; keep the stacked compare link,
do not extract credentials or block the goal.

Real own worker drained native payout events; audited `[]` before stopping only
verified own API21760/worker21380. Restored opchub_test base demo, cleared Redis2,
rechecked `[]`; owned3000/3001/4730/4731/4732 listeners released. Earlier owned
worker920 also stopped after its successful drain. Original API28484/socket33408/
worker16200 retain30October start times. No devDB reset or held binary overwrite.
All handles terminal/reaped; none need polling or restarting.
