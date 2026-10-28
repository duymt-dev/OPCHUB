# TIP-V42-709: Chat — chủ đề đổi tên + xoá mềm ("Chung" khoá), tab "File chia sẻ" theo nhóm (keyset), đính kèm 20 MB

## HEADER
- TIP-ID: TIP-V42-709
- Project: OPCHUB
- Module: chat (rooms, files), community (admin groups — chủ đề), uploads; Portal chat; Admin groups; MSW
- Priority: P1
- Depends on: TIP-V42-701 (chặn file thực thi, GET file ký ngắn hạn); xếp chồng trên TIP-V42-708 (nhánh chưa merge)
- Estimated: L
- REQ / D: REQ-606, REQ-614, D-98, D-111, §27.7 (CR-12, CR-13, NA-09), FULL-AUDIT :91 → :96, :107; SPEC-V4.2-DELTA P4
- **Files touched:**
  - DB: migration `v42_chat_topics_files` — `rooms.deleted_at`, `rooms.deleted_by`; partial UQ tên phòng còn sống;
    index `messages (room_id, created_at DESC, id DESC) WHERE kind IN ('file','image') AND hidden_at IS NULL AND deleted_at IS NULL`
  - Shared: `api-domains/uploads.ts` (`CHAT_FILE_MAX_BYTES` 20 MB + MIME doc/xls/csv/ppt), `api-domains/upload-safety.ts` (đuôi tương ứng),
    `api-domains/chat-room.ts` (`groupFileSchema`, `groupFilePageSchema`, `groupFileQuerySchema`), `api-domains/group-admin.ts`
    (`adminRoomSchema`, `roomRenameSchema`, `groupDetail.rooms`), `outbox/events.ts` (`group.topic_removed`), mock-data `chat-ops.ts`, `group-admin*.ts`
  - Server: `chat/controllers/rooms.controller.ts` (`GET groups/:id/files`), `chat/services/room.service.ts`, `chat/repositories/room.repository.ts`
    (bỏ phòng đã xoá ở danh sách / tìm phòng), `chat/repositories/group-files.query.ts` (create); `community/controllers/admin-groups.controller.ts`
    (`PATCH admin/groups/:id/rooms/:roomId`, `DELETE admin/groups/:id/rooms/:roomId`), `community/services/group-topics.service.ts` (create),
    `community/repositories/group-admin.repository.ts` (phòng còn sống), `community/services/group-events.handler.ts`; lọc `deleted_at IS NULL`
    ở các truy vấn phòng phía Portal (overview, unread, gợi ý phòng)
  - Portal: `features/chat/**` (tab "File chia sẻ": câu đầu, ô tìm, chip đếm, dòng file, "Tải về", mở chủ đề gốc; giới hạn 20 MB), `messages/*/chat.json`
  - Admin: `features/groups/**` (danh sách chủ đề hiện có: đổi tên, xoá, "Chung" khoá), `messages/vi/groups.json`
  - Test: int `chat/group-files` (+EXPLAIN ≥ 10k), `community/group-topics`; MSW spec; e2e `chat`, `admin-groups`; parity P-42 (đổi nhãn tab)
- **Parallel-safe with:** sequential — chồng trên 708.

## CONTEXT
- §27.7: "Khung phải › tab File chia sẻ: toàn bộ file & ảnh trong mọi chủ đề của nhóm · Chỉ thành viên nhóm xem/tải; tin bị ẩn do vi phạm không hiện file",
  "Ô tìm theo tên file/người gửi; chip Tất cả · Tài liệu · Hình ảnh · Đếm số lượng theo từng loại", "Bấm tên chủ đề → mở chủ đề gốc",
  "Đề xuất giới hạn 20 MB/file; lưu object storage; chặn file thực thi", "Chỉ Admin quản lý cộng đồng tạo/sửa/xóa chủ đề".
- D-98: `GET /groups/:id/files?kind=&q=` chỉ thành viên nhóm, bỏ tin bị ẩn, keyset + index; đính kèm 20 MB, chặn file thực thi.
- D-111: Admin đổi tên, xoá phòng; tin vẫn lưu nhưng ẩn khỏi Portal; audit; phòng "Chung" không xoá được.
- Prototype v4.2 Portal (`index.html` :937 → 948, :6334 → 6338): tab `File chia sẻ`; câu "File & hình ảnh thành viên chia sẻ trong mọi chủ đề của **{nhóm}**.
  Chỉ thành viên trong nhóm xem được."; ô "Tìm theo tên file hoặc người gửi"; chip "Tất cả · N" / "Tài liệu · N" / "Hình ảnh · N" (đếm toàn bộ);
  dòng: nhãn đuôi màu (PDF / DOC / XLS / PPT / ẢNH), tên, "{size} · {người gửi}" (ảnh: "Hình ảnh"), "# {chủ đề}" (bấm mở chủ đề) "· {thời gian}" "Tải về";
  trống: "Chưa có file phù hợp. Dùng nút đính kèm trong ô chat để chia sẻ file với nhóm."; bỏ `SEEDF` (dòng giả).
