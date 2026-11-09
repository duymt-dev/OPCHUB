-- Owner-approved durable classification claim, independent of optional llm_calls logs.
CREATE TABLE moderation_ai_claims (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Verified with 200k rows / 90-day retention; seek IDs before reading metadata.
CREATE INDEX ai_calls_purpose_page ON llm_calls(purpose, created_at DESC, id DESC) INCLUDE(status, provider);
CREATE INDEX ai_calls_status_page ON llm_calls(status, created_at DESC, id DESC) INCLUDE(purpose, provider);
CREATE INDEX ai_calls_provider_page ON llm_calls(provider, created_at DESC, id DESC) INCLUDE(purpose, status);
CREATE INDEX ai_calls_purpose_status_page ON llm_calls(purpose, status, created_at DESC, id DESC) INCLUDE(provider);
CREATE INDEX ai_calls_metrics ON llm_calls(created_at DESC, id DESC)
  INCLUDE(purpose, status, provider, cost, prompt_tokens, completion_tokens);
