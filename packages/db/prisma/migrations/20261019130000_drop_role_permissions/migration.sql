-- TIP-V2-204 (D-52, §21): ma trận khoá cũ theo `users.system_role` (D-20/D-42) đã thay bằng
-- `admin_roles` + `admin_role_permissions`; không còn code nào đọc/ghi bảng này (V2Q-128).
DROP TABLE IF EXISTS "role_permissions";
