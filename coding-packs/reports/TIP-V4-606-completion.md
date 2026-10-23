# TIP-V4-606 — Menu hai cổng §27.3 + quyền `stores.*` + tắt Marketing — completion

- Nhánh: `feature/TIP-V4-606-menu-perms` (xếp chồng trên `feature/TIP-V4-601-fee-3-plans`, PR #17 chưa merge)
- PR: [#18](https://github.com/duymt-dev/OPCHUB/pull/18) (base `feature/TIP-V4-601-fee-3-plans`)
- SHA code cuối: `ce1d52c5` (parity đo tại `0b27e625`)
- REQ / D: REQ-514, REQ-515 · D-73, D-78, D-80

## Đã làm

- Quyền: thêm `stores.view`, `stores.action` (menu `stores`). Admin và Biên tập nội dung mặc định có cả 2. Tổng 27 khoá. Migration `20261023120000_v4_store_permissions` chỉ thêm khoá, không gỡ khoá cũ. Đã áp lên `opchub_dev` và `opchub_test`.
- Worker: gỡ lịch `campaigns-due`. Khi khởi động gọi `removeJobScheduler` cho `RETIRED_SCHEDULES`. Consumer outbox `campaign.send` vẫn giữ để đạt bất biến M1 (Q-V4-606-3).
- UI package: tiêu đề nhóm ở sidebar (ẩn khi sidebar thu gọn). Menu người dùng có thêm mục "Cài đặt hệ thống" (`onSettings`).
- Portal:
  - Menu chia 3 nhóm: CỘNG ĐỒNG / KẾT NỐI KINH DOANH / TÀI KHOẢN. Có các mục "Bảng giá" và "Mạng lưới Affiliate".
  - Chân sidebar là thẻ gói `PlanBadge`: gói, trạng thái, hạn, số ngày còn, thanh tiến độ, nút Thanh toán / Gia hạn / Xem bảng giá. NĐT không thấy thẻ.
  - Bỏ "Sự kiện sắp tới" ở chân sidebar.
  - Đủ 10 locale.
- Admin:
  - Nhóm NGƯỜI DÙNG & CỘNG ĐỒNG / KẾT NỐI KINH DOANH / DOANH THU & ĐỐI TÁC.
  - Đổi nhãn "Dự án OPC", "Mạng lưới Affiliate".
  - Cài đặt chuyển vào menu người dùng, chỉ hiện khi có ít nhất một khoá `settings.*`.
  - Marketing gỡ khỏi sidebar. Route `/marketing` vẫn hoạt động, kiểm `settings.mail`, vì nhật ký mail nằm ở đó (Q-V4-606-2).
  - `navModel` tách ra file thuần, có spec riêng.

## Test (số thật)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 0 lỗi |
| `pnpm typecheck` | đạt |
| `pnpm test` | 6/6 task (admin 456, portal 317, shared 379, server 230, ui 48) |
| `pnpm test:int` | server 131/131 file, 1316 test |
| `pnpm depcheck` | không vi phạm |
| `pnpm build` | 3/3 |
| e2e behavior (MSW) | full: 285 passed / 1 failed / 4 skipped. Ca hỏng `affiliate-screen` (trùng nút với thẻ gói) đã sửa, chạy lại 5/5. Sau khi đổi Marketing, chạy lại các spec bị ảnh hưởng: 33 passed |

## Parity (prototype v4, ≤ 3%)

| Màn | 1440 | 390 |
|---|---|---|
| P-99 Sidebar Portal §27.3 | 1,78% ✅ | 1,77% ✅ (drawer) |
| D-90 Sidebar Admin §27.3 | 1,92% ✅ | 1,86% ✅ (drawer) |
| D-91 Menu người dùng Admin | 1,11% ✅ | 0,01% ✅ |
| P-80 Form tư vấn cá nhân | 2,72% ✅ | 2,53% ✅ |
| P-81 Form tư vấn DN | 3,88% ❌ | 4,13% ❌ |
| P-82 Báo thiếu | 12,23% ❌ | 16,43% ❌ |

- Màn toàn trang cũ (P-01…P-19, D-01…D-17) chênh do nội dung trang v4 thuộc TIP khác. Đã ghi DV-V4-606-1..5, không mask, không nới ngưỡng.
- P-81/P-82: phần shell đã khớp, độ chênh còn lại nằm ở nội dung form. Chưa giao TIP nào, giữ DV-V4-601-1/2, đo lại ở V4-615.
- P-16 chuyển thành unreachable vì prototype v4 bỏ khối này.

## Soát luật cứng

Không file vượt trần. Không `any`. Quyền chỉ kiểm theo khoá. Không query mới trong vòng lặp. Không thao tác Admin mới. Test ở file riêng. Commit theo đường dẫn, `git status` sạch.

## Chưa làm / chuyển tiếp

- `reports.view` → V4-614 (Q-V4-606-1).
- Mục nav Nhu cầu / Gian hàng → V4-609 / V4-608, thêm khi có route.
- Native HOLD: đã seed demo lại sau khi đo.
