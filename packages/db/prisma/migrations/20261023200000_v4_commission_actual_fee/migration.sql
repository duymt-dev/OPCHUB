-- V4-602 (D-70): hoa hồng theo phí thực trả; thêm nguồn hoa hồng và % Gọi vốn.
-- Hoa hồng đã ghi giữ nguyên số tiền (list_amount cũ = phí của khoản đó), nguồn = membership.
CREATE TYPE "commission_source" AS ENUM ('membership', 'fundraising');

ALTER TABLE "commissions" ADD COLUMN "source" "commission_source" NOT NULL DEFAULT 'membership';

ALTER TABLE "affiliate_policy" ADD COLUMN "fundraising_rate" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "affiliate_policy" ADD CONSTRAINT "affiliate_policy_fundraising_rate_check"
  CHECK ("fundraising_rate" BETWEEN 1 AND 50);
