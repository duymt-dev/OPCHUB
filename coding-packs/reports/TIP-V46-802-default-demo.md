# V46-802 — coherent default AF0 history

Source **d880150b**, pushed. Implementation checkpoint, **not TIP-DONE**.
D-119 authorizes demo regeneration; no production receipt/backdating algorithm
changed and no prototype totals were inserted into UI code.

## Data and safeguards

- Shared typed scenario derives customer years from actual first receipts and
  policy allocation. Native seed creates24 additional historical paid periods
  with linked matched bank transactions and actual `OPCHUB` member references.
  Account/referral registration precedes acquisition; owner acquisition precedes
  customer registration. Earliest province membership is consistent across modes.
- North appointment/history predates earned August/September revenue. Three
  bank snapshots retained.51 receipt shares include50 attributed receipts across
  six affiliates; the cancelled referral's positive receipt is direct Media Soft
  revenue, not missing cash. Native referral is void and commission stays cancelled.
- Policy-derived attributed totals:44,880,000 allocated;28,680,000 paid;
  16,200,000 due;55,920,000 Media Soft retained. All-receipt Media Soft57,120,000
  also includes the unqualified referral. Ledger conservation is tested.
- Two immutable receipts pay7,800,000 and20,880,000 for closed August/September.
  Payment timestamps use the first eligible Vietnam instant next month. Prototype
  shows prior month-end dates; Q-V46-802-2 remains open, not waived by fixture work.
- Existing financial state is protected: default MSW seed rejects pre-existing
  receipt/outbox history before mutation; native reset guard retained. Repeated
  coherent seed is idempotent. Paused/legacy payout variants remain independent.
  The separate functional revenue-demo dataset remains unchanged.

## Checks

| Scope | Actual result |
|---|---|
| Shared affected fixture/MSW suites |8files,37/37 PASS |
| Native DB affected suites |4files,18/18 PASS,16.96s |
| Root precommit lint/typecheck |8/8 tasks each PASS |
| Root unit |2194 passed +2 existing S3 skips;6/6 tasks cached on final rerun |
| Depcheck |2376 frontend /1060 server modules, no violations |
| Admin production MSW/native builds |1/1 each,21.241s /26.027s |
| MSW browser default+layout+financial |5/5 PASS,33.6s |
| Native default history/pagination/reload1440/390 |2/2 PASS,11.0s |
| Native functional layout1440/390 +financial flow |3/3 PASS,17.3s |

Both browser modes use identical assertions. Default checks include real dashboard
totals, eight initial ledger rows,16 after pagination, customer year/rate, frozen
bank/history and reload. Functional checks retain exact years1–4, revocation,
retained debt, month payout/reload and new nested-ledger geometry assertions.
Native production Next proxies the isolated built API, not MSW or a dev server.

Commands: shared `pnpm --filter @opchub/shared exec vitest run
src/fixtures/revenue-affiliate-demo src/mock-data/domains/revenue-sharing`;
DB `pnpm --filter @opchub/db exec node --env-file-if-exists=.env
node_modules/vitest/vitest.mjs run test/revenue-affiliate-demo.int.spec.ts
test/seed-revenue.int.spec.ts test/revenue-demo.int.spec.ts test/affiliate-demo.int.spec.ts`.
Root `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`.
Browser `pnpm --filter @opchub/e2e exec playwright test --project=behavior`
with the three `behavior/regional-revenue-{default,layout,sharing}.spec.ts` files;
native uses `E2E_TARGET=server SKIP_SEED=1`, ports4730/4731, proxy4732,
`NEXT_DIST_DIR=.next-v46802-native-build`; MSW uses3000/3001 and
`.next-v46802-msw-build`. Native default/functional datasets seeded separately.

Initial native invocation without test env failed before DB access; corrected to
the explicit env-file command. First configured run exposed63→87 period count
and an older province membership taking precedence; both fixed with additional
provenance assertions, not hidden with relaxed totals. Initial type/lint errors
also fixed before final precommit PASS. Logs retain these failed attempts.
Final logs: `e2e/.parity-out/v46-802-default-{shared-wired,native-final,
precommit-final,msw,native-browser,native-functional,parity}.log`.

## Current parity — no threshold/mask/reference changes

Source d880150b, production MSW, runner8713 terminal exit1,52.6s.
Eight captures: **2 PASS /6 FAIL**; two additional capture-harness cases PASS
(total runner4passed/6failed). All screen navigation/state assertions succeeded.

| State |1440 |390 |
|---|---:|---:|
| Default |6.269294% FAIL |7.893651% FAIL |
| Expanded north ledger/history |4.717849% FAIL |6.682425% FAIL |
| Search Miền Trung |1.289506% PASS |7.523281% FAIL |
| Empty search |1.119213% PASS |10.545856% FAIL |

Expanded history improves from23.052057%/22.786458%, but still exceeds3%.
Actual results and six diff images committed; earlier failed numbers retained
in the prior report. No screenshot PASS inferred from the functional tests.

## Gate status and cleanup

Full integration38636 is terminal **FAIL**: DB160pass, server1869pass/1fail.
The remaining fundraising calendar overflow is recorded separately; no assertion
weakening or unrelated domain fix here. See [full gate record](TIP-V46-802-full-gates.md).
Shared AF0 changes require corresponding full regression at final acceptance;
the earlier351/4 MSW run is not current coverage for this modified fixture.
Portal native build from ff1deb38 and server production runtime31fb5817 remain
unchanged; Admin rebuilt for this slice. Remaining parity and native-dev acceptance
are still open, as are801 acceptance and803–812. Goal remains active.

Native own API/worker stopped only after actual payout outbox dispatch, pending
audit `[]`. Base demo restored on opchub_test only; Redis2 cleared; pending audit
again `[]`. No opchub_dev reset, held dist overwrite or external calls. Worker
log contains an unrelated unconfigured-AI bot warning, not an error-free claim.
API28484/socket33408/worker16200 retain30October original start times. Test-owned
3000/3001/4730/4731/4732 listeners released. All test handles terminal.
