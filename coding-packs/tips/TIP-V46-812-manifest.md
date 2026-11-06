# TIP-V46-812 — execution manifest

Status: stage1 baseline; no application source edited.
Baseline source: 8a33b3f1 (TIP only), dev682a4b9e; TIP811 PR90 merged.
Owner explicitly approved private opchub_v46_801_dev/test + Memurai6381, keeping all current HOLD processes. Original DBs/Redis6379 are not targets. No migration/schema/API/business change permitted. New Next-only ports planned MSW3930/3931 and native3710/3711 after free-port checks; existing API4300/socket4301/worker remain HOLD. No .env edits.

## Phase1 inventory

Registry imported directly through tsx: 295 scenarios. Playwright --list:580 tests (including capture harness). Explicit unreachable entries remain inventoried. Per-scenario viewports remain as registry defines them; no added skip/timeout/retry or threshold change. Full baseline list/log retained locally.
Native selection: 56 scenarios, exact IDs saved in ignored v46-812-native-parity-ids.txt; v4.6 + affected groups below. MSW measures entire registry.

| ID | Name | Group | Prerequisite / unreachable |
|---|---|---|---|
| P-V46-SEARCH | Topbar · global search | v4.6 P1–P17 | user |
| D-V46-SEARCH | Topbar · global search Admin | v4.6 P1–P17 | admin |
| P-V46-REG-BANNER | Portal · GĐ Vùng · Banner | v4.6 P1–P17 | affiliate |
| P-V46-REG | Portal · Vùng của tôi | v4.6 P1–P17 | affiliate |
| D-120-GDV | GĐ Vùng · Sổ chia sẻ | v4.6 P1–P17 | affiliate |
| D-120-GDV-OPEN | GĐ Vùng · Khoản ghi nhận Miền Bắc | v4.6 P1–P17 | affiliate |
| D-120-GCFG | Cấu hình Giám đốc Vùng | v4.6 P1–P17 | affiliate |
| D-120-GCFG-RO | Cấu hình GĐ Vùng · Kế toán chỉ xem | v4.6 P1–P17 | affiliate |
| D-78-GDV | Marketing · Email hệ thống GĐ Vùng | v4.6 P1–P17 | admin |
| D-18-GDV | Phí · Miễn phí GĐ Vùng | v4.6 P1–P17 | admin |
| A-01 | Đăng nhập | v4.6 P1–P17 | auth |
| A-02 | Đăng nhập · bỏ trống | remaining registry | auth |
| A-03 | Đăng nhập · sai thông tin | remaining registry | auth |
| A-04 | Đăng nhập · hiện mật khẩu | remaining registry | auth |
| A-05 | Đăng nhập · điền TK dùng thử | remaining registry | unreachable: Ver2 bỏ khối "Tài khoản dùng thử – bấm để điền" khỏi màn đăng nhập prototype (app ẩn qua NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS) |
| A-06 | Popover ngôn ngữ | remaining registry | auth |
| A-07 | Giao diện tiếng Anh | remaining registry | unreachable: Prototype v4 lỗi: màn đăng nhập không dịch theo ngôn ngữ (chọn English chỉ đổi nhãn nút, không có "Remember me") → không có ảnh chuẩn; i18n app kiểm ở e2e i18n.spec |
| A-08 | SSO Google · đang chuyển hướng | remaining registry | auth |
| A-09 | SSO ChatGPT · qua Google | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 chỉ còn nút Google (không còn ChatGPT / Gemini / DeepSeek) ở cả hai bên |
| A-10 | Đăng ký · chọn loại TK | remaining registry | auth |
| A-11 | Đăng ký đang tạm đóng | remaining registry | unreachable: Cần admin tắt "Cho phép tự đăng ký" rồi đăng xuất; state không giữ qua hai app tách (D-26). Kiểm bằng test hành vi. |
| A-12 | Đăng ký DN · trống | remaining registry | auth |
| A-13 | Đăng ký DN · MST sai | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 bỏ ô MST / vai trò / nhóm khỏi form đăng ký (chuyển sang popup khai báo P-100 → P-102, đo ở portal-declaration) |
| A-14 | Đăng ký DN · tra MST thấy | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 bỏ ô MST / vai trò / nhóm khỏi form đăng ký (chuyển sang popup khai báo P-100 → P-102, đo ở portal-declaration) |
| A-15 | Đăng ký DN · bỏ ngành phụ | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 bỏ ô MST / vai trò / nhóm khỏi form đăng ký (chuyển sang popup khai báo P-100 → P-102, đo ở portal-declaration) |
| A-16 | Đăng ký · chọn mã quốc gia SĐT | remaining registry | auth |
| A-17 | Đăng ký DN · báo thiếu người đại diện | remaining registry | auth |
| A-18 | Đăng ký cá nhân · trống | remaining registry | auth |
| A-19 | Đăng ký cá nhân · chọn vai trò | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 bỏ ô MST / vai trò / nhóm khỏi form đăng ký (chuyển sang popup khai báo P-100 → P-102, đo ở portal-declaration) |
| A-20 | Đăng ký cá nhân · báo thiếu email | remaining registry | auth |
| A-21 | OTP | remaining registry | auth |
| A-22 | OTP · thiếu số | remaining registry | auth |
| A-23 | OTP · gửi lại | remaining registry | auth |
| A-24 | OTP · kích hoạt xong | remaining registry | unreachable: Prototype quay về màn đăng nhập; app mới vào thẳng /community theo D-30 — kiểm bằng test hành vi. |
| A-25 | Đăng ký · đổi loại | remaining registry | auth |
| A-26 | Quên mật khẩu | remaining registry | auth |
| A-27 | Quên mật khẩu · đã gửi | remaining registry | auth |
| A-28 | Quên mật khẩu · về đăng nhập | remaining registry | auth |
| A-29 | Đăng xuất | remaining registry | user |
| A-30 | Đăng nhập · không bật SSO | remaining registry | unreachable: Panel SSO của admin không có lối vào trên prototype (C-05). |
| A-31 | Đăng ký · mã giới thiệu hợp lệ (✓ Được giới thiệu bởi …) | remaining registry | auth |
| A-32 | Đăng ký · mã giới thiệu không tồn tại | remaining registry | auth |
| P-01 | Dashboard | v4.6 P1–P17 | stores |
| P-02 | Dashboard · chọn thành viên | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE nên không có danh sách thành viên đang hoạt động ở cả hai bên |
| P-03 | Dashboard · xem thêm tỉnh/thành | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE nên không có "Xem thêm N tỉnh/thành" ở cả hai bên |
| P-04 | Dashboard · lọc LIVE + 8/trang | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE nên không có bộ lọc LIVE / cỡ trang ở cả hai bên |
| P-05 | Modal mail chào mừng | remaining registry | auth |
| P-06 | Dashboard · tham gia thảo luận | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE nên không có "Tham gia thảo luận →" ở cả hai bên |
| P-07 | Thông báo | remaining registry | user |
| P-08 | Thông báo · chưa đọc | remaining registry | user |
| P-09 | Thông báo · trống | remaining registry | user |
| P-10 | Thông báo · mở nhắc tên | remaining registry | user |
| P-11 | Topbar · ngôn ngữ | remaining registry | user |
| P-12 | Topbar · menu người dùng | remaining registry | user |
| P-13 | Sidebar thu gọn | remaining registry | user |
| P-14 | Drawer điều hướng | remaining registry | user |
| P-15 | Breadcrumb Trang chủ | remaining registry | user |
| P-16 | Sidebar · Sự kiện sắp tới → Xem tất cả | remaining registry | unreachable: Prototype v4 bỏ khối "Sự kiện sắp tới" ở chân sidebar (thay bằng thẻ gói — P-99). |
| P-99 | Sidebar Portal §27.3 · nhóm menu + thẻ gói | remaining registry | user |
| P-99-DRAWER | Drawer Portal §27.3 · nhóm menu + thẻ gói | remaining registry | user |
| P-17 | Cộng đồng | remaining registry | user |
| P-18 | Cộng đồng · tìm kiếm | remaining registry | user |
| P-19 | Cộng đồng · đã tham gia | remaining registry | user |
| P-20 | Cộng đồng · khu vực + sắp xếp | remaining registry | user |
| P-21 | Cộng đồng · trống | remaining registry | user |
| P-22 | Cộng đồng · trang 2 | remaining registry | user |
| P-23 | Tham gia · nhóm công khai | remaining registry | user |
| P-24 | Tham gia · nhóm cần duyệt, chưa đồng ý | remaining registry | unreachable: D-71 / §27.1: bỏ duyệt vào nhóm — app không còn popup "Cần duyệt" / "Gửi yêu cầu tham gia". Prototype v4 còn giữ nhánh này cho TK chưa đóng phí (Q-V4-603-1); popup vào ngay đo ở P-23. |
| P-25 | Cộng đồng · chờ duyệt | remaining registry | unreachable: D-71 / §27.1: không còn trạng thái "Đang chờ duyệt" / "Huỷ yêu cầu" (Q-V4-603-1). |
| P-26 | Cộng đồng · đã tham gia nhóm công khai | remaining registry | user |
| P-27 | Cộng đồng · rời nhóm | remaining registry | user |
| P-28 | Chat · phòng mặc định | remaining registry | user |
| P-29 | Chat · đổi chủ đề | remaining registry | user |
| P-30 | Chat · đổi nhóm | remaining registry | user |
| P-34 | Chat · đã gửi tin | remaining registry | user |
| P-35 | Chat · gợi ý nhắc tên | remaining registry | user |
| P-36 | Chat · chọn tin | remaining registry | user |
| P-37 | Chat · đang trả lời | remaining registry | user |
| P-38 | Chat · danh sách ghim | remaining registry | user |
| P-39 | Chat · tìm trong phòng | remaining registry | user |
| P-40 | Chat · bảng Thành viên | remaining registry | user |
| P-41 | Chat · duyệt yêu cầu vào nhóm | remaining registry | unreachable: D-71 / §27.1: chủ nhóm không còn duyệt yêu cầu vào nhóm — bảng Thành viên bỏ mục "Chờ duyệt vào nhóm" (prototype v4 còn mục này, Q-V4-603-1). Bảng Thành viên đo ở P-40. |
| P-42 | Chat · bảng File chia sẻ | remaining registry | user |
| P-43 | Chat · bảng Đã ghim | remaining registry | user |
| P-44 | Modal báo cáo tin | remaining registry | user |
| P-45 | Chat · đã báo cáo tin | remaining registry | user |
| P-121 | Chat · tin đã bị ẩn sau khi báo cáo (V4-612) | remaining registry | user |
| P-46 | Chat · xem trước nhóm chưa tham gia | remaining registry | user |
| P-47 | Chat · chưa tham gia nhóm nào | remaining registry | user |
| P-48 | Chat · tham gia thêm nhóm | remaining registry | user |
| P-49 | Sự kiện | remaining registry | user |
| P-50 | Sự kiện · đã đăng ký | remaining registry | user |
| P-51 | Sự kiện · trống | remaining registry | user |
| P-52 | Chi tiết sự kiện | remaining registry | user |
| P-53 | Sự kiện · đăng ký e1 | remaining registry | user |
| P-54 | Sự kiện · hết chỗ | remaining registry | user |
| P-96 | Chi tiết sự kiện · đã đăng ký (link Meet) | remaining registry | user |
| P-55 | Dự án · khám phá | remaining registry | user |
| P-56 | Dự án · dạng bảng | remaining registry | user |
| P-57 | Dự án · lọc giai đoạn + sắp xếp | remaining registry | user |
| P-58 | Dự án · trống | remaining registry | user |
| P-59 | Dự án · theo dõi | remaining registry | user |
| P-60 | Dự án của tôi | remaining registry | user |
| P-61 | Dự án của tôi · trống | remaining registry | unreachable: TK demo duy nhất của prototype sở hữu p10 (OPC Hub Mobile); không có user nào chưa có dự án. |
| P-62 | Chi tiết dự án · Tổng quan | remaining registry | user |
| P-63 | Chi tiết dự án · Cập nhật | remaining registry | user |
| P-64 | Chi tiết dự án · Đội ngũ | remaining registry | user |
| P-65 | Chi tiết dự án · Góp ý | remaining registry | user |
| P-66 | Góp ý · ô trả lời | remaining registry | user |
| P-67 | Góp ý · trống | remaining registry | user |
| P-68 | Dự án · repo riêng tư, đã xin quyền | remaining registry | user |
| P-69 | Dự án · tab Gọi vốn đầu tư | remaining registry | unreachable: Prototype v4 lồng khối tab "Gọi vốn đầu tư" + "Dự án liên quan" bên trong `<sc-if pjTabCmt>` (thiếu `</sc-if>` của tab Góp ý, index.html dòng 1244–1321) → bấm tab không hiện gì; app dựng tab theo đúng ý đồ v4 (V4-610, Q-V4-610-6). Hành vi kiểm ở e2e behavior projects/fundraising. |
| P-70 | Modal quan tâm đầu tư | remaining registry | unreachable: Prototype v4 lồng khối tab "Gọi vốn đầu tư" + "Dự án liên quan" bên trong `<sc-if pjTabCmt>` (thiếu `</sc-if>` của tab Góp ý, index.html dòng 1244–1321) → bấm tab không hiện gì; app dựng tab theo đúng ý đồ v4 (V4-610, Q-V4-610-6). Hành vi kiểm ở e2e behavior projects/fundraising. |
| P-71 | Đã gửi quan tâm đầu tư | remaining registry | unreachable: Prototype v4 lồng khối tab "Gọi vốn đầu tư" + "Dự án liên quan" bên trong `<sc-if pjTabCmt>` (thiếu `</sc-if>` của tab Góp ý, index.html dòng 1244–1321) → bấm tab không hiện gì; app dựng tab theo đúng ý đồ v4 (V4-610, Q-V4-610-6). Hành vi kiểm ở e2e behavior projects/fundraising. |
| P-72 | Chủ dự án · nhà đầu tư quan tâm | remaining registry | unreachable: Prototype v4 lồng khối tab "Gọi vốn đầu tư" + "Dự án liên quan" bên trong `<sc-if pjTabCmt>` (thiếu `</sc-if>` của tab Góp ý, index.html dòng 1244–1321) → bấm tab không hiện gì; app dựng tab theo đúng ý đồ v4 (V4-610, Q-V4-610-6). Hành vi kiểm ở e2e behavior projects/fundraising. |
| P-73 | Form đăng dự án | remaining registry | user |
| P-74 | Form dự án · báo thiếu tên | remaining registry | user |
| P-75 | Form dự án · mở gọi vốn | remaining registry | user |
| P-76 | Form dự án · chỉnh sửa | remaining registry | user |
| P-77 | Dự án · đã lưu nháp | remaining registry | user |
| P-78 | Modal chia sẻ dự án | remaining registry | user |
| P-103 | Popup Gói Gọi vốn · chọn dự án (từ Bảng giá) | remaining registry | user |
| P-104 | Popup Gói Gọi vốn · sau khi gửi dự án có gọi vốn | remaining registry | user |
| P-55-RENEWED | Dự án · khám phá · sau khi Admin ghi nhận phí chủ p4 | remaining registry | projects |
| P-56-RENEWED | Dự án · dạng bảng · sau khi Admin ghi nhận phí chủ p4 | remaining registry | projects |
| P-57-RENEWED | Dự án · lọc giai đoạn + sắp xếp · sau khi Admin ghi nhận phí chủ p4 | remaining registry | projects |
| P-59-RENEWED | Dự án · theo dõi · sau khi Admin ghi nhận phí chủ p4 | remaining registry | projects |
| P-55-RENEWED-VIEWS | Dự án · sau gia hạn · lưới sắp xếp nhiều lượt xem | remaining registry | projects |
| P-79 | Popup Gói dịch vụ | remaining registry | user |
| P-80 | Form tư vấn · cá nhân | remaining registry | user |
| P-81 | Form tư vấn · doanh nghiệp (mặc định) | remaining registry | user |
| P-82 | Form tư vấn · báo thiếu | remaining registry | user |
| P-83 | Đã gửi yêu cầu tư vấn | remaining registry | user |
| P-84 | Thông tin chuyển khoản (Điều kiện thanh toán, NR-R01) | remaining registry | user |
| P-85 | Chuyển khoản · đã sao chép | remaining registry | user |
| P-86 | Chuyển khoản · đang đối soát | remaining registry | user |
| P-87 | Popup bắt đóng phí | remaining registry | unreachable: Prototype chỉ có TK m1 và luôn tính lại phí m1 = còn hiệu lực mỗi lần render (FEE.m1); không có TK chưa đóng phí (C-01). |
| P-88 | Banner chờ thanh toán | remaining registry | unreachable: Mã chết trên prototype: payBanner:false gán cứng (C-01). |
| P-89 | Hồ sơ · thông tin cá nhân | remaining registry | user |
| P-90 | Hồ sơ · báo thiếu họ tên | remaining registry | user |
| P-91 | Hồ sơ · thông tin doanh nghiệp | remaining registry | user |
| P-92 | Hồ sơ · nhóm & hoạt động | remaining registry | user |
| P-93 | Hồ sơ · bảo mật | remaining registry | user |
| P-94 | Đổi mật khẩu · báo thiếu | remaining registry | user |
| P-95 | Hồ sơ · số Dự án → Dự án của tôi | remaining registry | unreachable: Prototype v4 Hồ sơ chỉ còn 2 ô thống kê (Nhóm, Sự kiện), bỏ ô "Dự án"; app giữ ô Dự án → Dự án của tôi (DV-V4-615-4) |
| P-97 | Portal · Affiliate | legacy affected | affiliate |
| P-98 | Portal · Affiliate · Lịch sử nhận tiền | legacy affected | affiliate |
| P-100 | Popup khai báo · Cá nhân · chọn vai trò + OPC | remaining registry | auth |
| P-101 | Popup khai báo · Cá nhân · danh sách OPC theo tỉnh | remaining registry | auth |
| P-102 | Popup khai báo · Doanh nghiệp · MST đã tra + OPC | remaining registry | auth |
| P-111 | Nhu cầu · tất cả (mặc định) | remaining registry | user |
| P-112 | Nhu cầu · lọc chip "Cần mua" | remaining registry | user |
| P-113 | Nhu cầu · không có kết quả | remaining registry | user |
| P-114 | Đăng nhu cầu · form | remaining registry | user |
| P-115 | Nhu cầu của tôi | remaining registry | user |
| P-116 | Nhu cầu của tôi · chưa đóng phí | remaining registry | unreachable: Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-110). |
| P-119 | Dashboard · Hướng dẫn bắt đầu (M1 đã phí) | remaining registry | user |
| P-120 | Dashboard · Hướng dẫn bắt đầu (chưa đóng phí, bước khoá) | remaining registry | unreachable: Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-110). Trạng thái khoá kiểm ở unit onboarding-card.spec. |
| P-V46-PUBLIC-CARD | Trang công khai · khối trong trình sửa | v4.6 P1–P17 | user |
| P-V46-GUEST | Trang khách /g/ · ảnh để owner duyệt | v4.6 P1–P17 | unreachable: Prototype has no anonymous /g/ page. Actual desktop/mobile captures are attached by store-public-page.spec.ts; no invented prototype baseline or pixel comparison. |
| P-108-PROJECT-FORM | Gian hàng của tôi · form đăng dự án điền sẵn | legacy affected | user |
| P-108-PROJECTS | Gian hàng của tôi · khối Dự án OPC | legacy affected | user |
| P-105 | Gian hàng · Khám phá (mặc định) | remaining registry | user |
| P-106 | Khám phá · lọc ô danh mục Thủy sản | remaining registry | user |
| P-107 | Khám phá · không có kết quả | remaining registry | user |
| P-108 | Chi tiết gian hàng (HTX Cà phê Hòa Phú) | legacy affected | user |
| P-109 | Gian hàng của tôi · dashboard số thật (lời chào) | legacy affected | user |
| P-110 | Gian hàng của tôi · chưa đóng phí | remaining registry | unreachable: Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-87). |
| D-90 | Sidebar Admin §27.3 · nhóm menu | remaining registry | admin |
| D-90-DRAWER | Drawer Admin §27.3 | remaining registry | admin |
| D-91 | Admin · menu người dùng có Cài đặt hệ thống | remaining registry | admin |
| D-01 | Admin AppShell · Tổng quan | v4.6 P1–P17 | admin |
| D-02 | Admin · menu người dùng | legacy affected | admin |
| D-03 | Admin · Hồ sơ cá nhân (không đổi màn) | remaining registry | admin |
| D-04 | Admin · thông báo | remaining registry | admin |
| D-05 | Admin · sidebar thu gọn | remaining registry | admin |
| D-06 | Admin · drawer điều hướng | remaining registry | admin |
| D-07 | Thành viên · danh sách | legacy affected | admin |
| D-08 | Thành viên · lưới | remaining registry | admin |
| D-09 | Thành viên · lọc Doanh nghiệp | remaining registry | admin |
| D-10 | Thành viên · chọn nhiều | remaining registry | admin |
| D-11 | Thành viên · khóa hàng loạt | remaining registry | admin |
| D-12 | Modal gán vào nhóm | remaining registry | admin |
| D-89 | Gán vào nhóm · vai trò Giảng viên (GR-R01) | remaining registry | admin |
| D-13 | Thành viên · menu dòng | remaining registry | admin |
| D-14 | Thành viên · đã khóa 1 dòng | remaining registry | admin |
| D-16 | Drawer hồ sơ đăng ký | remaining registry | admin |
| D-17 | Thành viên · 6/trang, trang 2 | remaining registry | admin |
| D-18 | Phí thành viên | legacy affected | admin |
| D-19 | Phí · chờ thanh toán | remaining registry | admin |
| D-20 | Phí · chọn nhiều | remaining registry | admin |
| D-21 | Phí · ghi nhận đã thu | remaining registry | admin |
| D-22 | Phí · 6/trang, trang 2 | remaining registry | admin |
| D-23 | Nhóm cộng đồng · lưới | remaining registry | admin |
| D-24 | Nhóm cộng đồng · danh sách | remaining registry | admin |
| D-25 | Nhóm cộng đồng · Miền Trung | remaining registry | admin |
| D-26 | Nhóm cộng đồng · chọn nhiều | remaining registry | admin |
| D-27 | Nhóm cộng đồng · trang 2 | remaining registry | admin |
| D-28 | Drawer tạo nhóm | remaining registry | admin |
| D-29 | Tạo nhóm · báo thiếu tên | remaining registry | admin |
| D-30 | Drawer sửa nhóm | remaining registry | admin |
| D-31 | Modal xuất danh sách thành viên | remaining registry | admin |
| D-32 | Xem chat từ admin (không đổi màn) | remaining registry | unreachable: Prototype "Xem chat" đặt screen=portal nhưng guard phiên Admin (`session==="admin"&&screen==="portal"` → screen admin) trả về ngay: nút no-op, không có màn đích. App mở trình xem chat chỉ đọc (DV-G4c-1, D-26 / C-03), kiểm bằng e2e admin-groups. |
| D-33 | Kiểm duyệt tin nhắn | remaining registry | admin |
| D-34 | Kiểm duyệt · hết tin | remaining registry | admin |
| D-35 | Kiểm duyệt · thêm từ khóa | remaining registry | admin |
| D-98 | Kiểm duyệt · Thời gian khóa 14 ngày | remaining registry | admin |
| D-36 | Bot · nhật ký tự động | remaining registry | admin |
| D-37 | Bot · Persona | remaining registry | admin |
| D-38 | Drawer persona | remaining registry | admin |
| D-39 | Bot · Kịch bản hội thoại | remaining registry | admin |
| D-40 | Drawer kịch bản | remaining registry | admin |
| D-41 | Bot · Hội thoại | remaining registry | admin |
| P-01-BOTCARD | Dashboard · thẻ bot (dữ liệu khớp) | remaining registry | unreachable: Trạng thái đã bỏ: prototype v4 + D-89 Dashboard bỏ khối "Thảo luận mới trong cộng đồng" ở cả hai bên (chỉ còn lời chào + Hướng dẫn bắt đầu); tin bot kiểm trong chat (e2e bot-auto) |
| D-86 | Tạo nhóm · + Thêm chủ đề (NA-09, chỉ quản trị tạo) | remaining registry | admin |
| D-36-SCHEDULE-WAIT | Bot · lịch tương lai | remaining registry | admin |
| D-36-SCHEDULE-END | Bot · hết lịch | remaining registry | admin |
| D-36-SCHEDULE-PAUSE | Bot · tạm dừng | remaining registry | admin |
| D-36-SCHEDULE-CLEAR | Bot · xóa lịch vẫn tạm dừng | remaining registry | admin |
| D-36-REPLIES | Bot · Trả lời từng tin | remaining registry | admin |
| D-39-BULK | Bot · AI tạo hàng loạt | remaining registry | admin |
| D-39-BULK-TYPE | Bot · thêm loại hội thoại | remaining registry | admin |
| D-39-BULK-FORM | Bot · bulk đã nhập chủ đề/nhóm | remaining registry | admin |
| D-39-BULK-RESULT | Bot · kết quả tạo AI hàng loạt | remaining registry | admin |
| D-42 | Sự kiện · lưới | remaining registry | admin |
| D-43 | Sự kiện · danh sách | remaining registry | admin |
| D-44 | Sự kiện · Đã đầy → chi tiết sự kiện (Demo Day) | remaining registry | admin |
| D-45 | Sự kiện · 6/trang | remaining registry | admin |
| D-46 | Drawer danh sách đăng ký | remaining registry | admin |
| D-47 | Drawer tạo sự kiện | remaining registry | admin |
| D-48 | Tạo sự kiện · Online | remaining registry | admin |
| D-49 | Drawer sửa sự kiện | remaining registry | admin |
| D-50 | Sự kiện · chia sẻ | remaining registry | admin |
| D-51 | Dự án · chờ duyệt | remaining registry | admin |
| D-52 | Dự án · Bị từ chối (trống) | remaining registry | admin |
| D-53 | Dự án · danh sách | remaining registry | admin |
| D-54 | Dự án · chọn nhiều | remaining registry | admin |
| D-55 | Drawer duyệt dự án | remaining registry | admin |
| D-56 | Dự án · đã duyệt | remaining registry | admin |
| D-57 | Dự án · Đang hiển thị | remaining registry | admin |
| D-58 | Nhà đầu tư | remaining registry | admin |
| D-59 | Nhà đầu tư · Quỹ | remaining registry | admin |
| D-60 | Drawer nhà đầu tư | remaining registry | admin |
| D-61 | Dịch vụ · yêu cầu | remaining registry | admin |
| D-62 | Dịch vụ · trống | remaining registry | admin |
| D-63 | Drawer yêu cầu YC-1005 | remaining registry | admin |
| D-64 | Yêu cầu · từ chối | remaining registry | unreachable: D-72 / §27.1 bỏ quy trình 5 bước YC: không còn nút "Từ chối" / "Mở lại tư vấn" (prototype v4 cũng đã bỏ ở drawer) |
| D-65 | Dịch vụ · danh mục | remaining registry | admin |
| D-87 | Sự kiện · khối Sắp diễn ra + Tiếp theo (TIP-V2-303) | remaining registry | admin |
| D-88 | Tạo sự kiện · Link Google Meet (D-59) | remaining registry | admin |
| D-92 | Dự án · Gói Gọi vốn chờ duyệt (chip + Duyệt gọi vốn / Từ chối, V4-610) | remaining registry | user |
| D-V46-AI | Cài đặt · AI Provider | v4.6 P1–P17 | admin |
| D-V46-APP | Cài đặt · Ứng dụng & thông báo | v4.6 P1–P17 | admin |
| D-V46-BANK | Cài đặt · Đối soát ngân hàng | v4.6 P1–P17 | admin |
| D-V46-RENEW | Cài đặt · Nhắc gia hạn | v4.6 P1–P17 | admin |
| D-66 | Cài đặt · Chung | legacy affected | admin |
| D-67 | Cài đặt · Danh mục lĩnh vực | legacy affected | admin |
| D-68 | Lĩnh vực · đang sửa | legacy affected | admin |
| D-69 | Cài đặt · Vai trò & phân quyền | v4.6 P1–P17 | admin |
| D-70 | Cài đặt · Email chào mừng | legacy affected | admin |
| D-71 | Cài đặt · SMTP | legacy affected | admin |
| D-72 | SMTP · lỗi xác thực | legacy affected | admin |
| D-100 | Cài đặt · Cấu hình bảng giá | legacy affected | admin |
| D-73 | Cài đặt · Tài khoản quản trị | legacy affected | admin |
| D-74 | Tài khoản quản trị · hộp thoại tạo TK (§21 RB-R02) | legacy affected | admin |
| D-75 | Cài đặt · Nhật ký hoạt động | legacy affected | admin |
| D-76 | Cài đặt · SSO | remaining registry | unreachable: Panel SSO: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-77 | Cài đặt · Ngôn ngữ | remaining registry | unreachable: Panel ngôn ngữ: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-78 | Marketing | remaining registry | unreachable: Không có mục sidebar cho aTab='marketing' (C-05). |
| D-79 | Modal tạo chiến dịch email | remaining registry | unreachable: Chỉ mở được từ màn Marketing (D-78) — không có lối vào (C-05). |
| D-80 | Toast toàn cục | remaining registry | admin |
| D-81 | Xem thử vai trò Kế toán · menu + dải cam (RB-R09, AT-RB02) | remaining registry | admin |
| D-82 | Chế độ chỉ xem · Giảng viên mở Thành viên (AT-RB03) | remaining registry | admin |
| D-83 | Đổi mật khẩu lần đầu (AT-SEC01, RB-R02) | remaining registry | admin |
| D-84 | Admin · Affiliate | v4.6 P1–P17 | affiliate |
| D-85 | Admin · Affiliate · Chi tiết đại lý | v4.6 P1–P17 | affiliate |
| D-84-AFF | Admin · Affiliate · Đại lý mặc định | v4.6 P1–P17 | affiliate |
| D-84-AFF-Q | Admin · Affiliate · Tìm đại lý HAOPC | v4.6 P1–P17 | affiliate |
| D-84-POL | Admin · Affiliate · Chính sách | v4.6 P1–P17 | affiliate |
| D-85-CUS | Admin · Affiliate · Khách hàng của đại lý | v4.6 P1–P17 | affiliate |
| D-85-RATE | Admin · Affiliate · Sửa tỷ lệ cá nhân | v4.6 P1–P17 | affiliate |
| D-84-COM-BULK | Admin · Affiliate · Chọn hai khoản hoa hồng | v4.6 P1–P17 | affiliate |
| D-84-AFF-BULK | Admin · Affiliate · Chọn đại lý HAOPC | v4.6 P1–P17 | affiliate |
| D-84-COM-EMPTY | Admin · Affiliate · Hoa hồng không có kết quả | v4.6 P1–P17 | affiliate |
| D-84-AFF-EMPTY | Admin · Affiliate · Đại lý không có kết quả | v4.6 P1–P17 | affiliate |
| D-84-COM-RECORDED | Admin · Affiliate · Hoa hồng đã ghi nhận | v4.6 P1–P17 | affiliate |
| D-84-COM-RECORDED-MENU | Admin · Affiliate · Menu khoản đã ghi nhận | v4.6 P1–P17 | affiliate |
| D-84-COM-PAID | Admin · Affiliate · Hoa hồng đã chi trả | v4.6 P1–P17 | affiliate |
| D-84-COM-PAID-MENU | Admin · Affiliate · Menu khoản đã chi trả | v4.6 P1–P17 | affiliate |
| D-84-COM-CANCELLED | Admin · Affiliate · Hoa hồng đã hủy | v4.6 P1–P17 | affiliate |
| D-84-COM-CANCELLED-MENU | Admin · Affiliate · Menu khoản đã hủy | v4.6 P1–P17 | affiliate |
| D-95 | Admin › Nhu cầu địa phương (KPI, chip, bảng) | remaining registry | admin |
| D-93 | Admin › Gian hàng (KPI, chip, bảng) | remaining registry | admin |
| D-94 | Admin › Gian hàng · panel chi tiết | remaining registry | admin |
| D-99 | Admin › Báo cáo (mẫu B1 / B2 / B3, xem trước, Xuất CSV) | remaining registry | unreachable: Prototype v4 không có menu "Báo cáo" (`AG` không có `reports`, §27.9 T15); markup `aReports` dựng trên cây mạng lưới đã gỡ (§24, D-78). Màn theo khung Admin chung, hành vi kiểm ở e2e reports.spec + test:int reporting/report-export (Q-V4-614-1). |

