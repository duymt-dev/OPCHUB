-- Roll back only before new business data is accepted; export shares/payouts first.
DROP TABLE regional_shares;
DROP TABLE regional_payouts;
DROP TABLE customer_years;
DROP INDEX regional_events_payee_bank;
ALTER TABLE regional_director_events DROP COLUMN bank_snapshot;
ALTER TABLE affiliate_policy DROP CONSTRAINT regional_policy_range,
  DROP COLUMN regional_first_year, DROP COLUMN regional_step, DROP COLUMN regional_min;
DROP TYPE regional_share_status;
DROP TYPE regional_share_source;
