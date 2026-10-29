# TIP-V42-709 — Chat: chủ đề đổi tên + xoá mềm ("Chung" khoá), tab "File chia sẻ" theo nhóm, đính kèm 20 MB — completion

- Nhánh `feature/TIP-V42-709-chat-topics-files`, xếp chồng trên `feature/TIP-V42-708-admin-fees` (PR 708 chưa merge).
- PR: base `feature/TIP-V42-708-admin-fees`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-708-admin-fees...feature/TIP-V42-709-chat-topics-files
- REQ / D: REQ-606, REQ-614, D-98, D-111, §27.7 (CR-12, CR-13, NA-09).

## Commit

| SHA | Nội dung |
|---|---|
| `226df4f7` | TIP-V42-709 |
| `f5f0f25b` | DB: `rooms.deleted_at` / `deleted_by`, CHECK `rooms_default_not_deleted_check` ("Chung" không xoá được), partial index `messages (room_id, created_at DESC, id DESC) WHERE kind IN ('file','image') AND hidden_at IS NULL AND deleted_at IS NULL`; shared: `CHAT_FILE_MAX_BYTES` 20 MB + doc / xls / ppt / csv (kiểm đuôi ↔ MIME + chữ ký OLE / không NUL), `groupFile*` schema, `adminRoomSchema` / `roomRenameSchema` / `ROOM_ADMIN_MESSAGES`, `groupDetail.rooms`, outbox `group.topic_changed`; mock `chat-topics` (File chia sẻ, đổi tên, xoá mềm) |
| `ed9ee9d4` | Server: `GET /groups/:id/files` (thành viên / Admin xem, keyset `(created_at, id)`, chip đếm toàn bộ, tìm không dấu theo tên tệp / người gửi, URL ký ngắn hạn), `PATCH` / `DELETE admin/groups/:id/rooms/:roomId` (`groups.action`, audit `group.topic_rename` / `group.topic_delete`, outbox cùng transaction → `room.reload`); mọi truy vấn phòng phía Portal lọc phòng đã xoá (danh sách, mở phòng, overview, chưa đọc, dashboard, @nhắc); Admin chi tiết nhóm chỉ phòng còn sống; 20 MB server + nginx `21m`; int `group-files` (3, có EXPLAIN), `group-topics` (3) |
| `89a1b489` | Portal: tab "File chia sẻ" theo nhóm như prototype (câu đầu, ô tìm, chip "Tất cả / Tài liệu / Hình ảnh · N", dòng nhãn đuôi màu, "{size} · {người gửi}", "# chủ đề" mở chủ đề gốc, "· thời gian", "Tải về" xin link ký mới, trống), trang sau tải khi cuộn; 10 ngôn ngữ; accept + câu lỗi 20 MB |
| `be44707f` | Admin: "Quản lý chủ đề" trong form sửa nhóm → hộp "Chủ đề hiện có" (đổi tên + mô tả, Xoá có xác nhận; "# Chung" khoá tên, nhãn "Mặc định"), bản nháp form đồng bộ để "Lưu thay đổi" không tạo lại chủ đề vừa xoá; MSW PATCH / DELETE |
| `bac7aa54` | Tin của chủ đề đã xoá không cảm xúc / ghim / tải tệp được (404) |
| `3909953c` | e2e: tab "File chia sẻ" (chip, tìm, mở chủ đề, Tải về), Admin đổi tên / trùng tên / "Chung" khoá / xoá; parity P-42 đổi nhãn; gỡ hàm thừa ở `onboarding.spec` (lint đỏ từ 708) |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| File + ảnh của chủ đề còn sống, không tin ẩn, mới nhất trước, `counts` đúng; ngoài nhóm 403 | int `group-files` (1); mock `chat-topics.spec`; e2e `chat › D-71 … File chia sẻ` | pass |
| ≥ 10k tin file / ảnh: trang 2 theo `before` dùng index partial, không Seq Scan `messages` | int `group-files › EXPLAIN` | pass |
| 15 MB CSV nhận, 21 MB → 400; `.exe` đổi tên `.pdf` → `FILE_REJECTED` | int `group-files` (2), `profile` (presign 20 MB / +1); unit `upload-safety.spec` (Office cũ + CSV), `image-ref.service.spec`; `.exe` giữ test của 701 | pass |
| Admin đổi tên → Portal thấy tên mới; trùng tên 409; "Chung" đổi tên 409 | int `group-topics` (1); e2e `admin-groups › D-111` | pass |
| Xoá chủ đề có tin → biến mất, URL cũ 404, file không còn ở tab, tin còn trong DB, audit | int `group-topics` (2, 3 — CHECK DB); mock spec; e2e `admin-groups › D-111` | pass |
| Tab "File chia sẻ" như prototype; parity P-42 ≤ 3% | parity P-42 @1440 1,10%; e2e `chat` | pass |

