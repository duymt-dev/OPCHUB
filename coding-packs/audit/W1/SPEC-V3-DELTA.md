# AUDIT-W1 — Thay đổi đặc tả v2.0 → SRS-3.6 (SPEC-V3-DELTA)

> So `docs/spec/dac-ta.html` (OPCHUB-SRS-2.0, dùng cho B1–B6 và audit W1) với `docs/spec/ver2/dac-ta.html` (OPCHUB-SRS-3.6, ngày 16–18/10/2026). Prototype `ver2/index.html` được cập nhật theo.
> Chỉ nêu khác biệt và tình trạng code ở `main` @ `b47eff7`, không nêu giải pháp. Câu cần PM quyết nằm ở `OPEN-QUESTIONS.md`, mục N.

## 1. Gói tài liệu `docs/spec/ver2/`

| File | So với bản cũ |
|---|---|
| `dac-ta.html` | 243 KB → 578 KB. Text 939 → 1.906 dòng |
| `index.html` (prototype) | 820 KB → 939 KB. Thêm màn Affiliate, Kế toán, Biên tập nội dung, chế độ chỉ xem, xem thử, đổi mật khẩu lần đầu, Google Meet, ghi chú "không hoàn lại" |
| `README.md` | Ghi phiên bản gói: prototype "v4 Ant (popup Gói dịch vụ V4, 6 dịch vụ)", đặc tả "SRS-3.6" |
| `doc-page.js`, `support.js` | Giống hệt |
| `assets/` | Thêm `sv-hero-v6.png` |
| `OPCHUB Thiết kế giải pháp cộng đồng_V4.pdf` | Mới (1,6 MB) |
| `deploy.zip` | Bản đóng gói của chính các file trên |

Nhãn phiên bản trong tài liệu không thống nhất: thẻ `<title>` ghi v3.2, trang bìa ghi 3.5, mã tài liệu ghi SRS-3.6.

## 2. Đánh số lại mục

§8 mới (Nghiệp vụ ẩn) chèn vào nên mọi mục cũ từ §8 trở đi tăng thêm 1. Các tham chiếu trong `coding-packs` (TIP, report, standards, bộ audit W1) đều theo **số cũ**.

| Nội dung | Số cũ (v2.0) | Số mới (3.6) |
|---|---|---|
| Máy trạng thái | §8 | §9 |
| ERD | §9 | §10 |
| DFD | §10 | §11 |
| Ma trận thông báo & email | §11 | §12 |
| Quy tắc nghiệp vụ (BR) | §12 | §13 |
| API (quy ước, mã lỗi, realtime) | §13 | §14 |
| NFR / SLO / kiểm thử tải | §14 | §15 |
| Nghiệm thu UAT | §15 | §16 |
| Lộ trình, rủi ro, QĐ đã chốt | §16 | §17 |

## 3. Thay đổi trong các mục cũ

Nội dung §1–§17 cũ **giữ nguyên câu chữ**, kể cả QT-01→13, BR-01→13, §8 máy trạng thái, UAT-01→31, ngoại trừ:

- "Điều phối viên" đổi thành **"Giảng viên"** (ma trận quyền §2, tác nhân QT).
- Số mục trong các câu dẫn chiếu được cập nhật theo bảng ở mục 2.

## 4. Mục mới và tình trạng code

### 4.1 §8 Nghiệp vụ ẩn NA-01 → NA-29

Lịch job theo đặc tả và lịch job thực tế trong `apps/server/src/worker/schedules.ts`:

| Job theo đặc tả | Code |
|---|---|
| Quét bù đối soát 2 phút (NA-03) | Có (`poll`, 120s) |
| Nhắc và cập nhật hạn phí lúc 08:00 (NA-04) | Lệch: `feeStatus` chạy 00:05, không gửi mail nhắc |
| Quét sự kiện 15 phút: nhắc 24h, đóng đăng ký (NA-23) | Không có |
| Số liệu dashboard 3 giây (NA-24) | Không có job; FE dùng polling |
| Mở khoá đăng nhập sau 15 phút (NA-15) | Có, theo TTL Redis của D-44 |
| Audit và lưu giữ lúc 02:00 (NA-13) | Không thấy job dọn dữ liệu |

Các NA có điểm lệch với code hoặc với quyết định đã chốt:

