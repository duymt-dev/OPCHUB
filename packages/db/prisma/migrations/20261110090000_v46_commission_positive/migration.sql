-- BR-463: preserve historical zero commissions; PostgreSQL checks all new writes.
-- NOT VALID deliberately avoids rewriting or validating those historical records.
ALTER TABLE commissions ADD CONSTRAINT commissions_amount_positive CHECK (amount > 0) NOT VALID;
