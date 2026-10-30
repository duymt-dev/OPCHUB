# V46-801 — P6 layout checkpoint (PARTIAL)

Source: `9a9ad3ea`, 30/10/2026. Previous checkpoint: `4b798f82`.

## Implementation

- Group assignment fields separately from province chips; use the prototype's
  measured 10px / 8px group gaps and 16px body gap. Preserve full bank drafts,
  valid-account normalization, versioned writes and province controls.
- Keep identities on one ellipsized line with the complete text in the DOM;
  stack the two statistics on mobile. Match region tags, action button spacing,
  heading typography and info-panel gaps.
- Fix AntD bank Form label/control spacing with scoped CSS specificity. Real
  AntD controls, validation messages and conditional Save button remain.
- Incumbent and fixed-region selectors remain disabled. Their values use a
  readable white presentation; neither direct replacement nor region editing is
  enabled. No bank digits, original fee history or counts were rewritten.
- Mobile Affiliate net summary uses a separate CSS module for two-line
  label/value presentation, rather than extra blank space or test-only styling.
  Production CSS is the same in MSW and native builds. No baseline/mask change.

## Verification

- Root precommit `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`
  all exit 0 on the final tree: lint/typecheck 8/8, unit 6/6 tasks, **2083 passed
  + 2 existing S3 skips** (Admin 592, shared 666, server 248, Portal 418, UI 56,
  integrations 103). Nine existing img warnings remain. Admin's fresh unit run
  took 139.52s / 121 files; the final repeat reused matching current package
  hashes. A final direct affected config/hook run also passed **16/16**, 12.48s.
  No shared/package contract change that would require bypassing a stale
  cross-package Turbo cache under Q-V46-801-9.

- Related config/hook unit tests **16/16** before final gate; final root unit
  gate includes them after the final grouping/summary changes.
- Admin MSW build and native `.next-server` build exit 0. Portal source/build
  unchanged. These affected builds do not replace the final full build gate.
- Existing `regional-directors.spec.ts`, same assertions unchanged:
  MSW **1/1**, 19.3s total / 15.3s test; native **1/1**, 44.2s total / 21.8s test.
  Native uses the real fake-provider mailbox. Held API remains `4ba6fe16`:
  later SQL source evidence is still the 31 integration cases at `462c267c`,
  not this browser test. Native HOLD services were not restarted or rebuilt.
- After native test, `seed:demo` and `flush:dev-cache` exit 0 (1631ms, 21 keys),
  restoring the native demo. No `.env`, secret or old migration changes.

## Parity

Full-page, unmasked, pixelmatch threshold 0.1 / maximum **3%**, unchanged.
Command uses `PARITY_IDS=D-V46-GDV-CONFIG,D-84,D-85`, one worker, the affected
Admin MSW build. The combined run is **not green**: four passed (including two
capture-harness cases), four failed.

| State | 1440 | 390 | Result |
|---|---|---|---|
| P6 / D-V46-GDV-CONFIG | 1.030529% | 1.135688% | PASS both |
| D-84 Affiliate overview | 15.713563% | 7.356264% | FAIL both |
| D-85 Affiliate detail | no capture | no capture | FAIL: old journey landmark |

P6 was previously 5.723746% / 9.154529%; both failing diff images are removed
only because the actual rerun now passes. D-84 failing images/results are kept.
D-85 timed out on the prototype-side wait for the removed wording
`Đối soát & chi trả theo tháng`. Its old `0b76e98a` PASS rows in the historical
results file are **not current verification**. Do not reuse them as gate proof.
Current prototype instead has the D-119 monthly reference rows / `GĐ Vùng chi`;
do not increase timeout or bring direct affiliate payout back for an old test.

The D-84 default commission screen includes the new v4.6 ledger/commission
changes scheduled in #802/#803 and differs from the currently implemented
automatic-affiliate dataset. This checkpoint only fixes the #801 configuration
and common mobile summary layout, not those financial operations. Do not reduce
the real dataset, fake totals, hide controls or claim all Affiliate parity passes.
Actual images show a reference-only blue notice missing in the app, year-of-
customer rates (10% year 2 versus the app's old 20%), the future director tab,
and changed commission totals. This is not merely an off-by-one CSS gap.
The post-commit rerun at `9a9ad3ea` (P6 + D-84, six tests) reproduces the exact
scores above: four pass including two harness cases, two D-84 failures, 26.8s.
No source change occurred between the verified build and this rerun.

## Still open

Investigate D-84 and replace the obsolete D-85 journey using actual reachable
v4.6 UI without weakening behavior assertions. P16/Portal parity and remaining
discovery/onboarding coverage; final full integration/build/E2E regression;
completion/PR-or-compare. P9/P17 evidence at `4b798f82` is retained because their
production components, fixtures, permissions and global styles did not change.
#801 remains IN PROGRESS; no #802 started, no TIP-DONE claim.
