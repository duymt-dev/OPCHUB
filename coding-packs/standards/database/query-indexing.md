# Query & indexing

Cụ thể hóa rule PostgreSQL trong global CLAUDE.md.

## Index

- **Bằng trước, khoảng/sort sau.** `WHERE group_id = $1 AND status = 'pending' ORDER BY created_at DESC` → `(group_id, status, created_at DESC)`.
- Cột chỉ dùng trong SELECT đưa vào `INCLUDE (...)` để đạt Index Only Scan.
- **Partial index** cho tập hay truy vấn:
  ```sql
  CREATE INDEX idx_memberships_due ON memberships (valid_until)
    WHERE status IN ('active', 'expiring');
  CREATE INDEX idx_group_members_pending ON group_members (group_id, created_at DESC)
    WHERE status = 'pending';
  CREATE INDEX idx_projects_review ON projects (created_at DESC)
    WHERE status = 'pending_review' AND deleted_at IS NULL;
  CREATE INDEX idx_payment_tx_unmatched ON payment_transactions (received_at DESC)
    WHERE match_status = 'unmatched';
  ```
- **Expression index** khi lọc bằng hàm: tìm kiếm không dấu dùng `unaccent` + `pg_trgm` GIN, và truy vấn phải dùng đúng biểu thức đã đánh index.
- Unique cho idempotency: `payment_transactions (provider, bank_txn_id)`, `messages (room_id, sender_id, client_msg_id)`, `investor_interests (project_id, user_id)`.

## Phân trang

| Loại list | Cách |
|---|---|
| Admin có số trang (thành viên, phí, nhóm, dự án, NĐT…) | Offset + **deferred join**: subquery chỉ `SELECT id` theo index, rồi JOIN lại lấy cột |
| Chat, thông báo, audit log, giao dịch | **Keyset**: `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT n` |

```sql
SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at
FROM (
  SELECT id FROM users
  WHERE account_type = $1 AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
) sub
JOIN users u ON u.id = sub.id
ORDER BY u.created_at DESC;
```

Deferred join viết bằng Prisma TypedSQL (`packages/db/prisma/sql/*.sql`) hoặc `$queryRaw` với `Prisma.sql`. Đặt trong repository.

## Cấm

- Truy vấn DB trong vòng lặp (`for … await prisma…`). Gom bằng `WHERE id IN (...)` hoặc join.
- `include` lồng nhiều cấp lấy cả quan hệ khi chỉ cần vài cột; luôn dùng `select`.
- `$queryRawUnsafe` / `$executeRawUnsafe` với chuỗi ghép từ input.
- Đếm `COUNT(*)` không có điều kiện trên bảng lớn mỗi request; KPI lấy từ `stats_daily`.

## Cập nhật trạng thái

Cập nhật có điều kiện, kiểm số dòng bị ảnh hưởng, không đọc rồi ghi:

```sql
UPDATE memberships SET status = 'active', valid_until = $2, updated_at = now()
WHERE user_id = $1 AND status IN ('pending_payment', 'expired');
```

## Bằng chứng

Mỗi query list mới phải kèm `EXPLAIN (ANALYZE, BUFFERS)` (trên seed ≥ 10k dòng) trong Completion Report. Không chấp nhận `Seq Scan` trên bảng lớn.