## Pre-edit path ledger (phase1)

- This manifest; ui-parity/V4.6-causes.md; screens.md/questions.md TIP812 sections; acceptance/M1/M3/TIP812 reports and row12 progress are authorized documentation. Generated results.* and diff PNGs ONLY via actual reporter, never hand-edited.
- e2e/parity/scenarios/admin-regional.ts: pending Q812-2 default, D-78-GDV unreachable because prototype lacks Marketing; alternative existing mail behavior/int coverage. No edit yet; initial baseline records original behavior first.

## Phase2/3 change ledger

No application/test changes authorized by measurement yet. Add exact paths with measured defect/test evidence here BEFORE editing. Initial candidate globs in TIP are not a substitute for this exact ledger.

## Baseline runs

- Root lint/type/depcheck: running, v46-812-baseline-{lint,type,depcheck}.log.
- Unit forced full rerun: running v46-812-baseline-unit.log.
- Root MSW build: running .next-v46-812-baseline-msw; v46-812-baseline-build.log.
- Integration: owner target approved, not started yet (avoid resource contention).
- Full MSW behavior/parity: not started until baseline build ready.
- Native parity/full behavior: not started.

Operational history: initial inventory read happened before tsx output existed; reread after completion. No missing file interpreted as empty registry.

### Baseline resource finding (before application edits)

