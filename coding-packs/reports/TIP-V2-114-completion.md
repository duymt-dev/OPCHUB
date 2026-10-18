# TIP-V2-114: Marketing tuân thủ + hàng đợi email NA-05 (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-036 · NA-05 · REQ-205 · NĐ 13/2023 · RFC 8058.
> Migration `20261019050000_mail_priority_suppression` do agent chính tạo (`3a6381b`), đã áp opchub_dev + opchub_test.
> TIP không đổi schema. V2Q mới: V2Q-85 → V2Q-91.
> Commit: `f929e72` (mail/queue/env), `70d2165` (marketing server + contract), `a808fbb` (Portal huỷ nhận + mock + e2e),
> `eb6771f` (Admin Dừng gửi + nhật ký) + commit báo cáo này.

## Đã làm
- **NA-05 ưu tiên**: `mail-priority.ts` (otp/password_reset 1; welcome/fee_reminder/event 3; test 4; campaign 5).
  `MailRepository.create/createMany` ghi `priority`; outbox `mail.requested` mang `priority` (schema thêm trường
  optional); `MailProcessor` đặt `priority` BullMQ (sự kiện cũ không có → 3). Lô chiến dịch (`campaignBatch`)
  priority 5, concurrency giữ 1.
- **Hạn mức**: `DailyQuota.take(limit, now, { priority, reserve })` — thư thường chỉ tới `limit - MAIL_OTP_RESERVE`,
  OTP tới `limit`. Vượt: chiến dịch → `vnDay().nextMorning` (08:00 VN ngày sau), còn lại nửa đêm VN (OTP vượt cả
  `limit` → log warn). `mail_logs.next_attempt_at` ghi mốc; không tính lần thử.
- **Thử lại 1/5/15 phút**: `MAIL_RETRY_DELAYS_MS`, `MAIL_ATTEMPTS = 4` (shared/queues); `common/queue/backoff.ts`
  backoff tuỳ biến `mail`, `WorkerFactory` gắn `settings.backoffStrategy` theo queue; `DEFAULT_OPTS.mail =
  { attempts: 4, backoff: { type: 'mail' } }`. `recordAttempt` +1 lần thử, `error` ≤ 500, `next_attempt_at`; lần cuối
  `failed`. Thư lỗi KHÔNG phải OTP/đặt lại MK giữ `body_html` để Admin gửi lại (V2Q-88).
- **BUG-036 link huỷ nhận**: `UnsubscribeToken` (mail module) ký `base64url(email).HMAC_SHA256(secret,'unsub|'+email)`,
  kiểm `timingSafeEqual`. Chân thư chiến dịch "Không muốn nhận email này? Huỷ đăng ký" → `${PORTAL_URL}/unsubscribe?token=`;
  header `List-Unsubscribe: <${PORTAL_URL}/v1/public/unsubscribe?token=>` + `List-Unsubscribe-Post` qua
  `MailMessage.headers` (types/smtp/fake). Chỉ thư `campaign` có header.
- **Suppression**: `AudienceRepository.batch/estimate` thêm `NOT EXISTS (mail_suppressions)`; worker kiểm lại trước khi
  gửi thư `campaign` đã xếp hàng → `cancelled` (V2Q-87). Thư giao dịch không bị chặn.
- **Endpoint công khai** `GET/POST /public/unsubscribe` (`@Public`, throttle 10/phút): GET → `{email}` che
  (`maskEmail`), POST → `INSERT … ON CONFLICT DO NOTHING`, 200 idempotent; nhận token ở body hoặc query (one-click,
  V2Q-85). Token sai → 400 "Liên kết huỷ đăng ký không hợp lệ".
- **Dừng chiến dịch** `POST /admin/campaigns/:id/cancel` (`n.edit`): một tx `UPDATE … WHERE status IN
  (sending, scheduled)` → `cancelled`, `cancelled_at/by`, `send_cursor=NULL`; thư `queued` → `cancelled`
  (`body_html=NULL`, không xoá dòng); `recipients` = số thư `sent`; audit `campaign.cancel` (tag content). 0 dòng → 409
  "Chiến dịch đã gửi xong hoặc đã dừng" / 404. `runBatch` không thấy `sending` → không xếp lô sau.
