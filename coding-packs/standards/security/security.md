# Security

Mục tiêu OWASP ASVS L2 (SRS §14).

## Input và output

- Mọi input parse bằng zod ở biên (HTTP, socket, webhook, job).
- Rich text: server lọc bằng `sanitize-html` theo allowlist (đoạn văn, tiêu đề, danh sách, đậm, nghiêng, link `https`, ảnh từ domain MinIO). Lọc **lúc ghi**, client render qua `SafeHtml`.
- Tin chat là text thuần, không nhận HTML.
- SQL thô chỉ qua `Prisma.sql` tagged template / TypedSQL. Cấm `*Unsafe` với input.

## Token, CORS, CSRF

- Access token trong bộ nhớ; refresh token cookie `httpOnly; Secure; SameSite=Lax`, path hẹp. Không lưu token vào `localStorage`.
- Endpoint refresh kiểm header `Origin` thuộc whitelist.
- CORS chỉ cho origin portal và admin theo env.
- Header bảo mật qua `helmet` (CSP, HSTS, `X-Content-Type-Options`).

## Rate limit (`@nestjs/throttler` + Redis)

| Endpoint | Giới hạn |
|---|---|
| Đăng nhập | 10/phút theo IP + tài khoản |
| Gửi/gửi lại OTP | 3/15 phút theo email |
| Quên mật khẩu | 3/giờ theo tài khoản |
| Auth khác | 20/phút |
| API chung | 100/phút/người dùng |
| Gửi tin chat | 10/10 giây/người dùng |

## Upload

- Upload qua presigned PUT lên MinIO, API không nhận file.
- Whitelist MIME: `image/jpeg`, `image/png`, `image/webp`; tài liệu đính kèm email thêm `application/pdf`. Tối đa 5MB.
- Key object do server sinh ngẫu nhiên, không dùng tên file của người dùng. Sau upload, server kiểm lại kích thước và kiểu thật.

## Webhook ngân hàng

- Đọc **raw body**, kiểm chữ ký HMAC-SHA256 bằng `crypto.timingSafeEqual`. Sai chữ ký thì trả 401 và log.
- Kiểm thêm whitelist IP của nhà cung cấp nếu họ có công bố.
- Lưu raw payload vào `payment_transactions.raw`; xử lý idempotent theo `(provider, bank_txn_id)`.

## Secret và dữ liệu cá nhân

- Secret lấy từ env (file env trên VPS, quyền 600). Không commit.
- SMTP key, secret của nhà cung cấp lưu trong DB thì mã hóa AES-256-GCM, khóa lấy từ env.
- Che SĐT/email trong log, và trong file xuất cho vai trò không có quyền xem đầy đủ. Mọi lần xuất đều ghi `audit_logs`.
- Không trả lỗi kiểu "email không tồn tại" ở đăng nhập và quên mật khẩu; dùng thông báo chung.

## Phụ thuộc

- `pnpm audit` chạy trong CI; lỗ hổng mức high trở lên chặn merge.
- Không thêm package ít người dùng hoặc không còn bảo trì nếu chưa ghi lý do.
