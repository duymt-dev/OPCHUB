# TIP-V4-620 — Dự án OPC Portal + Admin theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-620-projects-v4`, xếp chồng trên `feature/TIP-V4-619-community-90` (chưa merge).
- PR: base `feature/TIP-V4-619-community-90` — **chưa tạo được**: `gh` chưa đăng nhập. Nhánh đã push; cần owner chạy `gh auth login` (hoặc tạo PR trên web).
- Commit:
  - `2f253e3e` dữ liệu dự án v4: đối tượng, nhu cầu, lượt xem, 5 giai đoạn, 32 nhóm ngành (schema + migration, seed native + MSW, API lọc / sắp xếp);
  - `1c8e1e54` Portal: hero, lưới ngành, cột lọc trái, thẻ dự án v4, địa chỉ liên hệ;
  - `debcdb5e` điểm nổi bật, hình ảnh, mốc cập nhật là dữ liệu dự án (migration `20261027130000_v4_project_milestones`);
  - `d1ffef9b` Admin: tab mặc định "Đang hiển thị", hàng tiêu đề ẩn ở 390, parity D-51 → D-57;
  - commit báo cáo này — SHA ở `git log`.
- REQ / D: D-89, Q-V4-615-2 (đã làm); DV-V4-615-3, DV-V4-615-5, DV-V2-307-8, DV-V2-109-1, DV-V4-610-2/3 (đã sửa); giữ BUG-016, BUG-038, D-31.

## Đã làm

1. **Dữ liệu / API**: cột `audience`, `needs`, `view_count`, `contact_address`, `highlights`, `gallery`, `milestones` (CHECK, index `projects_published_views`). `GET /projects` nhận `audience`, `stage` nhiều giá trị, `needs`, `province`, `sort=view`; `q` tìm cả tỉnh + tên ngành. Thống kê: số chủ dự án khác nhau (`groupBy`), kết nối = góp ý + 3 × dự án. Lượt xem tăng khi người xem không phải chủ. 15 dự án seed theo prototype (p11–p15 chủ "ma"), 32 nhóm ngành dự án.
2. **Portal**: hero tối + ô tìm + tìm kiếm phổ biến + 3 số; lưới "Nhóm ngành giải pháp địa phương" (Xem thêm / Thu gọn); cột lọc trái (Đối tượng, Địa phương có ô tìm, Giai đoạn, Nhu cầu, Địa phương tiêu biểu, hộp hỗ trợ mở bảng giá); thẻ dự án v4 (huy hiệu, chữ avatar); lưới / bảng, cỡ trang 8 / 12 / 24, phân trang. Form: Đối tượng, "Nhóm ngành giải pháp", Địa chỉ liên hệ. Chi tiết: Vấn đề / Giải pháp / Thị trường, 3 ảnh, mốc cập nhật, Địa chỉ. 10 ngôn ngữ.
3. **Admin**: tab mặc định "Đang hiển thị" (thứ tự như v4), nhãn "Đang phát triển", hàng tiêu đề bảng ẩn ở 390.

## Parity (MSW, ngưỡng 3%, không mask thêm)

| Màn | 1440 | 390 |
|---|---|---|
| P-55 / P-56 / P-57 / P-58 / P-59 / P-60 | 0,05 / 0,05 / 0,11 / 0,02 / 0,05 / 0,03% | 0,03 / 0,13 / 0,38 / 0,02 / 0,12 / 0,05% |
| P-62 / P-63 / P-64 / P-65 / P-66 / P-67 / P-68 | 0,90 / 0,39 / 0,38 / 0,35 / 0,31 / 0,43 / 1,82% | 1,80 / 1,58 / 1,62 / 0,98 / 0,69 / 0,81 / 2,33% |
| P-73 / P-74 / P-75 / P-76 / P-77 / P-78 | 0,29 / 0,52 / 0,11 / 0,29 / 0,04 / 0,09% | 0,43 / 1,07 / 2,28 / 0,67 / 0,08 / 0,79% |
| P-103 / P-104 | 0,44 / 0,63% | 0,37 / **15,94%** (DV-V4-610-4, D-31) |
| D-51 / D-52 / D-53 / D-54 | 0,10 / 0,14 / 0,20 / 0,18% | 0,21 / 0,43 / 0,17 / 0,23% |
| D-55 / D-56 / D-57 / D-92 | 0,04 / 0,10 / 0,14 / 0,00% | 0,04 / 0,28 / 0,11 / 0,00% |

P-57, D-53, D-54 bỏ `unreachable`. Giữ `unreachable`: P-61 (TK demo prototype sở hữu p10), P-69 → P-72 (prototype không đóng `<sc-if pjTabCmt>`, index.html 1244–1321). Còn > 3%: P-104 @390 — mã GV 6 số (D-31, tiền) → Q-V4-620-3 chờ owner.

## Test (số thật)

- `pnpm turbo run lint typecheck test` (server, shared, portal, admin, ui, db): 17 / 17 task thành công.
- `pnpm depcheck`: 0 vi phạm (857 module, 3865 phụ thuộc).
- Build MSW Portal + Admin: thành công.
- Int `apps/server test:int test/project test/contract test/gates test/investor test/settings`: 36 file / 101 test pass. `packages/db test:int`: 16 file / 51 test pass (migration đã áp vào `opchub_test`).
- e2e behavior MSW `projects`, `fundraising`, `admin-projects`: 24 / 24 pass.
- Parity Admin `D-51,D-52,D-53,D-54,D-55,D-56,D-57,D-92`: 16 / 16 đạt; Portal Dự án đo ở `1c8e1e54` (bảng trên).
- Toàn bộ `test:int`, toàn bộ e2e MSW, e2e:server: để TIP-V4-624.

## Chưa làm / ghi chú

- PR chưa tạo (gh chưa đăng nhập).
- Migration chưa áp vào `opchub_dev` đang chạy native (HOLD); áp + seed lại demo ở TIP-V4-624.
- Form nhập điểm nổi bật / hình ảnh / mốc chưa có (prototype không có) — Q-V4-620-2.
- Prototype tự mâu thuẫn quốc gia BrandKit Mini (Portal "Thái Lan", Admin "Việt Nam") — app dùng một nguồn (Q-V4-620-4).
- Bản dịch 9 ngôn ngữ khác do agent dịch, cần người bản ngữ rà.
