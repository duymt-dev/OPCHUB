# G6 — Admin: Cài đặt & Phân quyền, Marketing (D-66 → D-80) + parity toàn bộ

> Hoàn thành 17/10/2026. Hai làn song song (worktree riêng), agent chính gộp, chạy cổng kiểm cuối và parity toàn bộ 205 dòng trên `main`.
> SHA mã nguồn cuối: `46bcf57` (báo cáo này ở commit kế tiếp).

## Đã làm

| Làn | Nội dung | Commit (merge) |
|---|---|---|
| Agent chính | Mục menu Marketing theo D-33 (prototype không có lối vào, C-05) | d7fbd98 |
| G6a | Cài đặt `/settings?tab=`: Chung, Danh mục lĩnh vực (thêm/sửa/ẩn/đổi thứ tự, xoá có xác nhận), Vai trò & phân quyền (ma trận 14 key D-20, Super Admin khoá cứng, lưu cần `s.role` + xác nhận D-42 + audit), Email chào mừng (D-30), SMTP Brevo (kiểm tra kết nối, không trả key), Tài khoản quản trị (mời, thu hồi có xác nhận), Nhật ký hoạt động (audit 90 ngày); **thêm tab SSO + chính sách bảo mật (D-44) và Ngôn ngữ theo D-33** | 46bcf57 |
| G6b | Marketing `/marketing`: thống kê, tab Chiến dịch / Email tự động / Nhật ký gửi, drawer tạo chiến dịch (mẫu, đối tượng, ước tính người nhận từ server, lên lịch), "Gửi ngay" / "Xóa" có xác nhận, gửi qua outbox (202), không gửi thật | aae46d2 |

## Kiểm cuối (trên `main` @ 46bcf57)

- `pnpm install --frozen-lockfile`, `lint` (0 lỗi; 12 cảnh báo `<img>` ảnh ngoài/data URL theo D-36), `typecheck`, `test` (portal 84, admin 108, shared 65, ui 22), `depcheck` (0 vi phạm, 918 module), `build` portal + admin: xanh.
- `pnpm e2e` behavior: **115/115** (thêm admin-settings 8, admin-marketing 5).
- `PARITY_IDS='*'`: 360 ảnh đạt, 20 ảnh unreachable (10 dòng), 18 ảnh lệch — toàn bộ có deviation. D-19@1440 lệch 7,71% một lần khi chạy cả bộ (máy bận), chạy lại 2/2 đạt 0,12/0,20%.

## Parity D-66 → D-80, % chênh

| ID | Màn | 1440 | 390 | Kết quả |
|---|---|---|---|---|
| D-66 | Cài đặt · Chung | 0,23 | 9,90 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-67 | Cài đặt · Danh mục lĩnh vực | 0,40 | 7,30 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-68 | Lĩnh vực · đang sửa | 0,41 | 7,04 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-69 | Cài đặt · Vai trò & phân quyền | 7,17 | 28,11 | DV-G6a-1 + DV-G6a-2 (D-20: ma trận 14 permission key thay 6–8 dòng gộp) |
| D-70 | Cài đặt · Email chào mừng | 0,37 | 13,35 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-71 | Cài đặt · SMTP | 0,22 | 11,95 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-72 | SMTP · lỗi xác thực | 0,22 | 15,83 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-73 | Cài đặt · Tài khoản quản trị | 0,17 | 10,60 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-74 | Tài khoản quản trị · đã mời | 0,17 | 12,65 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-75 | Cài đặt · Nhật ký hoạt động | 0,16 | 11,09 | DV-G6a-1 (D-33: thêm tab SSO + Ngôn ngữ đẩy nội dung 390 xuống 118px; 1440 đạt) |
| D-76 | Cài đặt · SSO | – | – | unreachable — Panel SSO: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-77 | Cài đặt · Ngôn ngữ | – | – | unreachable — Panel ngôn ngữ: setPage map tab sso/languages về general và danh sách tab không có mục này (C-05). |
| D-78 | Marketing | – | – | unreachable — Không có mục sidebar cho aTab='marketing' (C-05). |
| D-79 | Modal tạo chiến dịch email | – | – | unreachable — Chỉ mở được từ màn Marketing (D-78) — không có lối vào (C-05). |
| D-80 | Toast toàn cục | 0,77 | 2,21 | ✅ |

Đo thử khi ẩn hai tab SSO/Ngôn ngữ: D-66 → D-75 @390 còn ≤ 0,37% (trừ D-69) — chênh hoàn toàn do tab bắt buộc theo D-33, bố cục còn lại khớp.

## Tổng hợp parity toàn bộ 205 dòng

| Khu vực | Dòng | Đạt ≤ 3% | Deviation | Unreachable |
|---|---|---|---|---|
| Auth (A-01 → A-30) | 30 | 27 | 0 | 3 |
| Portal (P-01 → P-95) | 95 | 91 | 1 — P-05 (DV-G2a-1, D-30) | 3 |
| Admin (D-01 → D-80) | 80 | 64 | 12 — D-32 (DV-G4c-1, D-26), D-65 (DV-G5c-1, lỗi dữ liệu prototype), D-66 → D-75 (DV-G6a-1/2, D-33, D-20) | 4 |
| **Tổng** | **205** | **182** | **13** | **10** |

Unreachable có lý do: A-11 (tắt tự đăng ký cần state chung hai app, D-26), A-24 (D-30 vào thẳng /community), A-30 (panel SSO không có lối vào, C-05) — đều có test hành vi, P-61, P-87, P-88 (không có TK thiếu dự án / chưa đóng phí, mã chết payBanner), D-76 → D-79 (C-05: không có lối vào trên prototype — đã dựng theo D-33 và có test hành vi).

## Deviation / câu hỏi mới

- Deviation: DV-G6a-1 → 7, DV-G6b-1 → 4 (`deviations.md`).
- Câu hỏi: Q-G6a-1 → 6, Q-G6b-1 → 5 (`questions.md`), đã chọn phương án an toàn. Cần PM chốt: Q-G6a-2 (ma trận 14 key hay 6–8 dòng gộp như prototype), vị trí tab SSO/Ngôn ngữ ở 390 (DV-G6a-1), Q-G6b-3 (bỏ mật khẩu tạm trong mail chào mừng theo D-30/D-45).

## Chưa làm

- Portal/auth chưa đọc cấu hình chung, SSO, chính sách mật khẩu, ngôn ngữ (Q-G6a-5, Q-G6a-6).
- Upload logo nền tảng qua presigned URL (Q-G6a-3) — đang lưu data URL.
- Marketing: worker gửi thật qua adapter mail, tỉ lệ mở/nhấp từ webhook nhà cung cấp, huỷ chiến dịch đang gửi, link huỷ đăng ký (Q-G6b-4, Q-G6b-5).
- Toàn bộ backend NestJS/Prisma cho các endpoint đã thêm vào MSW (đề nghị cập nhật SRS §13: Q-G4*-1, Q-G5*-1, Q-G6*-1).
