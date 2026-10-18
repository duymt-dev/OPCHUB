# TIP-V2-112: Gia cố bảo mật — đổi email có OTP, SSO cuối, CSRF Origin, mẫu allow IP webhook, rate limit (QT-01, §15)

## HEADER
- TIP-ID: TIP-V2-112 · Project: OPCHUB · Module: account, socket, infra · Priority: P1 · Depends on: — · Estimated: M (8h)
- **Files touched:**
  - `packages/shared/src/api-domains/profile.ts` (modify: `updateProfileSchema` bỏ `email`; thêm `emailChangeRequestSchema {newEmail}`, `emailChangeVerifySchema {newEmail, code}`; `profileSchema` thêm `hasPassword: boolean`)
  - `apps/server/src/modules/account/services/email-change.service.ts` (create: gửi OTP tới email mới, xác nhận, đổi email + thu hồi phiên khác) · `controllers/me.controller.ts` (modify: `POST /me/email/otp`, `POST /me/email/verify`) · `account.module.ts` (đăng ký service)
  - `apps/server/src/modules/account/services/profile.service.ts` (modify: bỏ nhánh đổi email trong `update`; `setSso` chặn huỷ liên kết cuối khi chưa có mật khẩu) · `repositories/profile.repository.ts` (modify: `identityCount`, `hasPassword`, `updateEmail`) · `domain/profile.mapper.ts` (`hasPassword`)
  - `apps/server/src/modules/mail/templates.ts` (modify: `emailChangeMail(code, ttl)` — nếu quá dài tách `templates-account.ts` create)
  - `apps/server/src/modules/account/controllers/session-cookie.ts` (modify `assertAllowedOrigin`: thiếu `Origin` → kiểm `Referer`, thiếu cả hai → 403)
  - `apps/server/src/modules/account/controllers/auth.controller.ts` (modify: `@Throttle` cho `logout`) · `password.controller.ts` (modify: `@Throttle` cho `sessions/revoke-others`)
  - `apps/server/src/socket/gateways/connect-rate.ts` (create: giới hạn kết nối/IP + /user bằng Redis INCR) · `socket/gateways/chat.gateway.ts` (modify: gọi trong `io.use` trước `authenticate`)
  - `apps/server/src/common/config/env.schema.ts` + `apps/server/.env.example` + `infra/env/server.env.example` (modify: `SOCKET_CONNECT_PER_MIN` mặc định 30)
  - `infra/nginx/snippets/opchub-bank-allow.conf.example` (create: mẫu `allow <IP>; deny all;`) · `infra/nginx/snippets/opchub-backend.conf` (modify: comment `# include …opchub-bank-allow.conf;` trong `location = /v1/webhooks/bank`) · `infra/README.md` (modify: mục cài allow IP webhook) · `infra/GO-LIVE-CHECKLIST.md` (thêm 1 dòng L3 xin dải IP SePay)
  - `apps/server/src/modules/membership-fee/controllers/bank-webhook.controller.ts` (modify comment cho đúng hiện trạng)
  - `apps/portal/src/features/profile/components/info-tab.tsx` (modify: email chỉ đọc + nút "Đổi email") · `components/email-change-modal.tsx` (create, dùng `OtpModal` của `packages/ui`) · `hooks/use-email-change.ts` (create) · `hooks/use-security.ts`, `components/security-tab.tsx` (modify: nút huỷ SSO cuối disabled + gợi ý đặt mật khẩu) · `api.ts` (thêm 2 hàm) · `apps/portal/messages/vi/profile.json` (thêm khoá)
  - MSW: `apps/portal/src/mocks/handlers/profile.ts`, `packages/shared/src/mock-data/domains/profile.ts` (modify: 2 endpoint mới, chặn SSO cuối)
  - Test: `apps/server/test/account/profile.int.spec.ts`, `auth.int.spec.ts`, `password.int.spec.ts` (modify); `apps/server/test/socket/socket.int.spec.ts` (modify); `apps/server/test/contract/account-me.int.spec.ts` + `coding-packs/plans/api-contract.md` (thêm 2 dòng endpoint, cập nhật số 193 trong `coverage.int.spec.ts`); `e2e/behavior/profile.spec.ts` (modify)
