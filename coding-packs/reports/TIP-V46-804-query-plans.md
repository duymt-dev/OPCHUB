# TIP-V46-804 — EXPLAIN (ANALYZE, BUFFERS)

SQL cuối ở c1fd1625; scope 41 file / 127 test PASS. Nguồn log local: test-results/v46-804-int-final-scope.log.

Private TEST DB; TEMP clones của schema đã triển khai, INCLUDING ALL indexes; 10.000 regional_shares, 10.000 commissions/affiliates, 20.000 users/referrals. VACUUM/ANALYZE bình thường, không tắt Seq Scan hoặc chỉnh planner costs. Không đụng bảng public để tạo fixture plan.

Index owner/status/month hiện có seek cả region và director_user_id. Lượt đầu join tên affiliate chọn Seq Scan; đã chuyển sang LATERAL PK lookup có LIMIT 1. LEFT JOIN giữ nhóm tài chính khi tài khoản đã xóa. Không cần migration/index mới. Năm plan cuối không Seq Scan trên bảng lớn; quét bảng payout rỗng/nhỏ không bị giả ép index.

Nguồn query: apps/server/src/modules/reporting/regional/my-region.queries.ts và apps/server/src/modules/affiliate/repositories/referral-rows.query.ts; fixture my-region-plan.int.spec.ts.

```text
TIP-V46-804 kpi actual deployed-schema clones, 10000 shares:
Aggregate  (cost=153.42..153.43 rows=1 width=32) (actual time=0.123..0.124 rows=1 loops=1)
  Buffers: local hit=102
  ->  Sort  (cost=151.42..151.67 rows=100 width=20) (actual time=0.105..0.109 rows=100 loops=1)
        Sort Key: month_key
        Sort Method: quicksort  Memory: 29kB
        Buffers: local hit=102
        ->  Index Scan using regional_shares_region_director_user_id_status_month_key_id_idx on regional_shares s  (cost=0.29..148.10 rows=100 width=20) (actual time=0.022..0.086 rows=100 loops=1)
              Index Cond: ((region IS NOT NULL) AND (region = 'north'::region) AND (director_user_id = 'u1'::text))
              Buffers: local hit=102
Planning:
  Buffers: shared hit=86, local hit=5
Planning Time: 30.065 ms
Execution Time: 0.164 ms
```

```text
TIP-V46-804 years actual deployed-schema clones, 10000 shares:
HashAggregate  (cost=149.35..149.42 rows=5 width=24) (actual time=0.098..0.099 rows=1 loops=1)
  Group Key: LEAST(customer_year, 4)
  Batches: 1  Memory Usage: 24kB
  Buffers: local hit=102
  ->  Index Scan using regional_shares_region_director_user_id_status_month_key_id_idx on regional_shares s  (cost=0.29..148.35 rows=100 width=12) (actual time=0.019..0.080 rows=100 loops=1)
        Index Cond: ((region IS NOT NULL) AND (region = 'north'::region) AND (director_user_id = 'u1'::text))
        Buffers: local hit=102
Planning:
  Buffers: shared hit=8
Planning Time: 0.142 ms
Execution Time: 0.131 ms
```

