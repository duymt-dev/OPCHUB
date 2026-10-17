-- EXPLAIN B32 trên opchub_test: 20k dự án tổng hợp trong transaction rồi ROLLBACK
BEGIN;
INSERT INTO projects (id, owner_id, name, category_id, status, visibility, followers_count,
                      published_at, created_at, updated_at)
SELECT 'xp' || g, (SELECT min(id) FROM users), 'Dự án X ' || g,
       (SELECT id FROM categories ORDER BY sort OFFSET (g % 8) LIMIT 1),
       (CASE WHEN g % 10 = 0 THEN 'pending_review' WHEN g % 10 = 1 THEN 'hidden' ELSE 'published' END)::project_status,
       (CASE WHEN g % 7 = 0 THEN 'private' ELSE 'public' END)::project_visibility,
       g % 3000, now() - (g || ' minutes')::interval, now() - (g || ' minutes')::interval, now()
FROM generate_series(1, 20000) g;
ANALYZE projects;
\echo '--- B32 Khám phá sort=new trang 3 (bước 1 deferred join, công khai)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM projects
WHERE status = 'published' AND deleted_at IS NULL AND visibility = 'public'
ORDER BY published_at DESC, id DESC LIMIT 9 OFFSET 18;
\echo '--- B32 Khám phá sort=follow'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM projects
WHERE status = 'published' AND deleted_at IS NULL AND visibility = 'public'
ORDER BY followers_count DESC, id LIMIT 9;
\echo '--- B32 Admin hàng duyệt (status=pending_review)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM projects
WHERE deleted_at IS NULL AND status = 'pending_review'
ORDER BY created_at DESC, id DESC LIMIT 10;
\echo '--- B32 Admin tab Tất cả'
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM projects
WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 10 OFFSET 100;
\echo '--- B32 Admin counts'
EXPLAIN (ANALYZE, BUFFERS) SELECT s.status, (
  SELECT count(*)::int FROM projects p WHERE p.status = s.status AND p.deleted_at IS NULL
) AS n FROM unnest(enum_range(NULL::project_status)) AS s(status);
ROLLBACK;
