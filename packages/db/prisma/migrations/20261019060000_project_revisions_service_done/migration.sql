-- TIP-V2-113: bản sửa dự án đã xuất bản (REQ-106) + bỏ trạng thái phiếu YC `done` (BUG-041, §9).

-- 1) Phiếu YC: dữ liệu cũ `done` ≙ Thành công (`won`) trước khi đổi kiểu
UPDATE "service_requests" SET "status" = 'won' WHERE "status" = 'done';

CREATE TYPE "service_request_status_new" AS ENUM ('new', 'consulting', 'quoted', 'won', 'lost');
ALTER TABLE "service_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "service_requests" ALTER COLUMN "status" TYPE "service_request_status_new"
  USING ("status"::text::"service_request_status_new");
ALTER TYPE "service_request_status" RENAME TO "service_request_status_old";
ALTER TYPE "service_request_status_new" RENAME TO "service_request_status";
DROP TYPE "service_request_status_old";
ALTER TABLE "service_requests" ALTER COLUMN "status" SET DEFAULT 'new';

-- 2) Bản sửa dự án
CREATE TYPE "project_revision_status" AS ENUM ('draft', 'pending_review', 'needs_changes', 'rejected', 'approved');

CREATE TABLE "project_revisions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "project_revision_status" NOT NULL DEFAULT 'draft',
    "review_note" TEXT,
    "created_by" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "project_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_revisions_status_updated_at_idx" ON "project_revisions"("status", "updated_at" DESC);
CREATE INDEX "project_revisions_project_id_status_decided_at_idx"
  ON "project_revisions"("project_id", "status", "decided_at" DESC);

ALTER TABLE "project_revisions" ADD CONSTRAINT "project_revisions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Viết tay (Prisma không biểu diễn được): mỗi dự án tối đa một bản sửa đang mở
CREATE UNIQUE INDEX "project_revisions_open" ON "project_revisions"("project_id")
  WHERE "status" IN ('draft', 'pending_review', 'needs_changes');
