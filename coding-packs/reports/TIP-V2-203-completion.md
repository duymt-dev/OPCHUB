# TIP-V2-203: Guard 25 khoá theo vai trò TK quản trị, VIEW_ONLY, xoá vai trò (completion)

> V2-P2, nhánh `feature/V2-P2-admin-rbac`. §21 · RB-R04 → R08 · NA-28 · REQ-228, REQ-324, REQ-325, REQ-327 ·
> AT-RB02, AT-RB03, AT-RB05 · BUG-035, TD-026. Không migration. V2Q mới: V2Q-123 → V2Q-127.
> Commit: `644e7de` (code), `c38f61e` (test + bảng contract), `c558db1` (ma trận route × vai trò), commit báo cáo này.

## Đã làm
- **Shared**: `viewKeyOf`, `can` (permissions.ts); mã lỗi `VIEW_ONLY` (403, câu "Vai trò {tên} chỉ có quyền xem mục này"),
  `GONE` (410); `ADMIN_RBAC_ERRORS.roleSystemDelete`, `roleInUse(n)`.
- **common/auth**: claim `roleName`. `@RequireAdmin(...keys)` (đủ mọi khoá) và `@RequireAnyAdmin(...keys)` (ít nhất một).
  `PermissionGuard` đọc quyền vai trò `auth:admin_grants:<roleId>` mỗi request (thiếu cache → nạp DB một lần, S-03);
  thiếu khoá thao tác mà có khoá Xem → `VIEW_ONLY`, còn lại `FORBIDDEN`; phiên thành viên không có khoá nào.
  Super Admin = 25 khoá (`effectiveAdminGrants`). Bỏ hẳn `RequirePermission`, `LEGACY_TO_ADMIN_KEY`, cache `auth:grants`.
- **Route**: 17 controller `/admin` gắn khoá theo bảng TIP (GET → `<menu>.view`, ghi → khoá thao tác; check-in, xuất
  → `.action`; kiểm duyệt ghi → `groups.moderate`; Cài đặt theo tab; chiến dịch `settings.mail` — V2Q-123).
  `GET /admin/badges`, `GET /admin/exports/:id` dùng `@RequireAnyAdmin` (V2Q-124).
- **Kiểm trong service**: chat (xem `groups.view`, ghim `groups.moderate`, VIEW_ONLY), duyệt yêu cầu vào nhóm
  (`groups.action`), badge theo khoá menu (V2Q-125). Bỏ lọc `system_role` ở Tổng quan, Dashboard live, danh sách/
  khoá/xuất Thành viên (sau D-52 `users` chỉ còn thành viên/NĐT).
- **Xoá vai trò**: `DELETE /admin/admin-roles/:id` — hệ thống 409, còn TK 409 "Vai trò đang có N tài khoản…",
  `DELETE … WHERE NOT is_system AND NOT EXISTS(admin_users sống)`, audit `roles.delete`, xoá cache Redis.
- **Route cũ**: `/admin/roles/permissions`, `/admin/admins*` → 410 `GONE`; `PATCH /admin/users/:id/role` bỏ (RB-R01,
  BUG-035); xoá `RolePermissionsService`, `settings/AdminAccountsService` cũ (V2Q-127).
- **NA-28**: lưu ma trận ghi Redis, không tăng `perm_version` → cùng token áp quyền mới ngay. Không phát socket
  (Admin không có socket, V2Q-126).

## Test
- `test/admin-account/rbac-matrix.int.spec.ts` (**648 ca**): route `/v1/admin/**` lấy từ metadata Nest
  (`DiscoveryService`, 128 route) × 5 vai trò mặc định, tên `REQ-325 <method> <path> × <vai trò> → <kỳ vọng>`;
  ca bị chặn gọi HTTP thật kiểm mã + câu VIEW_ONLY, ca được phép chạy guard với metadata thật (GET gọi HTTP ≠ 401/403).
  Thêm `REQ-325 mọi route /admin có khoá`, `AT-RB03`, `AT-RB02` (Kế toán).
- `guards.int.spec.ts`: `REQ-327`, `REQ-228 đổi ma trận áp ngay cùng token`, `REQ-325 super admin luôn qua`, phiên
  thành viên 403. `admin-roles.int.spec.ts`: `AT-RB05`, `REQ-324 xoá vai trò hệ thống 409`.
- Unit shared: `viewKeyOf / can` (8). Test cũ đổi theo mô hình mới (không nới assertion): bot dùng vai trò có
  `bots.*` (Giảng viên mặc định không có bot), đổi vai trò thành viên → kiểm route đã bỏ (404, không audit), contract
  settings dùng `/admin/admin-roles` + `/admin/admin-accounts`, route cũ → 410, B5 cấp thêm khoá bot/nhóm.
- `test/audit/c5-permissions.audit.ts` đổi sang 25 khoá: **0 route /admin thiếu khoá**, 22/25 khoá có route (3 khoá
  Affiliate chờ TIP-V2-402). Còn lại: 10 S4 so tên vai trò ở FE (login demo, tab TK cũ — TIP-V2-204) + 1 nợ hiển thị
  tên người gửi trao đổi NĐT (`author_role !== 'member'` → "Admin OPC Hub", chỉ để hiển thị).

## Cổng kiểm (19/10/2026)
| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 8/8 (0 lỗi) |
| `pnpm typecheck` | 8/8 |
| `pnpm depcheck` | no dependency violations (600 modules) |
| Int server (`opchub_test`) | 75 file, **1027/1027** (trước sửa contract table: 1026/1027 — bảng contract cập nhật) |
| Unit server / shared | 92 / 89 |
| e2e | chưa chạy ở TIP này — chạy ở cổng Pha 2 sau TIP-V2-204 (FE còn gọi route cũ 410) |

## Chưa làm / chuyển TIP sau
- FE Admin (ẩn menu, dải chỉ xem, toast VIEW_ONLY, tab TK quản trị/phân quyền mới, bỏ ô chọn vai trò thành viên,
  MSW settings) → TIP-V2-204. Alias khoá cũ (`ALL_PERMISSIONS`, `DEFAULT_ROLE_PERMISSIONS`…) còn trong `permissions.ts`
  vì FE còn import — 204 xoá. Bảng `role_permissions` cũ còn (không còn code server đọc) — 204 xoá cùng FE.
