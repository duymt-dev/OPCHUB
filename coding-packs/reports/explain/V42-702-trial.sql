-- TIP-V42-702 (D-94 1A, D-113): job hết hạn + job nhắc quét cả trial (partial index
-- membership_fees_due / membership_fees_remind). EXPLAIN trên opchub_test: thêm 12k user + phí
-- trial / active / expired trong transaction rồi ROLLBACK
BEGIN;
INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
SELECT 'xt' || g, 'XT' || g, 'personal', 'Trial ' || g, 'xt' || g || '@explain.test', now()
FROM generate_series(1, 12000) g;
INSERT INTO membership_fees (user_id, plan, status, amount, valid_until, paid_at, updated_at)
SELECT 'xt' || g, 'personal',
       (CASE WHEN g % 3 = 0 THEN 'trial' WHEN g % 3 = 1 THEN 'active' ELSE 'expired' END)::membership_fee_status,
       1200000, now() + ((g % 400) - 30 || ' days')::interval,
       CASE WHEN g % 3 = 1 THEN now() ELSE NULL END, now()
FROM generate_series(1, 12000) g;
ANALYZE users;
ANALYZE membership_fees;
\echo '--- V42-702 job hết hạn: trial / active / expiring quá hạn (sweepStatuses)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id FROM membership_fees
WHERE status = ANY(ARRAY['trial', 'active', 'expiring']::membership_fee_status[])
  AND valid_until <= now();
\echo '--- V42-702 job nhắc: ứng viên trong cửa sổ, keyset user_id (FeeReminderRepository.candidates)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT f.user_id, u.email::text AS email, u.full_name, f.valid_until, f.amount,
       (f.paid_at IS NULL) AS trial,
       COALESCE(array_agg(r.milestone) FILTER (WHERE r.milestone IS NOT NULL), '{}') AS sent
FROM membership_fees f
JOIN users u ON u.id = f.user_id
LEFT JOIN fee_reminders r ON r.user_id = f.user_id AND r.valid_until = f.valid_until
WHERE f.status IN ('trial', 'active', 'expiring', 'expired')
  AND f.valid_until BETWEEN now() - interval '11 days' AND now() + interval '31 days'
  AND f.user_id > ''
  AND u.status = 'active' AND u.deleted_at IS NULL AND u.account_type <> 'investor'
GROUP BY f.user_id, u.email, u.full_name, f.valid_until, f.amount, f.paid_at
ORDER BY f.user_id
LIMIT 500;
ROLLBACK;
