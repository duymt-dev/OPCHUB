-- AlterTable
ALTER TABLE "bot_scripts" ADD COLUMN     "last_run_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "bot_threads" ADD COLUMN     "cursor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'script',
ADD COLUMN     "next_at" TIMESTAMPTZ(6),
ADD COLUMN     "persona_queue" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "trigger_message_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bot_threads_trigger_message_id_key" ON "bot_threads"("trigger_message_id");
