-- Downgrade requires removing/archiving renewal rows first; uniqueness must not silently discard data.
CREATE UNIQUE INDEX commissions_membership_referred_key ON commissions(referred_user_id) WHERE source='membership';
ALTER TABLE commissions DROP COLUMN customer_year;
ALTER TABLE affiliate_policy DROP COLUMN renewal_rate,DROP COLUMN renewal_max_year;