```text
TIP-V46-804 affiliates actual deployed-schema clones, 10000 shares:
Limit  (cost=698.65..698.78 rows=50 width=91) (actual time=0.280..0.282 rows=1 loops=1)
  Buffers: shared hit=3, local hit=102 read=6 written=5
  ->  Sort  (cost=698.65..698.81 rows=63 width=91) (actual time=0.280..0.281 rows=1 loops=1)
        Sort Key: (sum(s.director_amount)) DESC, (COALESCE(users.full_name, 'Thành viên đã xóa'::text)), s.affiliate_id
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=3, local hit=102 read=6 written=5
        ->  Nested Loop Left Join  (cost=152.00..696.77 rows=63 width=91) (actual time=0.254..0.257 rows=1 loops=1)
              Buffers: local hit=102 read=6 written=5
              ->  Nested Loop Left Join  (cost=151.70..678.72 rows=63 width=39) (actual time=0.216..0.218 rows=1 loops=1)
                    Buffers: local hit=102 read=3 written=3
                    ->  WindowAgg  (cost=151.42..154.40 rows=63 width=27) (actual time=0.165..0.167 rows=1 loops=1)
                          Buffers: local hit=102
                          ->  GroupAggregate  (cost=151.42..153.30 rows=63 width=27) (actual time=0.157..0.158 rows=1 loops=1)
                                Group Key: s.affiliate_id
                                Buffers: local hit=102
                                ->  Sort  (cost=151.42..151.67 rows=100 width=16) (actual time=0.134..0.136 rows=100 loops=1)
                                      Sort Key: s.affiliate_id, s.customer_id
                                      Sort Method: quicksort  Memory: 29kB
                                      Buffers: local hit=102
                                      ->  Index Scan using regional_shares_region_director_user_id_status_month_key_id_idx on regional_shares s  (cost=0.29..148.10 rows=100 width=16) (actual time=0.022..0.090 rows=100 loops=1)
                                            Index Cond: ((region IS NOT NULL) AND (region = 'north'::region) AND (director_user_id = 'u1'::text))
                                            Buffers: local hit=102
                    ->  Limit  (cost=0.29..8.30 rows=1 width=44) (actual time=0.049..0.049 rows=1 loops=1)
                          Buffers: local read=3 written=3
                          ->  Index Scan using affiliates_pkey on affiliates  (cost=0.29..8.30 rows=1 width=44) (actual time=0.048..0.048 rows=1 loops=1)
                                Index Cond: (id = s.affiliate_id)
                                Buffers: local read=3 written=3
              ->  Memoize  (cost=0.30..8.31 rows=1 width=17) (actual time=0.037..0.037 rows=1 loops=1)
                    Cache Key: affiliates.user_id
                    Cache Mode: binary
                    Hits: 0  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                    Buffers: local read=3 written=2
                    ->  Limit  (cost=0.29..8.30 rows=1 width=17) (actual time=0.034..0.035 rows=1 loops=1)
                          Buffers: local read=3 written=2
                          ->  Index Scan using users_pkey on users  (cost=0.29..8.30 rows=1 width=17) (actual time=0.034..0.034 rows=1 loops=1)
                                Index Cond: (id = affiliates.user_id)
                                Buffers: local read=3 written=2
Planning:
  Buffers: shared hit=137, local read=16 written=15
Planning Time: 91.666 ms
Execution Time: 0.343 ms
```

```text
TIP-V46-804 months actual deployed-schema clones, 10000 shares:
Limit  (cost=150.62..150.62 rows=1 width=56) (actual time=0.297..0.298 rows=1 loops=1)
  Buffers: local hit=102
  ->  Sort  (cost=150.62..150.62 rows=1 width=56) (actual time=0.297..0.297 rows=1 loops=1)
        Sort Key: s.month_key DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: local hit=102
        ->  HashAggregate  (cost=150.60..150.61 rows=1 width=56) (actual time=0.292..0.292 rows=1 loops=1)
              Group Key: s.month_key
              Batches: 1  Memory Usage: 24kB
              Buffers: local hit=102
              ->  Nested Loop Left Join  (cost=0.29..149.35 rows=100 width=24) (actual time=0.029..0.263 rows=100 loops=1)
                    Join Filter: (p.id = s.payout_id)
                    Buffers: local hit=102
                    ->  Index Scan using regional_shares_region_director_user_id_status_month_key_id_idx on regional_shares s  (cost=0.29..148.10 rows=100 width=48) (actual time=0.018..0.084 rows=100 loops=1)
                          Index Cond: ((region IS NOT NULL) AND (region = 'north'::region) AND (director_user_id = 'u1'::text))
                          Buffers: local hit=102
                    ->  Seq Scan on regional_payouts p  (cost=0.00..0.00 rows=1 width=40) (actual time=0.000..0.000 rows=0 loops=100)
Planning:
  Buffers: shared hit=26, local read=3 written=2
Planning Time: 0.458 ms
Execution Time: 0.354 ms
```

