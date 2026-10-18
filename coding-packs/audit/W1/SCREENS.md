# AUDIT-W1 — Danh sách màn đã dùng thử (SCREENS)

> `e2e/audit/walk.audit.ts`: đi qua **toàn bộ 205 kịch bản** trong registry parity (`e2e/parity/registry`) phía app trên server thật, viewport 1440, MSW tắt; reset `seed:demo` mỗi 15 màn. Bắt: response `/v1` ≥ 400 (trừ 401 refresh), `pageerror`, console error, chữ "Lỗi hệ thống", tràn ngang, bước thao tác hỏng. Kiểm lại các màn nghi ngờ bằng `walk-recheck.audit.ts`.
> Viewport 390 được kiểm ở UAT-31 (ĐẠT). Dữ liệu thô: `work/screens.jsonl`, `work/screens-recheck.jsonl`.

**Ký hiệu kết quả:** `OK` không lỗi · `OK*` chỉ có React #418 khi cài clock lệch (artefact đo, ghi ở BUG-040; probe đồng hồ thật 0 lỗi) · `BỎ` registry đánh dấu unreachable (không có lối vào trên prototype hoặc trạng thái không dựng được — có lý do) · `XEM` có tín hiệu khác, xem ghi chú.

## Đếm

| Kết quả | Số |
|---|---|
| BỎ | 10 |
| OK | 61 |
| OK* | 123 |
| XEM | 11 |
| **Tổng** | **205** |

Không màn nào hiện "Lỗi hệ thống" hay tràn ngang ở 1440 trong lượt đi. Các tín hiệu `XEM` đã phân loại: không phải lỗi sản phẩm mới, trừ những gì đã nằm trong BUGS (P-05 đúng đặc tả).

## Bảng màn

