import { Injectable } from '@nestjs/common';
import type { StoreDashboard } from '@opchub/shared/api-domains';
import { forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BUSINESS_ONLY, NO_STORE_YET } from '../domain/store-status';
import { storeViewDaysQuery, type StoreViewDayRow } from '../repositories/store-views.query';
import type { StoreOwner } from './store-owner.service';

const DAY_MS = 86_400_000;
const VN_MS = 7 * 3_600_000;
/** `YYYY-MM-DD` theo giờ Việt Nam */
const vnDay = (ms: number) => new Date(ms + VN_MS).toISOString().slice(0, 10);

/**
 * D-114 S6: Dashboard "Gian hàng của tôi" chỉ số thật — lượt xem 7 ngày (so 7 ngày trước) theo
 * `store_daily_views` PK `(store_id, day)` (một Index Scan khoảng 14 ngày), nhu cầu đang mở theo
 * `needs (store_id, status)`. Không có "Khách quan tâm" / "Lịch hẹn" (không có nguồn dữ liệu).
 */
@Injectable()
export class StoreDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(u: StoreOwner, now = new Date()): Promise<StoreDashboard> {
    if (u.accountType !== 'business') throw forbidden(BUSINESS_ONLY);
    const store = await this.prisma.db.store.findUnique({
      where: { ownerId: u.id },
      select: { id: true },
    });
    if (!store) throw notFound(NO_STORE_YET);
    const day = (i: number) => vnDay(now.getTime() - i * DAY_MS);
    const [rows, openNeeds] = await Promise.all([
      this.prisma.db.$queryRaw<StoreViewDayRow[]>(storeViewDaysQuery(store.id, day(13), day(0))),
      this.prisma.db.need.count({ where: { storeId: store.id, status: 'open' } }),
    ]);
    const at = new Map(rows.map((r) => [r.day, r.views]));
    const n = (i: number) => at.get(day(i)) ?? 0;
    const days = [6, 5, 4, 3, 2, 1, 0].map((i) => ({ day: day(i), views: n(i) }));
    return {
      days,
      views7: days.reduce((a, d) => a + d.views, 0),
      viewsPrev7: [13, 12, 11, 10, 9, 8, 7].reduce((a, i) => a + n(i), 0),
      openNeeds,
    };
  }
}