First forced root unit run aborted after server audit coverage test exceeded existing5s while root lint/build/default unit workers overlapped (server238pass/1timeout; entire root not complete). Same unchanged audit file passes isolated2/2 in4.48s. Bounded serial project rerun (--concurrency=1, maxWorkers2) is running; no timeout/assertion changes. Root lint8/8 PASS2m35.77s, type8/8 PASS1m11.344s, both depcheck graphs PASS, root MSW build3/3 PASS2m13.079s. Full integration baseline now running through private-target wrapper.

BR traceability check: source spec has26 definitions in range461�495,9 absent identifiers466�470/487�490. Q812-6 records this structural gap; no invented business/test IDs. AST inventory of existing acceptance-tagged tests saved locally; results must be joined to actual executed files, not inferred PASS from titles.

### Owner-approved isolated812 runtime (explicit reply,06/11/2026)

Owner chose new runtime/DB812 instead of restarting any HOLD process: opchub_v46_812_dev, Memurai6381 DB3, API4310/socket4311, Next3710/3711. Existing801 test remains integration targetDB2. Existing811 services keep3700/3701/4300/4301 and DB801dev/Redis1. Full native needs its own configured link origins/worker; no rewriting mail links or weakening URL assertions.

Pre-edit infrastructure ledger: packages/db/seed/demo/guard.ts (modify only add exact opchub_v46_812_dev to allowlist); packages/db/test/seed-demo.int.spec.ts (modify existing guard acceptance assertion to cover the new allowed name, retain refusal of production/near-miss names). This is owner-approved target guard, not business/schema/migration. Edits wait until baseline application runs finish; no source change yet.