| ID | Màn | Kết quả | Ghi chú |
|---|---|---|---|
| A-01 | Đăng nhập | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-02 | Đăng nhập · bỏ trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-03 | Đăng nhập · sai thông tin | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-04 | Đăng nhập · hiện mật khẩu | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-05 | Đăng nhập · điền TK dùng thử | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-06 | Popover ngôn ngữ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-07 | Giao diện tiếng Anh | OK |  |
| A-08 | SSO Google · đang chuyển hướng | OK |  |
| A-09 | SSO ChatGPT · qua Google | OK |  |
| A-10 | Đăng ký · chọn loại TK | OK |  |
| A-11 | Đăng ký đang tạm đóng | BỎ | Cần admin tắt "Cho phép tự đăng ký" rồi đăng xuất; state không giữ qua hai app tách (D-26). Kiểm bằng test hàn |
| A-12 | Đăng ký DN · trống | OK |  |
| A-13 | Đăng ký DN · MST sai | OK |  |
| A-14 | Đăng ký DN · tra MST thấy | OK |  |
| A-15 | Đăng ký DN · bỏ ngành phụ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-16 | Đăng ký · chọn mã quốc gia SĐT | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-17 | Đăng ký DN · báo thiếu MST | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-18 | Đăng ký cá nhân · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-19 | Đăng ký cá nhân · chọn vai trò | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-20 | Đăng ký cá nhân · báo thiếu vai trò | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-21 | OTP | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-22 | OTP · thiếu số | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-23 | OTP · gửi lại | XEM | 429 gửi lại OTP đúng giới hạn; kiểm lại sau flush: chỉ còn #418 |
| A-24 | OTP · kích hoạt xong | BỎ | Prototype quay về màn đăng nhập; app mới vào thẳng /community theo D-30 — kiểm bằng test hành vi. |
| A-25 | Đăng ký · đổi loại | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-26 | Quên mật khẩu | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-27 | Quên mật khẩu · đã gửi | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-28 | Quên mật khẩu · về đăng nhập | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-29 | Đăng xuất | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| A-30 | Đăng nhập · không bật SSO | BỎ | Panel SSO của admin không có lối vào trên prototype (C-05). |
| P-01 | Dashboard | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-02 | Dashboard · chọn thành viên | OK |  |
| P-03 | Dashboard · xem thêm tỉnh/thành | OK |  |
| P-04 | Dashboard · lọc LIVE + 8/trang | OK |  |
| P-05 | Modal mail chào mừng | XEM | đúng BR-03 (402 khi chưa đóng phí) |
| P-06 | Dashboard · tham gia thảo luận | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-07 | Thông báo | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-08 | Thông báo · chưa đọc | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-09 | Thông báo · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-10 | Thông báo · mở nhắc tên | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-11 | Topbar · ngôn ngữ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-12 | Topbar · menu người dùng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-13 | Sidebar thu gọn | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-14 | Drawer điều hướng | XEM | kịch bản viết cho 390px (nút Menu); kiểm lại: chỉ còn #418 |
| P-15 | Breadcrumb Trang chủ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-16 | Sidebar · sự kiện gần nhất | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-17 | Cộng đồng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-18 | Cộng đồng · tìm kiếm | OK |  |
| P-19 | Cộng đồng · đã tham gia | OK |  |
| P-20 | Cộng đồng · khu vực + sắp xếp | OK |  |
| P-21 | Cộng đồng · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-22 | Cộng đồng · trang 2 | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-23 | Tham gia · nhóm công khai | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-24 | Tham gia · nhóm cần duyệt, chưa đồng ý | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-25 | Cộng đồng · chờ duyệt | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-26 | Cộng đồng · đã tham gia nhóm công khai | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-27 | Cộng đồng · rời nhóm | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-28 | Chat · phòng mặc định | OK |  |
| P-29 | Chat · đổi chủ đề | XEM | kịch bản phụ thuộc dữ liệu prototype; kiểm lại: chỉ còn #418 |
| P-30 | Chat · đổi nhóm | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-31 | Chat · form tạo chủ đề | OK |  |
| P-32 | Chat · đã tạo chủ đề | OK |  |
| P-33 | Chat · chủ đề trống | XEM | 409 phòng trùng do dữ liệu lượt trước; kiểm lại: chỉ còn #418 |
| P-34 | Chat · đã gửi tin | OK |  |
| P-35 | Chat · gợi ý nhắc tên | OK |  |
| P-36 | Chat · chọn tin | OK |  |
| P-37 | Chat · đang trả lời | OK |  |
| P-38 | Chat · danh sách ghim | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-39 | Chat · tìm trong phòng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-40 | Chat · bảng Thành viên | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-41 | Chat · duyệt yêu cầu vào nhóm | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-42 | Chat · bảng File | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-43 | Chat · bảng Đã ghim | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-44 | Modal báo cáo tin | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-45 | Chat · đã báo cáo tin | OK |  |
| P-46 | Chat · xem trước nhóm chưa tham gia | OK |  |
| P-47 | Chat · chưa tham gia nhóm nào | OK |  |
| P-48 | Chat · tham gia thêm nhóm | XEM | kịch bản phụ thuộc dữ liệu lượt trước; kiểm lại: OK |
| P-49 | Sự kiện | OK |  |
| P-50 | Sự kiện · đã đăng ký | OK |  |
| P-51 | Sự kiện · trống | OK |  |
| P-52 | Chi tiết sự kiện | XEM | CSP chặn script Google Maps do bộ audit chặn ảnh ngoài |
| P-53 | Sự kiện · đăng ký e1 | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-54 | Sự kiện · hết chỗ | XEM | như P-52 (CSP chặn script Google Maps trong iframe) |
| P-55 | Dự án · khám phá | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-56 | Dự án · dạng bảng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-57 | Dự án · lọc giai đoạn + sắp xếp | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-58 | Dự án · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-59 | Dự án · theo dõi | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-60 | Dự án của tôi | OK |  |
| P-61 | Dự án của tôi · trống | BỎ | TK demo duy nhất của prototype sở hữu p10 (OPC Hub Mobile); không có user nào chưa có dự án. |
| P-62 | Chi tiết dự án · Tổng quan | OK |  |
| P-63 | Chi tiết dự án · Cập nhật | OK |  |
| P-64 | Chi tiết dự án · Đội ngũ | OK |  |
| P-65 | Chi tiết dự án · Góp ý | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-66 | Góp ý · ô trả lời | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-67 | Góp ý · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-68 | Dự án · repo riêng tư, đã xin quyền | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-69 | Dự án · khối gọi vốn | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-70 | Modal quan tâm đầu tư | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-71 | Đã gửi quan tâm đầu tư | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-72 | Chủ dự án · nhà đầu tư quan tâm | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-73 | Form đăng dự án | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-74 | Form dự án · báo thiếu tên | OK |  |
| P-75 | Form dự án · mở gọi vốn | OK |  |
| P-76 | Form dự án · chỉnh sửa | OK |  |
| P-77 | Dự án · đã lưu nháp | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-78 | Modal chia sẻ dự án | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-79 | Popup Gói dịch vụ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-80 | Form tư vấn · cá nhân | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-81 | Form tư vấn · doanh nghiệp (mặc định) | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-82 | Form tư vấn · báo thiếu | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-83 | Đã gửi yêu cầu tư vấn | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-84 | Thông tin chuyển khoản | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-85 | Chuyển khoản · đã sao chép | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-86 | Chuyển khoản · đang đối soát | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-87 | Popup bắt đóng phí | BỎ | Prototype chỉ có TK m1 và luôn tính lại phí m1 = còn hiệu lực mỗi lần render (FEE.m1); không có TK chưa đóng p |
| P-88 | Banner chờ thanh toán | BỎ | Mã chết trên prototype: payBanner:false gán cứng (C-01). |
| P-89 | Hồ sơ · thông tin cá nhân | OK |  |
| P-90 | Hồ sơ · báo thiếu họ tên | OK |  |
| P-91 | Hồ sơ · thông tin doanh nghiệp | OK |  |
| P-92 | Hồ sơ · nhóm & hoạt động | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-93 | Hồ sơ · bảo mật | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-94 | Đổi mật khẩu · báo thiếu | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| P-95 | Hồ sơ · số Dự án → Dự án của tôi | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-01 | Admin AppShell · Tổng quan | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-02 | Admin · menu người dùng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-03 | Admin · Hồ sơ cá nhân (không đổi màn) | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-04 | Admin · thông báo | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-05 | Admin · sidebar thu gọn | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-06 | Admin · drawer điều hướng | XEM | kịch bản viết cho 390px; kiểm lại: bước bấm vẫn hỏng ở 1440 (artefact kịch bản) |
| D-07 | Thành viên · danh sách | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-08 | Thành viên · lưới | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-09 | Thành viên · lọc Doanh nghiệp | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-10 | Thành viên · chọn nhiều | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-11 | Thành viên · khóa hàng loạt | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-12 | Modal gán vào nhóm | OK |  |
| D-13 | Thành viên · menu dòng | OK |  |
| D-14 | Thành viên · đã khóa 1 dòng | XEM | kiểm lại: OK |
| D-15 | Thành viên · đổi quyền hệ thống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-16 | Drawer hồ sơ đăng ký | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-17 | Thành viên · 6/trang, trang 2 | OK |  |
| D-18 | Phí thành viên | OK |  |
| D-19 | Phí · chờ thanh toán | OK |  |
| D-20 | Phí · chọn nhiều | OK |  |
| D-21 | Phí · ghi nhận đã thu | OK |  |
| D-22 | Phí · 6/trang, trang 2 | OK |  |
| D-23 | Nhóm cộng đồng · lưới | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-24 | Nhóm cộng đồng · danh sách | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-25 | Nhóm cộng đồng · Miền Trung | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-26 | Nhóm cộng đồng · chọn nhiều | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-27 | Nhóm cộng đồng · trang 2 | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-28 | Drawer tạo nhóm | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-29 | Tạo nhóm · báo thiếu tên | OK |  |
| D-30 | Drawer sửa nhóm | OK |  |
| D-31 | Modal xuất danh sách thành viên | OK |  |
| D-32 | Xem chat từ admin (không đổi màn) | OK |  |
| D-33 | Kiểm duyệt tin nhắn | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-34 | Kiểm duyệt · hết tin | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-35 | Kiểm duyệt · thêm từ khóa | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-36 | Bot · nhật ký tự động | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-37 | Bot · Persona | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-38 | Drawer persona | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-39 | Bot · Kịch bản hội thoại | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-40 | Drawer kịch bản | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-41 | Bot · Hội thoại | OK |  |
| D-42 | Sự kiện · lưới | OK |  |
| D-43 | Sự kiện · danh sách | OK |  |
| D-44 | Sự kiện · Đã đầy | OK |  |
| D-45 | Sự kiện · 6/trang | OK |  |
| D-46 | Drawer danh sách đăng ký | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-47 | Drawer tạo sự kiện | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-48 | Tạo sự kiện · Online | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-49 | Drawer sửa sự kiện | XEM | như P-52 |
| D-50 | Sự kiện · chia sẻ | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-51 | Dự án · chờ duyệt | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-52 | Dự án · Bị từ chối (trống) | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-53 | Dự án · danh sách | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-54 | Dự án · chọn nhiều | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-55 | Drawer duyệt dự án | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-56 | Dự án · đã duyệt | OK |  |
| D-57 | Dự án · Đang hiển thị | OK |  |
| D-58 | Nhà đầu tư | OK |  |
| D-59 | Nhà đầu tư · Quỹ | OK |  |
| D-60 | Drawer nhà đầu tư | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-61 | Dịch vụ · yêu cầu | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-62 | Dịch vụ · trống | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-63 | Drawer yêu cầu YC-1005 | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-64 | Yêu cầu · từ chối | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-65 | Dịch vụ · danh mục | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-66 | Cài đặt · Chung | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-67 | Cài đặt · Danh mục lĩnh vực | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-68 | Lĩnh vực · đang sửa | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-69 | Cài đặt · Vai trò & phân quyền | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-70 | Cài đặt · Email chào mừng | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-71 | Cài đặt · SMTP | OK |  |
| D-72 | SMTP · lỗi xác thực | OK |  |
| D-73 | Cài đặt · Tài khoản quản trị | OK |  |
| D-74 | Tài khoản quản trị · đã mời | OK |  |
| D-75 | Cài đặt · Nhật ký hoạt động | OK* | chỉ có React #418 (artefact clock — BUG-040) |
| D-76 | Cài đặt · SSO | BỎ | Panel SSO: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-77 | Cài đặt · Ngôn ngữ | BỎ | Panel ngôn ngữ: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-78 | Marketing | BỎ | Không có mục sidebar cho aTab='marketing' (C-05). |
| D-79 | Modal tạo chiến dịch email | BỎ | Chỉ mở được từ màn Marketing (D-78) — không có lối vào (C-05). |
| D-80 | Toast toàn cục | OK* | chỉ có React #418 (artefact clock — BUG-040) |

