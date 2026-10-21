-- Identity checks bind all three keys; order is irrelevant to uniqueness.
-- Put turn first so this invariant index does not compete with room/thread visibility reads.
-- Opening detection uses the existing partial UNIQUE(room_id,bot_thread_id) WHERE bot_opening.
BEGIN;
DROP INDEX "messages_bot_thread_turn_key";
CREATE UNIQUE INDEX "messages_bot_thread_turn_key" ON "messages" ("bot_turn", "bot_thread_id", "room_id")
  WHERE "bot_thread_id" IS NOT NULL;
COMMIT;
