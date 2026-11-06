-- Verify all amounts fit int32 before rollback.
ALTER TABLE regional_payouts ALTER COLUMN amount TYPE integer;
