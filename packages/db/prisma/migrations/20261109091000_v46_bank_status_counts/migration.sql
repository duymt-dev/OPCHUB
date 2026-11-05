-- Exact settings KPIs seek a compact status index instead of scanning raw webhook rows.
CREATE INDEX payment_transactions_bank_counts ON payment_transactions(match_status)
  WHERE match_status IN ('matched','unmatched','short');
