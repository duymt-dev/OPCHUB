# TIP-B23: Chat — phòng, tin nhắn, react/pin/reply, đã đọc

## HEADER
- TIP-ID: TIP-B23 · Module: chat · Priority: P0 · Depends on: TIP-B20, TIP-B22 · Estimated: XL (16h)
- **Files touched:**
  - `apps/server/src/modules/chat/{index.ts,chat-core.module.ts}` (create)
  - `apps/server/src/modules/chat/domain/{message.mapper.ts,room-key.ts}` (+ spec) (create)
  - `apps/server/src/modules/chat/repositories/{room.repository.ts,message.repository.ts,reaction.repository.ts,read-cursor.repository.ts}` (create)
  - `apps/server/src/modules/chat/services/{chat-access.service.ts,room.service.ts,message.service.ts,message-actions.service.ts,unread.service.ts,chat-overview.service.ts}` (create)
  - `apps/server/src/modules/chat/controllers/{rooms.controller.ts,messages.controller.ts,me-chat.controller.ts}` (create)
  - `apps/server/src/socket/gateways/chat.gateway.ts` (modify — `message.send|react|pin` gọi service chung)
  - `apps/server/src/api/api-app.module.ts`, `socket/socket-app.module.ts` (modify — import)
  - `packages/shared/src/api-domains/chat.ts` (modify — `after` trong `messageQuerySchema`, S-06)
  - `apps/server/test/chat/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, shares chat.gateway.ts with TIP-B22`, `api-app.module.ts with TIP-B20`.

## CONTEXT
- Hợp đồng inventory §4: `chatOverviewSchema`, `chatRoomSchema`, `createTopicSchema`, `chatMessageSchema`, `sendMessageSchema`, `reactMessageSchema`,
  `pinMessageSchema`, `roomMembersSchema`, `roomPinSchema`, `roomFileSchema`, `messageQuerySchema`. Admin dùng cùng path nhưng cần `isSimulated` (D-26, D-48).

## SPECIFICATIONS
1. Quyền đọc/gửi: thành viên `member` của nhóm phòng; `c.mod` đọc được mọi phòng (Admin xem chat chỉ đọc) và nhận DTO có `isSimulated`; Portal không bao giờ nhận `isSimulated`.
2. `message.send` (REST `POST /rooms/:id/messages` và socket chung 1 service): rate limit 10/10s (Redis), body ≤4000, insert `ON CONFLICT (room_id,sender_id,client_msg_id) DO NOTHING`
   → trùng trả bản cũ; sau commit: emit `message.new` tới `room:{id}`, tăng counter Redis chưa đọc (S-05: `HINCRBY` theo phòng — đọc tính `last_seq - cursor_seq`),
   mention/reply → outbox `chat.mentioned` (B25). Từ khoá → B24 (hook `MessageScreen`).
3. Lịch sử: keyset `before=<id>` (mới→cũ) size ≤100 mặc định 30, `after=<id>` (cũ→mới, ≤100), `q` ILIKE body/attachment name.
4. React toggle, pin (chủ nhóm của nhóm đó hoặc `c.mod`), reply preview, `POST /rooms/:id/read` cursor, rooms list/create/delete (409 trùng tên không phân biệt hoa thường), members (phân trang 50), pins, files.
5. `/me/chat`: joined/others, unread theo Redis (rebuild từ cursor khi miss), `pendingRequests` khi là chủ nhóm, online từ presence.

## ACCEPTANCE CRITERIA
- Gửi cùng `clientMsgId` 2 lần → 1 dòng, cùng id; người ngoài nhóm → 403 "Chỉ thành viên nhóm mới xem và gửi được tin nhắn".
- 2 socket client: A gửi → B nhận `message.new` không kèm `isSimulated`; ack sau commit.
- Pin bởi không phải chủ nhóm → 403; react toggle 2 lần → về 0; `/rooms/:id/read` → unread 0.
- EXPLAIN lịch sử 20k tin dùng `messages_room_id_created_at_id_idx`.

## CONSTRAINTS
- DO NOT: query DB theo người nhận; `fetchSockets`; thông báo cho cả phòng.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test (REST + socket); EXPLAIN; gate; commit; SHA