- **Nhật ký** `GET /admin/mail/log`: mọi kind + trạng thái, `attempts`, `error`; deferred join theo
  `(created_at DESC, id)` (index `mail_logs_log_keyset`), giữ phân trang số (V2Q-89). Gửi lại: `sent` welcome/campaign
  hoặc `failed` mọi kind trừ otp/password_reset (`canResendMail` dùng chung FE/mock).
- **Shared**: `CAMPAIGN_STATUS` + `cancelled`; `mailLogRowSchema` mở rộng kind/status/attempts/error;
  `unsubscribeSchema` (regex TIP), `unsubscribeInfoSchema`, `unsubscribeResultSchema`, `maskEmail`, `canResendMail`.
- **Env**: `UNSUBSCRIBE_SECRET` (≥ 32, bắt buộc production — `parseEnv` chặn), `MAIL_OTP_RESERVE` (mặc định 20) trong
  zod + `apps/server/.env.example` + `infra/env/server.env.example`. Dev/test trống → suy từ JWT_SECRET (V2Q-86).
- **Portal**: `/unsubscribe` (`(public)`, không AuthGate) — `UnsubscribeScreen` trong `AuthFrame`: email che, nút
  "Xác nhận huỷ đăng ký", kết quả "Bạn sẽ không nhận email chiến dịch từ OPC Hub nữa"; token sai/thiếu → alert lỗi.
  `auth.json` thêm khoá `unsubscribe.*`; `auth/index.ts` thêm 1 export.
- **Admin**: nút "Dừng gửi" (dòng `sending|scheduled`) + hộp xác nhận đỏ; nhãn "Đã dừng" (tone red); nhật ký: nhãn loại
  thư mới, trạng thái Đang chờ / ✓ Đã gửi / Lỗi / Đã huỷ, "N lần thử", "Lỗi gần nhất"; "Xem" chỉ welcome/campaign.
- **MSW**: Admin `POST /admin/campaigns/:id/cancel` (`cancelCampaign` mock); Portal `/public/unsubscribe`
  (`mock-data/domains/unsubscribe.ts`, HMAC Web Crypto với secret giả công khai).
- **Hợp đồng**: `api-contract.md` 193 → 196 (marketing 9 → 12), `coverage.int.spec.ts` + harness đổi tổng.

## Test (số thật)
- `pnpm lint` 8/8 task (0 error; 12 warning `<img>` có sẵn); `pnpm typecheck` 8/8; `pnpm depcheck`: no dependency
  violations (560 modules); e2e `tsc` + eslint sạch.
- `pnpm test`: server 78/78, shared 80, portal 110, admin 138,
  ui 30, integrations 25 + 2 skip — tất cả pass. Mới: `env.schema.spec` (`BUG-036 NA-05 UNSUBSCRIBE_SECRET…`),
  `personalize.spec` (`BUG-036 chân thư có link huỷ đăng ký`), shared `unsubscribe.spec.ts` (4 ca BUG-036/REQ-205),
  admin `marketing-handlers.spec` (`BUG-036 dừng gửi…`), portal `unsubscribe-handlers.spec.ts`.
