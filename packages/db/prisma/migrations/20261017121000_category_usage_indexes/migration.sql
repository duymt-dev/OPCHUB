-- B40: đếm lĩnh vực đang dùng (BR-11) — mỗi lĩnh vực một Index Only Scan
CREATE INDEX "projects_category_live" ON "projects" ("category_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "business_profiles_main_field" ON "business_profiles" ("main_field");
