-- D-122: seek only affected customer/status/anchor ranges when an older receipt arrives.
-- Generated with Prisma schema diff after create-only hit the historical CITEXT shadow issue.
-- INCLUDE columns serve the date CTE; policy/amounts are joined by PK only for affected rows.
CREATE INDEX "revenue_shares_customer_anchor"
  ON "revenue_shares" ("customer_id", "status", "first_received_at")
  INCLUDE ("id", "received_at");
