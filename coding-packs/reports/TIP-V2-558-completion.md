# TIP-V2-558 — P4 Affiliate Admin UI pixel debt, native acceptance

**STATUS:** DONE for the TIP scope. Three of eight debts fixed. Five states still
fail parity because of data or required features; they are recorded as deviations
pending owner review, not pixel PASS.
Branch `feature/TIP-V2-558-p4-ui-debt` from `dev` 959ce399; final source `fb79c54c`.

## Commits

| SHA | Change |
|---|---|
| 646161a0, f48ee83d | TIP + task graph row |
| 15852e6d | TD-08 selected filter paint without thumb motion; toolbar CSV/segmented height over AntD |
| fd90e134 | TD-06/07 commission pager size select on one mobile line |
| 118d5100 | TD-04/05 compact mobile empty guidance, white mobile card header |
| eed335ac | TD-03 policy type scale/rhythm over AntD |
| fb79c54c | TD-01 agents table fits its 1440 card (no overflow/clipped status) |
| 84f15392 | Debt register, bugs, deviations, parity results + evidence |

Shared root cause: on hard navigation AntD CSS-in-JS is injected **after** CSS
Modules, so equal-specificity module rules silently lost (CSV button 40px instead of
32px, rounded segmented items, 14px policy labels, grey mobile header). Fixed
rules are scoped so they win by specificity, not by `!important` or load order.
TD-08 itself: rc-segmented adds `item-selected` only after its thumb motion ends,
so with the parity clock paused the chosen filter stayed white; now painted from the
checked radio and the sliding thumb is hidden.

## Native parity — 3%, pixelmatch 0.1, no mask (raw: evidence/v2-558/final-parity-both-lanes.json)

Native: API 4020 / socket 4021 / worker / Admin 3282 / Portal 3280 on opchub_dev, Redis 1.
MSW: Admin 3381 / Portal 3380. **Both lanes 29/34** (f394dc5 was 27/34 MSW).

| State · viewport | f394dc5 (MSW) | Native | MSW | Result |
|---|---:|---:|---:|---|
| D-84-COM-CANCELLED 390 | 5.28% | **1.82%** | 1.82% | PASS (TD-06 FIXED) |
| D-84-COM-CANCELLED-MENU 390 | 4.73% | **2.45%** | 2.49% | PASS (TD-07 FIXED) |
| D-84-COM-RECORDED/PAID (+MENU) 1440/390, TD-08 | 6 paint assertions red | 1.25–1.72%, 6/6 paint pass | same | PASS (TD-08 FIXED) |
| D-84-COM-EMPTY 390 | 7.72% | 3.40% | 3.40% | FAIL → DV-P4-558-3 pending |
| D-84-AFF-EMPTY 390 | 6.50% | 3.62% | 3.62% | FAIL → DV-P4-558-4 pending |
| D-84-POL 390 | 16.60% | 13.70% | 13.70% | FAIL → DV-P4-558-2 pending |
| D-84-AFF 1440 | 24.14% | 24.21% | 24.19% | FAIL → DV-P4-558-1 pending |
| D-84-AFF 390 | 27.69% | 27.69% | 27.69% | FAIL → DV-P4-558-1 pending |

The other 26 D-84/D-85 images stay ≤ 3% in both lanes (largest native D-84 390
2.72%, previously 1.12% MSW; still PASS). The native baseline on dev before any
change was 13/34 with 12 paint assertion failures
(`evidence/v2-558/baseline-native-parity.log`).

Why the five remain: D-84-AFF compares 62 real automatic agents (AF-R01) with six
prototype rows. About 9.6 points of D-84-POL 390 are the SRS-required editable terms
textarea below where the prototype ends. The empty-state residue is the prototype's
broken header labels spilling outside the card, which DV-P4-404-5 forbids recreating.
No data was faked, no agents were hidden, no terms were hidden, no mask was used.

## Behavior tests (dedicated, native + MSW, same assertions)

`e2e/behavior/affiliate-ui-debt-{commissions,agents,policy}.spec.ts` plus
`helpers/affiliate-empty.ts`: **13 cases**. Each first ran on the unfixed native
build and failed: paint white/transparent, CSV 40px, pager 76px tall, empty card
54/60px, mobile header rgb(250), policy label 14/13px and 49px stack, agents
overflow 9px with 20 clipped cells. After the fixes all pass. Logs are in
`evidence/v2-558/td0*-before|after-native.log`. Every test also checks the related
business constraint: all filters and counts, terminal rows, editable terms and
required validation, 62 agents with ten per page, empty guidance, no horizontal scroll.

## Regression and gates

- Native Affiliate/RBAC (same 22 files as the P4 52 suite): **52/52** (5.9 min),
  `evidence/v2-558/regression-52-native.log`.
- MSW same 52 + 13 new: **65/65** (2.1 min), `regression-msw.log`. One earlier MSW
  attempt failed 54/65 because the MSW Admin build lacked `NEXT_PUBLIC_PORTAL_URL`,
  so the affiliate bridge returned 503 on login. The build was corrected and the
  suite rerun; that failed log was overwritten and is not claimed as a product
  result.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`: exit 0, Admin 451
  and Portal 317 unit tests, depcheck has no violations (`gates.log`).
- All touched FE files stay ≤ 400 lines (the largest CSS module is 264 lines).

## Native HOLD

The native stack was stopped at session start. It was restarted from current source
on the release ports. After measuring: `seed`, `seed:demo --affiliate` and
`flush:dev-cache` all exit 0. API health, Portal login and Admin login return 200,
socket 4021 is listening, and the worker is running (`native-health.txt`). Services
are left running.

## Deviations from TIP / open items

- Edited `affiliate-table-columns.tsx` (widths only). It is in the TIP's allowed
  component list. No API, DTO, backend, DB, seed or MSW handler change.
- DV-P4-558-1..4 need an owner decision. Option (b) from planning (a separate
  agents state with prototype-matched data) was not chosen by the owner and is
  not implemented.
- Not integrated into `main`. Integration target is `dev` only.
