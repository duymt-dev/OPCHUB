# TIP-B06: Auth core — argon2id, JWT 15', refresh xoay vòng, login/logout/refresh, khoá 5 lần

## HEADER
- TIP-ID: TIP-B06
- Project: OPCHUB
- Module: server/modules/account (auth)
- Priority: P0
- Depends on: TIP-B02, TIP-B04
- Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/account/index.ts`, `account.module.ts` (create)
  - `apps/server/src/modules/account/controllers/auth.controller.ts`, `controllers/me.controller.ts` (create — `GET /me` tối thiểu)
  - `apps/server/src/modules/account/services/auth.service.ts`, `services/token.service.ts`, `services/password.service.ts`, `services/login-lock.service.ts`, `services/me.service.ts` (create)
  - `apps/server/src/modules/account/repositories/user.repository.ts`, `repositories/refresh-token.repository.ts` (create)
  - `apps/server/src/modules/account/domain/me.mapper.ts`, `domain/identifier.ts` (create) + `*.spec.ts` cạnh nguồn
  - `apps/server/src/common/config/env.schema.ts` (modify — `JWT_SECRET`, `JWT_ISSUER`, `REFRESH_COOKIE_SECURE`, `APP_ORIGINS`)
  - `apps/server/src/api/api-app.module.ts` (modify — import `AccountHttpModule`)
  - `packages/db/prisma/schema/account.prisma` (modify nếu thiếu cột), `apps/server/.env.example` (modify)
  - `apps/server/test/account/auth.int.spec.ts`, `test/factories/user.factory.ts` (create)
- **Parallel-safe with:** TIP-B05. Sequential, shares `env.schema.ts`, `api-app.module.ts` with TIP-B04/B07.

## CONTEXT
- `argon2` (argon2id), `jose` (HS256 JWT), refresh token = 32 byte random, lưu `sha256` hash trong `refresh_tokens`.
- Hợp đồng: `loginRequestSchema`, `loginResponseSchema`, `meSchema` (`@opchub/shared/api`). FE gọi `POST /auth/login` → `{accessToken, me}`.
- MSW tham chiếu: `apps/portal/src/mocks/handlers/auth.ts`. D-34 (remember → refresh 30 ngày, không → 7 ngày), D-44 (khoá 15' sau 5 lần sai, theo TK + IP).
- Key files: `standards/backend/auth-rbac.md`, `standards/security/security.md`, `plans/data-model.md` §1.

## APPLICABLE STANDARDS
- [backend/auth-rbac](../standards/backend/auth-rbac.md) · [security/security](../standards/security/security.md) · [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [testing/testing](../standards/testing/testing.md)

## TASK
Đăng nhập bằng email hoặc SĐT + mật khẩu, trả access JWT 15' + `me`; refresh token cookie `httpOnly` path `/v1/auth/refresh` xoay vòng mỗi lần
dùng, dùng lại token cũ → thu hồi cả `family_id`; logout thu hồi family hiện tại. Khoá đăng nhập theo D-44. `GET /v1/me` trả `meSchema`.

## SPECIFICATIONS
### Business Rules
1. Claim JWT: `sub`, `accountType`, `systemRole`, `permVersion`, `membershipFee {status, validUntil}`, `mustChangePassword`; `exp` 15'.
2. Login: tìm user theo email (citext) hoặc phone (chuẩn hoá E.164, `domain/identifier.ts`); không thấy/sai mật khẩu → 401 thông báo chung
   "Email hoặc mật khẩu không đúng" (không lộ tồn tại); verify argon2 cả khi không thấy user (chống timing — hash giả).
3. D-44: Redis `login_fail:{userId}` và `login_fail_ip:{ip}` đếm trong 15'; ≥5 → 429 `RATE_LIMITED` "Tài khoản tạm khoá 15 phút" + `Retry-After`.
   Thành công → xoá bộ đếm của user.
4. User `locked` → 403 `FORBIDDEN` "Tài khoản đã bị khoá" (BR-02). User `deleted_at` → như không tồn tại.
5. Refresh: cookie `opchub_rt`, `SameSite=Lax`, `Secure` theo env, `Path=/v1/auth/refresh`, `Max-Age` 7d/30d; kiểm `Origin` thuộc `APP_ORIGINS`.
   Token hợp lệ → revoke, phát mới cùng `family_id` (`replaced_by`), trả `{accessToken, me}`. Token đã revoke → revoke cả family, 401.
6. `permVersion` trong DB khác claim → refresh vẫn được (claim mới) — guard ở B07 so `permVersion` với Redis.
7. Logout (Đăng nhập) → revoke family của cookie hiện tại, xoá cookie, 204.
8. `me.mapper.ts`: user + membership_fee → `meSchema` (`transferRef = "OPCHUB " + member_code`, `amount` từ bảng phí); investor `membershipFee: null`.

### Validation
- Body qua `loginRequestSchema`.

### Error Handling
- Theo bảng code; mọi lỗi qua `AppError`.

## ACCEPTANCE CRITERIA
- Given user active mật khẩu đúng When login bằng email Then 200, body khớp `loginResponseSchema`, có cookie `opchub_rt` httpOnly path `/v1/auth/refresh`.
- Given login bằng SĐT `0912…` Then cũng 200.
- Given sai mật khẩu 5 lần When lần 6 (đúng mật khẩu) Then 429.
- Given user locked Then 403.
- Given refresh token hợp lệ When refresh Then 200 + cookie mới; dùng lại cookie cũ Then 401 và cookie mới cũng bị thu hồi.
- Given Origin lạ When refresh Then 403.
- Given access token When `GET /v1/me` Then khớp `meSchema`.

## CONSTRAINTS
- DO NOT: lưu refresh token thô; gửi mật khẩu qua mail; check tên vai trò; log mật khẩu/token.
- REUSE: `AppError`, `RedisService`, `PrismaService`, schema shared.
- SKIP: guard đầy đủ (B07), TOTP (B12), SSO (B11).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; mỗi AC có int test
- [ ] Rule HANDOFF 1: input/output parse bằng zod shared
- [ ] Rule auth-rbac: refresh xoay vòng + family revoke; D-44 khoá 15'
- [ ] Không secret trong repo; JWT_SECRET chỉ qua env
- [ ] lint/typecheck/test/test:int xanh; commit; SHA