## Test (số thật, máy dev)

- `pnpm lint` / `pnpm typecheck`: xanh (lint đỏ ban đầu ở `e2e/behavior/onboarding.spec.ts` — biến `toast` thừa từ commit e2e 708 — đã gỡ). `pnpm depcheck`: 0 vi phạm.
- Unit: shared 425, server 225, portal 389, admin 460, integrations 103 (+2 skip), ui 52 — **1654** (708: 1648).
- `test:int`: server **161 file, 1489 / 1489** (+`group-files` 3, `group-topics` 3, ca 20 MB), db 17 / 54 — tổng **1543** (708: 1527).
- Audit C4: 25 đạt / 3 không đạt — cả 3 là Hội thoại bot (có từ trước, TIP-V42-713).
- `pnpm build`: server, portal (MSW), admin (MSW) thành công.
- e2e MSW behavior toàn bộ (bản build cuối): **320 pass / 0 fail / 4 skip** (13,8 phút; 708: 319 → +1 Admin quản lý chủ đề; test bảng thông tin chat viết lại theo tab "File chia sẻ").

## EXPLAIN (≥ 10k dòng)

`groupFilesQuery` trang 2 (`before` = tin thứ 50) trên bản sao tạm theo schema đã triển khai: 200 phòng / 50 nhóm, 12.000 tin file / ảnh + 40.000 tin chữ (52.000 `messages`):
`Bitmap Index Scan` trên index partial (`room_id = r.id AND (created_at, id) < (…)`, 48 dòng / phòng × 4 phòng) → top-N heapsort 51 dòng; không Seq Scan `messages`; **0,50 ms**.
Chip đếm dùng cùng điều kiện (`count(*) FILTER`) trên index partial theo phòng của nhóm.

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 |
|---|---|---|
| P-42 Chat · bảng File chia sẻ (trước: timeout — Q-V42-701-1) | 1,10% | — (kịch bản chỉ 1440) |
| P-28 → P-39, P-43 Chat | 0,11 – 0,78% | 0,54 – 2,54% |
| P-40 Chat · bảng Thành viên | 1,44% | 4,31% (ngoại lệ D-91, như trước) |
| D-26 / D-27 Nhóm cộng đồng | 0,04 / 0,04% | 0,06 / 0,69% |
| D-28 / D-29 Drawer tạo nhóm | 1,08 / 1,26% | 1,35 / 1,72% |
| D-30 Drawer sửa nhóm (thêm link "Quản lý chủ đề") | 1,15% | 1,49% |
| D-86 Tạo nhóm · + Thêm chủ đề | 2,73% | 1,90% |

Tổng `ui-parity/results.md`: **437 / 440** ảnh đạt; 3 ảnh còn lại là ngoại lệ D-91 (P-40 @390, D-84-AFF @1440 + @390).
Hộp "Chủ đề hiện có" không có trong prototype (Q-V42-709-1) → kiểm bằng e2e.

## Soát luật cứng

1. File trong trần (`room.service.ts` 168, `group-topics.service.ts` 86, `group-admin.service.ts` 272, `files-tab.tsx` 119, `topic-manager.tsx` 127; `RoomFields` / `FormBody` tách hàm ≤ 80 dòng).
2. Không `any`; query / body / phản hồi parse zod (`groupFileQuerySchema`, `groupFilePageSchema`, `roomRenameSchema`, `adminRoomSchema`).
3. depcheck sạch; Admin / Portal chỉ dùng `@opchub/shared`.
4. Quyền `groups.action` (đổi tên / xoá), `assertRead` (thành viên hoặc Admin `groups.view`) cho File chia sẻ.
5. Không query trong vòng lặp: 1 query trang + 1 query đếm; index "bằng trước, khoảng / sort sau" `(room_id, created_at DESC, id DESC)` partial.
6. `room.reload` 1 PUBLISH / phòng (pipeline), không query theo người nhận.
7. Xoá mềm có điều kiện (`deleted_at IS NULL AND is_default = false`), đổi tên có điều kiện `deleted_at IS NULL`.
8. Audit + outbox `group.topic_changed` cùng transaction.
10. Audit `group.topic_rename` / `group.topic_delete`.
12. Không biến env mới.
14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Q-V42-709-1 → 6 trong `ui-parity/questions.md` (vị trí control đổi tên / xoá; trùng tên kiểm ở service thay vì UQ; slug khi dùng lại tên; một sự kiện `group.topic_changed` thay `group.topic_removed`; tin của chủ đề đã xoá → 404; định dạng thời gian dòng file).
- Khôi phục chủ đề đã xoá: không làm (TIP SKIP).
