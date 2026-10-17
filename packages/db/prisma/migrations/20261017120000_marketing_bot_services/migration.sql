-- CreateEnum
CREATE TYPE "bot_thread_status" AS ENUM ('pending', 'posted');

-- CreateEnum
CREATE TYPE "campaign_audience" AS ENUM ('all', 'groups', 'business', 'personal');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('draft', 'scheduled', 'sending', 'sent');

-- CreateEnum
CREATE TYPE "service_request_status" AS ENUM ('new', 'consulting', 'quoted', 'won', 'lost', 'done');

-- CreateEnum
CREATE TYPE "requester_type" AS ENUM ('personal', 'business');

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "group_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#1677FF',
    "avatar_url" TEXT,
    "gender" TEXT NOT NULL DEFAULT '',
    "age_range" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "skills" TEXT NOT NULL DEFAULT '',
    "posts_per_day" INTEGER NOT NULL DEFAULT 2,
    "active_hours" TEXT NOT NULL DEFAULT '8:00 – 22:00',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_scripts" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "group_ids" TEXT[],
    "lines" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'Hỏi đáp',
    "delay_minutes" INTEGER NOT NULL DEFAULT 5,
    "run_at" TIMESTAMPTZ(6),
    "invite_real" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bot_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_threads" (
    "id" TEXT NOT NULL,
    "script_id" TEXT,
    "topic" TEXT NOT NULL,
    "group_ids" TEXT[],
    "lines" JSONB NOT NULL,
    "status" "bot_thread_status" NOT NULL DEFAULT 'pending',
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bot_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_activity" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL DEFAULT '',
    "audience" "campaign_audience" NOT NULL,
    "group_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "campaign_status" NOT NULL DEFAULT 'draft',
    "recipients" INTEGER,
    "open_rate" INTEGER,
    "click_rate" INTEGER,
    "send_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "code" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "user_id" TEXT,
    "requester_type" "requester_type" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '',
    "tax_code" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "details" JSONB,
    "status" "service_request_status" NOT NULL DEFAULT 'new',
    "assignee" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "service_request_comments" (
    "id" TEXT NOT NULL,
    "request_code" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_threads_created_at_id_idx" ON "bot_threads"("created_at" DESC, "id");

-- CreateIndex
CREATE INDEX "bot_threads_script_id_idx" ON "bot_threads"("script_id");

-- CreateIndex
CREATE INDEX "bot_activity_created_at_id_idx" ON "bot_activity"("created_at" DESC, "id");

-- CreateIndex
CREATE INDEX "campaigns_created_at_id_idx" ON "campaigns"("created_at" DESC, "id");

-- CreateIndex
CREATE INDEX "services_sort_idx" ON "services"("sort");

-- CreateIndex
CREATE INDEX "service_requests_status_created_at_idx" ON "service_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_created_at_code_idx" ON "service_requests"("created_at" DESC, "code");

-- CreateIndex
CREATE INDEX "service_requests_service_id_idx" ON "service_requests"("service_id");

-- CreateIndex
CREATE INDEX "service_request_comments_request_code_created_at_idx" ON "service_request_comments"("request_code", "created_at");

-- AddForeignKey
ALTER TABLE "bot_threads" ADD CONSTRAINT "bot_threads_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "bot_scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_comments" ADD CONSTRAINT "service_request_comments_request_code_fkey" FOREIGN KEY ("request_code") REFERENCES "service_requests"("code") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written (CODING RULE 7) ----------------------------------------------

-- Mã phiếu YC-<seq>, seed demo dùng 1001…1005
CREATE SEQUENCE IF NOT EXISTS service_request_seq START 1001;

-- Lịch gửi chiến dịch: chỉ dòng đang chờ
CREATE INDEX "campaigns_due" ON "campaigns" ("send_at") WHERE "status" = 'scheduled';

-- Nhật ký thư Admin chỉ hiện chào mừng/chiến dịch đã gửi
CREATE INDEX "mail_logs_sent_visible" ON "mail_logs" ("created_at" DESC, "id")
  WHERE "status" = 'sent' AND "kind" IN ('welcome', 'campaign');
