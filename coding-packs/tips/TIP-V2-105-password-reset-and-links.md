# TIP-V2-105: Đặt lại mật khẩu, link chết trong thông báo/mail, SSO redirect, hộp thư giả cho test (BUG-001, BUG-023, BUG-034, TD-035, NA-17)

## HEADER
- TIP-ID: TIP-V2-105 · Project: OPCHUB · Module: account (password, sso) + mail adapter + Portal/Admin auth + thông báo · Priority: P0 · Depends on: — · Estimated: L (10h)
- **Files touched:**
  - Server: `apps/server/src/modules/account/services/password-reset.service.ts` (modify: link theo loại TK), `apps/server/src/modules/account/services/sso.service.ts` (modify: `redirectUri(provider)`), `apps/server/src/common/config/env.schema.ts` (modify: `ADMIN_URL`, `FAKE_MAIL_DIR`), `apps/server/.env.example`, `infra/env/server.env.example` (modify: thêm 2 khoá), `apps/server/src/common/integrations/integrations.module.ts` (modify: truyền `FAKE_MAIL_DIR` cho fake), `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: link phí `/dashboard`)
  - Adapter: `packages/integrations/src/mail/fake.provider.ts` (modify: tuỳ chọn `outDir` ghi `<outDir>/<email>/<ts>-<messageId>.json`), `packages/integrations/src/mail/fake.provider.spec.ts` (create)
  - Shared UI: `packages/ui/src/auth/reset-panel.tsx` + `reset-panel.module.css` (create), `packages/ui/src/auth/index.ts` (modify — chỉ thêm dòng export)
  - Portal: `apps/portal/src/app/(public)/reset-password/page.tsx` (create), `apps/portal/src/features/auth/components/reset-screen.tsx` (create), `features/auth/api.ts`, `features/auth/index.ts` (modify: `resetPassword`, export), `apps/portal/src/app/(public)/sso/callback/[provider]/page.tsx` (create), `features/auth/components/sso-complete-screen.tsx` (modify: provider lấy từ path, fallback `?provider=`), `apps/portal/src/app/(public)/huong-dan/page.tsx` (create, trang tĩnh), `apps/portal/messages/vi/auth.json` (modify: thêm `reset.*`, `guide.*`; sửa `forgot.sentTail` "30 phút" → "15 phút"), `apps/portal/src/mocks/handlers/register.ts` (modify: thêm `POST /auth/password/reset`)
  - Admin: `apps/admin/src/app/(public)/reset-password/page.tsx` (create), `apps/admin/src/features/auth/components/reset-screen.tsx` (create), `features/auth/api.ts`, `features/auth/index.ts` (modify), `apps/admin/messages/vi/auth.json` (modify: `reset.*`, `forgot.sentTail` → 15 phút), `apps/admin/src/mocks/handlers/auth.ts` (modify: thêm reset), `apps/admin/src/features/shell/hooks/use-notifications.ts` (modify: mở link Admin), `apps/admin/src/features/requests/hooks/use-request-route.ts` + `components/requests-screen.tsx` (modify: đọc `?code=` mở drawer)
  - Test/e2e: `apps/server/test/account/password.int.spec.ts`, `apps/server/test/account/sso.int.spec.ts`, `apps/server/test/notification/notifications.int.spec.ts` (modify), `e2e/server/mailbox.ts` (create: đọc thư từ `FAKE_MAIL_DIR`), `e2e/env.ts` (modify: `FAKE_MAIL_DIR`), `e2e/server/README.md` (modify: thêm biến), `e2e/behavior/auth-flows.spec.ts`, `e2e/behavior/admin-requests.spec.ts` (modify)
- **Parallel-safe with:** TIP-V2-101, 102, 103, 107, 108, 109, 110, 111, 113, 114. `sequential, shares env.schema.ts + .env.example + server.env.example with TIP-V2-112` (chỉ thêm dòng). `shares messages/vi/auth.json (portal+admin) with TIP-V2-104/106` (chỉ thêm khoá, giữ `.wire-lock`). `shares packages/ui/src/auth/index.ts with TIP-V2-106` (thêm dòng). `shares requests-screen.tsx with TIP-V2-113` nếu 113 sửa màn YC. Pha sau: TIP-V2-202 (P2) sửa tiếp `sso.service.ts` + điều kiện TK quản trị ở `password-reset.service.ts` khi có bảng `admin_users`.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-105-password-links`)

