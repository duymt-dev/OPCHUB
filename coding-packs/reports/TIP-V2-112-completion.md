# TIP-V2-112: Gia cố bảo mật — đổi email có OTP, SSO cuối, CSRF Origin, mẫu allow IP webhook, rate limit (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-030 · BUG-031 · BUG-032 · TD-018 · QT-01 · NA-17 · §15.
> Không đổi schema, không migration. Biến env mới `SOCKET_CONNECT_PER_MIN` (zod + `apps/server/.env.example` +
> `infra/env/server.env.example`; `apps/server/.env` không sửa — mặc định 30). V2Q mới: V2Q-107 → V2Q-110.
> Commit: `d666abe` (server + shared: đổi email OTP, SSO cuối), `b6bdcdb` (CSRF, throttle, socket), `e1f2c6f` (infra),
> `1f33721` (Portal + MSW + e2e + V2Q) + commit báo cáo này.

## Đã làm
- **Đổi email (BUG-030, QT-01)**
  - Shared: `updateProfileSchema.email = z.never` → `PATCH /me {email}` 400, lỗi field `email` "Đổi email cần xác nhận
    OTP"; `emailChangeRequestSchema {newEmail}` (trim, lowercase), `emailChangeVerifySchema {newEmail, code}`;
    `profileSchema.hasPassword`; `PROFILE_MESSAGES.emailNeedsOtp|emailSame|emailTaken|lastSso`.
  - `services/email-change.service.ts` (mới): `POST /me/email/otp` → kiểm khác email hiện tại (400) + chưa thuộc TK
    khác (409 `newEmail`) → `OtpService.issue('email-change:<userId>', newEmail)` → `mail.request` (kind `otp`, mẫu
    `emailChangeMail`) trong tx tới **email mới** → 200 `{email, expiresInSec}`. Throttle 5/15 phút (+ 3 lần gửi/15
    phút/email của OtpService).
  - `POST /me/email/verify`: OTP sai → 422 `OTP_INVALID`, sai lần 5 trở đi → 429 (V2Q-109); một tx: `users.updateMany
    WHERE id AND email = <cũ>` (0 dòng / UQ → 409 `newEmail`) + `email_verified_at` + `auth_identities.email` + thư
    "Email đăng nhập đã đổi" tới email cũ (email mới dạng che, V2Q-107). Sau tx: thu hồi mọi chuỗi refresh
    (`SessionService.revokeOthers`) và cấp chuỗi mới cho thiết bị hiện tại qua Set-Cookie (V2Q-108) → 200 `Profile`.
  - `profile.service.update` bỏ nhánh email; `profile.mapper` thêm `hasPassword`, bỏ `email` khỏi patch.
  - Mẫu thư: `mail/templates-account.ts` (mới: `emailChangeMail`, `emailChangedMail`, `maskEmail`); `templates.ts` chỉ
    export thêm `layout`.
- **SSO cuối (BUG-030, NA-17)**: `ProfileRepository.unlink` = một câu `DELETE … WHERE user/provider AND (có
  password_hash OR còn liên kết khác)`; xoá 0 dòng mà liên kết còn → 409 "Đặt mật khẩu trước khi huỷ liên kết cuối
  cùng".
- **CSRF (BUG-031)**: `assertAllowedOrigin` — có `Origin` → thuộc `CORS_ORIGINS`; thiếu → origin của `Referer` (URL
  parse, chỉ http/https) thuộc whitelist; thiếu cả hai → 403 "Nguồn yêu cầu không hợp lệ" (refresh + logout).
- **Rate limit (TD-018)**: `@Throttle` logout 20/phút, `sessions/revoke-others` 5/phút (guard chung → tắt khi
  `RATE_LIMIT_DISABLED`). Socket: `socket/gateways/connect-rate.ts` (mới) — `io.use` đếm `INCR socket:conn:ip:<ip>`
  (EX 60, `x-real-ip` khi `TRUST_PROXY`) trước xác thực, `socket:conn:u:<id>` sau xác thực; vượt
  `SOCKET_CONNECT_PER_MIN` → `connect_error RATE_LIMITED`; `RATE_LIMIT_DISABLED=true` → bỏ qua (e2e server không bị
  chặn). Không query DB (S-09). Luồng `scope: 'membership'` (V2Q-92) giữ nguyên — tách thành `authenticate()` riêng.
- **Webhook IP (BUG-032)**: `infra/nginx/snippets/opchub-bank-allow.conf.example` (`allow` mẫu RFC 5737 + `deny all;`),
  dòng `# include …opchub-bank-allow.conf;` trong `location = /v1/webhooks/bank`, mục README + L3-14 GO-LIVE; comment
  `bank-webhook.controller.ts` đúng hiện trạng. Không đổi hành vi server.
- **Portal**: tab Thông tin — email chỉ đọc + nút "Đổi email" (`email-field.tsx`) → hộp nhập email mới (Modal
  packages/ui, lỗi hiện tại ô) → `OtpModal` gửi tới email mới (`email-change-modal.tsx`, `use-email-change.ts`); tab Bảo
  mật — TK chưa có mật khẩu: nút "Huỷ liên kết" của liên kết cuối disabled + gợi ý. `messages/vi/profile.json` chỉ thêm
  khoá. MSW: `/me/email/otp|verify` (OTP `MOCK_OTP`), chặn SSO cuối, cookie e2e `opchub-mock-sso-only`.
- Hợp đồng: `api-contract.md` 198 endpoint (+2), `coverage.int.spec.ts` 198, contract `account-me` gọi 2 endpoint mới.

