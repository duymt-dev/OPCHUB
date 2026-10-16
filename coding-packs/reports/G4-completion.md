# G4 — Admin: Thành viên, Phí, Nhóm cộng đồng, Bot (D-02 → D-41)

> Hoàn thành 18/10/2026. Bốn làn song song (worktree riêng), agent chính gộp, đo lại và chạy cổng kiểm trên `main`.
> SHA mã nguồn cuối pha: `f8bd159` (báo cáo này ở commit kế tiếp).

## Đã làm

| Làn | Nội dung | Commit (merge) |
|---|---|---|
| Khung (agent chính) | Chuông thông báo Admin theo TK (D-04), nút "Thu gọn sidebar" (D-05), `useUrlParams` + scheduler microtask cho admin; ẩn menu Bot khi tắt cờ (D-05) | 8e824ee, 3016a58, d80c280 |
| G4a | Thành viên `/members` (D-07 → D-17): danh sách/lưới, lọc loại + tìm trên URL, bulk khoá/mở/xuất/gán nhóm, modal gán nhóm, menu ⋯, đổi vai trò có xác nhận, drawer "Hồ sơ đăng ký" (xác minh/từ chối DN), phân trang; **khoá TK có xác nhận** (D-32, luật 10) | aaec3f6 |
| G4b | Phí thành viên `/fees` (D-18 → D-22): thống kê, tab trạng thái + tìm, bulk ghi nhận thu/nhắc/xuất, nhắc hàng loạt, phân trang | 2b3cc71 |
| G4c | Nhóm cộng đồng `/groups` (D-23 → D-35): lưới/bảng, lọc miền, bulk xoá/xuất, drawer tạo/sửa + kiểm lỗi, xuất thành viên, trình xem chat chỉ đọc (D-26), kiểm duyệt tin + từ khoá; xoá nhóm / "Ẩn & xóa" có xác nhận + audit | f8bd159 |
| G4d | Bot tương tác `/bots` (D-36 → D-41): nhật ký tự động, persona, kịch bản, hội thoại chờ duyệt (D-04), sau cờ `NEXT_PUBLIC_FEATURE_BOTS` (D-05); xoá có xác nhận + audit | b5f1d09 |

MSW bổ sung (ngoài SRS §13, đề nghị cập nhật — Q-G4a-1, Q-G4b-1, Q-G4c-1, Q-G4d-1): role/status hàng loạt/xác minh DN thành viên; tổng hợp, thu hàng loạt, nhắc tất cả, xuất phí; chi tiết nhóm, xuất thành viên nhiều nhóm, từ khoá kiểm duyệt, đọc phòng/tin cho trình xem; threads/activity của bot.

## Kiểm (trên `main` @ f8bd159)

- `pnpm install`, `lint` (0 lỗi; cảnh báo `<img>` ảnh ngoài theo D-36), `typecheck`, `test` (portal 84, admin 62, shared 45, ui 22), `depcheck` (0 vi phạm), `build`: xanh.
- `pnpm e2e` behavior: 84/84 (thêm admin-members 7, admin-fees 4, admin-groups 7, admin-bots 5).
- Parity `A-*`, `D-01`: vẫn đạt (A-12 chập chờn một lần khi chạy song song 47,59% → chạy lại 0,62/2,12%, 2/2 lần).

## Parity D-02 → D-41, % chênh

