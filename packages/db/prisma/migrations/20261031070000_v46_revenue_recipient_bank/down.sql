-- Manual rollback only: export beneficiary bank records first if any have been recorded.
DROP TABLE IF EXISTS "revenue_recipient_banks";
