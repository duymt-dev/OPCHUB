-- TIP-V4-606 (D-75, prototype v4 `ADM_DEF`): 2 khoá menu "Gian hàng & Nhu cầu" cho vai trò hệ thống
-- Quản trị viên + Biên tập nội dung. Không gỡ khoá cũ, không đụng vai trò tự tạo; chạy lại vẫn an toàn.
INSERT INTO "admin_role_permissions" ("role_id", "permission_key")
SELECT r."id", p.k FROM "admin_roles" r
JOIN (VALUES
  ('admin', 'stores.view'), ('admin', 'stores.action'),
  ('editor', 'stores.view'), ('editor', 'stores.action')
) AS p(role, k) ON p.role = r."key"
ON CONFLICT DO NOTHING;
