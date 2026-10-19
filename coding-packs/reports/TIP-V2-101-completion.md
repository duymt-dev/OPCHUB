# TIP-V2-101 — Outbox tin cậy (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. TD-019, TD-023, M1.

## Đã làm
- `outbox.repository.ts`: `claim(types, limit, leaseSec)` — một câu `UPDATE … SET locked_until … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`, autocommit; `markDispatched(ids)` một câu cho cả lô; `markFailed(id, error, retryInSec)` đặt backoff. Bỏ `lockPending`.
- `outbox-relay.service.ts`: handler chạy **ngoài** transaction; chỉ nhận loại đã đăng ký (`registeredTypes()`), loại chưa có consumer giữ `dispatched_at IS NULL`, `attempts = 0` → replay khi có consumer; `reportUnconsumed()` log lỗi một lần mỗi process.
- `backoff.ts`: `min(2^n, 300)` giây.
- `outbox-relay.processor.ts`: tick gọi `reportUnconsumed()` (một lần có hiệu lực).
- Schema `OutboxEvent.lockedUntil`; migration `20261018125042_outbox_lease` (chỉ `ADD COLUMN`; đã bỏ 3 lệnh `DROP INDEX` mà Prisma diff tự sinh cho index viết tay). Đã áp `opchub_dev` + `opchub_test`.
- Kiểm cơ học `c1-outbox.audit.ts`: dò đúng hành vi mới (lọc `registeredTypes()` khi claim) thay vì dò chuỗi log cũ.

## Test
- Unit `backoff.spec.ts`: 2 test.
- Int `outbox.int.spec.ts`: 10 test (6 cũ sửa theo backoff + 4 mới: TD-023 replay, TD-019 không `idle in transaction` + dòng không bị khoá, TD-019 backoff, lease hết hạn).
- Int `outbox-consumers.int.spec.ts`: 2 test (M1 mọi loại có consumer trừ allowlist; allowlist không dư).
- Toàn bộ server: unit **55/55**, int **237/237** (60 file). Lint server, typecheck server + db xanh.
- `c1-outbox.audit.ts`: 11 đạt / 3 không đạt — 3 loại `user.locked`, `user.session_revoked`, `user.role_changed` chưa có consumer (TIP-V2-104); dòng "relay đánh dấu dispatched" đã hết.

## Còn lại cho TIP-V2-104
- Allowlist `PENDING_CONSUMERS = ['user.locked', 'user.session_revoked', 'user.role_changed']` trong `apps/server/test/common/outbox-consumers.int.spec.ts` — 104 viết consumer rồi xoá; test sẽ đỏ nếu quên xoá.
- Sự kiện `user.*` đã phát trước đây trên DB thật: bản cũ đã bị đánh dấu dispatched (mất); từ nay giữ pending chờ 104.

## Chưa chạy
- e2e msw/server: TIP chỉ đổi worker/relay, chạy ở cổng cuối pha P1 cùng các TIP khác.
