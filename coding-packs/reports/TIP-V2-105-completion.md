# TIP-V2-105: Đặt lại mật khẩu, link chết, SSO redirect, hộp thư giả (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-001, BUG-023, BUG-034, TD-035, NA-17, D-62.
> V2Q-56/57/58/59 (đã chốt), V2Q-68/69/70 (mới). Không cần migration.
> Commit: `c7d71af` (server/adapter/shared), `7a2beb2` (web), `29d335f` (e2e) + commit báo cáo này.

## Đã làm
- **Env**: `ADMIN_URL` (mặc định `http://localhost:3001`), `FAKE_MAIL_DIR` (optional; production → từ chối
  khởi động). Đã thêm vào `apps/server/.env.example` (kèm ghi chú e2e) và `infra/env/server.env.example`
  (chỉ `ADMIN_URL`).
- **Link đặt lại (BUG-001, D-62)**: `CredentialRepository.findByEmail` lấy thêm `systemRole`;
  `PasswordResetService.resetBaseUrl()` cho TK `systemRole <> 'member'` → `ADMIN_URL`, còn lại → `PORTAL_URL`
  (có ghi chú đổi sang `admin_users` sau TIP-V2-201). `reset()` kiểm độ mạnh **trước** `GETDEL`, nên mật khẩu
  yếu không làm mất link (V2Q-68). TTL 15', ≤ 3 lần/giờ, dùng một lần: giữ nguyên.
- **SSO (BUG-034, NA-17)**: `redirectUri(provider) = PORTAL_URL/sso/callback/<provider>` dùng chung cho
  `authorizeUrl` và `exchange`. `FakeSsoProvider` không gắn `?provider=` nữa. TK quản trị đăng nhập SSO bị
  403 "Tài khoản quản trị không đăng nhập bằng SSO" (chặn trước `startSession`).
