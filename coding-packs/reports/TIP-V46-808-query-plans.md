# TIP-V46-808 actual query plans

Private test database only. PostgreSQL16, 10,000 rows **per domain** including groups.
Connection-local LIKE INCLUDING ALL clones retain the real migrated expression indexes;
PostgreSQL automatically names these clones `*_immutable_unaccent_idx` / `users_expr_idx`.
No planner switches, forced scans, production statistics changes, or statement timeout changes.
Each plan is the complete production domain SQL, including visibility and deferred payload join.

| Domain | Query | Execution ms |
|---|---|---|
| stores | >=3 chars | 0.564 |
| stores | 2 chars (target <50ms) | 29.428 |
| needs | >=3 chars | 0.525 |
| needs | 2 chars (target <50ms) | 78.966 |
| projects | >=3 chars | 0.436 |
| projects | 2 chars (target <50ms) | 31.422 |
| groups | >=3 chars | 0.237 |
| groups | 2 chars (target <50ms) | 24.882 |
| users | >=3 chars | 0.234 |
| users | 2 chars (target <50ms) | 31.573 |

All five >=3-character queries used Bitmap Index Scan and no Seq Scan on the searched table.
The two-character need query exceeded the advisory50ms goal in this measured run;
it matched all10,000 need titles and performed visibility joins. This is recorded, not hidden.
Final quiet rerun pending; no changed fixture/assertions/timeouts to make the result green.

