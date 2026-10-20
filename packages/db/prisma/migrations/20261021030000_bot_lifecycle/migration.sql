-- TIP-501 runtime cutover. Enum renames preserve history, defaults and existing index OIDs.
ALTER TYPE "bot_thread_status" RENAME VALUE 'pending' TO 'scheduled';
ALTER TYPE "bot_thread_status" RENAME VALUE 'posted' TO 'done';
ALTER TYPE "bot_thread_status" ADD VALUE 'running' AFTER 'scheduled';

UPDATE "bot_threads" SET "next_at" = now()
WHERE "status" = 'scheduled' AND "next_at" IS NULL;

-- Legacy API writes between expand and cutover must also have ordered snapshots.
UPDATE "bot_threads" t SET "persona_queue" = ARRAY(
  SELECT x.line->>'personaId'
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t."lines") = 'array'
    THEN t."lines" ELSE '[]'::jsonb END) WITH ORDINALITY AS x(line, position)
  WHERE jsonb_typeof(x.line->'personaId') = 'string' ORDER BY x.position
) WHERE cardinality(t."persona_queue") = 0;

CREATE INDEX "bot_threads_done_gc_idx" ON "bot_threads" ("created_at", "id")
  WHERE "status" = 'done';

CREATE INDEX "messages_persona_day_idx" ON "messages" ("persona_id", "created_at")
  WHERE "is_simulated";

-- Remove obsolete review configuration, not the actual automation switches.
UPDATE "app_settings" SET "value" = "value" - 'requireReview' WHERE "key" = 'bot';
