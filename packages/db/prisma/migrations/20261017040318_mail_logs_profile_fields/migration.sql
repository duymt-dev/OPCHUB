-- CreateEnum
CREATE TYPE "mail_kind" AS ENUM ('otp', 'welcome', 'password_reset', 'fee_reminder', 'event', 'campaign', 'test');

-- CreateEnum
CREATE TYPE "mail_status" AS ENUM ('queued', 'sent', 'failed');

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "website" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'vn';

-- CreateTable
CREATE TABLE "mail_logs" (
    "id" TEXT NOT NULL,
    "to" CITEXT NOT NULL,
    "kind" "mail_kind" NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT,
    "status" "mail_status" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "error" TEXT,
    "campaign_id" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mail_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mail_logs_kind_created_at_idx" ON "mail_logs"("kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "mail_logs_campaign_id_idx" ON "mail_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "mail_logs_to_created_at_idx" ON "mail_logs"("to", "created_at" DESC);
