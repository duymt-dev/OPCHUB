# TIP-V2-301: Hạn phí, nhắc gia hạn T-30/T-7/T-0/T+3 lúc 08:00 (NA-04, D-57, NR-R03)

## HEADER
- TIP-ID: TIP-V2-301 · Project: OPCHUB · Module: membership-fee + mail + worker · Priority: P0 · Depends on: TIP-V2-101 (outbox tin cậy), TIP-V2-108 (guard phí so `valid_until` tức thời, BUG-018) · Estimated: M (8h)
- **Files touched:**
  - `packages/db/prisma/schema/membership-fee.prisma` (modify: thêm `model FeeReminder`) + back-relation trong `account.prisma` `model User` (modify, chỉ thêm 1 dòng)
  - `packages/db/prisma/migrations/<ts>_fee_reminders/migration.sql` — **migration do agent chính tạo, `--create-only` + review SQL**
  - `apps/server/src/worker/schedules.ts` (modify: `fee-status-daily` → 08:00, đổi comment)
  - `packages/shared/src/queues/queues.ts` (modify: comment `feeStatus` — payload giữ nguyên)
  - `apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts` (modify: sweep + chọn mốc nhắc)
  - `apps/server/src/modules/membership-fee/domain/fee-reminder.ts` (create) + `fee-reminder.spec.ts` (create)
  - `apps/server/src/modules/membership-fee/repositories/fee-reminder.repository.ts` (create)
  - `apps/server/src/modules/membership-fee/membership-fee-core.module.ts` (modify: đăng ký repository)
  - `apps/server/src/modules/membership-fee/services/admin-fees.service.ts` (modify: `remind` dùng mẫu mới + thông báo in-app)
  - `apps/server/src/modules/membership-fee/repositories/admin-fees.repository.ts` (modify: `needReminder` = pending | expiring | expired)
  - `apps/server/src/modules/mail/templates-fee.ts` (create) · `apps/server/src/modules/mail/index.ts` (modify: export)
  - `packages/shared/src/outbox/events.ts` (modify — chỉ thêm `membership_fee.reminded`)
  - `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: `feeReminded`) · `apps/server/src/worker/processors/notification.processor.ts` (modify: 1 dòng register)
  - `apps/server/src/worker/processors/fee.processor.ts` (modify: log số mail nhắc)
  - `apps/server/test/membership-fee/fee-reminders.int.spec.ts` (create) · `reconcile.int.spec.ts`, `membership.int.spec.ts`, `admin-fees.int.spec.ts` (modify: tên test gắn REQ)
  - `e2e/behavior/admin-fees.spec.ts` (modify: Gửi nhắc → toast + thông báo)
- **Parallel-safe with:** 302, 304, 305. `sequential, shares membership-fee/* with TIP-V2-108 (làm sau) và TIP-V2-401 (làm trước)`; `schedules.ts`, `queues.ts`, `worker-app.module.ts`, `outbox/events.ts`, `notification-events.handler.ts` chung với 303/305/306 → chỉ thêm dòng, giữ `.wire-lock`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §8.6 NA-04, §8.4 NA-02, §8.5 NA-03, §8.2 (job 08:00), §13 BR-03/BR-05, §12 (dòng "Nhắc phí"), §22.5 NR-R03. REQ-204 (thay REQ-030, ~~30/7/1 ngày~~), REQ-202, REQ-203, REQ-383. D-57.
- Hiện trạng: `SCHEDULES.fee-status-daily` chạy `5 0 * * *`; `FeeSchedulerService.sweep` chỉ đổi trạng thái (active → expiring → expired) + outbox `membership_fee.changed`; không có mail nhắc tự động (SPEC-V3-DELTA §4.1, mâu thuẫn #3). Nhắc tay `POST /admin/fees/remind|remind-all|:uid/remind` chỉ gửi mail `fee_reminder`, không có thông báo chuông (§12 yêu cầu ● ●).
- Mẫu: `AdminFeesService.remind` (mail qua `MailService.requestMany` trong tx), `NotificationEventsHandler.feeActivated`, `EXPIRING_DAYS` trong `domain/membership-fee.state.ts`.

## APPLICABLE STANDARDS
[queues-workers](../standards/backend/queues-workers.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) (outbox) · [query-indexing](../standards/database/query-indexing.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [testing](../standards/testing/testing.md)

## TASK
Dời job phí sang 08:00 giờ VN và gộp hai việc trong một lượt: cập nhật Sắp hết hạn / Hết hạn, rồi gửi mail + thông báo nhắc tại mốc T-30, T-7, T-0, T+3, mỗi mốc tối đa một lần cho mỗi kỳ phí của thành viên. Nhắc tay của Admin dùng cùng mẫu, có thêm thông báo chuông. Rà lại NA-02, NA-03, NR-R03 và gắn mã REQ vào test hiện có.

## SPECIFICATIONS
### Business Rules
1. **Lịch** (D-57): `repeat: { pattern: '0 8 * * *', tz: 'Asia/Ho_Chi_Minh' }`, giữ id `fee-status-daily` (upsert, không tạo lịch thứ hai).
2. **Trạng thái** (BR-05, NA-04 bước 2): giữ `sweepStatuses` (≤30 ngày → `expiring`, `valid_until ≤ now` → `expired`). Guard phí không chờ job (TIP-V2-108).
3. **Mốc nhắc** (`domain/fee-reminder.ts`, hàm thuần): `d = vnDay(valid_until) − vnDay(now)` theo lịch Asia/Ho_Chi_Minh. Mốc là `T-30` (d ≤ 30), `T-7` (d ≤ 7), `T-0` (d ≤ 0), `T+3` (d ≤ −3). Mỗi lượt chọn **mốc muộn nhất đã tới mà chưa gửi**, mốc cũ hơn bị bỏ qua. Nhờ vậy job lỡ một ngày vẫn bù được và không gửi dồn 2 mail. d < −3 − 7 (quá 10 ngày sau hạn) thì không nhắc tự động nữa.
4. **Mỗi mốc ≤ 1 lần**: bảng `fee_reminders (user_id, valid_until, milestone, sent_at)`, PK `(user_id, valid_until, milestone)`. Gia hạn làm `valid_until` đổi nên chu kỳ mới được nhắc lại. Ghi bằng `INSERT … SELECT … ON CONFLICT DO NOTHING RETURNING user_id`, chỉ ai vừa insert mới nhận mail (idempotent khi job chạy 2 lần hoặc 2 worker).
5. **Ứng viên**: một query `membership_fees` với `status IN ('active','expiring','expired') AND valid_until BETWEEN now − 10d AND now + 31d`, join `users` (email, full_name, `status='active'`, `deleted_at IS NULL`), có lô 500. TV `pending_payment` không có hạn nên không nhắc tự động (chỉ Admin nhắc tay).
6. **Gửi**: trong CÙNG transaction với insert `fee_reminders`, gọi `MailService.requestMany` (kind `fee_reminder`, mẫu `templates-fee.ts` theo mốc) + outbox `membership_fee.reminded { userIds, milestone }` → `NotificationEventsHandler.feeReminded` tạo thông báo type `membership`, link `/services` (popup phí). Không query trong vòng lặp.
7. **Câu chữ mẫu** (giữ biến tiền từ hằng 600.000đ, đúng D-58): T-30/T-7 "Phí thành viên OPC Hub của bạn sẽ hết hạn ngày dd/mm/yyyy"; T-0 "hết hạn hôm nay"; T+3 "đã hết hạn — gia hạn để tiếp tục sử dụng". Mail có câu NR-R01 "Phí 600.000đ/năm, không hoàn lại sau khi thanh toán".
8. **Nhắc tay** (NA-04 "Admin Gửi nhắc thủ công"): `remind` dùng mẫu theo trạng thái hiện tại, thêm thông báo in-app (§12). `needReminder` = `pending_payment | expiring | expired`. Nhắc tay **không** ghi `fee_reminders`, nên vẫn gửi được bất kỳ lúc nào. Quyền: khoá Thao tác của menu Phí thành viên (TIP-V2-201, VD `fees.action`), audit `fee.remind` giữ nguyên.
9. **Rà NA-02/NA-03/NR-R03**: không thêm chức năng mới. Chỉ thêm hoặc đổi tên test cho đúng REQ: Admin không chịu cổng phí, Quay lại chỉ lùi bước trong popup, idempotent theo mã giao dịch, thiếu tiền hoặc sai nội dung không kích hoạt, gia hạn sớm cộng dồn, 12 tháng kể từ khi xác nhận. Lệch phát hiện thêm → ghi báo cáo, không sửa lan (thuộc 108).

### Data / Migration
- `model FeeReminder { userId, validUntil Timestamptz, milestone String (CHECK IN ('T-30','T-7','T-0','T+3')), sentAt default now() }`, `@@id([userId, validUntil, milestone])`, FK users cascade. Migration do agent chính tạo, `--create-only` + review SQL. Index phục vụ ứng viên: partial `membership_fees (valid_until) WHERE status IN ('active','expiring','expired')` nếu EXPLAIN cho thấy seq scan.

### Error Handling
- Lỗi một lô → ném lại, BullMQ thử lại. PK đảm bảo không gửi trùng. Mail lỗi thì xử lý theo NA-05 (thử lại 1/5/15 phút).

## ACCEPTANCE CRITERIA
- Given TV active hạn còn 30 ngày (lịch VN), When job 08:00 chạy, Then status `expiring`, 1 `mail_logs` fee_reminder + 1 thông báo `membership`. Chạy lại cùng ngày thì không thêm (NA-04, REQ-204).
- Given hạn còn 7 ngày, đã nhận T-30, Then nhận đúng 1 mail T-7. Given job nghỉ 2 ngày (d nhảy từ 8 xuống 6), Then vẫn nhận T-7 đúng 1 lần (REQ-204).
- Given hạn = hôm nay, Then mail T-0. Given quá hạn 3 ngày, Then status `expired` + mail T+3. Given quá hạn 11 ngày, Then không mail (REQ-204).
- Given TV gia hạn (valid_until mới), When tới T-30 của kỳ mới, Then nhận lại T-30 (REQ-204, NR-R03).
- Given Admin bấm "Gửi nhắc" 2 lần, Then 2 mail + 2 thông báo, audit `fee.remind` (NA-04, §12).
- Given TV `pending_payment`, Then job không gửi; Admin "Gửi nhắc hàng loạt" có gửi (REQ-204).
- `SCHEDULES` có `fee-status-daily` với pattern `0 8 * * *` tz `Asia/Ho_Chi_Minh` (D-57).

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/membership-fee/domain/fee-reminder.spec.ts`: `REQ-204 chọn mốc muộn nhất chưa gửi`, `REQ-204 ranh giới ngày theo giờ VN (23:30 VN vs 00:30 VN)`, `REQ-204 quá 10 ngày không nhắc`.
- Int `apps/server/test/membership-fee/fee-reminders.int.spec.ts`: `REQ-204 T-30 gửi 1 lần + thông báo`, `REQ-204 bù mốc khi lỡ job`, `REQ-204 T-0 và T+3 kèm expired`, `REQ-204 gia hạn reset mốc`, `REQ-204 hai lượt song song không gửi trùng`, `REQ-204 nhắc tay có thông báo in-app`, test âm `REQ-204 pending_payment không nhắc tự động`.
- Đổi tên test hiện có: `reconcile.int.spec.ts` → `REQ-203 …` (idempotent, thiếu tiền, nối tiếp BR-05), `membership.int.spec.ts` → `REQ-202 …`, thêm `REQ-383 kỳ 12 tháng kể từ ngày xác nhận`.
- e2e `e2e/behavior/admin-fees.spec.ts`: `REQ-204 Gửi nhắc → toast "Đã gửi email nhắc thanh toán tới …"`, chạy msw + server, không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: gửi mail ngoài transaction ghi `fee_reminders`; query trong vòng lặp; tạo lịch job thứ hai; đổi trạng thái không qua `sweepStatuses` hoặc hàm transition.
- REUSE: `MailService.requestMany`, `vnDay` (`@/modules/mail`), `OutboxService.addMany`, `NotificationService.notify`.
- SKIP: guard `valid_until` + "Cần đối soát" (TIP-V2-108); hoàn phí (không có, D-54); Zalo ZNS.

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (đổi trạng thái có điều kiện), luật 8 (mail + outbox cùng tx), luật 9 (`timestamptz`, ngày theo giờ VN), luật 5 (không query trong vòng lặp).
- [ ] File dùng chung chỉ thêm dòng (`schedules.ts`, `outbox/events.ts`, `notification.processor.ts`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` (DB test) + `pnpm e2e` msw và server.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-301-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-301-completion.md`.