## Test (số thật)
- `pnpm lint`: 8/8 task, 0 error (warning `<img>` có sẵn). `pnpm typecheck`: **8/8 xanh**. `pnpm depcheck`: no
  dependency violations (1173 + 574 modules). `node infra/scripts/check-units.mjs`: OK (25 tệp).
- `pnpm test`: server 92, shared 84, portal 113, admin 140, ui 35, integrations 25 + 2 skip — tất cả pass. Mới:
  `templates-account.spec` `BUG-030 OTP đổi email … email cũ chỉ chứa email mới đã che`; portal `model.spec`
  `… BUG-030 email không vào PATCH`.
- Int server (opchub_test): **345/345** (70 file). Mới: profile `BUG-030 QT-01 PATCH /me có email → 400…`, `BUG-030 QT-01
  đổi email cần OTP gửi tới email mới; đăng nhập bằng email mới, phiên khác bị thu hồi`, `BUG-030 OTP sai → 422
  OTP_INVALID, sai 5 lần → 429; mã của TK khác không dùng được`, `BUG-030 QT-01 email mới thuộc TK khác → 409…`,
  `BUG-030 NA-17 chặn huỷ SSO cuối khi chưa có mật khẩu; đặt mật khẩu xong → 200`; auth `BUG-031 refresh thiếu Origin
  và Referer → 403…`, `BUG-031 Referer hợp lệ (không Origin) → 200`, `TD-018 logout vượt 20/phút/IP → 429`; password
  `TD-018 revoke-others vượt 5/phút/IP → 429`; socket `TD-018 handshake vượt SOCKET_CONNECT_PER_MIN … RATE_LIMITED`;
  contract `BUG-030 đổi email…`. Test cũ `PATCH email trùng TK khác → 409` thay bằng test 400 (hành vi đổi theo TIP).
- e2e MSW (build riêng `.next-112`, Portal 3380 / Admin 3381 / proto 4870, `next start` bằng node, đã dừng đúng PID):
  **toàn bộ behavior 152/152**. Mới: profile `BUG-030 đổi email qua hộp OTP`, `BUG-030 nút huỷ SSO cuối bị khoá khi
  chưa có mật khẩu`. Bỏ bước "email sai → toast" ở test lưu thông tin (ô email đã chỉ đọc; kiểm định dạng chuyển vào
  hộp đổi email).
- **Parity: KHÔNG đo được** — P-89/P-90/P-93/P-94 và cả A-01 (màn TIP không đụng) đều timeout 120 s trong harness ở
  phiên này → lỗi môi trường harness, không do TIP. Thay đổi giao diện: tab Thông tin thêm nút "Đổi email" cạnh ô email
  (P-89/P-90 có thể lệch nhẹ — prototype cho sửa email trực tiếp); P-93/P-94 không đổi với TK có mật khẩu. Cần agent
  chính đo lại; file kết quả parity tái sinh đã hoàn tác, không commit.

## e2e server: CHƯA chạy
Theo brief không dựng/dừng api 4000 / socket 4001 / Next 3220/3222, không `seed:demo`. **Cần agent chính**: restart api +
socket (provider mới `EmailChangeService`, `ConnectRate`), rebuild Portal server, rồi `cd e2e && pnpm exec playwright
test -c playwright.server.config.ts behavior/profile.spec.ts behavior/auth-flows.spec.ts behavior/chat.spec.ts
behavior/membership.spec.ts`. Spec SSO cuối trên server: đăng nhập Google qua FakeSso (`sso.member@gmail.com`, TK mới
không mật khẩu) → `payFee` → `/profile?tab=security`. Đổi email trên server dùng `OTP_FIXED_CODE` (dev đặt 123456).
`.env` dev có `RATE_LIMIT_DISABLED=true` → giới hạn socket/logout không chặn e2e server.

## Acceptance criteria
- `PATCH /me {email}` → 400, email không đổi — ĐẠT (int).
- OTP tới email mới → verify đúng → đăng nhập bằng email mới, không bằng email cũ; phiên khác bị thu hồi — ĐẠT (int).
- Verify sai 5 lần → 429; `newEmail` thuộc TK khác → 409 — ĐẠT (int; lần 1–4 trả 422, V2Q-109).
- TK SSO-only 1 liên kết huỷ → 409; đặt mật khẩu xong → 200 — ĐẠT (int + e2e MSW cho nút khoá).
- Refresh có cookie, không Origin/Referer → 403; Referer whitelist → 200 — ĐẠT (int).
- 21 logout/phút cùng IP → lần 21 429; 31 handshake/phút cùng IP → `connect_error RATE_LIMITED` — ĐẠT (int).
- `opchub-bank-allow.conf.example` có `allow`/`deny all`; `check-units.mjs` pass — ĐẠT.
- e2e server — CHƯA (xem trên). Parity — CHƯA đo được (harness timeout).

## Ngoài phạm vi / ghi chú
- SKIP theo TIP: đổi SĐT có OTP; xác thực MK trước khi liên kết SSO (TIP-V2-105/202).
- Thiết bị khác sau đổi email: chỉ bị chặn khi access token (≤ 15 phút) hết hạn — không phát `session.revoked` socket vì
  không bump `perm_version` (V2Q-108). Nếu PM muốn đá ngay → TIP sau thêm reason `email_changed`.
- `RATE_LIMIT_DISABLED` cũng tắt giới hạn handshake socket (ghi trong env schema).
- `packages/db/seed/demo/{project,service}.ts` hiện `M` nhưng `git diff` rỗng (cache stat line ending) — bỏ qua.
