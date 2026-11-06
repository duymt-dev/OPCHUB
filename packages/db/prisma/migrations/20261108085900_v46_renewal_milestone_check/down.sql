-- Roll back the data migration first. Preserve existing manual history without rewriting it.
-- NOT VALID retains M: historical rows while enforcing legacy codes on all future writes.
ALTER TABLE fee_reminders DROP CONSTRAINT fee_reminders_milestone_check;
ALTER TABLE fee_reminders ADD CONSTRAINT fee_reminders_milestone_check
  CHECK (milestone IN ('T-30','T-7','T-0','T+3')) NOT VALID;