- **Parallel-safe with:** TIP-V2-102, 103, 107, 108, 109, 110, 111, 113, 114. `sequential, shares chat.gateway.ts + socket-auth with TIP-V2-104` (104 trước — ngắt socket khi khoá) · `sequential, shares auth.controller.ts/password.controller.ts/session-cookie.ts + profile.service.ts with TIP-V2-105` (105 trước — đặt lại MK, SSO redirect) · `mail/templates.ts` + `api-contract.md` + `coverage.int.spec.ts` có thể đụng 105/114 — chỉ thêm dòng.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả: QT-01 (email hợp lệ là điều kiện OTP — email là tên đăng nhập), QT-02/NA-17 (SSO ánh xạ đúng email), §15 (chống CSRF; webhook whitelist IP), NA-15/16.
- Audit W1: BUG-030 (CR-34; `profile.service.ts:58-64` đổi email không OTP, `:74-83` huỷ SSO cuối), BUG-031 (CR-32; `session-cookie.ts:43-48` cho qua khi thiếu `Origin`), BUG-032 (CR-33; `opchub-backend.conf:16-25` không allow/deny), TD-018 (CR-35; `auth.controller.ts:66`, `password.controller.ts:74`, socket handshake).
- Mẫu OTP: `OtpService.issue/verify(purpose, email, code)` (`otp.service.ts`) — purpose nằm trong HMAC; mẫu gửi OTP: `register.service.ts:142-148` (`mail.request` trong tx). Mẫu throttle: `@Throttle({ default: { limit, ttl } })`.
- `assertAllowedOrigin` đang dùng ở `refresh` và `logout`.

## APPLICABLE STANDARDS
[security](../standards/security/security.md) (CSRF, webhook, secret) · [auth-rbac](../standards/backend/auth-rbac.md) (OTP, phiên) · [socket-chat](../standards/realtime/socket-chat.md) (S-09 handshake không query DB) · [api-conventions](../standards/backend/api-conventions.md) · [testing](../standards/testing/testing.md)

## TASK
Đổi email (tên đăng nhập) chỉ có hiệu lực sau OTP gửi tới email mới; chặn huỷ liên kết SSO cuối khi TK chưa có mật khẩu. CSRF theo Origin không còn cho qua request thiếu Origin. Thêm giới hạn tốc độ cho logout, revoke-others và kết nối socket; cung cấp file mẫu allow IP webhook ngân hàng cho Nginx (không deploy).

## SPECIFICATIONS
### Business Rules
1. **Đổi email (BUG-030)**: `PATCH /me` không nhận `email` nữa (gửi `email` → 400 "Đổi email cần xác nhận OTP"). `POST /me/email/otp {newEmail}`: chuẩn hoá lowercase, khác email hiện tại, chưa thuộc TK khác (409 field `newEmail`) → `otp.issue('email-change:<userId>', newEmail)` + mail OTP tới **email mới** qua `mail.request` trong tx (kind `otp`) → 200 `{ email, expiresInSec }`. Throttle 5/15 phút.
2. `POST /me/email/verify {newEmail, code}`: `otp.verify('email-change:<userId>', newEmail, code)` (sai → 400, quá số lần → 429 theo OtpService) → trong một tx: `UPDATE users SET email = $new, email_verified_at = now() WHERE id = $id AND email = $old` (0 dòng → 409), cập nhật `auth_identities.email` của user, thu hồi mọi refresh token khác phiên hiện tại (reuse `SessionService.revokeOthers`) → 200 `Profile`. Gửi thông báo tới **email cũ** "Email đăng nhập đã đổi" (mail kind `otp` hoặc thêm `account` — chọn kind có sẵn `otp`, ghi câu hỏi).
3. **SSO cuối (BUG-030)**: `DELETE /me/sso/:provider` → nếu `passwordHash IS NULL` và đây là liên kết cuối (`count(auth_identities) <= 1`) → 409 "Đặt mật khẩu trước khi huỷ liên kết cuối cùng". Kiểm + xoá trong cùng tx (`DELETE … WHERE … AND (SELECT count(*) …) > 1 OR password_hash IS NOT NULL`). `profileSchema.hasPassword` cho FE disable nút.
4. **CSRF (BUG-031)**: `assertAllowedOrigin(req, env)`: có `Origin` → phải ∈ `CORS_ORIGINS`; không có `Origin` → lấy origin từ `Referer` (URL parse) phải ∈ whitelist; không có cả hai → 403 "Nguồn yêu cầu không hợp lệ". Trình duyệt luôn gửi Origin cho POST fetch nên không ảnh hưởng FE.
5. **Rate limit (TD-018)**: `POST /auth/logout` `@Throttle 20/60s`; `POST /auth/sessions/revoke-others` `@Throttle 5/60s`. Socket: `io.use` đầu tiên đếm `INCR socket:conn:ip:<ip>` (EX 60) và sau auth `socket:conn:u:<userId>` — vượt `SOCKET_CONNECT_PER_MIN` → `HandshakeError('RATE_LIMITED')`. IP lấy từ `x-real-ip` khi `TRUST_PROXY` (giống REST), không query DB (S-09).
6. **Webhook IP (BUG-032)**: chỉ file mẫu `opchub-bank-allow.conf.example` (comment "điền dải IP SePay công bố; thiếu thì giữ HMAC"), dòng `include` để comment trong `opchub-backend.conf`, README hướng dẫn bật. Không đổi hành vi server; `node infra/scripts/check-units.mjs` vẫn xanh.

