# OPC Hub Community – gói triển khai (v4.6 · 29/10/2026)

Thư mục tĩnh, chạy trên mọi hosting tĩnh (Nginx, Apache, Netlify, Vercel, Cloudflare Pages, Firebase Hosting, S3 + CloudFront).

## Cấu trúc
```
index.html      Ứng dụng User Portal + Admin Dashboard (bản mới nhất)
dac-ta.html     Tài liệu đặc tả v4.6 – mục 27–33 có hiệu lực khi khác mục 1–26 (33 = thay đổi mới nhất)
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
  location /g/ { try_files /index.html =404; }   # trang công khai gian hàng /g/tên
}
```
3. Bật HTTPS (Let's Encrypt). Ứng dụng tải font Google Fonts và ảnh Unsplash qua Internet.

## Tài khoản demo
- Thành viên (đã đóng phí): an.nguyen@mediasoft.vn
- Quản trị: admin@opchub.community
(Mật khẩu demo theo bản thiết kế; đổi khi triển khai thật.)

## Lưu ý
Đây là bản thiết kế tương tác (front-end, dữ liệu mẫu lưu trên trình duyệt). Backend, đối soát Vietcombank, Brevo SMTP, tra cứu MST, Google OAuth cần đội dev tích hợp theo đặc tả mục 3, 27.4, 29 và 33.6 (cổng đối soát Casso/SePay/VCB, Zalo ZNS, Web Push).

## Thay đổi v4.3 → v4.6
- Chia sẻ doanh thu Media Soft ↔ GĐ Vùng 50/50 → 60/40 → 70/30 → 80/20; chỉ tính khách qua link affiliate (cookie 30 ngày).
- Bổ nhiệm / thu hồi GĐ Vùng (1 người – 1 vùng), tab “Vùng của tôi” cho GĐ Vùng, phân quyền Admin.
- Nhóm 1: sửa treo Chat nhóm, giữ hạn phí khi thu hồi GĐ Vùng, bỏ hoa hồng 0đ, email bổ nhiệm/thu hồi, tự mở khóa.
- Nhóm 2: Nhắc gia hạn tự động 30/7/1 ngày; tỷ lệ chuyển đổi theo vùng; AI gợi ý nhu cầu phù hợp gian hàng.
- Nhóm 3: Đối soát ngân hàng (webhook), nhật ký thao tác Admin, xuất CSV.
- Nhóm 4: Tìm kiếm chung, cấu hình PWA & thông báo đẩy, trang công khai gian hàng /g/tên.
- Bộ lọc Admin › Thành viên; nhãn Affiliate gọn (% hoa hồng + thời gian ghi nhận).

## Thay đổi v4.2
- Gói Gọi vốn: chọn nhiều dự án, tính phí theo từng dự án; chỉ hiện dự án đã bật “Cần gọi vốn”.
- Popup thanh toán 2 cột, khung QR có trạng thái chờ tải.
- Đăng Dự án OPC từ Gian hàng địa phương.
- Hoa hồng 10% Gói Gọi vốn; doanh thu affiliate tách theo gói.
- Bộ lọc Admin › Thành viên; tài khoản 3 tháng miễn phí dùng đầy đủ tính năng theo gói.
