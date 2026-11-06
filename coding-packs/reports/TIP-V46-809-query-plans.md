# TIP-V46-809 actual query plans

Private test DB, PostgreSQL16. Connection-local LIKE INCLUDING ALL tables preserve migrated indexes;10,000 needs,2,500 matching industry and2,000 matching province. No public fixture changes, forced planner flags or new indexes.

One unique-owner/product query, then one bounded candidate query. The initial plain payload join chose a needs Seq Scan; production now uses a correlated unique-ID LATERAL lookup (LIMIT1) after LIMIT200. This preserves one SQL and exact result order, no per-row network queries. Cache integration verifies a second call within60s performs no repository SQL.

The product array uses indexed `ARRAY(SELECT ... ORDER BY sort,id)` instead of grouped
`array_agg`: same ordered names/one SQL, empty array when there are no items, no grouping
over the uniquely selected store.

Evidence: test-results/v46-809-matches-int-r3.log,2 plan tests +8 API/cache/access tests passed.

Full-root integration subsequently passed2089/2089 (server1963 +DB126), exit0.
Its store query executed0.132ms and candidate query6.389ms with the same index/bound
assertions. Log: `test-results/v46-809-full-integration.log`.

```text
need matches store:
Limit  (cost=0.29..16.66 rows=1 width=49) (actual time=0.087..0.088 rows=1 loops=1)
  Buffers: local read=6 written=1
  ->  Index Scan using stores_owner_id_idx on stores s  (cost=0.29..16.66 rows=1 width=49) (actual time=0.087..0.087 rows=1 loops=1)
        Index Cond: (owner_id = 'u1'::text)
        Buffers: local read=6 written=1
        SubPlan 1
          ->  Incremental Sort  (cost=8.31..8.36 rows=2 width=17) (actual time=0.038..0.039 rows=1 loops=1)
                Sort Key: i.sort, i.id
                Presorted Key: i.sort
                Full-sort Groups: 1  Sort Method: quicksort  Average Memory: 25kB  Peak Memory: 25kB
                Buffers: local read=3
                ->  Index Scan using store_items_store_id_sort_idx on store_items i  (cost=0.29..8.30 rows=1 width=17) (actual time=0.025..0.026 rows=1 loops=1)
                      Index Cond: (store_id = s.id)
                      Buffers: local read=3
Planning:
  Buffers: shared hit=99, local read=8 written=8
Planning Time: 47.959 ms
Execution Time: 0.118 ms

need matches candidates:
Incremental Sort  (cost=11.50..2022.49 rows=200 width=110) (actual time=1.452..5.552 rows=200 loops=1)
  Sort Key: n.updated_at DESC, n_1.id
  Presorted Key: n.updated_at
  Full-sort Groups: 7  Sort Method: quicksort  Average Memory: 29kB  Peak Memory: 29kB
  Buffers: local hit=2220 read=188 written=188
  ->  Nested Loop  (cost=1.43..2013.49 rows=200 width=110) (actual time=0.139..5.444 rows=200 loops=1)
        Buffers: local hit=2220 read=188 written=188
        ->  Limit  (cost=1.14..348.99 rows=200 width=13) (actual time=0.109..4.115 rows=200 loops=1)
              Buffers: local hit=1667 read=141 written=141
              ->  Nested Loop Semi Join  (cost=1.14..6956.44 rows=3999 width=13) (actual time=0.108..4.097 rows=200 loops=1)
                    Buffers: local hit=1667 read=141 written=141
                    ->  Index Scan using needs_status_updated_at_id_idx on needs n  (cost=0.29..1157.91 rows=3999 width=18) (actual time=0.036..0.115 rows=200 loops=1)
                          Index Cond: (status = 'open'::need_status)
                          Filter: ((store_id <> 's1'::text) AND (owner_id <> 'u1'::text) AND ((field = 'Food'::text) OR (province = 'P'::text)))
                          Buffers: local hit=6 read=2 written=2
                    ->  Nested Loop Semi Join  (cost=0.86..1.44 rows=1 width=5) (actual time=0.020..0.020 rows=1 loops=200)
                          Buffers: local hit=1661 read=139 written=139
                          ->  Index Scan using stores_pkey on stores s  (cost=0.29..0.67 rows=1 width=10) (actual time=0.007..0.007 rows=1 loops=200)
                                Index Cond: (id = n.store_id)
                                Filter: (status = 'published'::store_status)
                                Buffers: local hit=551 read=49 written=49
                          ->  Nested Loop  (cost=0.57..0.76 rows=1 width=10) (actual time=0.013..0.013 rows=1 loops=200)
                                Buffers: local hit=1110 read=90 written=90
                                ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=200)
                                      Index Cond: (user_id = s.owner_id)
                                      Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 17:04:40.58+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                      Buffers: local hit=557 read=43 written=43
                                ->  Index Scan using users_pkey on users owner  (cost=0.29..0.39 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=200)
                                      Index Cond: (id = f.user_id)
                                      Filter: (deleted_at IS NULL)
                                      Buffers: local hit=553 read=47 written=47
        ->  Limit  (cost=0.29..8.30 rows=1 width=102) (actual time=0.006..0.006 rows=1 loops=200)
              Buffers: local hit=553 read=47 written=47
              ->  Index Scan using needs_pkey on needs n_1  (cost=0.29..8.30 rows=1 width=102) (actual time=0.006..0.006 rows=1 loops=200)
                    Index Cond: (id = n.id)
                    Buffers: local hit=553 read=47 written=47
Planning:
  Buffers: shared hit=228, local hit=27 read=31 written=31
Planning Time: 113.898 ms
Execution Time: 5.649 ms
```
