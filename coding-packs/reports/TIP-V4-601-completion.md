# TIP-V4-601 — Phí thành viên 3 gói + Bảng giá v4 — completion

- Nhánh: `feature/TIP-V4-601-fee-3-plans` (tách từ `dev` 32bf4016)
- SHA code cuối: `ac178a06` (parity đo tại `7123673a`)
- PR: xem `V4-progress.md`
- REQ / D: REQ-501 · D-68, D-69, D-81

## Đã làm

- `packages/shared/src/membership/plans.ts`: nguồn giá duy nhất (Cá nhân 1.200.000, Doanh nghiệp 3.600.000, Gọi vốn 15.000.000 / gia hạn 7.500.000).
- DB: enum `membership_plan`, cột `membership_fees.plan`, bỏ default `amount`. Migration `20261023090000_membership_plans` có backfill D-69: khoản `pending_payment` giữ 600.000, khoản còn lại chuyển theo giá gói. Đã chạy `migrate deploy` trên `opchub_test` và `opchub_dev`.
- Server:
  - Đăng ký mở phí theo loại TK.
  - `activate()` tính gói và số tiền cho kỳ sau theo loại TK hiện tại; outbox `confirmed` mang phí thực của kỳ.
  - Mail nhắc phí dùng `amount` của dòng.
  - Admin bỏ `feeAmount` cố định.
- Portal:
  - Bảng giá v4 gồm 3 thẻ: gói của mình bấm được, gói kia khoá, thẻ Gọi vốn chỉ mở khi đã đóng phí.
  - Popup chuyển khoản hiện tên gói và giá tháng.
  - Khối "Hỗ trợ phát triển doanh nghiệp" dùng nút "Đăng ký".
  - Mở từ menu thì Bảng giá là **trang** trong khung nội dung, đúng prototype `data-pg="1"`. Từ chuyển khoản quay lại thì là hộp nổi. TK chưa đóng phí vẫn bị hộp chặn (BR-03, D-28).
- Admin: toast "Ghi nhận đã thu" lấy số tiền của từng dòng. Bảng phí hiển thị dạng thẻ khi màn < 1024px (CSS v4).
- MSW, seed: số tiền phí theo loại TK. Kỳ lịch sử của kịch bản affiliate giữ 600.000 cũ.
- i18n: 10 locale được cập nhật (membership, auth, chat, community, services).

## Test (số thật)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 0 lỗi (portal 6, admin 5 cảnh báo có sẵn) |
| `pnpm typecheck` | 8/8 |
| `pnpm test` | 6/6 task. portal 317, ui 46 (+2 test dạng trang) |
| `pnpm test:int` | db 5/5 file, server 131/131 file. Có `membership-fee/plans.int.spec.ts` 4 ca mới |
| `pnpm depcheck` | không vi phạm |
| `pnpm build` | 3/3. Admin build với `NEXT_PUBLIC_PORTAL_URL=http://localhost:3000` (bắt buộc cho cầu MSW) |
| e2e behavior (MSW) | **285 passed / 0 failed / 4 skipped** (trên dev trước đó: 282 passed, 3 failed zh) |

Đã sửa thêm lỗi có từ trước ở `e2e/behavior/helpers/i18n.ts`: helper zh tìm "登 录" trong khi aria-label đã được ghim là "登录" từ TIP-V2-559.

## Parity (prototype v4, ≤ 3%, sha 7123673a)

| Màn | 1440 | 1366 | 390 |
|---|---|---|---|
| P-79 Bảng giá | 1,15% ✅ | 1,38% ✅ | 0,54% ✅ |
| P-80 Form tư vấn cá nhân | 2,81% ✅ | — | 2,53% ✅ |
| P-81 Form tư vấn DN | 3,96% ❌ DV-V4-601-1 | — | 4,13% ❌ DV-V4-601-1 |
| P-82 Form báo thiếu | 12,26% ❌ DV-V4-601-2 | — | 16,42% ❌ DV-V4-601-2 |
| P-83 Đã gửi | 1,20% ✅ | — | 0,87% ✅ |
| P-84 Chuyển khoản | 1,03% ✅ | — | 0,13% ✅ |
| P-85 Đã sao chép | 1,07% ✅ | — | 2,14% ✅ |
| P-86 Đang đối soát | 1,03% ✅ | — | 0,13% ✅ |
| P-89 Hồ sơ | 1,64% ✅ | — | 7,38% ❌ DV-V4-601-3 |
| D-18 → D-22 Phí thành viên | 1,36–1,53% ✅ | — | 0,28–0,73% ✅ |

Đạt 24/29 ảnh. Không nới ngưỡng, không mask.

Thay đổi ở bộ đo parity (không phải nới):
- Prototype v4 dùng ô "email hoặc số điện thoại" thay cho ô email.
- Sau khi đăng nhập trên prototype, cuộn về đầu trang (landing đã cuộn xuống form).
- Nhãn menu "Bảng giá" / "Gói dịch vụ" đọc theo từng bên cho tới V4-606.

Các ca P-81, P-82, P-89 được ghi ở `deviations.md` và `questions.md` (Q-V4-601-1…4).

## Soát luật cứng

1. File: không file nào mới vượt trần. `uat-core.audit.ts` dài 492 dòng từ trên dev, nhánh chỉ sửa 6 dòng.
2. Không `any` / `@ts-ignore`.
3. depcheck sạch.
4. Không thay đổi quyền.
5. Không có query mới trong vòng lặp. Backfill chạy một lệnh UPDATE.
6. Không đụng chat.
7. Chỉ đổi trạng thái qua `activate()`.
8. Outbox giữ nguyên.
9. Tiền là Int VND.
10. Không có thao tác Admin mới.
11. Ngân hàng dùng fake (D-81).
12. Không có secret.
13. Test nằm ở file riêng.
14. Commit theo đường dẫn, `git status` sạch.

## Chưa làm / chuyển tiếp

- Hoa hồng theo phí thực trả (D-70) → V4-602. Int test `policy-preview` vẫn kỳ vọng 600.000 niêm yết.
- Mua Gói Gọi vốn → V4-610. Hiện nút chỉ hiện toast "sắp có".
- Đổi tên menu thành "Bảng giá", menu 9 mục và thẻ gói ở chân sidebar → V4-606, sau đó đo lại P-80…P-82.
- Tab Hồ sơ "Gói & thanh toán" (UP-14) chưa được giao TIP nào (Q-V4-601-1).
- Native HOLD: sau khi đo đã chạy seed demo lại (xem V4-progress).
