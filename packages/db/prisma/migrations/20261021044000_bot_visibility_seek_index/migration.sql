-- Equality keys precede room scope; id is payload only. Human messages are not indexed.
-- Unlike a predicate-only unhidden index, global hide now has real B-tree search bounds.
BEGIN;
CREATE INDEX "messages_persona_visibility_seek_idx"
  ON "messages" ("is_simulated", "hidden_at", "room_id") INCLUDE ("id")
  WHERE "is_simulated";
COMMIT;
