import { z } from 'zod';

/**
 * Queue BullMQ + job + payload (backend/queues-workers.md).
 * Payload chỉ chứa ID và tham số; worker tự đọc dữ liệu mới nhất. TIP sau chỉ thêm dòng.
 */
export const QUEUES = {
  outbox: 'outbox',
  mail: 'mail',
  reconcile: 'reconcile',
  scheduler: 'scheduler',
  export: 'export',
  bot: 'bot',
  moderation: 'moderation',
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const jobs = {
  mail: {
    send: z.object({ mailLogId: z.string().min(1) }),
    /** Chiến dịch: mỗi job xếp một lô người nhận rồi tự xếp job lô sau (B42) */
    campaignBatch: z.object({ campaignId: z.string().min(1) }),
  },
  reconcile: {
    /** Khớp một giao dịch đã lưu */
    match: z.object({ transactionId: z.string().min(1) }),
    /** Quét bù 2 phút (listSince) */
    poll: z.object({}),
  },
  scheduler: {
    /** `day` bỏ trống = hôm nay theo giờ VN (job định kỳ không tự điền được) */
    feeStatus: z.object({ day: isoDay.optional() }),
    /** `day` bỏ trống = hôm qua theo giờ VN (lịch 00:10 chụp ngày vừa hết) */
    statsDaily: z.object({ day: isoDay.optional() }),
    cleanupTokens: z.object({}),
    /** Chiến dịch đã lên lịch đến hạn → gửi (mỗi phút) */
    campaignsDue: z.object({}),
  },
  export: {
    run: z.object({ exportJobId: z.string().min(1) }),
  },
  moderation: {
    /** S-08: tin trúng từ khoá → tạo ca `auto` (không chặn đường gửi tin) */
    keywordHit: z.object({ messageId: z.string().min(1), hit: z.string().min(1).max(60) }),
  },
  bot: {
    tick: z.object({}),
    postThread: z.object({ threadId: z.string().min(1) }),
  },
} as const;

export type JobQueue = keyof typeof jobs;
export type JobName<Q extends JobQueue> = keyof (typeof jobs)[Q] & string;
