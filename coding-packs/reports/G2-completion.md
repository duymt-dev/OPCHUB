# G2 — Portal: Tổng quan, Cộng đồng, Chat nhóm (P-01 → P-48)

> Hoàn thành 16/10/2026. Ba làn song song (worktree riêng), agent chính gộp, đo lại và chạy cổng kiểm trên `main`.

## Đã làm

| Làn | Nội dung | Commit (merge) |
|---|---|---|
| G2a | Dashboard (LIVE, quốc gia/tỉnh, lưới LIVE lọc + phân trang + chọn thành viên, tin nhắn, lịch, thảo luận), khung app dùng chung (`packages/ui/app-shell`: sidebar thu gọn 76px nhớ trạng thái, dropdown thông báo theo người D-29, menu người dùng, popover ngôn ngữ, drawer mobile), modal mail chào mừng (D-30) | a19e045 |
| G2b | Cộng đồng `/community`: tìm, lọc, sắp xếp, khu vực, phân trang trên URL; thẻ nhóm `packages/ui/group-card`; popup tham gia nhóm công khai / cần duyệt; rời nhóm, huỷ yêu cầu | 3f1aa5e |
| G2c | Chat `/chat/[group]/[channel]`: rail nhóm, chủ đề (tạo/xoá), gửi tin/file/ảnh, nhắc tên, reaction, trả lời, ghim, tìm trong phòng, panel Thành viên/File/Đã ghim + duyệt yêu cầu, báo cáo tin, xem trước nhóm chưa tham gia; lớp `ChatTransport` sẵn sàng thay Socket.IO (S-01 → S-12) | 8a46c22 |
| Sửa sau gộp | `useUrlParams` dùng chung — hai thao tác lọc liền nhau không ghi đè nhau (P-20 chập chờn); đưa vùng cuộn về đầu ở P-05/P-46 (prototype tự cuộn do tác dụng phụ) | 3f13ce1, 1e92e8f |

MSW bổ sung: `GET /dashboard/live`, `POST /notifications/read`, `GET /me/welcome-mail`, `GET /me/chat`, `GET|POST /groups/:id/rooms`, `DELETE /rooms/:id`, `POST /rooms/:id/read`, `POST /rooms/:id/messages`, `POST /messages/:id/reactions`, `PUT /messages/:id/pin`, `GET /rooms/:id/{members,pins,files}` (đề nghị cập nhật SRS §13 — Q-G2a-1, Q-G2c-2).

## Kiểm

- `pnpm install`, `lint` (0 lỗi; 3 cảnh báo `<img>` ảnh ngoài theo D-36), `typecheck`, `test` (portal 42, shared 33, ui 20, admin 25), `depcheck`, `build`: xanh.
- `pnpm e2e` (behavior): 36/36.
- Parity `A-*`, `D-01`: vẫn đạt (A-01 0,11/0,35%, D-01 0,00/0,00%).

## Parity P-01 → P-48 (% chênh)

| ID | 1440 | 390 | Kết quả |
|---|---|---|---|
| P-01 | 0,22 | 2,01 | ✅ |
| P-02 | 0,22 | 2,01 | ✅ |
| P-03 | 0,21 | 1,93 | ✅ |
| P-04 | 0,22 | 2,15 | ✅ |
| P-05 | 3,50 | 4,29 | DV-G2a-1 (D-30) |
| P-06 | 0,49 | 1,49 | ✅ |
| P-07 | 0,23 | 0,30 | ✅ |
| P-08 | 0,24 | 0,39 | ✅ |
| P-09 | 0,25 | 0,39 | ✅ |
| P-10 | 0,23 | 0,65 | ✅ |
| P-11 | 0,23 | 0,29 | ✅ |
| P-12 | 0,32 | 0,68 | ✅ |
| P-13 | 0,27 | – | ✅ |
| P-14 | – | 0,55 | ✅ |
| P-15 | 0,22 | – | ✅ |
| P-16 | – | – | đo ở G3 (cần `/events`) |
| P-17 | 0,38 | 0,49 | ✅ |
| P-18 | 0,21 | 0,43 | ✅ |
| P-19 | 0,38 | 0,55 | ✅ |
| P-20 | 0,37 | 0,47 | ✅ |
| P-21 | 0,15 | 0,32 | ✅ |
| P-22 | 0,38 | 1,37 | ✅ |
| P-23 | 0,57 | 0,91 | ✅ |
| P-24 | 0,66 | 1,23 | ✅ |
| P-25 | 0,30 | 0,42 | ✅ |
| P-26 | 0,38 | 0,45 | ✅ |
| P-27 | 0,38 | 0,49 | ✅ |
| P-28 | 0,62 | 1,38 | ✅ |
| P-29 | 0,23 | – | ✅ |
| P-30 | 2,09 | 0,76 | ✅ |
| P-31 | 1,40 | – | ✅ |
| P-32 | 0,23 | – | ✅ |
| P-33 | 0,23 | – | ✅ |
| P-34 | 0,92 | 2,71 | ✅ |
| P-35 | 0,26 | 0,74 | ✅ |
| P-36 | 0,62 | 1,52 | ✅ |
| P-37 | 0,50 | 1,35 | ✅ |
| P-38 | 0,50 | 1,35 | ✅ |
| P-39 | 0,43 | 1,25 | ✅ |
| P-40 | 0,49 | 0,01 | ✅ |
| P-41 | 1,40 | – | ✅ |
| P-42 | 0,49 | – | ✅ |
| P-43 | 0,49 | – | ✅ |
| P-44 | 0,30 | 0,74 | ✅ |
| P-45 | 0,65 | 1,40 | ✅ |
| P-46 | 0,25 | 0,73 | ✅ |
| P-47 | 0,90 | 0,48 | ✅ |
| P-48 | 0,38 | 0,65 | ✅ |

Tổng: 45 dòng đạt ≤ 3% ở mọi viewport đo; P-05 lệch theo D-30 (DV-G2a-1, đã ghi % thực đo); P-16 đo ở G3.

## Deviation / câu hỏi mới

- Deviation: DV-G2a-1 → 5, DV-G2b-1 → 3, DV-G2c-1 → 5 (`deviations.md`).
- Câu hỏi: Q-G2a-1 → 4, Q-G2b-1 → 3, Q-G2c-1 → 4 (`questions.md`), đã chọn phương án an toàn.

## Chưa làm

- Đo P-16 khi có `/events` (G3).
- Số liệu LIVE, badge chat là dữ liệu tĩnh từ MSW; cập nhật realtime chờ socket/backend.
- Upload file/ảnh thật chờ storage (DV-G2c-2).
