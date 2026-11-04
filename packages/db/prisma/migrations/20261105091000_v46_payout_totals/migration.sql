-- Owner-approved Q-V46-802-6: totals can exceed int32 VND. Preserve applied migration.
ALTER TABLE "regional_payouts" ALTER COLUMN "amount" SET DATA TYPE BIGINT;
