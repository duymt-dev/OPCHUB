-- TIP-V2-304 GR-R02 / D-56: vai trò trong nhóm "Điều phối viên" (moderator) → "Giảng viên" (lecturer).
-- Đổi tên giá trị enum tại chỗ (PG ≥ 10): dòng moderator hiện có thành lecturer, không viết lại bảng,
-- index (group_id, status, group_role) giữ nguyên. `system_role.moderator` là khái niệm khác, không đổi.
ALTER TYPE "group_role" RENAME VALUE 'moderator' TO 'lecturer';
