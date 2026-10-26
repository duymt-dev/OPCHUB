# TIP-V4-615 — Parity v4: đo lại toàn bộ trên prototype v4 — completion

- Nhánh: `feature/TIP-V4-615-parity-v4`, xếp chồng trên `feature/TIP-V4-614-report-export-b123` (PR #30 chưa merge)
- PR: [#31](https://github.com/duymt-dev/OPCHUB/pull/31) (base `feature/TIP-V4-614-report-export-b123`)
- Commit:
  - `8f5f6cce` TIP
  - `16479ff9` UI: nút ngôn ngữ thanh trên (quả địa cầu + viền), Cài đặt bỏ ô khoảng ngày; e2e portal-shell / admin-settings
  - `2ee4a629` UI: phụ đề "Thành viên OPC", phụ đề trang Dự án v4 (10 ngôn ngữ); Sự kiện / Vai trò lưới 2 cột ≤ 1023px; audit UAT-30 mở menu bằng `data-m="me"`
  - `8a5fa5e6` parity: kịch bản theo luồng v4 + `unreachable` cho phần v4 đã bỏ — **SHA đo toàn bộ**
  - `19d70f62` parity: báo cáo bỏ số cũ của màn `unreachable`, liệt kê kèm lý do
  - `d73b4a90` Admin: bỏ ghi chú duyệt vào nhóm (D-71), danh sách nhóm trong hộp gán 2 cột ≤ 1023px; đo lại Admin
  - `bd76fa08` DV / Q / completion / results
- REQ / D: REQ-517 · D-79 · §27.9

## Đo toàn bộ (số thật)

| Lần | SHA | Kết quả Playwright | Ghi chú |
|---|---|---|---|
| 1 | `8f5f6cce` | 217 passed · 243 failed · 60 skipped (24,0 phút) | 65 lỗi là kịch bản cũ không đi được trên v4 (đăng nhập không còn `type=email`, "34 nhóm", Dashboard không còn khối LIVE…) |
| 2 | `16479ff9` | 219 passed · 60 skipped (23,4 phút) | sau sửa nút ngôn ngữ + Cài đặt |
| 3 | `8a5fa5e6` | **235 passed · 199 failed (chỉ do > 3%) · 86 skipped** (8,9 phút) | 0 lỗi kịch bản; 86 skip = 43 màn `unreachable` × 2 khung |
| Admin | `d73b4a90` | 32 passed / 82 ảnh đo lại (D-0*, D-1*, D-2*, D-3*, D-86, D-89, D-96, D-97) | sau bỏ ghi chú duyệt + hộp gán nhóm |

`results.md` hiện: **434 ảnh / 223 màn đo được, 234 ảnh đạt** (98 màn đạt cả hai khung); **43 màn `unreachable`** liệt kê cuối file kèm lý do. Mọi dòng có SHA ≥ `8a5fa5e6` (sau V4-614 `97cc2ad5`).

Không mask thêm, không nới ngưỡng, không đổi FAIL → PASS, không sửa ảnh prototype. Retries / fixme / timeout không đổi.

## Phân loại

- **(a) kịch bản cũ không đi được trên v4 → sửa theo luồng v4**: ô đăng nhập (`placeholder="Nhập email hoặc số điện thoại"`), mắt "Hiện" là `title`, câu lỗi "email/số điện thoại", số nhóm `\d+` (90), Miền Trung `\d+`, Dự án Admin mở tab "Chờ duyệt" ở prototype, ô tìm Dự án v4, ô cỡ trang theo option, `[data-m="me"]` thay chữ "Founder OPC", Trang chủ chờ "Hướng dẫn bắt đầu", ô chọn vai trò trong hộp gán nhóm (`last`).
- **(b) phần v4 đã bỏ → `unreachable`** (lý do trong `results.md`): A-07 (prototype không dịch màn đăng nhập), A-09 (bỏ ChatGPT), A-17 / A-20 (bỏ MST / vai trò trên form), P-01-BOTCARD, P-02, P-03, P-04, P-06 (Dashboard v4 bỏ khối LIVE), P-57 (bỏ lọc giai đoạn), P-95 (Hồ sơ bỏ ô Dự án), D-53, D-54 (Admin Dự án bỏ dạng danh sách); cùng các màn đã `unreachable` từ TIP trước.
- **(c) lệch thật, sửa được trong D-xx đã có** (kèm test hành vi):

| Sửa | Màn | Trước → sau | Test hành vi |
|---|---|---|---|
| Nút ngôn ngữ thanh trên = quả địa cầu + viền, không cờ | toàn Portal | (một phần lệch thanh trên) | `language-menu.spec` (unit) + `portal-shell.spec` "ngôn ngữ, menu người dùng…" |
| Cài đặt bỏ ô khoảng ngày (`showRange = !aSettings`) | D-66…D-75 | D-73 @390 9,95 → 14,11 (*) | `admin-settings.spec` "Chung: …" |
| "Thành viên OPC" (prototype `userSub`) | thanh trên Portal | — | audit UAT-30 dùng `data-m="me"` |
| Phụ đề Dự án v4 | P-55…P-77 | — | (copy, i18n spec 162/162) |
| Sự kiện: ô thống kê 2 cột + Sắp diễn ra 1 cột ≤ 1023px | D-42…D-45 @390 | D-43 21,58 → 11,66 · D-44 24,53 → 15,75 | `admin-events.spec` |
| Thẻ vai trò 2 cột ≤ 1023px | D-69 @390 | khớp thẻ (phần còn lại DV-V4-615-9) | `admin-settings.spec` |
| Bỏ ghi chú "Yêu cầu tham gia nhóm do chủ nhóm… duyệt" (D-71) | D-23…D-31 | (*) | `admin-groups.spec` "lọc miền…" kiểm không còn ghi chú |
| Hộp gán nhóm: danh sách 2 cột ≤ 1023px | D-89 @390 | 3,76 → 1,48 đạt | `admin-members.spec` |

(*) Số tăng vì chỗ trống ghi chú / ô khoảng ngày cũ vô tình che lệch nội dung của prototype v4 (prototype có hàng lọc thứ hai / ít mục Cài đặt hơn); đã ghi trong DV-V4-615-7 / -9.

- **(d) lệch do quyết định đã chốt hoặc ngoài phạm vi → DV-V4-615-1…12** (`deviations.md`), câu hỏi Q-V4-615-1…5 (`questions.md`).

## Bảng màn > 3% (DV tương ứng)

| Màn | Tên | 1440 | 390 | DV |
|---|---|---|---|---|
| A-01 | Đăng nhập | 88,69 | 84,03 | DV-V4-615-1 |
| A-02 | Đăng nhập · bỏ trống | 87,87 | 80,99 | DV-V4-615-1 |
| A-03 | Đăng nhập · sai thông tin | 87,80 | 80,84 | DV-V4-615-1 |
| A-04 | Đăng nhập · hiện mật khẩu | 88,67 | 84,69 | DV-V4-615-1 |
| A-06 | Popover ngôn ngữ | 80,06 | 24,94 | DV-V4-615-1 |
| A-08 | SSO Google · đang chuyển hướng | 88,04 | 82,41 | DV-V4-615-1 |
| A-10 | Đăng ký · chọn loại TK | 83,48 | 85,70 | DV-V4-615-1 |
| A-12 | Đăng ký DN · trống | 91,19 | 75,18 | DV-V4-607-1 |
| A-16 | Đăng ký · chọn mã quốc gia SĐT | 82,59 | 50,81 | DV-V4-607-1 |
| A-18 | Đăng ký cá nhân · trống | 90,68 | 77,14 | DV-V4-607-1 |
| A-21 | OTP | 79,28 | 71,40 | DV-V4-607-1 |
| A-22 | OTP · thiếu số | 80,54 | 74,58 | DV-V4-607-1 |
| A-23 | OTP · gửi lại | 79,32 | 71,40 | DV-V4-607-1 |
| A-25 | Đăng ký · đổi loại | 83,48 | 83,63 | DV-V4-615-1 |
| A-26 | Quên mật khẩu | 91,50 | 86,78 | DV-V4-615-1 |
| A-27 | Quên mật khẩu · đã gửi | 88,88 | 81,07 | DV-V4-615-1 |
| A-28 | Quên mật khẩu · về đăng nhập | 88,69 | 80,90 | DV-V4-615-1 |
| A-29 | Đăng xuất | 88,39 | 83,79 | DV-V4-615-1 |
| A-31 | Đăng ký · mã giới thiệu hợp lệ (✓ Được giới thiệu bởi …) | 90,77 | 77,22 | DV-V4-607-1 |
| A-32 | Đăng ký · mã giới thiệu không tồn tại | 90,77 | 77,22 | DV-V4-607-1 |
| P-01 | Dashboard | 72,01 | 75,30 | DV-V4-606-1, DV-V4-611-1 |
| P-05 | Modal mail chào mừng | 4,52 | 4,71 | DV-V4-606-1, DV-V4-607-2 |
| P-104 | Popup Gói Gọi vốn · sau khi gửi dự án có gọi vốn | 0,63 | 15,94 | DV-V4-610-4 |
| P-105 | Gian hàng · Khám phá (mặc định) | 3,69 | 0,86 | DV-V4-608-1 |
| P-121 | Chat · tin đã bị ẩn sau khi báo cáo (V4-612) | 2,10 | 6,25 | DV-V4-612-1 |
| P-13 | Sidebar thu gọn | 64,47 | — | DV-V4-606-1 |
| P-15 | Breadcrumb Trang chủ | 72,02 | — | DV-V4-606-1 |
| P-17 | Cộng đồng | 43,16 | 65,39 | DV-V4-615-2, DV-V4-606-1 |
| P-18 | Cộng đồng · tìm kiếm | 47,13 | 70,76 | DV-V4-615-2, DV-V4-606-1 |
| P-19 | Cộng đồng · đã tham gia | 29,01 | 54,18 | DV-V4-615-2, DV-V4-606-1 |
| P-20 | Cộng đồng · khu vực + sắp xếp | 43,34 | 64,99 | DV-V4-615-2 |
| P-21 | Cộng đồng · trống | 2,52 | 26,37 | DV-V4-615-2 |
| P-22 | Cộng đồng · trang 2 | 43,11 | 64,30 | DV-V4-615-2 |
| P-23 | Tham gia · nhóm công khai | 22,75 | 9,85 | DV-V4-603-4 |
| P-26 | Cộng đồng · đã tham gia nhóm công khai | 42,57 | 65,01 | DV-V4-615-2, DV-V4-603-3 |
| P-27 | Cộng đồng · rời nhóm | 43,06 | 65,13 | DV-V4-615-2, DV-V4-603-3 |
| P-28 | Chat · phòng mặc định | 1,34 | 3,78 | DV-V4-615-4 |
| P-30 | Chat · đổi nhóm | 1,30 | 4,11 | DV-V4-615-4 |
| P-34 | Chat · đã gửi tin | 1,55 | 5,21 | DV-V4-615-4 |
| P-36 | Chat · chọn tin | 1,56 | 4,15 | DV-V4-615-4 |
| P-37 | Chat · đang trả lời | 1,17 | 3,24 | DV-V4-615-4 |
| P-38 | Chat · danh sách ghim | 1,17 | 3,41 | DV-V4-615-4 |
| P-39 | Chat · tìm trong phòng | 1,07 | 3,23 | DV-V4-615-4 |
| P-40 | Chat · bảng Thành viên | 2,96 | 9,12 | DV-V4-603-2 |
| P-45 | Chat · đã báo cáo tin | 2,10 | 6,25 | DV-V4-612-1 |
| P-46 | Chat · xem trước nhóm chưa tham gia | 4,47 | 14,94 | DV-V4-603-5 |
| P-47 | Chat · chưa tham gia nhóm nào | 0,95 | 6,97 | DV-V4-615-4 |
| P-48 | Chat · tham gia thêm nhóm | 43,16 | 65,50 | DV-V4-615-2 |
| P-55 | Dự án · khám phá | 50,76 | 58,65 | DV-V4-615-3 |
| P-56 | Dự án · dạng bảng | 49,70 | 53,50 | DV-V4-615-3 |
| P-58 | Dự án · trống | 56,66 | 46,37 | DV-V4-615-3 |
| P-59 | Dự án · theo dõi | 48,66 | 53,79 | DV-V4-615-3 |
| P-60 | Dự án của tôi | 0,30 | 5,25 | DV-V4-615-12 |
| P-62 | Chi tiết dự án · Tổng quan | 28,42 | 32,23 | DV-V4-610-2 |
| P-63 | Chi tiết dự án · Cập nhật | 2,97 | 11,62 | DV-V4-610-3 |
| P-64 | Chi tiết dự án · Đội ngũ | 3,26 | 19,74 | DV-V4-610-3 |
| P-65 | Chi tiết dự án · Góp ý | 3,80 | 7,25 | DV-V4-610-3 |
| P-66 | Góp ý · ô trả lời | 4,53 | 7,23 | DV-V4-610-3 |
| P-67 | Góp ý · trống | 3,60 | 6,80 | DV-V4-610-3 |
| P-68 | Dự án · repo riêng tư, đã xin quyền | 32,88 | 31,86 | DV-V4-610-2 |
| P-73 | Form đăng dự án | 20,68 | 3,45 | DV-V4-615-3 |
| P-74 | Form dự án · báo thiếu tên | 20,58 | 3,68 | DV-V4-615-3 |
| P-75 | Form dự án · mở gọi vốn | 19,52 | 2,28 | DV-V4-615-3 |
| P-76 | Form dự án · chỉnh sửa | 1,51 | 3,64 | DV-V4-615-12 |
| P-81 | Form tư vấn · doanh nghiệp (mặc định) | 3,93 | 4,11 | DV-V4-601-1, DV-V4-605-2 |
| P-82 | Form tư vấn · báo thiếu | 12,28 | 16,40 | DV-V4-601-2, DV-V4-605-2 |
| P-89 | Hồ sơ · thông tin cá nhân | 0,73 | 7,27 | DV-V4-615-4, DV-V4-601-3, DV-V4-603-6 |
| P-90 | Hồ sơ · báo thiếu họ tên | 0,73 | 8,78 | DV-V4-615-4 |
| P-91 | Hồ sơ · thông tin doanh nghiệp | 1,38 | 7,34 | DV-V4-615-4 |
| P-92 | Hồ sơ · nhóm & hoạt động | 0,69 | 6,61 | DV-V4-615-4 |
| P-93 | Hồ sơ · bảo mật | 19,76 | 19,25 | DV-V4-615-4 |
| P-94 | Đổi mật khẩu · báo thiếu | 19,76 | 20,25 | DV-V4-615-4 |
| D-01 | Admin AppShell · Tổng quan | 35,18 | 4,15 | DV-V4-615-6, DV-V4-606-3, DV-V4-614-2 |
| D-02 | Admin · menu người dùng | 35,18 | 4,14 | DV-V4-615-6, DV-V4-606-3 |
| D-03 | Admin · Hồ sơ cá nhân (không đổi màn) | 39,02 | 33,09 | DV-V4-615-6, DV-V4-606-3 |
| D-04 | Admin · thông báo | 35,52 | 4,30 | DV-V4-615-6, DV-V4-606-3 |
| D-05 | Admin · sidebar thu gọn | 42,17 | — | DV-V4-615-6, DV-V4-606-3 |
| D-07 | Thành viên · danh sách | 1,89 | 10,94 | DV-V4-606-4, DV-V4-611-3 |
| D-08 | Thành viên · lưới | 3,09 | 10,38 | DV-V4-606-4, DV-V4-611-3 |
| D-09 | Thành viên · lọc Doanh nghiệp | 1,33 | 14,05 | DV-V4-606-4, DV-V4-611-4 |
| D-10 | Thành viên · chọn nhiều | 2,80 | 11,44 | DV-V4-606-4, DV-V4-611-3 |
| D-11 | Thành viên · khóa hàng loạt | 3,95 | 12,12 | DV-V4-606-4, DV-V4-611-3 |
| D-12 | Modal gán vào nhóm | 3,14 | 1,48 | DV-V4-606-4, DV-V4-611-4 |
| D-13 | Thành viên · menu dòng | 2,14 | 3,88 | DV-V4-606-4, DV-V4-611-4 |
| D-14 | Thành viên · đã khóa 1 dòng | 1,91 | 12,46 | DV-V4-606-4, DV-V4-611-3 |
| D-17 | Thành viên · 6/trang, trang 2 | 0,79 | 17,78 | DV-V4-606-4, DV-V4-611-3 |
| D-23 | Nhóm cộng đồng · lưới | 14,54 | 31,51 | DV-V4-615-7 |
| D-24 | Nhóm cộng đồng · danh sách | 7,13 | 12,77 | DV-V4-615-7 |
| D-25 | Nhóm cộng đồng · Miền Trung | 16,42 | 36,53 | DV-V4-615-7 |
| D-26 | Nhóm cộng đồng · chọn nhiều | 7,15 | 12,81 | DV-V4-615-7 |
| D-27 | Nhóm cộng đồng · trang 2 | 18,91 | 34,98 | DV-V4-615-7 |
| D-28 | Drawer tạo nhóm | 6,93 | 3,98 | DV-V4-615-7 |
| D-29 | Tạo nhóm · báo thiếu tên | 6,98 | 3,90 | DV-V4-615-7 |
| D-30 | Drawer sửa nhóm | 7,09 | 4,69 | DV-V4-615-7 |
| D-31 | Modal xuất danh sách thành viên | 6,53 | 0,63 | DV-V4-615-7 |
| D-32 | Xem chat từ admin (không đổi màn) | 54,54 | 84,42 | DV-V4-615-12 |
| D-36 | Bot · nhật ký tự động | 2,06 | 6,15 | DV-V4-615-8 |
| D-37 | Bot · Persona | 6,82 | 6,86 | DV-V4-615-8 |
| D-39 | Bot · Kịch bản hội thoại | 7,83 | 9,53 | DV-V4-615-8 |
| D-41 | Bot · Hội thoại | 20,96 | 17,64 | DV-V4-615-8 |
| D-43 | Sự kiện · danh sách | 0,32 | 11,66 | DV-V4-615-10 |
| D-44 | Sự kiện · Đã đầy → chi tiết sự kiện (Demo Day) | 0,25 | 15,75 | DV-V4-615-10 |
| D-57 | Dự án · Đang hiển thị | 32,70 | 36,78 | DV-V4-615-5 |
| D-66 | Cài đặt · Chung | 0,30 | 10,37 | DV-V4-615-9 |
| D-67 | Cài đặt · Danh mục lĩnh vực | 40,76 | 44,29 | DV-V4-615-9 |
| D-68 | Lĩnh vực · đang sửa | 40,77 | 44,22 | DV-V4-615-9 |
| D-69 | Cài đặt · Vai trò & phân quyền | 2,68 | 66,05 | DV-V4-615-9 |
| D-70 | Cài đặt · Email chào mừng | 16,40 | 13,92 | DV-V4-615-9 |
| D-71 | Cài đặt · SMTP | 0,24 | 12,50 | DV-V4-615-9 |
| D-72 | SMTP · lỗi xác thực | 0,24 | 16,33 | DV-V4-615-9 |
| D-73 | Cài đặt · Tài khoản quản trị | 0,72 | 14,11 | DV-V4-615-9 |
| D-74 | Tài khoản quản trị · hộp thoại tạo TK (§21 RB-R02) | 2,42 | 8,06 | DV-V4-615-11, DV-V4-615-9 |
| D-75 | Cài đặt · Nhật ký hoạt động | 0,70 | 12,87 | DV-V4-615-9 |
| D-80 | Toast toàn cục | 0,18 | 5,88 | DV-V4-615-11 |
| D-81 | Xem thử vai trò Kế toán · menu + dải cam (RB-R09, AT-RB02) | 29,10 | 3,68 | DV-V4-615-6 |
| D-82 | Chế độ chỉ xem · Giảng viên mở Thành viên (AT-RB03) | 1,71 | 10,33 | DV-V4-615-11 |
| D-83 | Đổi mật khẩu lần đầu (AT-SEC01, RB-R02) | 85,77 | — | DV-V4-615-12 |
| D-84-AFF | Admin · Affiliate · Đại lý mặc định | 24,18 | 29,42 | DV-V4-602-1 |
| D-84-POL | Admin · Affiliate · Chính sách | 2,08 | 13,61 | DV-V4-602-2 |
| D-85-CUS | Admin · Affiliate · Khách hàng của đại lý | 1,78 | 11,03 | DV-V4-602-3 |
| D-86 | Tạo nhóm · + Thêm chủ đề (NA-09, chỉ quản trị tạo) | 7,75 | 1,95 | DV-V4-615-7 |
| D-89 | Gán vào nhóm · vai trò Giảng viên (GR-R01) | 3,14 | 1,48 | DV-V4-615-12 |
| D-93 | Admin › Gian hàng (KPI, chip, bảng) | 3,17 | 3,10 | DV-V4-608-3 |
| D-96 | Thành viên · cột Khởi đầu x/8 | 3,69 | 5,43 | DV-V4-611-2 |
| D-97 | Thành viên · lọc Khởi đầu "Chưa hoàn tất" | 3,69 | 5,43 | DV-V4-611-2 |

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (portal 6 / admin 5 cảnh báo có sẵn) |
| typecheck | portal, admin, ui, e2e sạch |
| unit | ui 49 · portal 397 · admin 453 · i18n portal 162/162 |
| depcheck | sạch |
| build | portal + admin (MSW) |
| e2e behavior | portal-shell, admin-settings, a-01-login, i18n, i18n-screens, admin-shell: **65/65**; admin-groups + admin-members: **18/18**; admin-events, admin-settings, projects, profile, portal-shell (bản build cuối): **48/48** |

Không đụng server / db → không chạy test:int trong TIP (chạy toàn bộ ở cuối pha P5).

## Chưa làm / chờ owner

- Duyệt DV-V4-615-1…12; trả lời Q-V4-615-1…5 (màn auth v4, trang Dự án v4, ảnh đại diện chữ viết tắt, khối "Luồng hệ thống", danh mục lĩnh vực đa phạm vi).
- Nhóm ngành (56 nhóm) + dải NQ86 ở Cộng đồng (Q-V4-603-4) — chưa có D-xx.
