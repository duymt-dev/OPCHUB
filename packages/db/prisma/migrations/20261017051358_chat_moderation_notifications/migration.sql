-- CreateEnum
CREATE TYPE "message_kind" AS ENUM ('text', 'file', 'image');

-- CreateEnum
CREATE TYPE "report_source" AS ENUM ('keyword', 'member');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "report_action" AS ENUM ('dismiss', 'hide', 'warn', 'lock');

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "persona_id" TEXT,
    "kind" "message_kind" NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "attachment" JSONB,
    "reply_to_id" TEXT,
    "client_msg_id" TEXT,
    "is_simulated" BOOLEAN NOT NULL DEFAULT false,
    "hidden_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("message_id","user_id","emoji")
);

-- CreateTable
CREATE TABLE "pinned_messages" (
    "room_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "pinned_by" TEXT NOT NULL,
    "pinned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("room_id","message_id")
);

-- CreateTable
CREATE TABLE "room_read_cursors" (
    "user_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "last_read_message_id" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "room_read_cursors_pkey" PRIMARY KEY ("user_id","room_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "source" "report_source" NOT NULL,
    "reporter_id" TEXT,
    "reason" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "action" "report_action",
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_keywords" (
    "word" CITEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_keywords_pkey" PRIMARY KEY ("word")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_room_id_created_at_id_idx" ON "messages"("room_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "messages_room_id_sender_id_client_msg_id_key" ON "messages"("room_id", "sender_id", "client_msg_id");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_messages_message_id_key" ON "pinned_messages"("message_id");

-- CreateIndex
CREATE INDEX "pinned_messages_room_id_pinned_at_idx" ON "pinned_messages"("room_id", "pinned_at" DESC);

-- CreateIndex
CREATE INDEX "reports_message_id_idx" ON "reports"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_message_id_reporter_id_key" ON "reports"("message_id", "reporter_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications"("user_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_read_cursors" ADD CONSTRAINT "room_read_cursors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_read_cursors" ADD CONSTRAINT "room_read_cursors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Viết tay (data-model §4/§5/§9)

-- Text thuần ≤ 4000 ký tự (socket-chat bước 3)
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_len" CHECK (char_length("body") <= 4000);

-- S-12 cho persona (sender_id NULL không đụng UQ ở trên)
CREATE UNIQUE INDEX "messages_persona_client_msg" ON "messages"("room_id", "persona_id", "client_msg_id")
  WHERE "persona_id" IS NOT NULL AND "client_msg_id" IS NOT NULL;

-- Đếm chưa đọc / đánh dấu đã đọc hết
CREATE INDEX "notifications_unread" ON "notifications"("user_id") WHERE "read_at" IS NULL;

-- Hàng đợi kiểm duyệt: báo cáo đang mở, mới nhất trước
CREATE INDEX "reports_open_queue" ON "reports"("created_at" DESC, "id" DESC) INCLUDE ("message_id") WHERE "status" = 'open';
