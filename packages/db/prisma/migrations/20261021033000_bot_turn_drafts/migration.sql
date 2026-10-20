-- Reviewed offline/create-only diff: additive durable LLM claims, no dev reset.
-- CreateTable
CREATE TABLE "bot_turn_drafts" (
    "thread_id" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "claim_id" TEXT NOT NULL,
    "lease_until" TIMESTAMPTZ(6) NOT NULL,
    "body" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bot_turn_drafts_pkey" PRIMARY KEY ("thread_id","turn")
);

-- AddForeignKey
ALTER TABLE "bot_turn_drafts" ADD CONSTRAINT "bot_turn_drafts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "bot_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bot_turn_drafts"
  ADD CONSTRAINT "bot_turn_drafts_turn_nonnegative" CHECK ("turn" >= 0),
  ADD CONSTRAINT "bot_turn_drafts_body_bounded" CHECK ("body" IS NULL OR char_length("body") BETWEEN 1 AND 4000);