## Kiểm form / biên / chéo vai trò (`e2e/audit/forms.audit.ts`)

| Kiểm | Kết quả | BUG |
|---|---|---|
| Tạo sự kiện · Bỏ trống trường bắt buộc chỉ báo bằng toast, không báo tại ô | CÓ VẤN ĐỀ | BUG-022 |
| Tạo nhóm · Bỏ trống trường bắt buộc chỉ báo bằng toast, không báo tại ô | CÓ VẤN ĐỀ | BUG-022 |
| Tạo sự kiện · ảnh bìa · Ảnh bìa ~90KB (body ~89KB) | OK | — |
| Tạo sự kiện · ảnh bìa · Ảnh bìa ~300KB (body ~296KB) | CÓ VẤN ĐỀ | BUG-002 |
| Tạo sự kiện · ảnh bìa · Ảnh bìa ~1500KB (body ~1480KB) | CÓ VẤN ĐỀ | BUG-002 |
| Tạo sự kiện (UI) · ảnh 300KB · Lưu sự kiện có ảnh bìa 300KB qua UI | CÓ VẤN ĐỀ | BUG-002 |
| Admin khoá TK → Portal · Khoá TK không ẩn dự án, không chuyển nhóm làm chủ (user.locked không có consumer) | CÓ VẤN ĐỀ | BUG-004 |
| Đăng ký tư vấn · Gửi 2 lần cùng Idempotency-Key | OK | — |
| Góp ý dự án · Rich text / script trong bình luận | CÓ VẤN ĐỀ | BUG-020 |
| Tạo nhóm · Tên 5.000 ký tự | OK | — |
| Quên mật khẩu → mail → /reset-password · Link đặt lại mật khẩu trong mail mở trang 404 | CÓ VẤN ĐỀ | BUG-001 |
| Kiểm duyệt → Chat Portal · Admin ẩn tin bị báo cáo → Portal không còn thấy | OK | — |
| Phí hết hạn → Portal · Phí hết hạn → popup bắt buộc hiện lại, API trả 402 | CÓ VẤN ĐỀ | BUG-018 |

## Luồng mail đã đi

| Luồng | Kết quả |
|---|---|
| OTP đăng ký (UAT-02) | mail `otp` ghi log, OTP đúng → vào Portal |
| Chào mừng (UAT-04, UAT-29) | ghi log; sửa mẫu → mail thử có nội dung mới. Link `/huong-dan` chết (BUG-023) |
| Quên mật khẩu (UAT-11) | mail `password_reset` ghi log; link → 404 (BUG-001) |
| Xác nhận đăng ký sự kiện (UAT-16) | 1 mail `event` |
| SMTP thiếu key (UAT-28) | 400 |