| NA | Đặc tả | Hiện trạng |
|---|---|---|
| NA-04 | Mail nhắc ở T-30, T-7, T-0, T+3; nhãn Sắp hết hạn | Không có mail nhắc tự động. REQ-030 ghi 30/7/1 ngày. Xem BUG-018 |
| NA-08 | Bot "tự động 100%", **đăng ngay, không qua duyệt**, persona trả lời nhau sau 30s–5 phút, tối đa 120 tin mỗi phòng | Mâu thuẫn D-04/D-48 (luôn duyệt). Xem BUG-008 và M4 #2 |
| NA-11 | Gộp nhà đầu tư; tin đầu tiên của Admin chuyển Đã gửi → Đang trao đổi | Hai luồng bị tách (BUG-006); không chuyển trạng thái tự động |
| NA-16 | Khoá TK thì thu hồi refresh token, **ngắt WebSocket**, ẩn khỏi danh sách online, **tạm ẩn dự án Public** | Chỉ thu hồi refresh token. Không ngắt socket, không ẩn dự án (BUG-004/005). NA-16 **không nhắc** việc chuyển nhóm làm chủ về Admin như D-15 |
| NA-23 | Tự nhắc sự kiện 24h, tự đóng đăng ký | Không có job |
| NA-24, NA-25 | Số liệu realtime 3 giây; đếm tin chưa đọc | Badge chat cố định 18 (BUG-028); dashboard mô phỏng (BUG-012) |
| NA-26 | Xử lý ảnh tải lên | Ảnh lưu data URL (TD-014), quá ~75KB thì 500 (BUG-002) |
| NA-27 | Làm sạch nội dung editor | Bình luận lưu nguyên `<script>` (BUG-020) |
| NA-28 | Áp phân quyền ngay | Có `permVersion`; socket không kiểm lại (BUG-005) |
| NA-01, 02, 03, 05, 06, 07, 09, 10, 12, 14, 15, 17–22, 29 | — | Đã có tương ứng trong B1–B6; chưa đối chiếu từng bước sơ đồ mới |

### 4.2 §20 Module Affiliate (AF-R01 → R10, AF-01 → 03, AT-AF01 → 06): **chưa có gì**

- Đóng phí xong thì tự thành đại lý: mã sinh từ tên, link `opchub.community/r/MÃ`, % mặc định.
- Gắn mã khi đăng ký (link `/r/`, `?ref=`, hoặc nhập tay). Mã không tồn tại, tự giới thiệu hoặc đại lý đang tạm dừng thì chặn gửi form.
- Hoa hồng = 600.000đ × % (1–50%), **chỉ tính ở lần đóng phí đầu tiên**. Đại lý hết hạn phí thì Tạm dừng.
- Chi trả theo tháng, bắt buộc có tài khoản ngân hàng. Admin huỷ hoa hồng phải kèm lý do.
- Code: không có bảng, API hay màn nào (grep `referral|affiliate` = 0). Tác động: DB, outbox (`fee.activated` → hoa hồng), Portal (trang Affiliate, form đăng ký), Admin (menu Affiliate), phân quyền Kế toán.

### 4.3 §21 Tài khoản quản trị, vai trò & phân quyền (RB-R01 → R09, AT-RB01 → 06)

| Đặc tả | Code hiện tại |
|---|---|
| TK quản trị tách hẳn khỏi thành viên; menu Thành viên chỉ chứa người đăng ký qua form, cột "Vai trò khi đăng ký" chỉ đọc | Một bảng `users` với `system_role` (`super_admin`, `admin`, `moderator`, `member`) |
| 5 vai trò mặc định (Super Admin, Quản trị viên, Giảng viên, Kế toán, Biên tập nội dung) + vai trò tự tạo | Enum cố định 4 giá trị; không có vai trò tự tạo |
| 25 quyền theo 11 menu, tách Xem / Thao tác | 14 key (`packages/shared/src/permissions.ts`, D-20) |
| Ẩn menu khi vai trò không có quyền nào; dải "Chế độ chỉ xem" chặn nút | Chưa có |
| Super Admin "Xem thử" với một vai trò | Chưa có |
| Đổi vai trò, khoá, thu hồi TK quản trị ghi nhật ký | Có audit |

Ma trận mặc định §21.2 có ô lạ: **Quản trị viên không có quyền "Chi trả hoa hồng"**, **không ai ngoài Super Admin có "Tài khoản quản trị & phân quyền"**.

### 4.4 §22 Bổ sung v3.5

