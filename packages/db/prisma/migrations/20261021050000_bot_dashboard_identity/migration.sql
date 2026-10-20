-- Reviewed offline/create-only schema diff plus private identity, backfill and read indexes.
BEGIN;
ALTER TABLE "messages" ADD COLUMN "bot_kind" TEXT,
  ADD COLUMN "bot_opening" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bot_thread_id" TEXT,
  ADD COLUMN "bot_turn" INTEGER;

-- Only recover known canonical executions; do not guess identities/types of legacy messages.
WITH parsed AS (
  SELECT id, regexp_match(client_msg_id, '^bot-([A-Za-z0-9_-]+)-([0-9]{1,9})$') AS parts
  FROM messages WHERE is_simulated AND persona_id IS NOT NULL AND client_msg_id LIKE 'bot-%'
)
UPDATE messages m SET bot_thread_id = p.parts[1], bot_turn = p.parts[2]::integer, bot_kind = t.kind
FROM parsed p JOIN bot_threads t ON t.id = p.parts[1] AND t.kind IN ('script','auto','reply')
WHERE m.id = p.id AND p.parts IS NOT NULL;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY room_id, bot_thread_id ORDER BY bot_turn, created_at, id) AS n
  FROM messages WHERE bot_thread_id IS NOT NULL
)
UPDATE messages m SET bot_opening = (ranked.n = 1) FROM ranked WHERE m.id = ranked.id;

ALTER TABLE messages ADD CONSTRAINT messages_bot_context_check CHECK (
  (bot_thread_id IS NULL AND bot_turn IS NULL AND bot_kind IS NULL AND NOT bot_opening)
  OR (bot_thread_id IS NOT NULL AND bot_turn IS NOT NULL AND bot_turn >= 0
    AND bot_kind IS NOT NULL AND bot_kind IN ('script','auto','reply') AND is_simulated AND persona_id IS NOT NULL)
);
-- Existing duplicate canonical identities abort this migration, never silently deduplicated.
CREATE UNIQUE INDEX "messages_bot_thread_turn_key" ON "messages" ("room_id", "bot_thread_id", "bot_turn");
CREATE UNIQUE INDEX messages_bot_opening_key ON messages(room_id, bot_thread_id) WHERE bot_opening;
-- Global newest-first keyset + room-scoped variant; payload identifiers are INCLUDE columns.
CREATE INDEX messages_bot_dashboard_newest_idx ON messages(created_at DESC, id DESC)
  INCLUDE(room_id, bot_thread_id) WHERE is_simulated AND bot_opening AND hidden_at IS NULL AND deleted_at IS NULL;
CREATE INDEX messages_bot_dashboard_room_idx ON messages(room_id, created_at DESC, id DESC)
  INCLUDE(bot_thread_id) WHERE is_simulated AND bot_opening AND hidden_at IS NULL AND deleted_at IS NULL;
CREATE INDEX messages_bot_thread_visible_idx ON messages(room_id, bot_thread_id, created_at, id)
  WHERE bot_thread_id IS NOT NULL AND hidden_at IS NULL AND deleted_at IS NULL;
CREATE INDEX messages_visible_reply_idx ON messages(reply_to_id, created_at, id)
  WHERE reply_to_id IS NOT NULL AND hidden_at IS NULL AND deleted_at IS NULL;
COMMIT;
