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
