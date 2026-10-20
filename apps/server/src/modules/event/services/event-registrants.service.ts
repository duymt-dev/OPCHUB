import { Injectable } from '@nestjs/common';
import type {
  EventCheckIn,
  EventCheckInResult,
  EventRegistrant,
  EventRegistrantsExport,
} from '@opchub/shared/api-domains';
import { conflict, notFound } from '@/common/errors';
import { toCsv } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { canUndoCheckIn } from '../domain/registration.state';
import { EventRepository, type RegistrantRow } from '../repositories/event.repository';
import { type Actor, EventAdminService } from './event-admin.service';

const NOT_FOUND = 'Không tìm thấy sự kiện';
/** Xuất / check-in tất cả: trần một lần (eventCheckInSchema ≤ 1000) */
const ALL = 5000;
const STATUS_LABEL: Record<EventRegistrant['status'], string> = {
  registered: 'Đã đăng ký',
  attended: 'Đã check-in',
  cancelled: 'Đã huỷ',
};

function toRegistrant(r: RegistrantRow): EventRegistrant {
  return {
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone ?? '',
    org: r.company ?? 'Thành viên OPC',
    status: r.status,
    registeredAt: r.created_at.toISOString(),
  };
}

/** Drawer "Danh sách đăng ký" (`e.reg`): xem, check-in, xuất CSV (dữ liệu cá nhân → audit) */
@Injectable()
export class EventRegistrantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EventRepository,
    private readonly admin: EventAdminService,
  ) {}

  private async ensure(id: string): Promise<string> {
    const ev = await this.prisma.db.event.findUnique({ where: { id }, select: { title: true } });
    if (!ev) throw notFound(NOT_FOUND);
    return ev.title;
  }

  async page(id: string, page: number, size: number) {
    await this.ensure(id);
    const { rows, total } = await this.repo.registrants(id, page, size);
    return { items: rows.map(toRegistrant), page, size, total };
  }

  async checkIn(actor: Actor, id: string, body: EventCheckIn): Promise<EventCheckInResult> {
    const ev = await this.prisma.db.event.findUnique({
      where: { id },
      select: { startsAt: true, endsAt: true },
    });
    if (!ev) throw notFound(NOT_FOUND);
    // Bỏ check-in nhầm (cạnh mở rộng attended → registered) chỉ trước khi sự kiện kết thúc
    if (!body.attended && !canUndoCheckIn(ev, new Date())) {
      throw conflict('Sự kiện đã kết thúc, không thể bỏ check-in');
    }
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.checkIn(tx, id, body.userIds, body.attended);
      await this.admin.log(
        tx,
        actor,
        body.attended ? 'event.check_in' : 'event.check_in_undo',
        id,
        body.userIds.join(','),
      );
    });
    const { rows, total } = await this.repo.registrants(id, 1, ALL);
    // EV-R05: "Đã check-in x/y" — y = người còn giữ chỗ (không tính đã huỷ)
    const checkedIn = rows.filter((r) => r.status === 'attended').length;
    return { items: rows.map(toRegistrant), checkedIn, total };
  }

  /** Đọc danh sách + audit trong CÙNG transaction (BUG-039): audit lỗi → không trả CSV */
  async export(actor: Actor, id: string): Promise<EventRegistrantsExport> {
    await this.ensure(id);
    return this.prisma.db.$transaction(async (tx) => {
      const { rows } = await this.repo.registrants(id, 1, ALL, tx);
      const items = rows.map(toRegistrant);
      await this.admin.log(tx, actor, 'event.registrants_export', id, `${items.length} dòng`);
      return { filename: `dang-ky-${id}.csv`, csv: registrantsCsv(items) };
    });
  }
}

const registrantsCsv = (items: readonly EventRegistrant[]): string =>
  toCsv(
    ['Họ tên', 'Tổ chức', 'Email', 'Điện thoại', 'Trạng thái', 'Ngày đăng ký'],
    items.map((r) => [
      r.fullName,
      r.org,
      r.email,
      r.phone,
      STATUS_LABEL[r.status],
      r.registeredAt.slice(0, 10),
    ]),
  );
