# TIP-V2-307: Registry parity + baseline theo prototype ver2 (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. ui-parity · AT-LK04 · REQ-391 · RB-R06/R07/R09 · SEC-R01 · NR-R02.
> Commit: `c8b2dc0` (UI shell ver2), `54eed7a` (kịch bản parity + e2e), `25a1eec` (kết quả MSW + deviations), commit server
> parity + báo cáo ngay sau. V2Q mới: V2Q-163 → V2Q-166.

## Đã làm
- **Baseline ver2**: chụp lại toàn bộ ảnh gốc từ `docs/spec/index.html` ver2 (`PARITY_MODE=proto-only`). Bỏ kết quả cũ
  (`results.json`, `diffs/`) rồi đo lại từ đầu. `screens.md` có mục "Ver2" ghi id đã gỡ, đổi thao tác và id thêm mới.
- **Kịch bản**:
  - Gỡ P-31/32/33 (Portal tạo chủ đề, NA-09/D-61) và D-15 (đổi quyền hệ thống, RB-R01).
  - Thêm P-96, D-81 → D-89 (file mới `admin-rbac.ts`).
  - Các trạng thái không tới được: A-05 (ver2 bỏ hộp tài khoản dùng thử); A-31/32, P-97/98, D-84/85 (Affiliate pha 4, bật lại ở
    TIP-V2-503).
  - Thêm viewport 1366 cho P-79 (AT-LK04).
  - Ảnh thay thế giữ đúng tỉ lệ (`stabilize.placeholderFor`).
  - Mask biểu đồ Tổng quan (`overview-mask.ts`) áp cho D-01 → D-05 và D-81.
  - Form đăng ký: kịch bản tick ô đồng ý (NR-R02) ở cả hai bên.
- **Sửa UI theo ver2** (không đổi nghiệp vụ):
  - Sidebar "Sự kiện sắp tới" có 3 sự kiện và nút "Xem tất cả" (`packages/ui` `SidebarEvents`). Portal lấy từ `/events`;
    Admin lấy từ `/admin/events/upcoming` và chỉ hiện khi có quyền `events.view`.
  - Hồ sơ cá nhân và Đăng xuất chuyển vào menu tài khoản trên topbar.
  - Dashboard Portal không còn PageHeader (giữ `h1` ẩn cho trình đọc màn hình).
  - Quy mô doanh nghiệp chọn bằng nút (`SizeChoice`).
  - Hộp "Tài khoản dùng thử" tắt mặc định (V2Q-163).
  - Popup Gói dịch vụ ở ≤ 767px chiếm toàn màn hình với cả form tư vấn và màn đã gửi (P-83 @390: 51,9% → 3,8%).
  - Admin chế độ chỉ xem: menu chỉ có quyền Xem (Tổng quan) không hiện dải chỉ xem (V2Q-164). Dải chỉ xem đứng trước dải
    xem thử, cách 20px như prototype (D-81: 8,6% → đạt; D-82: 4,4% → đạt).
- **deviations.md**:
  - Đặt lại theo baseline "prototype v4 Ant / SRS-3.6, 20/10/2026", thêm DV-V2-307-1 → 16.
  - Giữ 96 DV cũ còn hiệu lực; chuyển 8 DV hết hiệu lực vào mục lưu trữ (DV-05, 06, 07, 12, G3a-1, G2c-2, G3b-7, G4a-1).

## Kết quả parity (MSW)
- **198 trạng thái / 387 ảnh**: **303 ảnh ≤ 3%**. 84 ảnh còn lại đều có DV (`deviations.md`). 17 trạng thái không tới được.
- Nhóm ảnh trên 3%:

| Nhóm | Ảnh | DV |
|---|---|---|
| A-12 → A-20, P-23/24 | đăng ký: ô đồng ý NR-R02 dài hơn, chưa có ô Mã giới thiệu | DV-V2-307-2 |
| P-62 → P-72 | chi tiết dự án không có khối Vấn đề/Giải pháp/Thị trường, ảnh cố định | DV-V2-307-8, DV-V2-109-1 |
| P-79 | dòng hạn thành viên → hộp scale 0,91 | DV-V2-307-9 |
| D-42 → D-45, D-50, D-87 @390 | prototype không xếp chồng khối Sắp diễn ra | DV-V2-307-6 |
| D-07 → D-14 @390, D-08 | thứ tự thành viên như server | DV-V2-307-5 / DV-B63-2 |
| D-32, D-65, D-66 → D-75 @390, D-70, D-80 | DV cũ | DV-G4c-1, G5c-1, G6a-1, D47-1, G6a-3 |
| D-83 | `/first-password` thay modal | DV-V2-307-11 |
| D-29, P-74 @390 | lỗi tại ô (BUG-022) | DV-V2-307-14 |
| P-46 | ô đồng ý khi tham gia nhóm | DV-V2-307-15 |
| P-80 → P-83 @390 | xuống dòng chữ 3,0–3,8% | DV-V2-307-16 |
| P-05 | mail chào mừng (D-30) | DV-G2a-1 |

- Đã thử chuyển dòng hạn thành viên lên cạnh logo (P-79): kết quả tệ hơn (22%), nên hoàn tác và ghi DV.

## Kết quả parity (server, stack-b, seed:demo + flush:dev-cache)
- **387 ảnh: 290 ≤ 3%**, 97 ảnh trên 3% đều có DV: các DV của MSW cộng thêm DV-V2-307-17 (Dashboard số thật, 31–48%),
  DV-V2-307-18 (P-03/P-06 không có dữ liệu trên server, giữ kết quả lần đo trước) và DV-V2-307-19 (thứ tự/dữ liệu theo DB).
- A-27 trượt một lần do chưa điền email (V2Q-163). Kịch bản đã sửa, đo lại đạt 0,07 / 0,08%.

## Test
- Unit: admin 158 (thêm `permission-model` RB-R07 Tổng quan) · portal 114 · ui 39 (thêm `sidebar-events.spec` ×2) ·
  shared 90 · server 99 · integrations 25.
- e2e behavior MSW **178/178** · server (stack-b) **178/178**. Các test sửa: a-01-login (V2Q-163, đăng nhập admin tự điền), events (P-16 sidebar),
  portal-shell, profile (menu tài khoản), admin-rbac (đăng xuất qua menu), admin-members (link Sự kiện sắp tới),
  auth-flows.
- lint 0 lỗi (12 cảnh báo `<img>` có sẵn) · typecheck sạch · depcheck sạch.

## Chưa làm / chuyển
- Affiliate (A-31/32, P-97/98, D-84/85): TIP-V2-503.
- Ô nhập "Vấn đề / Giải pháp / Thị trường" cho dự án: V2Q-165.