- **Thông báo (BUG-023)**: phí kích hoạt → `/dashboard`. Admin `useNotifications.open`: đánh dấu đã đọc rồi
  `router.push(link)` nếu `adminLinkOf(link, ADMIN_NAV)` khớp prefix menu (chặn `//`, `/\`, URL tuyệt đối).
  `useRequestRoute` thêm `code` vào URL params (tách khỏi query key của danh sách); `RequestsScreen` mở
  drawer theo `code`, đóng drawer thì xoá `code`. Phiếu không có ở trang hoặc lọc hiện tại → đặt
  `q=<code>, status=all, page=1` (V2Q-69). Admin `AuthGate` giữ query trong `next` để link thông báo vẫn
  đúng sau khi đăng nhập.
- **Hộp thư giả (TD-035)**: `FakeMailProvider({ outDir })` ghi `<outDir>/<email>/<epochMs>-<messageId>.json`
  (`{to, subject, html, sentAt}`; tên thư mục chỉ gồm `[a-z0-9._@+-]`). `integrations.module.ts` chỉ truyền
  `outDir` khi `NODE_ENV !== 'production'`. `mail_logs.body_html` vẫn bị xoá sau khi gửi; không lưu token
  trong DB, không có endpoint HTTP đọc thư.
- **Shared**: `PASSWORD_RESET_INVALID_MESSAGE`, `weakPasswordMessage` chuyển vào `@opchub/shared/errors`
  (server và MSW dùng chung). Mock: `MOCK_RESET_TOKEN`, `mockResetPassword`; `mockLogin` nhận mật khẩu
  đã đặt lại.
- **UI**: `ResetPanel` + CSS trong `packages/ui/src/auth` (khuôn `ForgotPanel`, `PasswordField` + thanh độ
  mạnh). Portal và Admin có `/reset-password` (public, `ResetScreen`): thiếu token hoặc 400 không có field
  → khối lỗi + "Gửi lại liên kết" (`/forgot-password`); `fields[newPassword]` → báo tại ô; 204 → toast
  "Đã đặt lại mật khẩu, vui lòng đăng nhập" → `/login`.
- Portal `/huong-dan`: trang tĩnh public, 5 bước theo §6 + liên hệ hỗ trợ, i18n `auth.guide.*`.
  Portal `/sso/callback/[provider]`: `SsoCompleteScreen` đọc provider từ path, fallback `?provider=`
  (route cũ giữ nguyên). `useSso` (MSW) đẩy sang `/sso/callback/<id>?code=mock`.
- Copy `forgot.sentTail` → "15 phút" ở cả Portal và Admin. Chỉ thêm khoá `reset.*` (Admin) và
  `reset.*` + `guide.*` (Portal).
- MSW: `POST /auth/password/reset` ở Portal (TK thành viên demo) và Admin (TK quản trị demo). Link đã dùng
  ghi vào cookie `opchub-mock-reset-used` (V2Q-70).
- e2e: `e2e/server/mailbox.ts` (`lastMailTo`, `linkFrom`), `env.FAKE_MAIL_DIR`, README server thêm
  `ADMIN_URL` + `FAKE_MAIL_DIR`.
- `c2-links.audit.ts`: nhận link đặt lại theo loại TK (Portal + Admin); `?code=` đạt khi Admin đọc `code`
  **và** thông báo có điều hướng; bỏ ghi chú cũ khi đã sửa.

## Test (số thật)
- Unit: server 74/74, shared 73/73 (gồm `reset.spec.ts` +3), integrations 25 đạt + 2 skip (S3 cũ;
  `fake.provider.spec.ts` +3), ui 25/25, portal 93/93, admin 125/125 (`shell/model.spec.ts` +2).
  `env.schema.spec.ts`: `TD-035 FAKE_MAIL_DIR bị cấm ở production`, `BUG-001 ADMIN_URL mặc định`.
- Int (opchub_test): toàn bộ **276/276** (66 file). Mới hoặc sửa:
  - `password.int.spec.ts`: helper `resetMail/resetToken` lấy thư qua `MailSenderService.send` →
    `FakeMailProvider` (override `MAIL`), không đọc `mail_logs.body_html`; `BUG-001 TK thành viên → link
    PORTAL_URL/reset-password`, `BUG-001 D-62 TK quản trị → link ADMIN_URL/reset-password`, `TD-035
    mail_logs.body_html null sau khi gửi`; ca mật khẩu yếu kiểm thêm link vẫn dùng được.
  - `sso.int.spec.ts`: `BUG-034 REQ-217 authorizeUrl dùng redirect_uri /sso/callback/<provider>`,
    `REQ-217 exchange nhận cùng redirect_uri`, `D-62 TK quản trị SSO → 403`.
  - `notifications.int.spec.ts`: `BUG-023 link thông báo phí = /dashboard`.
- `pnpm lint` 8/8, `pnpm typecheck` 8/8, `pnpm depcheck`: không có vi phạm.
- `c2-links.audit.ts`: **15 đạt / 0 không đạt** (trước: 1 S1 reset-password, `/membership`, `/huong-dan`,
  `?code=`).
- e2e MSW (build riêng `.next-105`, Portal 3310 / Admin 3301, đã dừng và xoá sau khi chạy): toàn bộ behavior
  **124/124**. Mới: `UAT-11 BUG-001 …đăng nhập bằng mật khẩu mới`, `BUG-001 link đã dùng → báo hết hạn…`,
  `BUG-001 D-62 TK quản trị → link Admin…`, `BUG-023 /huong-dan hiển thị`, `UAT-23 BUG-023 /requests?code=
  mở drawer phiếu`.

## e2e server: CHƯA chạy (lý do môi trường)
api/socket/worker dev trên 4000/4001 là bản build cũ, chưa có các thay đổi này. Đã kiểm:
`GET :4000/v1/auth/sso/google` vẫn trả `…/sso/callback?provider=google…`. Bản đó cũng chưa có
`FAKE_MAIL_DIR`, nên test không đọc được thư. Builder không dừng hay khởi động lại tiến trình không do mình tạo.
Spec đã viết với cùng assertion cho MSW và server; chỉ khác nguồn link (server lấy qua `lastMailTo`).
**Cần agent chính**:
1. Thêm `ADMIN_URL=http://localhost:3201` và `FAKE_MAIL_DIR=D:/opchub-local/mailbox` vào `apps/server/.env`.
2. Rebuild và restart api/socket/worker; rebuild `.next-server` của Portal/Admin.
3. Chạy `FAKE_MAIL_DIR=D:/opchub-local/mailbox pnpm e2e:server --project behavior` (ít nhất `auth-flows`,
   `admin-requests`, `a-01-login`).

## Ngoài phạm vi / ghi chú
- `c6-env.audit.ts` báo S4 `FAKE_MAIL_DIR` không có trong `infra/env/server.env.example`. Đây là cố ý theo
  TIP (production không được có biến này).
- TIP-V2-202: đổi điều kiện TK quản trị ở `password-reset.service.ts` / `sso.service.ts` sang `admin_users`.
- Nội dung `/huong-dan` mới ở mức tối thiểu, chờ PM (V2Q-59). Liên hệ hỗ trợ chưa có email/hotline chính
  thức trong SRS.
