-- V4-611 (REQ-505, D-85, D-88): Hướng dẫn bắt đầu 8 bước — cờ, nhắc, tiến độ cho bộ lọc Admin
-- CreateEnum
CREATE TYPE "onboarding_flag_key" AS ENUM ('explore', 'affiliate_share');

-- AlterEnum
ALTER TYPE "mail_kind" ADD VALUE 'onboarding';

-- CreateTable
CREATE TABLE "onboarding_flags" (
    "user_id" TEXT NOT NULL,
    "key" "onboarding_flag_key" NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_flags_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "onboarding_reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mailed_at" TIMESTAMPTZ(6),

    CONSTRAINT "onboarding_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "user_id" TEXT NOT NULL,
    "done" SMALLINT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "onboarding_reminders_user_id_sent_at_idx" ON "onboarding_reminders"("user_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "onboarding_progress_done_user_id_idx" ON "onboarding_progress"("done", "user_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- AddForeignKey
ALTER TABLE "onboarding_flags" ADD CONSTRAINT "onboarding_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_reminders" ADD CONSTRAINT "onboarding_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 0..8 bước (D-85)
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_done_check" CHECK ("done" BETWEEN 0 AND 8);
