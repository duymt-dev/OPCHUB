-- D-119/121, AT-GDV04: bank ownership follows the beneficiary, not a reusable regional slot.
-- Prisma schema diff after historical CITEXT shadow replay failed; additive only.
CREATE TABLE "revenue_recipient_banks" (
    "director_id" TEXT NOT NULL,
    "bank_name" TEXT,
    "bank_no" TEXT,
    "bank_holder" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revenue_recipient_banks_pkey" PRIMARY KEY ("director_id"),
    CONSTRAINT "revenue_recipient_banks_complete" CHECK (
      (bank_name IS NULL AND bank_no IS NULL AND bank_holder IS NULL)
      OR (bank_name IS NOT NULL AND bank_no IS NOT NULL AND bank_holder IS NOT NULL
        AND length(btrim(bank_name)) > 0 AND length(btrim(bank_no)) > 0 AND length(btrim(bank_holder)) > 0)
    )
);
