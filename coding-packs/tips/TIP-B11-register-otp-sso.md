# TIP-B11: Đăng ký cá nhân/DN, OTP, kích hoạt, SSO, `/public/settings`, `/public/stats`

## HEADER
- TIP-ID: TIP-B11 · Module: account (register) · Priority: P0 · Depends on: TIP-B07, TIP-B10 · Estimated: L (14h)
- **Files touched:**
  - `apps/server/src/modules/account/controllers/register.controller.ts`, `sso.controller.ts`, `public.controller.ts` (create)
  - `apps/server/src/modules/account/services/register.service.ts`, `otp.service.ts`, `sso.service.ts`, `member-code.ts` (create)
  - `apps/server/src/modules/account/repositories/registration.repository.ts` (create)
  - `apps/server/src/modules/account/domain/register.mapper.ts` (+ `.spec.ts`) (create)
  - `apps/server/src/modules/account/account.module.ts`, `index.ts` (modify — thêm dòng)
  - `apps/server/src/common/integrations/integrations.module.ts` (create — Nest provider cho adapter)
  - `apps/server/src/common/config/env.schema.ts`, `.env.example` (modify)
  - `apps/server/test/account/register.int.spec.ts`, `sso.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B12, TIP-B13 (khác file controller/service). Sequential, shares `account.module.ts` with B12/B13.

## CONTEXT
- Hợp đồng: `registerPersonalSchema`, `registerBusinessSchema`, `otpSentSchema` (202), `otpVerifySchema` → `loginResponseSchema`,
  `bizLookupSchema`, `ssoCallbackSchema`, `ssoCompleteSchema`, `publicSettingsSchema`. MSW: `register.ts`, `sso.ts`.
- BR-01 (đăng ký), BR-06 (nhóm chọn → yêu cầu tham gia), D-30 (sau OTP vào `/community`), D-38 (`/public/stats`), D-40 (DN dùng ngay; MST
  khớp → verified, không khớp → pending), D-45 (SSO email mới → form bổ sung, không OTP), D-47 (mail chào mừng không mật khẩu).

## TASK
Đăng ký tạo bản ghi chờ trong Redis (không tạo user trước OTP), gửi OTP qua outbox → mail. Xác thực OTP → tạo user + phí `pending_payment`
+ yêu cầu vào nhóm đã chọn + consent, trả phiên đăng nhập. SSO dùng provider fake (OQ-04) với cùng luồng `complete`.

## SPECIFICATIONS
1. Đăng ký: email/SĐT trùng user hiện có → 409 (thông báo field); mật khẩu theo `minPasswordLength` (app_settings.security) + `passwordScore ≥ 3`.
   `openRegistration=false` → 403. Lưu `reg:{email}` Redis TTL 30' (payload đã parse + hash mật khẩu). OTP 6 số, lưu **hash** `otp:{email}` TTL 10',
   tối đa 5 lần sai/mã, gửi lại ≤ 3/15'. Trả 202 `{email, expiresInSec: 600}`.
2. Verify OTP: sai → 422 `OTP_INVALID` (tăng đếm); đúng → transaction: `member_code` từ `member_code_seq`, user + `membership_fees(pending_payment)`
   + `business_profiles` (DN) + `group_members(status=pending)` cho mỗi nhóm + consent `terms`/`privacy` + outbox `mail.requested` (chào mừng D-47).
   Trả `{accessToken, me}` + cookie refresh.
3. DN: tra MST qua adapter; tên khớp (so không dấu, không phân biệt hoa) → `verified`, không khớp/không tra được → `pending` (D-40).
4. `GET /biz/lookup?tax=` → `bizLookupSchema` hoặc 404; cache Redis 30 ngày.
5. SSO (fake provider): `GET /auth/sso/:provider/callback?code=` → email đã có → `existing` + phiên; chưa có → `new` + `ssoToken` (Redis 15').
   `POST /auth/sso/complete` → tạo user (email_verified) + identity + phí + nhóm; không OTP (D-45).
6. `GET /public/settings` → `{registrationOpen}`; `GET /public/stats` (D-38) → số liệu công khai (đếm thành viên/nhóm/dự án, cache 5').
7. Rate limit: đăng ký + OTP 3/15' theo email, auth khác 20/phút.

## ACCEPTANCE CRITERIA
- Given form cá nhân hợp lệ When đăng ký Then 202 và FakeMail có OTP; When verify đúng Then 200 `loginResponseSchema`, phí `pending_payment`, `group_members` pending.
- Given email đã tồn tại When đăng ký Then 409. Given OTP sai 5 lần Then lần 6 (đúng) vẫn 422 và phải gửi lại.
- Given MST khớp tên When đăng ký DN Then `verified`; không khớp Then `pending`.
- Given SSO email mới When callback Then `status=new`; complete Then 200 + user `email_verified_at` có giá trị.
- Given `openRegistration=false` When đăng ký Then 403; `/public/settings` trả `false`.

## CONSTRAINTS
- DO NOT: tạo user trước OTP; lưu OTP thô; gửi mail trong transaction; gửi mật khẩu qua mail.
- REUSE: `PasswordService`, `TokenService`/`AuthService.startSession`, `OutboxService`, adapter B10.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC có int test; lint/typecheck/test/test:int xanh
- [ ] Rule HANDOFF 3: mail qua outbox cùng transaction tạo user
- [ ] Rule auth-rbac: OTP hash, timing-safe, giới hạn lần sai/gửi lại
- [ ] Commit; git sạch; SHA
