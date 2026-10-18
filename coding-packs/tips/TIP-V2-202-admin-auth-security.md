# TIP-V2-202: Đăng nhập Admin qua `admin_users`, đổi MK lần đầu, 2FA, khoá TK quản trị (§21, §22.2)

## HEADER
- TIP-ID: TIP-V2-202 · Project: OPCHUB · Module: account + admin-account + common/auth · Priority: P0 · Depends on: TIP-V2-201, TIP-V2-104 (thu hồi phiên/socket khi khoá) · Estimated: XL
- **Files touched:**
  - `apps/server/src/common/auth/access-token.ts` (modify: claim `realm: 'member' | 'admin'`, `roleId`, `twoFactor`, bỏ dần `systemRole` khỏi phiên admin)
  - `apps/server/src/common/auth/guards.ts`, `apps/server/src/common/auth/decorators.ts` (modify: `AccountStatusGuard` đọc khoá theo realm; route `/admin/**` từ chối realm `member`, route Portal từ chối realm `admin`; decorator `@AdminSetupAllowed()` cho route đổi MK / thiết lập 2FA)
  - `apps/server/src/common/auth/auth-state.service.ts` (modify: khoá `auth:admin:locked:<id>`, `auth:admin:perm_version:<id>`)
  - `apps/server/src/modules/admin-account/controllers/admin-auth.controller.ts` (create): `POST /admin/auth/login|refresh|logout`, `POST /admin/auth/totp/verify`, `POST /admin/auth/first-password`, `POST /admin/auth/2fa/setup`, `POST /admin/auth/2fa/enable`
  - `apps/server/src/modules/admin-account/services/{admin-auth,admin-session,admin-security}.service.ts` (create), `repositories/admin-refresh-token.repository.ts` (create)
  - `apps/server/src/modules/admin-account/controllers/admin-accounts.controller.ts`, `services/admin-accounts.service.ts` (modify: `PATCH /admin/admin-accounts/:id/role`, `POST /admin/admin-accounts/:id/status`, `DELETE /admin/admin-accounts/:id`)
  - `apps/server/src/modules/account/services/auth.service.ts`, `sso.service.ts` (modify: chỉ realm `member`; email TK quản trị → báo sai thông tin, không SSO)
  - `apps/server/src/modules/account/controllers/session-cookie.ts` (modify: cookie admin riêng `opchub_art`, path `/v1/admin/auth`)
  - `apps/server/src/modules/settings/services/settings-admin.service.ts` (modify: `requireAdmin2fa` bật → audit; đọc ở admin-auth)
  - `apps/server/src/socket/gateways/socket-auth.ts` (modify: realm `admin` không mở socket chat — chỉ REST, như ghi chú hiện có)
  - `packages/shared/src/api/admin-auth.ts` (create), `packages/shared/src/api/index.ts`, `packages/shared/src/api/me.ts` (modify: `adminMeSchema` gồm `roleId`, `roleName`, `permissions`, `mustChangePassword`, `twoFactor`, `twoFactorRequired`)
  - SQL: migration do agent chính tạo (`--create-only` + review): xoá mềm dòng `users` đã sao chép sang `admin_users` ở 201 (`deleted_at = now()`, đổi email sang `<id>@moved.invalid` để giải phóng UNIQUE), đổi `role_permissions`/`admin_invites` thành chỉ đọc
  - `apps/server/test/admin-account/admin-auth.int.spec.ts`, `admin-security.int.spec.ts` (create); `apps/server/test/account/auth.int.spec.ts`, `sso.int.spec.ts`, `apps/server/test/factories/admin.factory.ts` (create), `apps/server/test/common/guards.int.spec.ts` (modify)
- **Parallel-safe with:** sequential, shares `common/auth/*` với TIP-V2-203
- **Phase / nhánh:** V2-P2, `feature/V2-P2-admin-rbac`

