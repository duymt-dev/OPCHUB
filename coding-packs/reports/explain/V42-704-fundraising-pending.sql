-- TIP-V42-704 (D-113 F3): ô chọn khoản Gói Gọi vốn chờ thanh toán (FundraisingManualService.pending).
-- EXPLAIN trên opchub_test: thêm 12k user + 12k dự án + 12k khoản (1/6 chờ thanh toán, mã GV8xxxxx) rồi ROLLBACK.
BEGIN;
INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
SELECT 'xf' || g, 'XF' || g, 'personal', 'Fund ' || g, 'xf' || g || '@explain.test', now()
FROM generate_series(1, 12000) g;
INSERT INTO projects (id, owner_id, name, updated_at)
SELECT 'xfp' || g, 'xf' || g, 'Explain project ' || g, now() FROM generate_series(1, 12000) g;
INSERT INTO project_fundraisings (id, project_id, owner_id, code, amount, status, starts_at, ends_at, created_at, updated_at)
SELECT 'xff' || g, 'xfp' || g, 'xf' || g, 'GV8' || lpad(g::text, 5, '0'), 15000000,
       (CASE g % 6 WHEN 0 THEN 'pending_payment' WHEN 1 THEN 'pending_review' WHEN 2 THEN 'rejected'
        WHEN 3 THEN 'expired' ELSE 'active' END)::fundraising_status,
       now() - interval '30 days', now() + interval '150 days',
       now() - (g || ' minutes')::interval, now()
FROM generate_series(1, 12000) g;
ANALYZE users; ANALYZE projects; ANALYZE project_fundraisings;
\echo '--- V42-704 khoản chờ thanh toán, ô trống (20 mới nhất)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT f.id, f.code, p.name AS project_name, u.full_name AS owner_name,
  u.member_code AS owner_code, f.amount, f.created_at
FROM project_fundraisings f
JOIN projects p ON p.id = f.project_id
JOIN users u ON u.id = f.owner_id
WHERE f.status = 'pending_payment' AND f.code IS NOT NULL
  AND ('' = '' OR f.code ILIKE '%%' OR p.name ILIKE '%%' OR u.member_code ILIKE '%%')
ORDER BY f.created_at DESC
LIMIT 20;
\echo '--- V42-704 khoản chờ thanh toán, tìm theo mã GV'
EXPLAIN (ANALYZE, BUFFERS)
SELECT f.id, f.code, p.name AS project_name, u.full_name AS owner_name,
  u.member_code AS owner_code, f.amount, f.created_at
FROM project_fundraisings f
JOIN projects p ON p.id = f.project_id
JOIN users u ON u.id = f.owner_id
WHERE f.status = 'pending_payment' AND f.code IS NOT NULL
  AND ('gv80050' = '' OR f.code ILIKE '%gv80050%' OR p.name ILIKE '%gv80050%' OR u.member_code ILIKE '%gv80050%')
ORDER BY f.created_at DESC
LIMIT 20;
ROLLBACK;
