# TIP-B12: Quên/đặt lại mật khẩu, đổi mật khẩu, thu hồi phiên khác, TOTP admin

## HEADER
- TIP-ID: TIP-B12 · Module: account (password) · Priority: P0 · Depends on: TIP-B06, TIP-B10 · Estimated: M (8h)
- **Files touched:**
  - `apps/server/src/modules/account/controllers/password.controller.ts` (create)
  - `apps/server/src/modules/account/services/password-reset.service.ts`, `totp.service.ts`, `session.service.ts` (create)
  - `apps/server/src/modules/account/repositories/user.repository.ts` (modify — thêm hàm)
  - `apps/server/src/modules/account/account.module.ts` (modify — thêm dòng)
  - `apps/server/test/account/password.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B11, TIP-B13. Sequential, shares `account.module.ts`, `user.repository.ts` with B11/B13.

## CONTEXT
- Hợp đồng: `forgotPasswordSchema` (204 luôn), `changePasswordSchema` (204 / 400 `PROFILE_MESSAGES.currentWrong`),
  `revokeSessionsResultSchema`. D-10 (không gửi mật khẩu qua mail), D-27 (TOTP admin, `otplib` hoặc tự hiện thực RFC 6238).
- `auth-rbac.md`: token đặt lại 32 byte, lưu hash, TTL 15', ≤ 3 lần/giờ; đổi mật khẩu → thu hồi phiên + bump `perm_version`.

## TASK
`POST /auth/password/forgot` (luôn 204, gửi link qua outbox), `POST /auth/password/reset {token, newPassword}`, `POST /auth/password/change`,
`POST /auth/sessions/revoke-others`, TOTP: `POST /auth/totp/verify` (bước 2 đăng nhập admin khi `requireAdmin2fa` và TK có `totp_secret`).

## SPECIFICATIONS
1. Forgot: không lộ email tồn tại; giới hạn 3/giờ/email; token Redis `pwreset:{sha256}` → userId TTL 15'.
2. Reset/Change: mật khẩu mới qua `passwordScore ≥ 3` + `minPasswordLength`; transaction: cập nhật hash, `perm_version+1`, outbox
   `user.session_revoked{reason:'password_changed'}`; sau commit: `AuthState.setPermVersion`, thu hồi refresh (change giữ chuỗi hiện tại).
3. Revoke-others: thu hồi mọi chuỗi refresh khác chuỗi của cookie hiện tại, trả `{revoked}`.
4. TOTP: secret 20 byte mã hoá AES-256-GCM (`TOTP_ENC_KEY` env) trong `users.totp_secret_enc`; login admin có secret → trả 401
   `{code:'UNAUTHORIZED', message:'Cần mã xác thực 2 lớp'}` + `mfaToken` (Redis 5')? — **Phương án an toàn (Q-B12-1)**: FE admin chưa có màn TOTP,
   nên chỉ bắt buộc khi TK đã bật TOTP; bật/tắt TOTP làm ở B40. Bước 2 `POST /auth/totp/verify {mfaToken, code}` → phiên.

## ACCEPTANCE CRITERIA
- Forgot email không tồn tại → 204 và không có mail; tồn tại → 204 + mail có link.
- Reset token đúng → 204, đăng nhập mật khẩu mới OK, access token cũ → 401 (perm_version); token dùng lần 2 → 400.
- Change sai mật khẩu hiện tại → 400 `currentWrong`; đúng → 204.
- Revoke-others → chuỗi khác bị thu hồi, chuỗi hiện tại refresh vẫn được.
- TOTP: mã đúng ±1 bước → phiên; sai → 401.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC có int test; gate xanh; commit; SHA
- [ ] Rule D-10: không gửi mật khẩu qua mail; token chỉ lưu hash
- [ ] Rule auth-rbac: đổi mật khẩu thu hồi phiên + bump version
