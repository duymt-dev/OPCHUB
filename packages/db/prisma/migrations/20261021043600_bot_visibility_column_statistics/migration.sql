-- Correct the experimental expression statistics without rewriting an applied migration.
-- PostgreSQL matches the query's NullTest to hidden_at, not the whole boolean expression.
BEGIN;
DROP STATISTICS "messages_persona_visibility_stats";
CREATE STATISTICS "messages_persona_visibility_stats" (mcv, dependencies)
  ON "is_simulated", "hidden_at" FROM "messages";
ANALYZE "messages";
COMMIT;