## CONTEXT
- Đặc tả: QT-02 + AU-08 (liên kết đặt lại 15 phút, ≤ 3 lần/giờ, đặt lại xong thu hồi toàn bộ phiên); §12 ma trận ("Đặt lại mật khẩu — email 15 phút"; "Gắn tên trong bình luận YC — Mở đúng phiếu YC"); NA-17 (SSO ánh xạ đúng email; ChatGPT/Gemini/DeepSeek đi luồng Google); D-62 (TK quản trị không vào Portal, không SSO); D-45.
- Audit: BUG-001 (link `PORTAL_URL/reset-password?token=` → 404; Admin cũng nhận link Portal), BUG-023 (link chết `/membership`, `/requests?code=`, `/huong-dan`; Admin bấm thông báo không điều hướng), BUG-034 (`redirect_uri` không mang provider, chỉ FakeSso gắn `?provider=`), TD-035 (không e2e theo link trong mail: `mail_logs.body_html` bị xoá sau gửi — **đúng, giữ nguyên**; FakeMail giữ thư trong RAM worker); kiểm cơ học `apps/server/test/audit/c2-links.audit.ts` (M2).
- Code: API reset đã có `POST /v1/auth/password/reset` (`password.controller.ts:49`, `resetPasswordSchema` ở `packages/shared/src/api/auth.ts:100`); `password-reset.service.ts:51` dựng link; `sso.service.ts:51-53` `redirectUri()`; `notification-events.handler.ts:116` (`/membership`), `:154` (`/requests?code=`); seed `guideUrl` `packages/shared/src/fixtures/prototype-seed.json:1696`; Admin `use-notifications.ts:11-13` cố ý không điều hướng.
- Mẫu UI: `ForgotPanel` (`packages/ui/src/auth/forgot-panel.tsx`), `PasswordField` + `passwordStrength` (Portal register). Mẫu endpoint dev chỉ fake: `dev-bank.controller.ts`.

## APPLICABLE STANDARDS
[routing-auth](../standards/frontend/routing-auth.md) · [nextjs-structure](../standards/frontend/nextjs-structure.md) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) · [adapters](../standards/integrations/adapters.md) (fake provider dev/test) · [security](../standards/security/security.md) · [testing](../standards/testing/testing.md)

## TASK
Thêm màn `/reset-password` ở Portal và Admin, link trong mail trỏ đúng app theo loại tài khoản. Sửa mọi link chết trong thông báo/mail, Admin bấm thông báo mở đúng phiếu YC. SSO redirect mang provider trong đường dẫn. FakeMail ghi thư ra thư mục để test e2e đi theo link mà không lưu token trong DB.

