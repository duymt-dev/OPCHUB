# TIP-V46-806 - query-plan evidence

Owner-approved private test DB; actual PostgreSQL EXPLAIN (ANALYZE, BUFFERS).
Production SQL checkpoint: Git `3c4f6f94`. Source: `apps/server/test/membership-fee/bank-reconcile-plan.int.spec.ts`; log `test-results/v46-806-int-final-scope.log`, 35/35 scoped integration tests passed (six files).

The test clones deployed public constraints/indexes into session-local TEMP tables, populates 10,000 users and 10,000 transactions (2KB JSON payload each), then VACUUM ANALYZE. Status distribution is 20% per status, including ignored and acknowledged short. These are the exact exported production list/keyset/count SQL queries, not simplified surrogates. No planner flags, dropped indexes or forced index scans.

List first seeks 21 bounded IDs using the partial covering `(received_at DESC,id DESC) INCLUDE(match_status)` index, then joins payload and indexed member/hint lookups. Counts use the compact partial `(match_status)` index, two equality aggregates. Pending means database unmatched, including unprocessed short-amount rows; acknowledged database short is excluded per SPEC7. The already-applied status index also contains short keys but still covers both counts; migration history is not rewritten.

Initial R2 exposed a real counts Seq Scan; a follow-up migration corrected the production path without weakening assertions. Final plans below have no Seq Scan on either relation. Cloned index names are assigned by PostgreSQL; timings/heap visibility are sample-dependent, not a universal latency guarantee.

## list

```text
Sort  (cost=515.56..515.62 rows=21 width=179) (actual time=0.646..0.648 rows=21 loops=1)
  Sort Key: p.received_at DESC, p.id DESC
  Sort Method: quicksort  Memory: 27kB
  Buffers: local hit=190 read=2 written=1
  ->  Nested Loop Left Join  (cost=16.94..515.10 rows=21 width=179) (actual time=0.125..0.636 rows=21 loops=1)
        Buffers: local hit=190 read=2 written=1
        ->  Nested Loop Left Join  (cost=0.85..176.72 rows=21 width=148) (actual time=0.026..0.203 rows=21 loops=1)
              Buffers: local hit=129
              ->  Nested Loop  (cost=0.57..168.09 rows=21 width=144) (actual time=0.020..0.117 rows=21 loops=1)
                    Buffers: local hit=66
                    ->  Limit  (cost=0.28..1.52 rows=21 width=22) (actual time=0.010..0.016 rows=21 loops=1)
                          Buffers: local hit=3
                          ->  Index Only Scan using payment_transactions_received_at_id_match_status_idx on payment_transactions  (cost=0.28..472.28 rows=8000 width=22) (actual time=0.009..0.014 rows=21 loops=1)
                                Heap Fetches: 0
                                Buffers: local hit=3
                    ->  Index Scan using payment_transactions_pkey on payment_transactions p  (cost=0.29..7.92 rows=1 width=144) (actual time=0.004..0.004 rows=1 loops=21)
                          Index Cond: (id = payment_transactions.id)
                          Buffers: local hit=63
              ->  Index Scan using users_pkey on users u  (cost=0.29..0.41 rows=1 width=24) (actual time=0.004..0.004 rows=1 loops=21)
                    Index Cond: (id = p.matched_user_id)
                    Buffers: local hit=63
        ->  Limit  (cost=16.09..16.09 rows=1 width=24) (actual time=0.019..0.019 rows=1 loops=21)
              Buffers: local hit=61 read=2 written=1
              ->  Sort  (cost=16.09..16.09 rows=2 width=24) (actual time=0.019..0.019 rows=1 loops=21)
                    Sort Key: ((users.member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text))) DESC NULLS LAST
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=61 read=2 written=1
                    ->  Bitmap Heap Scan on users  (cost=8.60..16.08 rows=2 width=24) (actual time=0.015..0.015 rows=1 loops=21)
                          Recheck Cond: (((member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text)) AND (deleted_at IS NULL)) OR (phone = ('+84'::text || SUBSTRING("substring"(p.content, '0[0-9]{9}'::text) FROM 2))))
                          Filter: (deleted_at IS NULL)
                          Heap Blocks: exact=21
                          Buffers: local hit=61 read=2 written=1
                          ->  BitmapOr  (cost=8.60..8.60 rows=2 width=0) (actual time=0.012..0.012 rows=0 loops=21)
                                Buffers: local hit=40 read=2 written=1
                                ->  Bitmap Index Scan on users_member_code_id_account_type_idx  (cost=0.00..4.30 rows=1 width=0) (actual time=0.005..0.005 rows=1 loops=21)
                                      Index Cond: (member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text))
                                      Buffers: local hit=40 read=2 written=1
                                ->  Bitmap Index Scan on users_phone_idx  (cost=0.00..4.30 rows=1 width=0) (actual time=0.000..0.000 rows=0 loops=21)
                                      Index Cond: (phone = ('+84'::text || SUBSTRING("substring"(p.content, '0[0-9]{9}'::text) FROM 2)))
Planning:
  Buffers: shared hit=217, local hit=32 read=10 written=8
Planning Time: 88.043 ms
Execution Time: 0.707 ms
```

## keyset