Provisioning may create ONLY the new absent DB, via app role with CREATEDB (preflight confirmed). Consistent pg_dump/pg_restore clone of approved801dev goes into new812dev; no reset/drop/DDL on existing databases. Dump and encrypted snapshots ignored; no credentials printed/committed.

Provisioning evidence: initial pg_restore --single-transaction failed on existing bot_script_line_hashes -> unqualified bot_bulk_line_key during GIN index creation with pg_dump empty session search_path. Transaction rolled back; new target verified empty before retry. Restored same archive atomically with restore-session search_path public,pg_catalog only; no function/migration/schema definition changed. Exact source/target table/index/function definitions and migration checksums match (v46-812-clone-verification.json). Existing databases untouched. New DB not seeded until exact guard entry is implemented after baseline.

## Measured pre-edit ledger (code not changed yet)

| Exact path | Measured reason before edit | Planned verification |
|---|---|---|
| apps/admin/src/features/affiliate/regional/components/regional.module.css | D120-GCFG4.4699%/7.2500%, RO10.5758%/10.5794%. DOM bank inputs y1107/1077 vs prototype1098/1068; AntD control wrapper40px vs input/prototype34px. Scope label/control sizing to regional bank, retain validation/read-only states. | director browser tests + both GCFG/RO widths |
| e2e/behavior/admin-regional-directors.spec.ts | Existing tests omit Portal popup/expiry date; add bank-row sizing assertion for measured defect, retain all existing assertions. | identical MSW/native AT-GDV02, TC462 + existing AT cases |
| apps/portal/src/features/affiliate/components/history-tabs.tsx | P-V46-REG-BANNER16.6381%/10.8596%; both paired views have0 referrals, app adds a large empty illustration/body whereas prototype retains only header+zero summary. | empty and populated table behavior, summary/headers retained |
| apps/portal/src/features/affiliate/components/history.module.css | Scope empty referral table geometry; no data rows or required controls hidden. | P97/P98 + regional banner at both widths |
| e2e/behavior/affiliate-screen.spec.ts | Add meaningful empty header/body/summary layout coverage for correction above; keep existing assertions. | both modes |
| apps/portal/src/features/affiliate/components/my-region.module.css | P-V46-REG7.4071%/15.2651%; mobile actual table fixed column widths force639.5px and first year column139.5px; prototype wraps first year column narrowly. Need final grid DOM probe before exact CSS choice. | read-only/contained scrolling + paired widths |
| apps/portal/src/features/affiliate/components/my-region-years.tsx | Same measured mobile year-column sizing; adjust only presentation widths if CSS alone insufficient. | mobile first-column layout and actual content |
| apps/portal/src/features/affiliate/components/my-region-affiliates.tsx | Same mobile table layout family; change only if counterpart DOM proves need. | content/links unchanged; pair review |
| apps/portal/src/features/affiliate/components/my-region-months.tsx | Same mobile table layout family; change only if counterpart DOM proves need. | content/status unchanged; pair review |
| e2e/behavior/portal-my-region.spec.ts | Add layout/empty-header evidence for measured UI corrections, no assertion weakening. | both widths/modes |
| e2e/parity/scenarios/portal-my-region.ts | Probe proves app scrollY0 immediately before full-page screenshot becomes29 afterwards; prototype stays0. Existing numeric scroll reset fails to cancel smooth scrolling under paused clock. Use explicit instant pose + stronger zero-scroll postcondition, not masks/crops/timeouts. | identical scenario, full box retained; actual pose checked |
| e2e/parity/scenarios/portal-stores.ts | Native P108 times out120s at both widths. Required HTX Cà phê Hòa Phú is st2/ownerx2; default seed contains only st1, while existing --stores supplies the required catalog. Add existing stores prerequisite to P108, no new seed data or assertion changes. | native P108 captures + same MSW steps |

