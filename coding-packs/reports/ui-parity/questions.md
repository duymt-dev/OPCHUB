# UI parity — câu hỏi / mâu thuẫn giữa prototype và rule

> Gặp mâu thuẫn thì ghi ở đây, chọn phương án an toàn và làm tiếp (GOAL L0). PM trả lời ở cột cuối.

| # | Chỗ | Prototype | Rule | Đã chọn (an toàn) | PM |
|---|---|---|---|---|---|
| Q-01 | Đăng nhập | Một màn cho cả admin và user; admin còn chuyển qua lại User Portal | routing-auth.md: hai app, tài khoản admin không vào Portal | Hai app, chặn sai cổng (DV-01) | |
| Q-02 | Đăng nhập admin | Không có bước TOTP | routing-auth.md: Admin bắt buộc TOTP sau mật khẩu | Chưa làm TOTP ở L0 (mock); để L2 thêm màn A-xx TOTP — prototype không có mẫu UI, cần duyệt thiết kế | |
| Q-03 | "Ghi nhớ đăng nhập" | Mặc định bật | Token chỉ trong bộ nhớ, refresh cookie httpOnly | Gửi `remember` lên API; backend quyết định thời hạn cookie refresh | |
| Q-04 | Tài khoản dùng thử | Hiện email + mật khẩu demo ngay trên màn đăng nhập | security.md: không lộ thông tin đăng nhập | Giữ để đạt parity và cho demo; **phải ẩn ở build production** (cờ env, làm khi có backend) | |
| Q-05 | Ảnh mẫu | Unsplash, randomuser.me, flagcdn hotlink | nextjs-structure.md: ảnh qua `next/image` + remotePatterns MinIO/Cloudflare | Giữ URL ngoài trong fixtures cho parity; thay bằng ảnh tự host trước go-live | |
| Q-06 | Font | Google Fonts Noto Sans (6 họ chữ, ~tải lớn) | Ngân sách First Load JS/CSS | App dùng font hệ thống (cùng stack); harness parity chặn Google Fonts ở **cả hai bên** để so công bằng. Cần chốt có tự host Noto Sans không | |
| Q-07 | Số liệu "312 đang trực tuyến", "+452", "4.218" trên màn đăng nhập | Số cứng hoặc mô phỏng | Dữ liệu thật từ API | Lấy từ fixtures; L1 nối `GET /v1/public/stats` (chưa có trong SRS §13 — cần bổ sung) | |
| Q-08 | Paywall "gói dịch vụ bắt buộc" (C-01) | Không tái hiện được: TK user duy nhất luôn đã đóng phí | routing-auth.md: `PaywallGate` khi `pending_payment`/`expired` | MSW thêm TK demo chưa đóng phí (ví dụ `chua.dongphi@…`) để chụp được P-xx paywall; chụp parity so với bản dựng tay từ template | |
| Q-09 | Đăng ký/SSO xong không đăng nhập (C-02) | Báo "Tài khoản đã kích hoạt" rồi quay về màn đăng nhập; mail chào mừng gửi mật khẩu tạm dù người dùng đã đặt mật khẩu | Luồng QT đăng ký trong SRS | Theo SRS: kích hoạt xong vào thẳng `/community`; bỏ mật khẩu tạm trong mail chào mừng khi người dùng tự đặt | |
| Q-10 | Admin ↔ User Portal (C-03) | Nút chuyển sang Portal không bao giờ hiện; "Hồ sơ cá nhân", "Xem chat" của admin không làm gì | Hai app tách (Q-01) | Admin có trang `/account` riêng trong app admin; "Xem chat" = trình xem chỉ đọc trong admin. Cần PM chốt | |
| Q-11 | Bảo mật chưa có lối vào (C-05/C-06) | Panel SSO, chính sách mật khẩu, 2FA admin, khóa sau 5 lần sai, màn Marketing có trong template nhưng không có tab/menu | security.md | Dựng các panel này thành tab trong Cài đặt (D-xx đã liệt kê là "unreachable"); chờ PM xác nhận vị trí | |
| Q-12 | Dữ liệu lệch giữa màn (C-04/C-08) | Cộng đồng 64 / 36 / 34; Super Admin dùng email của TK thành viên demo; thông báo của user hiện ở admin | Nguồn số liệu thật từ API | Lấy số từ API khi có backend; thông báo tách theo người dùng; tài khoản Super Admin seed = `admin@opchub.community` | |
| Q-13 | Thao tác admin nguy hiểm (C-10) | Đổi quyền hệ thống inline, khóa hàng loạt, xóa, xuất CSV không xác nhận, không audit | AGENTS luật 10 (audit_logs), data-state.md (`Modal.confirm`) | App mới luôn `Modal.confirm` + gửi audit; lệch UI ghi vào deviations khi làm D-xx | |
| Q-14 | Phí: xác nhận chuyển khoản (C-09) | "Tôi đã chuyển khoản" tự kích hoạt sau 2,2 giây | Đối soát webhook ngân hàng + outbox | MSW giả lập trễ như prototype; backend thật chờ webhook | |
