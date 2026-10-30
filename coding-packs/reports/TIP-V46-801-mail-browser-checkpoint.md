# TIP-V46-801 — native mail + MSW browser checkpoint (PARTIAL)

Source/test commit: `a065b90a` (pushed). Production feature code is unchanged from
`4ba6fe16`; this slice adds verification and planner evidence, not a new provider.

## Mail delivery: real Postgres/Redis, fake external adapter

`pnpm --filter @opchub/server exec vitest run --project int
test/affiliate/regional-director-mail.int.spec.ts`: **3/3 passed**, 53.72s on the
final run (including the explicit rollback outbox assertion).

- Appointment/revocation HTTP transaction creates mail log + `mail.requested`.
- Actual relay dispatches through Redis/BullMQ `MailProcessor` to FakeMailProvider;
  status becomes sent and queued HTML is erased. No direct sender call is used
  for the initial delivery. Replayed persisted event and repeated sender call
  do not create a second delivery.
- EM-GDV1 has region/provinces, exemption, guidance and login link; no password.
- EM-GDV2 preserves a remaining paid deadline or requests payment for expired
  original fees, includes revocation time and retains previously recorded sharing.
- Failure after fee mutation but before commit restores the original fee/slot;
  no mail log, membership fee outbox event or provider delivery remains.
- Only the external mail adapter is replaced; no mocked Prisma or Redis.

## EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)

`pnpm --filter @opchub/server exec vitest run --project int
test/affiliate/regional-director-query.int.spec.ts`: **3/3 passed**, 21.44s.
Fixture creates **10,000 users + 10,000 history entries**, runs ANALYZE and removes
its own rows afterwards. Production query builders are executed unchanged. The
test helper validates and emits actual rows/loops/timing/buffers for every node.
No planner flags, cost overrides, sequential-scan disabling or relaxed assertion.

| Query                          | Planning ms | Execution ms | Root rows / loops | Shared hit / read blocks | Actual access path                                                        |
| ------------------------------ | ----------: | -----------: | ----------------: | -----------------------: | ------------------------------------------------------------------------- |
| Member page (selective search) |       0.377 |       11.837 |             1 / 1 |                  764 / 0 | `users_director_search` bitmap → deferred `users_pkey` lookup             |
| Member count (same search)     |       0.232 |       13.157 |             1 / 1 |                  760 / 0 | `users_director_search` bitmap; one matching heap row                     |
| Regional keyset history        |       2.763 |        0.095 |             4 / 1 |                    8 / 0 | Index Only Scan `regional_director_history_region_keyset`; 4 heap fetches |
| Global history first page      |       0.062 |        0.041 |            21 / 1 |                   11 / 0 | Index Only Scan `regional_director_history_keyset`; 21 heap fetches       |

All four plans have no Seq Scan on users/history. These are measured warm-buffer
fixture results, not an SLA or a claim about every selectivity. Province-membership
affiliate counting and nonselective candidate plans remain to be measured. A pg
driver deprecation warning was observed; no dependency or planner setting changed.

## Browser: MSW only at this checkpoint

`NEXT_DIST_DIR=.next-v46-msw-build NEXT_PUBLIC_API_MOCKING=msw
NEXT_PUBLIC_PORTAL_URL=http://localhost:3000 PARITY_WORKERS=1
pnpm --filter @opchub/e2e e2e regional-directors.spec.ts`: **1/1 passed**, 27.3s
(test 16.4s), using Chromium and the current production builds.

The shared scenario verifies three seeded incumbents, confirmation/revocation,
registered-member search and appointment, original bank retention across reload,
actual history entries, exact exemption count/filter, excluded fee row actions,
and revocation persistence. Both link destinations open the actual Portal login
page. MSW uses the mock login-link fixture; it does **not** prove reading a native
mailbox. The identical test has a server mailbox acquisition helper, with no
server-only weakening of assertions, but its native run is still pending.

Observed failures were corrected, not waived:

- Initial Admin MSW build used the default production Portal URL; bridge returned 503. Rebuilt Admin with the local Portal relay URL and reran the full scenario.
- AntD virtual ARIA option is hidden; selected via its real combobox keyboard
  control after asserting the exact candidate exists, not a forced hidden click.
- Chromium accessible tab name includes a space before count (`GĐ Vùng 3`), unlike
  jsdom without layout. Corrected the exact browser locator; count stays **3**.
- No timeout/retry/assertion/parity threshold changes or test skips.

## Build, code gates and native HOLD

- Root `pnpm build --env-mode=loose --force`: **3/3** tasks successful. MSW output
  `.next-v46-msw-build`; server also rebuilt. Admin was subsequently rebuilt once
  with `NEXT_PUBLIC_PORTAL_URL=http://localhost:3000` (exit 0) for the bridge fix.
- Native Portal/Admin build: **2/2** completed, output `.next-v46-native`, mocking
  off, API proxy localhost:4000 and socket localhost:4001. Build directories are
  locally Git-excluded; no `.env` or tracked runtime configuration changed.
- Root lint/typecheck/unit/depcheck exit 0 before source commit: lint/typecheck
  8/8 tasks, unit 6/6 tasks, **2082 passed + 2 existing S3 skips** (shared 666,
  server 248, Admin 591, Portal 418, UI 56, integrations 103). Existing img warnings
  unchanged. Depcheck: 2271 frontend/shared/e2e modules + 1004 server modules,
  no violations. Cached unchanged production/unit packages are from `4ba6fe16`;
  changed server test/typecheck and E2E lint/typecheck tasks ran anew.
- At preflight no native API/socket/worker listeners were present. Started this
  session's API/socket/worker on native dev DB/Redis db 1 using fake adapters and
  local storage; left them running. Health 200. Seed demo + dev cache flush exit 0.
  Native config HTTP 200 shows north=m3 (5 affiliates), central=m9 (3), south=m10
  (2), no unassigned province. No real provider calls or old migration changes.
- Native HOLD process IDs at verification: API **28484**, socket **33408**, worker
  **16200**. Fake mailbox: `D:/opchub-local/v46-mailbox`; mail Portal/Admin URLs are
  `http://localhost:3200` / `http://localhost:3201`. These are this session's running
  services, not a request to stop/restart them.
- One manual native frontend start command was rejected by execution policy. No
  alternate-shell/hidden-helper workaround was attempted. Native frontend/browser
  verification is not claimed. Native build success is not native E2E evidence.

## Remaining gate — V46-801 is NOT DONE

Native browser run with actual fake-mailbox links; further exemption discovery /
onboarding regression proof; affiliate-count/nonselective EXPLAIN; required
MSW/server behavioral coverage; parity P6/P9/P16/P17 and related Portal states at
1440/390 ≤3%; final full integration and E2E regression/gates; completion report
and PR/compare evidence. Do not begin V46-802 or reuse narrow checks as full gates.
