-- D-90 (chốt Q-V4-623-1): danh sách Thành viên Admin theo mã TV tăng dần như prototype v4.
-- `WHERE deleted_at IS NULL [AND account_type = $1] ORDER BY member_code, id LIMIT/OFFSET`
-- → "bằng trước, sort sau" + covering cho deferred join (subquery chỉ lấy id).
-- Giữ `users_list` / `users_list_all` (created_at) cho lọc "Ngày đăng ký".
CREATE INDEX "users_list_code" ON "users" ("account_type", "member_code")
  INCLUDE ("id") WHERE "deleted_at" IS NULL;
CREATE INDEX "users_list_code_all" ON "users" ("member_code")
  INCLUDE ("id", "account_type") WHERE "deleted_at" IS NULL;
