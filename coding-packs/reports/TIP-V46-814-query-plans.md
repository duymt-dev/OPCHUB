# TIP-V46-814 — final A17 query plan

Source ef7934ff. The final full2200/2200 integration suite executed this identical production SQL on35000 skewed fixture rows.128-ID recursive keyset pages, partial-index reads and PK cursor/update; no message Seq Scan/Hash Join/new index/planner setting; all stale IDs processed,120 retained;10000 humans/15000 other-room messages unchanged. Six new exact-page/tied-time/idempotence cases and all old persona cases pass.

```text
A17 hot-room 35000-row EXPLAIN:
Update on messages m  (cost=4528.92..4608.24 rows=0 width=0) (actual time=516.735..516.740 rows=0 loops=1)
  Buffers: shared hit=325801 read=182 dirtied=449 written=267
  InitPlan 5 (returns $6)
    ->  ProjectSet  (cost=4527.66..4528.51 rows=110 width=32) (actual time=0.154..6.241 rows=9880 loops=1)
          Buffers: shared hit=3362
          CTE batches
            ->  Recursive Union  (cost=466.99..4527.66 rows=11 width=32) (actual time=0.147..5.524 rows=78 loops=1)
                  Buffers: shared hit=3362
                  ->  Result  (cost=466.99..467.00 rows=1 width=32) (actual time=0.145..0.146 rows=1 loops=1)
                        Buffers: shared hit=18
                        InitPlan 1 (returns $1)
                          ->  Limit  (cost=226.18..466.99 rows=128 width=55) (actual time=0.096..0.132 rows=128 loops=1)
                                Buffers: shared hit=18
                                ->  Index Only Scan using messages_simulated_room_idx on messages  (cost=0.41..26887.10 rows=14291 width=55) (actual time=0.068..0.122 rows=248 loops=1)
                                      Index Cond: (room_id = '4e2fe184-4a35-446a-b100-db2934d69ac5-g-0-general'::text)
                                      Heap Fetches: 248
                                      Buffers: shared hit=18
                  ->  WorkTable Scan on batches  (cost=0.00..406.05 rows=1 width=32) (actual time=0.068..0.068 rows=1 loops=78)
                        Filter: (cardinality(ids) = 128)
                        Rows Removed by Filter: 0
                        Buffers: shared hit=3344
                        SubPlan 3
                          ->  Limit  (cost=8.85..405.80 rows=128 width=55) (actual time=0.013..0.060 rows=127 loops=77)
                                Buffers: shared hit=3344
                                InitPlan 2 (returns $3,$4)
                                  ->  Index Scan using messages_pkey on messages messages_1  (cost=0.42..8.44 rows=1 width=55) (actual time=0.007..0.008 rows=1 loops=77)
                                        Index Cond: (id = (batches.ids)[cardinality(batches.ids)])
                                        Buffers: shared hit=308
                                ->  Index Only Scan using messages_simulated_room_idx on messages messages_2  (cost=0.41..14774.65 rows=4764 width=55) (actual time=0.005..0.045 rows=127 loops=77)
                                      Index Cond: ((room_id = '4e2fe184-4a35-446a-b100-db2934d69ac5-g-0-general'::text) AND (ROW(created_at, id) < ROW($3, $4)))
                                      Heap Fetches: 9752
                                      Buffers: shared hit=3036
          ->  CTE Scan on batches batches_1  (cost=0.00..0.22 rows=11 width=32) (actual time=0.152..5.754 rows=78 loops=1)
                Buffers: shared hit=3362
  ->  Index Scan using messages_pkey on messages m  (cost=0.41..79.74 rows=10 width=22) (actual time=48.357..115.632 rows=9880 loops=1)
        Index Cond: (id = ANY ($6))
        Buffers: shared hit=36192
Planning:
  Buffers: shared hit=165 read=13
Planning Time: 9.287 ms
Trigger for constraint messages_room_id_fkey: time=115.661 calls=9880
Trigger for constraint messages_persona_id_fkey: time=142.768 calls=9880
Execution Time: 778.086 ms
```

