# TIP-V4-603: Vào nhóm ngay — bỏ chế độ duyệt + yêu cầu chờ

## HEADER
- TIP-ID: TIP-V4-603
- Project: OPCHUB
- Module: community (server, portal, admin) · db · shared mock
- Priority: P1
- Depends on: V4-606 (xếp chồng, PR #18 chưa merge)
- Estimated: M
- REQ / D: REQ-506 · D-71 (thay phần duyệt của D-43, QT-05) · §27.1, UP-05, AD-04, F03
- **Files touched:**
  - `packages/db/prisma/schema/community.prisma` (modify): bỏ `GroupJoinMode`, `Group.joinMode`; `GroupMemberStatus` = member/left/removed
  - `packages/db/prisma/migrations/20261023140000_v4_group_join_instant/` (create)
  - `packages/db/seed/{catalog,required}.ts`, `packages/db/seed/demo/{community,people}.ts` (modify), `packages/db/test/{seed-demo,migration-group-join}.int.spec.ts`
  - `packages/shared/src/{enums.ts,api-domains/groups.ts,api-domains/chat-room.ts,outbox/events.ts,socket/events.ts}` (modify)
  - `packages/shared/src/mock-data/domains/{ops-community,chat-messages,chat-ops,community,extras,group-admin,store,store-types}.ts`, `registration/{commands,schema,snapshot}.ts` (+ spec)
  - `apps/server/src/modules/community/**`: delete `controllers/join-requests.controller.ts`, `services/join-request.service.ts`, `repositories/join-request.repository.ts`; modify `group.service`, `group-join.service`, `group.repository`, `group-admin.*`, `group.mapper`, `admin-groups.controller`, module + index
  - `apps/server/src/modules/{chat/services/chat-overview.service.ts,notification/services/notification-events.handler.ts,account/ports.ts}`, `apps/server/src/worker/processors/{community,notification}.processor.ts`
  - `apps/server/test/**` (community, account/register, notification, gates/b3, contract/community, chat-rest, factories, audit c4/c5); delete `test/community/join-requests.int.spec.ts`
  - `apps/portal/src/features/{community,chat,profile}/**`, `apps/portal/src/mocks/handlers/{community,chat}.ts`, `apps/portal/messages/*/{community,chat,profile}.json`
  - `apps/admin/src/features/groups/**`, `apps/admin/src/mocks/**`, `apps/admin/messages/vi/groups.json`
  - `e2e/behavior/{community,chat,admin-groups,auth-flows}.spec.ts`, `e2e/parity/scenarios/{portal-community,portal-chat}.ts`, `e2e/server/api.ts`, `e2e/audit/{forms,uat-core}.audit.ts`
- **Parallel-safe with:** sequential, xếp chồng sau V4-606 (cùng `apps/portal/messages/*/common.json` lân cận, `admin-groups` spec).

## CONTEXT
- §27.1 (dac-ta.html): "Tham gia nhóm: Chủ nhóm duyệt yêu cầu trong phòng chat → Đã đóng phí → vào nhóm ngay, không cần duyệt." UP-05, AD-04, F03 cùng nội dung.
- Paywall (`MembershipFeeGuard`) đã chặn `POST /groups/:id/join` khi chưa đóng phí → mọi lời gọi join tới service là của TV đã đóng phí.
- Prototype v4 `docs/spec/index.html` còn nhánh "Cần duyệt" cho TK chưa đóng phí (APPROVE c1/c4/c5/c6, `_paid`), mục "Chờ duyệt vào nhóm" ở panel chat và "Quyền tham gia" trong form Admin. §27 có hiệu lực cao hơn → bỏ (Q-V4-603-1).

## APPLICABLE STANDARDS
- [database/query-indexing](../standards/database/query-indexing.md) · [backend/nestjs-modules](../standards/backend/nestjs-modules.md) (outbox) · [testing/testing](../standards/testing/testing.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)

## TASK
Bỏ hẳn cơ chế duyệt vào nhóm: TV đã đóng phí bấm Tham gia (Cộng đồng, xem trước ở Chat, lúc đăng ký) là thành viên ngay. Xoá schema/endpoint/UI duyệt, chuyển dữ liệu chờ duyệt cũ bằng migration.

## SPECIFICATIONS
### Business Rules
1. `POST /groups/:id/join` (agreeRules) → `member` ngay, `member_count + 1`, outbox `group.joined` (thông báo "Chào mừng bạn đến với {nhóm}!") trong cùng transaction. Lời giới thiệu không bắt buộc, vẫn lưu `intro`.
2. Đăng ký (NA-18): mọi nhóm đã chọn vào ngay, 1 INSERT … SELECT + 1 UPDATE đếm + outbox `group.joined` mỗi nhóm.
3. Rời nhóm: `member → left` có điều kiện, chủ nhóm không rời được (D-43 giữ). Tham gia lại dùng lại dòng cũ.
4. Xoá: `GET/POST /groups/:id/requests…`, `GET /admin/groups/requests`, outbox `group.join_requested`, `group.request_decided`, socket `member.request`, `ChatGroup.pendingRequests`, `GroupItem.joinMode`, `GroupUpsert.joinMode`.
5. Migration (D-71):
   - Yêu cầu `pending` của TV còn phí (`active|expiring` và `valid_until > now()` hoặc null) → `member` + `member_count` + outbox `group.joined`.
   - Yêu cầu `pending` của TV chưa đóng phí / hết hạn → xoá dòng.
   - `rejected` và `cancelled` → `left`.
   - Đổi enum, bỏ `groups.join_mode`, bỏ index `group_members_pending`.
6. UI:
   - Portal: thẻ Cộng đồng không còn "Đang chờ duyệt / Huỷ yêu cầu"; ô thống kê "chờ duyệt" bỏ; nhãn luôn "Công khai"; popup chỉ "Tham gia ngay", giới thiệu "(không bắt buộc)".
   - Chat: xem trước luôn "Tham gia nhóm", bỏ mục duyệt ở panel Thành viên và số chờ trên rail.
   - Hồ sơ › Hoạt động: chỉ nhóm đã tham gia.
   - Admin: form nhóm bỏ "Quyền tham gia".
7. Chủ nhóm giữ quyền khác của D-43 (ghim, nhãn, không rời nhóm).

### Error Handling
- Join lại khi đã là member → 409 "Bạn đã tham gia nhóm này". Nhóm không tồn tại → 404. Chưa đóng phí → 402 (paywall).

## ACCEPTANCE CRITERIA
- Given TV đã đóng phí, When tham gia OPC Hải Phòng (trước đây cần duyệt), Then trạng thái `member`, số TV +1, có outbox `group.joined`, toast "Chào mừng bạn đến với OPC Hải Phòng!".
- Given đăng ký chọn c1 + c2, When kích hoạt OTP, Then cả hai `member`, 2 outbox `group.joined`.
- Given dữ liệu cũ có pending (còn phí, hết hạn, chưa đóng), rejected, cancelled, When chạy migration, Then đúng BR-5, enum chỉ còn 3 giá trị.
- Given chủ nhóm mở bảng Thành viên, Then không có mục "Chờ duyệt vào nhóm".
- Given Admin mở form tạo nhóm, Then không có "Quyền tham gia".
- Given worker khởi động, Then mọi sự kiện outbox vẫn có consumer (M1).
- Parity: P-23, P-26, P-40, P-46, D-28, D-30 ≤ 3% (1440 + 390); P-24, P-25, P-41 = unreachable (màn gỡ).

## CONSTRAINTS
- DO NOT: giữ chế độ duyệt theo nhóm; bỏ ô đồng ý nội quy + chính sách phí (NR-R02 vẫn bắt buộc); đổi paywall.
- REUSE: `GroupRepository.lockMember/transition/bumpMemberCount`, `OutboxService`, `NotificationEventsHandler`.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched
- [ ] Đổi trạng thái có điều kiện (`WHERE status = 'member'`), outbox cùng transaction
- [ ] Integration Postgres thật: join/leave/409, đăng ký, migration dữ liệu, M1 consumer
- [ ] lint/typecheck/test/test:int/depcheck/build + e2e behavior — số thật
- [ ] Parity màn đụng tới ≤ 3% (1440 + 390), màn gỡ = unreachable
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo SHA
