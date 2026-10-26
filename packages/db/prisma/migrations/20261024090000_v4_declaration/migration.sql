-- V4-607 (UP-02, REQ-504): khai báo sau đăng nhập.
-- Người dùng có trước V4 đã khai báo khi đăng ký → declared_at = created_at (không hỏi lại);
-- opc_intent = các nhóm đang là thành viên.
ALTER TABLE "users" ADD COLUMN "declared_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "opc_intent" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "business_profiles" ADD COLUMN "province" TEXT;

UPDATE "users" SET "declared_at" = "created_at";

UPDATE "users" u SET "opc_intent" = g.ids
FROM (
  SELECT user_id, array_agg(group_id ORDER BY created_at, group_id) AS ids
  FROM "group_members" WHERE status = 'member' GROUP BY user_id
) g
WHERE g.user_id = u.id;
