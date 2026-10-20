-- Preserve the existing persona FK's ON DELETE SET NULL / retained-message contract.
BEGIN;
ALTER TABLE messages DROP CONSTRAINT messages_bot_context_check;
ALTER TABLE messages ADD CONSTRAINT messages_bot_context_check CHECK (
  (bot_thread_id IS NULL AND bot_turn IS NULL AND bot_kind IS NULL AND NOT bot_opening)
  OR (bot_thread_id IS NOT NULL AND bot_turn IS NOT NULL AND bot_turn >= 0
    AND bot_kind IS NOT NULL AND bot_kind IN ('script','auto','reply') AND is_simulated)
);
COMMIT;
