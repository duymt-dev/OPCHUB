# TIP-B22: Process Socket.IO — handshake, phòng, presence

## HEADER
- TIP-ID: TIP-B22 · Module: socket · Priority: P0 · Depends on: TIP-B07, TIP-B05 · Estimated: L (12h)
- **Files touched:**
  - `apps/server/src/socket/{socket-app.module.ts,redis-io.adapter.ts}` (create/modify)
  - `apps/server/src/socket/gateways/{chat.gateway.ts,socket-auth.ts,presence.service.ts,user-events.subscriber.ts}` (create)
  - `apps/server/src/main-socket.ts` (modify — `useWebSocketAdapter`)
  - `apps/server/test/socket/{socket.int.spec.ts,socket-client.ts}` (create); `socket.io-client` devDependency server (lý do: test tích hợp, đã có trong catalog)
- **Parallel-safe with:** TIP-B20, TIP-B21. `sequential, shares chat.gateway.ts with TIP-B23`.

## CONTEXT
- `socket-chat.md`, S-01/S-02/S-03/S-06/S-09; hợp đồng `packages/shared/src/socket/events.ts` (ack `{ok,data}|{ok:false,error}`).
- Kênh Redis `socket:user` (B14 `UserEventsPublisher`) chở `{userId,event,data}`.

## SPECIFICATIONS
1. Transport `websocket` only, `@socket.io/redis-adapter` (pub/sub ioredis riêng, không keyPrefix ở client adapter — key prefix `opchub:io`).
2. Handshake: `auth.token` JWT → `TokenService.verify` + Redis `auth:perm_version`, `auth:locked`, `auth:fee` (không DB). Khoá → `connect_error` FORBIDDEN; phí không hợp lệ → MEMBERSHIP_REQUIRED.
   Auto-join `user:{id}`.
3. `room.join {roomId}`: hỏi `ChatAccess` (port B23) một lần → cache `socket.data.rooms`; ack `{unread, online}`. `room.leave` → ack `{}`.
4. Presence: Redis `presence:room:{id}` ZSET (socketId, expiry); gom thay đổi, mỗi ≤5s emit `room.online {roomId, online}` chỉ cho phòng thay đổi.
5. Subscriber `socket:user` → parse zod `serverEvents` → `io.to(user:{id}).emit`; `session.revoked` → emit rồi `disconnectSockets` của `user:{id}`.

## ACCEPTANCE CRITERIA
- Given token hợp lệ When connect Then nhận được event publish qua `socket:user`.
- Given token sai / user khoá Then `connect_error`.
- Given không phải thành viên When `room.join` Then ack `{ok:false, error.code:'FORBIDDEN'}`.
- Given 2 client cùng phòng Then nhận `room.online` = 2 trong ≤ 6s.

## CONSTRAINTS
- DO NOT: `fetchSockets()`; query DB mỗi người nhận; state nghiệp vụ trong RAM ngoài cache quyền socket.

## ⚠️ BUILDER-CHECKLIST
- [ ] Int test với socket.io-client thật + Redis db 2; gate xanh; commit; SHA
