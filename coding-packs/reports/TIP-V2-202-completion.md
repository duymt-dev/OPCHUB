# TIP-V2-202: Đăng nhập Admin qua `admin_users`, đổi MK lần đầu, 2FA, khoá TK quản trị (completion)

> V2-P2, nhánh `feature/V2-P2-admin-rbac`. D-52, D-62 · NA-01, NA-15, NA-16, NA-17 · RB-R03, RB-R04, RB-R08 ·
> SEC-R01…R03 · AT-SEC01, AT-RB04 · BUG-015, TD-016. Agent chính tự thi công (builder trước đó không ra thay đổi).
> Migration `20261019100000_admin_users_moved` (`2082b35`, agent chính). V2Q mới: V2Q-117 → V2Q-122.
> Commit: `f9ee17d` (phiên realm admin), `36f612f` (khoá/mở/thu hồi/đổi vai trò + test), commit FE/seed/e2e
> và commit báo cáo này.

## Đã làm
- **Shared**: mã lỗi `PASSWORD_CHANGE_REQUIRED`, `TWO_FACTOR_SETUP_REQUIRED`, `WRONG_PORTAL` (403).
  `api/admin-auth.ts`: `adminMeSchema`, `adminLoginResponseSchema` (`me` giữ hình cũ cho FE tới 204 + `admin`),
  `adminFirstPasswordSchema`, `adminTwoFactorSetup/EnableSchema`, `ADMIN_AUTH_MESSAGES`, `isStrongAdminPassword`.
  `admin-rbac.ts`: `adminAccountStatusSchema`, `adminAccountRoleSchema`, lỗi Super Admin / không tìm thấy.
- **common/auth**: claim `realm` (`member` mặc định — token cũ vẫn hợp lệ), `roleId`, `restricted`
  (`password` | `two_factor`). Khoá/`perm_version` Redis tách realm (`auth:admin:*`). Guard JwtAuth kiểm realm theo
  route (`/v1/admin/**` → admin, còn lại → member; `@AllowRealm` cho route dùng chung) và phiên hạn chế
  (`@AdminSetupAllowed`). MembershipFee bỏ qua realm admin. `PermissionCheck` dùng chung guard + service: phiên admin
  đọc quyền vai trò (`auth:admin_grants:<roleId>`, nạp lại từ DB khi thiếu) qua bảng ánh xạ tạm khoá cũ → 25 khoá
  (V2Q-120). Cổng `ADMIN_GRANTS_PORT`, `ADMIN_DIRECTORY_PORT` (admin-account hiện thực, common không import module).
- **admin-account**: `POST /admin/auth/login|totp/verify|refresh|logout`, `GET /admin/auth/me`,
  `POST /admin/auth/first-password`, `POST /admin/auth/2fa/setup|enable`. Cookie `opchub_art` path `/v1/admin/auth`,
  `admin_refresh_tokens` xoay vòng + phát hiện dùng lại. Khoá tạm `admin:<email>|ip` (NA-15). TK khoá → 403
  "Tài khoản quản trị đã bị khóa" (chỉ khi MK đúng). 2FA: secret SecretBox, thiết lập chờ Redis 10', 5 lần sai huỷ,
  mã không dùng lại; `requireAdmin2fa` → phiên hạn chế; thứ tự đổi MK trước rồi 2FA. Audit đăng nhập/đăng xuất,
  đổi MK lần đầu, bật 2FA (tag `permission`).
  `POST /admin/admin-accounts/:id/status`, `PATCH :id/role`, `DELETE :id`: cập nhật có điều kiện, Super Admin → 409,
  thu hồi refresh + audit 1 transaction, version Redis sau commit (phiên đang mở 403/401 ngay). Đổi vai trò tăng
  version → FE refresh nhận vai trò mới (V2Q-121). Admin FE không có socket → không phát `session.revoked`.
- **account**: đăng nhập Portal bằng TK quản trị đúng MK → 403 `WRONG_PORTAL` (cổng ngược lại tương tự,
  `PortalCredentials`). SSO email quản trị → 409 (NA-17). Đổi email hồ sơ sang email quản trị → 409 (đóng đề xuất
  V2Q-116). Quên MK TK quản trị đi qua `admin_users` (V2Q-119).
