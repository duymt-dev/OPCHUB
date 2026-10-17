# TIP-B25: Thông báo theo người (S-04, D-29)

## HEADER
- TIP-ID: TIP-B25 · Module: notification · Priority: P0 · Depends on: TIP-B22 · Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/modules/notification/{index.ts,notification-core.module.ts}` (create)
  - `apps/server/src/modules/notification/{repositories/notification.repository.ts,services/notification.service.ts,services/notification-events.handler.ts,controllers/notifications.controller.ts}` (create)
  - `apps/server/src/worker/processors/notification.processor.ts`, `worker/worker-app.module.ts` (create/modify)
  - `apps/server/test/notification/notifications.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B24. `sequential, shares worker-app.module.ts with TIP-B24`.

## CONTEXT
- Hợp đồng `notificationSchema`, `notificationListSchema` (`{items,nextCursor,unread}`), `notificationReadSchema`, `notificationReadResultSchema`, `NOTIFICATION_TYPES`.

## SPECIFICATIONS
1. `GET /notifications?cursor&size(20, ≤50)`: keyset `(created_at,id)` mới trước, `unread` đếm bằng partial `notifications_unread`.
2. `POST /notifications/read {ids?}` → `read_at=now() WHERE read_at IS NULL` (của chính mình) → `{unread}`.
3. Tạo: outbox `chat.mentioned` (mention/reply), `group.join_decided`, `membership_fee.activated` → worker `createMany` một lần, rồi publish `notification.new` qua `socket:user` cho từng người (pipeline).
   Không tạo cho cả phòng. Hàm `NotificationService.notify(tx, items[])` export cho domain khác (B31 sự kiện, B46).

## ACCEPTANCE CRITERIA
- 2 chưa đọc → `unread 2`; đọc hết → `0`; ids của người khác không bị đổi.
- Mention trong tin → người được nhắc có thông báo `mention`, link `/chat/<groupId>/<roomKey>`.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test; EXPLAIN inbox; gate; commit; SHA
