# Queues & workers (BullMQ)

Worker là entrypoint `apps/server/src/main-worker.ts`. Processor ở `apps/server/src/worker/processors/`, gọi service của `modules/<domain>` (cùng app, không import chéo app).

## Queue

| Queue | Việc | Retry |
|---|---|---|
| `outbox` | Relay `outbox_events` → queue khác / socket (mỗi 1 giây) | vô hạn, có backoff |
| `mail` | OTP, chào mừng, nhắc phí, xác nhận sự kiện | 5 lần, exponential backoff |
| `reconcile` | Khớp giao dịch, quét bù 2 phút | 3 lần |
| `scheduler` | Chuyển trạng thái phí hằng ngày, `stats_daily`, dọn token | 3 lần |
| `export` | Xuất CSV lên MinIO; concurrency 2 | 2 lần |
| `bot` | Tick 1 phút, gọi LLM (sau go-live, sau feature flag) | 2 lần |

Tên queue, tên job, zod payload ở `packages/shared/queues`.

## Rule

- Payload chỉ chứa ID và tham số (`{ userId, periodId }`). Worker tự đọc dữ liệu mới nhất.
- Processor parse payload bằng zod trước khi xử lý.
- **Mọi job idempotent** (có thể chạy 2 lần): `jobId` cố định khi cần chống trùng (vd. `remind:{userId}:{yyyy-mm-dd}`), cập nhật DB có điều kiện.
- Hiệu ứng phụ quan trọng đi qua **outbox** ([nestjs-modules](nestjs-modules.md#hiệu-ứng-phụ-outbox)), không enqueue trực tiếp.
- Job định kỳ khai báo tập trung ở `worker/schedules.ts`.
- Hết retry: log + Sentry, giữ trong failed set để xem lại. Không tự xóa.
- Processor làm 1 việc. Nhiều bước thì tách job con (BullMQ flow).
- Không viết rule nghiệp vụ trong processor.
