-- B44: weekly_active (messages 7 ngày) + members_new — 100k tin nhắn tổng hợp rải 1 năm (cửa sổ 7 ngày ≈ 2%)
BEGIN;
INSERT INTO messages (id, room_id, sender_id, client_msg_id, body, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, u.id, 'ex-b44-' || g, 'x', now() - (g % 8760 || ' hours')::interval, now()
FROM generate_series(100000, 1, -1) g
CROSS JOIN LATERAL (SELECT id FROM rooms ORDER BY id OFFSET (g % 30) LIMIT 1) r
CROSS JOIN LATERAL (SELECT id FROM users ORDER BY id OFFSET (g % 50) LIMIT 1) u;
ANALYZE messages;
\echo '== weekly_active aggregate'
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.group_id, count(DISTINCT m.sender_id)::int AS n
FROM rooms r JOIN messages m ON m.room_id = r.id
WHERE m.created_at >= now() - interval '7 days' AND m.created_at < now() AND m.sender_id IS NOT NULL
GROUP BY r.group_id;
\echo '== weekly_active lateral (messages_room_id_created_at_id_idx)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.group_id, count(DISTINCT w.sender_id)::int AS n
FROM rooms r CROSS JOIN LATERAL (
  SELECT m.sender_id FROM messages m
  WHERE m.room_id = r.id AND m.created_at >= now() - interval '7 days' AND m.created_at < now()
) w
WHERE w.sender_id IS NOT NULL
GROUP BY r.group_id;
\echo '== members_new (users_list_all)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM users WHERE deleted_at IS NULL AND system_role = 'member'
  AND created_at >= now() - interval '1 day' AND created_at < now();
ROLLBACK;
