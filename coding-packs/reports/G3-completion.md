# G3 — Portal: Sự kiện, Dự án, Gói dịch vụ, Hồ sơ, Phí thành viên (P-49 → P-95)

> Hoàn thành 17/10/2026. Ba làn song song (worktree riêng), agent chính gộp, đo lại và chạy cổng kiểm trên `main`.
> SHA mã nguồn cuối pha: `6b59c80` (báo cáo này ở commit kế tiếp).

## Đã làm

| Làn | Nội dung | Commit (merge) |
|---|---|---|
| G3a | Sự kiện `/events` (lọc, đăng ký, modal chi tiết P-49 → P-54); popup Gói dịch vụ, form tư vấn cá nhân/doanh nghiệp (P-79 → P-83); Phí thành viên: chuyển khoản, nội dung CK, webhook ngân hàng giả, popup bắt phí `PaywallGate` (P-84 → P-88) | 435ebfb |
| G3b | Dự án (P-55 → P-78): danh sách, lọc, chi tiết, gọi vốn, tạo/sửa dự án với `packages/ui/rich-text-field` | 2489822 |
| G3c | Hồ sơ cá nhân (P-89 → P-95): tab trên URL, thông tin cá nhân, doanh nghiệp (huy hiệu xác minh D-40), đổi mật khẩu, SSO, ảnh đại diện | f9fa04a |
| Sửa sau gộp | Breadcrumb hồ sơ, màu avatar theo công thức prototype, huy hiệu D-40 (b02e87e); đăng xuất không còn đua `login?next` (bbceb75 — A-29 chập chờn); form tư vấn dùng `RichTextField` chung (6b59c80) | b02e87e, bbceb75, 6b59c80 |

MSW bổ sung (đề nghị cập nhật SRS §13 nếu thiếu): `GET /events`, `POST|DELETE /events/:id/registration`, `GET /services`, `POST /service-requests`, `GET /me/membership/transfer`, webhook ngân hàng giả, `GET|POST|PATCH /projects…`, `GET|PATCH /me`, `POST /me/password`, `POST /me/sso/:provider`, upload ảnh đại diện.

## Kiểm (trên `main` @ 6b59c80)

- `pnpm lint`, `typecheck`, `test` (portal 84, shared 41, ui 22, admin 25), `depcheck` (0 vi phạm), `build` portal + admin: xanh.
- `pnpm e2e` behavior: 61/61.
- Parity `P-*,A-*,D-01`: 228 đạt, 12 unreachable, 2 lệch = P-05 (DV-G2a-1, D-30, có từ G2). `A-*`, `D-01` vẫn đạt (A-29 0,12/0,36%).

## Parity P-49 → P-95 (+ P-16 hoãn từ G2), % chênh

