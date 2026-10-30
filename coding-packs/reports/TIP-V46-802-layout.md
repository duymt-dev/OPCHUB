# V46-802 — responsive sharing layout evidence

Status: implementation checkpoint, **not TIP completion**. Source: `31fb5817`.
Base `4e83620c`; previous sharing UI `1c16f9d2`. No backend, schema, policy,
financial seed, API contract or payout eligibility change.

## Changes

- Sharing KPIs: three equal columns on desktop, two on mobile; no hidden card.
- Responsive director/bank column widths; bank numbers grouped with the existing
  display formatter only. Stored and payout destination values remain unchanged.
- Compact identity line height, 55px table header, decorative header separators
  removed, search icon placed above AntD input stacking context.
- Retained caption uses the tertiary text token on desktop as on mobile.
- Existing unit assertion checks grouped bank text. New behavior suite checks
  both widths, financial value, grid geometry, horizontal bank access, URL search,
  filtering, no document overflow and access to former beneficiaries.

## Checks

- Focused Admin component suite: **6/6** (`vitest run
  src/features/affiliate/components/revenue-sharing-tab.spec.tsx`).
- Root `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`: **PASS**, runner97133 exit0: lint8/8, typecheck8/8, unit6/6 tasks
  (4 cached), **2187 passed +2 existing S3 skips**: Admin620, Portal418,
  shared724, server266, UI56, integrations103. Depcheck2364/1054 modules pass.
- MSW: `playwright test --project=behavior behavior/regional-revenue-layout.spec.ts
  behavior/regional-revenue-sharing.spec.ts`: **3/3**, 25.7s, runner48156 exit0.
  Includes the existing years/revoke/payout/reload flow, unchanged assertions.
- Native: same new layout file and assertions, server config, **2/2**, 31.5s,
  runner53191 exit0. Isolated API4732 uses existing `dist-v46802`, testDB5432,
  Redis2, fake providers; Next dev4730/4731 with mocking off. `SKIP_SEED=1`,
  explicit guarded common revenue scenario seeded on `opchub_test` only.
- Native financial flow at `1c16f9d2` remains prior evidence, not a fresh run here.
  No backend integration rerun for this CSS/display-only slice; unchanged source
  evidence at `bf8ffbf4` is retained. Full TIP gate/regression remains outstanding.

Logs (ignored runtime evidence): `e2e/.parity-out/v46-802-layout-{precommit,
msw-final,native,parity-final}.log`. Native seed first command had an incorrect
relative path and exited before touching DB; corrected to `../../e2e/...`.
No test assertion, timeout or retry relaxation. Native dev emitted a hydration
warning; browser checks passed, but this is not a production-build gate.

## Actual parity — still FAIL

Default affiliate demo, **not** optional functional revenue fixture; full-page,
no masks, same 3% threshold. Final runner24800 exit1, both assertions FAIL:

| Width | Previous | Current | Status |
| --- | --- | --- | --- |
| 1440 | 7.800101803374054% | 6.503844114528102% | FAIL |
| 390 | 16.04460216400515% | 8.290282902829029% | FAIL |

First layout measurement was9.063863062442607%/9.541484716157205%; corrected
identity line height, widths and icon stacking before the final measurement.
Latest images/results retain FAILs. Capture occurred with uncommitted source on
base4e83620c; exact tested source is `31fb5817`, attributed in results without changing pixels.

Remaining: default demo receipt/payout provenance (Q-V46-802-3), commission
reference totals/count differences (803 scope), shared shell differences (801),
former-beneficiary access and residual geometry. Financial values are NOT replaced
with prototype constants. The former-history control is NOT hidden for parity.
Expanded/payout states, all affected parity, full gate and native-dev acceptance
are still required. Questions are recorded, not a reason to block the whole goal.

## Cleanup / HOLD

Own temporary MSW4720/4721, native4730/4731/API4732 stopped by verified PID and
all handles reaped. TestDB restored to base demo with the guarded reset script;
no worker was needed for these read-only native cases. Generated Next AGENTS files
removed only after own servers stopped. API4000 PID28484, socket4001 PID33408,
worker16200 keep their original30/10 start times; no held binary overwritten.
No migration, devDB reset, merge or force push.
