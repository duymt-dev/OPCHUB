# SPEC v4.2 delta: SRS-4.0 → v4.2 (scan 27/10/2026)

> Nguồn: gói `docs/spec/deploy/` (v4.2, 27/10/2026) owner gửi. Đã chép đè vào `docs/spec/`
> (`dac-ta.html`, `index.html`, `README.md`) rồi xoá `deploy/`. `assets/`, `support.js`,
> `doc-page.js`, `mau-bao-cao/` giống hệt bản cũ (so byte). PDF mới "OPCHUB Thiết kế giải pháp
> cộng đồng.pdf" thay bản "Update 23_10…".
>
> Chỉ đạo owner (27/10/2026): **ưu tiên prototype** khi đặc tả và prototype lệch nhau; thay đổi
> backend hoặc quá lớn thì hỏi trước khi làm (D-93).
>
> So với: `docs/spec/*` trên `dev` `b2add530` (SRS-4.0 + prototype v4) và code trên `dev`.

## 1. Tài liệu thay đổi gì

| Phần | Thay đổi |
|---|---|
| §1–26 | Bỏ các dòng "Đã thay thế bởi v4.0"; §1.2 menu rút gọn (Portal 8 mục, Admin 10 mục) |
| §27 | Viết lại: change log CR-01 → CR-18, bảng giá, vòng đời TK có **trial 90 ngày**, QT-01/QT-04/QT-GV, VietQR, Affiliate cho mọi TV, File chia sẻ, Bot tự động 100%, trình tạo gian hàng, dữ liệu, API bổ sung, test V4-01 → 12, E2E-01 → 16 |
| §28 (v4.1) mới | BR-PAY-REF nội dung CK thống nhất; BR-AFF-REV hoa hồng theo gói thực trả; FX-01 → FX-06; OI-01 → OI-04 |
| §29 (v4.2) mới | QT-GV nhiều dự án / 1 lần CK; UI-PAY popup 2 cột; QT-ST-PJ đăng dự án từ gian hàng; CH-01 → CH-05; BR-TRIAL-01 → 05; OI-05 → OI-06 |

Đặc tả tự ghi: **§29 thay §27.5b, 27.5c, 27.6, 28 khi trái nghĩa; §27 thay §1–26.**

## 2. Prototype `index.html` thay đổi (104 khối diff)

| # | Màn | Thay đổi trong prototype | Code hiện tại | Loại |
|---|---|---|---|---|
| P1 | Popup Bảng giá | Lead "miễn phí 3 tháng đầu, từ tháng thứ 4…"; giá đọc từ cấu hình (`pk.*`); "Từ tháng thứ 4: …"; Gọi vốn "Thanh toán khi đăng ký", "Đăng ký cho bao nhiêu dự án cũng được…"; dòng bắt buộc "Hết 3 tháng miễn phí · nâng cấp để tiếp tục" | Giá cố định (`shared/membership/plans.ts`), không trial | **Backend lớn** (trial + cấu hình giá) |
| P2 | Popup thanh toán phí | Khung QR cố định, "Đang tải mã QR…", VietQR động điền sẵn số tiền + nội dung | Ảnh tĩnh `/vcb-qr.png` | UI + sinh QR (đề xuất server, EMVCo) |
| P3 | Popup Gói Gọi vốn | 2 cột: (1) tick nhiều dự án, tổng tiền; (2) QR + bảng CK; ×, "Quay lại" thay "Để sau"; nội dung `OPCHUB [TV] [SĐT] GV10-11-12` | 1 dự án / 1 khoản, nội dung `OPCHUB <mã>` | **Backend lớn** (khoản thanh toán nhiều dự án, đối soát) |
| P4 | Chat › khung phải | Tab "File chia sẻ" gom file mọi chủ đề của nhóm, ô tìm, chip Tất cả / Tài liệu / Hình ảnh, Tải về, mở chủ đề gốc | `GET rooms/:id/files` theo phòng | Backend vừa (API theo nhóm) |
| P5 | Portal · Tạo gian hàng (màn mới) | Trình tạo 5 bước: thông tin DN, logo nhiều ảnh / ảnh bìa / giới thiệu / tầm nhìn / ảnh / video, đội ngũ + chứng nhận có ảnh + hồ sơ năng lực, sản phẩm, liên hệ nhiều hotline / email / địa chỉ, mức độ hoàn thiện, xem trước | Màn "Gian hàng của tôi" 1 trang | **Backend + FE lớn** (schema media) |
| P6 | Chi tiết gian hàng | Logo ảnh; chứng nhận có ảnh; reels video thật; nhiều hotline / email; mục Dự án OPC luôn hiện cho chủ + "+ Đăng dự án OPC" | Không có | Backend vừa (dự án gắn gian hàng, QT-ST-PJ) |
| P7 | Portal Affiliate (chưa có link) | "Link giới thiệu của bạn đang được khởi tạo · mọi TV có mã ngay khi đăng ký" | AF-R01: đại lý khi đóng phí | **Đổi nghiệp vụ** (CR-07) |
| P8 | Admin › Thành viên | Bỏ cột "Khởi đầu" + nút Nhắc; bỏ ô lọc "Khởi đầu" (còn 6 ô) | Có cột + lọc + Nhắc | UI; thay bằng tự nhắc khi đăng nhập (CR-11, backend) |
| P9 | Admin › Phí thành viên | Cột Tên, Email, Nhóm tham gia; trạng thái "Miễn phí 3 tháng" | Không có cột nhóm, không trial | Backend nhỏ (cột) + trial |
| P10 | Admin › Bot | "Lịch chạy bot" (từ ngày / đến ngày); khung "AI tự chọn nhóm và trả lời từng tin" (số tin đọc, giãn cách, Quét & trả lời ngay, Dừng, nhóm đang theo dõi, lịch sử); modal "AI tạo kịch bản hội thoại hàng loạt" | Kịch bản theo luồng (D-50), không tự trả lời | **Backend lớn** |
| P11 | Admin › Affiliate › Chính sách | Bỏ dòng "Áp dụng trên phí năm…"; thẻ doanh thu tách DN / Cá nhân / Gọi vốn | Doanh thu một số | UI + tổng hợp nhỏ |
| P12 | Admin › Cài đặt › Cấu hình bảng giá (mới) | Sửa giá niêm yết / tháng, giá bán / năm (Cá nhân, DN), giá / dự án, gia hạn, thời hạn (Gọi vốn); cảnh báo giá tháng > niêm yết | Không có | **Backend lớn** (bảng `price_config`, mọi chỗ dùng giá) |
| — | Khác | Đường dẫn ảnh `./assets` → `assets` (không ảnh hưởng); bỏ `<title>` + favicon | — | Không làm |

