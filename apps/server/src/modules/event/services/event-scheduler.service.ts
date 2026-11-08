import { Injectable } from '@nestjs/common';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventSweepRepository } from '../repositories/event-sweep.repository';

/**
 * NA-23 — job `events-sweep` mỗi 15 phút: (a) đóng đăng ký khi hết chỗ / tới giờ, (b) nhắc 24h
 * (đánh dấu `reminded_at` + outbox `event.reminder_due` cùng transaction). "Đã diễn ra" lọc theo
 * thời gian ở query (không có cột trạng thái riêng).
 */
@Injectable()
export class EventSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EventSweepRepository,
    private readonly outbox: OutboxService,
  ) {}

  async sweep(now = new Date()): Promise<{ closed: number; reminded: number }> {
    const closed = await this.prisma.db.$transaction((tx) => this.repo.closeDue(tx, now));
    const reminded = await this.prisma.db.$transaction(async (tx) => {
      const ids = await this.repo.claimReminders(tx, now);
      await this.outbox.addMany(
        tx,
        'event.reminder_due',
        ids.map((eventId) => ({ eventId, window: '24h' as const })),
      );
      return ids;
    });
    const hourly = await this.prisma.db.$transaction(async (tx) => {
      const ids = await this.repo.claimReminders1h(tx, now);
      await this.outbox.addMany(
        tx,
        'event.reminder_due',
        ids.map((eventId) => ({ eventId, window: '1h' as const })),
      );
      return ids;
    });
    return { closed: closed.length, reminded: reminded.length + hourly.length };
  }
}
