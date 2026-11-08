import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EVENT_SELECT, type EventRow } from '../domain/event.mapper';
import { DEFAULT_DURATION_MS, REMIND_BEFORE_MS, REMIND_1H_MS } from '../domain/event-sweep';

export const eventReminders1hQuery = (now: Date) => Prisma.sql`
  UPDATE events SET reminded_1h_at=${now}
  WHERE reminded_1h_at IS NULL AND starts_at>${now}
    AND starts_at<=${new Date(now.getTime() + REMIND_1H_MS)} RETURNING id`;

/** NA-23 (scheduler 15') + EV-R02 — mỗi bước một câu, không lặp theo sự kiện */
@Injectable()
export class EventSweepRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Đóng đăng ký tự động: hết chỗ hoặc tới giờ bắt đầu (idx `events_open_starts`) */
  async closeDue(tx: DbTx, now: Date): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE events SET registration_open = false, closed_at = ${now}, updated_at = now()
      WHERE registration_open AND closed_at IS NULL
        AND (registered_count >= seats OR starts_at <= ${now})
      RETURNING id`;
    return rows.map((r) => r.id);
  }

  /** Nhắc 24h: đánh dấu `reminded_at` rồi trả id (idx `events_remind_due`) — chạy lại không trùng */
  async claimReminders(tx: DbTx, now: Date): Promise<string[]> {
    const until = new Date(now.getTime() + REMIND_BEFORE_MS);
    const after = new Date(now.getTime() + REMIND_1H_MS);
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE events SET reminded_at = ${now}
      WHERE reminded_at IS NULL AND starts_at > ${after} AND starts_at <= ${until}
      RETURNING id`;
    return rows.map((r) => r.id);
  }

  async claimReminders1h(tx: DbTx, now: Date): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>(eventReminders1hQuery(now));
    return rows.map((r) => r.id);
  }

  /**
   * EV-R02: sự kiện đang mở đăng ký, chưa kết thúc, từ đầu ngày VN hôm nay — ≤ 4 dòng
   * (sự kiện gần nhất + 3 "Tiếp theo"). Lọc "chưa kết thúc" theo `ends_at` hoặc bắt đầu + 2h.
   */
  upcoming(from: Date, now: Date, limit = 4): Promise<EventRow[]> {
    const endedBefore = new Date(now.getTime() - DEFAULT_DURATION_MS);
    return this.prisma.db.event.findMany({
      where: {
        registrationOpen: true,
        startsAt: { gte: from },
        OR: [{ endsAt: { gt: now } }, { endsAt: null, startsAt: { gt: endedBefore } }],
      },
      select: EVENT_SELECT,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  /** NA-23: huỷ trả chỗ — sự kiện bị ĐÓNG TỰ ĐỘNG vì hết chỗ (chưa tới giờ) mở lại */
  async reopenIfAutoClosed(tx: DbTx, id: string, now: Date): Promise<boolean> {
    const n = await tx.$executeRaw`
      UPDATE events SET registration_open = true, closed_at = NULL, updated_at = now()
      WHERE id = ${id} AND NOT registration_open AND closed_at IS NOT NULL
        AND starts_at > ${now} AND registered_count < seats`;
    return n === 1;
  }
}
