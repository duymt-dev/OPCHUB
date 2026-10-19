-- TIP-V2-202 (D-52, RB-R03): TK quản trị đăng nhập qua `admin_users`.
--
-- 1) Thành viên thật từng được gán `moderator`/`admin` ở `users` (có phí hoặc ở nhóm) KHÔNG phải nhân sự
--    quản trị: "Giảng viên" quản trị và vai trò trong nhóm là hai khái niệm riêng (D-58). Bỏ bản sao
--    `admin_users` do 20261019080000 tạo, đưa về `member` để họ tiếp tục dùng Portal.
DELETE FROM "admin_users" a
USING "users" u
WHERE a."id" = u."id" AND u."system_role" <> 'super_admin'
  AND (EXISTS (SELECT 1 FROM "membership_fees" f WHERE f."user_id" = u."id")
       OR EXISTS (SELECT 1 FROM "group_members" g WHERE g."user_id" = u."id"))
  AND NOT EXISTS (SELECT 1 FROM "admin_refresh_tokens" t WHERE t."admin_user_id" = a."id");

UPDATE "users" u SET "system_role" = 'member', "perm_version" = u."perm_version" + 1, "updated_at" = now()
WHERE u."system_role" <> 'member' AND u."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "admin_users" a WHERE a."id" = u."id");

-- 2) Dòng `users` đã chuyển sang `admin_users` (cùng id) được xoá mềm — KHÔNG xoá cứng vì
--    audit_logs.actor_id, messages.sender_id… vẫn trỏ id này. Email/SĐT đổi để giải phóng UNIQUE.
UPDATE "users" u
SET "deleted_at" = now(),
    "email" = u."id" || '@moved.invalid',
    "phone" = NULL,
    "password_hash" = NULL,
    "totp_secret_enc" = NULL,
    "perm_version" = u."perm_version" + 1,
    "updated_at" = now()
FROM "admin_users" a
WHERE a."id" = u."id" AND u."deleted_at" IS NULL;

-- Phiên thành viên cũ của các TK này không còn hiệu lực
UPDATE "refresh_tokens" t SET "revoked_at" = now()
FROM "admin_users" a
WHERE t."user_id" = a."id" AND t."revoked_at" IS NULL;

-- Bảng của mô hình cũ, giữ để đọc tới TIP-V2-204 (FE chuyển xong mới xoá)
COMMENT ON TABLE "role_permissions" IS 'Chỉ đọc từ TIP-V2-202 — thay bằng admin_role_permissions (D-52)';
COMMENT ON TABLE "admin_invites" IS 'Chỉ đọc từ TIP-V2-202 — TK quản trị tạo trực tiếp ở admin_users (RB-R02)';
