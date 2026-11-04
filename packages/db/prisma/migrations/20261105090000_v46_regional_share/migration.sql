-- CreateEnum
CREATE TYPE "regional_share_source" AS ENUM ('membership', 'fundraising');

-- CreateEnum
CREATE TYPE "regional_share_status" AS ENUM ('pending', 'paid');

ALTER TABLE regional_director_events ADD COLUMN bank_snapshot jsonb;
CREATE INDEX regional_events_payee_bank ON regional_director_events(region,user_id,created_at DESC,id DESC)
  INCLUDE(bank_snapshot) WHERE action = 'revoke' AND bank_snapshot IS NOT NULL;

-- AlterTable
ALTER TABLE "affiliate_policy" ADD COLUMN     "regional_first_year" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "regional_min" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "regional_step" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "customer_years" (
    "user_id" TEXT NOT NULL,
    "first_paid_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "regional_share_source" NOT NULL,
    "source_id" TEXT NOT NULL,

    CONSTRAINT "customer_years_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "regional_shares" (
    "id" TEXT NOT NULL,
    "source" "regional_share_source" NOT NULL,
    "source_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "affiliate_user_id" TEXT NOT NULL,
    "region" "region",
    "director_user_id" TEXT,
    "plan" "commission_plan" NOT NULL,
    "base_amount" INTEGER NOT NULL,
    "customer_year" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "director_amount" INTEGER NOT NULL,
    "media_soft_amount" INTEGER NOT NULL,
    "month_key" CHAR(7) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "regional_share_status" NOT NULL DEFAULT 'pending',
    "payout_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_payouts" (
    "id" TEXT NOT NULL,
    "region" "region" NOT NULL,
    "director_user_id" TEXT NOT NULL,
    "month_keys" TEXT[],
    "amount" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "bank_snapshot" JSONB NOT NULL,
    "paid_by" TEXT NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regional_shares_region_recorded_at_id_idx" ON "regional_shares"("region", "recorded_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "regional_shares_source_source_id_key" ON "regional_shares"("source", "source_id");

-- CreateIndex
CREATE INDEX "regional_payouts_region_paid_at_id_idx" ON "regional_payouts"("region", "paid_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "regional_payouts_region_director_user_id_paid_at_id_idx" ON "regional_payouts"("region", "director_user_id", "paid_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "regional_shares" ADD CONSTRAINT "regional_shares_region_fkey" FOREIGN KEY ("region") REFERENCES "regional_directors"("region") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_shares" ADD CONSTRAINT "regional_shares_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "regional_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_payouts" ADD CONSTRAINT "regional_payouts_region_fkey" FOREIGN KEY ("region") REFERENCES "regional_directors"("region") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE affiliate_policy ADD CONSTRAINT regional_policy_range CHECK (
  regional_first_year BETWEEN 1 AND 100 AND regional_step BETWEEN 0 AND 100
  AND regional_min BETWEEN 0 AND regional_first_year);
ALTER TABLE customer_years ADD CONSTRAINT customer_years_user_fk FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE regional_shares ADD CONSTRAINT regional_share_amounts CHECK (
  base_amount > 0 AND customer_year >= 1 AND percent BETWEEN 0 AND 100
  AND director_amount >= 0 AND media_soft_amount >= 0
  AND director_amount::bigint + media_soft_amount::bigint = base_amount);
-- Owner clarification Q-V46-802-5: an occupied region can legitimately have a zero percent policy.
ALTER TABLE regional_shares ADD CONSTRAINT regional_share_recipient CHECK (
  (region IS NULL) = (director_user_id IS NULL)
  AND (region IS NOT NULL OR (percent = 0 AND director_amount = 0)));
ALTER TABLE regional_shares ADD CONSTRAINT regional_share_paid CHECK ((status = 'paid') = (payout_id IS NOT NULL));
ALTER TABLE regional_shares ADD CONSTRAINT regional_share_month CHECK (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$');
ALTER TABLE regional_payouts ADD CONSTRAINT regional_payout_positive CHECK (amount >= 0 AND count > 0);
CREATE INDEX regional_share_kpi ON regional_shares(region,status,month_key)
  INCLUDE(director_amount,affiliate_id,director_user_id) WHERE region IS NOT NULL;
CREATE INDEX regional_share_payable ON regional_shares(region,director_user_id,status,month_key,id)
  INCLUDE(director_amount);

-- D-130: only customer-year anchors are backfilled; never manufacture retroactive revenue shares.
INSERT INTO customer_years(user_id,first_paid_at,source,source_id)
SELECT DISTINCT ON (user_id) user_id,at,source::regional_share_source,id FROM (
  SELECT user_id,created_at AS at,'membership' AS source,id,0 AS priority
    FROM membership_fee_periods WHERE amount > 0
  UNION ALL
  SELECT owner_id,paid_at,'fundraising',id,1 FROM project_fundraisings
    WHERE NOT legacy AND amount > 0 AND paid_at IS NOT NULL AND status IN ('pending_review','active','expired')
) receipts ORDER BY user_id,at,priority,id
ON CONFLICT(user_id) DO UPDATE SET first_paid_at=EXCLUDED.first_paid_at,source=EXCLUDED.source,source_id=EXCLUDED.source_id
WHERE EXCLUDED.first_paid_at < customer_years.first_paid_at;
