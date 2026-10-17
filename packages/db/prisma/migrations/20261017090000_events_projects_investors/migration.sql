-- CreateEnum
CREATE TYPE "event_mode" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "event_registration_status" AS ENUM ('registered', 'attended', 'cancelled');

-- CreateEnum
CREATE TYPE "investor_kind" AS ENUM ('individual', 'business', 'fund');

-- CreateEnum
CREATE TYPE "investor_interest_status" AS ENUM ('sent', 'in_discussion', 'connected');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('draft', 'pending_review', 'published', 'hidden', 'needs_changes', 'rejected');

-- CreateEnum
CREATE TYPE "project_stage" AS ENUM ('idea', 'mvp', 'growth', 'launched');

-- CreateEnum
CREATE TYPE "project_visibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "project_tone" AS ENUM ('blue', 'rose', 'green', 'amber', 'violet');

-- CreateEnum
CREATE TYPE "repo_provider" AS ENUM ('github', 'gitlab');

-- CreateEnum
CREATE TYPE "comment_type" AS ENUM ('feedback', 'question', 'partnership');

-- CreateEnum
CREATE TYPE "repo_access_status" AS ENUM ('pending', 'granted', 'denied');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mode" "event_mode" NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "place" TEXT NOT NULL,
    "address" TEXT,
    "map_url" TEXT,
    "seats" INTEGER NOT NULL,
    "registered_count" INTEGER NOT NULL DEFAULT 0,
    "group_id" TEXT,
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "cover_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "event_registration_status" NOT NULL DEFAULT 'registered',
    "checked_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "investor_interests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "investor_kind" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '',
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "message" TEXT NOT NULL DEFAULT '',
    "status" "investor_interest_status" NOT NULL DEFAULT 'sent',
    "investor_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "investor_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_thread_messages" (
    "id" TEXT NOT NULL,
    "thread_key" TEXT NOT NULL,
    "author_id" TEXT,
    "from_investor" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_admin_notes" (
    "id" TEXT NOT NULL,
    "investor_key" TEXT NOT NULL,
    "author_id" TEXT,
    "from_investor" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category_id" TEXT,
    "group_id" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "description_html" TEXT NOT NULL DEFAULT '',
    "stage" "project_stage" NOT NULL DEFAULT 'idea',
    "status" "project_status" NOT NULL DEFAULT 'draft',
    "visibility" "project_visibility" NOT NULL DEFAULT 'public',
    "tone" "project_tone" NOT NULL DEFAULT 'blue',
    "review_note" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Việt Nam',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "cover_url" TEXT,
    "test_url" TEXT,
    "repo_provider" "repo_provider",
    "repo_url" TEXT,
    "repo_visibility" "project_visibility",
    "deck_url" TEXT,
    "featured_at" TIMESTAMPTZ(6),
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_shares" (
    "project_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_shares_pkey" PRIMARY KEY ("project_id","group_id")
);

-- CreateTable
CREATE TABLE "project_fundings" (
    "project_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "equity_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "round" TEXT NOT NULL DEFAULT '',
    "instrument" TEXT NOT NULL DEFAULT '',
    "ends_at" TIMESTAMPTZ(6),
    "min_ticket" BIGINT NOT NULL DEFAULT 0,
    "raised" BIGINT NOT NULL DEFAULT 0,
    "use_of_funds" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_fundings_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "project_follows" (
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_follows_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "project_comments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "type" "comment_type" NOT NULL DEFAULT 'feedback',
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comment_likes" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "repo_access_requests" (
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "repo_access_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repo_access_requests_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE INDEX "events_mode_starts_at_idx" ON "events"("mode", "starts_at");

-- CreateIndex
CREATE INDEX "event_registrations_user_id_status_idx" ON "event_registrations"("user_id", "status");

-- CreateIndex
CREATE INDEX "event_registrations_event_id_status_created_at_idx" ON "event_registrations"("event_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "investor_interests_investor_key_created_at_idx" ON "investor_interests"("investor_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "investor_interests_status_created_at_idx" ON "investor_interests"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "investor_interests_project_id_user_id_key" ON "investor_interests"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "investor_thread_messages_thread_key_created_at_idx" ON "investor_thread_messages"("thread_key", "created_at");

-- CreateIndex
CREATE INDEX "investor_admin_notes_investor_key_created_at_idx" ON "investor_admin_notes"("investor_key", "created_at");

-- CreateIndex
CREATE INDEX "projects_owner_id_updated_at_idx" ON "projects"("owner_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "project_members_project_id_sort_idx" ON "project_members"("project_id", "sort");

-- CreateIndex
CREATE INDEX "project_shares_group_id_idx" ON "project_shares"("group_id");

-- CreateIndex
CREATE INDEX "project_follows_user_id_idx" ON "project_follows"("user_id");

-- CreateIndex
CREATE INDEX "project_comments_project_id_parent_id_created_at_idx" ON "project_comments"("project_id", "parent_id", "created_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_interests" ADD CONSTRAINT "investor_interests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_interests" ADD CONSTRAINT "investor_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_fundings" ADD CONSTRAINT "project_fundings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_follows" ADD CONSTRAINT "project_follows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_follows" ADD CONSTRAINT "project_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_likes" ADD CONSTRAINT "project_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "project_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_likes" ADD CONSTRAINT "project_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_access_requests" ADD CONSTRAINT "repo_access_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_access_requests" ADD CONSTRAINT "repo_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written indexes (CODING RULE 7) ---------------------------------------

-- Lịch sự kiện sắp tới: covering, Index Only Scan cho thẻ
CREATE INDEX "events_upcoming" ON "events" ("starts_at") INCLUDE ("mode", "seats", "registered_count", "group_id", "registration_open");

-- Khám phá Portal: dự án đang hiển thị, lọc lĩnh vực, mới nhất trước
CREATE INDEX "projects_explore" ON "projects" ("category_id", "published_at" DESC, "id") WHERE "status" = 'published' AND "deleted_at" IS NULL;
CREATE INDEX "projects_published_recent" ON "projects" ("published_at" DESC, "id") WHERE "status" = 'published' AND "deleted_at" IS NULL;

-- Hàng duyệt Admin
CREATE INDEX "projects_review" ON "projects" ("created_at", "id") WHERE "status" = 'pending_review' AND "deleted_at" IS NULL;

-- Danh sách Admin: bằng trước, sort sau
CREATE INDEX "projects_admin" ON "projects" ("status", "category_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Q-G5b-4: tối đa một dự án nổi bật
CREATE UNIQUE INDEX "projects_one_featured" ON "projects" ((true)) WHERE "featured_at" IS NOT NULL AND "deleted_at" IS NULL;
