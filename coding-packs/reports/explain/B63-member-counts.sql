ANALYZE group_members;
EXPLAIN (ANALYZE, BUFFERS)
SELECT gm.group_id, count(*) AS n FROM group_members gm
JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
WHERE gm.status = 'member' GROUP BY gm.group_id;