Settings-nav candidate checked BEFORE deciding to edit: desktop/mobile first12 rows match exact y/width/height/font/padding (e.g57px rows,14px labels; nav240px). Desktop extra SSO/languages from D33/Q-V4-622-1 explain height863; prototype does not include those. Both mobile navs are sticky and745px high. Do NOT change nav geometry blindly from old completion percentages. DOM probes stored locally; subsequent final causes must attach paired evidence.

### Baseline closed / infrastructure proof

Before source edits: full integration PASS2131 (DB126 + server2005), full MSW behavior PASS381/4 existing skips. Full bounded unit PASS2123/2 existing skips. Baseline parity remains raw failure, not a green gate.

Correction to infrastructure test path above: inspection found no existing guard assertions in seed-demo.int.spec.ts. Leave that file unchanged; create packages/db/test/seed-demo-guard.int.spec.ts instead, dedicated URL-only acceptance/refusal tests without opening any database connection. Exact new guard name remains the sole allowlist addition.

### TC-462 / BR-464 measured proof gap (before edits)
- apps/server/src/modules/mail/templates-regional.ts: revoke subject always asks for payment even when validUntil exists; body already correctly states expiry. Apply only Q812-3 default conditional subject, no flow/payload changes.
- apps/server/src/modules/mail/templates-regional.spec.ts (create): dedicated template tests for valid previous fee date (Vietnam midnight boundary), absent fee, all three region labels, existing unpaid wording retained.
- apps/server/test/regional-director/appoint.int.spec.ts: add actual persisted revoke-mail/notification assertions and idempotent handler replay for TC-462 / BR-464. Existing tests/assertions retained.

