-- CreateTable
CREATE TABLE "llm_providers" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "base_url" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "key_enc" BYTEA,
    "status" TEXT NOT NULL DEFAULT 'none',
    "checked_at" TIMESTAMPTZ(6),
    "price_in" INTEGER NOT NULL DEFAULT 0,
    "price_out" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "llm_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_calls" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" BIGINT NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,

    CONSTRAINT "llm_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usage_months" (
    "month" TEXT NOT NULL,
    "cost" BIGINT NOT NULL DEFAULT 0,
    "prompt_tokens" BIGINT NOT NULL DEFAULT 0,
    "completion_tokens" BIGINT NOT NULL DEFAULT 0,
    "calls" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "llm_usage_months_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE INDEX "llm_calls_created_at_id_idx" ON "llm_calls"("created_at", "id");


ALTER TABLE llm_providers ADD CONSTRAINT llm_provider_enabled CHECK (NOT enabled OR (base_url <> '' AND model <> '' AND key_enc IS NOT NULL)), ADD CONSTRAINT llm_provider_id CHECK (id IN ('claude','openai','gemini','deepseek','usgate','custom')), ADD CONSTRAINT llm_provider_status CHECK (status IN ('none','ok','err')), ADD CONSTRAINT llm_provider_prices CHECK (price_in >= 0 AND price_out >= 0);
ALTER TABLE llm_calls ADD CONSTRAINT llm_call_values CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND cost >= 0 AND latency_ms >= 0 AND purpose IN ('bot','script','content','mod') AND status IN ('ok','error','fallback'));
ALTER TABLE llm_usage_months ADD CONSTRAINT llm_usage_values CHECK (cost >= 0 AND prompt_tokens >= 0 AND completion_tokens >= 0 AND calls >= 0 AND month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

INSERT INTO llm_providers (id,base_url,model,updated_at) VALUES
('claude','https://api.anthropic.com/v1','claude-sonnet-4-5',now()),
('openai','https://api.openai.com/v1','gpt-4.1',now()),
('gemini','https://generativelanguage.googleapis.com/v1beta/openai','gemini-2.5-pro',now()),
('deepseek','https://api.deepseek.com/v1','deepseek-chat',now()),
('usgate','https://gateway.usgate.vn/v1','auto',now()),
('custom','','',now());
UPDATE llm_providers p SET base_url=c.base_url, model=c.model, key_enc=c.key_enc, enabled=c.enabled FROM llm_configs c WHERE p.id='custom' AND c.id=1 AND c.key_enc IS NOT NULL;
INSERT INTO app_settings (key,value,updated_at) VALUES ('ai','{"use":{"bot":"claude","script":"claude","content":"claude","mod":"usgate"},"fallback":"usgate","temperature":0.7,"maxTokens":1024,"timeoutMs":60000,"budget":5000000,"warnPct":80,"log":true,"pii":true}'::jsonb,now()),('app','{"pwa":true,"push":{"msg":true,"need":true,"renew":true,"event":true,"store":false}}'::jsonb,now()) ON CONFLICT (key) DO NOTHING;
UPDATE app_settings a SET value = a.value || jsonb_build_object('use',jsonb_build_object('bot','custom','script','custom','content','claude','mod','usgate'),'maxTokens',c.max_tokens,'timeoutMs',c.timeout_ms) FROM llm_configs c WHERE a.key='ai' AND c.id=1 AND c.key_enc IS NOT NULL;
