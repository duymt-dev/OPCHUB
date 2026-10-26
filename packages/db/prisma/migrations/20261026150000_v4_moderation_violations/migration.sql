-- V4-612 (REQ-507, D-77, D-83): Kiểm duyệt §26.6 — vi phạm đếm 90 ngày, khoá có hạn, tự mở khoá
-- AlterEnum
ALTER TYPE "report_action" ADD VALUE 'restore';

-- CreateEnum
CREATE TYPE "user_lock_kind" AS ENUM ('manual', 'auto');

-- AlterTable: khoá cũ (D-55) giữ không thời hạn → lock_kind = manual
ALTER TABLE "users" ADD COLUMN     "lock_kind" "user_lock_kind",
ADD COLUMN     "locked_until" TIMESTAMPTZ(6);
UPDATE "users" SET "lock_kind" = 'manual' WHERE "status" = 'locked';

-- CreateTable
CREATE TABLE "moderation_violations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "moderation_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moderation_violations_report_id_key" ON "moderation_violations"("report_id");

-- Đếm vi phạm còn hiệu lực theo người (bằng trước, khoảng sau) — chỉ dòng chưa khôi phục
CREATE INDEX "moderation_violations_active" ON "moderation_violations"("user_id", "at" DESC)
    WHERE "revoked_at" IS NULL;

-- Job tự mở khoá: chỉ TK đang khoá có hạn
CREATE INDEX "users_lock_expiry" ON "users"("locked_until")
    WHERE "status" = 'locked' AND "locked_until" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "moderation_violations" ADD CONSTRAINT "moderation_violations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_violations" ADD CONSTRAINT "moderation_violations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
