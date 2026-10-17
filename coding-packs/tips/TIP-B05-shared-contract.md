# TIP-B05: `packages/shared` — socket events, queues, outbox events, error code

## HEADER
- TIP-ID: TIP-B05
- Project: OPCHUB
- Module: shared
- Priority: P0
- Depends on: TIP-B01
- Estimated: S (4h)
- **Files touched:**
  - `packages/shared/src/socket/index.ts`, `socket/events.ts` (create)
  - `packages/shared/src/queues/index.ts`, `queues/queues.ts` (create)
  - `packages/shared/src/outbox/index.ts`, `outbox/events.ts` (create)
  - `packages/shared/src/contracts.spec.ts` (create)
  - `packages/shared/package.json` (modify — exports `./socket`, `./queues`, `./outbox`)
- **Parallel-safe with:** TIP-B03, TIP-B04 (khác file).

## CONTEXT
- Socket event table: `plans/api-contract.md` mục Socket.IO. Queue table: `standards/backend/queues-workers.md`.
- `chatMessageSchema` ở `api-domains/chat-room.ts`, `notificationSchema` ở `api-domains/inbox.ts` (kiểm tên thật trước khi import).

## APPLICABLE STANDARDS
- [realtime/socket-chat](../standards/realtime/socket-chat.md) · [backend/queues-workers](../standards/backend/queues-workers.md) · [backend/api-conventions](../standards/backend/api-conventions.md)

## TASK
Khai báo hợp đồng dùng chung server ↔ worker ↔ FE: tên event socket + zod payload (C→S, S→C), tên queue + job + zod payload,
tên sự kiện outbox + zod payload. Chỉ khai báo, không logic.

## SPECIFICATIONS
### Business Rules
1. `SOCKET_EVENTS`: `room.join`, `room.leave`, `message.send`, `message.react`, `message.pin`, `message.new`, `message.updated`,
   `room.online`, `member.request`, `notification.new`, `membership.updated`, `session.revoked` — mỗi cái có schema payload (và ack nếu C→S).
2. `message.new` dùng `chatMessageSchema` (không có `isSimulated`, D-48).
3. `QUEUES`: `outbox`, `mail`, `reconcile`, `scheduler`, `export`, `bot`; job name + payload chỉ chứa ID/tham số.
4. `OUTBOX_EVENTS` khởi đầu: `membership_fee.activated`, `user.locked`, `user.session_revoked`, `user.role_changed`, `mail.requested`,
   `group.request_decided`; TIP sau chỉ thêm dòng.
5. Error code giữ nguyên bảng hiện có (đã đủ).

### Validation
- Mọi payload là `z.object` strict-enough (không `passthrough`).

### Error Handling
- n/a (khai báo).

## ACCEPTANCE CRITERIA
- Given `outboxPayloadSchema('user.locked')` When parse `{userId}` hợp lệ Then OK; thiếu `userId` Then lỗi.
- Given schema `message.new` When parse object có `isSimulated` Then trường đó bị bỏ (không xuất hiện trong output).
- Given import `@opchub/shared/queues` từ server Then typecheck xanh.

## CONSTRAINTS
- DO NOT: import Nest/Prisma trong shared; đổi schema hiện có theo cách phá FE.
- REUSE: schema `api-domains` sẵn có.
- SKIP: hiện thực gateway/processor.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; AC có unit test
- [ ] Rule HANDOFF 1: chỉ thêm, tương thích ngược
- [ ] Rule HANDOFF 6: payload chat không lộ `isSimulated`
- [ ] `pnpm --filter @opchub/shared lint typecheck test` xanh; commit; SHA
