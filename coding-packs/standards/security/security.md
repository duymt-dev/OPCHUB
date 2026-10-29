# Security

Mục tiêu OWASP ASVS L2 (SRS §15).

## Input và output

- Rich text: server lọc bằng DOMPurify (`common/html/sanitize.ts`) theo allowlist (đoạn văn, tiêu đề, danh sách, đậm, nghiêng, link `http`/`https`/`mailto`, giữ biến email `{{x}}`; không nhận `<img>` — ảnh đi qua upload presign). Chuỗi thuần (mọi `ZodBody` trừ `raw`) bị bỏ thẻ. Lọc **lúc ghi** (NA-27), client render qua `SafeHtml`.
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
- Whitelist MIME theo loại (`UPLOAD_KINDS` trong `packages/shared`):

| Loại | MIME | Tối đa |
|---|---|---|
| Ảnh (avatar, bìa, logo, gallery, chứng nhận, ảnh chat) | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| File chat (D-98) | pdf, doc/docx, xls/xlsx, csv, ppt/pptx, ảnh | 20 MB |
| Hồ sơ năng lực gian hàng (D-114) | pdf, ppt/pptx, doc/docx | 20 MB |
| Video gian hàng (D-114) | `video/mp4`, `video/webm` | 100 MB |
| Đính kèm email | thêm `application/pdf` | 5 MB |

- **Chặn file thực thi (D-117 B5):** từ chối theo **đuôi tên** (exe, bat, cmd, com, msi, scr, js, vbs, ps1, sh, apk, jar…), đuôi phải **khớp MIME** khai báo, và sau upload kiểm **magic bytes** của object; sai thì xoá object, trả 422.
- Key object do server sinh ngẫu nhiên, không dùng tên file của người dùng. Sau upload, server kiểm lại kích thước và kiểu thật.
- **Tải file (D-98, D-117 B6, V-15):** file chat và tài liệu riêng **không** có URL công khai. API kiểm quyền (thành viên nhóm / chủ gian hàng / Admin) rồi trả `presignGet` hạn ngắn (≤ 5 phút). Ảnh công khai đã hiển thị (bìa, logo, gian hàng đã xuất bản) được dùng URL công khai.

## Webhook ngân hàng

- Đọc **raw body**, kiểm chữ ký HMAC-SHA256 bằng `crypto.timingSafeEqual`. Sai chữ ký thì trả 401 và log.
- Kiểm thêm whitelist IP của nhà cung cấp nếu họ có công bố.
- Lưu raw payload vào `payment_transactions.raw`; xử lý idempotent theo `(provider, bank_txn_id)`.

## Secret và dữ liệu cá nhân

- Secret lấy từ env (file env trên VPS, quyền 600). Không commit.
- SMTP key, **LLM key (D-99, ADR-0008)**, secret của nhà cung cấp lưu trong DB thì mã hóa AES-256-GCM (`common/crypto/secret-box.ts`), khóa lấy từ env; API không bao giờ trả lại key, chỉ trả cờ "đã đặt" + 4 ký tự cuối.
- Che SĐT/email trong log, và trong file xuất cho vai trò không có quyền xem đầy đủ. Mọi lần xuất đều ghi `audit_logs`.
- Không trả lỗi kiểu "email không tồn tại" ở đăng nhập và quên mật khẩu; dùng thông báo chung.

## Phụ thuộc

- `pnpm audit` chạy trong CI; lỗ hổng mức high trở lên chặn merge.
- Không thêm package ít người dùng hoặc không còn bảo trì nếu chưa ghi lý do.
