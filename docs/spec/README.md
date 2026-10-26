# OPC Hub Community – gói triển khai (v4.0 · 23/10/2026)

Thư mục tĩnh, chạy trên mọi hosting tĩnh (Nginx, Apache, Netlify, Vercel, Cloudflare Pages, Firebase Hosting, S3 + CloudFront).

## Cấu trúc
```
index.html      Ứng dụng User Portal + Admin Dashboard (bản mới nhất)
dac-ta.html     Tài liệu đặc tả v4.0 (OPCHUB-SRS-4.0) – mục 27 có hiệu lực khi khác mục 1–26
support.js      Runtime bắt buộc, cùng thư mục với các file .html
doc-page.js     Khung trang in cho dac-ta.html
assets/         Logo, QR thanh toán, ảnh đăng nhập, ảnh dịch vụ
mau-bao-cao/    Mẫu báo cáo
```
Mọi đường dẫn là tương đối (./), tên file không dấu, không khoảng trắng – đặt được ở gốc tên miền hoặc thư mục con.

## Triển khai
1. Upload toàn bộ nội dung thư mục lên web root (vd. /var/www/opchub).
2. Nginx tối thiểu:
```
server {
  listen 80; server_name opchub.community;
  root /var/www/opchub; index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location /r/ { try_files /index.html =404; }   # link giới thiệu Affiliate /r/MÃ
}
```
3. Bật HTTPS (Let's Encrypt). Ứng dụng tải font Google Fonts và ảnh Unsplash qua Internet.

## Tài khoản demo
- Thành viên (đã đóng phí): an.nguyen@mediasoft.vn
- Quản trị: admin@opchub.community
(Mật khẩu demo theo bản thiết kế; đổi khi triển khai thật.)

## Lưu ý
Đây là bản thiết kế tương tác (front-end, dữ liệu mẫu lưu trên trình duyệt). Backend, đối soát Vietcombank, Brevo SMTP, tra cứu MST, Google OAuth cần đội dev tích hợp theo đặc tả mục 3 và 27.4.