- Int server (opchub_test): **311/311** (70 file). Mới/sửa:
  - `marketing/unsubscribe.int.spec.ts`: `BUG-036 link huỷ đăng ký trong thư chiến dịch + List-Unsubscribe`,
    `BUG-036 huỷ nhận → không nhận chiến dịch sau, vẫn nhận OTP; ước tính giảm 1`, `…đã xếp hàng trước khi huỷ nhận →
    cancelled`, `BUG-036 token giả / sửa 1 ký tự → 400`, `BUG-036 POST 2 lần → 200…, 1 dòng; one-click qua query`.
  - `marketing/campaigns.int.spec.ts`: `BUG-036 dừng chiến dịch đang gửi: thư chờ bị huỷ, không xếp lô sau` (1.200
    người, lô 500, 10 thư đã gửi → recipients 10, 490 cancelled, lô 2 không xếp, gọi lại 409, audit), `BUG-036 dừng
    chiến dịch đã gửi → 409; nháp → 409; 404; thành viên 403`, `…đã lên lịch → scheduler không gửi`; ca nhật ký cũ đổi
    thành `REQ-205 NA-05 nhật ký thư mọi loại + trạng thái…` (OTP lỗi hiện trong nhật ký, gửi lại → 404).
  - `mail/mail-priority.int.spec.ts`: `REQ-205 NA-05 mail_logs.priority + outbox mang priority`, `REQ-205 NA-05 OTP ưu
    tiên khi chạm hạn mức (reserve)` (limit 100, đã 80 → nhắc phí dời, OTP gửi), `REQ-205 chiến dịch vượt hạn mức dời
    08:00 VN ngày sau` (= 01:00Z, attempts 0), `REQ-205 thử lại 1/5/15 phút rồi failed` (truyền `now`, 4 lần, mốc
    60/300/900 s, `failed` + error).
  - `mail/mail-worker.int.spec.ts`: `REQ-205 nhật ký ghi attempts + error; Admin thấy "Lỗi", gửi lại được`; 2 ca cũ
    sửa assertion theo hành vi mới (outbox có `priority`; thư thường lỗi giữ nội dung).
  - `contract/marketing.int.spec.ts`: `BUG-036 dừng chiến dịch + huỷ nhận công khai` (3 endpoint mới); coverage 196.
- e2e MSW (build riêng `.next-server-114`, Portal 3340 / Admin 3341 / proto 4830): spec liên quan (admin-marketing,
  unsubscribe, auth-flows) 22/22. **Toàn bộ behavior: 140 passed, 1 failed** — `auth-flows › UAT-11 … đăng nhập bằng
  mật khẩu mới` timeout ở bước bấm "Đăng nhập" khi chạy song song; chạy riêng `auth-flows.spec.ts --repeat-each=2`:
  26/26 pass (spec không đụng phần TIP sửa → flaky khi tải cao). Mới: `admin-marketing` `BUG-036 Dừng gửi chiến dịch
  đang gửi` (dùng chiến dịch seed "Bản tin tháng 10" đã lên lịch cho cả MSW/server — chiến dịch "Gửi ngay" trên server
  có thể đã gửi xong trước khi bấm); `unsubscribe.spec.ts` `BUG-036 trang huỷ đăng ký công khai`, `BUG-036 link bị sửa
  / thiếu token`. Không nhánh `onServer`.
- Parity: không có kịch bản parity cho màn Marketing / trang huỷ nhận (không chạy).

## e2e server: CHƯA chạy
Theo brief, không dựng/dừng api 4000 / Next 3220/3222, không `seed:demo` opchub_dev. **Cần agent chính**:
1. Thêm `UNSUBSCRIBE_SECRET=<≥ 32 ký tự>` vào `apps/server/.env` (không bắt buộc ở dev — trống thì suy từ JWT_SECRET;
   nhưng e2e server cần CÙNG giá trị trong env của Playwright `UNSUBSCRIBE_SECRET` để ký token, nên nên đặt rõ).
2. Restart api + worker (code mới: backoff tuỳ biến cần Worker dựng lại), rebuild Portal + Admin chế độ server.
3. `UNSUBSCRIBE_SECRET=<cùng giá trị> pnpm exec playwright test -c playwright.server.config.ts
   behavior/admin-marketing.spec.ts behavior/unsubscribe.spec.ts`.

## Ngoài phạm vi / ghi chú
- SKIP theo TIP: tỉ lệ mở/nhấp, tạm dừng–tiếp tục, màn quản lý suppression (V2Q-91).
- Job BullMQ đang chờ trong Redis dev tạo trước TIP vẫn mang `backoff exponential` cũ (chỉ job mới dùng 1/5/15).
- `apps/portal/src/lib/session-revoked.ts` hiện `M` trong `git status` nhưng không có diff nội dung (chỉ stat/EOL) và
  không do TIP này sửa — không commit, để agent chính xử lý.
- Tiến trình đã tạo và đã dừng: `next start` 3340 (PID 12352), 3341 (25476), serve proto 4830 (27864); các cổng đã
  trống. Build `apps/*/.next-server-114` nằm trong `.gitignore`.
