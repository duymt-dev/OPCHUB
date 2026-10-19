# TIP-V2-204: Phân quyền §21 trên Admin FE, đổi mật khẩu lần đầu, 2FA (completion)

> V2-P2, nhánh `feature/V2-P2-admin-rbac`. §21 · RB-R01 → R09 · SEC-R01/R02 · NA-28 · REQ-228, REQ-324 → 329, REQ-352 ·
> AT-RB01 → 06, AT-SEC01 · BUG-015, BUG-035, BUG-042, TD-016, TD-026. Migration `20261019130000_drop_role_permissions`.
> V2Q mới: V2Q-128 → V2Q-133.
> Commit: `b0031fa` (shared/server/MSW), `4c18d15` (Admin FE), `9751099` (e2e), `f52efc7` (sửa MSW + locator),
> `0150ff7` (bỏ bảng `role_permissions`), `63e62c5` (parity Cài đặt), commit báo cáo này.

## Đã làm
- **Phiên Admin**: `POST /admin/auth/login` chỉ trả `{ accessToken, admin }` (`AdminMe`: vai trò, 25 khoá thực tế,
  `mustChangePassword`, `twoFactor`, `twoFactorRequired`). Bỏ `me.systemRole` ở FE (BUG-042: không còn so tên vai trò
  ở `apps/admin/src`, `apps/portal/src` ngoài mock thành viên). Đăng nhập TK bị khoá hiện đúng câu server
  "Tài khoản quản trị đã bị khóa" (AT-RB04, V2Q-132).
- **Quyền ở FE** (`lib/permission-model.ts`, `lib/permissions.ts`): `useGrants` (xem thử ?? phiên), `useCan(key)`,
  `useMenuAccess(menu)`. Sidebar chỉ hiện menu có ≥ 1 khoá (RB-R06); mục chỉ có khoá Xem → dải "Chế độ chỉ xem — vai trò
  **X** không có quyền thao tác…" + chặn nút ghi theo regex `roGuard` prototype, toast "Vai trò X chỉ có quyền xem mục
  này" (RB-R07); không có quyền → "Bạn không có quyền xem mục này". Lỗi `VIEW_ONLY` từ server cũng toast câu đó.
  Đổi menu → tải lại `/admin/auth/me` (NA-28, REQ-228 không cần đăng nhập lại).
- **Xem thử vai trò** (RB-R09): select "Xem thử với vai trò…" ở tab Vai trò; dải cam + "Thoát xem thử"; chỉ trong bộ nhớ.
- **SEC-R01**: màn `/first-password` (MK ≥ 8, chữ hoa + số, khác MK tạm, nhập lại khớp) → vào Tổng quan theo vai trò.
  **SEC-R02**: màn `/two-factor` (khoá che + liên kết otpauth, mã 6 số) khi "Bắt buộc 2FA" bật mà TK chưa có.
- **Cài đặt**: tab theo khoá (`settings.general/mail/admins/log`). "Tài khoản quản trị": 6 TK `stAdmins`, đổi vai trò,
  khoá/mở (xác nhận), thu hồi (xác nhận), Super Admin chỉ "Chủ sở hữu"; hộp "Tạo tài khoản quản trị" 540px như prototype
  (V2Q-130) — lỗi tại ô (email thành viên / trùng, AT-RB01). "Vai trò & phân quyền": thẻ vai trò, thêm/xoá vai trò tự tạo
  (AT-RB05), ma trận 25 khoá × vai trò, lưu có xác nhận.
- **Thành viên** (RB-R01, AT-RB06): bỏ ô chọn quyền; cột "Vai trò khi đăng ký" chỉ đọc; không có TK quản trị.
- **Server**: xoá route cũ `/admin/roles/permissions`, `/admin/admins*` (404, V2Q-129); bỏ bảng `role_permissions` +
  khoá D-20 (`PERMISSION_GROUPS`, `ALL_PERMISSIONS`, `DEFAULT_ROLE_PERMISSIONS`, `hasPermission`) — V2Q-128.