## CONTEXT
- Đọc: NA-01 (§8.3), NA-15 (§8.17), NA-16 (§8.18), NA-17 (§8.19 "TK Admin không đăng nhập bằng SSO"), RB-R03, RB-R08, SEC-R01…R03 + luồng SEC-01 (§22.2), AT-RB04, AT-SEC01; D-62, D-27 (màn nhập 6 số), D-44 (khoá 5 lần/15'), D-55.
- BUG-015 / TD-016: `TotpService.enroll` không có caller, `requireAdmin2fa` không ai đọc. BUG-005 (đã xử lý ở TIP-V2-104: consumer `user.session_revoked` → `session.revoked`).
- Prototype ver2: `_cpSave` (MK ≥ 8, có chữ hoa và chữ số, khác MK tạm, nhập lại khớp), lỗi đăng nhập "Tài khoản quản trị đã bị khóa", nút Khóa/Mở khóa/Thu hồi/đổi vai trò trên dòng TK, "Chủ sở hữu" không thao tác được.
- Mẫu: `modules/account/services/{auth,token,totp,login-lock,session}.service.ts`, `controllers/{auth,password}.controller.ts`. Tái dùng `LoginLockService`, `TotpService` logic (domain `totp.ts`), `SecretBox`.

## APPLICABLE STANDARDS
[auth-rbac](../standards/backend/auth-rbac.md) · [security](../standards/security/security.md) · [api-conventions](../standards/backend/api-conventions.md) · [socket-chat](../standards/realtime/socket-chat.md) · [testing](../standards/testing/testing.md)

## TASK
Chuyển đăng nhập Admin sang `admin_users` với phiên riêng (realm `admin`), tách hẳn khỏi phiên thành viên; thêm luồng đổi mật khẩu lần đầu, bật 2FA + "Yêu cầu 2FA cho quản trị viên", khoá tạm khi sai nhiều lần, khoá/mở/thu hồi/đổi vai trò TK quản trị kèm thu hồi phiên và nhật ký.

## SPECIFICATIONS
### Business Rules
1. **Hai realm** (NA-01, RB-R03, D-62): `POST /auth/login` chỉ tra `users` (realm `member`); `POST /admin/auth/login` chỉ tra `admin_users` (realm `admin`). Email thành viên vào Admin: MK sai → 401 "Email hoặc mật khẩu không đúng"; MK đúng → 403 mã `WRONG_PORTAL` (cùng nguyên tắc BR-02: chỉ lộ khi MK đúng) để FE giữ câu "Tài khoản này đăng nhập ở cổng khác". Chiều ngược lại (email quản trị ở `/auth/login`) xử lý y hệt. Access token realm `admin` gọi route Portal → 403; realm `member` gọi `/admin/**` → 403.
2. Route ngoài `/admin` mà Admin FE đang gọi phải nhận realm `admin`: `/notifications*`, `/uploads/presign`, `GET /groups/:id/rooms`, `GET /rooms/:id/messages` (trình xem chat chỉ đọc D-26). Đánh dấu `@AllowRealm('admin')` và kiểm quyền bằng khoá 25 ở 203.
3. **SSO** (NA-17): admin không có nút/endpoint SSO; `SsoService` gặp email thuộc `admin_users` → 409 "Tài khoản quản trị không đăng nhập bằng SSO".
4. **Khoá tạm** (NA-15, SEC-R03): `LoginLockService` dùng chung, khoá theo `admin:<email>|ip`; đúng → reset; 5 lần sai/15' → 429 kèm `Retry-After`. Đặt lại MK admin chưa có (ngoài phạm vi).
5. **TK bị khoá** (AT-RB04, RB-R08): MK đúng + `status=locked` → 403 "Tài khoản quản trị đã bị khóa". Refresh khi bị khoá → 403 + xoá cookie.
6. **Đổi MK lần đầu** (SEC-R01, AT-SEC01): đăng nhập đúng MK tạm với `must_change_pwd=true` → 200 trả phiên **hạn chế** (`me.mustChangePassword=true`); mọi route `/admin/**` khác → 403 mã `PASSWORD_CHANGE_REQUIRED` cho tới khi `POST /admin/auth/first-password { newPassword, confirmPassword }` hợp lệ: ≥ 8 ký tự, có chữ hoa và chữ số, khác MK tạm ("Mật khẩu mới phải khác mật khẩu tạm"), nhập lại khớp ("Mật khẩu nhập lại không khớp"). Lưu → `must_change_pwd=false`, tăng `perm_version`, phát phiên mới, audit `admin_account.first_password`.
7. **2FA** (SEC-R02, BUG-015, D-27): `POST /admin/auth/2fa/setup` → `{ otpauthUrl, secretMasked }` (secret mã hoá SecretBox, chưa bật); `POST /admin/auth/2fa/enable { code }` mã đúng → bật. Đã bật thì đăng nhập qua bước `mfaToken` + `/admin/auth/totp/verify` (tái dùng luật 5 lần sai, mã không dùng lại). Khi `security.requireAdmin2fa=true` và TK chưa có 2FA → phiên hạn chế `me.twoFactorRequired=true`, route khác 403 `TWO_FACTOR_SETUP_REQUIRED` cho tới khi bật xong. Thứ tự: đổi MK lần đầu trước, rồi 2FA.
8. **Khoá / mở / thu hồi / đổi vai trò** (RB-R04, RB-R08, SEC-R03, D-55): Super Admin không bị khoá/thu hồi/đổi vai trò (409). Khoá: `UPDATE … WHERE status='active'`, tăng `perm_version`, Redis khoá, thu hồi mọi `admin_refresh_tokens`, outbox `admin_user.session_revoked` → `session.revoked` (nếu admin có socket). Mở khoá: `WHERE status='locked'`. Thu hồi = xoá mềm + thu hồi phiên. Đổi vai trò: ghi `role_id`, tăng `perm_version` không bắt buộc (quyền áp ngay qua cache vai trò, 203). Mỗi thao tác audit tag `permission` cùng transaction, summary theo prototype ("đổi vai trò X thành Y", "khóa tài khoản quản trị X", "thu hồi quyền quản trị của X").
9. Audit đăng nhập/đăng xuất admin (NA-01 "audit_log login/logout").
10. `GET /admin/me` trả `adminMeSchema` (FE dùng ở 204).

### Error Handling
- Thêm mã vào `packages/shared/src/errors.ts`: `PASSWORD_CHANGE_REQUIRED`, `TWO_FACTOR_SETUP_REQUIRED` (403), `WRONG_PORTAL` (403). Envelope theo api-conventions.

### Data / Migration
- Migration do agent chính tạo, `--create-only` + review SQL (xoá mềm dòng `users` quản trị đã chuyển; không xoá cứng vì `audit_logs.actor_id`, `messages.sender_id`… còn trỏ id cũ — id giữ nguyên ở `admin_users`).

## ACCEPTANCE CRITERIA
- Given TK quản trị mới với MK tạm, When đăng nhập Admin, Then nhận phiên hạn chế; gọi `/admin/overview` → 403 `PASSWORD_CHANGE_REQUIRED` (AT-SEC01, SEC-R01).
- Given màn đổi MK, When MK mới `abc12345` / không khớp / trùng MK tạm, Then 400 với đúng câu lỗi tương ứng; hợp lệ → vào Admin (AT-SEC01).
- Given TK bị khoá, When đăng nhập đúng MK, Then 403 "Tài khoản quản trị đã bị khóa" (AT-RB04, RB-R08).
- Given TK đang đăng nhập, When Super Admin khoá, Then lần gọi kế tiếp của phiên đó 403 và refresh 403 (NA-16, SEC-R03).
- Given 5 lần sai MK Admin, Then lần 6 trả 429 dù MK đúng (NA-15, SEC-R03).
- Given `requireAdmin2fa=true`, TK chưa 2FA, When đăng nhập, Then phiên hạn chế, setup + enable mã đúng → vào được; lần sau yêu cầu mã 6 số (SEC-R02, BUG-015).
- Given email thành viên, When đăng nhập `/admin/auth/login` đúng MK, Then 403 `WRONG_PORTAL`, không tạo phiên; email quản trị đăng nhập Portal → không vào được (NA-01, RB-R03, D-62).
- Given SSO trả email TK quản trị, Then 409, không tạo phiên (NA-17).
- Given khoá/mở/đổi vai trò/thu hồi, Then mỗi lần có 1 dòng `audit_logs` tag `permission` (RB-R08); Super Admin → 409 (RB-R04).

## TESTS BẮT BUỘC
- `apps/server/test/admin-account/admin-auth.int.spec.ts`: `AT-SEC01 MK tạm → phiên hạn chế`, `AT-SEC01 MK yếu/không khớp/trùng MK tạm bị từ chối`, `AT-RB04 TK khoá không đăng nhập được`, `REQ-215 khoá tạm 5 lần sai TK quản trị`, `REQ-201 realm member gọi /admin 403, realm admin gọi Portal 403`, `REQ-217 SSO email quản trị 409`, `REQ-352 bật 2FA rồi đăng nhập cần mã`, `REQ-352 requireAdmin2fa bắt thiết lập`.
- `apps/server/test/admin-account/admin-security.int.spec.ts`: `REQ-328 khoá/mở/đổi vai trò/thu hồi ghi audit`, `REQ-353 khoá thu hồi refresh + phiên đang mở 403`, `REQ-324 Super Admin không khoá/thu hồi được`, test socket `REQ-353 khoá → session.revoked` (nếu admin có socket).
- `apps/server/test/common/guards.int.spec.ts`: thêm ca realm.
- `e2e/behavior/a-01-login.spec.ts` chỉnh ở 204 (FE). Server: e2e msw + server không đỏ thêm.

## CONSTRAINTS
- DO NOT: gửi MK qua log; lưu TOTP secret thô; dùng chung cookie refresh giữa hai realm; kiểm tên vai trò (luật 4).
- DO NOT sửa FE (204). Không đổi khoá quyền trên route (203) — tạm dùng `s.role`/khoá cũ qua ánh xạ.
- REUSE: `LoginLockService`, domain `totp.ts`, `SecretBox`, `PasswordService`, `UserEventsPublisher`, outbox consumer phiên của TIP-V2-104.
- SKIP: quên MK cho TK quản trị (không có trong §21; ghi Câu hỏi).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 4: chỉ kiểm permission key/realm, không so tên vai trò.
- [ ] Luật 7, 8: khoá/mở cập nhật có điều kiện `WHERE status=<from>`; thu hồi phiên qua outbox cùng transaction.
- [ ] Luật 10, 12: audit mọi thao tác; không `console.*`, không secret trong repo; env mới (nếu có) vào `.env.example` + zod.
- [ ] Guard không query DB (S-03): khoá/perm_version admin đọc Redis.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck`; e2e msw + server (cập nhật `e2e/server/api.ts` sang `/admin/auth/login`).
- [ ] `git commit -- <paths>`, `git status --short` sạch, `TIP-V2-202-DONE <sha>`, report `coding-packs/reports/TIP-V2-202-completion.md`.
