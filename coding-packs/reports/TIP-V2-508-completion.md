# TIP-V2-508 — correlated visibility seek / statistics refinement

Status: IMPLEMENTED, scoped native verification complete. Full P5 remains open.

## Finding and actual change
REQ-141 hide SQL initially passed an overly uniform 10k-human/40-persona fixture.
The broader run retained 104 passes and one plan-test failure: global hide chose
another valid persona index rather than the specifically asserted new index.
No functional hide assertion failed. A more representative fixture adds 10,001
already-hidden persona rows (in addition to 10,001 human + 40 eligible rows).
This exposed a real conjunction-estimation problem: PostgreSQL estimated ~5,000
eligible rows where actual40 qualified and chose Seq Scan. Assertions were NOT
relaxed and competing indexes were NOT removed.

- **Final source fix:** partial covering index
  `(is_simulated, hidden_at, room_id) INCLUDE(id) WHERE is_simulated` provides
  actual equality/null search bounds, rather than using those conditions only
  as a partial-index predicate/filter. Human messages are not indexed. Both
  actual plans use Index Scan with an explicit Index Cond on simulated=true and
  hidden_at IS NULL. No competing index was dropped to make the plan pass.
- New statistics match the columns used by the existing `is_simulated AND
  hidden_at IS NULL` predicate. The first expression-statistics attempt did not
  match the query's NullTest; its already-applied test migration is preserved,
  followed by a corrective column-statistics migration. Final Update-node
  estimates are40, not5,000. All deployments were guarded loopback5432 /
  opchub_test only. No dev/VPS data or migration checksum was rewritten.
- Statistical estimates alone did not fix physical test-index bloat: catalog
  evidence showed 485 partial-index pages for40 tuples, versus670 heap pages,
  after repeated aborted 10k fixtures. A diagnostic test-only rebuild of the
  initial index gave a focused pass but still failed the next broad run: global
  selection still had no real B-tree prefix bounds. That workaround was removed.
  **Final test contains no REINDEX/VACUUM, test-created index or planner switch**;
  it uses actual deployed migrations and the real SQL. No mocked storage,
  disabled constraints or data reset. The diagnostic failure remains retained.
- The initial hidden-row body fixture exceeded the existing body length CHECK;
  it now uses a valid wide body. A fixture reset which accidentally unhid all
  simulated rows now resets ONLY the40 target rows between scoped/global plans.
  Actual-count assertions verify40 targets,10,001 untouched humans and10,001
  still-hidden rows, followed by rollback verification. Plans print BEFORE
  assertions so future failures retain the full authoritative plan.

The multivariate-statistics approach follows the
[PostgreSQL16 MCV documentation](https://www.postgresql.org/docs/16/multivariate-statistics-examples.html#STATS-EXAMPLES-MCV).
The query-specific expression mismatch and bloat diagnosis above are observed
native evidence, not claims inferred from that general documentation.

## Verification / limitations
- Final seek-index hide/storage **9/9 in2 files**, including all actual row-count
  assertions. Actual scoped/global UPDATE each uses the new partial covering
  index (Index Scan plus explicit equality/null Index Cond), one Update node and
  no Seq Scan on messages. Final broad run: **105/105 in21 files**, bot/chat/
  moderation plus live bot HTTP contract/coverage. Actual FakeLlm reply worker
  waited **68,467ms**, produced one reply/one keyword report. The preceding two
  broader **104-pass/1-fail** runs remain retained, not relabeled as green.
- Final gates: lint8/8 (6 cached), typecheck8/8 (6 cached), units938 passed +2
  existing storage skips, six successful tasks (5 cached); depcheck no violations
  (FE/shared1,491 modules/4,090 dependencies; server753/3,325). This is not the
  full repository integration gate or browser acceptance.
- Raw before/after, failed expression attempt, valid-length fixture correction,
  catalog metadata and completed receipts: `evidence/v2-508/`; originals private
  under `D:/opchub-local/v2/508-*` / `502-hide-plan-*`.
- This is scoped seek/statistics verification, not complete TIP-502/P5,
  browser parity or full repository integration. Production bloat-monitoring /
  reindex policy remains disclosed S3 maintenance debt; no arbitrary-bloat
  guarantee is claimed. The actual final test does not require rebuilding indexes.
