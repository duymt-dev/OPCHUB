# Prisma & migrations

## Schema

- Một schema duy nhất ở `packages/db/prisma/schema.prisma`. Model PascalCase số ít, bảng snake_case **số nhiều** qua `@@map` (`users`, tránh từ khóa `user` của Postgres).
- Cột snake_case qua `@map`, field Prisma camelCase.
- Mọi bảng có `id` (UUID), `created_at`, `updated_at`, kiểu `@db.Timestamptz(6)`.
- Email: `@db.Citext`, unique. SĐT lưu dạng E.164.
- Tiền: `Int` (VND) cho từng khoản, `BigInt` cho tổng. **Cấm `Float`/`Decimal` cho VND.**
- Enum dùng Prisma enum, giá trị theo [domain-glossary](../global/domain-glossary.md).
- JSON chỉ cho dữ liệu thật sự không cố định (raw webhook, `extra` của phiếu YC). Không nhét dữ liệu cần lọc vào JSON.
- Xóa mềm (`deleted_at`) chỉ dùng cho: `users`, `projects`, `messages`, `categories`. Bảng khác xóa thật hoặc dùng trạng thái.
- `audit_logs` chỉ cho INSERT: migration thu hồi quyền UPDATE/DELETE của role ứng dụng.

## Migration

1. Sửa `schema.prisma`.
2. `prisma migrate dev --create-only --name <slug>`.
3. Mở file SQL vừa sinh và thêm thủ công phần Prisma không khai báo được: index `INCLUDE`, partial index, expression index, GIN/trigram, extension, trigger, `REVOKE`.
4. Viết `down.sql` cùng thư mục migration để rollback.
5. `prisma migrate dev` để áp dụng. Commit cả hai file.

- **Không sửa migration đã áp dụng** ở bất kỳ môi trường nào. Sai thì viết migration mới.
- Đổi cấu trúc có phá dữ liệu thì làm 2 bước: thêm mới + copy dữ liệu → bản sau mới xóa cái cũ.
- Migration đầu tiên tạo extension: `citext`, `unaccent`, `pg_trgm`.

## Seed

- `packages/db/seed/` idempotent (upsert), chạy lại được nhiều lần.
- Lấy dữ liệu từ prototype: 34 tỉnh/thành + vùng, danh mục lĩnh vực + màu + scope, vai trò đăng ký, quyền mặc định, mẫu email chào mừng.
- Dữ liệu demo (thành viên, dự án giả) để seed riêng, không chạy ở production.

## Kết nối

- `DATABASE_URL` trỏ PgBouncer, có `pgbouncer=true&connection_limit=<nhỏ>`; `DIRECT_URL` trỏ thẳng Postgres để chạy migration.
- Một PrismaClient singleton mỗi process.