- **MSW**: `mock-domains/admin-rbac.ts` cùng luật server (6 TK, 5 vai trò, Super Admin bất khả xâm phạm, xoá vai trò đang
  dùng 409, MK tạm). Handler `/admin/auth/{login,me,first-password,2fa/setup,2fa/enable,totp/verify}`,
  `/admin/admin-roles*`, `/admin/admin-accounts*`; kiểm quyền theo khoá TK mock. TOTP thật (V2Q-131). Nhân sự phụ trách
  Dịch vụ = TK có `services.action` (như server).

## Test
- **e2e `behavior/admin-rbac.spec.ts`** (9 ca, chạy msw **và** server, không nhánh `onServer` nới assertion):
  `AT-RB02` Kế toán đúng menu + chỉ tab Nhật ký · `AT-RB03` Giảng viên chỉ xem Thành viên (dải, chặn Xuất, vẫn tìm) ·
  `AT-RB04` TK khoá không đăng nhập được · `AT-RB05` xoá vai trò đang dùng bị chặn · `AT-RB06` · `AT-RB01 + AT-SEC01`
  tạo TK (email thành viên báo tại ô) rồi đổi MK lần đầu · `REQ-329` xem thử · `REQ-352` bắt buộc 2FA → thiết lập TOTP,
  cột 2FA = Đã bật · `REQ-228` Super Admin bỏ quyền → phiên Giảng viên mất menu.
- `admin-settings.spec.ts`: ma trận §21, thêm/xoá vai trò, tạo/khoá/thu hồi TK + nhật ký. `admin-members.spec.ts`: thay
  test đổi quyền D-42 bằng AT-RB06.
- Unit: `permission-model.spec.ts` (REQ-326, AT-RB02), `model-ro.spec.ts`, `setup-route.spec.ts`, `settings/model.spec.ts`,
  MSW `settings-handlers.spec.ts` (AT-RB01/04/05), `handlers.spec.ts`, `g5c-handlers.spec.ts` (staff theo khoá).
- Int server: route cũ → 404; factory đọc token không phụ thuộc `me`. DB: `schema.int`, `seed-demo.int` sửa theo Super
  Admin ở `admin_users` (hỏng từ TIP-V2-202 vì `test:int` của db không nạp `.env` cho vitest — đã sửa script).

## Cổng kiểm (19/10/2026)
| Lệnh | Kết quả |
|---|---|
| `pnpm lint` / `pnpm typecheck` | 8/8 · 8/8 |
| `pnpm depcheck` | no dependency violations (601 modules) |
| Int server (`opchub_test`) | 75 file, **1002/1002** (−25: 5 route cũ × 5 vai trò trong ma trận sinh tự động) |
| Int db | **13/13** |
| Unit server / shared / admin / portal / ui | 92 / 85 / 154 / 113 / 35 |
| e2e behavior MSW | **163/163** |
| e2e behavior server (`opchub_dev`, stack riêng 4020/3280/3282) | **162/163** lượt đầu; ca lỗi `events.spec.ts › lọc chip + tìm` (portal, ngoài phạm vi) chạy lại `--repeat-each=3` → 18/18 đạt (flaky, ghi theo dõi) |
| Parity Cài đặt | D-69 1440 **0,33%** (trước 7,17%), D-73 1,24%, D-74 2,90%, D-80 0,70%; 390 lệch theo DV-G6a-1 (2 tab thêm của D-33) |

## Chưa làm / chuyển sau
- Parity D-61, D-63 (Dịch vụ) 3,27 / 3,06% ở 1440: prototype ver2 đổi trạng thái phiếu + danh mục V4 → TIP-V2-302/307
  (V2Q-133). Baseline parity toàn bộ chụp lại ở TIP-V2-307.
- Nút "Bật xác thực 2 lớp" trong menu avatar (2FA tự nguyện) chưa thêm — màn `/two-factor` dùng được qua URL; theo dõi ở P3.
