# V46-802 — expanded sharing parity coverage

Status: **IN PROGRESS**, not TIP acceptance. No threshold or fixture changes.

## Source and command

Scenario source committed as `a662ca1f`; capture ran with that change in the
working tree on HEAD `f3d5781f`, before its commit. The reporter records that
actual capture HEAD, not a fabricated post-commit SHA. Production outputs are
the unchanged optimized builds from `44994da5` (application source `31fb5817`).
Later outbox teardown and these parity scenarios do not change runtime code.

```powershell
$env:NEXT_DIST_DIR = '.next-v46802-msw-build'
$env:NEXT_PUBLIC_API_MOCKING = 'msw'
$env:NEXT_PUBLIC_API_URL = '/v1'
$env:NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000'
$env:API_PROXY_URL = ''
$env:PORTAL_PORT = '3000'
$env:ADMIN_PORT = '3001'
$env:PARITY_WORKERS = '1'
$env:PARITY_IDS = 'D-V46-GDV-SHARING,D-V46-GDV-DETAIL,D-V46-GDV-SEARCH,D-V46-GDV-EMPTY'
pnpm --filter @opchub/e2e exec playwright test --project=parity parity/parity.spec.ts
```

Runner53603 terminal exit1: **2 passed /6 failed**, eight captures,1.7min.
Log: `e2e/.parity-out/v46-802-parity-states.log`. All navigation and state
assertions succeeded; the six failures are the unchanged 3% image gate.
Default AF0 dataset on both sides, not the optional revenue-demo scenario.

## Measured results

| State | 1440 | 390 |
|---|---:|---:|
| Default sharing | 6.503844% FAIL | 8.290283% FAIL |
| North director expanded ledger/history | 21.476849% FAIL | 21.715411% FAIL |
| Search Miền Trung | 1.453858% PASS | 7.814347% FAIL |
| Search without results | 1.189892% PASS | 10.747790% FAIL |

The aggregate registry now has440/490 passing images, including historical
measurements from other scopes. This is not a claim that all490 were rerun or
that TIP802 passed. Four new failing diff PNGs are committed; the two existing
default diff images are unchanged. No masks, reference edits or skipped states.

## Findings and remaining work

- Expanded reference shows eight receipt rows, another41-row indicator and
  two August/September payout history entries. Default app has no corresponding
  earned ledger or payout history. Q-V46-802-3 remains explicit: today's director
  cannot silently acquire pre-appointment earnings. Functional scenario tests
  with explicit appointment/receipt chronology do not waive default parity.
- Expanded app background and nested-cell padding differ from the reference;
  these are actionable layout defects independent of the financial chronology.
  No CSS correction is claimed in this test-only checkpoint.
- Empty reference retains the table header without an empty-state message;
  app displays empty-result guidance and the former-beneficiary access control.
  Mobile height differences and existing financial/header differences remain.
  Do not hide real historical-beneficiary access to make the screenshot pass.
- Search assertions explicitly verify the two nonmatching directors disappear;
  the empty state also verifies the third disappears. Existing separate sharing
  flow and responsive-search behavior tests are retained, not replaced by pixel
  assertions. Payout dialog/history lifecycle parity still needs coverage.

## Checks and retained gates

Before source commit, root lint8/8, typecheck8/8, unit6/6 task groups (all cached,
2187 passed +2 existing S3 skips), depcheck2365/1057 modules: PASS. Runner24059
terminal exit0; log `e2e/.parity-out/v46-802-parity-states-precommit.log`.
Hooks ran normally; `git diff --check` passed.

Retain production builds and full MSW351 passed/4 existing skips at44994da5:
only parity scenarios/inventory changed, not behavior tests or app code.
Full native integration at5a3ca36b remains running on original session38636;
no result inferred from individual passing files. DB portion reports160/160,
with a worker-termination timeout warning retained in its log. Server portion
is still live. See [full gates](TIP-V46-802-full-gates.md).

Owned3000/3001 parity listeners released. Original API4000/socket4001 and
prototype4800 remain; no native seed/reset while the integration runner is live.
801 remains pending acceptance; no803 work, TIP-DONE or goal-block claim.
