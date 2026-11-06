-- Owner-approved narrow TIP-805 exception: widen CHECK only, no columns/table replacement.
ALTER TABLE fee_reminders DROP CONSTRAINT fee_reminders_milestone_check;
ALTER TABLE fee_reminders ADD CONSTRAINT fee_reminders_milestone_check CHECK (
  milestone IN ('T-30','T-7','T-0','T+3','D30','D7','D1') OR
  milestone ~ '^M:[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
);
