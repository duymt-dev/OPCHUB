# TIP-V46-811 — actual PostgreSQL plan evidence

Source: ai-plans.int.spec.ts, private test DB,10k rows in each connection-local table cloned INCLUDING ALL from migrated real indexes. Exact exported production retention/upsert query; no planner forcing.

```text
AI retention plan:
Delete on llm_calls c  (cost=0.57..174.23 rows=0 width=0) (actual time=0.121..0.122 rows=0 loops=1)
  Buffers: local hit=75
  ->  Nested Loop  (cost=0.57..174.23 rows=18 width=34) (actual time=0.025..0.113 rows=18 loops=1)
        Buffers: local hit=57
        ->  Subquery Scan on old  (cost=0.29..36.78 rows=18 width=32) (actual time=0.011..0.021 rows=18 loops=1)
              Buffers: local hit=3
              ->  Limit  (cost=0.29..36.60 rows=18 width=12) (actual time=0.007..0.012 rows=18 loops=1)
                    Buffers: local hit=3
                    ->  Index Only Scan using llm_calls_created_at_id_idx on llm_calls  (cost=0.29..36.60 rows=18 width=12) (actual time=0.006..0.010 rows=18 loops=1)
                          Index Cond: (created_at < '2040-01-20 00:00:00+00'::timestamp with time zone)
                          Heap Fetches: 18
                          Buffers: local hit=3
        ->  Index Scan using llm_calls_pkey on llm_calls c  (cost=0.29..7.64 rows=1 width=10) (actual time=0.005..0.005 rows=1 loops=18)
              Index Cond: (id = old.id)
              Buffers: local hit=54
Planning:
  Buffers: shared hit=43, local hit=11
Planning Time: 39.704 ms
Execution Time: 0.162 ms
AI usage plan:
Insert on llm_usage_months  (cost=0.00..0.01 rows=0 width=0) (actual time=13.578..13.578 rows=0 loops=1)
  Conflict Resolution: UPDATE
  Conflict Arbiter Indexes: llm_usage_months_pkey
  Tuples Inserted: 0
  Conflicting Tuples: 1
  Buffers: local hit=11
  ->  Result  (cost=0.00..0.01 rows=1 width=64) (actual time=0.001..0.001 rows=1 loops=1)
Planning:
  Buffers: shared hit=3
Planning Time: 0.036 ms
Execution Time: 13.595 ms
```
