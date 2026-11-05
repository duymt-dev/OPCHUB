# TIP-V46-805 - query-plan evidence

Target: owner-approved private test DB, PostgreSQL native; no public/native DB reset.
Source: `apps/server/test/membership-fee/renewal-plan.int.spec.ts`, final targeted run `test-results/v46-805-int-scope-r4.log` (29/29 passed).

The test clones all deployed constraints/indexes via `LIKE public.<table> INCLUDING ALL` into session-local TEMP tables, inserts 10,000 users, 10,000 fees and 10,000 reminders, then VACUUM ANALYZE. It executes the **same exported SQL** as production (`renewal-query.ts`), not a simplified surrogate. No planner flags, dropped indexes or forced scan settings. 100 eligible fees / 10,000; typical window selectivity is explicit, not a universal performance promise.

List/keyset select bounded IDs before payload/user/reminder lookups. The partial covering index is `(valid_until,user_id) INCLUDE(plan,amount,paid_at)` with eligibility status/plan constants in its predicate. Latest-send lookup uses `(user_id,sent_at DESC)`; milestone history uses the existing PK. Scalar/lateral bounded lookups prevent a hash join from scanning all users/history before LIMIT.

R3 exposed an actual candidate-500 Seq Scan (7.383 ms on that sample); production SQL was corrected, not the assertion. R4 below proves absence of Seq Scan on all three relations for list, keyset, candidates and count. Runtime varies with contention/cache; index use is the tested invariant.

## list

```text
Sort  (cost=726.14..726.19 rows=21 width=157) (actual time=1.883..1.886 rows=21 loops=1)
  Sort Key: membership_fees.valid_until, membership_fees.user_id
  Sort Method: quicksort  Memory: 27kB
  Buffers: local hit=212 read=65 written=65
  ->  Nested Loop  (cost=0.87..725.68 rows=21 width=157) (actual time=0.343..1.852 rows=21 loops=1)
        Buffers: local hit=212 read=65 written=65
        ->  Nested Loop  (cost=0.57..528.17 rows=21 width=37) (actual time=0.210..0.809 rows=21 loops=1)
              Buffers: local hit=99 read=30 written=30
              ->  Limit  (cost=0.29..353.40 rows=21 width=21) (actual time=0.169..0.465 rows=21 loops=1)
                    Buffers: local hit=50 read=16 written=16
                    ->  Index Only Scan using membership_fees_valid_until_user_id_plan_amount_paid_at_idx on membership_fees f  (cost=0.29..841.04 rows=50 width=21) (actual time=0.168..0.461 rows=21 loops=1)
                          Index Cond: ((valid_until >= '2097-12-01 17:00:00+00'::timestamp with time zone) AND (valid_until < '2097-12-31 17:00:00+00'::timestamp with time zone))
                          Filter: (SubPlan 3)
                          Heap Fetches: 0
                          Buffers: local hit=50 read=16 written=16
                          SubPlan 3
                            ->  Limit  (cost=0.29..8.31 rows=1 width=1) (actual time=0.017..0.017 rows=1 loops=21)
                                  Buffers: local hit=49 read=14 written=14
                                  ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.31 rows=1 width=1) (actual time=0.017..0.017 rows=1 loops=21)
                                        Index Cond: (id = f.user_id)
                                        Filter: ((deleted_at IS NULL) AND (account_type <> 'investor'::account_type) AND (status = 'active'::user_status))
                                        Buffers: local hit=49 read=14 written=14
              ->  Limit  (cost=0.29..8.30 rows=1 width=37) (actual time=0.016..0.016 rows=1 loops=21)
                    Buffers: local hit=49 read=14 written=14
                    ->  Index Scan using membership_fees_pkey on membership_fees  (cost=0.29..8.30 rows=1 width=37) (actual time=0.015..0.015 rows=1 loops=21)
                          Index Cond: (user_id = f.user_id)
                          Buffers: local hit=49 read=14 written=14
        ->  Memoize  (cost=0.30..8.32 rows=1 width=87) (actual time=0.006..0.007 rows=1 loops=21)
              Cache Key: membership_fees.user_id
              Cache Mode: binary
              Hits: 0  Misses: 21  Evictions: 0  Overflows: 0  Memory Usage: 4kB
              Buffers: local hit=63
              ->  Subquery Scan on u  (cost=0.29..8.31 rows=1 width=87) (actual time=0.005..0.005 rows=1 loops=21)
                    Buffers: local hit=63
                    ->  Limit  (cost=0.29..8.30 rows=1 width=119) (actual time=0.005..0.005 rows=1 loops=21)
                          Buffers: local hit=63
                          ->  Index Scan using users_pkey on users  (cost=0.29..8.30 rows=1 width=119) (actual time=0.005..0.005 rows=1 loops=21)
                                Index Cond: (id = membership_fees.user_id)
                                Buffers: local hit=63
        SubPlan 1
          ->  Limit  (cost=0.29..4.30 rows=1 width=8) (actual time=0.025..0.025 rows=1 loops=21)
                Buffers: local hit=26 read=17 written=17
                ->  Index Only Scan using fee_reminders_user_id_sent_at_idx on fee_reminders r  (cost=0.29..4.30 rows=1 width=8) (actual time=0.024..0.024 rows=1 loops=21)
                      Index Cond: (user_id = membership_fees.user_id)
                      Heap Fetches: 0
                      Buffers: local hit=26 read=17 written=17
        SubPlan 2
          ->  Index Only Scan using fee_reminders_pkey on fee_reminders r_1  (cost=0.29..4.30 rows=1 width=4) (actual time=0.015..0.015 rows=0 loops=21)
                Index Cond: ((user_id = membership_fees.user_id) AND (valid_until = membership_fees.valid_until))
                Heap Fetches: 0
                Buffers: local hit=24 read=18 written=18
Planning:
  Buffers: shared hit=208, local hit=15 read=5 written=5
Planning Time: 124.028 ms
Execution Time: 1.999 ms
```

