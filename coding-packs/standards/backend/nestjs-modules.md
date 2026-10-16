# NestJS modules

## Cấu trúc một domain

```
apps/api/src/modules/membership/
  membership.module.ts
  controllers/   membership.controller.ts, admin-fees.controller.ts
  services/      membership.service.ts, reconcile.service.ts
  repositories/  membership.repository.ts
  domain/        membership.state.ts      # transition hợp lệ, hàm thuần
  events/        membership.events.ts
  membership.types.ts
```

Domain theo SRS §3.2: `account`, `membership`, `community`, `chat`, `moderation`, `event`, `project`, `investor`, `notification`, `mail`, `settings` (rbac, category, smtp), `audit`, `export`; sau go-live: `bot`, `service-request`.

## Trách nhiệm từng lớp

| Lớp | Được làm | Không được làm |
|---|---|---|
| Controller | Nhận request, parse zod, gọi service, trả response | Gọi Prisma, viết rule nghiệp vụ |
| Service | Rule nghiệp vụ, transaction, phát event, enqueue job | Viết SQL thô, biết về HTTP |
| Repository | Prisma / SQL cho bảng của domain mình | Rule nghiệp vụ, gọi service khác |
| `domain/*.state.ts` | Hàm thuần: transition hợp lệ, tính hạn phí… | I/O |

## Ranh giới giữa các domain

- Gọi domain khác qua **service được export** của module đó. Không đọc ghi trực tiếp bảng của domain khác.
- Hiệu ứng phụ chéo domain (vd. phí kích hoạt → mở khóa chat, gửi email) dùng domain event (`@nestjs/event-emitter`) hoặc job BullMQ, không gọi chuỗi đồng bộ.
- Không phụ thuộc vòng. Nếu cần `forwardRef` thì thiết kế đang sai, dừng lại và báo.

## State machine

Mỗi thực thể có trạng thái (xem [domain-glossary](../global/domain-glossary.md)) có một file `domain/<entity>.state.ts`:

```ts
const TRANSITIONS = {
  pending_review: ['published', 'needs_changes', 'rejected'],
  published: ['hidden', 'pending_review'],   // D-18: sửa bất kỳ trường nào → duyệt lại
  hidden: ['published'],
  needs_changes: ['pending_review'],
  draft: ['pending_review'],
  rejected: [],
} as const satisfies Record<ProjectStatus, readonly ProjectStatus[]>;
```

Repository cập nhật có điều kiện: `UPDATE ... WHERE id = $1 AND status = $from`. Nếu 0 dòng bị ảnh hưởng thì ném lỗi `CONFLICT`.

## Transaction

- Dùng `prisma.$transaction` và giữ transaction ngắn.
- Không gọi dịch vụ ngoài (email, HTTP, LLM) bên trong transaction.
- Enqueue job và phát event **sau khi commit**.

## Config, log

- `@nestjs/config` + zod env schema. Đọc config qua service typed, không `process.env` rải rác.
- `nestjs-pino`, mỗi request có `requestId` (trả về trong header `X-Request-Id` và trong error body).
