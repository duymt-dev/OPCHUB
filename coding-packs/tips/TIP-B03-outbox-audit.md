# TIP-B03: Outbox + Audit service

## HEADER
- TIP-ID: TIP-B03
- Project: OPCHUB
- Module: server/common (outbox, audit)
- Priority: P0
- Depends on: TIP-B02, TIP-B04
- Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/common/outbox/outbox.service.ts`, `outbox.repository.ts`, `outbox-relay.service.ts`, `outbox.module.ts`, `index.ts` (create)
  - `apps/server/src/common/audit/audit.service.ts`, `audit.module.ts`, `index.ts` (create)
  - `apps/server/src/worker/processors/outbox-relay.processor.ts` (create)
  - `apps/server/src/worker/worker-app.module.ts` (modify — thêm import, chỉ thêm dòng)
  - `apps/server/test/common/outbox.int.spec.ts`, `test/common/audit.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B05. Sequential, shares `worker-app.module.ts` with TIP-B04.

## CONTEXT
- ADR-0005 outbox. Bảng `outbox_events`, `audit_logs` có từ B02. Queue name/payload ở `@opchub/shared/queues` (B05).
- Key files: `standards/backend/nestjs-modules.md` (mục outbox), `standards/backend/queues-workers.md`, `plans/data-model.md` §14.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [backend/queues-workers](../standards/backend/queues-workers.md) · [database/query-indexing](../standards/database/query-indexing.md) · [testing/testing](../standards/testing/testing.md)

## TASK
`OutboxService.add(tx, type, payload)` ghi `outbox_events` trong transaction của caller. Relay (worker, mỗi 1 giây) lấy lô sự kiện chưa
gửi bằng `FOR UPDATE SKIP LOCKED`, gọi handler đã đăng ký theo `type` (đẩy BullMQ / publish Redis), đánh dấu `dispatched_at`.
`AuditService.log(tx, {actorId, action, entity, entityId, diff, ip})` chỉ INSERT.

## SPECIFICATIONS
### Business Rules
1. `type` là union string khai báo ở `@opchub/shared` (`OUTBOX_EVENTS` + zod payload theo type); `add` parse payload trước khi ghi.
2. Relay: `SELECT id,type,payload FROM outbox_events WHERE dispatched_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED` trong transaction,
   gọi handler, `UPDATE … SET dispatched_at = now()` cho id thành công, `attempts = attempts + 1` cho id lỗi (log, không ném).
3. Handler đăng ký qua `OutboxRelayService.register(type, fn)`; type chưa có handler → đánh dấu đã gửi + log warn (tránh nghẽn).
4. Consumer idempotent — tài liệu ghi ở JSDoc của `register`.
5. Audit: `ip` nhận từ request (inet), `diff` jsonb; không có hàm update/delete.

### Validation
- Payload outbox/audit parse zod; sai → ném lỗi trong transaction (rollback cả thay đổi nghiệp vụ).

### Error Handling
- Handler lỗi → giữ sự kiện, tăng `attempts`, lần sau thử lại; `attempts ≥ 20` log error (Sentry ở B65).

## ACCEPTANCE CRITERIA
- Given transaction ghi user + outbox rồi rollback When đọc Then không có dòng outbox.
- Given 3 sự kiện chưa gửi When relay chạy Then handler nhận đúng thứ tự id, cả 3 có `dispatched_at`.
- Given 2 relay chạy song song When cùng lô Then mỗi sự kiện xử lý đúng 1 lần (SKIP LOCKED).
- Given handler ném lỗi When relay Then `attempts=1`, `dispatched_at` NULL.
- Given `AuditService.log` When gọi Then có 1 dòng; không tồn tại API sửa/xoá.

## CONSTRAINTS
- DO NOT: gọi dịch vụ ngoài trong transaction; `@nestjs/event-emitter` cho việc chéo process.
- REUSE: `PrismaService` (B04), `OUTBOX_EVENTS` (B05).
- SKIP: handler nghiệp vụ cụ thể (TIP domain đăng ký sau).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; AC có test int chạy trên `opchub_test`
- [ ] Rule HANDOFF 3: hiệu ứng phụ qua outbox cùng transaction
- [ ] Rule HANDOFF 4: audit chỉ INSERT
- [ ] Không query trong vòng lặp (update theo `id = ANY($1)`)
- [ ] lint/typecheck/test/test:int xanh; commit đường dẫn cụ thể; SHA
