-- Recreates the empty legacy table only; deleted configuration data is not restored.
CREATE TABLE "llm_configs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "base_url" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "key_enc" BYTEA,
    "max_tokens" INTEGER NOT NULL DEFAULT 128,
    "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "llm_configs_pkey" PRIMARY KEY ("id")
);

-- Singleton configuration uses its primary key; no secondary scan/index required.
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_singleton" CHECK (id = 1);
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_token_bounds" CHECK (max_tokens BETWEEN 16 AND 1024);
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_timeout_bounds" CHECK (timeout_ms BETWEEN 1000 AND 120000);
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_enabled_complete"
CHECK (NOT enabled OR (length(base_url) > 0 AND length(model) > 0 AND key_enc IS NOT NULL));