```text
TIP-V46-804 referrals actual deployed-schema clones, 10000 shares:
Nested Loop Left Join  (cost=46.06..354.59 rows=20 width=190) (actual time=0.324..0.595 rows=20 loops=1)
  Join Filter: (('commission'::text) = 'referral'::text)
  Buffers: shared hit=8, local hit=93 read=20 written=20
  ->  Nested Loop Left Join  (cost=45.78..195.84 rows=20 width=111) (actual time=0.273..0.450 rows=20 loops=1)
        Join Filter: (('commission'::text) = 'commission'::text)
        Buffers: local hit=55 read=18 written=18
        ->  Limit  (cost=45.49..45.54 rows=20 width=46) (actual time=0.241..0.246 rows=20 loops=1)
              Buffers: local hit=6 read=7 written=7
              ->  Sort  (cost=45.44..45.94 rows=200 width=46) (actual time=0.239..0.242 rows=40 loops=1)
                    Sort Key: c_1.created_at DESC, c_1.id DESC
                    Sort Method: top-N heapsort  Memory: 27kB
                    Buffers: local hit=6 read=7 written=7
                    ->  Append  (cost=0.29..39.12 rows=200 width=46) (actual time=0.035..0.221 rows=100 loops=1)
                          Buffers: local hit=6 read=7 written=7
                          ->  Index Only Scan using commissions_affiliate_id_created_at_id_referred_user_id_mon_idx on commissions c_1  (cost=0.29..10.29 rows=100 width=45) (actual time=0.034..0.076 rows=100 loops=1)
                                Index Cond: (affiliate_id = 'a1'::text)
                                Filter: (month_key = '2026-09'::bpchar)
                                Heap Fetches: 0
                                Buffers: local hit=1 read=3 written=3
                          ->  Hash Right Anti Join  (cost=17.82..27.84 rows=100 width=46) (actual time=0.139..0.139 rows=0 loops=1)
                                Hash Cond: (c_2.referred_user_id = r_1.referred_user_id)
                                Buffers: local hit=5 read=4 written=4
                                ->  Index Only Scan using commissions_affiliate_id_created_at_id_referred_user_id_mon_idx on commissions c_2  (cost=0.29..10.04 rows=100 width=5) (actual time=0.013..0.022 rows=100 loops=1)
                                      Index Cond: (affiliate_id = 'a1'::text)
                                      Heap Fetches: 0
                                      Buffers: local hit=4
                                ->  Hash  (cost=16.29..16.29 rows=100 width=20) (actual time=0.094..0.094 rows=100 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 14kB
                                      Buffers: local hit=1 read=4 written=4
                                      ->  Index Only Scan using referrals_affiliate_id_created_at_id_referred_user_id_month_idx on referrals r_1  (cost=0.29..16.29 rows=100 width=20) (actual time=0.043..0.077 rows=100 loops=1)
                                            Index Cond: (affiliate_id = 'a1'::text)
                                            Filter: (month_key = '2026-09'::bpchar)
                                            Rows Removed by Filter: 100
                                            Heap Fetches: 0
                                            Buffers: local hit=1 read=4 written=4
        ->  Index Scan using commissions_pkey on commissions c  (cost=0.29..7.50 rows=1 width=70) (actual time=0.009..0.009 rows=1 loops=20)
              Index Cond: (id = c_1.id)
              Buffers: local hit=49 read=11 written=11
  ->  Index Scan using referrals_pkey on referrals r  (cost=0.29..7.90 rows=1 width=16) (actual time=0.005..0.005 rows=0 loops=20)
        Index Cond: (id = c_1.id)
        Buffers: local hit=38 read=2 written=2
Planning:
  Buffers: shared hit=171, local hit=6 read=21 written=21
Planning Time: 92.833 ms
Execution Time: 0.643 ms
```
