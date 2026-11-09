-- Preserve history instead of deleting expired-package mail logs.
BEGIN;
UPDATE mail_logs SET kind='fundraising' WHERE kind::text='fundraising_expired';
ALTER TYPE mail_kind RENAME TO mail_kind_with_expiry;
CREATE TYPE mail_kind AS ENUM ('otp','welcome','password_reset','fee_reminder','event','campaign','test','service','fundraising','onboarding','receipt','regional_director','regional_director_appoint','regional_director_revoke');
DROP INDEX mail_logs_sent_visible;
ALTER TABLE mail_logs ALTER COLUMN kind TYPE mail_kind USING kind::text::mail_kind;
CREATE INDEX mail_logs_sent_visible ON mail_logs(created_at DESC,id)
WHERE status='sent' AND kind IN ('welcome','campaign');
DROP TYPE mail_kind_with_expiry;
COMMIT;
