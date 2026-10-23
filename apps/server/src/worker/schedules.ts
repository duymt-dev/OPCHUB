import { QUEUES } from '@opchub/shared/queues';

/**
 * Job định kỳ khai báo tập trung (queues-workers.md). BullMQ job scheduler (upsert theo id):
 * nhiều worker cùng khởi động vẫn chỉ một lịch.
 */
export const SCHEDULES = [
  { id: 'bot-tick', queue: QUEUES.bot, name: 'tick', repeat: { every: 10000 } },
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
    id: 'events-sweep',
    queue: QUEUES.scheduler,
    name: 'eventsSweep',
    /** NA-23: đóng đăng ký (hết chỗ / tới giờ) + nhắc 24h — mỗi 15 phút */
    repeat: { every: 900_000 },
  },
  {
    id: 'housekeeping-nightly',
    queue: QUEUES.scheduler,
    name: 'housekeeping',
    /** NA-13: 02:00 giờ Việt Nam — dọn dữ liệu hết hạn (không đụng audit_logs) */
    repeat: { pattern: '0 2 * * *', tz: 'Asia/Ho_Chi_Minh' },
  },
  {
    id: 'stats-daily',
    queue: QUEUES.scheduler,
    name: 'statsDaily',
    /** 00:10 giờ Việt Nam — chụp số liệu ngày vừa hết (B44) */
    repeat: { pattern: '10 0 * * *', tz: 'Asia/Ho_Chi_Minh' },
  },
  {
    id: 'fundraising-status-daily',
    queue: QUEUES.scheduler,
    name: 'fundraisingStatus',
    /** V4-610 (D-82): 08:10 giờ Việt Nam — Gói Gọi vốn hết hạn + nhắc gia hạn T-14 */
    repeat: { pattern: '10 8 * * *', tz: 'Asia/Ho_Chi_Minh' },
  },
] as const;

/**
 * Lịch đã gỡ: worker xoá khi khởi động (BullMQ giữ job scheduler trong Redis qua các lần deploy).
 * D-73 (TIP-V4-606): gỡ Marketing — giữ code + bảng đến bàn giao, không chạy chiến dịch đến hạn.
 */
export const RETIRED_SCHEDULES = [{ id: 'campaigns-due', queue: QUEUES.scheduler }] as const;
