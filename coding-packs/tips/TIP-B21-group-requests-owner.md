# TIP-B21: Yêu cầu vào nhóm — chủ nhóm duyệt (D-43)

## HEADER
- TIP-ID: TIP-B21 · Module: community · Priority: P0 · Depends on: TIP-B20 · Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/modules/community/{repositories/join-request.repository.ts,services/join-request.service.ts,controllers/join-requests.controller.ts}` (create)
  - `apps/server/src/modules/community/services/group-access.service.ts` (create — `isOwner`, `canModerate` dùng chung B23/B24)
  - `apps/server/src/modules/community/community-core.module.ts` (modify)
  - `apps/server/test/community/join-requests.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, shares community-core.module.ts with TIP-B20`.

## CONTEXT
- Hợp đồng `joinRequestSchema`, `joinResultSchema`, `JOIN_DECISIONS`. MSW `portal/chat.ts:88`, `community.ts:128`; mock `decideJoinWithNotice`.
- e2e `chat.spec.ts:116-121`: thứ tự yêu cầu theo thời gian gửi; toast lấy tên từ FE.

## SPECIFICATIONS
1. `GET /groups/:id/requests` → `{items}` pending, cũ trước (`created_at, user_id`); chỉ chủ nhóm của nhóm đó hoặc `c.mod` (khác → 403 "Chỉ chủ nhóm được duyệt yêu cầu").
2. `POST /groups/:id/requests/:userId/:decision` (`approve|reject`, khác → 404): `pending → member|rejected` có điều kiện (0 dòng → 404 "Không tìm thấy yêu cầu"),
   `decided_by/at`, approve → `member_count+1` + tin hệ thống vào phòng mặc định (`sender_id NULL`, body "<tên> vừa được duyệt vào nhóm. Chào mừng bạn!")
   + outbox `group.join_decided` (B25 tạo thông báo `group`). Cùng transaction.
3. Outbox `group.join_requested` (B20) → worker publish `member.request {groupId,userId,intro}` tới `user:{ownerId}` qua `UserEventsPublisher`.
4. Kênh Admin `/admin/groups/requests` không có FE gọi → bỏ, ghi Q-B21-1.

## ACCEPTANCE CRITERIA
- Given 2 yêu cầu c1 When chủ nhóm GET Then đúng thứ tự gửi; thành viên thường → 403.
- Given approve When xong Then status `member`, `member_count+1`, có tin hệ thống ở phòng Chung; approve lần 2 → 404.
- Given reject Then `rejected`, người đó gửi lại được (B20).

## CONSTRAINTS
- DO NOT: kiểm `system_role` bằng tên; gửi socket trong transaction.
- REUSE: `OutboxService`, `UserEventsPublisher`, `GroupAccessService`.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test; transition `WHERE status='pending'`; outbox cùng tx; gate xanh; commit; SHA