### Additional measured UI-only paths (before edits)
- apps/admin/src/features/shell/components/view-only-zone.tsx: D120-GCFG-RO has duplicate gray notice35px+20gap in preview while prototype has orange preview notice only. Suppress gray notice only during preview; retain click-capture write guard and actual read-only account notice.
- apps/admin/src/features/shell/components/view-only-zone.spec.tsx (create): prove actual read-only notice and guard, preview guard without duplicate notice, safe view/exit still work.

### Isolated cache reset preflight (before edits)
- apps/server/scripts/flush-dev-cache.mjs: existing reset rejects REDIS_DB3, so approved independent runtime cannot run unmodified native fixture. Preserve existing DB1 behavior; permit DB3 ONLY with loopback Memurai6381 and exact authorized opchub_v46_812_dev URL. No bypass/SKIP_SEED, no native6379 access.
- apps/server/scripts/dev-cache-target.mjs (create): pure target guard extracted for exhaustive refusal tests.
- apps/server/scripts/dev-cache-target.test.mjs (create): node:test covers existing DB1 and exact DB3 conjunction, rejects wrong host/port/database/near-miss/defaults before Redis construction.

### Missing acceptance browser proof paths (before edits)
- e2e/behavior/admin-regional-directors.spec.ts: add AT-GDV02 expired demo m6 appointment/revocation followed by real Portal login, mandatory non-dismissible fee popup and absent regional tab; add TC462 north previous-paid-fee revocation/date notification/no-popup.
- e2e/behavior/admin-regional-shares.spec.ts: add AT-GDV04 through real revocation UI before existing payout, assert original payee/bank and due amount preserved.
- e2e/behavior/global-search.spec.ts: add TC491 literal cà phê, existing stores demo prerequisite, assert both groups and exact clicked targets.
- e2e/behavior/admin-bank-reconcile.spec.ts: title-only TC481 trace tag on existing auto activation case; no assertion edits.

