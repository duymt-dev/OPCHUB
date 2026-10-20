-- Keep the new identity invariant without indexing every legacy/human NULL-context row.
-- The context CHECK guarantees bot_thread_id/turn are either both present or both absent.
-- This also prevents an irrelevant room-prefix index from displacing the ordered prune index.
BEGIN;
DROP INDEX "messages_bot_thread_turn_key";
CREATE UNIQUE INDEX "messages_bot_thread_turn_key" ON "messages" ("room_id", "bot_thread_id", "bot_turn")
  WHERE "bot_thread_id" IS NOT NULL;
COMMIT;
