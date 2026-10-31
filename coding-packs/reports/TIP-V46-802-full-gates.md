# V46-802 — full gate checkpoint (not completion)

Tested source: `44994da5` (production source `31fb5817`). No source edits during
these runs. Root lint/typecheck/unit/depcheck evidence at31fb5817 remains applicable;
44994da5 changes documentation only. All open parity/semantic questions remain.

## Production builds — PASS

- `NEXT_DIST_DIR=.next-v46802-msw-build NEXT_PUBLIC_API_MOCKING=msw
  NEXT_PUBLIC_API_URL=/v1 NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
  API_PROXY_URL='' pnpm build --filter=@opchub/admin --filter=@opchub/portal
  --force --env-mode=loose --concurrency=1`: **2/2 tasks,0 cached**,1m22.004s,
  runner30677 exit0. Optimized Next production builds, not dev servers.
- `pnpm --filter @opchub/server exec tsdown --out-dir dist-v46802`: **PASS**,
  1229ms, all three entrypoints (api/socket/worker),17files. Held `dist/` unchanged.
- Together these cover all three application build scripts. This is NOT a claim
  that an unfiltered root `pnpm build` ran: output isolation is required by HOLD.
- Logs: `e2e/.parity-out/v46-802-build-{msw,server}-44994da5.log`.

## Full native integration — initial FAIL, repair verified narrowly

Original `pnpm test:int` runner20448 is **terminal exit1**,30m41.128s:

- Server: **201 files /1865 tests PASS**.
- DB: **9 failed /22 passed files;7 failed /128 passed /25 skipped tests**.
  The25 skips are blocked-suite fallout, not intentionally added skips.
- Root:1/2tasks,0cache. Failure: DB demo reset refuses pending802 outbox events
  left by server payment tests. Read-only audit found24undispatched receipt
  snapshots; no pending payout events. The guard correctly prevented data loss.
- Log: `e2e/.parity-out/v46-802-full-int-44994da5.log`. Keep this FAIL; do not
  relabel the run green using selective reruns.

Repair source: `5a3ca36b`. Integration-only global teardown now creates the
actual API dependency context (without HTTP listener) after every test file has
finished, and a dedicated real outbox relay with the two real revenue consumers.
It records actual ledger/notification effects, then normal relay dispatch; no
outbox deletion, fake delivery, lease override or production/reset-guard change.
Targets restricted to native localhost opchub_test5432/Redis2/test mode. Invalid
payload or unexpired lease causes teardown failure, not silent cleanup.

- New integration coverage:105events across batches, exact allocation, replay,
  payout notification once, unrelated event unchanged, invalid payload retained,
  lease preserved and invalid targets rejected.
- Focused final affected server suites **26/26 across3files**,33.09s,runner48089
  exit0, including real global teardown. Log `v46-802-teardown-affected.log`.
- Whole DB suite after that real drain: **160/160 across31files**,123.14s,
  runner64476 exit0,94migrations/no pending. Log `v46-802-teardown-db.log`.
- Initial helper trial had4test passes but teardown failed because a reduced
  Nest module graph omitted AppSettingsService. It exited1 after close timeout;
  reaped27429. Corrected to the actual ApiAppModule, no timeout increase or
  skipped cleanup. Final focused runner88695 passed4/4+teardown before the
  payout test was added; the subsequent26/26 includes all5new tests.
- Root precommit `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`:
  **PASS**, runner19184 exit0, lint8/8,typecheck8/8,unit6/6(4cached),
  **2187passed +2existing S3 skips**. Depcheck2365/1057 modules pass.
  The final added payout integration case also passed current server lint/typecheck
  (runner64154 exit0). Log `v46-802-teardown-precommit.log`.
- Whole root rerun `pnpm test:int` at **5a3ca36b**, live session **38636**:
  **RUNNING**, no terminal result yet. Log
  `e2e/.parity-out/v46-802-full-int-5a3ca36b.log`.
  Re-poll38636; do not restart due to an observation timeout. No other native
  test/seed/worker is running. Test base was restored and pending count0 confirmed
  immediately before this run; restore again only when38636 is terminal.

## Full MSW regression — PASS

`NEXT_DIST_DIR=.next-v46802-msw-build NEXT_PUBLIC_API_MOCKING=msw
NEXT_PUBLIC_API_URL=/v1 NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
API_PROXY_URL='' PORTAL_PORT=3000 ADMIN_PORT=3001 PARITY_WORKERS=2 pnpm e2e`.
Original runner56187 is **terminal exit0:351passed,4existing skips,22.6m**.
**355collected**, two workers, production Next outputs above. Previous801 suite
352collected; two layout cases and one financial case account for the increase.
The4skips are the existing3server-only DLPL cases plus1live-provider case.
No test removed, new skip, retry, timeout or assertion relaxation.

The current802 layout (both widths) and years/revoke/payout/reload flow pass
within this full run, alongside all801 appointment/bank/province/mail/Portal cases.
Known slow bot files10.3m/5.5m completed without restart. A final `[WebServer]
Error:` line appears during teardown after the PASS summary; exit0 and no test
failures. Both owned3000/3001 listeners released; no claim that stderr is empty.

Log: `e2e/.parity-out/v46-802-full-msw-44994da5.log`. Later changes are exclusively
server integration harness/tests: they are not imported into either production
FE build, MSW state, shared/runtime modules or E2E assertions. Retain this full
regression and all three application builds; do not rerun unaffected browser
code merely because the test harness has a newer commit.

## Open acceptance / safety

Default financial seed currently has explicit historical receipt/epoch provenance,
but no historical entitlement snapshots. Existing AF0 dates precede October
appointments; filling prototype totals using today's directors would change
financial history. Keep Q-V46-802-3 and the functional explicit scenario separate.
No seed/business change was made during gate collection.

P7 parity remains6.503844%/8.290283% FAIL at1440/390, not waived by builds or tests.
Q-V46-802-2 payout cutoff and expanded/payout/history parity remain open. Final
native-dev acceptance, remaining801 gates,803–812 and all milestone/completion
reports are still required. This is not TIP-DONE or goal completion.

Native HOLD API28484/socket33408/worker16200 retain original30/10 start times.
No held dist overwrite, no devDB reset, no migration, no external provider calls,
no merge/force push. Restore test demo only after the integration handle is terminal.
