-- Destructive rollback: export ledger/payout records first; owner-authorized maintenance only.
BEGIN;
DROP TABLE revenue_shares;
DROP TABLE revenue_payouts;
DROP TABLE revenue_customers;
DROP TYPE revenue_share_status;
ALTER TABLE affiliate_policy DROP CONSTRAINT affiliate_policy_sharing_rates,
  DROP COLUMN year_one_rate, DROP COLUMN annual_decrease, DROP COLUMN minimum_rate;
COMMIT;