```text
Sort  (cost=515.63..515.68 rows=21 width=179) (actual time=0.681..0.683 rows=21 loops=1)
  Sort Key: p.received_at DESC, p.id DESC
  Sort Method: quicksort  Memory: 27kB
  Buffers: local hit=189 read=3
  ->  Nested Loop Left Join  (cost=16.94..515.17 rows=21 width=179) (actual time=0.102..0.668 rows=21 loops=1)
        Buffers: local hit=189 read=3
        ->  Nested Loop Left Join  (cost=0.85..176.78 rows=21 width=148) (actual time=0.060..0.271 rows=21 loops=1)
              Buffers: local hit=127 read=2
              ->  Nested Loop  (cost=0.57..168.15 rows=21 width=144) (actual time=0.045..0.165 rows=21 loops=1)
                    Buffers: local hit=65 read=1
                    ->  Limit  (cost=0.28..1.58 rows=21 width=22) (actual time=0.032..0.039 rows=21 loops=1)
                          Buffers: local hit=2 read=1
                          ->  Index Only Scan using payment_transactions_received_at_id_match_status_idx on payment_transactions  (cost=0.28..357.07 rows=5759 width=22) (actual time=0.031..0.037 rows=21 loops=1)
                                Index Cond: (ROW(received_at, id) < ROW('2099-01-01 02:00:00+00'::timestamp with time zone, 'bank-plan-7200'::text))
                                Heap Fetches: 0
                                Buffers: local hit=2 read=1
                    ->  Index Scan using payment_transactions_pkey on payment_transactions p  (cost=0.29..7.92 rows=1 width=144) (actual time=0.005..0.005 rows=1 loops=21)
                          Index Cond: (id = payment_transactions.id)
                          Buffers: local hit=63
              ->  Index Scan using users_pkey on users u  (cost=0.29..0.41 rows=1 width=24) (actual time=0.004..0.004 rows=1 loops=21)
                    Index Cond: (id = p.matched_user_id)
                    Buffers: local hit=62 read=1
        ->  Limit  (cost=16.09..16.09 rows=1 width=24) (actual time=0.018..0.018 rows=1 loops=21)
              Buffers: local hit=62 read=1
              ->  Sort  (cost=16.09..16.09 rows=2 width=24) (actual time=0.017..0.017 rows=1 loops=21)
                    Sort Key: ((users.member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text))) DESC NULLS LAST
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=62 read=1
                    ->  Bitmap Heap Scan on users  (cost=8.60..16.08 rows=2 width=24) (actual time=0.013..0.014 rows=1 loops=21)
                          Recheck Cond: (((member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text)) AND (deleted_at IS NULL)) OR (phone = ('+84'::text || SUBSTRING("substring"(p.content, '0[0-9]{9}'::text) FROM 2))))
                          Filter: (deleted_at IS NULL)
                          Heap Blocks: exact=21
                          Buffers: local hit=62 read=1
                          ->  BitmapOr  (cost=8.60..8.60 rows=2 width=0) (actual time=0.010..0.010 rows=0 loops=21)
                                Buffers: local hit=41 read=1
                                ->  Bitmap Index Scan on users_member_code_id_account_type_idx  (cost=0.00..4.30 rows=1 width=0) (actual time=0.005..0.005 rows=1 loops=21)
                                      Index Cond: (member_code = "substring"(upper(p.content), 'TV[0-9]{6}'::text))
                                      Buffers: local hit=41 read=1
                                ->  Bitmap Index Scan on users_phone_idx  (cost=0.00..4.30 rows=1 width=0) (actual time=0.000..0.000 rows=0 loops=21)
                                      Index Cond: (phone = ('+84'::text || SUBSTRING("substring"(p.content, '0[0-9]{9}'::text) FROM 2)))
Planning:
  Buffers: shared hit=9, local hit=26
Planning Time: 0.543 ms
Execution Time: 0.757 ms
```

## counts

```text
Result  (cost=104.58..104.59 rows=1 width=16) (actual time=0.379..0.380 rows=1 loops=1)
  Buffers: local hit=8
  InitPlan 1 (returns $0)
    ->  Aggregate  (cost=52.28..52.29 rows=1 width=8) (actual time=0.194..0.194 rows=1 loops=1)
          Buffers: local hit=4
          ->  Index Only Scan using payment_transactions_match_status_idx on payment_transactions  (cost=0.28..47.28 rows=2000 width=0) (actual time=0.009..0.115 rows=2000 loops=1)
                Index Cond: (match_status = 'matched'::payment_match_status)
                Heap Fetches: 0
                Buffers: local hit=4
  InitPlan 2 (returns $1)
    ->  Aggregate  (cost=52.28..52.29 rows=1 width=8) (actual time=0.184..0.184 rows=1 loops=1)
          Buffers: local hit=4
          ->  Index Only Scan using payment_transactions_match_status_idx on payment_transactions payment_transactions_1  (cost=0.28..47.28 rows=2000 width=0) (actual time=0.005..0.111 rows=2000 loops=1)
                Index Cond: (match_status = 'unmatched'::payment_match_status)
                Heap Fetches: 0
                Buffers: local hit=4
Planning:
  Buffers: shared hit=3
Planning Time: 0.158 ms
Execution Time: 0.411 ms
```

