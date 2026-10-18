import type { JobQueue } from '@opchub/shared/queues';
import { mailRetryDelay } from '@opchub/shared/queues';
import type { BackoffStrategy } from 'bullmq';

/** Tên backoff tuỳ biến của queue `mail` (JobsOptions.backoff.type) */
export const MAIL_BACKOFF = 'mail';

/**
 * NA-05: thư lỗi thử lại sau 1 / 5 / 15 phút (lịch tác vụ nền §8.7). BullMQ gọi với `attemptsMade`
 * đã tính lần vừa lỗi (1 sau lần đầu). Kiểu backoff khác (job không đặt `mail`) → mặc định 1 phút.
 */
export const mailBackoff: BackoffStrategy = (attemptsMade) => mailRetryDelay(attemptsMade);

/** `settings.backoffStrategy` theo queue — WorkerFactory gắn khi dựng Worker */
export const BACKOFF_STRATEGY: Partial<Record<JobQueue, BackoffStrategy>> = {
  mail: mailBackoff,
};
