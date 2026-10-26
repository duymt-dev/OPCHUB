import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { ADMIN_NEED_PAGE_SIZE, type AdminNeedFilter } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NEED_DELETABLE, NEED_TRANSITIONS } from '../domain/need-status';
import { NEED_SELECT, type NeedRow } from '../domain/need.mapper';

/** Ghi nhu cầu (UP-09) + Admin (AD-07). Mọi chuyển trạng thái có điều kiện `WHERE status IN from` */
@Injectable()
export class NeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Nhu cầu của tôi — index `(owner_id, created_at desc)` */
  mine(ownerId: string): Promise<NeedRow[]> {
    return this.prisma.db.need.findMany({
      where: { ownerId },
      select: NEED_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  create(data: Prisma.NeedUncheckedCreateInput): Promise<NeedRow> {
    return this.prisma.db.need.create({ data, select: NEED_SELECT });
  }

  owned(ownerId: string, id: string) {
    return this.prisma.db.need.findFirst({
      where: { id, ownerId },
      select: { id: true, status: true },
    });
  }

  /** Chủ: Đóng / Mở lại — `updated_at` làm mới (Prisma `@updatedAt`) */
  async step(ownerId: string, id: string, t: 'close' | 'reopen'): Promise<boolean> {
    const { from, to } = NEED_TRANSITIONS[t];
    const r = await this.prisma.db.need.updateMany({
      where: { id, ownerId, status: { in: [...from] } },
      data: { status: to },
    });
    return r.count === 1;
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const r = await this.prisma.db.need.deleteMany({
      where: { id, ownerId, status: { in: [...NEED_DELETABLE] } },
    });
    return r.count === 1;
  }

  byId(id: string): Promise<NeedRow | null> {
    return this.prisma.db.need.findUnique({ where: { id }, select: NEED_SELECT });
  }

  /** Admin ẩn hàng loạt: nhớ trạng thái trước — mỗi trạng thái nguồn một câu UPDATE có điều kiện */
  async hide(tx: DbTx, ids: readonly string[], by: string, reason: string | null) {
    const changed: string[] = [];
    for (const prev of NEED_TRANSITIONS.hide.from) {
      const rows = await tx.need.findMany({
        where: { id: { in: [...ids] }, status: prev },
        select: { id: true },
      });
      if (!rows.length) continue;
      const r = await tx.need.updateMany({
        where: { id: { in: rows.map((x) => x.id) }, status: prev },
        data: { status: 'hidden', hiddenPrev: prev, hiddenBy: by, hiddenReason: reason },
      });
      if (r.count) changed.push(...rows.map((x) => x.id));
    }
    return changed;
  }

  /** Admin hiện lại: về đúng trạng thái trước khi ẩn */
  async show(tx: DbTx, ids: readonly string[]) {
    const changed: string[] = [];
    for (const prev of NEED_TRANSITIONS.hide.from) {
      const rows = await tx.need.findMany({
        where: { id: { in: [...ids] }, status: 'hidden', hiddenPrev: prev },
        select: { id: true },
      });
      if (!rows.length) continue;
      const r = await tx.need.updateMany({
        where: { id: { in: rows.map((x) => x.id) }, status: 'hidden', hiddenPrev: prev },
        data: { status: prev, hiddenPrev: null, hiddenBy: null, hiddenReason: null },
      });
      if (r.count) changed.push(...rows.map((x) => x.id));
    }
    return changed;
  }

  titles(tx: DbTx, ids: readonly string[]) {
    return tx.need.findMany({ where: { id: { in: [...ids] } }, select: { id: true, title: true } });
  }

  private adminWhere(status: AdminNeedFilter, q?: string): Prisma.NeedWhereInput {
    const and: Prisma.NeedWhereInput[] = [];
    if (status !== 'all') and.push({ status });
    if (q) {
      const c = { contains: q, mode: 'insensitive' as const };
      and.push({
        OR: [{ title: c }, { field: c }, { province: c }, { store: { name: c } }],
      });
    }
    return { AND: and };
  }

  /** Admin: deferred join theo `(status, updated_at desc, id)` */
  async adminPage(status: AdminNeedFilter, q: string | undefined, page: number) {
    const where = this.adminWhere(status, q);
    const [ids, total] = await Promise.all([
      this.prisma.db.need.findMany({
        where,
        select: { id: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * ADMIN_NEED_PAGE_SIZE,
        take: ADMIN_NEED_PAGE_SIZE,
      }),
      this.prisma.db.need.count({ where }),
    ]);
    if (!ids.length) return { rows: [] as NeedRow[], total };
    const rows = await this.prisma.db.need.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: NEED_SELECT,
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return { rows: ids.flatMap((r) => at.get(r.id) ?? []), total };
  }

  async summary(q?: string) {
    const rows = await this.prisma.db.need.groupBy({
      by: ['status'],
      where: this.adminWhere('all', q),
      _count: { _all: true },
    });
    const n = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      total: rows.reduce((a, r) => a + r._count._all, 0),
      open: n('open'),
      closed: n('closed'),
      hidden: n('hidden'),
    };
  }
}
