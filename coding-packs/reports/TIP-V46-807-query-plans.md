# TIP-V46-807 ? actual query plans

Measured on the approved private test DB on 05/11/2026 using PostgreSQL EXPLAIN (ANALYZE, BUFFERS), current production query builders and temporary tables cloned INCLUDING ALL from the deployed schema. Single connection,10,000 rows, ANALYZE; no planner flags. The temporary commission clone alone permits5% historical zero amounts; no public constraint is relaxed by this plan test.

- Commissions: page251,size20,95% positive, existing ordered index then20 PK/name lookups;22.416ms. An amount filter remains on ordered candidates; no new index is justified by this fixture alone.
- Audit:51 IDs from the existing covering created_at/id index, then51 PK payload lookups;6.980ms. LATERAL OFFSET0 keeps wide payload retrieval after LIMIT. Microsecond timestamps are preserved in cursors.
- Conversion: whole-population aggregation uses one-pass users/fees scans, plus10,000 indexed earliest-membership probes (no repeated group_members Seq Scan);159.820ms. Tiny three-row group catalog scans are intentional. Redis caches this snapshot60seconds. This is not a claim of zero Seq Scan everywhere or a production-scale benchmark.

Test: apps/server/test/reporting/transparency-plan.int.spec.ts. Scoped run7/7 including6 audit integration cases, log test-results/v46-807-int-r5.log.