### Validation / Error Handling
- zod schema mới trong `packages/shared`; lỗi field `newEmail`, `code` theo `api-conventions`.

### Data / Migration
- Không đổi schema (`users.email` citext UQ, `email_verified_at` có sẵn). Biến env mới: `SOCKET_CONNECT_PER_MIN` (zod + `.env.example` + `infra/env/server.env.example`).

## ACCEPTANCE CRITERIA
- Given TK đăng nhập, When `PATCH /me {email}`, Then 400, email không đổi (BUG-030, QT-01).
- Given OTP gửi tới `moi@x.vn`, When verify đúng mã, Then đăng nhập được bằng `moi@x.vn`, không bằng email cũ; phiên khác bị thu hồi (BUG-030).
- Given verify sai mã 5 lần, Then 429; `newEmail` đã thuộc TK khác → 409 (QT-01).
- Given TK SSO-only có 1 liên kết, When huỷ, Then 409; sau khi đặt mật khẩu → 200 (BUG-030, NA-17).
- Given `POST /auth/refresh` có cookie nhưng không `Origin`/`Referer`, Then 403; `Referer` thuộc whitelist → 200 (BUG-031).
- Given 21 lần logout/phút từ một IP, Then lần 21 → 429; 31 handshake socket/phút cùng IP → `connect_error RATE_LIMITED` (TD-018).
- `infra/nginx/snippets/opchub-bank-allow.conf.example` có `allow`/`deny all`; `check-units.mjs` pass (BUG-032).

## TESTS BẮT BUỘC
- `apps/server/test/account/profile.int.spec.ts`: `BUG-030 QT-01 đổi email cần OTP gửi tới email mới`, test âm `PATCH /me email → 400`, `OTP sai → 400, quá lần → 429`, `email trùng → 409`, `BUG-030 NA-17 chặn huỷ SSO cuối khi chưa có mật khẩu`.
- `apps/server/test/account/auth.int.spec.ts`: `BUG-031 refresh thiếu Origin và Referer → 403`, `BUG-031 Referer hợp lệ → 200`, `TD-018 logout vượt 20/phút → 429`.
- `apps/server/test/account/password.int.spec.ts`: `TD-018 revoke-others vượt 5/phút → 429`.
- `apps/server/test/socket/socket.int.spec.ts`: `TD-018 handshake vượt SOCKET_CONNECT_PER_MIN → RATE_LIMITED`.
- `e2e/behavior/profile.spec.ts`: `BUG-030 đổi email qua hộp OTP` (msw + server, OTP cố định dev), `BUG-030 nút huỷ SSO cuối bị khoá khi chưa có mật khẩu`.

## CONSTRAINTS
- DO NOT: gửi OTP đổi email tới email cũ; log mã OTP/email đầy đủ; query DB trong handshake socket; bật allow IP thật / deploy Nginx; đổi rate limit toàn cục 100/phút.
- REUSE: `OtpService` (purpose riêng), `MailService.request`, `SessionService.revokeOthers`, `OtpModal` (`packages/ui/src/auth/otp-modal.tsx`), `RedisService`.
- SKIP: đổi SĐT có OTP (không có trong đặc tả), xác thực MK trước khi liên kết SSO (REQ-010 — TEST-GAPS câu 1, do TIP-V2-105/202).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 12 (env mới có trong `.env.example` + zod), luật 2 (zod cho body mới), luật 6 (S-09 handshake không DB), luật 1 (`profile.service.ts` ≤ 400: tách `email-change.service.ts`).
- [ ] `api-contract.md` + `coverage.int.spec.ts` + `messages/vi/profile.json` chỉ thêm dòng, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; `node infra/scripts/check-units.mjs`; e2e msw + `e2e:server`.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-112-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-112-completion.md`.
