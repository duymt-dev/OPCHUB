-- Preserve delivery history and tolerate a mixed-version deployment containing new codes.
INSERT INTO fee_reminders (user_id, valid_until, milestone, sent_at)
SELECT user_id, valid_until,
  CASE milestone WHEN 'T-30' THEN 'D30' WHEN 'T-7' THEN 'D7' ELSE 'D1' END, sent_at
FROM fee_reminders WHERE milestone IN ('T-30','T-7','T-0')
ON CONFLICT (user_id, valid_until, milestone) DO UPDATE
  SET sent_at = GREATEST(fee_reminders.sent_at, EXCLUDED.sent_at);
DELETE FROM fee_reminders WHERE milestone IN ('T-30','T-7','T-0');
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('renewal', '{"milestones":{"d30":true,"d7":true,"d1":true},"channels":{"email":true,"app":true}}', now())
ON CONFLICT (key) DO NOTHING;
CREATE INDEX fee_reminders_last_sent ON fee_reminders (user_id, sent_at DESC);
-- Eligibility constants in partial predicate; range and stable cursor form the seek key.
CREATE INDEX membership_fees_renewal ON membership_fees (valid_until, user_id)
  INCLUDE (plan, amount, paid_at)
  WHERE status IN ('trial','active','expiring') AND plan IN ('personal','business');
