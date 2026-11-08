# TIP-V46-821 — query plan evidence

Target: owner-approved private `opchub_v46_801_test`, not native/dev production.
Actual production builders: `myRegionAffiliatesQuery` (page/CSV) and
`regionalDirectorLockQuery` (bulk revocation). No substituted demonstration SQL,
planner forcing or disabled sequential scans.

## Fixture and cleanup

- 10,000 synthetic financial snapshots: 1,000 in the requested director scope,
  9,000 outside it. No receipts, payments, outbox or incumbent director changes.
- Prefix-owned fixture only; removed in `finally`. VACUUM/ANALYZE before measuring
  establishes visibility-map coverage; statistics restored after cleanup.
- An initial transaction-only run used the existing payable bitmap index because
  inserted rows were not all-visible. The final committed evidence measures the
  normal vacuumed state; it does not promise zero heap reads on freshly written rows.

## Results — EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)

| Query | Scope access | Output | Execution |
| --- | --- | ---: | ---: |
| Keyset page | Index Only Scan `regional_share_affiliate_projection`, 0 heap fetches | 50 | 6.196 ms |
| CSV batch | Same covering scoped index, 0 heap fetches | 1,000 | 9.465 ms |
| Bulk director lock | Seq Scan of the three permanent slots + LockRows NOWAIT | 0 matching fixture users | 0.024 ms |

Index key order: `(region, director_user_id, affiliate_id)`;
`INCLUDE (customer_id, base_amount, director_amount)`; partial `region IS NOT NULL`.
Region/director equality is an index condition, not a post-scan tenant-like filter.
Display province uses the existing D-128 earliest-group query **after page LIMIT**.

Financial totals are computed aggregates: ordering by share DESC, name ASC, id ASC
still requires aggregating/sorting scoped groups. Keyset removes OFFSET and filters
the aggregate cursor correctly; it is **not** a physical B-tree seek on a stored
share total. No materialized balance/projection table or changed formula was added.
Small display-identity tables can legitimately use hash joins/sequential scans;
the large snapshot scope uses its covering index. A Seq Scan on exactly three
director rows is also the sensible plan, not an indexing failure.

Raw final plans: `evidence/v46-821-query-plans.json`. Measurements are local samples,
not production latency guarantees. Migration up/down/up evidence is separate.

Final identity lookup correction: narrow LATERAL LIMIT1 joins preserve the old
no-Seq-Scan contract on20k users/10k affiliates. Existing plan and deleted-identity
assertions remain unchanged; all14 regional focused integration cases pass.
Absent province is omitted in legacy/page payloads and remains blank in CSV.
