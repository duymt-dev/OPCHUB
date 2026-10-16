# Prisma & migrations

## Schema (nhiều file theo domain)

```
packages/db/prisma/
  schema/
    _base.prisma          generator, datasource
    account.prisma        users, business_profiles, sso_links, consents
    membership-fee.prisma membership_fees, membership_fee_periods, payment_transactions
    community.prisma      groups, group_members
    chat.prisma           rooms, messages, reactions, room_read_cursors, pinned_messages
    moderation.prisma     reports, moderation_keywords
    event.prisma · project.prisma · investor.prisma · notification.prisma
    settings.prisma       categories, role_permissions, smtp_configs, app_settings
    system.prisma         audit_logs, outbox_events, stats_daily
  migrations/
  sql/                    TypedSQL (*.sql) cho deferred join, báo cáo
seed/
```

Mỗi file ≤ 600 dòng. Quan hệ chéo file được Prisma hỗ trợ.

## Quy ước

- Model PascalCase số ít; bảng snake_case **số nhiều** qua `@@map`; cột snake_case qua `@map`, field camelCase.
- Mọi bảng: `id` UUID (`@default(uuid(7))` để có thứ tự thời gian), `created_at`, `updated_at` kiểu `@db.Timestamptz(6)`.
- Email `@db.Citext` unique. SĐT E.164.
- Tiền: `Int` (VND) cho từng khoản, `BigInt` cho tổng. **Cấm `Float`/`Decimal` cho VND.**
- Enum theo [domain-glossary](../global/domain-glossary.md).
- JSON chỉ cho dữ liệu thật sự không cố định (raw webhook, `extra` phiếu YC, payload outbox).
- Xóa mềm (`deleted_at`) chỉ cho: `users`, `projects`, `messages`, `categories`.
- `audit_logs` chỉ INSERT: migration `REVOKE UPDATE, DELETE` khỏi role ứng dụng.

## Migration

1. Sửa file schema của domain.
2. `prisma migrate dev --create-only --name <slug>`.
3. Thêm tay vào SQL phần Prisma không khai báo được: index `INCLUDE`, partial, expression, GIN/trigram, extension, trigger, `REVOKE`.
4. Viết `down.sql` cùng thư mục để rollback.
5. `prisma migrate dev`. Commit cả hai file cùng commit tính năng.

- **Không sửa migration đã áp dụng** ở bất kỳ môi trường nào; sai thì viết migration mới.
- Đổi cấu trúc phá dữ liệu: 2 bước (thêm + copy → bản sau mới xóa).
- Migration đầu tạo extension `citext`, `unaccent`, `pg_trgm`.
- Production chạy `prisma migrate deploy` trước khi restart service.

## Seed

- `packages/db/seed/` idempotent (upsert).
- Dữ liệu từ prototype: 34 tỉnh/thành + vùng, danh mục lĩnh vực (màu, scope), vai trò đăng ký, quyền mặc định, mẫu email chào mừng.
- Dữ liệu demo tách riêng (`seed:demo`), không chạy ở production.

## Kết nối

- `DATABASE_URL` → PgBouncer (`pgbouncer=true&connection_limit=<nhỏ>`); `DIRECT_URL` → Postgres cho migration.
- Một PrismaClient mỗi process (`common/prisma`).