## SPECIFICATIONS
### Business Rules
1. **Link đặt lại (BUG-001, D-62)**: `forgot()` lấy thêm `systemRole` của TK; TK quản trị (`systemRole <> 'member'`) → `${ADMIN_URL}/reset-password?token=…`, còn lại `${PORTAL_URL}/…`. Sau TIP-V2-201 (bảng `admin_users`) đổi điều kiện theo bảng — ghi chú trong code. Hiệu lực 15 phút, ≤ 3 lần/giờ, dùng 1 lần (`GETDEL`) — giữ nguyên.
2. **Màn đặt lại** (Portal + Admin, public, không qua AuthGate): đọc `?token=`; thiếu token → trạng thái lỗi + nút "Gửi lại liên kết" (`/forgot-password`). Form: Mật khẩu mới + Nhập lại (khớp, đo độ mạnh như đăng ký). Gửi `POST /auth/password/reset`. 204 → toast "Đã đặt lại mật khẩu, vui lòng đăng nhập" → `/login`. 400 `RESET_INVALID` → hiện thông điệp server + nút gửi lại. 400 có `fields[newPassword]` → báo tại ô. Copy: tiêu đề "Đặt lại mật khẩu", nút "Cập nhật mật khẩu" (theo giọng prototype; prototype không có màn này — xem Câu hỏi).
3. Sửa copy `forgot.sentTail` thành "Liên kết có hiệu lực trong 15 phút." (khớp QT-02/AU-08; prototype ghi 30 phút).
4. **Link thông báo (BUG-023)**:
   - Phí kích hoạt: `link: '/dashboard'` (Portal không có `/membership`; `/membership/pay` là hộp chuyển khoản, sai ngữ cảnh).
   - @nhắc phiếu YC: giữ `/requests?code=<code>`. Admin `useRequestRoute` thêm `code` vào URL params; `RequestsScreen` mở drawer theo `code` (đóng drawer → xoá `code`). Phiếu không có trong trang hiện tại → đặt `q=<code>`, `page=1` để danh sách (`GET /admin/service-requests?q=`) trả đúng phiếu rồi mở (không có endpoint chi tiết theo code — không thêm).
   - Admin `useNotifications.open(id)`: đánh dấu đọc rồi `router.push(link)` nếu `link` là route Admin (bắt đầu bằng `/` và khớp danh sách prefix nav Admin `apps/admin/src/features/shell/nav.ts`); link khác bỏ qua.
   - `guideUrl` `/huong-dan`: tạo trang tĩnh public Portal `/huong-dan` (không cần đăng nhập) gồm các bước theo SRS §6 (Đăng ký → OTP → Đóng phí → Sử dụng → Gia hạn) và liên hệ hỗ trợ; nội dung qua i18n `guide.*`.
5. **SSO redirect (BUG-034, NA-17)**: `redirectUri(provider) = ${PORTAL_URL}/sso/callback/${provider}` dùng cho cả `authorizeUrl` và `exchange` (phải trùng nhau). Portal thêm route `sso/callback/[provider]`; route cũ `sso/callback?provider=` giữ cho MSW/link cũ. `FakeSsoProvider` không còn phụ thuộc việc tự gắn `provider` (vẫn gắn `code`, `state`). TK quản trị đăng nhập SSO → 403 (D-62; `sso.service.ts › callback` hiện chỉ chặn `locked` — thêm chặn `systemRole <> 'member'` với "Tài khoản quản trị không đăng nhập bằng SSO", trước `startSession`).
6. **Hộp thư giả (TD-035)**: `FakeMailProvider({ outDir? })`: khi có `outDir` ghi mỗi thư `{ to, subject, html, sentAt }` thành file JSON `<outDir>/<email-lowercase>/<epochMs>-<messageId>.json` (tạo thư mục, chỉ ký tự an toàn); giữ mảng `sent` như cũ. `integrations.module.ts` chỉ truyền `outDir` khi `NODE_ENV !== 'production'` và `FAKE_MAIL_DIR` có giá trị; production + `FAKE_MAIL_DIR` → env schema từ chối (refine). `mail_logs.body_html` vẫn xoá sau khi gửi — **không** lưu token trong DB.
7. `e2e/server/mailbox.ts`: `lastMailTo(email, { since, timeoutMs = 10_000 })` poll thư mục (đọc file mới nhất có `sentAt >= since`), trả `html`; `linkFrom(html, path)` lấy href chứa `path`. MSW: `POST /auth/password/reset` nhận token `msw-reset-token` (204), token khác → 400 `RESET_INVALID`; e2e msw mở thẳng `/reset-password?token=msw-reset-token`. Phần kiểm sau khi mở link **giống hệt** ở hai chế độ (D-63).

### Validation / Env
- `ADMIN_URL: z.string().url().default('http://localhost:3001')`, `FAKE_MAIL_DIR: z.string().optional()` + refine cấm ở production; thêm vào `apps/server/.env.example` (+ ghi chú e2e `FAKE_MAIL_DIR=D:/opchub-local/mailbox`) và `infra/env/server.env.example` (`ADMIN_URL=https://admin.opchub.community`, không có `FAKE_MAIL_DIR`).

