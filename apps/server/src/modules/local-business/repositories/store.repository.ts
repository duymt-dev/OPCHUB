import { allocateStoreSlug } from './store-slug.repository';
import { conflict } from '@/common/errors';
import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { ADMIN_STORE_PAGE_SIZE, type AdminStoreFilter } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { STORE_TRANSITIONS, type StoreTransition } from '../domain/store-status';
import { STORE_DETAIL_SELECT, type StoreDetailRow } from '../domain/store.mapper';
import type { ResolvedStore } from '../services/store-media.service';

export interface StoreSeedInput {
  ownerId: string;
  name: string;
  province: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

/** Ghi gian hàng của chủ + thao tác Admin; mọi đổi trạng thái có điều kiện (luật 7) */
@Injectable()
export class StoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  mine(ownerId: string, tx?: DbTx): Promise<StoreDetailRow | null> {
    return (tx ?? this.prisma.db).store.findUnique({
      where: { ownerId },
      select: STORE_DETAIL_SELECT,
    });
  }

  /** Idempotent: UQ owner_id — chạy lại sự kiện không tạo thêm */
  async createDraft(tx: DbTx, s: StoreSeedInput): Promise<boolean> {
    // ON CONFLICT DO NOTHING keeps the transaction usable after a concurrent slug collision.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = await allocateStoreSlug(tx, s.name);
      const r = await tx.store.createMany({
        data: [{ ...s, slug, status: 'draft', audience: 'business', autoCreated: true }],
        skipDuplicates: true,
      });
      if (r.count) return true;
      if (await tx.store.findUnique({ where: { ownerId: s.ownerId }, select: { id: true } }))
        return false;
    }
    throw conflict('Không thể tạo link gian hàng, vui lòng thử lại');
  }

  /** Thay toàn bộ thông tin + item + media (PUT); giữ trạng thái. Lưu lần đầu → hết "tự tạo" */
  async replace(tx: DbTx, storeId: string, s: ResolvedStore): Promise<void> {
    const { items, videos, team, certs, docs, socials, ...info } = s;
    await tx.storeItem.deleteMany({ where: { storeId } });
    if (items.length) {
      await tx.storeItem.createMany({
        data: items.map((i, sort) => ({ ...i, storeId, sort })),
      });
    }
    await tx.store.update({
      where: { id: storeId },
      data: {
        ...info,
        videos,
        team,
        certs,
        docs,
        socials,
        autoCreated: false,
        itemCount: items.length,
        hasProduct: items.some((i) => i.kind === 'product'),
        hasService: items.some((i) => i.kind === 'service'),
      },
    });
  }

  async step(
    tx: DbTx,
    id: string,
    t: Exclude<StoreTransition, 'hide'>,
    at: Date,
  ): Promise<boolean> {
    const { from, to } = STORE_TRANSITIONS[t];
    const r = await tx.store.updateMany({
      where: { id, status: { in: [...from] } },
      data: { status: to, ...(to === 'published' ? { publishedAt: at } : {}) },
    });
    return r.count === 1;
  }

  /** Admin ẩn hàng loạt: nhớ trạng thái trước (draft / published) — 2 câu UPDATE có điều kiện */
  async hide(tx: DbTx, ids: readonly string[], by: string, reason: string | null) {
    const changed: string[] = [];
    for (const prev of STORE_TRANSITIONS.hide.from) {
      const rows = await tx.store.findMany({
        where: { id: { in: [...ids] }, status: prev },
        select: { id: true },
      });
      if (!rows.length) continue;
      const r = await tx.store.updateMany({
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
    for (const prev of STORE_TRANSITIONS.hide.from) {
      const rows = await tx.store.findMany({
        where: { id: { in: [...ids] }, status: 'hidden', hiddenPrev: prev },
        select: { id: true },
      });
      if (!rows.length) continue;
      const r = await tx.store.updateMany({
        where: { id: { in: rows.map((x) => x.id) }, status: 'hidden', hiddenPrev: prev },
        data: { status: prev, hiddenPrev: null, hiddenBy: null, hiddenReason: null },
      });
      if (r.count) changed.push(...rows.map((x) => x.id));
    }
    return changed;
  }

  adminPageById(id: string): Promise<StoreDetailRow | null> {
    return this.prisma.db.store.findUnique({ where: { id }, select: STORE_DETAIL_SELECT });
  }

  names(tx: DbTx, ids: readonly string[]) {
    return tx.store.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } });
  }

  private adminWhere(status: AdminStoreFilter, q?: string): Prisma.StoreWhereInput {
    const and: Prisma.StoreWhereInput[] = [];
    if (status !== 'all') and.push({ status });
    if (q) {
      const c = { contains: q, mode: 'insensitive' as const };
      and.push({ OR: [{ name: c }, { field: c }, { province: c }] });
    }
    return { AND: and };
  }

  /** Admin: deferred join theo thứ tự tạo `(status, created_at, id)` — prototype v4 `aAll` (D-89) */
  async adminPage(status: AdminStoreFilter, q: string | undefined, page: number) {
    const where = this.adminWhere(status, q);
    const [ids, total] = await Promise.all([
      this.prisma.db.store.findMany({
        where,
        select: { id: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * ADMIN_STORE_PAGE_SIZE,
        take: ADMIN_STORE_PAGE_SIZE,
      }),
      this.prisma.db.store.count({ where }),
    ]);
    if (!ids.length) return { rows: [] as StoreDetailRow[], total };
    const rows = await this.prisma.db.store.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: STORE_DETAIL_SELECT,
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return { rows: ids.flatMap((r) => at.get(r.id) ?? []), total };
  }

  async summary(q?: string) {
    const rows = await this.prisma.db.store.groupBy({
      by: ['status'],
      where: this.adminWhere('all', q),
      _count: { _all: true },
    });
    const n = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      total: rows.reduce((a, r) => a + r._count._all, 0),
      published: n('published'),
      draft: n('draft'),
      hidden: n('hidden'),
    };
  }
}