## keyset

```text
Sort  (cost=729.88..729.94 rows=21 width=157) (actual time=1.174..1.177 rows=21 loops=1)
  Sort Key: membership_fees.valid_until, membership_fees.user_id
  Sort Method: quicksort  Memory: 27kB
  Buffers: local hit=233 read=44 written=44
  ->  Nested Loop  (cost=0.87..729.42 rows=21 width=157) (actual time=0.106..1.151 rows=21 loops=1)
        Buffers: local hit=233 read=44 written=44
        ->  Nested Loop  (cost=0.57..531.92 rows=21 width=37) (actual time=0.068..0.471 rows=21 loops=1)
              Buffers: local hit=111 read=18 written=18
              ->  Limit  (cost=0.29..357.14 rows=21 width=21) (actual time=0.056..0.267 rows=21 loops=1)
                    Buffers: local hit=57 read=9 written=9
                    ->  Index Only Scan using membership_fees_valid_until_user_id_plan_amount_paid_at_idx on membership_fees f  (cost=0.29..832.96 rows=49 width=21) (actual time=0.055..0.264 rows=21 loops=1)
                          Index Cond: ((valid_until >= '2097-12-01 17:00:00+00'::timestamp with time zone) AND (valid_until < '2097-12-31 17:00:00+00'::timestamp with time zone) AND (ROW(valid_until, user_id) > ROW('2097-12-13 01:00:00+00'::timestamp with time zone, 'renewal-u20'::text)))
                          Filter: (SubPlan 3)
                          Heap Fetches: 0
                          Buffers: local hit=57 read=9 written=9
                          SubPlan 3
                            ->  Limit  (cost=0.29..8.31 rows=1 width=1) (actual time=0.010..0.010 rows=1 loops=21)
                                  Buffers: local hit=54 read=9 written=9
                                  ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.31 rows=1 width=1) (actual time=0.009..0.009 rows=1 loops=21)
                                        Index Cond: (id = f.user_id)
                                        Filter: ((deleted_at IS NULL) AND (account_type <> 'investor'::account_type) AND (status = 'active'::user_status))
                                        Buffers: local hit=54 read=9 written=9
              ->  Limit  (cost=0.29..8.30 rows=1 width=37) (actual time=0.009..0.009 rows=1 loops=21)
                    Buffers: local hit=54 read=9 written=9
                    ->  Index Scan using membership_fees_pkey on membership_fees  (cost=0.29..8.30 rows=1 width=37) (actual time=0.009..0.009 rows=1 loops=21)
                          Index Cond: (user_id = f.user_id)
                          Buffers: local hit=54 read=9 written=9
        ->  Memoize  (cost=0.30..8.32 rows=1 width=87) (actual time=0.006..0.006 rows=1 loops=21)
              Cache Key: membership_fees.user_id
              Cache Mode: binary
              Hits: 0  Misses: 21  Evictions: 0  Overflows: 0  Memory Usage: 4kB
              Buffers: local hit=63
              ->  Subquery Scan on u  (cost=0.29..8.31 rows=1 width=87) (actual time=0.005..0.005 rows=1 loops=21)
                    Buffers: local hit=63
                    ->  Limit  (cost=0.29..8.30 rows=1 width=119) (actual time=0.005..0.005 rows=1 loops=21)
                          Buffers: local hit=63
                          ->  Index Scan using users_pkey on users  (cost=0.29..8.30 rows=1 width=119) (actual time=0.004..0.004 rows=1 loops=21)
                                Index Cond: (id = membership_fees.user_id)
                                Buffers: local hit=63
        SubPlan 1
          ->  Limit  (cost=0.29..4.30 rows=1 width=8) (actual time=0.013..0.013 rows=1 loops=21)
                Buffers: local hit=30 read=13 written=13
                ->  Index Only Scan using fee_reminders_user_id_sent_at_idx on fee_reminders r  (cost=0.29..4.30 rows=1 width=8) (actual time=0.012..0.012 rows=1 loops=21)
                      Index Cond: (user_id = membership_fees.user_id)
                      Heap Fetches: 0
                      Buffers: local hit=30 read=13 written=13
        SubPlan 2
          ->  Index Only Scan using fee_reminders_pkey on fee_reminders r_1  (cost=0.29..4.30 rows=1 width=4) (actual time=0.011..0.011 rows=0 loops=21)
                Index Cond: ((user_id = membership_fees.user_id) AND (valid_until = membership_fees.valid_until))
                Heap Fetches: 0
                Buffers: local hit=29 read=13 written=13
Planning:
  Buffers: shared hit=3, local hit=2
Planning Time: 0.633 ms
Execution Time: 1.263 ms
```