## 3. Đặc tả mới nhưng prototype không đổi → giữ như hiện tại (ưu tiên prototype)

| Mục | Đặc tả v4.2 | Giữ |
|---|---|---|
| CR-02 / §27.4 | Đăng ký DN nhập MST trước, tự điền | Prototype không đổi form đăng ký → giữ D-89 (MST khai báo sau đăng nhập) |
| CH-02 / §27.10 | Danh mục hiện ở "widget Trợ lý OPC Hub" | Prototype vẫn không có markup Trợ lý → giữ D-92 (đã gỡ) |
| CR-01 | Chỉ SSO Google | Prototype `SSO=[google]` từ v4.0 → app đã theo |
| CH-05 | Copy đăng nhập theo NQ 86 | Prototype không đổi |

## 4. Đã khớp sẵn (không cần làm)

- BR-AFF-REV: hoa hồng tính trên số tiền gói thực trả (`listAmount = fee.amount`).
- BR-GV-06: hoa hồng Gọi vốn theo % Gọi vốn của chính sách (mặc định 10), không lấy % riêng đại lý.
- FX-05 tiền tố `OPCHUB` cho phí thành viên.

## 5. Câu hỏi cho owner (thay đổi backend / lớn) → Q-V4.2-1 … 6

> **Đã chốt D-94 (owner 27/10/2026, "1A 2A 3A 4B 5A 6 còn khá nhiều đấy"):** 1 làm · 2 tính 90 ngày từ ngày đăng ký · 3 làm · 4 **giữ 1 dự án / 1 khoản** · 5 làm · 6 **chưa chốt**.

| Q | Nội dung | Ảnh hưởng | Chốt |
|---|---|---|---|
| Q-V4.2-1 | Miễn phí 3 tháng (CR-04/06, BR-TRIAL, P1, P9): TK mới dùng đủ quyền 90 ngày, hết hạn → Bảng giá bắt buộc | Thay luồng "chờ thanh toán" hiện tại; enum phí thêm `trial`; cổng quyền; worker hết hạn | A — làm |
| Q-V4.2-2 | TK cũ chưa đóng phí khi bật trial (§27.14 #5) | Migration dữ liệu | A — 90 ngày từ ngày đăng ký |
| Q-V4.2-3 | Affiliate cho mọi TV ngay khi đăng ký (CR-07, P7) — thay AF-R01 | Đổi worker cấp mã; hoa hồng chỉ khi trả phí thật | A — làm |
| Q-V4.2-4 | Gọi vốn nhiều dự án / 1 lần CK + nội dung `GV10-11-12` + VietQR động (P2, P3) | Khoản thanh toán mới, đối soát, QR | B — giữ 1 dự án / 1 khoản |
| Q-V4.2-5 | Cấu hình bảng giá Admin (CR-08, P12) | Bảng giá động thay hằng số | A — làm |
| Q-V4.2-6 | Trình tạo gian hàng + media + đăng dự án từ gian hàng (P5, P6); File chia sẻ cả nhóm (P4); Bot tự trả lời + lịch + tạo hàng loạt (P10); bỏ Khởi đầu + tự nhắc khi đăng nhập (P8) | Mỗi mục một TIP | Chưa chốt |

Parity: các màn P1 → P12 có baseline mới; kết quả `ui-parity/results.*` của các màn này hết hiệu lực
cho đến khi đo lại.
