-- EXPLAIN B31 trên opchub_test: dữ liệu tổng hợp trong transaction rồi ROLLBACK (không để lại gì)
BEGIN;
INSERT INTO events (id, title, mode, starts_at, place, seats, updated_at)
SELECT 'xe' || g, 'X ' || g,
       (CASE WHEN g % 2 = 0 THEN 'online' ELSE 'offline' END)::event_mode,
       now() + (g || ' minutes')::interval, 'HN', 100000, now()
FROM generate_series(1, 20000) g;
-- 1.7k user × 20 sự kiện ≈ 35k đăng ký; sự kiện xe5 nhận mọi user
INSERT INTO event_registrations (event_id, user_id, status, created_at, updated_at)
SELECT 'xe' || (k * 1000 + 5), u.id, 'registered', now() - (u.n || ' seconds')::interval, now()
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM users) u
CROSS JOIN generate_series(0, 19) k;
ANALYZE events;
ANALYZE event_registrations;
\echo '--- B31 /events trang 50 (bước 1 deferred join: chỉ id)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM events ORDER BY starts_at, id LIMIT 9 OFFSET 450;
\echo '--- B31 /events?mode=online (bước 1)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM events WHERE mode = 'online' ORDER BY starts_at, id LIMIT 9;
\echo '--- B31 registeredByMe cho một trang'
EXPLAIN (ANALYZE, BUFFERS) SELECT event_id FROM event_registrations
WHERE user_id = (SELECT min(id) FROM users)
  AND event_id IN ('xe5', 'xe1005', 'xe2005', 'xe3', 'xe4', 'xe6', 'xe7', 'xe8', 'xe9')
  AND status <> 'cancelled';
\echo '--- B31 Admin danh sách đăng ký xe5 (bước 1 deferred join)'
EXPLAIN (ANALYZE, BUFFERS) SELECT user_id, status, created_at FROM event_registrations
WHERE event_id = 'xe5' AND status IN ('registered', 'attended')
ORDER BY created_at DESC, user_id LIMIT 10;
ROLLBACK;
