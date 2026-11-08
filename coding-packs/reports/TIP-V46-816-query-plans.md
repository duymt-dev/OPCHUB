# TIP-V46-816 — PostgreSQL query plans

## Cách đo

- PostgreSQL native, DB integration riêng `opchub_v46_801_test`; không đọc/ghi dữ liệu nghiệp vụ native.
- Test `apps/server/test/notification/push-query-plans.int.spec.ts`: **4/4 PASS**.
- Một connection riêng (`max: 1`), bảng TEMP cùng kiểu cột và thứ tự khóa index production;
  **10.000 dòng/bảng chính**, `ANALYZE` trước đo. Connection đóng thì TEMP tự mất.
- Thực thi chính các SQL builder production bằng `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`;
  không ép planner bằng `enable_seqscan=off`, không sửa timeout hay thống kê bảng public.
- JSON đầy đủ ở artifact local `test-results/v46-816-query-plans.jsonl`.

## Kết quả lượt đo độc lập

| Truy vấn | Kế hoạch thực tế | Index production tương ứng | Execution |
|---|---|---|---:|
| Đọc thiết bị cả lô | PK dispatch → PK notification → LATERAL LIMIT 10 / **Index Only Scan** owner → PK lấy endpoint/keys | `push_subscriptions_owner (realm,user_id,created_at DESC,id DESC)` | 0,095 ms |
| Audience nhu cầu | **BitmapOr** hai index ngành/tỉnh → kiểm user/phí → LIMIT → PK lấy intro/product names | `stores_need_audience_field`, `stores_need_audience_province` | 0,263 ms |
| Tổng hợp gian hàng | **Index Only Scan** ngày + keyset store_id → PK gian hàng/user/phí → LIMIT 1000 | `store_daily_views_digest (day,store_id) INCLUDE(views) WHERE views>0` | 0,086 ms |
| Claim sự kiện 1 giờ | **Index Scan** cửa sổ starts_at → UPDATE RETURNING | `events_remind_1h_due (starts_at) INCLUDE(id) WHERE reminded_1h_at IS NULL` | 0,059 ms |

Mỗi truy vấn chọn đúng **1 dòng** từ tập 10.000 trong fixture này. Không có Seq Scan
trên bảng nguồn được kiểm. Hai Index Only Scan có `Heap Fetches: 1` do visibility map
của TEMP vừa chèn, không được diễn giải thành hoàn toàn không đọc heap.

Thời gian là số đo fixture trên máy dev, **không phải** cam kết latency production.
Các tên index `plan_*` trong JSON là bản sao session-local của khóa/index nêu trên.

## Quyết định tối ưu

- Không đưa endpoint dài và khóa thiết bị vào B-tree: seek ID có covering key trước,
  chỉ đọc heap của tối đa 10 thiết bị/người/thông báo sau đó; tránh index tuple quá lớn.
- Ngành/tỉnh dùng hai partial index vì điều kiện OR; text rộng và tên sản phẩm chỉ lấy
  sau tập ID đã giới hạn. Chấm điểm vẫn gọi `scoreNeedMatch`, không chép thuật toán SQL.
- SQL phí dùng predicate chung và giữ ứng viên có hạn NULL để không loại sớm trường
  hợp legacy; quyết định cuối cùng vẫn là `isFeeUsable` dùng chung.
- Dọn thiết bị dùng đúng expression index `COALESCE(last_success_at,created_at),id`,
  giới hạn 1000/lượt; FK delivery có index subscription_id, claim/release có partial lease index.
- Store digest lưu cursor và continuation outbox cùng notification/intent trong một
  transaction; mỗi job một trang, không chạy query trong vòng lặp gửi từng người.

## Migration

`prisma migrate dev --create-only` trên DB riêng phát hiện checksum migration cũ
`20261115090000_v46_regional_mail_kinds` không khớp. **Không reset**, không sửa migration
đã áp dụng và không sửa `_prisma_migrations`. Thay thế bằng Prisma **read-only schema diff**
giữa schema HEAD trước TIP và schema mới, rồi bổ sung partial/expression/covering indexes,
CHECK và `down.sql` cho đúng migration `20261116090000_v46_web_push`.

`migrate:deploy` trên cả hai DB riêng và `prisma generate` đều exit 0. Không chạy down
trên runtime HOLD; không có DROP ngoài các đối tượng mới trong rollback script.
