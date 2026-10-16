# NestJS server

## Một app, ba process

`apps/server` là **một** NestJS app có 3 entrypoint. Module nghiệp vụ viết một lần, process nào cần thì import.

```
apps/server/src/
  main-api.ts        NestFactory.create(ApiAppModule)            → REST /v1
  main-socket.ts     NestFactory.create(SocketAppModule)         → Socket.IO
  main-worker.ts     NestFactory.createApplicationContext(WorkerAppModule) → BullMQ
  api/        api-app.module.ts        (controllers đăng ký ở đây qua module domain)
  socket/     socket-app.module.ts, gateways/
  worker/     worker-app.module.ts, processors/, schedules.ts
  modules/    <domain>/                nghiệp vụ dùng chung
  common/     guards/ filters/ interceptors/ config/ logger/ prisma/ redis/ outbox/
```

- Controller REST nằm trong module domain; `ApiAppModule` import module đó. `SocketAppModule` và `WorkerAppModule` import module domain **không kèm controller** (module domain export `XxxCoreModule` chỉ có service + repository).
- Gateway và processor là lớp mỏng: parse input → gọi service domain → trả kết quả.

## Cấu trúc một domain

Domain theo SRS §3.2: `account`, `membership-fee`, `community`, `chat`, `moderation`, `event`, `project`, `investor`, `notification`, `mail`, `settings` (rbac, category, smtp), `audit`, `export`, `reporting`; sau go-live: `bot`, `service-request`.

Module **≥ 6 file** thì chia thư mục:

```
modules/membership-fee/
  index.ts                         public API
  membership-fee.module.ts         (Core + Http)
  controllers/  me-membership.controller.ts  admin-fees.controller.ts
  services/     membership-fee.service.ts    reconcile.service.ts
  repositories/ membership-fee.repository.ts payment-transaction.repository.ts
  domain/       membership-fee.state.ts      fee-period.ts        # hàm thuần
  membership-fee.types.ts
```

Module **< 6 file** để phẳng: `category.module.ts`, `category.controller.ts`, `category.service.ts`, `category.repository.ts`, `index.ts`.

## Trách nhiệm từng lớp

| Lớp | Được làm | Không được làm |
|---|---|---|
| Controller / gateway / processor | Parse zod, gọi service, trả response | Gọi Prisma, viết rule nghiệp vụ |
| Service | Rule nghiệp vụ, transaction, ghi outbox | SQL thô, biết về HTTP/socket |
| Repository | Prisma / TypedSQL cho **bảng của domain mình** | Rule nghiệp vụ, gọi service khác |
| `domain/*` | Hàm thuần: transition, tính hạn phí, parse nội dung CK | I/O |

## Ranh giới domain

- Gọi domain khác qua service export trong `index.ts` của domain đó. Không đọc ghi bảng của domain khác.
- **Ngoại lệ duy nhất:** `reporting` (KPI, Dashboard) và `export` (CSV) được **đọc** nhiều bảng qua TypedSQL, **không bao giờ ghi**.
- Không phụ thuộc vòng. Cần `forwardRef` là thiết kế sai: dừng lại và báo.

## Hiệu ứng phụ: outbox

Luồng quan trọng (phí kích hoạt, khóa tài khoản, duyệt nhóm/dự án, đổi quyền) ghi sự kiện vào bảng `outbox_events` **trong cùng transaction** với thay đổi nghiệp vụ:

```ts
await prisma.$transaction(async (tx) => {
  await feeRepo.activate(tx, userId, period);          // UPDATE ... WHERE status IN (...)
  await outbox.add(tx, 'membership_fee.activated', { userId, validUntil });
});
```

- Worker `outbox-relay` đọc `outbox_events` chưa xử lý (`FOR UPDATE SKIP LOCKED`), đẩy vào BullMQ / emit socket qua Redis, rồi đánh dấu đã gửi. Consumer phải idempotent.
- Hiệu ứng **không quan trọng** (đếm view, cache warm) được enqueue thẳng sau commit.
- Không dùng `@nestjs/event-emitter` cho việc chéo process; chỉ dùng trong cùng process cho việc mất được.

## State machine

Mỗi thực thể có trạng thái có `domain/<entity>.state.ts`:

```ts
const TRANSITIONS = {
  draft: ['pending_review'],
  pending_review: ['published', 'needs_changes', 'rejected'],
  published: ['hidden', 'pending_review'],   // D-18: sửa bất kỳ trường nào → duyệt lại
  hidden: ['published'],
  needs_changes: ['pending_review'],
  rejected: [],
} as const satisfies Record<ProjectStatus, readonly ProjectStatus[]>;
```

Repository cập nhật có điều kiện `WHERE id = $1 AND status = $from`; 0 dòng bị ảnh hưởng thì ném `CONFLICT`.

## Transaction

- `prisma.$transaction(async tx => …)`, giữ ngắn.
- Không gọi dịch vụ ngoài (email, HTTP, LLM) bên trong transaction.

## Config, log

- `@nestjs/config` + zod env schema theo process (`api`, `socket`, `worker` có thể khác biến). Không đọc `process.env` ngoài `common/config`.
- `nestjs-pino`; mỗi request có `requestId` trả trong header `X-Request-Id` và error body.
- Graceful shutdown: `enableShutdownHooks()`; socket đóng kết nối có thông báo, worker đợi job đang chạy xong.
