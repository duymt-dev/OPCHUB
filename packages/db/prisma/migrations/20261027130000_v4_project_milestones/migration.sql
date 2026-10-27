-- TIP-V4-620 (D-89, prototype v4): tab "Cập nhật" — mốc dự án công bố; rỗng thì chỉ mốc hệ thống (BUG-038)
ALTER TABLE "projects" ADD COLUMN "milestones" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "projects" ADD CONSTRAINT "projects_milestones_array" CHECK (jsonb_typeof("milestones") = 'array');
