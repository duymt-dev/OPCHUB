# TIP-V2-304: Chủ đề chỉ Admin tạo, khởi tạo nhóm, vai trò trong nhóm Thành viên/Giảng viên (NA-09, NA-29, NA-18, NA-12, GR-R01/R02)

## HEADER
- TIP-ID: TIP-V2-304 · Project: OPCHUB · Module: community + chat + account(assign) + portal/chat + portal/auth + admin/groups + admin/members · Priority: P0 · Depends on: TIP-V2-104 (khoá TK: nhóm làm chủ về Admin, D-55), TIP-V2-203 (khoá `groups.view` / `groups.action` / `members.action`) · Estimated: L (14h)
- **Files touched:**
  - DB: `packages/db/prisma/schema/community.prisma` (modify: enum `GroupRole` = `owner | lecturer | member`, bỏ `moderator`) · migration `<ts>_group_role_lecturer` (**agent chính tạo, `--create-only` + review SQL**: `moderator → lecturer`, đổi enum) · `packages/db/seed/catalog.ts`, `packages/db/seed/required.ts`, `packages/db/seed/demo/community.ts` (modify: chủ nhóm có dòng `group_members` owner, chủ đề "Chung")
  - Shared: `packages/shared/src/api-domains/group-admin.ts` (modify: `GROUP_ROLES`, `moderatorIds` → `lecturerIds`) · `packages/shared/src/api-domains/users.ts` (modify: `assignGroupsSchema.role: 'member' | 'lecturer'`) · `packages/shared/src/api-domains/chat-room.ts` (modify: `roomMemberSchema.groupRole` thay `isModerator`; xoá `createTopicSchema`) · `packages/shared/src/outbox/events.ts` (modify — chỉ thêm `group.members_assigned`, `group.owner_changed`, `group.topic_created`) · `packages/shared/src/socket/events.ts` (modify: server event `room.created`)
  - Server: `apps/server/src/common/auth/group-role.port.ts`, `decorators.ts`, `guards.ts` (modify: `GroupRoleValue` mới; `RequireGroupRole('owner')` giữ) · `apps/server/src/modules/community/repositories/group-admin.repository.ts` (modify: `setStaff` → owner + giảng viên, chủ cũ về `member`) · `services/group-admin.service.ts` (modify: NA-29, NA-09 phát `topic.created`) · `services/group-assign.service.ts` (modify: nhận role) · `services/group-join.service.ts` (modify: NA-18 nhóm mở vào ngay, nhóm duyệt → pending + outbox) · `domain/group.mapper.ts` (modify) · `apps/server/src/modules/account/services/admin-users.service.ts` + `account/ports.ts` (modify: truyền role, outbox `group.members_assigned`) · `apps/server/src/modules/chat/controllers/rooms.controller.ts` (modify: **xoá** `POST groups/:id/rooms`, `DELETE rooms/:id`) · `chat/services/room.service.ts` (modify: bỏ `create/remove`, `members` trả `groupRole`) · `chat/repositories/room.repository.ts` (modify: bỏ `deleteOwnTopic`, thứ tự owner → lecturer → member) · `chat/services/chat-access.service.ts` (modify: kiểu role) · `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: `membersAssigned`, `ownerChanged`) · `apps/server/src/worker/processors/{notification,community}.processor.ts` (modify: register) · `apps/server/src/socket/gateways/room-events.subscriber.ts` (modify nếu cần đẩy `room.created`)
  - Portal: `apps/portal/src/features/chat/components/topic-form.tsx` (**delete**) · `components/topic-list.tsx`, `chat-screen.tsx`, `panel-members.tsx` (modify) · `hooks/use-room-actions.ts`, `api.ts`, `types.ts` (modify) · `apps/portal/messages/vi/chat.json` (modify: "do Admin tạo", vai trò) · `apps/portal/src/mocks/handlers/chat.ts` + `packages/shared/src/mock-data/domains/{chat-ops,chat-store}.ts` (modify: bỏ tạo/xoá chủ đề)
  - Admin: `apps/admin/src/features/groups/components/{group-form-fields,group-form-rooms}.tsx` (modify: "Chủ đề thảo luận · chỉ quản trị viên tạo, thành viên tham gia", "+ Thêm chủ đề", "Thêm giảng viên") · `groups/model.ts`, `types.ts`, `model.spec.ts`, `hooks/use-export.ts` (modify) · `apps/admin/src/features/members/components/assign-modal.tsx`, `members/api.ts`, `hooks/use-member-actions.ts` (modify: Thành viên / Giảng viên) · `apps/admin/messages/vi/{groups,members}.json` (modify) · `apps/admin/src/mocks/handlers/{admin-groups,admin-members}.ts` + `packages/shared/src/mock-data/domains/{group-admin,admin-members}.ts` (modify)
  - Test: `apps/server/test/community/{admin-groups,groups,join-requests}.int.spec.ts`, `apps/server/test/chat/chat-rest.int.spec.ts`, `apps/server/test/account/{admin-users,register}.int.spec.ts` (modify) · `e2e/behavior/{chat,admin-groups,admin-members,auth-flows}.spec.ts` (modify)
- **Parallel-safe with:** 301, 302 (khác file trừ `register` — 302 sửa form, 304 sửa server join), 303, 306. `sequential, shares chat/services/room.service.ts + chat-overview with TIP-V2-305`; `shares admin-users.service.ts with TIP-V2-104/201`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §8.11 NA-09, §8.31 NA-29, §8.20 NA-18, §8.14 NA-12, §22.3 GR-R01/R02, §22.6 AT-GR01, §13 BR-06/BR-07, §12 "Được duyệt vào nhóm". REQ-209 (thay REQ-068), REQ-229, REQ-218, REQ-212, REQ-361, REQ-362. D-56, D-61.
- Prototype ver2: form nhóm có "Chủ đề thảo luận · chỉ quản trị viên tạo, thành viên tham gia" + "+ Thêm chủ đề"; Chat Portal "CHỦ ĐỀ THẢO LUẬN do Admin tạo", **không còn** nút "Tạo chủ đề mới" (đã bị gỡ khỏi ver2, xem `proto-removed`). Hộp "Gán vào nhóm" có select "Thành viên / Giảng viên" → toast "Đã gán N thành viên vào M nhóm với vai trò X". Hàm `ROLE()` hiện "Chủ nhóm / Giảng viên / Thành viên". Form nhóm vẫn còn "Thêm điều phối viên" (sót từ bản cũ, xem Câu hỏi). Nút "Gửi lời mời" (mời TK quản trị) đã bỏ: phần TK quản trị thuộc TIP-V2-204. Ở Portal/nhóm không còn thao tác mời.
- Hiện trạng: `group_role` = `owner | moderator | member`; `RoomsController` cho thành viên tạo/xoá chủ đề (`POST groups/:id/rooms`, `DELETE rooms/:id`); `setStaff` hạ người cũ về `member`; `GroupAssignService.assign` luôn `member` và bỏ qua `role` FE gửi (Q-G4a-3); không có thông báo khi gán (NA-12); `GroupJoinService.requestJoin` lúc đăng ký đặt **mọi** nhóm `pending` kể cả nhóm mở và không báo chủ nhóm (lệch NA-18 bước 4–5).
- UQ 1 nhóm/tỉnh đã có (partial UQ + `clash.province` 409). Phòng `general` luôn được thêm (`roomsToAdd`).

## APPLICABLE STANDARDS
[auth-rbac](../standards/backend/auth-rbac.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [socket-chat](../standards/realtime/socket-chat.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [domain-glossary](../standards/global/domain-glossary.md) · [testing](../standards/testing/testing.md)

## TASK
Gỡ quyền tạo/xoá chủ đề khỏi Portal (cả API). Chủ đề chỉ sinh từ form nhóm của Admin và phát realtime. Đổi vai trò trong nhóm `moderator` thành `lecturer` (Giảng viên): chọn được khi Admin gán thành viên, hiển thị trong phòng chat. Hoàn thiện khởi tạo nhóm (chủ nhóm là thành viên, đổi chủ thì chủ cũ về Thành viên), gán hàng loạt có thông báo, và tự tham gia nhóm khi đăng ký đúng NA-18.

## SPECIFICATIONS
### Business Rules
1. **NA-09 / D-61**: xoá route `POST /groups/:id/rooms` và `DELETE /rooms/:id`. Gọi lại thì 404 (test âm). Portal bỏ form, nút "+" và "✕". Trong form Tạo/Sửa nhóm, Admin thêm chủ đề (tên ≤ 60, mô tả ≤ 120); trùng tên trong nhóm (không phân biệt hoa thường, gồm "Chung") thì bỏ qua (đã có trong `roomsToAdd`). Phòng mới → outbox `group.topic_created { groupId, roomId }` → đẩy `room.created` vào `user:{id}` của thành viên **qua room socket nhóm**, không lặp DB từng người (S-04). Client invalidate `/groups/:id/rooms`.
2. **"Chung" luôn tồn tại**: `general` không xoá được ở mọi đường (Admin sửa nhóm chỉ thêm phòng, Q-B20-2).
3. **NA-29**: tạo nhóm thì chủ nhóm có dòng `group_members(role=owner, status=member)` + `member_count`, chủ đề "Chung" + chủ đề Admin thêm, trong một transaction. Chủ nhóm mới nhận thông báo "Bạn là chủ nhóm …" (outbox `group.owner_changed`). **Đổi chủ nhóm**: chủ cũ `owner → member`; giảng viên không bị hạ khi đổi chủ. Mỗi tỉnh một nhóm (đã có, giữ test).
4. **GR-R01 / D-56**: `assignGroupsSchema` thêm `role: z.enum(['member','lecturer']).default('member')`. `GroupAssignService.assign(tx, userIds, groupIds, role)`: thành viên mới được thêm với role chọn; người đã ở nhóm nhận role mới chỉ khi đang `member` (không hạ owner). Vai trò lưu theo cặp (nhóm, thành viên). Không đụng `system_role` hay quyền Admin.
5. **GR-R02**: `GET /rooms/:id/members` trả `groupRole: 'owner' | 'lecturer' | 'member'`, xếp owner → lecturer → member. Panel thành viên phòng chat hiện nhãn "Chủ nhóm" / "Giảng viên" (thành viên thường không nhãn, như prototype). Xuất danh sách thành viên nhóm cột "Vai trò trong nhóm" theo 3 nhãn mới.
6. **Quyền theo nhóm** (D-43 giữ nguyên): chỉ `owner` duyệt yêu cầu, ghim. `lecturer` **không** có thêm quyền quản lý (GR-R02 "không cấp quyền Admin"). `satisfiesGroupRole` chỉ còn `owner`.
7. **Form nhóm Admin**: đổi "Thêm điều phối viên" thành "Thêm giảng viên" (`lecturerIds`). Ghi DV nếu prototype vẫn hiện chữ cũ.
8. **NA-12**: hộp gán làm mờ nhóm mà mọi người chọn đều đã tham gia (đã có). Sau gán, toast "Đã gán N thành viên vào M nhóm với vai trò X". Outbox `group.members_assigned { pairs: [{userId, groupId}] }` (chỉ cặp mới) → mỗi thành viên nhận 1 thông báo/nhóm mới (`notify` theo lô, một lệnh `createMany`). Audit `group.assign_members` thêm `role`.
9. **NA-18**: lúc xác thực OTP hoặc hoàn tất SSO, nhóm `open` thì vào ngay (`member`, cộng `member_count`), nhóm `approval` thì `pending` + outbox `group.join_requested` (intro rỗng: chủ nhóm duyệt trên panel) → `member.request` + thông báo chủ nhóm. Bắt buộc ≥ 1 nhóm (đã có). Gợi ý nhóm giữ theo vai trò (`REG_ROLES.suggest`). Đặc tả có nói "theo tỉnh" nhưng prototype không có ô tỉnh (xem Câu hỏi): không thêm ô mới.

### Data / Migration
- Đổi enum: tạo `group_role_v2 ('owner','lecturer','member')`, `UPDATE … moderator → lecturer`, đổi cột, drop enum cũ. Index `(group_id, status, group_role)` giữ. Migration do agent chính tạo, `--create-only` + review SQL. Seed: mỗi nhóm có owner trong `group_members`.

### Error Handling
- Gán với role lạ → 400. Đổi chủ nhóm sang user không tồn tại hoặc bị khoá → 400 tại ô `ownerId`.

## ACCEPTANCE CRITERIA
- Given TV ở Portal Chat, Then không có nút tạo/xoá chủ đề; `POST /groups/c1/rooms` → 404 (NA-09, REQ-209, D-61).
- Given Admin thêm chủ đề "Tuyển dụng" vào nhóm c1 rồi lưu, Then TV đang mở chat c1 thấy chủ đề mới mà không tải lại trang (realtime) (NA-09).
- Given Admin tạo nhóm cho tỉnh đã có nhóm → 409 "Đã có nhóm cho <tỉnh>"; tạo mới → chủ nhóm có trong danh sách thành viên phòng với nhãn Chủ nhóm, có chủ đề "Chung" (NA-29, REQ-229).
- Given đổi chủ nhóm A → B, Then A là Thành viên, B là Chủ nhóm, B nhận thông báo (NA-29).
- Given Admin gán 2 thành viên vào nhóm c2 với vai trò Giảng viên, Then phòng chat c2 hiện nhãn "Giảng viên" cho 2 người; nhóm cũ giữ nguyên; mỗi người nhận 1 thông báo nhóm mới (AT-GR01, REQ-361, REQ-362, REQ-212, UAT-25).
- Given Giảng viên trong nhóm gọi duyệt yêu cầu → 404/403 (GR-R02, test âm).
- Given đăng ký chọn 1 nhóm mở + 1 nhóm cần duyệt, Then vào ngay nhóm mở; nhóm duyệt ở trạng thái chờ và chủ nhóm nhận `member.request` + thông báo (NA-18, REQ-218, BR-06).

## TESTS BẮT BUỘC
- Int `chat-rest.int.spec.ts`: thay test "chủ đề: tạo … xoá" bằng `REQ-209 Portal không tạo/xoá chủ đề (404)`, `REQ-362 members trả groupRole owner/lecturer`. `admin-groups.int.spec.ts`: `REQ-229 tạo nhóm chủ nhóm là thành viên + Chung`, `REQ-229 đổi chủ → chủ cũ member`, `REQ-229 trùng tỉnh 409`, `REQ-209 thêm chủ đề trùng bỏ qua + outbox topic_created`. `admin-users.int.spec.ts`: `AT-GR01 REQ-361 gán vai trò Giảng viên`, `REQ-212 gán giữ nhóm cũ + thông báo từng nhóm mới`, test âm `REQ-361 role lạ → 400`. `join-requests.int.spec.ts`: test âm `REQ-362 giảng viên không duyệt được`. `register.int.spec.ts`: `REQ-218 nhóm mở vào ngay, nhóm duyệt pending + báo chủ nhóm`.
- e2e: `chat.spec.ts` bỏ test tạo/xoá chủ đề, thêm `REQ-209 không có nút tạo chủ đề`, `AT-GR01 nhãn Giảng viên trong panel`; `admin-members.spec.ts` `AT-GR01 gán với vai trò Giảng viên → toast`; `admin-groups.spec.ts` `REQ-209 thêm chủ đề trong form`; `auth-flows.spec.ts` `REQ-218`. Chạy msw + server, không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: kiểm tên vai trò hệ thống ở FE (luật 4, dùng permission key); lặp DB theo từng người nhận khi phát `room.created`; để lại route tạo/xoá chủ đề "ẩn" ở server.
- REUSE: `roomsToAdd`, `roomSlug`, `DEFAULT_ROOMS`, `JoinRequestService.notifyOwners`, `NotificationService.notify`, `assign-group-list.tsx`.
- SKIP: TK quản trị, mời quản trị viên, bỏ "Gửi lời mời" ở Cài đặt (TIP-V2-201/204); khoá TK → nhóm về Admin (TIP-V2-104); baseline parity (TIP-V2-307).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 4 (permission key), luật 6 (S-01→S-12, không query theo người nhận), luật 7 (đổi role/owner có điều kiện), luật 8 (thông báo qua outbox cùng tx), luật 10 (audit gán nhóm, sửa nhóm).
- [ ] File dùng chung chỉ thêm dòng (`outbox/events.ts`, `socket/events.ts`, `messages/vi/*.json`); đổi tên khoá `moderator` có ghi trong report.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` + `pnpm e2e` msw và server.
- [ ] `git commit -- <paths>` (kể cả file xoá), `git status --short` sạch, báo `TIP-V2-304-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-304-completion.md`.
