-- Only run on the explicitly approved migration-check DB, never HOLD data.
ALTER TABLE "llm_calls" DROP CONSTRAINT "llm_calls_actor_realm_check",
  DROP COLUMN "actor_id", DROP COLUMN "actor_realm";
ALTER TABLE "llm_usage_months" DROP COLUMN "exhausted_at", DROP COLUMN "warned_at";