| ID | Màn | 1440 | 390 | Kết quả |
|---|---|---|---|---|
| P-16 | Sidebar · sự kiện gần nhất | 0,04 | 0,08 | ✅ |
| P-49 | Sự kiện | 0,04 | 0,08 | ✅ |
| P-50 | Sự kiện · đã đăng ký | 0,03 | 0,08 | ✅ |
| P-51 | Sự kiện · trống | 0,07 | 2,17 | ✅ |
| P-52 | Chi tiết sự kiện | 0,03 | 0,00 | ✅ |
| P-53 | Sự kiện · đăng ký e1 | 0,04 | 0,08 | ✅ |
| P-54 | Sự kiện · hết chỗ | 0,03 | 0,00 | ✅ |
| P-55 | Dự án · khám phá | 0,06 | 0,10 | ✅ |
| P-56 | Dự án · dạng bảng | 0,07 | 0,17 | ✅ |
| P-57 | Dự án · lọc giai đoạn + sắp xếp | 0,07 | 0,12 | ✅ |
| P-58 | Dự án · trống | 0,02 | 0,05 | ✅ |
| P-59 | Dự án · theo dõi | 0,07 | 0,40 | ✅ |
| P-60 | Dự án của tôi | 0,01 | 0,04 | ✅ |
| P-61 | Dự án của tôi · trống | – | – | unreachable — TK demo duy nhất của prototype sở hữu p10 (OPC Hub Mobile); không có user nào chưa có dự án. |
| P-62 | Chi tiết dự án · Tổng quan | 0,02 | 0,05 | ✅ |
| P-63 | Chi tiết dự án · Cập nhật | 0,19 | 0,41 | ✅ |
| P-64 | Chi tiết dự án · Đội ngũ | 0,18 | 0,38 | ✅ |
| P-65 | Chi tiết dự án · Góp ý | 0,19 | 0,35 | ✅ |
| P-66 | Góp ý · ô trả lời | 0,17 | 0,36 | ✅ |
| P-67 | Góp ý · trống | 0,25 | 0,52 | ✅ |
| P-68 | Dự án · repo riêng tư, đã xin quyền | 0,02 | 0,04 | ✅ |
| P-69 | Dự án · khối gọi vốn | 0,02 | 0,05 | ✅ |
| P-70 | Modal quan tâm đầu tư | 0,01 | 0,04 | ✅ |
| P-71 | Đã gửi quan tâm đầu tư | 0,02 | 0,05 | ✅ |
| P-72 | Chủ dự án · nhà đầu tư quan tâm | 0,01 | 0,03 | ✅ |
| P-73 | Form đăng dự án | 0,37 | 0,32 | ✅ |
| P-74 | Form dự án · báo thiếu tên | 0,37 | 0,25 | ✅ |
| P-75 | Form dự án · mở gọi vốn | 0,02 | 2,28 | ✅ |
| P-76 | Form dự án · chỉnh sửa | 0,45 | 0,44 | ✅ |
| P-77 | Dự án · đã lưu nháp | 0,02 | 0,07 | ✅ |
| P-78 | Modal chia sẻ dự án | 0,02 | 0,69 | ✅ |
| P-79 | Popup Gói dịch vụ | 0,36 | 1,25 | ✅ |
| P-80 | Form tư vấn · cá nhân | 0,16 | 1,94 | ✅ |
| P-81 | Form tư vấn · doanh nghiệp (mặc định) | 0,16 | 1,94 | ✅ |
| P-82 | Form tư vấn · báo thiếu | 0,39 | 2,48 | ✅ |
| P-83 | Đã gửi yêu cầu tư vấn | 0,11 | 0,20 | ✅ |
| P-84 | Thông tin chuyển khoản | 0,08 | 0,21 | ✅ |
| P-85 | Chuyển khoản · đã sao chép | 0,12 | 2,23 | ✅ |
| P-86 | Chuyển khoản · đang đối soát | 0,08 | 0,00 | ✅ |
| P-87 | Popup bắt đóng phí | – | – | unreachable — Prototype chỉ có TK m1 và luôn tính lại phí m1 = còn hiệu lực mỗi lần render (FEE.m1); không có TK chưa đóng phí (C-01). |
| P-88 | Banner chờ thanh toán | – | – | unreachable — Mã chết trên prototype: payBanner:false gán cứng (C-01). |
| P-89 | Hồ sơ · thông tin cá nhân | 0,05 | 0,00 | ✅ |
| P-90 | Hồ sơ · báo thiếu họ tên | 0,05 | 0,00 | ✅ |
| P-91 | Hồ sơ · thông tin doanh nghiệp | 0,76 | 1,78 | ✅ |
| P-92 | Hồ sơ · nhóm & hoạt động | 0,05 | 0,64 | ✅ |
| P-93 | Hồ sơ · bảo mật | 0,17 | 0,39 | ✅ |
| P-94 | Đổi mật khẩu · báo thiếu | 0,17 | 0,49 | ✅ |
| P-95 | Hồ sơ · số Dự án → Dự án của tôi | 0,01 | 0,04 | ✅ |

Tổng: 45 dòng đạt ≤ 3% ở mọi viewport đo; 3 dòng unreachable trên prototype (P-61, P-87, P-88) — màn vẫn dựng theo D-xx và có test hành vi (`projects.spec`, `membership.spec`).

## Deviation / câu hỏi mới

- Deviation: DV-G3a-1 → 6, DV-G3b-1 → 7, DV-G3c-1 → 3 (`deviations.md`).
- Câu hỏi: Q-G3a-1 → 6, Q-G3b-1 → 7, Q-G3c-1 → 4 (`questions.md`), đã chọn phương án an toàn.

## Chưa làm

- Ảnh dự án tải lên thật qua presigned URL (Q-G3b-6) — đang dùng MSW.
- Nút "Nhắn tin" với chủ dự án chỉ báo toast (chưa có chat 1-1).
- Kích hoạt thành viên sau chuyển khoản: chưa thăm dò/đẩy realtime, cần tải lại trang.
