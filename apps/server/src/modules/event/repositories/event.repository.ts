import { Injectable } from '@nestjs/common';
import type { DbTx, EventMode, EventRegistrationStatus, Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EVENT_SELECT, type EventRow } from '../domain/event.mapper';

export interface EventWrite {
  title: string;
  description: string;
  mode: EventMode;
  startsAt: Date;
  endsAt: Date | null;
  place: string;
  address: string | null;
  mapUrl: string | null;
  seats: number;
  groupId: string | null;
  registrationOpen: boolean;
  coverUrl: string | null;
}

export interface LockedEvent {
  title: string;
  seats: number;
  registered_count: number;
  registration_open: boolean;
  starts_at: Date;
}

export interface RegistrantRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: EventRegistrationStatus;
  created_at: Date;
}

/** Thứ tự lịch: sắp diễn ra trước (covering `events_upcoming`) */
const ORDER: Prisma.EventOrderByWithRelationInput[] = [{ startsAt: 'asc' }, { id: 'asc' }];

/** Bảng `events` + `event_registrations` */
@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deferred join (luật 7): trang id theo `(starts_at, id)` trước rồi mới lấy cột rộng
   * (`description`, `cover_url` có thể là data URL lớn).
   */
  async page(
    mode: EventMode | undefined,
    page: number,
    size: number,
  ): Promise<{ rows: EventRow[]; total: number }> {
    const where: Prisma.EventWhereInput = mode ? { mode } : {};
    const [ids, total] = await Promise.all([
      this.prisma.db.event.findMany({
        where,
        select: { id: true },
        orderBy: ORDER,
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.event.count({ where }),
    ]);
    if (!ids.length) return { rows: [], total };
    const rows = await this.prisma.db.event.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: EVENT_SELECT,
      orderBy: ORDER,
    });
    return { rows, total };
  }

  find(id: string): Promise<EventRow | null> {
    return this.prisma.db.event.findUnique({ where: { id }, select: EVENT_SELECT });
  }

  /** Sự kiện người gọi đang giữ chỗ trong danh sách id (PK event_id, user_id) */
  async registeredAmong(userId: string, eventIds: readonly string[]): Promise<Set<string>> {
    if (!eventIds.length) return new Set();
    const rows = await this.prisma.db.eventRegistration.findMany({
      where: { userId, eventId: { in: [...eventIds] }, status: { not: 'cancelled' } },
      select: { eventId: true },
    });
    return new Set(rows.map((r) => r.eventId));
  }

  /** Khoá dòng sự kiện: đăng ký/huỷ tuần tự theo sự kiện → không vượt số chỗ */
  async lock(tx: DbTx, id: string): Promise<LockedEvent | null> {
    const rows = await tx.$queryRaw<LockedEvent[]>`
      SELECT title, seats, registered_count, registration_open, starts_at
      FROM events WHERE id = ${id} FOR UPDATE`;
    return rows[0] ?? null;
  }

  async registrationStatus(tx: DbTx, eventId: string, userId: string) {
    const r = await tx.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    return r?.status ?? null;
  }

  /** Mới, hoặc `cancelled → registered` có điều kiện (luật 7) */
  async register(tx: DbTx, eventId: string, userId: string, again: boolean): Promise<boolean> {
    if (!again) {
      await tx.eventRegistration.create({ data: { eventId, userId } });
      return true;
    }
    const r = await tx.eventRegistration.updateMany({
      where: { eventId, userId, status: 'cancelled' },
      data: { status: 'registered', checkedInAt: null, createdAt: new Date() },
    });
    return r.count === 1;
  }

  async cancel(tx: DbTx, eventId: string, userId: string): Promise<boolean> {
    const r = await tx.eventRegistration.updateMany({
      where: { eventId, userId, status: 'registered' },
      data: { status: 'cancelled' },
    });
    return r.count === 1;
  }

  async bumpRegistered(tx: DbTx, id: string, delta: number): Promise<number> {
    const rows = await tx.$queryRaw<{ registered_count: number }[]>`
      UPDATE events SET registered_count = GREATEST(registered_count + ${delta}, 0), updated_at = now()
      WHERE id = ${id} RETURNING registered_count`;
    return rows[0]?.registered_count ?? 0;
  }

  create(tx: DbTx, id: string, createdBy: string, data: EventWrite) {
    return tx.event.create({ data: { id, createdBy, ...data }, select: EVENT_SELECT });
  }

  /** Số chỗ không được nhỏ hơn số đã đăng ký — kiểm trong cùng câu UPDATE */
  async update(tx: DbTx, id: string, data: EventWrite): Promise<EventRow | 'missing' | 'seats'> {
    const locked = await this.lock(tx, id);
    if (!locked) return 'missing';
    if (data.seats < locked.registered_count) return 'seats';
    return tx.event.update({ where: { id }, data, select: EVENT_SELECT });
  }

  async remove(tx: DbTx, id: string): Promise<string | null> {
    const rows = await tx.$queryRaw<{ title: string }[]>`
      DELETE FROM events WHERE id = ${id} RETURNING title`;
    return rows[0]?.title ?? null;
  }

  /** Người còn giữ chỗ (đã đăng ký / đã check-in), mới trước — idx (event_id, status, created_at) */
  async registrants(eventId: string, page: number, size: number) {
    const [rows, total] = await Promise.all([
      this.prisma.db.$queryRaw<RegistrantRow[]>`
        SELECT r.user_id, u.full_name, u.email, u.phone, b.company_name AS company, r.status, r.created_at
        FROM (
          SELECT user_id, status, created_at FROM event_registrations
          WHERE event_id = ${eventId} AND status IN ('registered', 'attended')
          ORDER BY created_at DESC, user_id
          LIMIT ${size} OFFSET ${(page - 1) * size}
        ) r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN business_profiles b ON b.user_id = r.user_id
        ORDER BY r.created_at DESC, r.user_id`,
      this.prisma.db.eventRegistration.count({
        where: { eventId, status: { in: ['registered', 'attended'] } },
      }),
    ]);
    return { rows, total };
  }

  /** Check-in / bỏ check-in một câu UPDATE; id lạ hoặc đã huỷ bị bỏ qua */
  async checkIn(tx: DbTx, eventId: string, userIds: readonly string[], attended: boolean) {
    const r = await tx.eventRegistration.updateMany({
      where: {
        eventId,
        userId: { in: [...userIds] },
        status: attended ? 'registered' : 'attended',
      },
      data: attended
        ? { status: 'attended', checkedInAt: new Date() }
        : { status: 'registered', checkedInAt: null },
    });
    return r.count;
  }
}
