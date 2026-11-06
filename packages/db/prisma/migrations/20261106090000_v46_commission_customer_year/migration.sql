-- D-131: snapshots, independent unique source IDs remain the replay fence.
ALTER TABLE commissions ADD COLUMN customer_year INTEGER NOT NULL DEFAULT 1;
ALTER TABLE affiliate_policy ADD COLUMN renewal_rate INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN renewal_max_year INTEGER NOT NULL DEFAULT 3;
ALTER TABLE commissions ADD CONSTRAINT commissions_customer_year_check CHECK (customer_year>=1);
ALTER TABLE affiliate_policy ADD CONSTRAINT affiliate_policy_renewal_rate_check CHECK (renewal_rate BETWEEN 0 AND 50),
  ADD CONSTRAINT affiliate_policy_renewal_max_year_check CHECK (renewal_max_year BETWEEN 1 AND 10);
DROP INDEX IF EXISTS commissions_membership_referred_key;
-- Anniversary in Vietnam; Feb 29 is clamped by make_interval's month/year arithmetic.
UPDATE commissions c SET customer_year=GREATEST(1,
  EXTRACT(YEAR FROM c.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int -
  EXTRACT(YEAR FROM y.first_paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int +
  CASE WHEN (c.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >=
    ((y.first_paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + make_interval(years =>
      EXTRACT(YEAR FROM c.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int -
      EXTRACT(YEAR FROM y.first_paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int))::date
  THEN 1 ELSE 0 END)
FROM customer_years y WHERE y.user_id=c.referred_user_id;
