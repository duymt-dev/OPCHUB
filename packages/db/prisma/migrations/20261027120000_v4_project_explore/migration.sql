-- TIP-V4-620 (D-89, prototype v4): trang Dự án — đối tượng, nhu cầu kết nối, lượt xem, giai đoạn "Đang phát triển".
ALTER TYPE "project_stage" ADD VALUE IF NOT EXISTS 'developing' AFTER 'idea';

CREATE TYPE "project_audience" AS ENUM ('student', 'personal', 'organization', 'business');

ALTER TABLE "projects"
  ADD COLUMN "audience" "project_audience" NOT NULL DEFAULT 'personal',
  ADD COLUMN "needs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "contact_address" TEXT;

ALTER TABLE "projects" ADD CONSTRAINT "projects_view_count_nonneg" CHECK ("view_count" >= 0);

-- Sắp xếp "Nhiều lượt xem" của Khám phá: cùng dạng `projects_published_follow` (deferred join theo id)
CREATE INDEX "projects_published_views" ON "projects" ("view_count" DESC, "id") WHERE "status" = 'published' AND "deleted_at" IS NULL;

-- Chi tiết v4: "Vấn đề / Giải pháp / Thị trường" + "Hình ảnh sản phẩm" là dữ liệu của dự án (BUG-038: rỗng thì ẩn)
ALTER TABLE "projects"
  ADD COLUMN "highlights" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "projects" ADD CONSTRAINT "projects_highlights_array" CHECK (jsonb_typeof("highlights") = 'array');
