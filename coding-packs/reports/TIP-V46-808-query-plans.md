# TIP-V46-808 actual query plans

Private test database, PostgreSQL16;10,000 rows per searched domain, including groups.
Connection-local LIKE INCLUDING ALL clones retain real migrated indexes; PostgreSQL names
cloned expression indexes automatically. No planner flags, production statistics changes,
clock mocking, cache tricks, timeout changes or relaxed assertions.

| Domain | Query | Execution ms |
|---|---|---|
| stores | >=3 chars | 0.694 |
| stores | 2 chars (target <50ms) | 33.527 |
| needs | >=3 chars | 0.639 |
| needs | 2 chars (target <50ms) | 37.967 |
| projects | >=3 chars | 1.949 |
| projects | 2 chars (target <50ms) | 35.195 |
| groups | >=3 chars | 0.284 |
| groups | 2 chars (target <50ms) | 29.604 |
| users | >=3 chars | 0.315 |
| users | 2 chars (target <50ms) | 34.067 |

Five >=3-character statements use Bitmap Index Scan, with no Seq Scan on the searched
table. All five measured two-character `Ne` statements are below50ms in this final scoped
run. These are actual measurements, not guarantees for every query or host load.

## Two-character needs refinement

Initial needs measurements were78.966ms (isolated run) and101.447ms (loaded full run).
`need-search-short.query.ts` preserves one SQL and the exact ranking/visibility rules:
find at most4 eligible prefixes, evaluate fallback only for remaining slots, exclude only
selected IDs, then limit ranked IDs BEFORE the payload join. The count is of the bounded
prefix CTE, never a total. Two-character GIN scans can still be nonselective; no false
claim of a selective trigram is made. General >=3-character SQL/index expression unchanged.

Exact old/new equality tests cover `Ne`, `Ot`, `fe`, `%_` for both Portal and Admin.
9/9 plan/equivalence tests and the complete scoped38/38 passed. Earlier measurements
remain in ignored logs `v46-808-search-plans.log` and `v46-808-full-integration.log`.
Final full rerun evidence is recorded in the completion report.

