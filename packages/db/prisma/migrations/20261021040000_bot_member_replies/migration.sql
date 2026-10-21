-- Reviewed additive offline/create-only diff plus reply invariant/covering indexes.
-- All statements are transactional; no dev data reset and no silent deduplication.
BEGIN;
-- AlterTable
ALTER TABLE "bot_threads" ADD COLUMN     "reply_room_id" TEXT;

CREATE UNIQUE INDEX "bot_threads_one_pending_reply_per_room"
  ON "bot_threads" ("reply_room_id")
  WHERE "kind" = 'reply' AND "status" IN ('scheduled', 'running') AND "reply_room_id" IS NOT NULL;
CREATE INDEX "bot_threads_reply_cooldown_idx"
  ON "bot_threads" ("reply_room_id", "created_at" DESC, "id" DESC) WHERE "kind" = 'reply';

-- Thread GC cannot erase the one-reply-per-trigger invariant: soft-deleted messages remain indexed.
CREATE UNIQUE INDEX "messages_bot_reply_trigger_key"
  ON "messages" ("reply_to_id") INCLUDE ("id") WHERE "is_simulated" AND "reply_to_id" IS NOT NULL;
CREATE INDEX "messages_bot_reply_cooldown_idx"
  ON "messages" ("room_id", "created_at" DESC, "id" DESC) WHERE "is_simulated" AND "reply_to_id" IS NOT NULL;
CREATE INDEX "personas_enabled_groups_idx" ON "personas" USING GIN ("group_ids") WHERE "enabled";
COMMIT;