```text
stores >=3 chars:
Sort  (cost=60.68..60.68 rows=1 width=36) (actual time=0.483..0.484 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(s.name) ~~* 'Needle%'::text)) DESC, s.updated_at DESC, s.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=37 read=15 written=15
  ->  Nested Loop  (cost=52.38..60.67 rows=1 width=36) (actual time=0.415..0.475 rows=4 loops=1)
        Buffers: local hit=37 read=15 written=15
        ->  Limit  (cost=52.10..52.10 rows=1 width=14) (actual time=0.383..0.385 rows=4 loops=1)
              Buffers: local hit=28 read=12 written=12
              ->  Sort  (cost=52.10..52.10 rows=1 width=14) (actual time=0.382..0.383 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(s_1.name) ~~* 'Needle%'::text)) DESC, s_1.updated_at DESC, s_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=28 read=12 written=12
                    ->  Nested Loop Semi Join  (cost=39.43..52.09 rows=1 width=14) (actual time=0.220..0.371 rows=5 loops=1)
                          Buffers: local hit=28 read=12 written=12
                          ->  Bitmap Heap Scan on stores s_1  (cost=38.86..43.14 rows=1 width=34) (actual time=0.151..0.167 rows=5 loops=1)
                                Recheck Cond: (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                Filter: (status = 'published'::store_status)
                                Heap Blocks: exact=1
                                Buffers: local hit=7 read=3 written=3
                                ->  Bitmap Index Scan on stores_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.034..0.034 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=2 written=2
                          ->  Nested Loop  (cost=0.57..8.69 rows=1 width=10) (actual time=0.030..0.030 rows=1 loops=5)
                                Join Filter: (s_1.owner_id = f.user_id)
                                Buffers: local hit=21 read=9 written=9
                                ->  Index Scan using users_pkey on users owner  (cost=0.29..8.30 rows=1 width=5) (actual time=0.017..0.017 rows=1 loops=5)
                                      Index Cond: (id = s_1.owner_id)
                                      Filter: (deleted_at IS NULL)
                                      Buffers: local hit=10 read=5 written=5
                                ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.012..0.012 rows=1 loops=5)
                                      Index Cond: (user_id = owner.id)
                                      Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                      Buffers: local hit=11 read=4 written=4
        ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=35) (actual time=0.013..0.013 rows=1 loops=4)
              Index Cond: (id = s_1.id)
              Buffers: local hit=9 read=3 written=3
Planning:
  Buffers: shared hit=251, local hit=22 read=32 written=32
Planning Time: 117.119 ms
Execution Time: 0.564 ms

stores 2 chars (target <50ms):
Sort  (cost=3080.54..3080.55 rows=1 width=36) (actual time=29.382..29.384 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(s.name) ~~* 'Ne%'::text)) DESC, s.updated_at DESC, s.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=43 read=312 written=195
  ->  Nested Loop  (cost=3072.25..3080.53 rows=1 width=36) (actual time=29.345..29.375 rows=4 loops=1)
        Buffers: local hit=43 read=312 written=195
        ->  Limit  (cost=3071.96..3071.97 rows=1 width=14) (actual time=29.270..29.273 rows=4 loops=1)
              Buffers: local hit=31 read=312 written=195
              ->  Sort  (cost=3071.96..3071.97 rows=1 width=14) (actual time=29.269..29.271 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(s_1.name) ~~* 'Ne%'::text)) DESC, s_1.updated_at DESC, s_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=31 read=312 written=195
                    ->  Nested Loop Semi Join  (cost=0.57..3071.95 rows=1 width=14) (actual time=0.075..29.259 rows=5 loops=1)
                          Buffers: local hit=31 read=312 written=195
                          ->  Seq Scan on stores s_1  (cost=0.00..3063.00 rows=1 width=34) (actual time=0.036..29.164 rows=5 loops=1)
                                Filter: ((status = 'published'::store_status) AND (immutable_unaccent(((((name || ' '::text) || field) || ' '::text) || province)) ~~* '%Ne%'::text))
                                Rows Removed by Filter: 9995
                                Buffers: local hit=1 read=312 written=195
                          ->  Nested Loop  (cost=0.57..8.69 rows=1 width=10) (actual time=0.012..0.012 rows=1 loops=5)
                                Join Filter: (s_1.owner_id = f.user_id)
                                Buffers: local hit=30
                                ->  Index Scan using users_pkey on users owner  (cost=0.29..8.30 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                      Index Cond: (id = s_1.owner_id)
                                      Filter: (deleted_at IS NULL)
                                      Buffers: local hit=15
                                ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.004..0.004 rows=1 loops=5)
                                      Index Cond: (user_id = owner.id)
                                      Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                      Buffers: local hit=15
        ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=35) (actual time=0.008..0.008 rows=1 loops=4)
              Index Cond: (id = s_1.id)
              Buffers: local hit=12
Planning:
  Buffers: local hit=32
Planning Time: 0.870 ms
Execution Time: 29.428 ms

needs >=3 chars:
Sort  (cost=61.07..61.08 rows=1 width=35) (actual time=0.426..0.428 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(n.title) ~~* 'Needle%'::text)) DESC, n.updated_at DESC, n.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=60 read=11 written=7
  ->  Nested Loop  (cost=52.78..61.06 rows=1 width=35) (actual time=0.358..0.418 rows=4 loops=1)
        Buffers: local hit=60 read=11 written=7
        ->  Limit  (cost=52.49..52.50 rows=1 width=14) (actual time=0.328..0.330 rows=4 loops=1)
              Buffers: local hit=51 read=8 written=4
              ->  Sort  (cost=52.49..52.50 rows=1 width=14) (actual time=0.327..0.328 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(n_1.title) ~~* 'Needle%'::text)) DESC, n_1.updated_at DESC, n_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=51 read=8 written=4
                    ->  Nested Loop Semi Join  (cost=39.72..52.48 rows=1 width=14) (actual time=0.212..0.321 rows=5 loops=1)
                          Buffers: local hit=51 read=8 written=4
                          ->  Bitmap Heap Scan on needs n_1  (cost=38.86..43.14 rows=1 width=33) (actual time=0.161..0.176 rows=5 loops=1)
                                Recheck Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                Filter: (status = 'open'::need_status)
                                Heap Blocks: exact=1
                                Buffers: local hit=7 read=7 written=3
                                ->  Bitmap Index Scan on needs_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.108..0.108 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=6 written=2
                          ->  Nested Loop Semi Join  (cost=0.86..9.08 rows=1 width=5) (actual time=0.021..0.021 rows=1 loops=5)
                                Buffers: local hit=44 read=1 written=1
                                ->  Index Scan using stores_pkey on stores s  (cost=0.29..8.30 rows=1 width=10) (actual time=0.009..0.009 rows=1 loops=5)
                                      Index Cond: (id = n_1.store_id)
                                      Filter: (status = 'published'::store_status)
                                      Buffers: local hit=14 read=1 written=1
                                ->  Nested Loop  (cost=0.57..0.77 rows=1 width=10) (actual time=0.011..0.011 rows=1 loops=5)
                                      Buffers: local hit=30
                                      ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..0.37 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                            Index Cond: (user_id = s.owner_id)
                                            Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                            Buffers: local hit=15
                                      ->  Index Scan using users_pkey on users owner  (cost=0.29..0.39 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                            Index Cond: (id = f.user_id)
                                            Filter: (deleted_at IS NULL)
                                            Buffers: local hit=15
        ->  Index Scan using needs_pkey on needs n  (cost=0.29..8.30 rows=1 width=34) (actual time=0.013..0.013 rows=1 loops=4)
              Index Cond: (id = n_1.id)
              Buffers: local hit=9 read=3 written=3
Planning:
  Buffers: shared hit=55, local hit=36 read=13
Planning Time: 26.240 ms
Execution Time: 0.525 ms

needs 2 chars (target <50ms):
Sort  (cost=7336.29..7336.30 rows=4 width=35) (actual time=78.749..78.753 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(n.title) ~~* 'Ne%'::text)) DESC, n.updated_at DESC, n.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=270 read=543 written=320
  ->  Nested Loop  (cost=7302.26..7336.25 rows=4 width=35) (actual time=78.714..78.745 rows=4 loops=1)
        Buffers: local hit=270 read=543 written=320
        ->  Limit  (cost=7301.98..7301.99 rows=4 width=14) (actual time=78.630..78.633 rows=4 loops=1)
              Buffers: local hit=258 read=543 written=320
              ->  Sort  (cost=7301.98..7326.98 rows=9999 width=14) (actual time=78.629..78.632 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(n_1.title) ~~* 'Ne%'::text)) DESC, n_1.updated_at DESC, n_1.id
                    Sort Method: top-N heapsort  Memory: 25kB
                    Buffers: local hit=258 read=543 written=320
                    ->  Hash Semi Join  (cost=1547.76..7151.99 rows=9999 width=14) (actual time=18.940..76.853 rows=10000 loops=1)
                          Hash Cond: (n_1.store_id = s.id)
                          Buffers: local hit=258 read=543 written=320
                          ->  Seq Scan on needs n_1  (cost=0.00..2942.00 rows=9999 width=33) (actual time=0.040..30.217 rows=10000 loops=1)
                                Filter: ((status = 'open'::need_status) AND (immutable_unaccent(((((title || ' '::text) || field) || ' '::text) || province)) ~~* '%Ne%'::text))
                                Buffers: local hit=1 read=191 written=191
                          ->  Hash  (cost=1422.76..1422.76 rows=10000 width=5) (actual time=18.786..18.788 rows=10000 loops=1)
                                Buckets: 16384  Batches: 1  Memory Usage: 499kB
                                Buffers: local hit=257 read=352 written=129
                                ->  Hash Semi Join  (cost=847.26..1422.76 rows=10000 width=5) (actual time=13.179..17.564 rows=10000 loops=1)
                                      Hash Cond: (s.owner_id = f.user_id)
                                      Buffers: local hit=257 read=352 written=129
                                      ->  Seq Scan on stores s  (cost=0.00..438.00 rows=10000 width=10) (actual time=0.005..2.500 rows=10000 loops=1)
                                            Filter: (status = 'published'::store_status)
                                            Buffers: local hit=142 read=171 written=99
                                      ->  Hash  (cost=722.26..722.26 rows=10000 width=10) (actual time=13.136..13.138 rows=10000 loops=1)
                                            Buckets: 16384  Batches: 1  Memory Usage: 556kB
                                            Buffers: local hit=115 read=181 written=30
                                            ->  Hash Join  (cost=407.00..722.26 rows=10000 width=10) (actual time=8.439..11.768 rows=10000 loops=1)
                                                  Hash Cond: (f.user_id = owner.id)
                                                  Buffers: local hit=115 read=181 written=30
                                                  ->  Seq Scan on membership_fees f  (cost=0.00..289.00 rows=10000 width=5) (actual time=0.004..1.302 rows=10000 loops=1)
                                                        Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                                        Buffers: local hit=114
                                                  ->  Hash  (cost=282.00..282.00 rows=10000 width=5) (actual time=8.396..8.396 rows=10000 loops=1)
                                                        Buckets: 16384  Batches: 1  Memory Usage: 499kB
                                                        Buffers: local hit=1 read=181 written=30
                                                        ->  Seq Scan on users owner  (cost=0.00..282.00 rows=10000 width=5) (actual time=0.004..7.163 rows=10000 loops=1)
                                                              Filter: (deleted_at IS NULL)
                                                              Buffers: local hit=1 read=181 written=30
        ->  Index Scan using needs_pkey on needs n  (cost=0.29..8.30 rows=1 width=34) (actual time=0.010..0.010 rows=1 loops=4)
              Index Cond: (id = n_1.id)
              Buffers: local hit=12
Planning:
  Buffers: local hit=44
Planning Time: 0.994 ms
Execution Time: 78.966 ms

projects >=3 chars:
Sort  (cost=185.09..185.10 rows=2 width=68) (actual time=0.336..0.338 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(p.name) ~~* 'Needle%'::text)) DESC, p.published_at DESC, p.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=46 read=6 written=6
  ->  Nested Loop Left Join  (cost=168.01..185.08 rows=2 width=68) (actual time=0.263..0.328 rows=4 loops=1)
        Buffers: local hit=46 read=6 written=6
        ->  Nested Loop  (cost=167.86..184.21 rows=2 width=68) (actual time=0.239..0.289 rows=4 loops=1)
              Buffers: local hit=46 read=6 written=6
              ->  Limit  (cost=167.58..167.58 rows=2 width=14) (actual time=0.231..0.233 rows=4 loops=1)
                    Buffers: local hit=37 read=3 written=3
                    ->  Sort  (cost=167.58..167.58 rows=2 width=14) (actual time=0.231..0.233 rows=4 loops=1)
                          Sort Key: ((immutable_unaccent(p_1.name) ~~* 'Needle%'::text)) DESC, p_1.published_at DESC, p_1.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: local hit=37 read=3 written=3
                          ->  Bitmap Heap Scan on projects p_1  (cost=38.87..167.57 rows=2 width=14) (actual time=0.152..0.225 rows=5 loops=1)
                                Recheck Cond: ((immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Needle%'::text) AND (deleted_at IS NULL))
                                Filter: ((status = 'published'::project_status) AND ((owner_id = 'viewer'::text) OR (SubPlan 3)))
                                Heap Blocks: exact=1
                                Buffers: local hit=37 read=3 written=3
                                ->  Bitmap Index Scan on projects_immutable_unaccent_idx  (cost=0.00..38.87 rows=3 width=0) (actual time=0.031..0.032 rows=5 loops=1)
                                      Index Cond: (immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=2 written=2
                                SubPlan 3
                                  ->  Nested Loop  (cost=22.73..38.79 rows=1 width=0) (actual time=0.013..0.013 rows=1 loops=5)
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
                                        ->  Index Scan using users_pkey on users u  (cost=0.29..8.31 rows=1 width=5) (actual time=0.006..0.006 rows=1 loops=5)
                                              Index Cond: (id = p_1.owner_id)
                                              Filter: (((p_1.visibility = 'public'::project_visibility) AND (status = 'active'::user_status)) OR $1 OR $4)
                                              Buffers: local hit=15
                                        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..8.31 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                              Index Cond: (user_id = p_1.owner_id)
                                              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                              Buffers: local hit=15
              ->  Index Scan using projects_pkey on projects p  (cost=0.29..8.30 rows=1 width=68) (actual time=0.013..0.013 rows=1 loops=4)
                    Index Cond: (id = p_1.id)
                    Buffers: local hit=9 read=3 written=3
        ->  Index Scan using categories_pkey on categories c  (cost=0.15..0.17 rows=1 width=64) (actual time=0.001..0.001 rows=0 loops=4)
              Index Cond: (id = p.category_id)
Planning:
  Buffers: shared hit=410, local hit=4 read=35 written=35
Planning Time: 90.454 ms
Execution Time: 0.436 ms

projects 2 chars (target <50ms):
Sort  (cost=89589.45..89589.46 rows=4 width=68) (actual time=31.333..31.336 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(p.name) ~~* 'Ne%'::text)) DESC, p.published_at DESC, p.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=47 read=310 written=208
  ->  Nested Loop Left Join  (cost=89554.87..89589.41 rows=4 width=68) (actual time=31.293..31.327 rows=4 loops=1)
        Buffers: local hit=47 read=310 written=208
        ->  Nested Loop  (cost=89554.72..89587.70 rows=4 width=68) (actual time=31.234..31.256 rows=4 loops=1)
              Buffers: local hit=47 read=310 written=208
              ->  Limit  (cost=89554.43..89554.44 rows=4 width=14) (actual time=31.211..31.215 rows=4 loops=1)
                    Buffers: local hit=35 read=310 written=208
                    ->  Sort  (cost=89554.43..89556.93 rows=1000 width=14) (actual time=31.209..31.213 rows=4 loops=1)
                          Sort Key: ((immutable_unaccent(p_1.name) ~~* 'Ne%'::text)) DESC, p_1.published_at DESC, p_1.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: local hit=35 read=310 written=208
                          ->  Bitmap Heap Scan on projects p_1  (cost=10915.07..89539.43 rows=1000 width=14) (actual time=2.520..31.200 rows=5 loops=1)
                                Recheck Cond: ((immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Ne%'::text) AND (deleted_at IS NULL))
                                Rows Removed by Index Recheck: 9995
                                Filter: ((status = 'published'::project_status) AND ((owner_id = 'viewer'::text) OR (SubPlan 3)))
                                Heap Blocks: exact=243
                                Buffers: local hit=35 read=310 written=208
                                ->  Bitmap Index Scan on projects_immutable_unaccent_idx  (cost=0.00..10914.82 rows=2000 width=0) (actual time=2.390..2.390 rows=10000 loops=1)
                                      Index Cond: (immutable_unaccent(((name || ' '::text) || summary)) ~~* '%Ne%'::text)
                                      Buffers: local hit=4 read=68 written=68
                                SubPlan 3
                                  ->  Nested Loop  (cost=22.73..38.79 rows=1 width=0) (actual time=0.013..0.013 rows=1 loops=5)
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
                                        ->  Index Scan using membership_fees_pkey on membership_fees f  (cost=0.29..8.31 rows=1 width=5) (actual time=0.005..0.005 rows=1 loops=5)
                                              Index Cond: (user_id = p_1.owner_id)
                                              Filter: (((status = ANY ('{trial,active,expiring}'::membership_fee_status[])) AND (valid_until > '2026-11-05 15:09:09.534+00'::timestamp with time zone)) OR (status = ANY ('{regional_director}'::membership_fee_status[])))
                                              Buffers: local hit=15
              ->  Index Scan using projects_pkey on projects p  (cost=0.29..8.30 rows=1 width=68) (actual time=0.009..0.009 rows=1 loops=4)
                    Index Cond: (id = p_1.id)
                    Buffers: local hit=12
        ->  Index Scan using categories_pkey on categories c  (cost=0.15..0.17 rows=1 width=64) (actual time=0.001..0.001 rows=0 loops=4)
              Index Cond: (id = p.category_id)
Planning:
  Buffers: local hit=23
Planning Time: 1.063 ms
Execution Time: 31.422 ms

groups >=3 chars:
Sort  (cost=60.11..60.12 rows=1 width=59) (actual time=0.199..0.200 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(g.name) ~~* 'Needle%'::text)) DESC, g.member_count DESC, g.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=25 read=5
  ->  Nested Loop  (cost=43.67..60.10 rows=1 width=59) (actual time=0.142..0.190 rows=4 loops=1)
        Buffers: local hit=25 read=5
        ->  Limit  (cost=43.39..43.39 rows=1 width=10) (actual time=0.105..0.106 rows=4 loops=1)
              Buffers: local hit=8 read=2
              ->  Sort  (cost=43.39..43.39 rows=1 width=10) (actual time=0.104..0.105 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(groups.name) ~~* 'Needle%'::text)) DESC, groups.member_count DESC, groups.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=8 read=2
                    ->  Bitmap Heap Scan on groups  (cost=38.86..43.38 rows=1 width=10) (actual time=0.075..0.097 rows=5 loops=1)
                          Recheck Cond: (immutable_unaccent(name) ~~* '%Needle%'::text)
                          Filter: (deleted_at IS NULL)
                          Heap Blocks: exact=1
                          Buffers: local hit=8 read=2
                          ->  Bitmap Index Scan on groups_immutable_unaccent_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.017..0.017 rows=5 loops=1)
                                Index Cond: (immutable_unaccent(name) ~~* '%Needle%'::text)
                                Buffers: local hit=8 read=1
        ->  Index Scan using groups_pkey on groups g  (cost=0.29..8.30 rows=1 width=25) (actual time=0.010..0.010 rows=1 loops=4)
              Index Cond: (id = groups.id)
              Buffers: local hit=9 read=3
        SubPlan 1
          ->  Index Only Scan using group_members_group_id_created_at_user_id_idx on group_members gm  (cost=0.12..8.14 rows=1 width=0) (actual time=0.002..0.002 rows=0 loops=4)
                Index Cond: (group_id = g.id)
                Filter: (user_id = 'viewer'::text)
                Heap Fetches: 0
                Buffers: local hit=8
Planning:
  Buffers: shared hit=19, local hit=14 read=5
Planning Time: 0.641 ms
Execution Time: 0.237 ms

groups 2 chars (target <50ms):
Sort  (cost=2805.99..2805.99 rows=1 width=59) (actual time=24.854..24.855 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(g.name) ~~* 'Ne%'::text)) DESC, g.member_count DESC, g.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=21 read=163
  ->  Nested Loop  (cost=2789.55..2805.98 rows=1 width=59) (actual time=24.815..24.846 rows=4 loops=1)
        Buffers: local hit=21 read=163
        ->  Limit  (cost=2789.26..2789.27 rows=1 width=10) (actual time=24.736..24.737 rows=4 loops=1)
              Buffers: local hit=1 read=163
              ->  Sort  (cost=2789.26..2789.27 rows=1 width=10) (actual time=24.735..24.736 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(groups.name) ~~* 'Ne%'::text)) DESC, groups.member_count DESC, groups.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=1 read=163
                    ->  Seq Scan on groups  (cost=0.00..2789.25 rows=1 width=10) (actual time=0.048..24.724 rows=5 loops=1)
                          Filter: ((deleted_at IS NULL) AND (immutable_unaccent(name) ~~* '%Ne%'::text))
                          Rows Removed by Filter: 9995
                          Buffers: local hit=1 read=163
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
Planning Time: 0.478 ms
Execution Time: 24.882 ms

users >=3 chars:
Sort  (cost=60.28..60.28 rows=1 width=66) (actual time=0.195..0.196 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(u.full_name) ~~* 'Needle%'::text)) DESC, u.member_code, u.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=35 read=2
  ->  Nested Loop  (cost=51.98..60.27 rows=1 width=66) (actual time=0.163..0.188 rows=4 loops=1)
        Buffers: local hit=35 read=2
        ->  Limit  (cost=51.70..51.70 rows=1 width=15) (actual time=0.138..0.139 rows=4 loops=1)
              Buffers: local hit=23 read=2
              ->  Sort  (cost=51.70..51.70 rows=1 width=15) (actual time=0.137..0.138 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(u_1.full_name) ~~* 'Needle%'::text)) DESC, u_1.member_code, u_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=23 read=2
                    ->  Nested Loop  (cost=39.15..51.69 rows=1 width=15) (actual time=0.081..0.131 rows=5 loops=1)
                          Buffers: local hit=23 read=2
                          ->  Bitmap Heap Scan on users  (cost=38.86..43.13 rows=1 width=5) (actual time=0.054..0.069 rows=5 loops=1)
                                Recheck Cond: (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Needle%'::text)
                                Filter: (deleted_at IS NULL)
                                Heap Blocks: exact=1
                                Buffers: local hit=8 read=2
                                ->  Bitmap Index Scan on users_expr_idx  (cost=0.00..38.86 rows=1 width=0) (actual time=0.024..0.024 rows=5 loops=1)
                                      Index Cond: (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Needle%'::text)
                                      Buffers: local hit=7 read=2
                          ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.30 rows=1 width=29) (actual time=0.005..0.005 rows=1 loops=5)
                                Index Cond: (id = users.id)
                                Filter: ((deleted_at IS NULL) AND (account_type = ANY ('{personal,business}'::account_type[])))
                                Buffers: local hit=15
        ->  Index Scan using users_pkey on users u  (cost=0.29..8.30 rows=1 width=47) (actual time=0.005..0.005 rows=1 loops=4)
              Index Cond: (id = u_1.id)
              Buffers: local hit=12
Planning:
  Buffers: shared hit=14, local hit=21 read=1
Planning Time: 0.727 ms
Execution Time: 0.234 ms

users 2 chars (target <50ms):
Sort  (cost=2874.15..2874.16 rows=1 width=66) (actual time=31.543..31.544 rows=4 loops=1)
  Sort Key: ((immutable_unaccent(u.full_name) ~~* 'Ne%'::text)) DESC, u.member_code, u.id
  Sort Method: quicksort  Memory: 25kB
  Buffers: local hit=28 read=181
  ->  Nested Loop  (cost=2865.85..2874.14 rows=1 width=66) (actual time=31.508..31.536 rows=4 loops=1)
        Buffers: local hit=28 read=181
        ->  Limit  (cost=2865.57..2865.57 rows=1 width=15) (actual time=31.437..31.439 rows=4 loops=1)
              Buffers: local hit=16 read=181
              ->  Sort  (cost=2865.57..2865.57 rows=1 width=15) (actual time=31.436..31.437 rows=4 loops=1)
                    Sort Key: ((immutable_unaccent(u_1.full_name) ~~* 'Ne%'::text)) DESC, u_1.member_code, u_1.id
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: local hit=16 read=181
                    ->  Nested Loop  (cost=0.29..2865.56 rows=1 width=15) (actual time=0.060..31.427 rows=5 loops=1)
                          Buffers: local hit=16 read=181
                          ->  Seq Scan on users  (cost=0.00..2857.00 rows=1 width=5) (actual time=0.032..31.365 rows=5 loops=1)
                                Filter: ((deleted_at IS NULL) AND (((immutable_unaccent(full_name) || ' '::text) || (email)::text) ~~* '%Ne%'::text))
                                Rows Removed by Filter: 9995
                                Buffers: local hit=1 read=181
                          ->  Index Scan using users_pkey on users u_1  (cost=0.29..8.30 rows=1 width=29) (actual time=0.005..0.005 rows=1 loops=5)
                                Index Cond: (id = users.id)
                                Filter: ((deleted_at IS NULL) AND (account_type = ANY ('{personal,business}'::account_type[])))
                                Buffers: local hit=15
        ->  Index Scan using users_pkey on users u  (cost=0.29..8.30 rows=1 width=47) (actual time=0.008..0.008 rows=1 loops=4)
              Index Cond: (id = u_1.id)
              Buffers: local hit=12
Planning:
  Buffers: local hit=22
Planning Time: 0.612 ms
Execution Time: 31.573 ms
```
