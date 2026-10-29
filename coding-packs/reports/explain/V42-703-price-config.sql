-- TIP-V42-703 (D-94 5A): Cấu hình bảng giá. EXPLAIN trên opchub_test: thêm 12k user + phí rồi ROLLBACK.
-- (1) đọc giá: 1 dòng theo PK (cache Redis 300 s, chỉ trượt cache mới chạm DB)
-- (2) lưu giá: cập nhật khoản chưa thu theo gói — một câu UPDATE, chạy 1 lần / lần Admin lưu
BEGIN;
INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
SELECT 'xp' || g, 'XP' || g, 'personal', 'Price ' || g, 'xp' || g || '@explain.test', now()
FROM generate_series(1, 12000) g;
INSERT INTO membership_fees (user_id, plan, status, amount, valid_until, paid_at, updated_at)
SELECT 'xp' || g, (CASE WHEN g % 2 = 0 THEN 'business' ELSE 'personal' END)::membership_plan,
       (CASE WHEN g % 3 = 0 THEN 'trial' WHEN g % 3 = 1 THEN 'active' ELSE 'expired' END)::membership_fee_status,
       CASE WHEN g % 2 = 0 THEN 3600000 ELSE 1200000 END, now() + ((g % 400) - 30 || ' days')::interval,
       CASE WHEN g % 3 = 1 THEN now() ELSE NULL END, now()
FROM generate_series(1, 12000) g;
ANALYZE membership_fees;
\echo '--- V42-703 đọc giá hiện hành (PriceConfigRepository.get)'
EXPLAIN (ANALYZE, BUFFERS)
SELECT per_list, per_year, biz_list, biz_year, fund_price, fund_renew, fund_months, version, updated_at
FROM price_configs WHERE id = 1;
\echo '--- V42-703 lưu giá: khoản kế tiếp theo giá mới (PriceConfigRepository.repriceFees)'
EXPLAIN (ANALYZE, BUFFERS)
UPDATE membership_fees SET
  amount = CASE plan WHEN 'business' THEN 4200000 ELSE 1500000 END, updated_at = now()
WHERE amount <> CASE plan WHEN 'business' THEN 4200000 ELSE 1500000 END;
ROLLBACK;
