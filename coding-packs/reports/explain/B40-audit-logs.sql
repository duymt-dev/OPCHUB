-- B40: Nhật ký Admin — 90 ngày, 500 dòng mới nhất (keyset idx created_at DESC, id DESC)
BEGIN;
INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, tag, summary, created_at)
SELECT gen_random_uuid()::text, NULL, 'x.seed', 'x', g::text, 'settings', 'seed', now() - (g || ' minutes')::interval
FROM generate_series(1, 50000) g;
ANALYZE audit_logs;
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, actor_id, summary, tag, created_at FROM audit_logs
WHERE created_at >= now() - interval '90 days'
ORDER BY created_at DESC, id DESC LIMIT 500;
ROLLBACK;
