-- TIP-501/502 expand step, generated offline/create-only then reviewed.
-- Keep legacy pending/posted and nullable next_at until the explicit runtime/API cutover.
-- No shadow database, dev reset, thread deletion, queued turn or message publication here.
ALTER TABLE "bot_scripts" ADD COLUMN "last_run_at" TIMESTAMPTZ(6);

ALTER TABLE "bot_threads"
  ADD COLUMN "cursor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'script',
  ADD COLUMN "next_at" TIMESTAMPTZ(6),
  ADD COLUMN "persona_queue" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "trigger_message_id" TEXT,
  ADD CONSTRAINT "bot_threads_cursor_nonnegative" CHECK ("cursor" >= 0),
  ADD CONSTRAINT "bot_threads_execution_kind" CHECK ("kind" IN ('script', 'auto', 'reply'));

-- Preserve posted history; derive ordered persona IDs only from valid string snapshot fields.
UPDATE "bot_threads" t SET
  "kind" = CASE WHEN t."is_auto" THEN 'auto' ELSE 'script' END,
  "cursor" = CASE WHEN t."status" = 'posted' AND jsonb_typeof(t."lines") = 'array'
    THEN jsonb_array_length(t."lines") ELSE 0 END,
  "persona_queue" = ARRAY(
    SELECT x.line->>'personaId'
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t."lines") = 'array'
      THEN t."lines" ELSE '[]'::jsonb END) WITH ORDINALITY AS x(line, position)
    WHERE jsonb_typeof(x.line->'personaId') = 'string'
    ORDER BY x.position
  );

CREATE UNIQUE INDEX "bot_threads_trigger_message_id_key"
  ON "bot_threads" ("trigger_message_id");

-- Equality first, due-time/id ordering next; cursor is payload, not a sorting key.
CREATE INDEX "bot_threads_execution_due_idx"
  ON "bot_threads" ("status", "next_at", "id") INCLUDE ("cursor")
  WHERE "next_at" IS NOT NULL;

CREATE INDEX "bot_scripts_schedule_due_idx"
  ON "bot_scripts" ("enabled", "run_at", "id") INCLUDE ("last_run_at")
  WHERE "run_at" IS NOT NULL;
