-- TIP-V4-601 (D-68, D-69): phí 3 gói theo loại tài khoản
CREATE TYPE "membership_plan" AS ENUM ('personal', 'business');

ALTER TABLE "membership_fees" ADD COLUMN "plan" "membership_plan" NOT NULL DEFAULT 'personal';
ALTER TABLE "membership_fees" ALTER COLUMN "amount" DROP DEFAULT;

-- Backfill gói từ loại TK (investor không đóng phí — giữ personal, không dùng)
UPDATE "membership_fees" f SET "plan" = 'business'
FROM "users" u WHERE u."id" = f."user_id" AND u."account_type" = 'business';

-- D-69: khoản đang chờ thanh toán tạo trước go-live giữ số tiền cũ;
-- thành viên đã/đang có kỳ phí giữ hạn hiện tại, lần gia hạn sau trả theo gói mới.
UPDATE "membership_fees"
SET "amount" = CASE "plan" WHEN 'business' THEN 3600000 ELSE 1200000 END
WHERE "status" <> 'pending_payment';