### Browser diagnostics after first focused run (before corrections)
- AT-GDV02 initial mandatory popup and Esc assertions pass; extra assertion after navigating to /affiliate conflicts with existing overlay-policy.ts (explicit affiliate exemption, tested). Keep mandatory popup/Esc proof on landing page and independently assert removed regional tab on permitted affiliate page; no production policy change.
- TC491 existing UI label is Nhu cầu địa phương (actual accessibility snapshot), not shortened Nhu cầu. Use exact actual group label; preserve both group and navigation checks.
- e2e/parity/scenarios/admin-affiliate-list-states.ts: DOM proves two distinct matching codes HAOPC and HAOPC84, not duplicate nested row. Refine affiliate row candidate by exact code text, retaining count1 and checkbox assertions (no first() workaround).
- e2e/parity/scenarios/admin-affiliate-steps.ts: native D84-AFF390 captured actual loading spinner (844px) while MSW complete table is3920px. Await populated affiliate row after tab navigation in both lanes before capture; no timeouts/masks/data changes.

### TC462 mock prerequisite gap (before edits)
- packages/shared/src/mock-data/domains/regional-notices.ts (create): MSW currently restores fees on revocation but never creates the native system notification. Mirror native handler content/date only; no production flow change.
- packages/shared/src/mock-data/domains/regional-directors.ts: call notice helper on successful revoke and carry only regional notices through existing regional snapshot.
- packages/shared/src/mock-data/domains/regional-snapshot.ts: optional/defaulted validated regional-notice entries for existing cross-origin browser fixture relay, not fake auth data.
- packages/shared/src/mock-data/domains/regional-persistence.spec.ts: assert dated native-equivalent notification survives repeated snapshot restore without duplicates or unrelated notices loss.

### BR465 expired-lock fixture gap (before edits)
Existing Admin API accepts positive lock days only; existing demo m4 is indefinitely locked, so neither is an expired timed-lock prerequisite. No production endpoint/timeouts/auth-cookie changes are allowed.
- packages/db/seed/expired-lock.ts (create): narrow native fixture CLI, parsed env, refuse anything except loopback exact opchub_v46_812_dev before connecting; conditional update ONLY demo m1 already manually locked, setting lockedUntil in past. No reset/new users/unlock/session fabrication. Login itself must perform unlock.
- e2e/behavior/helpers/expired-lock.ts (create): target-specific prerequisite only: native runs narrow fixture CLI; MSW advances browser clock after real positive-day Admin lock (no fake session cookie or response). Same login/status assertions in both modes.
- e2e/behavior/auth-expired-lock.spec.ts (create): isolated extensive proof instead of appending to existing auth-flows.spec.ts (already large); real Admin UI login + existing lock API, rejected member login while lock valid, expiry prerequisite, successful real member login active + real /me check. BR465 explicitly in title.

