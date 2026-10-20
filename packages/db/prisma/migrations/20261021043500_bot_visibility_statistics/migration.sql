-- Additive offline/create-only refinement: hidden/null and simulated are correlated.
-- Boolean expression keeps the MCV domain bounded even with many distinct hide timestamps.
BEGIN;
CREATE STATISTICS "messages_persona_visibility_stats" (mcv, dependencies)
  ON "is_simulated", ("hidden_at" IS NULL) FROM "messages";
ANALYZE "messages";
COMMIT;
