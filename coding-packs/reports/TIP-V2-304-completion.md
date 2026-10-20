# TIP-V2-304: Chủ đề chỉ Admin tạo, khởi tạo nhóm, vai trò Thành viên/Giảng viên (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. NA-09, NA-29, NA-18, NA-12, GR-R01/R02 · D-56, D-61 ·
> REQ-209, REQ-212, REQ-218, REQ-229, REQ-361, REQ-362 · AT-GR01, UAT-25.
> Migration `20261019180000_group_role_lecturer` (agent chính tạo, áp `opchub_dev` + `opchub_test`).
> V2Q mới: V2Q-149 → V2Q-154.

## Đã làm
- **DB (GR-R02 / D-56)**: `ALTER TYPE group_role RENAME VALUE 'moderator' TO 'lecturer'` — dòng cũ thành Giảng
  viên tại chỗ, không viết lại bảng, index `(group_id, status, group_role)` giữ. `system_role.moderator` là khái
  niệm khác (vai trò hệ thống cũ), không đổi.
- **NA-09 / D-61**: xoá `POST /groups/:id/rooms`, `DELETE /rooms/:id` (server + MSW → 404), xoá
  `createTopicSchema`, `RoomService.create/remove`, `deleteOwnTopic`, `topicSlug`. Portal bỏ form/nút "+"/"✕", tiêu
  đề cột "CHỦ ĐỀ THẢO LUẬN · do Admin tạo" như prototype. Admin thêm chủ đề trong form nhóm ("Chủ đề thảo luận · chỉ
  quản trị viên tạo, thành viên tham gia", "+ Thêm chủ đề"); trùng TÊN (không phân biệt hoa thường, gồm "Chung")
  bỏ qua. Phòng mới → outbox `group.topic_created` cùng transaction → worker phát `room.created` vào các phòng socket
  sẵn có của nhóm (1 query id phòng, không theo người — S-04) → Portal (`useTopicPush`) tải lại danh sách chủ đề.
- **NA-29**: tạo nhóm → chủ nhóm có dòng `group_members(owner, member)` + Chung + chủ đề Admin thêm (1 transaction).
  Đổi chủ: chủ cũ → Thành viên; giảng viên KHÔNG bị hạ khi bỏ khỏi form (vai trò lưu theo cặp nhóm–thành viên).
  Chủ mới (khác Admin đang thao tác) nhận thông báo "Bạn là chủ nhóm …" (outbox `group.owner_changed`).
- **GR-R01 / NA-12**: `assignGroupsSchema.role = member | lecturer` (mặc định member, lạ → 400). Gán: người mới vào
  nhóm với vai trò chọn; người đang `member` được nâng lên Giảng viên; không hạ chủ nhóm/giảng viên. Outbox
  `group.members_assigned { pairs }` (chỉ cặp MỚI) → 1 thông báo / nhóm mới, ghi 1 lô. Audit `group.assign_members`
  kèm vai trò. Toast "Đã gán N thành viên vào M nhóm với vai trò X" (prototype).
- **GR-R02**: `GET /rooms/:id/members` trả `groupRole` (thay `isModerator`), xếp chủ nhóm → giảng viên → thành viên.
  Panel chat: nhãn "Chủ nhóm" (cam) / "Giảng viên" (xanh). Form nhóm "Thêm giảng viên" (`lecturerIds`). Xuất CSV cột
  vai trò "Chủ nhóm / Giảng viên / Thành viên". Quyền quản lý nhóm (duyệt, ghim) chỉ `owner` (`satisfiesGroupRole`).
- **NA-18**: lúc kích hoạt TK (OTP / SSO), một câu `INSERT … SELECT` theo `join_mode`: nhóm mở vào ngay (+
  `member_count`), nhóm cần duyệt `pending` + outbox `group.join_requested` (intro rỗng) → chủ nhóm nhận
  `member.request`. MSW làm giống (`joinOnRegister`).
- Seed/fixture: hồ sơ "Điều phối viên" (prototype cũ) → "Giảng viên"; seed demo đặt `lecturer` cho hai người này trong
  các nhóm họ không làm chủ (như `ROLE()` prototype).
- Bảng `coding-packs/plans/api-contract.md`: 195 → 194 (−2 route chủ đề, +`GET /admin/events/upcoming` sót ở 303).
- Parity P-31 → P-33 (form/đã tạo/chủ đề trống) đánh dấu `unreachable`: ver2 bỏ tạo chủ đề ở cả prototype lẫn app.

## Test
- Int `chat-rest`: REQ-209 tạo/xoá chủ đề → 404; REQ-362 members `groupRole` owner → lecturer → member.
  `admin-groups`: REQ-229 tạo lại nhóm tỉnh (chủ nhóm có dòng owner, giảng viên, trùng tỉnh 409 "Đã có nhóm cho …");
  REQ-229 đổi chủ (chủ cũ member, giảng viên giữ, outbox owner_changed); REQ-209 thêm chủ đề trùng "Chung" bỏ qua +
  outbox `topic_created`. `admin-users`: AT-GR01 REQ-361/212 NA-12 gán Giảng viên giữ nhóm cũ, thông báo chỉ nhóm mới,
  role lạ 400, gán lại Thành viên không hạ, audit. `join-requests`: GR-R02 giảng viên không duyệt được. `register`:
  REQ-218 c2 (mở) member, c1 (duyệt) pending + outbox. Contract `event` thêm `upcoming`.
- Unit shared mock: GR-R02 panel `groupRole`, AT-GR01 gán Giảng viên + thông báo.
- e2e: `chat` REQ-209 không có nút tạo/xoá + API 404, AT-GR01 nhãn Giảng viên; `admin-members` AT-GR01 gán vai trò
  Giảng viên → toast; `admin-groups` REQ-209 "+ Thêm chủ đề", "Thêm giảng viên"; `auth-flows` REQ-218.

## Cổng kiểm
| Lệnh | Kết quả |
|---|---|
| lint / typecheck | 8/8 · 8/8 (chỉ cảnh báo `<img>` có sẵn) |
| depcheck | no violations |
| Int server (`opchub_test`) | 77 file, **1028/1028** |
| Unit server / shared / admin / portal / ui | 98 / 88 / 156 / 114 / 37 |
| e2e behavior MSW | **172/172** (1 ca mới sửa tên hộp thoại, chạy lại 4 spec liên quan 43/43) |
| e2e behavior server (`opchub_dev`, stack 4020/3280/3282) | **171/172** — 1 ca REQ-218 chờ `/groups` khi TK mới chưa đóng phí (server chặn đúng D-57); sửa test: đóng phí giả rồi tải lại, giữ nguyên assertion → chạy lại `auth-flows` 13/13 |

## Chưa làm / chuyển sau
- Gợi ý nhóm theo tỉnh khi đăng ký (đặc tả nói "theo tỉnh", prototype không có ô tỉnh) — V2Q-153.
- Baseline parity form nhóm Admin (chữ "Thêm giảng viên" lệch prototype còn "Thêm điều phối viên") — TIP-V2-307.
