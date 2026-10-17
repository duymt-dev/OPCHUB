import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AdminEvent, AdminEventUpsert } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@/common/audit';
import { AppError, conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ImageRefService } from '../../uploads';
import { toAdminEvent } from '../domain/event.mapper';
import { endsAtOf } from '../domain/vn-time';
import { EventRepository, type EventWrite } from '../repositories/event.repository';

export interface Actor {
  id: string;
  ip: string | null;
}

const NOT_FOUND = 'Không tìm thấy sự kiện';

/** Admin "Nội dung & Sự kiện" (Q-G5a-1 → 5) — mọi thao tác ghi audit cùng transaction */
@Injectable()
export class EventAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EventRepository,
    private readonly audit: AuditService,
    private readonly images: ImageRefService,
  ) {}

  /** Màn Admin tải `size=100` rồi lọc/đếm phía client (Q-G3a-1) */
  async page(q: { page: number; size: number }) {
    const { rows, total } = await this.repo.page(undefined, q.page, q.size);
    return { items: rows.map(toAdminEvent), page: q.page, size: q.size, total };
  }

  /** Ảnh bìa + nhóm tổ chức kiểm NGOÀI transaction (luật 9) */
  private async toWrite(
    actor: Actor,
    input: AdminEventUpsert,
    currentCover: string | null,
  ): Promise<EventWrite> {
    if (input.groupId) {
      const g = await this.prisma.db.group.findFirst({
        where: { id: input.groupId, deletedAt: null },
        select: { id: true },
      });
      if (!g) {
        const message = 'Nhóm tổ chức không tồn tại';
        throw new AppError('VALIDATION_ERROR', message, [{ path: 'groupId', message }]);
      }
    }
    const startsAt = new Date(input.startsAt);
    const offline = input.mode === 'offline';
    return {
      title: input.title,
      description: input.description,
      mode: input.mode,
      startsAt,
      endsAt: endsAtOf(startsAt, input.endTime),
      place: input.place,
      address: offline ? input.address || null : null,
      mapUrl: offline ? input.mapUrl : null,
      seats: input.seats,
      groupId: input.groupId,
      registrationOpen: input.registrationOpen,
      coverUrl: await this.images.resolve({
        userId: actor.id,
        kind: 'event-cover',
        url: input.coverUrl,
        current: currentCover,
        path: 'coverUrl',
      }),
    };
  }

  async create(actor: Actor, input: AdminEventUpsert): Promise<AdminEvent> {
    const data = await this.toWrite(actor, input, null);
    const row = await this.prisma.db.$transaction(async (tx) => {
      const created = await this.repo.create(tx, randomUUID(), actor.id, data);
      await this.log(tx, actor, 'event.create', created.id, data.title);
      return created;
    });
    return toAdminEvent(row);
  }

  async update(actor: Actor, id: string, input: AdminEventUpsert): Promise<AdminEvent> {
    const cur = await this.repo.find(id);
    if (!cur) throw notFound(NOT_FOUND);
    const data = await this.toWrite(actor, input, cur.coverUrl);
    const row = await this.prisma.db.$transaction(async (tx) => {
      const r = await this.repo.update(tx, id, data);
      if (r === 'missing') throw notFound(NOT_FOUND);
      if (r === 'seats') throw conflict('Số chỗ nhỏ hơn số người đã đăng ký');
      await this.log(tx, actor, 'event.update', id, data.title);
      return r;
    });
    return toAdminEvent(row);
  }

  async remove(actor: Actor, id: string): Promise<{ id: string }> {
    await this.prisma.db.$transaction(async (tx) => {
      const title = await this.repo.remove(tx, id);
      if (title === null) throw notFound(NOT_FOUND);
      await this.log(tx, actor, 'event.delete', id, title);
    });
    return { id };
  }

  log(tx: DbTx, actor: Actor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'event',
      entityId,
      tag: 'content',
      summary: summary.slice(0, 500),
      ip: actor.ip,
    });
  }
}
