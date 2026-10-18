# TIP-V2-114: Marketing tuân thủ (huỷ nhận mail, huỷ chiến dịch đang gửi) + hàng đợi email NA-05

## HEADER
- TIP-ID: TIP-V2-114 · Project: OPCHUB · Module: marketing, mail, worker, portal (trang công khai) · Priority: P1 · Depends on: TIP-V2-101 (outbox tin cậy — consumer `mail.requested` không mất sự kiện) · Estimated: L (12h)
- **Files touched:**
  - `packages/db/prisma/schema/marketing.prisma` (modify: `CampaignStatus` thêm `cancelled`; `Campaign.cancelledAt`, `cancelledBy`; model `MailSuppression`) · `packages/db/prisma/schema/mail.prisma` (modify: `MailStatus` thêm `cancelled`, `MailLog.priority Int @default(5)`, `nextAttemptAt`) + migration (**agent chính tạo, `--create-only` + review SQL**)
  - `packages/shared/src/api-domains/marketing.ts` (modify: `CAMPAIGN_STATUS` thêm `cancelled`; `mailLogRowSchema` mở rộng `status queued|sent|failed|cancelled`, `kind` thêm `otp|password_reset|fee_reminder|event`, `attempts`, `error`; schema `unsubscribeSchema {token}`)
  - `apps/server/src/modules/marketing/services/campaign.service.ts` (modify: `cancel()`) · `controllers/campaigns.controller.ts` (modify: `POST /admin/campaigns/:id/cancel`) · `services/campaign-sender.service.ts` (modify: chèn link huỷ nhận + header `List-Unsubscribe`, dừng khi `cancelled`) · `repositories/audience.repository.ts` (modify: loại email trong `mail_suppressions` ở `batch` + `estimate`)
  - `apps/server/src/modules/marketing/services/unsubscribe.service.ts` (create: ký/kiểm token HMAC, ghi suppression) · `controllers/unsubscribe.controller.ts` (create: `@Public() GET /public/unsubscribe?token=` trả `{email masked}` + `POST /public/unsubscribe`) · `marketing.module.ts` (đăng ký)
  - `apps/server/src/modules/marketing/services/mail-log.service.ts` (modify: nhật ký mọi loại thư + trạng thái + lần thử; `resend` cho `failed`)
  - `apps/server/src/modules/mail/mail.repository.ts`, `mail-sender.service.ts`, `mail.service.ts`, `daily-quota.ts` (modify: ưu tiên theo kind, hạn mức dành chỗ cho OTP, bỏ thư `cancelled`) · `packages/integrations/src/mail/types.ts`, `smtp.provider.ts`, `fake.provider.ts` (modify: `headers?: Record<string,string>`)
  - `apps/server/src/worker/processors/mail.processor.ts` (modify: `priority` BullMQ theo kind, backoff 1/5/15 phút, deferred chiến dịch sang ngày sau)
  - `apps/server/src/common/queue/queue.service.ts` (modify `DEFAULT_OPTS.mail`: `attempts: 4`, backoff custom) · `apps/server/src/common/queue/worker.factory.ts` (modify: hỗ trợ `settings.backoffStrategy`)
  - `apps/server/src/common/config/env.schema.ts` + `apps/server/.env.example` + `infra/env/server.env.example` (modify: `UNSUBSCRIBE_SECRET`, `MAIL_OTP_RESERVE` mặc định 20)
  - `apps/portal/src/app/(public)/unsubscribe/page.tsx` (create) · `apps/portal/src/features/auth/components/unsubscribe-screen.tsx` (create — trang công khai cùng khung auth) · `apps/portal/src/features/auth/index.ts` (thêm 1 export) · `apps/portal/messages/vi/auth.json` (thêm khoá)
  - `apps/admin/src/features/marketing/{api.ts,hooks/use-marketing-actions.ts,components/campaign-table.tsx,components/mail-log.tsx}` (modify: nút "Dừng gửi", cột trạng thái/lần thử nhật ký) · `apps/admin/messages/vi/marketing.json` (thêm khoá)
  - MSW: `packages/shared/src/mock-data/domains/marketing.ts`, `apps/admin/src/mocks/handlers/marketing.ts` (modify); `apps/portal/src/mocks/handlers/account.ts` (thêm `/public/unsubscribe`)
  - `coding-packs/plans/api-contract.md` + `apps/server/test/contract/coverage.int.spec.ts` (thêm 3 endpoint, đổi tổng) · `apps/server/test/contract/marketing.int.spec.ts` (modify)
  - Test: `apps/server/test/marketing/campaigns.int.spec.ts`, `apps/server/test/mail/mail-worker.int.spec.ts` (modify); `apps/server/test/marketing/unsubscribe.int.spec.ts`, `apps/server/test/mail/mail-priority.int.spec.ts` (create); `e2e/behavior/admin-marketing.spec.ts` (modify), `e2e/behavior/unsubscribe.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-102, 103, 104, 106, 107, 108, 109, 110, 111, 113. `sequential, shares mail.processor.ts + queue.service.ts + worker.factory.ts with TIP-V2-101` (101 trước) · `mail/*` + `env.schema.ts` + `api-contract.md` + `coverage.int.spec.ts` có thể đụng TIP-V2-105/112 (chỉ thêm dòng, rebase) · `campaign-sender.service.ts` có thể đụng TIP-V2-103 (sanitize body).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả: §8.7 NA-05 (còn hạn mức/ngày? → gửi SMTP; lỗi → thử lại 3 lần 1/5/15 phút; ghi email_log; "Vượt hạn mức Brevo → email ưu tiên (OTP) gửi trước, chiến dịch dời sang ngày sau"), lịch tác vụ nền "Thử lại email lỗi 1/5/15 phút", QT-13, NĐ 13/2023 (rút lại đồng ý), §15. REQ-205.
- Audit W1: BUG-036 (CR-17, Q-G6b-5: không huỷ được khi đang gửi, không có link huỷ đăng ký). TEST-GAPS §4 #2 #3 (estimate marketing — xử lý ở TIP-V2-115).
- Hiện: `DailyQuota.take` đếm chung mọi loại thư; vượt → mọi thư dời tới nửa đêm VN (`mail.processor.ts`); retry BullMQ `attempts 5, exponential 5s` (`queue.service.ts:12`); nhật ký Admin chỉ `welcome|campaign` đã `sent` (`mail-log.service.ts`). `DELETE /admin/campaigns/:id` chặn khi `sending`.
- Mẫu: chuyển trạng thái có điều kiện `campaign.service.ts:95-100`; trang công khai Portal `apps/portal/src/app/(public)/forgot-password/page.tsx`; HMAC `OtpService.digest`.

## APPLICABLE STANDARDS
[queues-workers](../standards/backend/queues-workers.md) · [adapters](../standards/integrations/adapters.md) (mail) · [security](../standards/security/security.md) (token, dữ liệu cá nhân) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [testing](../standards/testing/testing.md)

## TASK
Chiến dịch marketing có link + header huỷ nhận mail; người đã huỷ không nhận chiến dịch sau; Admin dừng được chiến dịch đang gửi (thư chưa gửi bị huỷ). Hàng đợi email theo NA-05: OTP/đặt lại MK ưu tiên, có phần hạn mức dành riêng; khi hết hạn mức chiến dịch dời sang ngày sau; lỗi thử lại 3 lần 1/5/15 phút; nhật ký đủ mọi loại thư.

## SPECIFICATIONS
### Business Rules — BUG-036
1. **Link huỷ nhận**: mỗi thư chiến dịch có chân trang "Không muốn nhận email này? Huỷ đăng ký" → `${PORTAL_URL}/unsubscribe?token=<t>`; `t = base64url(email) + '.' + HMAC_SHA256(UNSUBSCRIBE_SECRET, 'unsub|' + email)` (không hết hạn, không lưu DB). Header `List-Unsubscribe: <url>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058) truyền qua `MailMessage.headers`.
2. `GET /public/unsubscribe?token=` → `{ email: "an***@mediasoft.vn" }` (token sai → 400); `POST /public/unsubscribe {token}` → `INSERT mail_suppressions (email citext PK, reason 'unsubscribe', created_at) ON CONFLICT DO NOTHING` → 200 (idempotent). Throttle 10/phút. Trang Portal `/unsubscribe` (không cần đăng nhập): hiện email che, nút "Xác nhận huỷ đăng ký", kết quả "Bạn sẽ không nhận email chiến dịch từ OPC Hub nữa".
3. Suppression **chỉ** chặn thư `campaign`; OTP, đặt lại MK, nhắc phí, sự kiện vẫn gửi (thư giao dịch). `AudienceRepository.batch/estimate` loại email có trong `mail_suppressions` (`NOT EXISTS`, PK citext).
4. **Dừng chiến dịch**: `POST /admin/campaigns/:id/cancel` (`n.edit`) → một tx: `UPDATE campaigns SET status='cancelled', cancelled_at, cancelled_by, send_cursor=NULL WHERE id AND status IN ('sending','scheduled')` (0 dòng → 409 "Chiến dịch đã gửi xong hoặc đã dừng"); `UPDATE mail_logs SET status='cancelled', body_html=NULL WHERE campaign_id=$id AND status='queued'`; `recipients` = số thư đã `sent`; audit `campaign.cancel`. `runBatch` đã có `WHERE status='sending'` → tự dừng; `MailSenderService.send` bỏ qua thư không còn `queued` (đã có). FE: nút "Dừng gửi" ở dòng `sending|scheduled`, hộp xác nhận; nhãn trạng thái "Đã dừng".
### Business Rules — NA-05 (REQ-205)
5. **Ưu tiên**: `mail_logs.priority` theo kind: `otp`, `password_reset` = 1; `welcome`, `fee_reminder`, `event` = 3; `test` = 4; `campaign` = 5. Processor đặt `priority` BullMQ tương ứng (số nhỏ chạy trước); job chiến dịch chạy với concurrency thấp hơn (giữ 1).
6. **Hạn mức** (`dailyLimit` của SMTP, Brevo): `DailyQuota.take(limit, kind)`: thư priority > 1 chỉ dùng tới `limit - MAIL_OTP_RESERVE`; OTP/đặt lại MK dùng tới `limit`; vượt cả `limit` → OTP vẫn dời tới nửa đêm (giữ hành vi cũ) và log cảnh báo. Thư `campaign` vượt hạn mức → dời tới **08:00 giờ VN ngày sau** (`nextAttemptAt`), không tính lần thử.
7. **Thử lại 1/5/15 phút**: `attempts: 4` (1 lần đầu + 3 lần thử), backoff custom `[60_000, 300_000, 900_000]`; hết → `mail_logs.status='failed'`, `error` (≤500). `recordAttempt` giữ `attempts`, `error`.
8. **Nhật ký** `GET /admin/mail/log`: mọi kind, cột trạng thái (Đang chờ / Đã gửi / Lỗi / Đã huỷ), số lần thử, lỗi gần nhất; phân trang keyset `(created_at DESC, id)` (index `mail_logs (kind, created_at DESC)` có sẵn; thêm `(created_at DESC, id)` nếu EXPLAIN cần). Gửi lại cho phép `sent` (welcome/campaign) **và** `failed` (mọi kind trừ `otp`, `password_reset` — mã đã hết hạn).

### Validation / Error Handling
- Token zod `^[A-Za-z0-9_-]+\.[A-Fa-f0-9]{64}$`, so HMAC `timingSafeEqual`. Lỗi 400 "Liên kết huỷ đăng ký không hợp lệ".

### Data / Migration
- Enum `campaign_status` + `cancelled`; `mail_status` + `cancelled`; cột `campaigns.cancelled_at timestamptz`, `cancelled_by text`; `mail_logs.priority smallint NOT NULL DEFAULT 5`, `next_attempt_at timestamptz`; bảng `mail_suppressions(email citext PK, reason text, created_at timestamptz)`. Backfill `priority` theo kind. Migration do agent chính tạo, `--create-only` + review SQL.
- Env mới: `UNSUBSCRIBE_SECRET` (≥32 ký tự, bắt buộc production), `MAIL_OTP_RESERVE` (int, mặc định 20).

## ACCEPTANCE CRITERIA
- Given chiến dịch gửi tới A, Then thư có link `/unsubscribe?token=` và header `List-Unsubscribe` (FakeMail ghi lại) (BUG-036, NĐ 13).
- Given A bấm link → xác nhận, When gửi chiến dịch mới cho "Tất cả", Then A không có `mail_logs` campaign; A vẫn nhận OTP/nhắc phí; ước tính giảm 1 (BUG-036).
- Given chiến dịch 1.200 người đang gửi (lô 500), When Admin "Dừng gửi" sau lô 1, Then status `cancelled`, thư `queued` → `cancelled`, không xếp lô 2; gọi lại → 409; audit `campaign.cancel` (BUG-036).
- Given `dailyLimit = 100`, reserve 20, đã gửi 80 thư thường, When có 1 thư campaign + 1 OTP, Then OTP gửi ngay, campaign dời 08:00 VN hôm sau (NA-05, REQ-205).
- Given adapter lỗi liên tục, Then 4 lần gửi cách 1/5/15 phút (fake timer), `failed` + `error`; Admin thấy dòng "Lỗi", gửi lại được (NA-05).
- Given token sửa 1 ký tự, Then 400; POST 2 lần → 200 cả hai, 1 dòng suppression.

## TESTS BẮT BUỘC
- `apps/server/test/marketing/unsubscribe.int.spec.ts`: `BUG-036 link huỷ đăng ký trong thư chiến dịch + List-Unsubscribe`, `BUG-036 huỷ nhận → không nhận chiến dịch sau, vẫn nhận OTP`, test âm `token giả → 400`, `idempotent`.
- `apps/server/test/marketing/campaigns.int.spec.ts`: `BUG-036 dừng chiến dịch đang gửi: thư chờ bị huỷ, không xếp lô sau`, test âm `dừng chiến dịch đã gửi → 409`, `thành viên 403`.
- `apps/server/test/mail/mail-priority.int.spec.ts`: `REQ-205 NA-05 OTP ưu tiên khi chạm hạn mức (reserve)`, `REQ-205 chiến dịch vượt hạn mức dời 08:00 VN ngày sau`, `REQ-205 thử lại 1/5/15 phút rồi failed` (truyền `now`/fake timer, không phụ thuộc giờ thật).
- `apps/server/test/mail/mail-worker.int.spec.ts`: `REQ-205 nhật ký ghi attempts + error`.
- `e2e/behavior/admin-marketing.spec.ts`: `BUG-036 Dừng gửi chiến dịch đang gửi` (msw + server cùng assertion); `e2e/behavior/unsubscribe.spec.ts`: `BUG-036 trang huỷ đăng ký công khai` (lấy token từ API test-only/ký bằng secret test).

## CONSTRAINTS
- DO NOT: chặn thư giao dịch bằng suppression; lưu token/email thô trong log; gửi mail trong transaction; xoá `mail_logs` khi dừng chiến dịch; đổi lịch `campaignsDue`.
- REUSE: `MailService.request/requestMany`, `DailyQuota`, `vnDay`, `AuditService`, khung trang công khai `AuthLayout` (`packages/ui/src/auth`).
- SKIP: tỉ lệ mở/nhấp (Q-G6b-4, webhook Brevo), tạm dừng–tiếp tục chiến dịch (chỉ dừng hẳn), quản lý danh sách suppression trong Admin (ghi câu hỏi).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (đổi trạng thái chiến dịch/thư có điều kiện), luật 8 (hiệu ứng phụ qua outbox), luật 10 (audit dừng chiến dịch), luật 11 (mail qua adapter, FakeMail cho test), luật 12 (env mới trong `.env.example` + zod), luật 9 (giờ VN cho mốc 08:00).
- [ ] `api-contract.md`, `coverage.int.spec.ts`, `messages/vi/*.json`, `auth/index.ts` chỉ thêm dòng, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; e2e msw + `e2e:server`.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-114-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-114-completion.md`.
