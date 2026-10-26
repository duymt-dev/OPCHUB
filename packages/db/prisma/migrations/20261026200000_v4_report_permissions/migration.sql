-- TIP-V4-614 (D-78): khoá menu "Báo cáo" (`reports.view`) cho vai trò hệ thống Quản trị viên + Kế toán.
-- Không bảng mới, không đụng vai trò tự tạo; chạy lại vẫn an toàn.
INSERT INTO "admin_role_permissions" ("role_id", "permission_key")
SELECT r."id", p.k FROM "admin_roles" r
JOIN (VALUES ('admin', 'reports.view'), ('accountant', 'reports.view')) AS p(role, k)
  ON p.role = r."key"
ON CONFLICT DO NOTHING;
