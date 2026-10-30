-- SQL CHECK regards NULL as passing: require all three bank fields explicitly.
ALTER TABLE regional_directors DROP CONSTRAINT regional_directors_bank;
ALTER TABLE regional_directors ADD CONSTRAINT regional_directors_bank CHECK (
  (bank_name IS NULL AND bank_no IS NULL AND bank_holder IS NULL)
  OR (bank_name IS NOT NULL AND bank_no IS NOT NULL AND bank_holder IS NOT NULL
    AND length(bank_name) BETWEEN 1 AND 100 AND bank_no ~ '^[0-9]{6,19}$'
    AND bank_holder ~ '^[A-Z ]+$')
);
