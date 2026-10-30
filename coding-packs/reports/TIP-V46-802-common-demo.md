# V46-802 — common scenario and browser payout proof

**IN PROGRESS, not TIP-DONE.** Source `68a3152e`, committed and pushed.

## Implemented

- Opt-in `seed:demo --revenue` / MSW cookie `opchub-mock-revenue-demo=1` share
  one explicit historical dataset. Six extra real fixture accounts: an affiliate
  registered in2022, four referred customers, one direct customer. Ten matched
  paid periods substantiate first receipts and renewals; no legacy AF0 row changes.
- Optional north-director tenure begins August2026, after the existing account's
  registration; a corresponding appointment history row is present. Default
  director dates remain unchanged. September receipts are eligible for the
  existing ended-month payout rule without moving the browser/server clock.
- Years1/2/3/4 yield50/40/30/20%; one actual receipt is1 dong above the plan price.
  Director allocation is **1,680,001 VND** across four receipts; Media Soft keeps
  **6,720,000 VND**, including the direct-registration receipt. Historical first
  payments establish customer epochs only, not retrospective entitlements.
- Native seed records fixture history directly; it does not claim an external
  transfer or outbox dispatch. MSW exercises capture/drain. Existing native
  receipt/relay integration remains separate evidence for runtime reconciliation.
- Affiliate-owned province memberships now survive the financial browser lease.
  Complete membership lists, explicit leaves and counters are validated/restored
  atomically; legacy snapshots do not erase existing membership. Repeated seed
  after payout/revocation/reload does not restore the old appointment or money.

## Actual checks

All evidence below covers source `68a3152e` (commit hook formatting only).

| Check | Actual result |
| --- | --- |
| Root lint/typecheck/unit/depcheck | PASS, exit0; lint8/8, typecheck8/8; unit6/6,3 cached |
| Unit total | **2165 passed +2 existing skips**: Admin612, Portal418, shared710, server266, UI56, integrations103+2skip |
| Dependency boundaries |2352 frontend/shared +1051 server modules; no violations |
| Focused shared revenue/persistence | **88/88**,13 files,5.84s |
| Native seed/related regression | **27/27**,6 files,34.78s; real `opchub_test` |
| Same browser test, MSW | **1/1**,15.7s total; payout/retained debt/history reload |
| Same browser test, native | **1/1**,43.4s total; same assertions, no mode branch in test body |

Root runner56384: `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`.
Log `e2e/.parity-out/v46-802-common-demo-precommit.log`.

Focused shared: `pnpm --filter @opchub/shared exec vitest run
src/mock-data/domains/revenue-sharing src/mock-data/domains/affiliate-persistence`.

Native runner58432: `pnpm --filter @opchub/db exec node
--env-file-if-exists=.env node_modules/vitest/vitest.mjs run
test/revenue-demo.int.spec.ts test/seed-revenue.int.spec.ts test/seed-demo.int.spec.ts
test/seed-directors.int.spec.ts test/affiliate-demo.int.spec.ts
test/affiliate-payout-demo.int.spec.ts`.
Log `e2e/.parity-out/v46-802-common-demo-int-final.log`.

Browser commands: Playwright `--project=behavior
behavior/regional-revenue-sharing.spec.ts`, normal config for MSW,
`-c playwright.server.config.ts` for native. Logs
`v46-802-revenue-browser-msw.log` and `v46-802-revenue-browser-native.log`
under `e2e/.parity-out/`; terminal runners28799/89602, both exit0.

Initial failures identified missing persisted affiliate province membership,
an invalid seed field (`joinedAt` instead of `createdAt`) and a test setup that
had not opened the former-director section. Fixed each cause; no assertion,
timeout, skip or parity threshold weakened.

## Runtime provenance and limits

- Focused browser runs used isolated **Next dev** outputs and a fresh API build
  in `apps/server/dist-v46802`, **not** the final production-build gate.
- Native API4732 used real `opchub_test`/Redis2; test setup seeded that DB explicitly
  and used `SKIP_SEED=1` to prevent the ordinary harness from resetting dev.
  This is native functional proof, **not** final acceptance on `opchub_dev`.
- A new test-only worker delivered pending revenue events. Readback: no pending
  revenue outbox events; one September payout1680001/4 shares and four paid shares.
  It also logged unrelated stale test-queue job failures (stalled reconciliation,
  unconfigured bot AI); these are not presented as worker-regression PASS.
- All six processes started for this measurement were stopped. Original HOLD
  API28484/socket33408/worker16200 and `opchub_dev` data/dist remain unchanged.
  Subsequent integration reseeded the test DB, not dev. No migration or external
  bank/mail/AI call. No runtime list query changed; prior EXPLAIN evidence remains
  at its original source SHA, not re-labelled as a new run.

## Still required

Outer Affiliate retained-total integration; prototype-data/UI parity1440/390;
full TIP integration/build/MSW regression and final native-dev acceptance.
The older `regional-directors.spec.ts` still expects predecessor-bank inheritance:
reconcile that stale assertion with the already implemented beneficiary-owned bank
rule and verify the corrected lifecycle before claiming the full E2E gate.
Q-V46-802-1/2 remain open; Q3 now has coherent functional fixture chronology, not
prototype parity acceptance. All801 FAILs remain preserved.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing).
