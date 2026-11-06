-- Rollback only TIP-811 additions; legacy llm_configs remains unchanged.
DELETE FROM app_settings WHERE key IN ('ai','app');
DROP TABLE llm_calls;
DROP TABLE llm_usage_months;
DROP TABLE llm_providers;