## ACCEPTANCE CRITERIA
- Given TV quên mật khẩu, When mở link trong mail, Then thấy màn đặt lại ở Portal; nhập mật khẩu mạnh → về đăng nhập, đăng nhập bằng mật khẩu mới thành công, phiên cũ bị thu hồi (BUG-001, UAT-11, QT-02).
- Given TK quản trị quên mật khẩu, Then link trỏ `ADMIN_URL/reset-password`, đặt lại xong đăng nhập Admin được (BUG-001, D-62).
- Given dùng lại link lần 2 hoặc sau 15 phút, Then màn báo "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" + nút Gửi lại liên kết (QT-02).
- Given mật khẩu yếu, Then báo tại ô Mật khẩu mới (QT-02).
- Given nhân sự được @nhắc trong phiếu YC-0005, When bấm thông báo ở Admin, Then mở `/requests?code=YC-0005` và drawer phiếu đó mở (BUG-023, UAT-23, §12).
- Given thông báo "Đã ghi nhận phí thành viên", When bấm, Then tới `/dashboard` (không 404) (BUG-023).
- Given mail chào mừng, When bấm "Hướng dẫn sử dụng", Then `/huong-dan` hiển thị (BUG-023).
- Given provider thật trả về `PORTAL_URL/sso/callback/google?code=…` (không có `?provider=`), Then Portal hoàn tất SSO (BUG-034, NA-17).
- `c2-links.audit.ts` chạy lại: 0 link chết (M2).

## TESTS BẮT BUỘC
- Unit `packages/integrations/src/mail/fake.provider.spec.ts`: `TD-035 ghi thư ra outDir theo email`, `không có outDir thì không ghi file`. `env.schema.spec.ts`: `FAKE_MAIL_DIR bị cấm ở production`.
- Int `apps/server/test/account/password.int.spec.ts`: sửa helper `resetToken` đọc từ `FakeMailProvider` (override `MAIL` + chạy `MailSenderService.send`) thay vì `mail_logs.body_html`; thêm `BUG-001 TK thành viên → link PORTAL_URL/reset-password`, `BUG-001 D-62 TK quản trị → link ADMIN_URL/reset-password`, `TD-035 mail_logs.body_html null sau khi gửi`.
- Int `apps/server/test/account/sso.int.spec.ts`: `BUG-034 REQ-217 authorizeUrl dùng redirect_uri /sso/callback/<provider>`, `REQ-217 exchange nhận cùng redirect_uri`, `D-62 TK quản trị SSO → 403`.
- Int `apps/server/test/notification/notifications.int.spec.ts`: `BUG-023 link thông báo phí = /dashboard`.
- E2E (msw + server, cùng assertion) `e2e/behavior/auth-flows.spec.ts`: `UAT-11 BUG-001 quên mật khẩu → mở link → đặt lại → đăng nhập bằng mật khẩu mới` (server: lấy link qua `lastMailTo`), `BUG-001 link đã dùng → báo hết hạn`, `BUG-023 /huong-dan hiển thị`. `e2e/behavior/admin-requests.spec.ts`: `UAT-23 BUG-023 /requests?code= mở drawer phiếu`.

## CONSTRAINTS
- DO NOT: lưu token / link đặt lại vào DB hay log; trả token trong API; endpoint dev đọc hộp thư qua HTTP; cho TK quản trị vào Portal; thêm nhánh `onServer` làm yếu assertion; copy code prototype.
- REUSE: `PasswordResetService.reset`, `ForgotPanel` làm mẫu `ResetPanel`, `PasswordField`, `passwordStrength`, `useUrlParams`, `ApiError.fields`.
- SKIP: mở khoá đăng nhập khi đặt lại mật khẩu (NA-15, TIP-V2-202); SSO provider thật (OQ-04, TD-009 — chỉ sửa redirect_uri); nội dung Hướng dẫn đầy đủ (chờ PM, trang tĩnh tối thiểu).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 11 (mail chỉ qua adapter; fake cho dev/test), luật 12 (env mới có trong `.env.example` + zod), luật 1 (FE ≤ 250 dòng, page chỉ orchestrator), luật 13 (test file riêng).
- [ ] File dùng chung chỉ thêm dòng (`messages/vi/auth.json`, `packages/ui/src/auth/index.ts`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `test:int` xanh; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` (với `FAKE_MAIL_DIR`) xanh; chạy lại `c2-links.audit.ts`.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-105-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-105-completion.md`.
