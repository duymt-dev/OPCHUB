import { Prisma } from '@opchub/db';

export interface StoreViewDayRow {
  day: string;
  views: number;
}

/**
 * D-114 S6: lượt xem theo ngày của một gian hàng trong khoảng `[from, to]` (YYYY-MM-DD giờ VN) —
 * Index Scan theo PK `(store_id, day)`: bằng trước, khoảng sau
 */
export const storeViewDaysQuery = (storeId: string, from: string, to: string) => Prisma.sql`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, views
  FROM store_daily_views
  WHERE store_id = ${storeId} AND day BETWEEN ${from}::date AND ${to}::date`;
