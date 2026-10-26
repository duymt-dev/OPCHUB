-- V4-610 (UP-11, AD-06, D-70, D-82): Gói Gọi vốn theo dự án + hoa hồng Gọi vốn.
CREATE TYPE "fundraising_status" AS ENUM ('pending_payment', 'pending_review', 'active', 'expired', 'rejected');

ALTER TYPE "mail_kind" ADD VALUE IF NOT EXISTS 'fundraising';

-- Mã CK Gọi vốn: 'GV' || lpad(nextval, 6, '0')
CREATE SEQUENCE IF NOT EXISTS "fundraising_code_seq" START 1;

CREATE TABLE "project_fundraisings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "code" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "fundraising_status" NOT NULL DEFAULT 'pending_payment',
    "legacy" BOOLEAN NOT NULL DEFAULT false,
    "payment_transaction_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "reminded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_fundraisings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_fundraisings_amount_check" CHECK ("amount" >= 0),
    CONSTRAINT "project_fundraisings_code_check" CHECK ("legacy" OR "code" ~ '^GV\d{6}$'),
    CONSTRAINT "project_fundraisings_active_check"
      CHECK ("status" NOT IN ('active', 'expired') OR ("starts_at" IS NOT NULL AND "ends_at" IS NOT NULL))
);

CREATE UNIQUE INDEX "project_fundraisings_code_key" ON "project_fundraisings"("code");
CREATE UNIQUE INDEX "project_fundraisings_payment_transaction_id_key" ON "project_fundraisings"("payment_transaction_id");
CREATE INDEX "project_fundraisings_project_id_status_idx" ON "project_fundraisings"("project_id", "status");
CREATE INDEX "project_fundraisings_status_ends_at_idx" ON "project_fundraisings"("status", "ends_at");
CREATE INDEX "project_fundraisings_owner_id_created_at_idx" ON "project_fundraisings"("owner_id", "created_at" DESC);
-- Một khoản đang mở (chờ thanh toán / chờ thẩm định) mỗi dự án
CREATE UNIQUE INDEX "project_fundraisings_open"
  ON "project_fundraisings"("project_id") WHERE "status" IN ('pending_payment', 'pending_review');

ALTER TABLE "project_fundraisings" ADD CONSTRAINT "project_fundraisings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_fundraisings" ADD CONSTRAINT "project_fundraisings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_fundraisings" ADD CONSTRAINT "project_fundraisings_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Q-V4-610-2: dự án đã khai báo gọi vốn trước V4 giữ tab Gọi vốn 6 tháng (khoản legacy, không thu)
INSERT INTO "project_fundraisings"
  ("id", "project_id", "owner_id", "amount", "status", "legacy", "starts_at", "ends_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", p."owner_id", 0, 'active', true,
       now(), now() + interval '6 months', now()
FROM "project_fundings" f JOIN "projects" p ON p."id" = f."project_id"
WHERE p."deleted_at" IS NULL;

-- Hoa hồng: membership ↔ fee_period_id, fundraising ↔ fundraising_id
ALTER TABLE "commissions" ADD COLUMN "fundraising_id" TEXT;
ALTER TABLE "commissions" ALTER COLUMN "fee_period_id" DROP NOT NULL;
DROP INDEX "commissions_referred_user_id_key";
CREATE UNIQUE INDEX "commissions_membership_referred_key"
  ON "commissions"("referred_user_id") WHERE "source" = 'membership';
CREATE INDEX "commissions_referred_user_id_idx" ON "commissions"("referred_user_id");
CREATE UNIQUE INDEX "commissions_fundraising_id_key" ON "commissions"("fundraising_id");
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_fundraising_id_fkey" FOREIGN KEY ("fundraising_id") REFERENCES "project_fundraisings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_source_key_check" CHECK (
  ("source" = 'membership' AND "fee_period_id" IS NOT NULL AND "fundraising_id" IS NULL) OR
  ("source" = 'fundraising' AND "fundraising_id" IS NOT NULL AND "fee_period_id" IS NULL)
);