- **Domain khác**: Super Admin nhận nhóm (D-15) lấy từ `admin_users`; Admin làm chủ / ĐPV nhóm khi tạo nhóm (dòng
  `users` xoá mềm cùng id); nhân sự phiếu YC = TK có `services.action`; tên người thao tác ở Nhật ký đọc
  `admin_users` trước. Route dùng chung mở realm admin: thông báo, presign, xem phòng/tin, ghim tin, duyệt yêu cầu
  vào nhóm (V2Q-118).
- **Seed**: dòng `users` của `admin` và `ad1` ở trạng thái đã chuyển (xoá mềm, `<id>@moved.invalid`); m2/m3 là
  thành viên; demo tắt `requireAdmin2fa` (V2Q-117, seed bắt buộc vẫn bật).
- **Admin FE (tối thiểu, phần còn lại ở 204)**: đăng nhập/đăng xuất/refresh gọi `/admin/auth/*`; `WRONG_PORTAL` →
  "Tài khoản này đăng nhập ở cổng khác" ở cả hai cổng; bỏ nhánh "refresh ra TK thành viên" (không còn xảy ra).
  MSW khớp server (`/admin/auth/login`, Portal trả `WRONG_PORTAL` cho TK quản trị).
- **e2e**: `e2e/server/api.ts`, `e2e/audit/lib.ts` đăng nhập Admin qua `/admin/auth/login`; số người nhận chiến
  dịch 11 → 9 / 7 → 5; nhân sự phụ trách → Phạm Thu Trang.

## Test
- Int mới: `admin-account/admin-auth.int.spec.ts` (10: AT-SEC01 ×2, AT-RB04, REQ-215, REQ-201, NA-01 sai cổng,
  REQ-217, refresh/logout, REQ-352 ×2, + hợp đồng Portal), `admin-security.int.spec.ts` (REQ-328, REQ-353 ×2,
  RB-R04 đổi vai trò, REQ-324), `common/guards.int.spec.ts` thêm 4 ca realm.
- Factory: `createUser({ systemRole })` khác member → TK `admin_users` (+ dòng `users` xoá mềm), `adminPermissions`
  tạo vai trò tự tạo; `loginOf`/`tokenOf` đăng nhập đúng cổng. 48 file test cũ chạy lại không sửa assertion
  nghiệp vụ trừ chỗ mô hình đổi (SSO 403 → 409, Admin gửi tin 402 → 403, role B40 theo ma trận mới).

## Cổng kiểm (19/10/2026)
| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 8/8 |
| `pnpm typecheck` | 8/8 |
| `pnpm depcheck` | no dependency violations (601 modules) |
| Int server (`opchub_test`) | 74 file, **373/373** |
| Unit server / shared / admin / portal | 92 / 87 / 141 / 113 — xanh |
| e2e server behavior (Portal 3220 / Admin 3222, sau `seed` + `seed:demo` + `flush:dev-cache`) | **151/153** |
| e2e MSW behavior | chưa chạy ở TIP này — chạy ở cổng Pha 2 |

2 ca e2e server đỏ đều là màn cũ sẽ thay ở TIP-V2-204 (không sửa assertion để che):
- `admin-members.spec.ts:145` "đổi quyền hệ thống (D-42)": seed giờ để Lê Minh Anh (m2) là thành viên
  (D-52/D-58, migration 20261019100000) nên ô chọn không còn "Điều phối viên". Ô chọn quyền hệ thống trên danh sách
  thành viên bị bỏ ở 204 (vai trò quản trị chỉ ở tab Tài khoản quản trị).
- `admin-settings.spec.ts:178` tab "Tài khoản quản trị" cũ đọc `users.system_role` (`/admin/admins`) → 0 dòng;
  MSW vẫn 4. TIP-V2-204 chuyển tab sang `/admin/admin-accounts` (6 TK theo `stAdmins`).

## Chưa làm / chuyển TIP sau
- Route vẫn gắn khoá cũ (ánh xạ tạm) → TIP-V2-203. Màn đổi MK lần đầu / thiết lập 2FA / nút khoá-thu hồi trên FE →
  TIP-V2-204. Bảng `role_permissions`, `admin_invites`, API `/admin/admins*`, `/admin/users/:id/role` cũ còn (chỉ đọc
  / thành viên) tới 204.
