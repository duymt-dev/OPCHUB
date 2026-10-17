# TIP-B14: Phí thành viên — `/me/membership`, transfer-confirm, webhook ngân hàng, đối soát, scheduler

## HEADER
- TIP-ID: TIP-B14 · Module: membership-fee · Priority: P0 · Depends on: TIP-B07, TIP-B10, TIP-B03 · Estimated: L (14h)
- **Files touched:**
  - `apps/server/src/modules/membership-fee/` → chuyển sang cấu trúc thư mục: `controllers/{me-membership,bank-webhook,dev-bank}.controller.ts`,
    `services/{membership-fee,reconcile,fee-scheduler}.service.ts`, `repositories/{membership-fee,payment-transaction,fee-period}.repository.ts`,
    `domain/{membership-fee.state.ts,fee-period.ts,fee-period.spec.ts,membership-fee.state.spec.ts}`, `membership-fee.module.ts`, `index.ts` (create/modify)
  - `apps/server/src/common/idempotency/{idempotency.service.ts,idempotency.interceptor.ts,index.ts}` (create)
  - `apps/server/src/worker/processors/{reconcile.processor.ts,scheduler.processor.ts}`, `worker/schedules.ts`, `worker/worker-app.module.ts` (create/modify)
  - `apps/server/src/socket/...` không đụng (emit `membership.updated` qua Redis pub ở B22)
  - `apps/server/test/membership-fee/*.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B11, TIP-B12, TIP-B13 (khác module). Sequential with B15.

## CONTEXT
- Hợp đồng `myMembershipSchema`, `transferConfirmResponseSchema` (202), BR-03 → BR-05, D-31 (kích hoạt khi webhook về), D-41 (đối soát theo Mã TV,
  thu tay bắt buộc lý do). MSW `account.ts`, `membership.ts`, `membership-flow.ts`, `ops-admin.ts`.
- Ngưỡng `expiring` = còn ≤ 30 ngày (`admin.ts` EXPIRING_MS). Phí 600.000đ (amount trong bảng). Bank info `FEE_BANK` (extras.ts) → env/app_settings.

## TASK
State machine phí, kỳ phí BR-05 (nối tiếp `max(valid_until, now)` + 12 tháng), webhook HMAC → lưu giao dịch idempotent → khớp Mã TV + đủ tiền →
kích hoạt trong transaction + outbox `membership_fee.activated` → Redis `auth:fee` + `membership.updated`. Quét bù 2' (`listSince`). Scheduler hằng ngày
`active→expiring→expired`. `POST /dev/bank/simulate` (chỉ non-production) đẩy giao dịch giả vào FakeBank + chạy đối soát.

## SPECIFICATIONS
1. `TRANSITIONS`: `pending_payment→active`, `active→expiring|active(gia hạn)`, `expiring→active|expired`, `expired→active`. Cập nhật có điều kiện.
2. Webhook: raw body, HMAC → 401 nếu sai; `INSERT … ON CONFLICT (provider, bank_txn_id) DO NOTHING`; enqueue `reconcile.match`.
3. Khớp: `extractMemberCode` → user; số tiền ≥ phí → kích hoạt + kỳ `transfer`; thiếu tiền / không mã / không thấy user → `unmatched` (Admin xử lý B15).
   Một giao dịch chỉ khớp 1 lần (`match_status` có điều kiện). Webhook + poll cùng giao dịch → 1 kỳ phí.
4. `transfer-confirm`: header `Idempotency-Key` bắt buộc (Redis 24h theo user+key, trả lại kết quả cũ); chỉ ghi nhận, trả 202 `{status, awaitingWebhook:true}`.
5. `GET /me/membership`: `transferContent = "OPCHUB {Mã TV} {SĐT nội địa}"`, `bank` từ env.
6. Scheduler (worker, 00:05 Asia/Ho_Chi_Minh): `UPDATE … WHERE status IN (...) AND valid_until …` dùng `membership_fees_due`; mỗi đổi trạng thái → outbox `membership_fee.changed`.
7. Handler outbox `membership_fee.*` → `AuthState.setFee` + publish `membership.updated` (kênh Redis `socket:user:{id}` — B22 tiêu thụ).

## ACCEPTANCE CRITERIA
- Webhook chữ ký sai → 401; đúng → 200; gửi lại cùng giao dịch → không tạo kỳ thứ 2.
- Nội dung `opchub tv000123 0912…` + 600000 → phí `active`, `valid_until = now+12 tháng`; đang active còn 100 ngày → nối tiếp.
- Thiếu tiền → `unmatched`, phí không đổi. Poll + webhook cùng `bank_txn_id` → 1 kỳ.
- `transfer-confirm` thiếu Idempotency-Key → 400; cùng key 2 lần → cùng kết quả.
- Scheduler: còn 20 ngày → `expiring`; quá hạn → `expired`; chạy 2 lần → không đổi thêm.
- Paywall dùng Redis mới: sau kích hoạt, token cũ (claim `pending_payment`) vào route Portal → 200.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test (đối soát nhiều biến thể theo testing.md); EXPLAIN scheduler + unmatched; gate xanh; commit; SHA
- [ ] Rule HANDOFF 3: transition có điều kiện + outbox cùng transaction
- [ ] Rule security: webhook raw body + HMAC timingSafeEqual, idempotent `(provider, bank_txn_id)`