| ID | Màn | 1440 | 390 | Kết quả |
|---|---|---|---|---|
| D-02 | Admin · menu người dùng | 0,03 | 0,00 | ✅ |
| D-03 | Admin · Hồ sơ cá nhân (không đổi màn) | 0,00 | 1,41 | ✅ |
| D-04 | Admin · thông báo | 0,26 | 0,00 | ✅ |
| D-05 | Admin · sidebar thu gọn | 0,00 | – | ✅ |
| D-06 | Admin · drawer điều hướng | – | 0,00 | ✅ |
| D-07 | Thành viên · danh sách | 0,06 | 0,08 | ✅ |
| D-08 | Thành viên · lưới | 0,03 | 0,03 | ✅ |
| D-09 | Thành viên · lọc Doanh nghiệp | 0,05 | 0,10 | ✅ |
| D-10 | Thành viên · chọn nhiều | 0,06 | 0,08 | ✅ |
| D-11 | Thành viên · khóa hàng loạt | 0,06 | 0,08 | ✅ |
| D-12 | Modal gán vào nhóm | 0,02 | 0,00 | ✅ |
| D-13 | Thành viên · menu dòng | 0,05 | 0,01 | ✅ |
| D-14 | Thành viên · đã khóa 1 dòng | 0,06 | 0,08 | ✅ |
| D-15 | Thành viên · đổi quyền hệ thống | 0,06 | 0,07 | ✅ |
| D-16 | Drawer hồ sơ đăng ký | 0,00 | 0,00 | ✅ |
| D-17 | Thành viên · 6/trang, trang 2 | 0,03 | 0,08 | ✅ |
| D-18 | Phí thành viên | 0,10 | 0,20 | ✅ |
| D-19 | Phí · chờ thanh toán | 0,05 | 0,20 | ✅ |
| D-20 | Phí · chọn nhiều | 0,33 | 0,52 | ✅ |
| D-21 | Phí · ghi nhận đã thu | 0,08 | 0,15 | ✅ |
| D-22 | Phí · 6/trang, trang 2 | 0,02 | 0,05 | ✅ |
| D-23 | Nhóm cộng đồng · lưới | 0,01 | 0,01 | ✅ |
| D-24 | Nhóm cộng đồng · danh sách | 0,03 | 0,06 | ✅ |
| D-25 | Nhóm cộng đồng · Miền Trung | 0,01 | 0,01 | ✅ |
| D-26 | Nhóm cộng đồng · chọn nhiều | 0,03 | 0,06 | ✅ |
| D-27 | Nhóm cộng đồng · trang 2 | 0,01 | 0,01 | ✅ |
| D-28 | Drawer tạo nhóm | 0,05 | 0,18 | ✅ |
| D-29 | Tạo nhóm · báo thiếu tên | 0,05 | 0,18 | ✅ |
| D-30 | Drawer sửa nhóm | 0,10 | 0,40 | ✅ |
| D-31 | Modal xuất danh sách thành viên | 0,00 | 0,00 | ✅ |
| D-32 | Xem chat từ admin (không đổi màn) | 53,38 | 84,14 | DV-G4c-1 (D-26: trình xem chat chỉ đọc; prototype không đổi màn) |
| D-33 | Kiểm duyệt tin nhắn | 0,00 | 0,00 | ✅ |
| D-34 | Kiểm duyệt · hết tin | 0,02 | 0,01 | ✅ |
| D-35 | Kiểm duyệt · thêm từ khóa | 0,00 | 0,00 | ✅ |
| D-36 | Bot · nhật ký tự động | 0,08 | 1,13 | ✅ |
| D-37 | Bot · Persona | 0,05 | 0,24 | ✅ |
| D-38 | Drawer persona | 0,03 | 0,12 | ✅ |
| D-39 | Bot · Kịch bản hội thoại | 0,07 | 0,40 | ✅ |
| D-40 | Drawer kịch bản | 0,04 | 0,15 | ✅ |
| D-41 | Bot · Hội thoại | 0,05 | 0,34 | ✅ |

Tổng: 39 dòng đạt ≤ 3% ở mọi viewport đo (cao nhất D-36@390 1,13%); D-32 lệch theo D-26 (DV-G4c-1).

## Deviation / câu hỏi mới

- Deviation: DV-G4a-1 → 6, DV-G4b-1 → 4, DV-G4c-1 → 5, DV-G4d-1 → 6 (`deviations.md`).
- Câu hỏi: Q-G4a-1 → 6 (Q-G4a-4 đã giải), Q-G4b-1 → 4, Q-G4c-1 → 6, Q-G4d-1 → 5 (`questions.md`), đã chọn phương án an toàn. Cần PM chốt: Q-G4d-3 (chữ "tự động 100% không cần duyệt" mâu thuẫn D-04), Q-G4a-2 (sửa vai trò inline hay chỉ xem theo D-42).

## Chưa làm

- Tải file CSV khi job xuất xong (Q-G4a-6); xuất thành viên nhóm đang tạo file ở trình duyệt (Q-G4c-4).
- Upload ảnh bìa nhóm / ảnh persona qua presigned URL (Q-G4c-2, Q-G4d-2) — đang lưu data URL.
- Badge sidebar (Nhóm 4…) là số cố định, chưa nối API đếm (Q-G4c-5).
- Worker bot tự sinh/đăng hội thoại (BullMQ, S-11); khoá TK thật qua outbox khi "Khóa" từ kiểm duyệt (Q-G4c-3) — phần backend.
