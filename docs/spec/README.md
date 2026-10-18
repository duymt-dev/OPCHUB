# OPC Hub Community – gói triển khai

Thư mục tĩnh, chạy trực tiếp trên mọi hosting tĩnh (Netlify, Vercel, Cloudflare Pages, Firebase Hosting, AWS S3 + CloudFront, Nginx).

## Cấu trúc
```
index.html        Ứng dụng (User Portal + Admin)
dac-ta.html       Tài liệu đặc tả v3.2 (OPCHUB-SRS-3.2)
support.js        Runtime (bắt buộc, cùng thư mục với các file .html)
doc-page.js       Khung trang in cho dac-ta.html
assets/           Logo, QR thanh toán
```
Mọi đường dẫn là tương đối (`./`), tên file không dấu, không khoảng trắng — có thể đặt ở gốc tên miền hoặc thư mục con.

## Triển khai
- Upload **toàn bộ** thư mục, giữ nguyên cấu trúc.
- Document root = thư mục này; trang mặc định = `index.html`.
- Không cần build, không cần server-side.

## Phụ thuộc bên ngoài (cần internet)
Google Fonts, ảnh mẫu Unsplash, randomuser.me (ảnh đại diện mẫu), bản đồ nhúng Google Maps.

## Lưu ý
Đây là bản thiết kế tương tác: dữ liệu mẫu, đăng nhập/OTP/thanh toán/SMTP là giả lập trong trình duyệt.

## Tài khoản dùng thử
- User (đã thanh toán phí): an.nguyen@mediasoft.vn / User@2026 → User Portal
- Admin: admin@opchub.community / Admin@2026 → Admin Dashboard
Hai tài khoản tách biệt, không chuyển qua lại được; đăng xuất để đổi tài khoản.

## Phiên bản gói
- index.html: OPC Hub Community v4 Ant (popup Gói dịch vụ V4, 6 dịch vụ)
- dac-ta.html: Đặc tả OPCHUB-SRS-3.6