- Prototype Admin › Nhóm › form (:3110 → 3113, :6519 → 6538): "Chủ đề thảo luận", "# Chung" khoá; prototype **không có** nút đổi tên / xoá chủ đề đã có
  → D-95: làm đúng nghiệp vụ D-111 với control tối thiểu trong khối chủ đề (Q-V42-709-1).

## SPECIFICATIONS
### Business Rules
1. **File chia sẻ (D-98):** `GET /groups/:id/files?kind=all|doc|img&q=&before=&size=` — chỉ thành viên nhóm (403 ngoài nhóm), gồm tin `file` + `image`
   mọi chủ đề **còn sống** của nhóm, bỏ tin bị ẩn / xoá; mới nhất trước, keyset `(created_at, id)`, trang 50; `counts {all, doc, img}` theo toàn bộ (không theo `q`);
   tìm `q` theo tên file hoặc người gửi (không dấu). URL tải ký ngắn hạn như 701. Dòng: `messageId, roomId, roomSlug, roomName, name, size, ext, kind, sender, createdAt, url`.
2. **Đính kèm 20 MB:** `CHAT_FILE_MAX_BYTES = 20 MB` (server + FE + MSW); thêm Word / Excel / PowerPoint cũ (doc, xls, ppt) + CSV vào whitelist,
   vẫn kiểm đuôi ↔ MIME + chữ ký (701). Câu lỗi "Tệp tối đa 20 MB".
3. **Đổi tên chủ đề (D-111):** Admin (`groups.action`) đổi tên + mô tả; trùng tên phòng còn sống trong nhóm → 409; "Chung" đổi mô tả được, không đổi tên; audit
   `group.topic_rename`; phát `room.created`-tương đương (`room.reload`) để Portal tải lại danh sách chủ đề.
4. **Xoá mềm chủ đề (D-111):** `rooms.deleted_at` + `deleted_by`; "Chung" (`is_default`) → 409; tin giữ nguyên trong DB, ẩn khỏi Portal (danh sách phòng,
   mở phòng → 404, File chia sẻ, chưa đọc, gợi ý); audit `group.topic_delete`; outbox `group.topic_removed` → Portal tải lại; tên phòng đã xoá được dùng lại.
5. Admin › Xem chat vẫn đọc được phòng đã xoá? **Không** — ẩn như Portal (tin còn trong DB cho truy vết / kiểm duyệt qua báo cáo).

### Validation
- `kind ∈ {all, doc, img}` (lạ → all), `q` ≤ 100, `size` 1–100 (mặc định 50), `before` cursor base64 `(iso, id)`.
- Đổi tên: `name` 1–60, `description` ≤ 120 (như `extraRoomSchema`).

### Error Handling
- Ngoài nhóm 403; nhóm / phòng không có 404; xoá / đổi tên "Chung" 409; trùng tên 409; tệp > 20 MB 400 `FILE_TOO_LARGE`; tệp thực thi `FILE_REJECTED` (701).

## ACCEPTANCE CRITERIA
- Given nhóm có file + ảnh ở 3 chủ đề (1 tin bị ẩn, 1 chủ đề đã xoá) When thành viên GET /groups/:id/files Then đủ file + ảnh của chủ đề còn sống, không tin ẩn,
  mới nhất trước, `counts` đúng; người ngoài nhóm 403 (int).
- Given ≥ 10k tin file / ảnh When trang 2 theo `before` Then EXPLAIN Index Scan index partial mới, không Seq Scan `messages` (int).
- Given tệp 15 MB PDF / CSV When đính kèm Then nhận; 21 MB → 400; `.exe` đổi tên `.pdf` → `FILE_REJECTED` (int + unit).
- Given Admin đổi tên "Hỏi đáp" → "Hỏi & đáp" When Portal mở nhóm Then thấy tên mới; trùng tên → 409; "Chung" đổi tên → 409 (int, e2e MSW).
- Given Admin xoá chủ đề có tin When thành viên mở nhóm Then chủ đề biến mất, URL cũ 404, file của chủ đề không còn ở tab File chia sẻ; tin vẫn trong DB; audit (int, e2e MSW).
- Given Portal › Chat When mở tab "File chia sẻ" Then câu, ô tìm, chip đếm, dòng, Tải về, bấm "# chủ đề" mở chủ đề như prototype; parity P-42 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: dữ liệu file giả (`SEEDF`); query trong vòng lặp; xoá cứng tin; nới kiểm file thực thi; ẩn control prototype có.
- REUSE: `assertRead` / `GroupMemberPort` của chat, `signedAttachmentUrl` (701), `upload-safety.ts`, `AuditService`, `RoomEventsPublisher.reload`.
- SKIP: khôi phục chủ đề đã xoá (không có trong đặc tả); bucket S3 production.

## ⚠️ BUILDER-CHECKLIST
- [ ] Migration `--create-only` rồi sửa SQL (partial index + partial UQ); áp `opchub_dev` + `opchub_test`
- [ ] Mọi truy vấn phòng phía Portal lọc `deleted_at IS NULL`; File chia sẻ keyset + EXPLAIN ≥ 10k
- [ ] Permission key `groups.action` (không check tên vai trò); audit mọi thao tác Admin
- [ ] FE ≤ 400 dòng / file, hàm ≤ 80; parity P-42 ở 1440 + 390; e2e không tụt
