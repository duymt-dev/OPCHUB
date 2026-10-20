import { Injectable } from '@nestjs/common';
import type { EventMode } from '@opchub/db';
import type { EventItem, EventRegistrationResult } from '@opchub/shared/api-domains';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LiveCountersService } from '@/common/realtime';
import { toEventItem } from '../domain/event.mapper';
import { canReRegister } from '../domain/registration.state';
import { EventRepository } from '../repositories/event.repository';
import { EventSweepRepository } from '../repositories/event-sweep.repository';

const NOT_FOUND = 'Không tìm thấy sự kiện';

/** Sự kiện Portal (REQ-080 → 083): lịch, đăng ký/huỷ giữ chỗ */
@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EventRepository,
    private readonly outbox: OutboxService,
    private readonly sweep: EventSweepRepository,
    private readonly live: LiveCountersService,
  ) {}

  async page(
    userId: string,
    q: { mode?: EventMode | undefined; page: number; size: number },
  ): Promise<{ items: EventItem[]; page: number; size: number; total: number }> {
    const { rows, total } = await this.repo.page(q.mode, q.page, q.size);
    const ids = rows.map((r) => r.id);
    const [mine, avatars] = await Promise.all([
      this.repo.registeredAmong(userId, ids),
      this.repo.avatarsOf(ids),
    ]);
    return {
      items: rows.map((r) => toEventItem(r, mine.has(r.id), avatars.get(r.id))),
      page: q.page,
      size: q.size,
      total,
    };
  }

  /**
   * Khoá dòng `events FOR UPDATE` → kiểm chỗ + ghi đăng ký + tăng `registered_count` trong một tx:
   * hai người tranh chỗ cuối thì người sau thấy số đã cập nhật (data-model §6).
   */
  async register(userId: string, eventId: string): Promise<EventRegistrationResult> {
    let title = '';
    const registered = await this.prisma.db.$transaction(async (tx) => {
      const ev = await this.repo.lock(tx, eventId);
      if (!ev) throw notFound(NOT_FOUND);
      if (!ev.registration_open) throw conflict('Sự kiện đã đóng đăng ký');
      const status = await this.repo.registrationStatus(tx, eventId, userId);
      if (status === 'registered' || status === 'attended') {
        throw conflict('Bạn đã đăng ký sự kiện này');
      }
      if (ev.registered_count >= ev.seats) throw conflict('Sự kiện đã hết chỗ');
      const again = status === 'cancelled';
      // NA-23: đăng ký lại sau huỷ chỉ khi còn mở + chưa tới giờ (BUG-041)
      if (
        again &&
        !canReRegister(
          { registrationOpen: ev.registration_open, startsAt: ev.starts_at },
          new Date(),
        )
      ) {
        throw conflict('Sự kiện đã bắt đầu, không thể đăng ký lại');
      }
      if (!(await this.repo.register(tx, eventId, userId, again))) {
        throw conflict('Bạn đã đăng ký sự kiện này');
      }
      await this.outbox.add(tx, 'event.registered', { eventId, userId });
      title = ev.title;
      return this.repo.bumpRegistered(tx, eventId, 1);
    });
    await this.recordLive(userId, title);
    return { eventId, registered, registeredByMe: true };
  }

  async cancel(userId: string, eventId: string): Promise<EventRegistrationResult> {
    const registered = await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.repo.lock(tx, eventId))) throw notFound(NOT_FOUND);
      if (!(await this.repo.cancel(tx, eventId, userId))) {
        // §9: Đã tham dự không có cạnh sang Đã hủy (EV-R05, BUG-041)
        if ((await this.repo.registrationStatus(tx, eventId, userId)) === 'attended') {
          throw conflict('Bạn đã tham dự sự kiện, không thể huỷ đăng ký');
        }
        throw conflict('Bạn chưa đăng ký sự kiện này');
      }
      const left = await this.repo.bumpRegistered(tx, eventId, -1);
      // NA-23: huỷ trả chỗ → sự kiện bị đóng tự động vì hết chỗ thì mở lại (Admin đóng tay giữ nguyên)
      await this.sweep.reopenIfAutoClosed(tx, eventId, new Date());
      return left;
    });
    return { eventId, registered, registeredByMe: false };
  }

  /** NA-24: mục "đăng ký sự kiện" ở hoạt động trực tiếp Dashboard (lỗi Redis không ảnh hưởng) */
  private async recordLive(userId: string, title: string): Promise<void> {
    const u = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { fullName: true, avatarUrl: true },
    });
    if (!u) return;
    await this.live
      .record(
        'event',
        { name: u.fullName, avatarUrl: u.avatarUrl },
        title,
        `${userId}:${Date.now()}`,
      )
      .catch(() => undefined);
  }
}
