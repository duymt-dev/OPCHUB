# G5 — Admin: Nội dung & Sự kiện, Dự án, Nhà đầu tư, Dịch vụ (D-42 → D-65)

> Hoàn thành 17/10/2026. Ba làn song song (worktree riêng), agent chính gộp, đo lại và chạy cổng kiểm trên `main`.
> SHA mã nguồn cuối pha: `6f86891` + sửa kịch bản A-29 (báo cáo này cùng commit). Bot tương tác đã làm ở G4 (D-36 → D-41).

## Đã làm

| Làn | Nội dung | Commit (merge) |
|---|---|---|
| G5a | Nội dung & Sự kiện `/events` (D-42 → D-50): lưới/danh sách, thống kê, lọc trạng thái/hình thức/tìm trên URL, 9/trang, drawer "Danh sách đăng ký" (check-in từng người/tất cả, xuất CSV có audit), drawer tạo/sửa Offline/Online, chia sẻ link thật | b7a2093 |
| G5b | Dự án `/projects` (D-51 → D-57): 6 tab trạng thái, lưới/danh sách, bulk duyệt/ẩn/xoá, drawer "Xem & duyệt" (nổi bật tuần, lý do, ghi chú `RichTextField`); chuyển trạng thái theo SRS §8 (sai → 409); xoá/ẩn/từ chối có xác nhận + audit | fdbd353 |
| G5c | Nhà đầu tư `/investors` (D-58 → D-60) + Dịch vụ `/requests` (D-61 → D-65): lọc/tìm/phân trang trên URL, drawer nhà đầu tư (bước trạng thái, gọi/sao chép), drawer yêu cầu (step bar, transition có điều kiện, từ chối có xác nhận / mở lại, phụ trách, bình luận), danh mục dịch vụ (ẩn/hiện, xoá có xác nhận, 409 khi đã có yêu cầu) | 809860d |
| Agent chính | Badge sidebar lấy từ API đếm (báo cáo mở / dự án chờ duyệt / yêu cầu mới), tự tải lại sau mọi thao tác ghi (Q-G4c-5, Q-G5b-3 đã giải); A-29 chờ form đăng nhập dựng xong (chập chờn khi máy bận) | 6f86891 |

MSW bổ sung (ngoài SRS §13, đề nghị cập nhật — Q-G5a-1, Q-G5b-1, Q-G5c-1, Q-G5c-2): check-in/xuất đăng ký sự kiện; counts/bulk/featured/delete dự án; nhà đầu tư gom theo người + transition; summary/staff/transition/comments yêu cầu dịch vụ, CRUD danh mục.

## Kiểm (trên `main`)

- `pnpm install`, `lint` (0 lỗi; cảnh báo `<img>` ảnh ngoài/data URL theo D-36), `typecheck`, `test` (portal 84, admin 87, shared 56, ui 22), `depcheck` (0 vi phạm), `build`: xanh.
- `pnpm e2e` behavior: 102/102 (thêm admin-events 4, admin-projects 5, admin-investors 4, admin-requests 5).
- Parity `D-01 → D-65`, `A-*`: 177 đạt, 6 unreachable, lệch chỉ D-32 (DV-G4c-1) và D-65 (DV-G5c-1); A-29@1440 chập chờn một lần (4,70%) → sửa kịch bản chờ form, đo lại 0,12/0,36%.

## Parity D-42 → D-65, % chênh

| ID | Màn | 1440 | 390 | Kết quả |
|---|---|---|---|---|
| D-42 | Sự kiện · lưới | 0,04 | 0,06 | ✅ |
| D-43 | Sự kiện · danh sách | 0,00 | 0,00 | ✅ |
| D-44 | Sự kiện · Đã đầy | 0,04 | 0,96 | ✅ |
| D-45 | Sự kiện · 6/trang | 0,04 | 0,06 | ✅ |
| D-46 | Drawer danh sách đăng ký | 0,02 | 0,01 | ✅ |
| D-47 | Drawer tạo sự kiện | 0,02 | 0,00 | ✅ |
| D-48 | Tạo sự kiện · Online | 0,02 | 0,02 | ✅ |
| D-49 | Drawer sửa sự kiện | 0,03 | 0,04 | ✅ |
| D-50 | Sự kiện · chia sẻ | 0,04 | 0,06 | ✅ |
| D-51 | Dự án · chờ duyệt | 0,02 | 0,05 | ✅ |
| D-52 | Dự án · Bị từ chối (trống) | 0,05 | 0,20 | ✅ |
| D-53 | Dự án · danh sách | 0,02 | 0,05 | ✅ |
| D-54 | Dự án · chọn nhiều | 0,02 | 0,05 | ✅ |
| D-55 | Drawer duyệt dự án | 0,01 | 0,04 | ✅ |
| D-56 | Dự án · đã duyệt | 0,02 | 0,06 | ✅ |
| D-57 | Dự án · Đang hiển thị | 0,01 | 0,02 | ✅ |
| D-58 | Nhà đầu tư | 0,03 | 0,03 | ✅ |
| D-59 | Nhà đầu tư · Quỹ | 0,03 | 0,03 | ✅ |
| D-60 | Drawer nhà đầu tư | 0,00 | 0,00 | ✅ |
| D-61 | Dịch vụ · yêu cầu | 0,02 | 0,03 | ✅ |
| D-62 | Dịch vụ · trống | 0,04 | 0,16 | ✅ |
| D-63 | Drawer yêu cầu YC-1005 | 0,18 | 0,18 | ✅ |
| D-64 | Yêu cầu · từ chối | 0,01 | 0,03 | ✅ |
| D-65 | Dịch vụ · danh mục | 24,31 | 27,69 | DV-G5c-1 (prototype lỗi gắn dữ liệu: 14 dòng rỗng dù tab ghi 6; app hiện 6 dịch vụ thật, bố cục khớp) |

Tổng: 23 dòng đạt ≤ 3% ở mọi viewport đo (cao nhất D-52@390 0,20%); D-65 lệch do lỗi gắn dữ liệu của prototype (DV-G5c-1, đã xem ảnh: 14 dòng placeholder rỗng).

## Deviation / câu hỏi mới

- Deviation: DV-G5a-1 → 5, DV-G5b-1 → 5, DV-G5c-1 → 6 (`deviations.md`).
- Câu hỏi: Q-G5a-1 → 6, Q-G5b-1 → 5, Q-G5c-1 → 7 (`questions.md`), đã chọn phương án an toàn. Cần PM chốt: Q-G5b-2 (dự án bị từ chối có được "Xuất bản lại" như prototype? hiện theo §8: không), Q-G5c-4 (enum `SERVICE_REQUEST_STATUS` thiếu `done`), Q-G5a-3 (có cần xoá/huỷ sự kiện).

## Chưa làm

- Portal đọc cờ `registrationOpen` của sự kiện (Q-G5a-5) và dự án nổi bật tuần (Q-G5b-4).
- Thông báo cho nhân sự được nhắc tên trong bình luận yêu cầu (cần outbox backend).
- Upload ảnh bìa sự kiện qua presigned URL (Q-G5a-2) — đang lưu data URL.
