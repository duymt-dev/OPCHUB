-- Đếm Admin trên bảng đã VACUUM (index-only cần visibility map) — dữ liệu xp* xoá ở cuối
INSERT INTO projects (id, owner_id, name, status, created_at, updated_at)
SELECT 'xp' || g, (SELECT min(id) FROM users), 'X ' || g,
       (CASE WHEN g % 10 = 0 THEN 'pending_review' WHEN g % 10 = 1 THEN 'hidden' ELSE 'published' END)::project_status,
       now(), now()
FROM generate_series(1, 20000) g;
VACUUM ANALYZE projects;
\echo '--- B32 Admin counts (6 Index Only Scan trên projects_admin)'
EXPLAIN (ANALYZE, BUFFERS) SELECT s.status, (
  SELECT count(*)::int FROM projects p WHERE p.status = s.status AND p.deleted_at IS NULL
) AS n FROM unnest(enum_range(NULL::project_status)) AS s(status);
DELETE FROM projects WHERE id LIKE 'xp%';
VACUUM ANALYZE projects;
