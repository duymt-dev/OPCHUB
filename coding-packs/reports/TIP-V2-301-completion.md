# TIP-V2-301: Hạn phí, nhắc gia hạn T-30/T-7/T-0/T+3 lúc 08:00 (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. NA-04, D-57, NR-R01, NR-R03 · REQ-202, 203, 204, 383.
> Migration `20261019150000_fee_reminders` (agent chính tạo, áp `opchub_dev` + `opchub_test`).

## Đã làm
- Lịch `fee-status-daily` → `0 8 * * *` tz `Asia/Ho_Chi_Minh` (giữ id, upsert). Job chạy `FeeSchedulerService.run`:
  `sweep` (active → expiring → expired, outbox `membership_fee.changed`) rồi `remind`.
- `domain/fee-reminder.ts`: `daysLeft` theo ngày lịch VN, `dueMilestone` chọn mốc muộn nhất đã tới mà chưa gửi
  (lỡ job vẫn bù, không gửi dồn), quá hạn > 10 ngày thì thôi.
- Bảng `fee_reminders` PK `(user_id, valid_until, milestone)` + CHECK mốc; partial index
  `membership_fees_remind (valid_until) WHERE status IN ('active','expiring','expired')`. Ứng viên lấy một query
  keyset lô 500 kèm mốc đã gửi (`array_agg`), ghi `INSERT … unnest … ON CONFLICT DO NOTHING RETURNING` — chỉ người
  vừa ghi mới nhận mail; mail (`MailService.requestMany`) + outbox `membership_fee.reminded` cùng transaction.
- `mail/templates-fee.ts`: câu theo mốc (T-30/T-7 "sẽ hết hạn ngày dd/mm/yyyy", T-0 "hết hạn hôm nay", T+3 "đã hết
  hạn — gia hạn để tiếp tục sử dụng", chưa đóng "chưa được thanh toán") + NR-R01 "Phí 600.000đ/năm, không hoàn lại".
- Nhắc tay Admin: mẫu theo trạng thái hiện tại + thông báo chuông qua `membership_fee.reminded` (§12); không ghi
  `fee_reminders`. "Gửi nhắc hàng loạt" = `pending_payment | expiring | expired`.
- Thông báo `membership` "Nhắc phí thành viên", link `/membership/pay` (Portal không có `/services` cho phí — trang
  thanh toán phí là `/membership/pay`).

## Test
- Unit `fee-reminder.spec.ts` (3): mốc muộn nhất chưa gửi, ranh giới 23:30/00:30 VN, quá 10 ngày.
- Int `fee-reminders.int.spec.ts` (6): T-30 một lần + thông báo, bù mốc 8 → 6, T-0/T+3 + expired, quá 11 ngày không
  mail, gia hạn reset mốc, 2 lượt song song không trùng, pending không tự nhắc + nhắc tay 2 lần → 2 mail + 2 thông
  báo + 2 audit. Đổi tên test cũ gắn REQ-202/203/204/383/NR-R03.
- e2e `admin-fees.spec.ts` gắn `REQ-204` (Gửi nhắc → toast) — chạy cả bộ msw + server cuối pha 3.

## Cổng kiểm
| Lệnh | Kết quả |
|---|---|
| lint / typecheck (server) | sạch |
| depcheck | no violations (606 modules) |
| Int server | 76 file, **1008/1008** |
| Unit server | 95/95 |
| Audit cơ học | C1 16/16 (thêm `membership_fee.reminded`), C2 18/18 |

## Chưa làm
- Zalo ZNS (SKIP theo TIP). Guard `valid_until` + "Cần đối soát" đã ở TIP-V2-108.
