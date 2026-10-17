-- EXPLAIN B33 trên opchub_test: ~17k quan tâm (1.7k user × 10 dự án) trong transaction rồi ROLLBACK
BEGIN;
INSERT INTO projects (id, owner_id, name, status, created_at, updated_at)
SELECT 'xq' || g, (SELECT min(id) FROM users), 'Q ' || g, 'published', now(), now()
FROM generate_series(1, 10) g;
INSERT INTO investor_interests (id, project_id, user_id, investor_key, kind, contact_name, phone,
                                amount, created_at, updated_at)
SELECT 'xi' || u.n || '-' || g, 'xq' || g, u.id, u.id,
       (CASE WHEN u.n % 3 = 0 THEN 'fund' WHEN u.n % 3 = 1 THEN 'business' ELSE 'individual' END)::investor_kind,
       'X', '+849', 1000000, now() - ((u.n * 10 + g) || ' seconds')::interval, now()
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM users) u CROSS JOIN generate_series(1, 10) g;
ANALYZE investor_interests;
INSERT INTO investor_summaries (investor_key, user_id, first_interest_id, kind, total_amount,
                                  interest_count, last_at, updated_at)
SELECT investor_key, investor_key, (array_agg(id ORDER BY created_at))[1], (array_agg(kind))[1],
       SUM(amount), count(*), MAX(created_at), now()
FROM investor_interests WHERE id LIKE 'xi%' GROUP BY investor_key
ON CONFLICT DO NOTHING;
ANALYZE investor_summaries;
\echo '--- B33 Admin trang nhà đầu tư (investor_summaries, lọc kind=fund)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.investor_key, u.full_name, s.total_amount,
       (SELECT count(*)::int FROM investor_admin_notes n WHERE n.investor_key = s.investor_key)
FROM investor_summaries s JOIN users u ON u.id = s.user_id
WHERE s.kind = 'fund' ORDER BY s.last_at DESC, s.investor_key LIMIT 10;
\echo '--- B33 Admin tab Tất cả trang 5'
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.investor_key, u.full_name FROM investor_summaries s JOIN users u ON u.id = s.user_id
ORDER BY s.last_at DESC, s.investor_key LIMIT 10 OFFSET 40;
\echo '--- B33 Mục quan tâm của trang (investor_key IN …)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, project_id, amount FROM investor_interests
WHERE investor_key IN (SELECT id FROM users ORDER BY id LIMIT 10)
ORDER BY created_at DESC, id DESC;
\echo '--- B33 Quan tâm của một dự án (chủ dự án)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM investor_interests WHERE project_id = 'xq3'
ORDER BY created_at DESC, id DESC LIMIT 500;
ROLLBACK;
