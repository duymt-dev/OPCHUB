INSERT INTO fee_reminders (user_id, valid_until, milestone, sent_at)
SELECT user_id, valid_until,
  CASE milestone WHEN 'D30' THEN 'T-30' WHEN 'D7' THEN 'T-7' ELSE 'T-0' END, sent_at
FROM fee_reminders WHERE milestone IN ('D30','D7','D1')
ON CONFLICT (user_id, valid_until, milestone) DO UPDATE
  SET sent_at = GREATEST(fee_reminders.sent_at, EXCLUDED.sent_at);
DELETE FROM fee_reminders WHERE milestone IN ('D30','D7','D1');
DROP INDEX IF EXISTS fee_reminders_last_sent;
DROP INDEX IF EXISTS membership_fees_renewal;
-- Keep saved renewal configuration and manual M: history; rollback never deletes operator data.
