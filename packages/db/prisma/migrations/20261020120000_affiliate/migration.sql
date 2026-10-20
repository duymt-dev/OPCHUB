-- CreateEnum
CREATE TYPE "affiliate_status" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('pending', 'converted', 'void');

-- CreateEnum
CREATE TYPE "commission_status" AS ENUM ('recorded', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "status" "affiliate_status" NOT NULL DEFAULT 'active',
    "bank_name" TEXT,
    "bank_no" TEXT,
    "bank_holder" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "affiliate_code" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'pending',
    "month_key" CHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_at" TIMESTAMPTZ(6),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "fee_period_id" TEXT NOT NULL,
    "list_amount" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "status" "commission_status" NOT NULL DEFAULT 'recorded',
    "month_key" CHAR(7) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "paid_by" TEXT,
    "paid_bank_snapshot" JSONB,
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_policy" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "default_rate" INTEGER NOT NULL DEFAULT 20,
    "cookie_days" INTEGER NOT NULL DEFAULT 30,
    "terms" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks_daily" (
    "affiliate_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "affiliate_clicks_daily_pkey" PRIMARY KEY ("affiliate_id","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE INDEX "affiliates_status_created_at_idx" ON "affiliates"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE INDEX "referrals_affiliate_id_month_key_created_at_idx" ON "referrals"("affiliate_id", "month_key", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "commissions_referred_user_id_key" ON "commissions"("referred_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_fee_period_id_key" ON "commissions"("fee_period_id");

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_fee_period_id_fkey" FOREIGN KEY ("fee_period_id") REFERENCES "membership_fee_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks_daily" ADD CONSTRAINT "affiliate_clicks_daily_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===== Viết tay (TIP-V2-401, §20, D-53) =====

-- AF-R08: % hoa hồng 1–50
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_rate_check" CHECK ("rate" BETWEEN 1 AND 50);
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_code_check" CHECK ("code" ~ '^[A-Z0-9]{4,12}$');
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_rate_check" CHECK ("rate" BETWEEN 1 AND 50);
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_amount_check" CHECK ("amount" >= 0 AND "list_amount" >= 0);
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_month_key_check" CHECK ("month_key" ~ '^\d{4}-\d{2}$');
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_month_key_check" CHECK ("month_key" ~ '^\d{4}-\d{2}$');
-- AF-R10: huỷ phải có lý do; đã chi phải có ngày chi
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_cancel_reason_check"
  CHECK ("status" <> 'cancelled' OR ("cancel_reason" IS NOT NULL AND "cancelled_at" IS NOT NULL));
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_paid_check"
  CHECK ("status" <> 'paid' OR "paid_at" IS NOT NULL);
ALTER TABLE "affiliate_policy" ADD CONSTRAINT "affiliate_policy_singleton" CHECK ("id" = 1);
ALTER TABLE "affiliate_policy" ADD CONSTRAINT "affiliate_policy_rate_check" CHECK ("default_rate" BETWEEN 1 AND 50);
ALTER TABLE "affiliate_policy" ADD CONSTRAINT "affiliate_policy_cookie_check" CHECK ("cookie_days" BETWEEN 1 AND 365);
ALTER TABLE "affiliate_clicks_daily" ADD CONSTRAINT "affiliate_clicks_daily_count_check" CHECK ("count" >= 0);

-- Đối soát / chi trả theo đại lý + tháng: bằng trước, INCLUDE số tiền (Index Only Scan)
CREATE INDEX "commissions_affiliate_month_status_idx"
  ON "commissions" ("affiliate_id", "month_key", "status") INCLUDE ("amount");
-- Admin danh sách hoa hồng: lọc trạng thái + keyset / deferred join
CREATE INDEX "commissions_status_created_idx"
  ON "commissions" ("status", "created_at" DESC, "id" DESC);
-- Tất cả trạng thái (tab "Tất cả")
CREATE INDEX "commissions_created_idx" ON "commissions" ("created_at" DESC, "id" DESC);
INSERT INTO "affiliate_policy" ("id", "default_rate", "cookie_days", "terms")
VALUES (1, 20, 30, '') ON CONFLICT ("id") DO NOTHING;
