# TIP-V42-702 — Miễn phí 3 tháng (trial) + một cổng quyền dùng chung — completion

- Nhánh `feature/TIP-V42-702-trial-fee-gate`, xếp chồng trên `feature/TIP-V42-701-bugs-b1-b6` (PR 701 chưa merge).
- PR: base `feature/TIP-V42-701-bugs-b1-b6`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-701-bugs-b1-b6...feature/TIP-V42-702-trial-fee-gate
- REQ / D: REQ-601, D-94 (1A, 2A), D-113, D-116, BR-TRIAL-01 → 05, V-11.

## Commit

| SHA | Nội dung |
|---|---|
| `73e26e15` | TIP-V42-702 |
| `654f7b78` | Enum `trial` (2 migration: `ADD VALUE` riêng transaction), đăng ký tạo fee `trial` 90 ngày; `isFeeUsable` / `USABLE_FEE_STATUS` / `PAID_FEE_STATUS` / `TRIAL_DAYS` chuyển sang `packages/shared` và mọi guard REST, socket, SQL lọc (Khám phá gian hàng, onboarding, lọc Admin, thống kê, affiliate) dùng chung; `trial → active` kỳ 12 tháng từ hôm nay; `trial → expired` qua job + outbox; migration dữ liệu `pending_payment` → trial / expired, giá gói hiện hành (bỏ 600.000); nhắc trial chỉ T-7 / T-0, câu riêng, không bù sau ngày hết; `/me/membership` trả `neverPaid` |
| `371cebaf` | Portal: thẻ giá v4.2 (Miễn phí 3 tháng đầu · 0đ / tháng · "Từ tháng thứ 4"), Gói Gọi vốn "Thanh toán khi đăng ký"; trial = Đang hoạt động (chân sidebar, Gói & thanh toán); hết trial → popup / banner câu trial; khai báo xong báo hạn miễn phí thay vì mở Bảng giá. Admin: nhãn + tone "Miễn phí 3 tháng", ghi nhận thu tay được khi trial |
| commit e2e + báo cáo này | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Đăng ký mới → `trial` ≈ now + 90 ngày, route cần phí 200, socket kết nối không cần scope membership | int `test/membership-fee/trial` › BR-TRIAL-01 | pass |
| Trial quá hạn → 402 ngay; job → `expired` + 1 outbox, chạy lại không đổi | int `trial` › BR-TRIAL-02 | pass |
| Trial + CK đúng → `active`, kỳ 12 tháng từ hôm nay (không nối trial) | int `trial` › BR-TRIAL-04 | pass |
| `pending_payment` 10 / 200 ngày trước → trial đến created + 90 / expired, giá gói, bump version | int db `migration-trial` (3) | pass |
| Trial còn 7 / 0 ngày → 1 mail + 1 thông báo câu miễn phí, chạy lại không gửi; 30 ngày / hết 3 ngày → không nhắc | int `trial` › D-113 (2) + unit `fee-reminder.spec` | pass |
| TK trial mở Portal → không popup bắt buộc; hết trial → popup câu trial | e2e `new-member-paywall`, `membership`, `declaration`, `portal-shell` | pass |

## Test (số thật, máy dev)

- `pnpm turbo run lint typecheck test`: 22 / 22 task. Unit: shared 409, server 225, portal 385, admin 460, integrations 89 (+2 skip), ui 49.
- `pnpm depcheck`: 0 vi phạm (865 module).
- `test:int`: server 150 file, 1421 / 1421; db 17 file, 54 / 54.
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (build 702): **311 pass / 0 fail / 4 skip** (13,2 phút) — bằng số của 701 / `dev`.

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| P-79 Bảng giá (thẻ trial) | 0,00% (1366: 0,31%) | 0,00% | trước sửa thẻ: 4,47 / 6,15% |
| P-86 Chuyển khoản · đang đối soát | 1,25% | 2,79% | |
| P-84 / P-85 Chuyển khoản | 1,25 / 1,29% | 7,73 / 9,32% | ảnh VietQR → V42-705 (Q-V42-702-3) |
| P-01 Dashboard (chân gói) | 0,14% | 0,36% | |
| P-89 / P-91 Hồ sơ | 0,06 / 0,71% | 0,11 / 1,74% | |
| D-18 → D-22 Admin › Phí | 2,05 → 15,13% | 14 → 21% | 6 tab v4.2 → V42-708 (Q-V42-702-1) |
| D-07 Thành viên | 1,59% | 6,18% | bỏ lọc Khởi đầu → V42-708 |
| P-100 → P-102 Khai báo | timeout phía prototype | | kịch bản → V42-714 (Q-V42-702-4) |

Các màn > 3% ở trên đều vượt y hệt khi đo trên bản build 701 (trước mọi thay đổi 702).

## EXPLAIN (`coding-packs/reports/explain/V42-702-trial.{sql,txt}`, 12k dòng thêm trong transaction rồi ROLLBACK)

- Job hết hạn: Bitmap Index Scan `membership_fees_due` (partial gồm trial), 0,27 ms.
- Job nhắc: Bitmap Index Scan `membership_fees_remind`, 10,3 ms / 500 dòng; Seq Scan chỉ ở `users` (hash join 13k dòng, chọn của planner với LIMIT 500 trên dữ liệu thử) và `fee_reminders` (176 dòng).

## Soát luật cứng

1. File trong trần (user.factory tách `feeRow` vì `max-lines-per-function`). 2. Không `any`; `neverPaid` trong zod shared. 3. depcheck sạch.
4. Cổng phí một chỗ (`isFeeUsable`), grep `'active', 'expiring'` ngoài shared chỉ còn transition table, query nhắc (tập 4 trạng thái có trial),
seed demo, Admin `renew` và mock affiliate (V42-707). 5. Index partial theo tập trạng thái mới. 6. Socket đọc Redis, không DB.
7. `trial → active | expired` trong bảng transition, cập nhật có `version`. 8. `membership_fee.changed` qua outbox trong transaction.
9. Tiền VND nguyên. 10. Không thao tác Admin mới. 11. Không dịch vụ ngoài mới. 12. Không env mới. 13. Test ở file riêng. 14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Migration 702 đã áp `opchub_dev` + `opchub_test`.
- Affiliate mọi TV, `me-affiliate` theo trial đầy đủ: V42-707 (702 chỉ đổi sang `isFeeUsable`).
- Màn lệch do prototype v4.2: Q-V42-702-1 → 4 trong `ui-parity/questions.md`.