TC462 native precondition correction: fixed prototype m3 expiry is already past on actual native clock (native correctly restores pending_payment). Establish the case using already-paid demo m1 via existing appointment UI before revocation, not fabricated dates or altered production rules. The test still requires active/expiring, no popup, dated bell notice and no regional tab in both lanes. AT01 native exposes AntD specificity retaining40px wrapper; strengthen only scoped bank wrapper sizing and rerun both lanes.

### Policy and tab visibility measured before edit
Paired D84-POL390 app/proto reviewed: both content sections present, but app lays out all3 regional inputs vertically (min200px on324px content) vs prototype two columns (156px each), labels blue vs prototype muted gray; active Chính sách tab remains offscreen in app whereas prototype scrolls it into view. D84POL baseline3.9508/10.1479%. Data KPI differences remain unchanged (D131 renewal fixtures); Sửa điều khoản remains required legacy action, not removed to improve pixels.
- apps/admin/src/features/affiliate/components/policy-reference.module.css: scoped regional field grid140px minimum/muted label; retain all fields/validation. DOM follow-up required for year/plan row rhythm before changing those.
- apps/admin/src/features/affiliate/components/affiliate-tabs.tsx: keep selected tab inside horizontally scrollable tablist via its own scrollLeft only; do not scroll whole page or hide other tabs.
- apps/admin/src/features/affiliate/components/affiliate-tabs.spec.tsx (create): selected tab scroll behavior and unchanged click actions.
- e2e/behavior/admin-affiliate-policy.spec.ts (modify if present; inspect exact filename first): mobile field positions and selected tab inside tablist, same assertions both lanes.
MyRegion newtable has inline table-layout:auto from AntD; measured560px total but70.9375px first column vs desired62px. Keep new <70px assertion; strengthen domain table-layout CSS rather than loosen assertion.

### Owner-approved BR465 narrow production correction (before edits)
Owner explicitly approved fixing stale auto-unlock session plus regression. Native E2E login200 currently returns me.status locked; AuthService.assertUnlocked returns after DB unlock without refreshing SessionUser. Re-read session projection after successful conditional unlock so status AND incremented permission/session version are current; do not change unlock rules/guards/jobs/permissions.
- apps/server/src/modules/account/services/auth.service.ts: narrow refresh of existing user projection only after successful auto-unlock; file under cap.
- apps/server/test/account/auto-unlock.int.spec.ts: strengthen existing successful-login regression with active response, authenticated /me and refresh; retain audit/outbox/dedup/revoked-old-session assertions.

Exact policy browser-test path confirmed: e2e/behavior/affiliate-policy-responsive.spec.ts. Add scoped mobile two-column input geometry and selected-tab visibility checks; retain every existing validation/save/hidden-value assertion. No admin-affiliate-policy.spec.ts exists or will be created.

### D85-CUS paired review before edit
D85-CUS desktop8.50/mobile16.52% baseline: detail header geometry already matches; much of the row-height/content mismatch is the rate cell dropping existing customerYear (API already exposes it) and showing only percent. Prototype shows year1 / renewal text. D131 changes amounts/renewal horizon, so no snapshot values will be changed to match prototype.
- apps/admin/src/features/affiliate/components/customer-table-columns.tsx: render existing commissionFirstYear/commissionRenewalYear translations with actual API year; widen rate column56→90 while retaining total table width via existing flexible-column formula. No business calculation/API/fixture changes.
- apps/admin/src/features/affiliate/components/customer-table-columns.spec.tsx (create): actual year1/2/4 labels and snapshot percentage retained, same table component.

### Measured settings typography / mobile padding (before edits)
D-V46-AI390 pair+DOM: actual API label12px vs prototype13px, actual input12px vs prototype key14px/base13px; outer card mobile16px vs prototype20px. Allocation/price/key/limit controls must stay intact (real fields, no flattening/hiding). D-V46-APP390 pair: actual content x29 vs prototype33 from same16/20 padding; row text500 vs prototype400. Bank DOM actual read-only input12px vs prototype13px, labels12 vs13; fake-provider row/readonly providers remain owner-approved D135 differences.
- apps/admin/src/features/settings/components/ai/ai.module.css: scoped card mobile padding20, labels13, key/limit input14, provider label13; retain all controls/responsive grids.
- apps/admin/src/features/settings/components/app-notify.module.css: mobile card20 and row/PWA/category-heading normal400; no settings behavior changes.
- apps/admin/src/features/settings/components/bank.module.css: scoped mobile card20, field label13 and readonly input13px monospace; preserve D135 providers and transactions.
- e2e/behavior/ai-providers.spec.ts: add API-key label13/input14 visual contract, retain provider/save/allocation/runtime assertions.
- e2e/behavior/app-notify.spec.ts: add card20/normal row-label contract at both widths, retain draft/save/notification checks.
- e2e/behavior/admin-bank-reconcile.spec.ts: add readonly input font13 contract, retain every existing assertion (TC481 title already added).

### Remaining read-only notice geometry (measured before edit)
Post-fix targeted r6: normal GCFG1440 is2.4128%, RO1440 remains4.3032%. Existing paired DOM separately proves the local read-only notice prototype13px/padding8px12/height35 vs app12px/padding6px10/height30. Duplicate global preview notice is already fixed; this is the separate local hint, not the coverage hint.
- apps/admin/src/features/affiliate/regional/components/regional-config-panel.tsx: apply a dedicated readonlyNotice class to the existing local hint only. No read-only/permission/state changes.
- apps/admin/src/features/affiliate/regional/components/regional.module.css: dedicated local hint13px/padding8px12. Coverage notice unchanged.
- apps/admin/src/features/affiliate/regional/components/regional-config-panel.spec.tsx (create): read-only role hint uses its own geometry class, coverage notice separate and management action remains absent. Existing browser assertions remain unchanged; ongoing full behavior suites stay frozen.

Targeted r6 readiness correction: D85-CUS both widths time out before capture; actual screenshot/accessibility tree proves page1 has10 populated AFDEMO rows among66 affiliates, and HAOPC is not on that page. The new generic readiness wait must not assume a particular customer is on page1. Change only e2e/parity/scenarios/admin-affiliate-steps.ts to require the first visible populated row on each side; detail/bulk steps retain their exact HAOPC search/count and target assertions. No seed/order/page-size/timeout changes.
