-- TIP-V42-707 (D-94 3A, D-110): affiliate cho mọi thành viên, mã luôn hoạt động, gói thực trả theo khoản.

-- D-110: gói thực trả (snapshot) của từng khoản hoa hồng
CREATE TYPE "commission_plan" AS ENUM ('personal', 'business', 'fundraising');
ALTER TABLE "commissions" ADD COLUMN "plan" "commission_plan";

-- Backfill: Gọi vốn theo nguồn; phí thành viên theo gói hiện tại của người được giới thiệu
-- (dữ liệu cũ không lưu gói theo kỳ — membership_fees.plan là nguồn duy nhất còn lại)
UPDATE "commissions" SET "plan" = 'fundraising' WHERE "source" = 'fundraising';
UPDATE "commissions" c SET "plan" = f."plan"::text::"commission_plan"
  FROM "membership_fees" f
  WHERE c."source" = 'membership' AND f."user_id" = c."referred_user_id";
UPDATE "commissions" SET "plan" = 'personal' WHERE "plan" IS NULL;
ALTER TABLE "commissions" ALTER COLUMN "plan" SET NOT NULL;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_plan_source_check"
  CHECK (("source" = 'fundraising') = ("plan" = 'fundraising'));

-- D-110: mã luôn hoạt động (bỏ tạm dừng theo phí — AF-R07); chỉ Admin hủy từng khoản do vi phạm
UPDATE "affiliates" SET "status" = 'active', "updated_at" = now() WHERE "status" = 'paused';
