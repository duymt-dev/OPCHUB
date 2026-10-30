# V46-802 — retained header, bank ownership and first P7 parity (PARTIAL)

Source SHA: **`1c16f9d2`**, committed and pushed. This checkpoint is not TIP-DONE.

## Implemented

- Outer Affiliate retained revenue now reads `/revenue/retained`, displays the
  affiliate-attributed amount as exact VND, and uses the v4.6 prototype label.
  It no longer reads `summary.netRevenue` or subtracts reference commissions.
- Permission-gated TanStack Query, fresh on mount, shares revenue invalidation
  with payout/director configuration. Loading is not zero; failed refresh hides
  stale success and offers retry. No new global store or dependency.
- MSW uses the same scoped response contract and existing financial lease/ledger.
  Tests cover empty state, direct/vacant attribution, source replay, late receipt,
  revoke/payout/reload, read permissions and exact amounts beyond Number precision.
- Same browser assertion in both modes: retained **3120000**, not global6720000,
  before revoke and after payout/reload. Existing year/rate/bank/history assertions
  remain intact.
- The older director browser test no longer expects bank ownership to transfer
  with a regional slot. It asserts empty bank after revocation/replacement, saves
  the new director's own bank, verifies it on reload, then verifies a vacant slot
  is empty again. Native appointment/revocation mail links still open Portal login.

## Evidence

Root precommit: **lint8/8, typecheck8/8, unit2187 passed +2 existing skips, depcheck PASS**.
Unit: Admin620, Portal418, shared724, server266, UI56, integrations103+2skips.
Six unit tasks successful, four cached. Depcheck2362 FE/shared and1054 server
modules, no violations. Final runner57043 exited0; no source changes afterward.

Focused shared retained unit **5/5**; Admin component/API/MSW HTTP **15/15**.
Browser `regional-revenue-sharing.spec.ts` **1/1 MSW +1/1 native**;
`regional-directors.spec.ts` **1/1 MSW +1/1 native**. Thus two distinct cases per
mode, not four distinct browser cases. Native uses real opchub_test/Redis2,
isolated API4732, Next dev4730/4731 and fake mailbox worker. MSW4720/4721 also
uses Next dev. This is not the production build/full E2E gate or native-dev acceptance.

Relevant ignored logs in `e2e/.parity-out/`:

- `v46-802-retained-ui-precommit-final.log`.
- `v46-802-retained-ui-msw.log`: sharing passes; first bank case fails because an
  unscoped title selector matches three banks. No assertion was relaxed: selector
  now targets the open dropdown. Final bank run below passes.
- `v46-802-retained-bank-msw-final.log`: 1/1,24.9s,exit0.
- `v46-802-retained-ui-native.log`: 1/1,20.4s,exit0.
- `v46-802-retained-bank-native.log`: 1/1,17.3s,exit0.
- `v46-802-sharing-parity.log`: two real FAILs, exit1, details below.

Early focused tests exposed test-harness mistakes (unavailable jest-dom matchers,
an unknown admin fixture ID and exact text selection on mixed text). They were
corrected to the repo's existing DOM assertions and known permission fixture;
expected amounts, 403, error/retry and precision assertions were preserved.
Initial lint also caught an inline import type; replaced with a type-only import.

## P7 first measured parity — FAIL, not waived

New registered `D-V46-GDV-SHARING` scenario measures the actual default AF0
precondition, not the optional functional revenue demo. No masks or state injection.
Production UI was unchanged between these captures and the source commit; the
later change was a test-only type import. Harness initially stamped base51ac6133;
the new rows are attributed to the committed source above, not old base code.

| Viewport | Diff | Status |
| --- | --- | --- |
| 1440 | 7.800101803374054% | FAIL |
| 390 | 16.04460216400515% | FAIL |

Both diff PNGs are retained in `reports/ui-parity/diffs/`; results and screen index
include the new state. Existing historical parity rows were not rewritten.

Visual inspection gives concrete next work:

1. Native/MSW default AF0 currently has no earned ledger, whereas prototype shows
   allocation44.88m/paid28.68m/due16.2m/retained55.92m. Q-V46-802-3 remains explicit;
   do not make UI synthesize amounts or assign pre-appointment rights to hide this.
2. Mobile sharing KPIs stack one per row (`minmax(200px,1fr)`); prototype has two
   columns. The 240px director column and 900px minimum table also push the bank
   out of the visible mobile area. Fix layout against the actual prototype.
3. Desktop retained caption color/baseline, search icon, bank-number grouping,
   row/header geometry and the additional former-recipient access affect parity.
   Preserve required historical access while correcting presentation.
4. Outer legacy commission KPIs/counts and shell differences are still visible;
   track the assigned803/later scope rather than calling this a final parity PASS.

## Native HOLD and next gate

Isolated server build succeeded into `dist-v46802` only. No migration or dev-data
reset this checkpoint. Both worker instances used fake external providers and
test Redis2; unrelated stale bot jobs logged missing AI configuration, not a
claimed worker regression PASS. Revenue pending readback was empty. The real
payout was1680001 for four shares, then test DB was reseeded between cases.

All six owned temporary services were stopped and handles reaped; ports4720/4721/
4730/4731/4732 released. Base demo restored on test DB with the pending-outbox
guard. Original API28484/socket33408/worker16200 keep their 30/10 start times.
Generated Next dev AGENTS files were removed after those dev servers stopped.

Next: correct the measured P7 layout and coherent default financial data, expand
related-state parity, then full integration/build/MSW regression and native-dev
acceptance. Q1/2 financial acceptance questions remain documented, not whole-goal
blockers. Earlier 801 FAILs/pending acceptance are unchanged.
