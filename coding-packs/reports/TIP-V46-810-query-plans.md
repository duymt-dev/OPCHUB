# TIP-V46-810 — actual PostgreSQL query evidence

Source: store-public-plan.int.spec.ts, private test DB,10,000 wide stores and10,000 items. Connection-local temporary LIKE INCLUDING ALL tables clone actual migrated indexes; no public business fixture writes, planner flags or forced indexes. Exact exported production public-store SQL; item SQL matches Prisma storeId/order/take/select.

Both plan cases PASS (the same initial run had API failures before JSON-default normalization; that failure is retained in completion history).

```text
public store lookup:
Nested Loop Semi Join  (cost=0.86..17.00 rows=1 width=266) (actual time=0.085..0.086 rows=1 loops=1)
  Buffers: local hit=4 read=5
  ->  Index Scan using stores_slug_idx on stores s  (cost=0.29..8.30 rows=1 width=271) (actual time=0.049..0.050 rows=1 loops=1)
        Index Cond: (slug = 'plan-store-1'::text)
        Filter: (status = 'published'::store_status)
        Buffers: local read=3
  ->  Nested Loop  (cost=0.57..8.69 rows=1 width=10) (actual time=0.034..0.034 rows=1 loops=1)
        Join Filter: (s.owner_id = f.user_id)
        Buffers: local hit=4 read=2
        ->  Index Scan using users_pkey on users owner  (cost=0.29..8.30 rows=1 width=5) (actual time=0.018..0.018 rows=1 loops=1)
              Index Cond: (id = s.owner_id)
              Filter: (deleted_at IS NULL)
              Buffers: local hit=2 read=1
        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.014..0.014 rows=1 loops=1)
              Index Cond: (user_id = owner.id)
              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-06 01:03:46.521+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
              Buffers: local hit=2 read=1
Planning:
  Buffers: shared hit=301, local hit=12 read=36
Planning Time: 153.503 ms
Execution Time: 0.127 ms

public store items:
Limit  (cost=2.73..125.53 rows=50 width=865) (actual time=0.099..0.124 rows=50 loops=1)
  Buffers: local read=8
  ->  Incremental Sort  (cost=2.73..248.32 rows=100 width=865) (actual time=0.098..0.121 rows=50 loops=1)
        Sort Key: sort, id
        Presorted Key: sort
        Full-sort Groups: 2  Sort Method: quicksort  Average Memory: 57kB  Peak Memory: 57kB
        Buffers: local read=8
        ->  Index Scan using store_items_store_id_sort_idx on store_items  (cost=0.29..243.82 rows=100 width=865) (actual time=0.047..0.083 rows=51 loops=1)
              Index Cond: (store_id = 's1'::text)
              Buffers: local read=8
Planning:
  Buffers: shared hit=42, local read=2
Planning Time: 12.607 ms
Execution Time: 0.148 ms
```

Store lookup0.127ms seeks unique slug then indexed owner/fee eligibility. Items0.148ms uses existing store_id/sort index and Incremental Sort:50 results,51 index rows for the sort boundary, not10k heap payloads. Slug is itself the covering payload for collision-candidate reads (equality/range before LIKE). Wide public columns are fetched only for one visible unique store, not included in an oversized B-tree.
