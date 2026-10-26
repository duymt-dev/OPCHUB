import { Injectable } from '@nestjs/common';
import type { Prisma } from '@opchub/db';
import {
  STORE_PAGE_SIZE,
  type StoreFacets,
  type StoreListQuery,
  type StoreSort,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  STORE_CARD_SELECT,
  STORE_DETAIL_SELECT,
  type StoreCardRow,
  type StoreDetailRow,
} from '../domain/store.mapper';

const ORDERS: Record<StoreSort, Prisma.StoreOrderByWithRelationInput[]> = {
  newest: [{ updatedAt: 'desc' }, { id: 'desc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
  items: [{ itemCount: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
};

/**
 * Khám phá (UP-08, §25.2): chỉ gian hàng `published` của chủ còn hạn phí (D-75).
 * Index `(status, province, field, updated_at desc)` / `(status, updated_at desc, id)`.
 */
export const visibleStore = (now: Date): Prisma.StoreWhereInput => ({
  status: 'published',
  owner: {
    deletedAt: null,
    membershipFee: { status: { in: ['active', 'expiring'] }, validUntil: { gt: now } },
  },
});

type Filter = Omit<StoreListQuery, 'page' | 'sort'>;

@Injectable()
export class StoreExploreRepository {
  constructor(private readonly prisma: PrismaService) {}

  private where(f: Partial<Filter>, now: Date): Prisma.StoreWhereInput {
    const and: Prisma.StoreWhereInput[] = [visibleStore(now)];
    if (f.kind === 'product') and.push({ hasProduct: true });
    if (f.kind === 'service') and.push({ hasService: true });
    if (f.audience?.length) and.push({ audience: { in: f.audience } });
    if (f.field?.length) and.push({ field: { in: f.field } });
    if (f.province?.length) and.push({ province: { in: f.province } });
    if (f.q) {
      const q = { contains: f.q, mode: 'insensitive' as const };
      and.push({
        OR: [
          { name: q },
          { slogan: q },
          { intro: q },
          { field: q },
          { items: { some: { name: q } } },
        ],
      });
    }
    return { AND: and };
  }

  /** Deferred join: trang id theo index sắp xếp, rồi mới lấy cột thẻ cho đúng N dòng */
  async page(f: StoreListQuery, now: Date): Promise<{ rows: StoreCardRow[]; total: number }> {
    const where = this.where(f, now);
    const [ids, total] = await Promise.all([
      this.prisma.db.store.findMany({
        where,
        select: { id: true },
        orderBy: ORDERS[f.sort],
        skip: (f.page - 1) * STORE_PAGE_SIZE,
        take: STORE_PAGE_SIZE,
      }),
      this.prisma.db.store.count({ where }),
    ]);
    if (!ids.length) return { rows: [], total };
    const rows = await this.prisma.db.store.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: STORE_CARD_SELECT,
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return { rows: ids.flatMap((r) => at.get(r.id) ?? []), total };
  }

  /**
   * Số đếm từng lựa chọn lọc trên toàn bộ gian hàng đang hiển thị (prototype đếm trên `pubs`,
   * không phụ thuộc lọc đang chọn) — 4 truy vấn gộp, service cache Redis 60 s.
   */
  async facets(now: Date): Promise<StoreFacets> {
    const where = visibleStore(now);
    const db = this.prisma.db;
    const [total, product, service, audience, field, province] = await Promise.all([
      db.store.count({ where }),
      db.store.count({ where: { AND: [where, { hasProduct: true }] } }),
      db.store.count({ where: { AND: [where, { hasService: true }] } }),
      db.store.groupBy({ by: ['audience'], where, _count: { _all: true } }),
      db.store.groupBy({ by: ['field'], where, _count: { _all: true } }),
      db.store.groupBy({ by: ['province'], where, _count: { _all: true } }),
    ]);
    const facet = <K extends string>(
      rows: ({ _count: { _all: number } } & Record<K, string>)[],
      k: K,
    ) =>
      rows
        .filter((r) => r[k] !== '')
        .map((r) => ({ value: r[k], count: r._count._all }))
        .sort((a, b) => a.value.localeCompare(b.value, 'vi'));
    return {
      total,
      kind: { product, service },
      audience: facet(audience, 'audience'),
      field: facet(field, 'field'),
      province: facet(province, 'province'),
    };
  }

  /** Chi tiết: hiển thị công khai, hoặc chủ gian hàng xem bản nháp / bị ẩn */
  detail(id: string, viewerId: string, now: Date): Promise<StoreDetailRow | null> {
    return this.prisma.db.store.findFirst({
      where: { id, OR: [visibleStore(now), { ownerId: viewerId }] },
      select: STORE_DETAIL_SELECT,
    });
  }
}
