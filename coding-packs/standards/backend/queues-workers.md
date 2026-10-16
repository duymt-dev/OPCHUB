# Queues & workers (BullMQ)

## Queue

| Queue | Việc | Retry |
|---|---|---|
| `mail` | OTP, chào mừng, nhắc phí, xác nhận sự kiện | 5 lần, exponential backoff |
| `reconcile` | Khớp giao dịch, quét bù 2 phút | 3 lần |
| `scheduler` | Job định kỳ: chuyển trạng thái phí hằng ngày, `stats_daily`, dọn token | 3 lần |
| `export` | Xuất CSV lên MinIO; concurrency 2 | 2 lần |
| `bot` | Tick 1 phút, gọi LLM (sau go-live, sau feature flag) | 2 lần |

Tên queue, tên job và zod schema payload đặt trong `packages/shared/queues`.

## Rule

- Payload chỉ chứa ID và tham số (`{ userId, periodId }`), không chứa cả entity. Worker tự đọc dữ liệu mới nhất.
- Worker parse payload bằng zod trước khi xử lý.
- **Mọi job phải idempotent**, vì có thể chạy 2 lần. Dùng `jobId` cố định khi cần chống trùng (vd. `remind:{userId}:{yyyy-mm-dd}`), và cập nhật DB có điều kiện.
- Enqueue **sau khi commit** transaction.
- Job định kỳ (repeatable) khai báo tập trung trong một file `apps/worker/src/schedules.ts`.
- Job lỗi hết số lần retry thì log lỗi, gửi Sentry, và để lại trong failed set để xem lại. Không tự xóa.
- Worker dùng lại service của `apps/api` qua module dùng chung. Không viết lại rule nghiệp vụ trong processor.
- Processor ≤ 1 việc. Việc nhiều bước thì tách job con (flow), không viết một processor 500 dòng.
