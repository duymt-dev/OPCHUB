-- Offline/create-only additive migration, reviewed separately from application.
-- Group-scoped hide seeks room equality within the smaller unhidden-persona set.
BEGIN;
CREATE INDEX "messages_unhidden_persona_room_idx" ON "messages" ("room_id", "id")
  WHERE "is_simulated" AND "hidden_at" IS NULL;
COMMIT;
