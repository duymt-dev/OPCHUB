-- TIP-V42-702 (D-94 1A/2A, D-116, BR-TRIAL-01): TK mới mặc định trial; dữ liệu cũ đổi theo ngày đăng ký.
ALTER TABLE "membership_fees" ALTER COLUMN "status" SET DEFAULT 'trial';

-- D-94 2A: TK chưa từng đóng phí (pending_payment) → trial 90 ngày tính từ ngày đăng ký,
-- quá 90 ngày → expired. D-116: bỏ khoản 600.000 chờ, trả giá gói hiện hành khi hết miễn phí.
UPDATE "membership_fees" f SET
  "status" = CASE WHEN u."created_at" + interval '90 days' > now()
                  THEN 'trial'::"membership_fee_status" ELSE 'expired'::"membership_fee_status" END,
  "valid_until" = u."created_at" + interval '90 days',
  "amount" = CASE f."plan" WHEN 'business' THEN 3600000 ELSE 1200000 END,
  "version" = f."version" + 1,
  "updated_at" = now()
FROM "users" u
WHERE u."id" = f."user_id" AND f."status" = 'pending_payment';

-- Job hết hạn (S-03) và nhắc (D-113) quét cả trial — partial index theo tập trạng thái mới
DROP INDEX IF EXISTS "membership_fees_due";
CREATE INDEX "membership_fees_due" ON "membership_fees" ("valid_until")
  WHERE "status" IN ('trial', 'active', 'expiring');
DROP INDEX IF EXISTS "membership_fees_remind";
CREATE INDEX "membership_fees_remind" ON "membership_fees" ("valid_until")
  WHERE "status" IN ('trial', 'active', 'expiring', 'expired');
