-- REQ-617: equality first, then stable ledger cursor. Deferred join fetches only selected payloads.
CREATE INDEX "revenue_shares_director_ledger"
ON "revenue_shares" ("director_id", "received_at" DESC, "id" DESC);

-- Beneficiary-scoped totals/month keyset can read the narrow covering leaf rather than full snapshots.
CREATE INDEX "revenue_shares_director_months"
ON "revenue_shares" ("director_id", "month_key" DESC)
INCLUDE ("status", "amount", "director_amount", "media_soft_amount");
