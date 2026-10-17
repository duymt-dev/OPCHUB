-- B32: chỉ mục theo đúng truy vấn (luật 7 "bằng trước, sort sau")

-- Admin lọc theo trạng thái, mới trước (không lọc lĩnh vực)
DROP INDEX IF EXISTS "projects_admin";
CREATE INDEX "projects_admin" ON "projects" ("status", "created_at" DESC, "id") WHERE "deleted_at" IS NULL;
-- Admin tab "Tất cả"
CREATE INDEX "projects_live_recent" ON "projects" ("created_at" DESC, "id") WHERE "deleted_at" IS NULL;
-- Hàng duyệt đã nằm trong projects_admin (status = 'pending_review')
DROP INDEX IF EXISTS "projects_review";

-- Khám phá: sắp theo lượt theo dõi / tên
CREATE INDEX "projects_published_follow" ON "projects" ("followers_count" DESC, "id") WHERE "status" = 'published' AND "deleted_at" IS NULL;
CREATE INDEX "projects_published_name" ON "projects" ("name", "id") WHERE "status" = 'published' AND "deleted_at" IS NULL;

-- Góp ý theo dự án: gốc mới trước, trả lời theo parent
CREATE INDEX "project_comments_parent" ON "project_comments" ("parent_id", "created_at") WHERE "parent_id" IS NOT NULL;
