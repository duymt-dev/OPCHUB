-- AlterEnum (bảng reports chưa có dữ liệu — vừa tạo ở migration trước, chưa phát hành)
BEGIN;
CREATE TYPE "report_source_new" AS ENUM ('auto', 'report');
ALTER TABLE "reports" ALTER COLUMN "source" TYPE "report_source_new" USING ("source"::text::"report_source_new");
ALTER TYPE "report_source" RENAME TO "report_source_old";
ALTER TYPE "report_source_new" RENAME TO "report_source";
DROP TYPE "public"."report_source_old";
COMMIT;

-- DropIndex
DROP INDEX "groups_province_key";

-- DropIndex
DROP INDEX "groups_slug_key";

-- DropIndex
DROP INDEX "reports_message_id_reporter_id_key";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "weekly_active" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "reporter_id",
ADD COLUMN     "hit" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "reporter_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "message_flags" (
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_flags_pkey" PRIMARY KEY ("message_id","user_id")
);

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Viết tay

-- Xoá mềm nhóm rồi tạo lại cùng tỉnh/slug được (admin-groups e2e)
CREATE UNIQUE INDEX "groups_province_live" ON "groups"("province") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "groups_slug_live" ON "groups"("slug") WHERE "deleted_at" IS NULL;

-- Một ca mở cho mỗi (tin, nguồn): người báo sau chỉ tăng reporter_count
CREATE UNIQUE INDEX "reports_open_case" ON "reports"("message_id", "source") WHERE "status" = 'open';

-- Đếm lượt báo theo người (Admin thấy người báo, D-43)
CREATE INDEX "message_flags_user" ON "message_flags"("user_id", "created_at" DESC);