```text
stores >=3 chars:
Sort  (cost=60.68..60.68 rows=1 width=36) (actual time=0.593..0.595 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(s.name) ~~* 'Needle%'::text)) DESC, s.updated_at DESC, s.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=37 read=15 written=15
  ->  Nested Loop  (cost=52.38..60.67 rows=1 width=36) (actual time=0.510..0.583 rows=4 loops=1)
        Buffers: local hit=37 read=15 written=15
        ->  Limit  (cost=52.10..52.10 rows=1 width=14) (actual time=0.460..0.463 rows=4 loops=1)
              Buffers: local hit=28 read=12 written=12
              ->  Sort  (cost=52.10..52.10 rows=1 width=14) (actual time=0.459..0.461 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(s_1.name) ~~* 'Needle%'::text)) DESC, s_1.updated_at DESC, s_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=28 read=12 written=12
                    ->  Nested Loop Semi Join  (cost=39.43..52.09 rows=1 width=14) (actual time=0.269..0.444 rows=5 loops=1)
                          Buffers: local hit=28 read=12 written=12
                          ->  Bitmap Heap Scan on stores s_1  (cost=38.86..43.14 rows=1 width=34) (actual time=0.176..0.193 rows=5 loops=1)
                                Recheck Cond: (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                Filter: (status = 'published'::store_status)
                                Heap Blocks: exact=1
                                Buffers: local hit=7 read=3 written=3
                                ->  Bitmap Index Scan on stores_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.043..0.043 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=2 written=2
                          ->  Nested Loop  (cost=0.57..8.69 rows=1 width=10) (actual time=0.037..0.037 rows=1 loops=5)
                                Join Filter: (s_1.owner_id = f.user_id)
                                Buffers: local hit=21 read=9 written=9
                                ->  Index Scan using users_pkey on users owner  (cost=0.29..8.30 rows=1 width=5) (actual time=0.021..0.021 rows=1 loops=5)
                                      Index Cond: (id = s_1.owner_id)
                                      Filter: (deleted_at IS NULL)
                                      Buffers: local hit=10 read=5 written=5
                                ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.014..0.014 rows=1 loops=5)
                                      Index Cond: (user_id = owner.id)
                                      Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                      Buffers: local hit=11 read=4 written=4
        ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=35) (actual time=0.017..0.017 rows=1 loops=4)
              Index Cond: (id = s_1.id)
              Buffers: local hit=9 read=3 written=3
Planning:
  Buffers: shared hit=250, local hit=22 read=32 written=32
Planning Time: 138.891 ms
Execution Time: 0.694 ms

stores 2 chars (target <50ms):
Sort  (cost=3080.54..3080.55 rows=1 width=36) (actual time=33.464..33.467 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(s.name) ~~* 'Ne%'::text)) DESC, s.updated_at DESC, s.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=43 read=312 written=195
  ->  Nested Loop  (cost=3072.25..3080.53 rows=1 width=36) (actual time=33.420..33.455 rows=4 loops=1)
        Buffers: local hit=43 read=312 written=195
        ->  Limit  (cost=3071.96..3071.97 rows=1 width=14) (actual time=33.325..33.328 rows=4 loops=1)
              Buffers: local hit=31 read=312 written=195
              ->  Sort  (cost=3071.96..3071.97 rows=1 width=14) (actual time=33.322..33.326 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(s_1.name) ~~* 'Ne%'::text)) DESC, s_1.updated_at DESC, s_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=31 read=312 written=195
                    ->  Nested Loop Semi Join  (cost=0.57..3071.95 rows=1 width=14) (actual time=0.117..33.311 rows=5 loops=1)
                          Buffers: local hit=31 read=312 written=195
                          ->  Seq Scan on stores s_1  (cost=0.00..3063.00 rows=1 width=34) (actual time=0.066..33.192 rows=5 loops=1)
                                Filter: ((status = 'published'::store_status) AND (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Ne%'::text))
                                Rows Removed by Filter: 9995
                                Buffers: local hit=1 read=312 written=195
                          ->  Nested Loop  (cost=0.57..8.69 rows=1 width=10) (actual time=0.015..0.015 rows=1 loops=5)
                                Join Filter: (s_1.owner_id = f.user_id)
                                Buffers: local hit=30
                                ->  Index Scan using users_pkey on users owner  (cost=0.29..8.30 rows=1 width=5) (actual time=0.007..0.007 rows=1 loops=5)
                                      Index Cond: (id = s_1.owner_id)
                                      Filter: (deleted_at IS NULL)
                                      Buffers: local hit=15
                                ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                      Index Cond: (user_id = owner.id)
                                      Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                      Buffers: local hit=15
        ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=35) (actual time=0.009..0.010 rows=1 loops=4)
              Index Cond: (id = s_1.id)
              Buffers: local hit=12
Planning:
  Buffers: local hit=32
Planning Time: 1.060 ms
Execution Time: 33.527 ms

needs >=3 chars:
Sort  (cost=61.07..61.08 rows=1 width=35) (actual time=0.509..0.512 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(n.title) ~~* 'Needle%'::text)) DESC, n.updated_at DESC, n.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=60 read=11 written=7
  ->  Nested Loop  (cost=52.78..61.06 rows=1 width=35) (actual time=0.425..0.500 rows=4 loops=1)
        Buffers: local hit=60 read=11 written=7
        ->  Limit  (cost=52.49..52.50 rows=1 width=14) (actual time=0.391..0.393 rows=4 loops=1)
              Buffers: local hit=51 read=8 written=4
              ->  Sort  (cost=52.49..52.50 rows=1 width=14) (actual time=0.390..0.392 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(n_1.title) ~~* 'Needle%'::text)) DESC, n_1.updated_at DESC, n_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=51 read=8 written=4
                    ->  Nested Loop Semi Join  (cost=39.72..52.48 rows=1 width=14) (actual time=0.268..0.384 rows=5 loops=1)
                          Buffers: local hit=51 read=8 written=4
                          ->  Bitmap Heap Scan on needs n_1  (cost=38.86..43.14 rows=1 width=33) (actual time=0.204..0.220 rows=5 loops=1)
                                Recheck Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                Filter: (status = 'open'::need_status)
                                Heap Blocks: exact=1
                                Buffers: local hit=7 read=7 written=3
                                ->  Bitmap Index Scan on needs_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.124..0.125 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=6 written=2
                          ->  Nested Loop Semi Join  (cost=0.86..9.08 rows=1 width=5) (actual time=0.023..0.024 rows=1 loops=5)
                                Buffers: local hit=44 read=1 written=1
                                ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=10) (actual time=0.011..0.011 rows=1 loops=5)
                                      Index Cond: (id = n_1.store_id)
                                      Filter: (status = 'published'::store_status)
                                      Buffers: local hit=14 read=1 written=1
                                ->  Nested Loop  (cost=0.57..0.77 rows=1 width=10) (actual time=0.011..0.011 rows=1 loops=5)
                                      Buffers: local hit=30
                                      ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                            Index Cond: (user_id = s.owner_id)
                                            Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                            Buffers: local hit=15
                                      ->  Index Scan using users_pkey on users owner  (cost=0.29..0.39 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                            Index Cond: (id = f.user_id)
                                            Filter: (deleted_at IS NULL)
                                            Buffers: local hit=15
        ->  Index Scan using needs_pkey on needs n  (cost=0.29..8.30 rows=1 width=34) (actual time=0.015..0.015 rows=1 loops=4)
              Index Cond: (id = n_1.id)
              Buffers: local hit=9 read=3 written=3
Planning:
  Buffers: shared hit=56, local hit=36 read=13
Planning Time: 31.975 ms
Execution Time: 0.639 ms

needs 2 chars (target <50ms):
Limit  (cost=1103.80..1136.77 rows=4 width=43) (actual time=37.680..37.756 rows=4 loops=1)
  Buffers: local hit=61 read=199 written=30
  CTE prefix_hits
    ->  Limit  (cost=35.13..35.13 rows=1 width=13) (actual time=37.624..37.627 rows=4 loops=1)
          Buffers: local hit=49 read=199 written=30
          ->  Sort  (cost=35.13..35.13 rows=1 width=13) (actual time=37.623..37.625 rows=4 loops=1)
                Sort Key: n_2.updated_at DESC, n_2.id
                Sort Method: quicksort  Memory: 25kB
                Buffers: local hit=49 read=199 written=30
                ->  Nested Loop Semi Join  (cost=22.35..35.12 rows=1 width=13) (actual time=1.006..37.609 rows=5 loops=1)
                      Buffers: local hit=49 read=199 written=30
                      ->  Bitmap Heap Scan on needs n_2  (cost=21.50..26.02 rows=1 width=18) (actual time=0.960..37.496 rows=5 loops=1)
                            Recheck Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* 'Ne%'::text)
                            Rows Removed by Index Recheck: 9995
                            Filter: ((status = 'open'::need_status) AND (immutable_unaccent(title) ~~* 'Ne%'::text))
                            Heap Blocks: exact=192
                            Buffers: local hit=4 read=199 written=30
                            ->  Bitmap Index Scan on needs_immutable_unaccent_idx  (cost=0.00..21.49 rows=1 width=0) (actual time=0.798..0.798 rows=10000 loops=1)
                                  Index Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* 'Ne%'::text)
                                  Buffers: local hit=3 read=8
                      ->  Nested Loop Semi Join  (cost=0.86..9.08 rows=1 width=5) (actual time=0.021..0.021 rows=1 loops=5)
                            Buffers: local hit=45
                            ->  Index Scan using stores_pkey on stores s_1  (cost=0.29..8.30 rows=1 width=10) (actual time=0.007..0.008 rows=1 loops=5)
                                  Index Cond: (id = n_2.store_id)
                                  Filter: (status = 'published'::store_status)
                                  Buffers: local hit=15
                            ->  Nested Loop  (cost=0.57..0.77 rows=1 width=10) (actual time=0.013..0.013 rows=1 loops=5)
                                  Buffers: local hit=30
                                  ->  Index Scan using membership_fees_pkey on membership_fees f_1  (cost=0.29..0.37 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                        Index Cond: (user_id = s_1.owner_id)
                                        Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                        Buffers: local hit=15
                                  ->  Index Scan using users_pkey on users owner_1  (cost=0.29..0.39 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                        Index Cond: (id = f_1.user_id)
                                        Filter: (deleted_at IS NULL)
                                        Buffers: local hit=15
  ->  Nested Loop  (cost=1068.67..1101.64 rows=4 width=43) (actual time=37.679..37.752 rows=4 loops=1)
        Buffers: local hit=61 read=199 written=30
        ->  Limit  (cost=1068.38..1068.39 rows=4 width=17) (actual time=37.654..37.657 rows=4 loops=1)
              Buffers: local hit=49 read=199 written=30
              ->  Sort  (cost=1068.38..1069.63 rows=501 width=17) (actual time=37.654..37.657 rows=4 loops=1)
                    Sort Key: (0), prefix_hits.updated_at DESC, prefix_hits.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=49 read=199 written=30
                    ->  Append  (cost=0.00..1060.87 rows=501 width=17) (actual time=37.628..37.642 rows=4 loops=1)
                          Buffers: local hit=49 read=199 written=30
                          ->  CTE Scan on prefix_hits  (cost=0.00..0.02 rows=1 width=44) (actual time=37.627..37.629 rows=4 loops=1)
                                Buffers: local hit=49 read=199 written=30
                          ->  Subquery Scan on fallback_hits  (cost=1.20..1058.34 rows=500 width=17) (actual time=0.008..0.010 rows=0 loops=1)
                                ->  Limit  (cost=1.20..1053.34 rows=500 width=13) (actual time=0.007..0.009 rows=0 loops=1)
                                      InitPlan 3 (returns $5)
                                        ->  Aggregate  (cost=0.02..0.04 rows=1 width=8) (actual time=0.005..0.006 rows=1 loops=1)
                                              ->  CTE Scan on prefix_hits prefix_hits_2  (cost=0.00..0.02 rows=1 width=0) (actual time=0.001..0.001 rows=4 loops=1)
                                      ->  Nested Loop Semi Join  (cost=1.16..10522.60 rows=5000 width=13) (never executed)
                                            ->  Index Scan using needs_status_updated_at_id_idx on needs n_1  (cost=0.31..3614.99 rows=5000 width=18) (never executed)
                                                  Index Cond: (status = 'open'::need_status)
                                                  Filter: ((NOT (hashed SubPlan 2)) AND (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Ne%'::text))
                                                  SubPlan 2
                                                    ->  CTE Scan on prefix_hits prefix_hits_1  (cost=0.00..0.02 rows=1 width=32) (never executed)
                                            ->  Nested Loop Semi Join  (cost=0.86..1.37 rows=1 width=5) (never executed)
                                                  ->  Index Scan using stores_pkey on stores s  (cost=0.29..0.59 rows=1 width=10) (never executed)
                                                        Index Cond: (id = n_1.store_id)
                                                        Filter: (status = 'published'::store_status)
                                                  ->  Nested Loop  (cost=0.57..0.77 rows=1 width=10) (never executed)
                                                        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (never executed)
                                                              Index Cond: (user_id = s.owner_id)
                                                              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                                        ->  Index Scan using users_pkey on users owner  (cost=0.29..0.39 rows=1 width=5) (never executed)
                                                              Index Cond: (id = f.user_id)
                                                              Filter: (deleted_at IS NULL)
        ->  Index Scan using needs_pkey on needs n  (cost=0.29..8.30 rows=1 width=26) (actual time=0.022..0.022 rows=1 loops=4)
              Index Cond: (id = prefix_hits.id)
              Buffers: local hit=12
Planning:
  Buffers: shared hit=8, local hit=76
Planning Time: 2.324 ms
Execution Time: 37.967 ms

projects >=3 chars:
Sort  (cost=185.09..185.10 rows=2 width=68) (actual time=1.806..1.810 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(p.name) ~~* 'Needle%'::text)) DESC, p.published_at DESC, p.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=48 read=4
  ->  Nested Loop Left Join  (cost=168.01..185.08 rows=2 width=68) (actual time=0.280..1.790 rows=4 loops=1)
        Buffers: local hit=48 read=4
        ->  Nested Loop  (cost=167.86..184.21 rows=2 width=68) (actual time=0.253..0.296 rows=4 loops=1)
              Buffers: local hit=48 read=4
              ->  Limit  (cost=167.58..167.58 rows=2 width=14) (actual time=0.242..0.247 rows=4 loops=1)
                    Buffers: local hit=39 read=1
                    ->  Sort  (cost=167.58..167.58 rows=2 width=14) (actual time=0.242..0.245 rows=4 loops=1)
                          Sort Key: ((immutable_unaccent(p_1.name) ~~* 'Needle%'::text)) DESC, p_1.published_at DESC, p_1.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: local hit=39 read=1
                          ->  Bitmap Heap Scan on projects p_1  (cost=38.87..167.57 rows=2 width=14) (actual time=0.159..0.236 rows=5 loops=1)
                                Recheck Cond: ((immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Needle%'::text) AND (deleted_at IS NULL))
                                Filter: ((status = 'published'::project_status) AND ((owner_id = 'viewer'::text) OR (SubPlan 3)))
                                Heap Blocks: exact=1
                                Buffers: local hit=39 read=1
                                ->  Bitmap Index Scan on projects_immutable_unaccent_idx  (cost=0.00..38.87 rows=3 width=0) (actual time=0.015..0.015 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Needle%'::text)
                                      Buffers: local hit=9
                                SubPlan 3
                                  ->  Nested Loop  (cost=22.73..38.79 rows=1 width=0) (actual time=0.014..0.014 rows=1 loops=5)
                                        Buffers: local hit=30
                                        InitPlan 1 (returns $1)
                                          ->  Bitmap Heap Scan on project_members m  (cost=4.16..9.51 rows=1 width=0) (never executed)
                                                Recheck Cond: (project_id = p_1.id)
                                                Filter: (user_id = 'viewer'::text)
                                                ->  Bitmap Index Scan on project_members_project_id_sort_idx  (cost=0.00..4.16 rows=2 width=0) (never executed)
                                                      Index Cond: (project_id = p_1.id)
                                        InitPlan 2 (returns $4)
                                          ->  Nested Loop  (cost=0.58..12.65 rows=1 width=0) (never executed)
                                                ->  Nested Loop  (cost=0.43..12.47 rows=1 width=37) (never executed)
                                                      ->  Index Only Scan using group_members_user_id_status_created_at_group_id_idx on group_members gm  (cost=0.15..8.17 rows=1 width=32) (never executed)
                                                            Index Cond: ((user_id = 'viewer'::text) AND (status = 'member'::group_member_status))
                                                            Heap Fetches: 0
                                                      ->  Index Only Scan using groups_pkey on groups g  (cost=0.29..4.30 rows=1 width=5) (never executed)
                                                            Index Cond: (id = gm.group_id)
                                                            Heap Fetches: 0
                                                ->  Index Only Scan using project_shares_pkey on project_shares s  (cost=0.15..0.17 rows=1 width=32) (never executed)
                                                      Index Cond: ((project_id = p_1.id) AND (group_id = g.id))
                                                      Heap Fetches: 0
                                        ->  Index Scan using users_pkey on users u  (cost=0.29..8.31 rows=1 width=5) (actual time=0.007..0.007 rows=1 loops=5)
                                              Index Cond: (id = p_1.owner_id)
                                              Filter: (((p_1.visibility = 'public'::project_visibility) AND (status = 'active'::user_status)) OR $1 OR $4)
                                              Buffers: local hit=15
                                        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..8.31 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                              Index Cond: (user_id = p_1.owner_id)
                                              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                              Buffers: local hit=15
              ->  Index Scan using projects_pkey on projects p  (cost=0.29..8.30 rows=1 width=68) (actual time=0.011..0.011 rows=1 loops=4)
                    Index Cond: (id = p_1.id)
                    Buffers: local hit=9 read=3
        ->  Index Scan using categories_pkey on categories c  (cost=0.15..0.17 rows=1 width=64) (actual time=0.001..0.001 rows=0 loops=4)
              Index Cond: (id = p.category_id)
Planning:
  Buffers: shared hit=406, local hit=4 read=35
Planning Time: 113.634 ms
Execution Time: 1.949 ms

projects 2 chars (target <50ms):
Sort  (cost=89589.45..89589.46 rows=4 width=68) (actual time=35.064..35.068 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(p.name) ~~* 'Ne%'::text)) DESC, p.published_at DESC, p.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=49 read=308 written=293
  ->  Nested Loop Left Join  (cost=89554.87..89589.41 rows=4 width=68) (actual time=35.021..35.057 rows=4 loops=1)
        Buffers: local hit=49 read=308 written=293
        ->  Nested Loop  (cost=89554.72..89587.70 rows=4 width=68) (actual time=34.939..34.963 rows=4 loops=1)
              Buffers: local hit=49 read=308 written=293
              ->  Limit  (cost=89554.43..89554.44 rows=4 width=14) (actual time=34.909..34.913 rows=4 loops=1)
                    Buffers: local hit=37 read=308 written=293
                    ->  Sort  (cost=89554.43..89556.93 rows=1000 width=14) (actual time=34.907..34.911 rows=4 loops=1)
                          Sort Key: ((immutable_unaccent(p_1.name) ~~* 'Ne%'::text)) DESC, p_1.published_at DESC, p_1.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: local hit=37 read=308 written=293
                          ->  Bitmap Heap Scan on projects p_1  (cost=10915.07..89539.43 rows=1000 width=14) (actual time=2.528..34.892 rows=5 loops=1)
                                Recheck Cond: ((immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Ne%'::text) AND (deleted_at IS NULL))
                                Rows Removed by Index Recheck: 9995
                                Filter: ((status = 'published'::project_status) AND ((owner_id = 'viewer'::text) OR (SubPlan 3)))
                                Heap Blocks: exact=243
                                Buffers: local hit=37 read=308 written=293
                                ->  Bitmap Index Scan on projects_immutable_unaccent_idx  (cost=0.00..10914.82 rows=2000 width=0) (actual time=2.357..2.357 rows=10000 loops=1)
                                      Index Cond: (immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Ne%'::text)
                                      Buffers: local hit=6 read=66 written=51
                                SubPlan 3
                                  ->  Nested Loop  (cost=22.73..38.79 rows=1 width=0) (actual time=0.015..0.015 rows=1 loops=5)
                                        Buffers: local hit=30
                                        InitPlan 1 (returns $1)
                                          ->  Bitmap Heap Scan on project_members m  (cost=4.16..9.51 rows=1 width=0) (never executed)
                                                Recheck Cond: (project_id = p_1.id)
                                                Filter: (user_id = 'viewer'::text)
                                                ->  Bitmap Index Scan on project_members_project_id_sort_idx  (cost=0.00..4.16 rows=2 width=0) (never executed)
                                                      Index Cond: (project_id = p_1.id)
                                        InitPlan 2 (returns $4)
                                          ->  Nested Loop  (cost=0.58..12.65 rows=1 width=0) (never executed)
                                                ->  Nested Loop  (cost=0.43..12.47 rows=1 width=37) (never executed)
                                                      ->  Index Only Scan using group_members_user_id_status_created_at_group_id_idx on group_members gm  (cost=0.15..8.17 rows=1 width=32) (never executed)
                                                            Index Cond: ((user_id = 'viewer'::text) AND (status = 'member'::group_member_status))
                                                            Heap Fetches: 0
                                                      ->  Index Only Scan using groups_pkey on groups g  (cost=0.29..4.30 rows=1 width=5) (never executed)
                                                            Index Cond: (id = gm.group_id)
                                                            Heap Fetches: 0
                                                ->  Index Only Scan using project_shares_pkey on project_shares s  (cost=0.15..0.17 rows=1 width=32) (never executed)
                                                      Index Cond: ((project_id = p_1.id) AND (group_id = g.id))
                                                      Heap Fetches: 0
                                        ->  Index Scan using users_pkey on users u  (cost=0.29..8.31 rows=1 width=5) (actual time=0.008..0.008 rows=1 loops=5)
                                              Index Cond: (id = p_1.owner_id)
                                              Filter: (((p_1.visibility = 'public'::project_visibility) AND (status = 'active'::user_status)) OR $1 OR $4)
                                              Buffers: local hit=15
                                        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..8.31 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                              Index Cond: (user_id = p_1.owner_id)
                                              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 16:04:04.083+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                              Buffers: local hit=15
              ->  Index Scan using projects_pkey on projects p  (cost=0.29..8.30 rows=1 width=68) (actual time=0.011..0.011 rows=1 loops=4)
                    Index Cond: (id = p_1.id)
                    Buffers: local hit=12
        ->  Index Scan using categories_pkey on categories c  (cost=0.15..0.17 rows=1 width=64) (actual time=0.001..0.001 rows=0 loops=4)
              Index Cond: (id = p.category_id)
Planning:
  Buffers: local hit=23
Planning Time: 1.322 ms
Execution Time: 35.195 ms

groups >=3 chars:
Sort  (cost=60.11..60.12 rows=1 width=59) (actual time=0.239..0.241 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(g.name) ~~* 'Needle%'::text)) DESC, g.member_count DESC, g.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=26 read=4 written=4
  ->  Nested Loop  (cost=43.67..60.10 rows=1 width=59) (actual time=0.162..0.230 rows=4 loops=1)
        Buffers: local hit=26 read=4 written=4
        ->  Limit  (cost=43.39..43.39 rows=1 width=10) (actual time=0.122..0.124 rows=4 loops=1)
              Buffers: local hit=9 read=1 written=1
              ->  Sort  (cost=43.39..43.39 rows=1 width=10) (actual time=0.122..0.122 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(groups.name) ~~* 'Needle%'::text)) DESC, groups.member_count DESC, groups.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=9 read=1 written=1
                    ->  Bitmap Heap Scan on groups  (cost=38.86..43.38 rows=1 width=10) (actual time=0.092..0.114 rows=5 loops=1)
                          Recheck Cond: (immutable_unaccent(name) ~~* '%Needle%'::text)
                          Filter: (deleted_at IS NULL)
                          Heap Blocks: exact=1
                          Buffers: local hit=9 read=1 written=1
                          ->  Bitmap Index Scan on groups_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.011..0.011 rows=5 loops=1)
                                Index Cond: (immutable_unaccent(name) ~~* '%Needle%'::text)
                                Buffers: local hit=9
        ->  Index Scan using groups_pkey on groups g  (cost=0.29..8.30 rows=1 width=25) (actual time=0.014..0.014 rows=1 loops=4)
              Index Cond: (id = groups.id)
              Buffers: local hit=9 read=3 written=3
        SubPlan 1
          ->  Index Only Scan using group_members_group_id_created_at_user_id_idx on group_members gm  (cost=0.12..8.14 rows=1 width=0) (actual time=0.002..0.002 rows=0 loops=4)
                Index Cond: (group_id = g.id)
                Filter: (user_id = 'viewer'::text)
                Heap Fetches: 0
                Buffers: local hit=8
Planning:
  Buffers: shared hit=19, local hit=14 read=5 written=5
Planning Time: 0.734 ms
Execution Time: 0.284 ms

groups 2 chars (target <50ms):
Sort  (cost=2805.99..2805.99 rows=1 width=59) (actual time=29.572..29.573 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(g.name) ~~* 'Ne%'::text)) DESC, g.member_count DESC, g.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=21 read=163 written=163
  ->  Nested Loop  (cost=2789.55..2805.98 rows=1 width=59) (actual time=29.529..29.564 rows=4 loops=1)
        Buffers: local hit=21 read=163 written=163
        ->  Limit  (cost=2789.26..2789.27 rows=1 width=10) (actual time=29.441..29.443 rows=4 loops=1)
              Buffers: local hit=1 read=163 written=163
              ->  Sort  (cost=2789.26..2789.27 rows=1 width=10) (actual time=29.440..29.441 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(groups.name) ~~* 'Ne%'::text)) DESC, groups.member_count DESC, groups.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=1 read=163 written=163
                    ->  Seq Scan on groups  (cost=0.00..2789.25 rows=1 width=10) (actual time=0.062..29.428 rows=5 loops=1)
                          Filter: ((deleted_at IS NULL) AND (immutable_unaccent(name) ~~* '%Ne%'::text))
                          Rows Removed by Filter: 9995
                          Buffers: local hit=1 read=163 written=163
        ->  Index Scan using groups_pkey on groups g  (cost=0.29..8.30 rows=1 width=25) (actual time=0.008..0.008 rows=1 loops=4)
              Index Cond: (id = groups.id)
              Buffers: local hit=12
        SubPlan 1
          ->  Index Only Scan using group_members_group_id_created_at_user_id_idx on group_members gm  (cost=0.12..8.14 rows=1 width=0) (actual time=0.001..0.001 rows=0 loops=4)
                Index Cond: (group_id = g.id)
                Filter: (user_id = 'viewer'::text)
                Heap Fetches: 0
                Buffers: local hit=8
Planning:
  Buffers: local hit=19
Planning Time: 0.575 ms
Execution Time: 29.604 ms

users >=3 chars:
Sort  (cost=60.28..60.28 rows=1 width=66) (actual time=0.264..0.265 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(u.full_name) ~~* 'Needle%'::text)) DESC, u.member_code, u.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=35 read=2 written=2
  ->  Nested Loop  (cost=51.98..60.27 rows=1 width=66) (actual time=0.231..0.257 rows=4 loops=1)
        Buffers: local hit=35 read=2 written=2
        ->  Limit  (cost=51.70..51.70 rows=1 width=15) (actual time=0.205..0.206 rows=4 loops=1)
              Buffers: local hit=23 read=2 written=2
              ->  Sort  (cost=51.70..51.70 rows=1 width=15) (actual time=0.204..0.205 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(u_1.full_name) ~~* 'Needle%'::text)) DESC, u_1.member_code, u_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=23 read=2 written=2
                    ->  Nested Loop  (cost=39.15..51.69 rows=1 width=15) (actual time=0.144..0.195 rows=5 loops=1)
                          Buffers: local hit=23 read=2 written=2
                          ->  Bitmap Heap Scan on users  (cost=38.86..43.13 rows=1 width=5) (actual time=0.114..0.130 rows=5 loops=1)
                                Recheck Cond: (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Needle%'::text)
                                Filter: (deleted_at IS NULL)
                                Heap Blocks: exact=1
                                Buffers: local hit=8 read=2 written=2
                                ->  Bitmap Index Scan on users_expr_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.052..0.052 rows=5 loops=1)
                                      Index Cond: (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=2 written=2
                          ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.30 rows=1 width=29) (actual time=0.006..0.006 rows=1 loops=5)
                                Index Cond: (id = users.id)
                                Filter: ((deleted_at IS NULL) AND (account_type = ANY ('{personal,business}'::account_type[])))
                                Buffers: local hit=15
        ->  Index Scan using users_pkey on users u  (cost=0.29..8.30 rows=1 width=47) (actual time=0.004..0.004 rows=1 loops=4)
              Index Cond: (id = u_1.id)
              Buffers: local hit=12
Planning:
  Buffers: shared hit=14, local hit=21 read=1 written=1
Planning Time: 0.883 ms
Execution Time: 0.315 ms

users 2 chars (target <50ms):
Sort  (cost=2874.15..2874.16 rows=1 width=66) (actual time=34.035..34.037 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(u.full_name) ~~* 'Ne%'::text)) DESC, u.member_code, u.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=28 read=181 written=66
  ->  Nested Loop  (cost=2865.85..2874.14 rows=1 width=66) (actual time=33.998..34.028 rows=4 loops=1)
        Buffers: local hit=28 read=181 written=66
        ->  Limit  (cost=2865.57..2865.57 rows=1 width=15) (actual time=33.918..33.919 rows=4 loops=1)
              Buffers: local hit=16 read=181 written=66
              ->  Sort  (cost=2865.57..2865.57 rows=1 width=15) (actual time=33.916..33.918 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(u_1.full_name) ~~* 'Ne%'::text)) DESC, u_1.member_code, u_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=16 read=181 written=66
                    ->  Nested Loop  (cost=0.29..2865.56 rows=1 width=15) (actual time=0.063..33.905 rows=5 loops=1)
                          Buffers: local hit=16 read=181 written=66
                          ->  Seq Scan on users  (cost=0.00..2857.00 rows=1 width=5) (actual time=0.035..33.842 rows=5 loops=1)
                                Filter: ((deleted_at IS NULL) AND (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Ne%'::text))
                                Rows Removed by Filter: 9995
                                Buffers: local hit=1 read=181 written=66
                          ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.30 rows=1 width=29) (actual time=0.006..0.006 rows=1 loops=5)
                                Index Cond: (id = users.id)
                                Filter: ((deleted_at IS NULL) AND (account_type = ANY ('{personal,business}'::account_type[])))
                                Buffers: local hit=15
        ->  Index Scan using users_pkey on users u  (cost=0.29..8.30 rows=1 width=47) (actual time=0.008..0.008 rows=1 loops=4)
              Index Cond: (id = u_1.id)
              Buffers: local hit=12
Planning:
  Buffers: local hit=22
Planning Time: 0.649 ms
Execution Time: 34.067 ms
```
