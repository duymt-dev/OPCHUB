-- CreateTable
CREATE TABLE "bot_reply_runs" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "message_ids" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "posted" INTEGER NOT NULL DEFAULT 0,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "delay_seconds" INTEGER NOT NULL DEFAULT 5,
    "active_thread_id" TEXT,
    "next_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bot_reply_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_reply_runs_status_next_at_id_idx" ON "bot_reply_runs"("status", "next_at", "id") INCLUDE ("active_thread_id");

-- CreateIndex
CREATE INDEX "bot_reply_runs_created_at_id_idx" ON "bot_reply_runs"("created_at" DESC, "id" DESC);


-- The prototype has one active reply batch across groups; enforce cross-process races in storage.
CREATE UNIQUE INDEX bot_reply_runs_one_active_idx ON bot_reply_runs ((true)) WHERE status = 'running';
ALTER TABLE bot_reply_runs
  ADD CONSTRAINT bot_reply_runs_status_check CHECK (status IN ('running', 'stopped', 'done')),
  ADD CONSTRAINT bot_reply_runs_size_check CHECK (cardinality(message_ids) BETWEEN 1 AND 200 AND array_position(message_ids, NULL) IS NULL),
  ADD CONSTRAINT bot_reply_runs_progress_check CHECK (cursor BETWEEN 0 AND cardinality(message_ids) AND posted BETWEEN 0 AND cursor),
  ADD CONSTRAINT bot_reply_runs_delay_check CHECK (delay_seconds BETWEEN 1 AND 600),
  ADD CONSTRAINT bot_reply_runs_terminal_check CHECK (status = 'running' OR (next_at IS NULL AND active_thread_id IS NULL)),
  ADD CONSTRAINT bot_reply_runs_done_check CHECK (status <> 'done' OR cursor = cardinality(message_ids));