## candidates

```text
Sort  (cost=1706.65..1706.77 rows=50 width=157) (actual time=16.730..16.736 rows=100 loops=1)
  Sort Key: membership_fees.valid_until, membership_fees.user_id
  Sort Method: quicksort  Memory: 39kB
  Buffers: local hit=1111 read=194 written=176
  ->  Nested Loop  (cost=0.87..1705.24 rows=50 width=157) (actual time=0.096..16.640 rows=100 loops=1)
        Buffers: local hit=1111 read=194 written=176
        ->  Nested Loop  (cost=0.57..1257.16 rows=50 width=37) (actual time=0.058..13.280 rows=100 loops=1)
              Buffers: local hit=521 read=83 written=78
              ->  Limit  (cost=0.29..841.04 rows=50 width=21) (actual time=0.047..1.198 rows=100 loops=1)
                    Buffers: local hit=262 read=42 written=39
                    ->  Index Only Scan using membership_fees_valid_until_user_id_plan_amount_paid_at_idx on membership_fees f  (cost=0.29..841.04 rows=50 width=21) (actual time=0.046..1.185 rows=100 loops=1)
                          Index Cond: ((valid_until >= '2097-12-01 17:00:00+00'::timestamp with time zone) AND (valid_until < '2097-12-31 17:00:00+00'::timestamp with time zone))
                          Filter: (SubPlan 3)
                          Heap Fetches: 0
                          Buffers: local hit=262 read=42 written=39
                          SubPlan 3
                            ->  Limit  (cost=0.29..8.31 rows=1 width=1) (actual time=0.010..0.010 rows=1 loops=100)
                                  Buffers: local hit=259 read=41 written=38
                                  ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.31 rows=1 width=1) (actual time=0.010..0.010 rows=1 loops=100)
                                        Index Cond: (id = f.user_id)
                                        Filter: ((deleted_at IS NULL) AND (account_type <> 'investor'::account_type) AND (status = 'active'::user_status))
                                        Buffers: local hit=259 read=41 written=38
              ->  Limit  (cost=0.29..8.30 rows=1 width=37) (actual time=0.120..0.120 rows=1 loops=100)
                    Buffers: local hit=259 read=41 written=39
                    ->  Index Scan using membership_fees_pkey on membership_fees  (cost=0.29..8.30 rows=1 width=37) (actual time=0.119..0.119 rows=1 loops=100)
                          Index Cond: (user_id = f.user_id)
                          Buffers: local hit=259 read=41 written=39
        ->  Memoize  (cost=0.30..8.32 rows=1 width=87) (actual time=0.008..0.008 rows=1 loops=100)
              Cache Key: membership_fees.user_id
              Cache Mode: binary
              Hits: 0  Misses: 100  Evictions: 0  Overflows: 0  Memory Usage: 16kB
              Buffers: local hit=300
              ->  Subquery Scan on u  (cost=0.29..8.31 rows=1 width=87) (actual time=0.006..0.006 rows=1 loops=100)
                    Buffers: local hit=300
                    ->  Limit  (cost=0.29..8.30 rows=1 width=119) (actual time=0.006..0.006 rows=1 loops=100)
                          Buffers: local hit=300
                          ->  Index Scan using users_pkey on users  (cost=0.29..8.30 rows=1 width=119) (actual time=0.005..0.005 rows=1 loops=100)
                                Index Cond: (id = membership_fees.user_id)
                                Buffers: local hit=300
        SubPlan 1
          ->  Limit  (cost=0.29..4.30 rows=1 width=8) (actual time=0.012..0.012 rows=1 loops=100)
                Buffers: local hit=146 read=55 written=48
                ->  Index Only Scan using fee_reminders_user_id_sent_at_idx on fee_reminders r  (cost=0.29..4.30 rows=1 width=8) (actual time=0.011..0.011 rows=1 loops=100)
                      Index Cond: (user_id = membership_fees.user_id)
                      Heap Fetches: 0
                      Buffers: local hit=146 read=55 written=48
        SubPlan 2
          ->  Index Only Scan using fee_reminders_pkey on fee_reminders r_1  (cost=0.29..4.30 rows=1 width=4) (actual time=0.011..0.011 rows=0 loops=100)
                Index Cond: ((user_id = membership_fees.user_id) AND (valid_until = membership_fees.valid_until))
                Heap Fetches: 0
                Buffers: local hit=144 read=56 written=50
Planning:
  Buffers: local hit=2
Planning Time: 0.528 ms
Execution Time: 16.835 ms
```

