# TIP-V2-101: Outbox tin cậy — không mất sự kiện, handler ngoài transaction, đủ consumer (TD-023, TD-019, M1)

## HEADER
- TIP-ID: TIP-V2-101 · Project: OPCHUB · Module: common/outbox + worker · Priority: P0 · Depends on: — (TIP đầu P1) · Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/common/outbox/outbox-relay.service.ts` (modify: claim lease → chạy handler ngoài transaction → đánh dấu; lọc theo loại đã đăng ký; `registeredTypes()`; cảnh báo loại chưa có consumer)
  - `apps/server/src/common/outbox/outbox.repository.ts` (modify: `claim`, `markDispatched`, `markFailed` có backoff, bỏ `lockPending`)
  - `apps/server/src/common/outbox/backoff.ts` (create) + `backoff.spec.ts` (create)
  - `apps/server/src/worker/processors/outbox-relay.processor.ts` (modify: lần tick đầu gọi `relay.reportUnconsumed()`)
  - `packages/db/prisma/schema/system.prisma` (modify: `OutboxEvent.lockedUntil DateTime? @map("locked_until") @db.Timestamptz(6)`)
  - `packages/db/prisma/migrations/<ts>_outbox_lease/migration.sql` — **migration do agent chính tạo, `--create-only` + review SQL** (ADD COLUMN `locked_until timestamptz`; giữ partial index `outbox_pending (id) WHERE dispatched_at IS NULL`)
  - `apps/server/test/common/outbox.int.spec.ts` (modify: cập nhật test theo hành vi mới)
  - `apps/server/test/common/outbox-consumers.int.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-102, 103, 105, 106, 109, 110, 111, 112, 113, 114. **Phải merge trước** TIP-V2-104, 107, 108 (cần relay không làm mất sự kiện). 104 xoá allowlist trong `outbox-consumers.int.spec.ts` (file của TIP này).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-101-outbox-reliability`)

## CONTEXT
- Audit: `coding-packs/audit/W1/TECH-DEBT.md` TD-019 (handler chạy trong tx giữ khoá `FOR UPDATE SKIP LOCKED`), TD-023 (`dispatch()` trả `null` khi không có handler → `markDispatched` → sự kiện mất vĩnh viễn, `user.locked` đã mất); `work/mechanical.md` M1; kiểm cơ học `apps/server/test/audit/c1-outbox.audit.ts`.
- Code hiện tại: `outbox-relay.service.ts:47-84` (`relayOnce` bọc cả lô trong `$transaction`, `dispatch` bỏ qua loại chưa có handler); `outbox.repository.ts` (`lockPending`); vòng relay `worker/processors/outbox-relay.processor.ts`.
- Danh sách loại sự kiện: `packages/shared/src/outbox/events.ts` (`outboxEvents`). Nơi đăng ký: `worker/processors/*.processor.ts` (`relay.register(...)`).
- ADR-0005 (outbox), standards `backend/queues-workers.md › outbox`.

## APPLICABLE STANDARDS
[nestjs-modules](../standards/backend/nestjs-modules.md) (luật 8 outbox) · [queues-workers](../standards/backend/queues-workers.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [testing](../standards/testing/testing.md)

## TASK
Sửa relay outbox để: (1) sự kiện chưa có consumer **không** bị đánh dấu đã gửi, được xử lý lại khi consumer được bổ sung; (2) handler chạy **ngoài** transaction giữ khoá (claim bằng lease ngắn); (3) có test bảo đảm mọi loại trong `events.ts` có consumer ở process worker.

## SPECIFICATIONS
### Business Rules
1. **Claim lease (TD-019)** — một câu lệnh, autocommit, không mở transaction dài:
   `UPDATE outbox_events SET locked_until = now() + ${LEASE_SEC} * interval '1 second' WHERE id IN (SELECT id FROM outbox_events WHERE dispatched_at IS NULL AND (locked_until IS NULL OR locked_until < now()) AND type = ANY(${types}::text[]) ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED) RETURNING id, type, payload, attempts`. `LEASE_SEC = 60`, `BATCH = 100`. Trả về sắp theo `id` ở app.
2. Handler chạy **tuần tự theo id** sau khi claim đã commit. Thành công → `UPDATE … SET dispatched_at = now(), locked_until = NULL WHERE id = ANY(ids)` (một câu cho cả lô). Lỗi → `attempts = attempts + 1, last_error = <≤500 ký tự>, locked_until = now() + backoff(attempts)` (backoff `min(2^attempts, 300)` giây, hàm thuần `backoff.ts`). Cảnh báo `logger.error` khi `attempts + 1 >= 20` (giữ hằng `ALERT_ATTEMPTS`).
3. **Không mất sự kiện (TD-023)**: `types` trong câu claim = loại đã có handler (`this.handlers.keys()`). Loại chưa có consumer **giữ nguyên** `dispatched_at IS NULL`, không tăng `attempts`. Khi consumer được đăng ký (deploy mới) → lần tick sau xử lý bình thường (replay).
4. `registeredTypes(): OutboxEventType[]` (public, dùng cho test). `reportUnconsumed()`: so `Object.keys(outboxEvents)` với `registeredTypes()`, `logger.error({ types }, 'Loại sự kiện outbox chưa có consumer')` một lần mỗi process; gọi ở tick đầu của `OutboxRelayProcessor` (sau khi mọi processor đã `onApplicationBootstrap`).
5. Handler vẫn phải **idempotent** (lease hết hạn khi handler > 60 s → relay khác có thể chạy lại). Giữ comment cảnh báo này trong `register()`.
6. Không đổi API `OutboxService.add/addMany`, không đổi `events.ts` (chỉ TIP domain thêm dòng).

### Data / Migration
- Cột mới `locked_until timestamptz NULL`. Partial index `outbox_pending (id) WHERE dispatched_at IS NULL` vẫn phục vụ subquery (lọc `locked_until`, `type` trên tập pending nhỏ). Không thêm index khác.
- Migration do agent chính tạo, `--create-only` + review SQL (chỉ `ALTER TABLE … ADD COLUMN`, không khoá bảng lâu).

### Error Handling
- `relayOnce()` ném (DB mất kết nối) → processor log + thử lại nhịp sau (giữ nguyên). Lỗi handler không làm hỏng lô: các sự kiện khác vẫn được đánh dấu.

## ACCEPTANCE CRITERIA
- Given sự kiện `user.locked` chưa có handler, When relay chạy 3 lần, Then dòng vẫn `dispatched_at IS NULL`, `attempts = 0`; When đăng ký handler rồi relay chạy, Then handler nhận đúng payload và dòng được đánh dấu (TD-023, M1).
- Given handler chờ 300 ms, When relay đang gọi handler, Then `pg_stat_activity` không có phiên `idle in transaction` của relay và `SELECT … FOR UPDATE NOWAIT` trên dòng đó thành công (TD-019).
- Given handler lỗi, Then `attempts = 1`, `locked_until > now()`; relay chạy ngay lần nữa không gọi lại handler; sau khi hết backoff thì gọi lại (TD-019).
- Given hai relay chạy song song 6 sự kiện, Then mỗi sự kiện được xử lý đúng một lần (giữ test SKIP LOCKED).
- Given `WorkerAppModule`, Then mọi loại trong `outboxEvents` có ít nhất một handler, trừ allowlist `PENDING_CONSUMERS` (M1).

## TESTS BẮT BUỘC
- Unit `apps/server/src/common/outbox/backoff.spec.ts`: `TD-019 backoff tăng gấp đôi, trần 300 giây`.
- Int `apps/server/test/common/outbox.int.spec.ts` (sửa 5 test cũ cho API mới, thêm): `TD-023 sự kiện chưa có handler giữ pending, replay khi đăng ký`, `TD-019 handler chạy ngoài transaction (không idle in transaction)`, `TD-019 handler lỗi: backoff, không gọi lại trước hạn`, `lease hết hạn → relay khác nhận lại`.
- Int `apps/server/test/common/outbox-consumers.int.spec.ts`: `M1 mọi sự kiện outbox trong events.ts có consumer ở worker`. Dựng `WorkerAppModule` bằng `Test.createTestingModule` + `overrideProvider(OutboxRelayProcessor).useValue({})`, `app.init()` (Redis db 2), đọc `app.get(OutboxRelayService).registeredTypes()`. Allowlist `PENDING_CONSUMERS = ['user.locked', 'user.session_revoked', 'user.role_changed']` kèm comment "TIP-V2-104 xoá"; test thêm điều kiện allowlist ⊂ `outboxEvents` và mỗi loại trong allowlist **chưa** có handler (để 104 buộc phải xoá dòng).
- Chạy lại `apps/server/test/audit/c1-outbox.audit.ts`: không còn dòng "relay đánh dấu dispatched khi không có handler".

## CONSTRAINTS
- DO NOT: bọc handler trong `$transaction`; query trong vòng lặp để đánh dấu thành công (gom một câu); `$queryRawUnsafe`; đổi thứ tự xử lý theo id trong lô; xoá sự kiện cũ.
- REUSE: `PrismaService.db.$queryRaw` tagged template, `parseOutboxPayload`, `isOutboxEventType`.
- SKIP: viết consumer `user.*` (TIP-V2-104), dọn bảng outbox đã gửi (NA-13, TIP-V2-306).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 8 (outbox cùng transaction nghiệp vụ — không đổi phía ghi), luật 5 (không query trong vòng lặp), luật 13 (test file riêng), luật 1 (file ≤ 400 dòng BE tối ưu).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm --filter @opchub/server test:int` xanh; e2e msw + server không hồi quy (`pnpm e2e`, `pnpm e2e:server --project behavior`).
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-101-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-101-completion.md` (ghi rõ allowlist còn lại cho 104).
