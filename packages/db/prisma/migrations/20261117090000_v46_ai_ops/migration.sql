-- TIP-V46-817 / D-138. Additive metadata only; never persist prompts/completions.
ALTER TABLE "llm_calls" ADD COLUMN "actor_id" TEXT,
  ADD COLUMN "actor_realm" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_actor_realm_check"
  CHECK (actor_realm IN ('member', 'admin', 'system'));
ALTER TABLE "llm_usage_months" ADD COLUMN "exhausted_at" TIMESTAMPTZ(6),
  ADD COLUMN "warned_at" TIMESTAMPTZ(6);