## count

```text
Aggregate  (cost=841.16..841.17 rows=1 width=8) (actual time=0.803..0.803 rows=1 loops=1)
  Buffers: local hit=304
  ->  Index Only Scan using membership_fees_valid_until_user_id_plan_amount_paid_at_idx on membership_fees f  (cost=0.29..841.04 rows=50 width=0) (actual time=0.067..0.785 rows=100 loops=1)
        Index Cond: ((valid_until >= '2097-12-01 17:00:00+00'::timestamp with time zone) AND (valid_until < '2097-12-31 17:00:00+00'::timestamp with time zone))
        Filter: (SubPlan 1)
        Heap Fetches: 0
        Buffers: local hit=304
        SubPlan 1
          ->  Limit  (cost=0.29..8.31 rows=1 width=1) (actual time=0.007..0.007 rows=1 loops=100)
                Buffers: local hit=300
                ->  Index Scan using users_pkey on users u  (cost=0.29..8.31 rows=1 width=1) (actual time=0.006..0.006 rows=1 loops=100)
                      Index Cond: (id = f.user_id)
                      Filter: ((deleted_at IS NULL) AND (account_type <> 'investor'::account_type) AND (status = 'active'::user_status))
                      Buffers: local hit=300
Planning:
  Buffers: shared hit=3, local hit=1
Planning Time: 0.405 ms
Execution Time: 0.885 ms
```