| Mã | Đặc tả | Code hiện tại |
|---|---|---|
| EV-R01 | Trường Link Google Meet (`https://`), có nút "Tạo link Meet" | Chỉ có `place` (chuỗi) dùng chung cho địa chỉ và link; không có tạo link Meet |
| EV-R02, R03 | Khối "Sắp diễn ra" ở Admin; panel chi tiết có sao chép link và check-in | Chưa có khối "Sắp diễn ra" |
| EV-R04 | Link Meet **chỉ hiện sau khi đăng ký**; mail xác nhận kèm link | Chưa kiểm việc ẩn `place` với người chưa đăng ký |
| EV-R05 | Check-in từng người hoặc tất cả, hiện "Đã check-in x/y" | Có trạng thái `attended`; chưa đối chiếu UI "check-in tất cả" |
| SEC-R01 | TK quản trị đăng nhập lần đầu bằng mật khẩu tạm thì **bắt buộc đổi mật khẩu** (≥ 8 ký tự, có chữ hoa và số, khác mật khẩu tạm) | Server có cờ `mustChangePassword`, nhưng Admin FE không đọc cờ này, nên không có màn bắt buộc |
| SEC-R02 | Cột "Bảo mật 2FA"; bật "Yêu cầu 2FA" thì bắt thiết lập ở lần đăng nhập sau | TOTP là mã chết (BUG-015) |
| SEC-R03 | Khoá đăng nhập tạm và thu hồi phiên áp dụng cả TK quản trị | Khoá tạm có; thu hồi phiên realtime thiếu (BUG-005) |
| GR-R01, R02 | Gán vào nhóm chọn vai trò Thành viên / **Giảng viên**; hiện trong danh sách phòng chat | Enum `group_role` gồm `owner`, `moderator`, `member`; hộp gán nhóm không chọn được vai trò |
| IV-R01 → R03 | Trao đổi nhà đầu tư dùng chung một luồng hai chiều; NĐT nhận thông báo in-app; tin đầu tiên chuyển trạng thái | BUG-006: hai bảng riêng; không có thông báo |
| NR-R01 → R03 | Phí **không hoàn lại**; phải đồng ý tại ô điều khoản lúc đăng ký và lúc tham gia cộng đồng, và tại khung "Điều kiện thanh toán" trong popup | Portal không có câu "không hoàn lại". Cần đối chiếu ô đồng ý điều khoản hiện tại |

### 4.5 §23 Kiểm tra logic User ↔ Admin (v3.6)

- Ma trận LK-01 → LK-12 đối chiếu thao tác User ↔ màn Admin ↔ trạng thái dữ liệu. Trên server thật, LK-07 lệch (BUG-006), LK-11 lệch (BUG-008), LK-10 chưa có module.
- Popup Gói dịch vụ V4 (UP-07):
  - cột trái hiện "50.000đ/tháng (thanh toán theo năm 600.000đ, niêm yết 200.000đ/tháng, ưu đãi 75%)";
  - cột phải có 6 dịch vụ, mỗi dịch vụ có nút "Tư vấn →";
  - desktop ≥ 1100px thì thu nhỏ để vừa một màn hình, không cuộn.
  - Code đang theo prototype cũ, cần so ảnh lại (parity).
- KT-01 → 04: KT-01 đóng vấn đề vị trí Kiểm duyệt tin nhắn (đã làm theo QĐ-03). KT-03 vẫn mở đối soát VCB và nguồn tra MST.
- Nghiệm thu bổ sung AT-LK01 → 05.

### 4.6 §18, §19

Tài liệu tham khảo: bản đồ luồng theo 8 miền, chuỗi end-to-end, luồng Trước / Sau theo từng phiên bản 1.0 → 3.3. Không thêm quy tắc mới.

## 5. Mâu thuẫn

| # | Giữa | Nội dung |
|---|---|---|
| 1 | NA-08, LK-11 ↔ D-04, D-48, D-05 | Bot đăng ngay, không duyệt, tự động 100% ↔ luôn duyệt, sau feature flag |
| 2 | §21 ↔ D-20, D-42 | 25 quyền và vai trò tự tạo ↔ 14 quyền, enum vai trò cố định; RB-R01 bỏ "quyền hệ thống" trên thành viên |
| 3 | NA-04 ↔ REQ-030 ↔ code | Nhắc T-30/T-7/T-0/T+3 lúc 08:00 ↔ 30/7/1 ngày ↔ không nhắc, job chạy 00:05 |
| 4 | NA-16 ↔ D-15 | NA-16 ẩn dự án Public và ngắt socket, không nhắc chuyển nhóm ↔ D-15 yêu cầu chuyển nhóm làm chủ về Admin |
| 5 | LK-10 ↔ NR-R01 | Đại lý "tạm dừng nếu hoàn phí" ↔ phí không hoàn lại trong mọi trường hợp |
| 6 | RB-R04 / §2 ↔ GR-R01 | "Giảng viên" vừa là vai trò quản trị (RB-R04) vừa là vai trò trong nhóm (GR-R01), không cấp quyền Admin |
| 7 | Nhãn phiên bản | `<title>` v3.2, bìa 3.5, mã SRS-3.6 |

## 6. Ảnh hưởng tới bộ audit W1

- `BUGS.md`, `TEST-GAPS.md`, `SUMMARY.md` dẫn số mục theo v2.0 (§8 = máy trạng thái, §11 = ma trận thông báo, §13 = API, §15 = UAT). Đọc theo bảng ở mục 2.
- Đặc tả mới **củng cố** các lỗi BUG-004, 005 (NA-16), 006 (IV-R01→03), 012, 028 (NA-24/25), 015 (SEC-R02), 020 (NA-27), 002 (NA-26). Riêng BUG-008 cần đánh giá lại mức theo kết quả câu N-01.
- `TEST-GAPS.md` **chưa truy vết** NA-01→29, AF-R01→R10, RB-R01→R09, EV/SEC/GR/IV/NR, LK-01→12 và các bộ nghiệm thu AT-AF, AT-RB, AT-LK, §22.6. Toàn bộ các mục mới này hiện không có test.
