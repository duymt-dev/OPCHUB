# TIP-V46-804-F1 — Corrective verification report

## Status: PARTIAL — known causes fixed; clean full-suite reruns outstanding

Owner requested fixing the non-parity failures before TIP-805. Work remains on
`feature/TIP-V46-804-portal-my-region`, draft [PR #82](https://github.com/duymt-dev/OPCHUB/pull/82),
base **dev**. No merge, auto-merge, main push, or TIP-805 implementation.
Code/test commits: **817b22a8**, **596dbacb**, **e6ffe272**, all pushed.

## Changes and acceptance evidence

1. Affiliate history/cancellation explicitly select the seeded October 2026 month;
   reports alone fix the fixture clock. Application defaults are unchanged.
2. Forbidden Portal topic creation/deletion return the backend-equivalent 404 in
   MSW. MSW builds have no API rewrite even with an inherited API URL; native
   builds retain the API proxy. Two mock tests and four build-config tests pass.
3. Bot pruning plan fixture retains all 10,242 simulated messages, adds 10,000
   human messages, and preserves the original partial-index, PK, no-Seq-Scan and
   retained-count assertions. A separate original all-simulated distribution
   verifies the correct retained rows and no Seq Scan without forcing an index
   name. Both distributions roll back stress rows, then ANALYZE real statistics.
   No production SQL/index changed; no planner switch, dropped index, assertion
   removal, timeout increase, or new skip. Targeted integration: **9/9 PASS**.
   This proves the measured distributions, not optimal plans for every skew.
4. Owner chose the national flag, recorded as **D-133**. Shell E2E checks the exact
   Vietnam flag asset; production UI and existing flag unit assertions remain.
   This is not approval of failing pixel comparisons or a new parity mask.
5. Full E2E exposed a response-listener race: the groups page already requests
   reports on mount. The E2E-05 listener is now registered before navigation,
   retaining all moderation/lock assertions and original timeout. MSW repeat:
   **3/3 PASS**.
6. Native E2E then found a real chat-cache defect: a newly screened member message
   was hidden in PostgreSQL but silently discarded from an initially empty UI
   cache. Local transport now distinguishes new versus updated events; only new
   member messages/self-send acknowledgements insert the hidden placeholder in
   ordinary room views. Search, bot-hidden and unseen update/replay paths remain
   excluded; ack plus event deduplicates. No socket wire/backend change.
   Regression RED: **2 fail / 3 pass**; GREEN scope: **11/11 PASS**.
   Fresh native V2 E2E-05: **1/1 PASS**, including second violation, session
   revocation and exactly seven-day lock.
7. Stable full E2E exposed the same listener-order race in accountant collection:
   fee refetch may complete before the click promise resolves. Arm its GET listener
   before click, keeping payment response, twelve-month validity, live Portal
   update and reload assertions unchanged. Repeat result recorded below.

## Final gates (local evidence under `test-results/`)

| Gate | Result | Log prefix `v46-804-f1-` |
|---|---|---|
| lint | PASS, 8/8 tasks; 7 cached / 1 fresh, after final test fix | `lint-release.log` |
| typecheck | PASS, 8/8 tasks; 7 cached / 1 fresh, after final test fix | `typecheck-release.log` |
| unit, plain `pnpm test` | **1,981 pass / 2 existing skip**, 6 tasks; 4 cached / 2 fresh first run, 6 cached final test-only rerun | `unit-final.log`, `unit-release-final.log` |
| depcheck | PASS | `depcheck-final.log` |
| root MSW build | PASS, 3/3 forced tasks, server + Portal + Admin | `build-msw-final.log` |
| native FE build | PASS, 2/2 forced tasks | `build-native-final.log` |
| full integration | FAIL: DB **126/126**; server **1,801 pass / 2 skipped**, 198/200 files pass; two setup failures exhaust PostgreSQL connections | `int-full.log` |
| two resource-failed suites, separate rerun | **2/2 PASS**, exit 0, 47.18s; does not make full integration PASS | `int-resource-retest.log` |
| full MSW E2E, stable deployment | FAIL: **354 pass / 1 fail / 4 existing skip**, 15.4m; accountant listener race, fixed afterward | `e2e-full-stable.log` |
| accountant race regression, final source | **3/3 PASS**, 28.5s; all original business assertions retained | `accountant-race-repeat.log` |
| native affected E2E, earlier V1 | **7 pass / 2 existing MSW-only skip** | `e2e-native-affected.log` |
| native new hidden-delivery regression, final V2 | **1/1 PASS** | `hidden-native-v2.log` |
| parity | Not rerun in F1; parent TIP-804 remains PARTIAL | parent completion report |

Unit breakdown: shared 637, server 235, Portal 407, Admin 543, UI 56,
integrations 103 pass + 2 existing skip. Native affected scope and the earlier
overlapping native 4/4 run are not added together as unique coverage. Native
full-suite verification is not claimed.

## Failed/intermediate runs retained, not relabelled

- First plan-fixture revision passed its assertions but timed out during cascade
  cleanup; transactional rollback fixed cleanup, final targeted 9/9 passed with
  unchanged test/hook limits.
- Initial config-test location was outside the ESLint TS project; tests moved to
  each app's `src/lib`. Final root lint and typecheck pass.
- An intermediate concurrent full unit run hit worker startup/termination errors.
  A bounded run passed 1,974 tests before the chat fix; final plain `pnpm test`
  passed 1,981 after it. Neither intermediate count replaces final evidence.
- Full integration took **1h11m18s** and failed two suite initializers with
  `remaining connection slots are reserved for roles with the SUPERUSER attribute`;
  their two cases were skipped by failed setup, not newly declared skips. Subsequent
  `t.close()` errors are consequences of failed initialization. Bot plan tests pass
  within this full run; one worker-termination warning also remains in its log.
  Read-only `pg_stat_activity` inspection found unrelated databases sharing the
  native cluster. No other database/session was terminated and cluster capacity
  was not changed. The focused rerun passed **2/2**, recorded separately, never as
  full-suite PASS. A further 71-minute full rerun was not started; this is the
  remaining non-parity verification gap, not a claimed application fix.
- Full MSW R1: **354 pass / 1 fail / 4 skip**; remaining failure was the listener
  race fixed above. The next attempt (`e2e-full-final.log`) accidentally overlapped
  this agent's owned Next restart: connection-refused failures and a timeout make
  it invalid as a final gate. It was stopped, both login endpoints checked 200,
  and a fresh full run started in `e2e-full-stable.log`. This operational mistake
  contributed to the delay; it is not attributed to application assertions.
- A PID-array validation mistake initially prevented V2 startup. A test launched
  then still used V1 and is not V2 evidence. Final native V2 passed after validated
  restart. No evidence/logs were deleted to conceal these attempts.

## Native HOLD / scope

Only the approved private `opchub_v46_801_dev` / `opchub_v46_801_test` and Memurai
6381 DB1/DB2 were used. PostgreSQL 5432 / Redis 6379 baseline services are not
restarted or flushed. Existing own API/socket/worker PIDs remain 5804/22204/23836;
only owned Next processes were redeployed to final artifacts:
`.next-v46-804-f1-msw-v2` and `.next-v46-804-f1-native-v2`.

After native verification the private **dev** DB was seeded twice with identical
counts: 80 users, 62 affiliates, 51 referrals, 53 commissions, 65 periods,
53 regional shares, 1 payout, 50 year anchors, 3 occupied director slots,
**0 unbalanced shares**. Private dev cache alone was flushed. Counts do not
describe the separate integration test DB. Manifest: `v46-804-f1-hold.json`;
reset evidence: `v46-804-f1-hold-reset.log`.

No dependency, schema, migration, env variable, provider or unrelated feature
was added. Parity debt remains the parent report's measured >3% differences;
D-133 does not waive that gate. Do not label parent TIP-804 DONE.

Full integration and E2E are still recorded as failed runs. Focused green reruns
are not substituted for either full gate. No further 71-minute integration or
15-minute E2E rerun was started in this corrective session; both remain required
for a clean all-green release, in addition to the unchanged parity work.
