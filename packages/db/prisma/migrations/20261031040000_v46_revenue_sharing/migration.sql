-- V46-802 / D-119, D-121, D-122. create-only was attempted against opchub_dev,
-- with an isolated schema on opchub_test as shadow (no new database).
-- Historical init cannot replay there: CITEXT is installed in public, outside its search_path.
-- Generated this additive DDL with a read-only before/after Prisma schema diff instead.
-- Existing migrations/indexes/data are not reset or rewritten.
-- CreateEnum
CREATE TYPE "revenue_share_status" AS ENUM ('recorded', 'paid');

-- AlterTable
ALTER TABLE "affiliate_policy" ADD COLUMN     "annual_decrease" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "minimum_rate" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "year_one_rate" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "revenue_customers" (
    "user_id" TEXT NOT NULL,
    "first_received_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_customers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "revenue_shares" (
    "id" TEXT NOT NULL,
    "source" "commission_source" NOT NULL,
    "source_id" TEXT NOT NULL,
    "plan" "commission_plan" NOT NULL,
    "customer_id" TEXT NOT NULL,
    "affiliate_id" TEXT,
    "region" "region",
    "director_id" TEXT,
    "director_name" TEXT,
    "bank_name" TEXT,
    "bank_no" TEXT,
    "bank_holder" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "first_received_at" TIMESTAMPTZ(6) NOT NULL,
    "customer_year" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "year_one_rate" INTEGER NOT NULL,
    "annual_decrease" INTEGER NOT NULL,
    "minimum_rate" INTEGER NOT NULL,
    "director_rate" INTEGER NOT NULL,
    "director_amount" INTEGER NOT NULL,
    "media_soft_amount" INTEGER NOT NULL,
    "month_key" CHAR(7) NOT NULL,
    "status" "revenue_share_status" NOT NULL DEFAULT 'recorded',
    "payout_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_payouts" (
    "id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "director_id" TEXT NOT NULL,
    "director_name" TEXT NOT NULL,
    "region" "region" NOT NULL,
    "month_key" CHAR(7) NOT NULL,
    "amount" BIGINT NOT NULL,
    "share_count" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_no" TEXT NOT NULL,
    "bank_holder" TEXT NOT NULL,
    "paid_by" TEXT NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_shares_source_source_id_key" ON "revenue_shares"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_payouts_request_key_key" ON "revenue_payouts"("request_key");

-- AddForeignKey
ALTER TABLE "revenue_customers" ADD CONSTRAINT "revenue_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_shares" ADD CONSTRAINT "revenue_shares_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "revenue_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE affiliate_policy ADD CONSTRAINT affiliate_policy_sharing_rates CHECK (
  year_one_rate BETWEEN 0 AND 100 AND annual_decrease BETWEEN 0 AND 100
  AND minimum_rate BETWEEN 0 AND year_one_rate
);

ALTER TABLE revenue_shares
  ADD CONSTRAINT revenue_shares_source_plan CHECK (
    (source = 'membership' AND plan IN ('personal', 'business'))
    OR (source = 'fundraising' AND plan = 'fundraising')
  ),
  ADD CONSTRAINT revenue_shares_positive_amount CHECK (
    amount > 0 AND director_amount >= 0 AND media_soft_amount >= 0
    AND director_amount::bigint + media_soft_amount::bigint = amount::bigint
  ),
  ADD CONSTRAINT revenue_shares_rates CHECK (
    year_one_rate BETWEEN 0 AND 100 AND annual_decrease BETWEEN 0 AND 100
    AND minimum_rate BETWEEN 0 AND year_one_rate AND director_rate BETWEEN 0 AND 100
    AND customer_year > 0 AND first_received_at <= received_at
    AND director_rate = CASE WHEN director_id IS NULL THEN 0 ELSE
      GREATEST(minimum_rate::bigint, year_one_rate::bigint - annual_decrease::bigint * (customer_year::bigint - 1)) END
    AND director_amount::bigint = (amount::bigint * director_rate::bigint + 50) / 100
  ),
  ADD CONSTRAINT revenue_shares_beneficiary CHECK (
    (director_id IS NULL AND director_name IS NULL AND director_amount = 0)
    OR (director_id IS NOT NULL AND director_name IS NOT NULL
      AND affiliate_id IS NOT NULL AND region IS NOT NULL)
  ),
  ADD CONSTRAINT revenue_shares_bank CHECK (
    (bank_name IS NULL AND bank_no IS NULL AND bank_holder IS NULL)
    OR (director_id IS NOT NULL AND length(btrim(bank_name)) > 0
      AND length(btrim(bank_no)) > 0 AND length(btrim(bank_holder)) > 0
      AND bank_name IS NOT NULL AND bank_no IS NOT NULL AND bank_holder IS NOT NULL)
  ),
  ADD CONSTRAINT revenue_shares_month CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT revenue_shares_settlement CHECK (
    (status = 'recorded' AND payout_id IS NULL)
    OR (status = 'paid' AND payout_id IS NOT NULL AND director_amount > 0 AND director_id IS NOT NULL)
  );

ALTER TABLE revenue_payouts
  ADD CONSTRAINT revenue_payouts_positive CHECK (amount > 0 AND share_count > 0),
  ADD CONSTRAINT revenue_payouts_month CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT revenue_payouts_bank CHECK (
    length(btrim(bank_name)) > 0 AND length(btrim(bank_no)) > 0 AND length(btrim(bank_holder)) > 0
  );

-- Equality before cursor/range. Payload-only amounts belong in INCLUDE.
CREATE INDEX revenue_shares_payable ON revenue_shares (director_id, month_key, id)
  INCLUDE (director_amount) WHERE status = 'recorded' AND director_amount > 0;
CREATE INDEX revenue_shares_customer_history ON revenue_shares (customer_id, received_at DESC, id DESC)
  INCLUDE (amount, director_amount, media_soft_amount);
CREATE INDEX revenue_shares_payout ON revenue_shares (payout_id, id) WHERE payout_id IS NOT NULL;
CREATE INDEX revenue_payouts_director_history ON revenue_payouts (director_id, paid_at DESC, id DESC)
  INCLUDE (month_key, amount, share_count);
CREATE INDEX revenue_payouts_history ON revenue_payouts (paid_at DESC, id DESC)
  INCLUDE (director_id, month_key, amount, share_count);

-- D-122: backfill epochs only. D-121 forbids inventing retrospective entitlements.
-- Bankless manual collections use the recorded period timestamp, never a future renewed starts_at.
-- A rejected project review is not a cancelled bank reconciliation: only actual payment status matters.
INSERT INTO revenue_customers (user_id, first_received_at)
SELECT receipts.user_id, MIN(receipts.received_at)
FROM (
  SELECT f.user_id, COALESCE(p.received_at, f.created_at) AS received_at
  FROM membership_fee_periods f
  LEFT JOIN payment_transactions p ON p.id = f.payment_transaction_id
  WHERE f.amount > 0 AND (
    (f.payment_transaction_id IS NULL AND f.source = 'manual')
    OR (p.amount > 0 AND p.match_status IN ('matched', 'manual'))
  )
  UNION ALL
  SELECT f.owner_id AS user_id, p.received_at
  FROM project_fundraisings f
  JOIN payment_transactions p ON p.id = f.payment_transaction_id
  WHERE f.legacy = false AND f.amount > 0 AND f.paid_at IS NOT NULL
    AND p.amount > 0 AND p.match_status IN ('matched', 'manual')
) receipts
GROUP BY receipts.user_id;
