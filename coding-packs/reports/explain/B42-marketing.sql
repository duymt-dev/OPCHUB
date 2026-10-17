-- B42: nhật ký thư (partial idx mail_logs_sent_visible) + lô người nhận chiến dịch (keyset users_pkey)
-- Dữ liệu tổng hợp tiền tố "ex-b42", COMMIT → VACUUM ANALYZE (visibility map) → EXPLAIN → xoá.
INSERT INTO mail_logs (id, "to", kind, subject, status, sent_at, created_at, updated_at)
SELECT 'ex-b42-' || g, 'x' || g || '@t.vn',
  (CASE g % 4 WHEN 0 THEN 'welcome' WHEN 1 THEN 'campaign' WHEN 2 THEN 'otp' ELSE 'test' END)::mail_kind,
  's', 'sent', now(), now() - (g || ' seconds')::interval, now()
FROM generate_series(1, 60000) g;
INSERT INTO users (id, member_code, account_type, full_name, email, status, updated_at)
SELECT 'ex-b42-' || g, 'EXB42' || g, (CASE g % 3 WHEN 0 THEN 'business' ELSE 'personal' END)::account_type,
  'U' || g, 'ex-b42-' || g || '@t.vn', 'active', now()
FROM generate_series(1, 20000) g;
VACUUM ANALYZE mail_logs;
VACUUM ANALYZE users;
\echo '== mail log page 3 (deferred join step 1)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM mail_logs WHERE status = 'sent' AND kind IN ('welcome', 'campaign')
ORDER BY created_at DESC, id ASC LIMIT 20 OFFSET 40;
\echo '== mail log count'
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM mail_logs WHERE status = 'sent' AND kind IN ('welcome', 'campaign');
\echo '== campaign batch business (keyset)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.id, u.email::text, u.full_name FROM users u
WHERE u.status = 'active' AND u.deleted_at IS NULL AND u.id > ''
  AND u.account_type = ANY(ARRAY['business']::account_type[])
ORDER BY u.id LIMIT 500;
\echo '== campaign batch all (keyset)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.id, u.email::text, u.full_name FROM users u
WHERE u.status = 'active' AND u.deleted_at IS NULL AND u.id > 'ex-b42-5'
ORDER BY u.id LIMIT 500;
DELETE FROM mail_logs WHERE id LIKE 'ex-b42-%';
DELETE FROM users WHERE id LIKE 'ex-b42-%';