## Historical focused plans (superseded)

# TIP-V46-814 ? A17 skewed persona prune

Actual fixture:10000 simulated +10000 member messages in the target room,50 other rooms?300 simulated. Existing integration rows remain; the measured table contains about55028 rows. No index/planner setting added. The same exported SQL fragment is used by production and EXPLAIN.

## Reproduction and correction

The original update joined all stale IDs and selected Hash Join/Seq Scan on messages. A boundary seek alone still allowed that outer hash update (failed intermediate run retained). The corrected query seeks the120th (created_at,id) boundary and collects stale IDs into a statement-local array before primary-key updates. The final plan has the partial index plus messages_pkey, no message Seq Scan or Hash Join. Exactly120 target simulated messages remain;10000 target humans and15000 background simulated remain unchanged.

Focused real DB:25/25 PASS (new skew, all old persona-turn cases, B12 appointment suite). Full integration/A22 still pending at report creation. Final source SHA will be recorded with gate results.

## Actual corrected EXPLAIN (ANALYZE, BUFFERS)

```text
A17 hot-room 35000-row EXPLAIN:
Update on messages m  (cost=7669.23..7728.96 rows=0 width=0) (actual time=606.850..606.852 rows=0 loops=1)
  Buffers: shared hit=304278 read=101 dirtied=379 written=279
  InitPlan 1 (returns $2)
    ->  Nested Loop  (cost=1630.67..7668.82 rows=3068 width=46) (actual time=1.062..3.137 rows=9880 loops=1)
          Buffers: shared hit=573
          ->  Limit  (cost=242.81..244.84 rows=1 width=54) (actual time=0.098..0.098 rows=1 loops=1)
                Buffers: shared hit=10
                ->  Index Only Scan using messages_simulated_room_idx on messages messages_1  (cost=0.41..18748.36 rows=9204 width=54) (actual time=0.069..0.095 rows=120 loops=1)
                      Index Cond: (room_id = 'af63eaeb-0dbc-474f-bdc0-5b2e141b4614-g-0-general'::text)
                      Heap Fetches: 120
                      Buffers: shared hit=10
          ->  Bitmap Heap Scan on messages  (cost=1387.86..7393.29 rows=3068 width=54) (actual time=0.961..2.533 rows=9880 loops=1)
                Recheck Cond: ((room_id = 'af63eaeb-0dbc-474f-bdc0-5b2e141b4614-g-0-general'::text) AND (ROW(created_at, id) < ROW(messages_1.created_at, messages_1.id)) AND is_simulated AND (deleted_at IS NULL))
                Heap Blocks: exact=260
                Buffers: shared hit=563
                ->  Bitmap Index Scan on messages_simulated_room_idx  (cost=0.00..1387.09 rows=3068 width=0) (actual time=0.935..0.935 rows=9880 loops=1)
                      Index Cond: ((room_id = 'af63eaeb-0dbc-474f-bdc0-5b2e141b4614-g-0-general'::text) AND (ROW(created_at, id) < ROW(messages_1.created_at, messages_1.id)))
                      Buffers: shared hit=303
  ->  Index Scan using messages_pkey on messages m  (cost=0.41..60.15 rows=10 width=22) (actual time=44.566..118.456 rows=9880 loops=1)
        Index Cond: (id = ANY ($2))
        Buffers: shared hit=32322
Planning:
  Buffers: shared hit=150 read=11
Planning Time: 6.820 ms
Trigger for constraint messages_room_id_fkey: time=123.144 calls=9880
Trigger for constraint messages_persona_id_fkey: time=97.983 calls=9880
Execution Time: 831.288 ms
```

## Full-sweep correction (supersedes the focused plan above)

The first frozen full integration on27778a43 reproduced an inner Seq Scan when the base table was nearly empty (35018 total vs focused55028). The boundary join could flatten; ORDER BY/OFFSET0 still selected Seq Scan+Sort.128-ID recursive keyset pages now use one SQL statement, retaining the same120 newest IDs and processing all older IDs. No planner settings/index/test relaxation. Actual final focused plan:

```text
```
