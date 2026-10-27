# TIP-V4-622 — Admin Cài đặt / Bot / Sự kiện / danh mục theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-622-settings-bots-events`, xếp chồng trên `feature/TIP-V4-621-overview-flow` (chưa merge).
- PR: base `feature/TIP-V4-621-overview-flow` — **chưa tạo được**: `gh` chưa đăng nhập. Nhánh đã push; payload REST soạn sẵn ở `.v4tmp/pr/` (ngoài repo) chờ owner chạy với token của mình.
- Commit:
  - `3bb04800` modal dùng chung: header / thân / footer thắng CSS-in-JS antd;
  - `cb4b0d02` e2e i18n Dashboard v4, báo cáo B2 theo nhóm tỉnh + ngành (sửa test cũ sau V4-618/619);
  - `a7862e5a` Cài đặt: phạm vi "Nhóm ngành mạng lưới", bảng dạng thẻ ở 390, nhật ký seed theo prototype;
  - `3864fa86` Bot: nút khẩn cấp cuối hàng tab, "Chế độ tự động 100%"; Sự kiện: hàng tiêu đề bảng ẩn ở 390;
  - `c5520695` TK quản trị có ảnh đại diện (migration `20261027150000_v4_admin_avatar`, API, seed, MSW, UI, test int);
  - `b2ff0f8b` MSW bot chạy nhịp đầu sau 10 giây như `_simTick`;
  - `951da040` Bot 390: thanh khẩn cấp xuống cuối thẻ (không che tab); thẻ Sự kiện bấm ảnh bìa / tiêu đề mở Chi tiết; hộp thoại tạo TK quản trị, khoảng cách thẻ TK, nút ngôn ngữ thanh trên cùng Admin theo prototype;
  - commit báo cáo này — SHA ở `git log`.
- REQ / D: D-89, Q-V4-615-5 (đã làm); DV-V4-615-8 → 11 (đã sửa phần giao diện); giữ D-47 (D-70), D-50 + REQ-141 (D-41 @390).

## Parity (MSW, ngưỡng 3%, không mask thêm)

| Màn | 1440 | 390 |
|---|---|---|
| D-36 / D-37 / D-38 / D-39 / D-40 Bot | 0,36 / 0,24 / 0,06 / 0,31 / 0,06% | 2,78 / 1,72 / 0,12 / 2,78 / 0,15% |
| D-41 Bot · Hội thoại | 0,49% | **5,58%** (DV-V4-622-1: D-50 không hàng chờ duyệt, REQ-141 nút khẩn cấp) |
| D-42 → D-47 Sự kiện | 0,04 – 0,26% | 0,00 – 0,39% |
| D-50 / D-87 | 0,28 / 0,43% | 0,42 / 0,40% |
| D-66 / D-67 / D-68 / D-69 Cài đặt | 0,27 / 0,24 / 0,24 / 2,64% | 0,33 / 0,19 / 0,19 / 2,98% |
| D-70 Email chào mừng | **16,40%** | **15,66%** (DV-D47-1: D-47 không gửi mật khẩu tạm) |
| D-71 / D-72 / D-73 / D-74 / D-75 | 0,22 / 0,22 / 0,26 / 0,70 / 0,39% | 0,27 / 0,26 / 0,28 / 1,67 / 0,71% |

## Test (số thật)

- `pnpm turbo run lint typecheck test` (shared, admin, ui, server, db, portal): 17 / 17 task thành công; sau commit cuối admin + ui 6 / 6.
- `pnpm depcheck`: 0 vi phạm (858 module, 3868 phụ thuộc).
- Build MSW Admin: thành công.
- Int `apps/server test:int test/admin-account test/contract test/gates test/settings`: 36 file / 839 test pass (có test mới D-89 ảnh đại diện TK quản trị). `packages/db test:int`: 16 file / 51 test pass (migration mới áp vào `opchub_test`).
- e2e behavior MSW: 12 file Bot / Sự kiện / Cài đặt / RBAC / shell 45 / 47 lần đầu (2 test Sự kiện trùng tên nút "Danh sách" với ảnh bìa → đổi nhãn "Mở chi tiết sự kiện …"); chạy lại `admin-events`, `events`, `admin-bots` (có 2 test mới: bấm ảnh bìa / tiêu đề mở Chi tiết; tab Bot @390 không bị che): 20 / 20 pass. Toàn bộ bot spec trước đó: 11 / 11.
- Parity Bot / Sự kiện / Cài đặt (bảng trên): 23 / 24 ảnh của lần đo cuối đạt (D-41 @390 có lý do).
- Toàn bộ `test:int`, toàn bộ e2e MSW, e2e:server: để TIP-V4-624.

## Chưa làm / ghi chú

- PR chưa tạo (gh chưa đăng nhập).
- Migration `20261027150000_v4_admin_avatar` chưa áp vào `opchub_dev` (HOLD) — áp ở TIP-V4-624.
- Chờ owner: Q-V4-622-1 (2 mục Cài đặt ẩn ở điện thoại), Q-V4-622-2 (D-50 bot), Q-V4-622-3 (D-47 mail chào mừng).
- Tìm thấy lỗi thật khi đo: ở 390 thanh "Tắt khẩn cấp" che tab "Hội thoại" (bấm không được) — đã sửa và có test hành vi.
