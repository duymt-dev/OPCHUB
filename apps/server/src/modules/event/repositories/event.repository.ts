import { Injectable } from '@nestjs/common';
import type { DbTx, EventMode, EventRegistrationStatus } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EVENT_SELECT, type EventRow } from '../domain/event.mapper';
import { registrationEdge } from '../domain/registration.state';

type Db = DbTx | PrismaService['db'];

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
  meetUrl: string | null;
  /** Admin lưu = tự quyết mở/đóng → bỏ dấu "đóng tự động" (NA-23) */
  closedAt: null;
  /** Đổi giờ bắt đầu → nhắc 24h lại (undefined = giữ) */
  remindedAt?: null;
  reminded1hAt?: null;
}

export interface LockedEvent {
  title: string;
  seats: number;
  registered_count: number;
  registration_open: boolean;
  starts_at: Date;
  closed_at: Date | null;
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
  /**
   * BUG-011: ≤ 4 ảnh người `registered|attended` mới nhất mỗi sự kiện — MỘT query cho cả trang
   * (LATERAL theo id, seek `event_registrations(event_id, status, created_at)`).
   */
  async avatarsOf(eventIds: readonly string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (!eventIds.length) return out;
    const rows = await this.prisma.db.$queryRaw<
      { event_id: string; avatar_url: string }[]
    >(Prisma.sql`
      SELECT e.id AS event_id, a.avatar_url
      FROM unnest(${[...eventIds]}::text[]) AS e(id)
      CROSS JOIN LATERAL (
        SELECT u.avatar_url
        FROM event_registrations r
        JOIN users u ON u.id = r.user_id
        WHERE r.event_id = e.id AND r.status IN ('registered', 'attended')
          AND u.avatar_url IS NOT NULL AND u.status = 'active' AND u.deleted_at IS NULL
        ORDER BY r.created_at DESC, r.user_id
        LIMIT 4
      ) a`);
    for (const r of rows) out.set(r.event_id, [...(out.get(r.event_id) ?? []), r.avatar_url]);
    return out;
  }

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
      SELECT title, seats, registered_count, registration_open, starts_at, closed_at
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

  /** Mới, hoặc cạnh mở rộng `cancelled → registered` (NA-23) có điều kiện (luật 7) */
  async register(tx: DbTx, eventId: string, userId: string, again: boolean): Promise<boolean> {
    if (!again) {
      await tx.eventRegistration.create({ data: { eventId, userId } });
      return true;
    }
    const e = registrationEdge('cancelled', 'registered');
    const r = await tx.eventRegistration.updateMany({
      where: { eventId, userId, status: e.from },
      data: { status: e.to, checkedInAt: null, createdAt: new Date() },
    });
    return r.count === 1;
  }

  /** §9 `registered → cancelled`; `attended → cancelled` bị chặn (EV-R05, BUG-041) */
  async cancel(tx: DbTx, eventId: string, userId: string): Promise<boolean> {
    const e = registrationEdge('registered', 'cancelled');
    const r = await tx.eventRegistration.updateMany({
      where: { eventId, userId, status: e.from },
      data: { status: e.to },
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
  async registrants(eventId: string, page: number, size: number, db: Db = this.prisma.db) {
    const [rows, total] = await Promise.all([
      db.$queryRaw<RegistrantRow[]>`
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
      db.eventRegistration.count({
        where: { eventId, status: { in: ['registered', 'attended'] } },
      }),
    ]);
    return { rows, total };
  }

  /**
   * Check-in (§9 `registered → attended`) / bỏ check-in (mở rộng `attended → registered`) một câu
   * UPDATE có điều kiện; id lạ hoặc đã huỷ bị bỏ qua (`cancelled → attended` bị chặn — BUG-041)
   */
  async checkIn(tx: DbTx, eventId: string, userIds: readonly string[], attended: boolean) {
    const e = attended
      ? registrationEdge('registered', 'attended')
      : registrationEdge('attended', 'registered');
    const r = await tx.eventRegistration.updateMany({
      where: { eventId, userId: { in: [...userIds] }, status: e.from },
      data: { status: e.to, checkedInAt: attended ? new Date() : null },
    });
    return r.count;
  }
}