```text
TIP-V46-807 commissions, deployed-index clones10000:
Sort  (cost=576.60..576.65 rows=20 width=148) (actual time=22.373..22.374 rows=20 loops=1)
  Sort Key: c.created_at DESC, c.id DESC
  Sort Method: quicksort  Memory: 27kB
  Buffers: shared hit=3 read=1, local hit=117 read=116 written=92
  ->  Nested Loop  (cost=417.37..576.17 rows=20 width=148) (actual time=22.169..22.355 rows=20 loops=1)
        Buffers: shared hit=3 read=1, local hit=117 read=116 written=92
        ->  Nested Loop  (cost=417.08..568.72 rows=20 width=79) (actual time=22.089..22.186 rows=20 loops=1)
              Buffers: local hit=59 read=114 written=92
              ->  Limit  (cost=416.80..418.46 rows=20 width=13) (actual time=22.044..22.052 rows=20 loops=1)
                    Buffers: local read=113 written=91
                    ->  Index Scan using commissions_created_at_id_idx on commissions c_1  (cost=0.29..791.66 rows=9500 width=13) (actual time=0.048..21.923 rows=5020 loops=1)
                          Filter: (amount > 0)
                          Rows Removed by Filter: 265
                          Buffers: local read=113 written=91
              ->  Index Scan using commissions_pkey on commissions c  (cost=0.29..7.50 rows=1 width=79) (actual time=0.006..0.006 rows=1 loops=20)
                    Index Cond: (id = c_1.id)
                    Buffers: local hit=59 read=1 written=1
        ->  Index Scan using affiliates_pkey on affiliates a  (cost=0.29..0.36 rows=1 width=18) (actual time=0.005..0.005 rows=1 loops=20)
              Index Cond: (id = c.affiliate_id)
              Buffers: local hit=58 read=2
Planning:
  Buffers: shared hit=208 read=1, local hit=14 read=27 written=27
Planning Time: 106.922 ms
Execution Time: 22.416 ms

TIP-V46-807 audit, deployed-index clones10000:
Nested Loop  (cost=0.57..427.86 rows=51 width=142) (actual time=6.674..6.953 rows=51 loops=1)
  Buffers: local hit=152 read=4 written=1
  ->  Limit  (cost=0.29..3.16 rows=51 width=17) (actual time=0.008..0.021 rows=51 loops=1)
        Buffers: local hit=3
        ->  Index Only Scan using audit_logs_created_at_id_idx on audit_logs  (cost=0.29..564.28 rows=10000 width=17) (actual time=0.007..0.017 rows=51 loops=1)
              Index Cond: ((created_at >= '2026-07-18 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-10-16 00:00:00+00'::timestamp with time zone))
              Heap Fetches: 0
              Buffers: local hit=3
  ->  Index Scan using audit_logs_pkey on audit_logs audit_logs_1  (cost=0.29..8.30 rows=1 width=93) (actual time=0.132..0.132 rows=1 loops=51)
        Index Cond: (id = audit_logs.id)
        Buffers: local hit=149 read=4 written=1
Planning:
  Buffers: shared hit=43, local hit=2 read=7 written=4
Planning Time: 49.559 ms
Execution Time: 6.980 ms

TIP-V46-807 conversion, deployed-index clones10000:
Hash Left Join  (cost=65669.58..65669.76 rows=4 width=65) (actual time=159.632..159.653 rows=4 loops=1)
  Hash Cond: ("*VALUES*".column1 = r.region)
  Buffers: shared hit=6, local hit=40018 read=268 written=165
  ->  Nested Loop Left Join  (cost=65661.26..65661.39 rows=4 width=28) (actual time=159.583..159.594 rows=4 loops=1)
        Join Filter: (NOT (tally.region IS DISTINCT FROM "*VALUES*".column1))
        Rows Removed by Join Filter: 9
        Buffers: local hit=40018 read=268 written=165
        ->  Values Scan on "*VALUES*"  (cost=0.00..0.05 rows=4 width=4) (actual time=0.001..0.003 rows=4 loops=1)
        ->  Materialize  (cost=65661.26..65661.29 rows=1 width=28) (actual time=39.895..39.897 rows=3 loops=4)
              Buffers: local hit=40018 read=268 written=165
              ->  Subquery Scan on tally  (cost=65661.26..65661.28 rows=1 width=28) (actual time=159.577..159.581 rows=3 loops=1)
                    Buffers: local hit=40018 read=268 written=165
                    ->  HashAggregate  (cost=65661.26..65661.27 rows=1 width=28) (actual time=159.576..159.580 rows=3 loops=1)
                          Group Key: (COALESCE(parent.region, g.region))
                          Batches: 1  Memory Usage: 24kB
                          Buffers: local hit=40018 read=268 written=165
                          ->  Nested Loop Left Join  (cost=353.29..65436.26 rows=10000 width=8) (actual time=2.502..151.191 rows=10000 loops=1)
                                Buffers: local hit=40018 read=268 written=165
                                ->  Hash Join  (cost=353.00..686.26 rows=10000 width=9) (actual time=2.425..26.050 rows=10000 loops=1)
                                      Hash Cond: (u.id = f.user_id)
                                      Buffers: local hit=103 read=182 written=162
                                      ->  Seq Scan on users u  (cost=0.00..307.00 rows=10000 width=5) (actual time=0.023..18.893 rows=10000 loops=1)
                                            Filter: ((deleted_at IS NULL) AND (account_type <> 'investor'::account_type))
                                            Buffers: local read=182 written=162
                                      ->  Hash  (cost=228.00..228.00 rows=10000 width=9) (actual time=2.351..2.351 rows=10000 loops=1)
                                            Buckets: 16384  Batches: 1  Memory Usage: 538kB
                                            Buffers: local hit=103
                                            ->  Seq Scan on membership_fees f  (cost=0.00..228.00 rows=10000 width=9) (actual time=0.007..0.985 rows=10000 loops=1)
                                                  Filter: (status <> 'regional_director'::membership_fee_status)
                                                  Buffers: local hit=103
                                ->  Limit  (cost=0.29..6.46 rows=1 width=47) (actual time=0.012..0.012 rows=1 loops=10000)
                                      Buffers: local hit=39915 read=86 written=3
                                      ->  Nested Loop Left Join  (cost=0.29..6.46 rows=1 width=47) (actual time=0.012..0.012 rows=1 loops=10000)
                                            Join Filter: (parent.id = g.parent_id)
                                            Rows Removed by Join Filter: 3
                                            Filter: ((g.kind = 'province'::group_kind) OR (parent.kind = 'province'::group_kind))
                                            Buffers: local hit=39915 read=86 written=3
                                            ->  Nested Loop  (cost=0.29..5.37 rows=1 width=51) (actual time=0.009..0.009 rows=1 loops=10000)
                                                  Join Filter: (g.id = gm.group_id)
                                                  Rows Removed by Join Filter: 1
                                                  Buffers: local hit=29915 read=86 written=3
                                                  ->  Index Only Scan using group_members_user_id_status_created_at_group_id_idx on group_members gm  (cost=0.29..4.30 rows=1 width=11) (actual time=0.006..0.006 rows=1 loops=10000)
                                                        Index Cond: ((user_id = u.id) AND (status = 'member'::group_member_status))
                                                        Heap Fetches: 0
                                                        Buffers: local hit=19915 read=86 written=3
                                                  ->  Seq Scan on groups g  (cost=0.00..1.03 rows=3 width=43) (actual time=0.000..0.000 rows=2 loops=10000)
                                                        Filter: (deleted_at IS NULL)
                                                        Buffers: local hit=10000
                                            ->  Seq Scan on groups parent  (cost=0.00..1.03 rows=3 width=11) (actual time=0.000..0.001 rows=3 loops=10000)
                                                  Filter: (deleted_at IS NULL)
                                                  Buffers: local hit=10000
  ->  Hash  (cost=8.30..8.30 rows=1 width=13) (actual time=0.007..0.008 rows=0 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 8kB
        ->  Nested Loop Left Join  (cost=0.29..8.30 rows=1 width=13) (actual time=0.006..0.007 rows=0 loops=1)
              ->  Seq Scan on regional_directors r  (cost=0.00..0.00 rows=1 width=36) (actual time=0.006..0.006 rows=0 loops=1)
              ->  Index Scan using users_pkey on users d  (cost=0.29..8.30 rows=1 width=14) (never executed)
                    Index Cond: (id = r.user_id)
Planning:
  Buffers: shared hit=241, local hit=29 read=18 written=3
Planning Time: 157.246 ms
Execution Time: 159.820 ms
```
