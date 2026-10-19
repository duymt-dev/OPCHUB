import { QUEUES } from '@opchub/shared/queues';

/**
 * Job định kỳ khai báo tập trung (queues-workers.md). BullMQ job scheduler (upsert theo id):
 * nhiều worker cùng khởi động vẫn chỉ một lịch.
 */
export const SCHEDULES = [
  {
    id: 'fee-status-daily',
    queue: QUEUES.scheduler,
    name: 'feeStatus',
    /** 08:00 giờ Việt Nam: trạng thái phí + nhắc T-30/T-7/T-0/T+3 (D-57, NA-04) */
    repeat: { pattern: '0 8 * * *', tz: 'Asia/Ho_Chi_Minh' },
  },
  {
    id: 'reconcile-poll',
    queue: QUEUES.reconcile,
    name: 'poll',
    /** Quét bù mỗi 2 phút (D-07) */
    repeat: { every: 120_000 },
  },
  {
    id: 'campaigns-due',
    queue: QUEUES.scheduler,
    name: 'campaignsDue',
    /** Chiến dịch đã lên lịch đến hạn (B42) */
    repeat: { every: 60_000 },
  },
  {
    id: 'stats-daily',
    queue: QUEUES.scheduler,
    name: 'statsDaily',
    /** 00:10 giờ Việt Nam — chụp số liệu ngày vừa hết (B44) */
    repeat: { pattern: '10 0 * * *', tz: 'Asia/Ho_Chi_Minh' },
  },
] as const;
