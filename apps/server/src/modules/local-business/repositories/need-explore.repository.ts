import { Injectable } from '@nestjs/common';
import type { Prisma } from '@opchub/db';
import {
  NEED_PAGE_SIZE,
  NEED_STORE_MAX,
  type NeedFacets,
  type NeedListQuery,
  type NeedSuggestion,
  type StoreNeed,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NEED_SELECT, type NeedRow, STORE_NEED_SELECT, toStoreNeed } from '../domain/need.mapper';
import { visibleStore } from './store-explore.repository';

/**
 * Danh sách công khai (UP-09): nhu cầu `open` của gian hàng đang hiển thị (chủ còn hạn phí).
 * Index `(status, updated_at desc, id)` / `(status, province, field, updated_at desc)`.
 */
export const visibleNeed = (now: Date): Prisma.NeedWhereInput => ({
  status: 'open',
  store: visibleStore(now),
});

@Injectable()
export class NeedExploreRepository {
  constructor(private readonly prisma: PrismaService) {}

  private where(f: NeedListQuery, now: Date): Prisma.NeedWhereInput {
    const and: Prisma.NeedWhereInput[] = [visibleNeed(now)];
    if (f.type) and.push({ type: f.type });
    if (f.province) and.push({ province: f.province });
    if (f.field) and.push({ field: f.field });
    if (f.q) {
      const q = { contains: f.q, mode: 'insensitive' as const };
      and.push({
        OR: [
          { title: q },
          { description: q },
          { field: q },
          { province: q },
          { ward: q },
          { store: { name: q } },
        ],
      });
    }
    return { AND: and };
  }

  /** Deferred join: trang id theo index sắp xếp, rồi lấy đủ cột cho đúng N dòng */
  async page(f: NeedListQuery, now: Date): Promise<{ rows: NeedRow[]; total: number }> {
    const where = this.where(f, now);
    const [ids, total] = await Promise.all([
      this.prisma.db.need.findMany({
        where,
        select: { id: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (f.page - 1) * NEED_PAGE_SIZE,
        take: NEED_PAGE_SIZE,
      }),
      this.prisma.db.need.count({ where }),
    ]);
    if (!ids.length) return { rows: [], total };
    const rows = await this.prisma.db.need.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: NEED_SELECT,
    });
    const at = new Map(rows.map((r) => [r.id, r]));
    return { rows: ids.flatMap((r) => at.get(r.id) ?? []), total };
  }

  /** Số đếm trên toàn bộ nhu cầu đang mở — service cache Redis 60 s */
  async facets(now: Date): Promise<NeedFacets> {
    const where = visibleNeed(now);
    const db = this.prisma.db;
    const [total, type, province, field] = await Promise.all([
      db.need.count({ where }),
      db.need.groupBy({ by: ['type'], where, _count: { _all: true } }),
      db.need.groupBy({ by: ['province'], where, _count: { _all: true } }),
      db.need.groupBy({ by: ['field'], where, _count: { _all: true } }),
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
      type: facet(type, 'type'),
      province: facet(province, 'province'),
      field: facet(field, 'field'),
    };
  }

  /**
   * Gợi ý cả trang trong MỘT truy vấn: đếm gian hàng hiển thị theo `(field, province)` cho các ngành
   * của trang; mỗi nhu cầu trừ gian hàng của chính nó (nếu cùng ngành) rồi ưu tiên cùng tỉnh.
   */
  async suggestions(rows: NeedRow[], now: Date): Promise<Map<string, NeedSuggestion | null>> {
    const fields = [...new Set(rows.map((r) => r.field))];
    const out = new Map<string, NeedSuggestion | null>();
    if (!fields.length) return out;
    const [groups, own] = await Promise.all([
      this.prisma.db.store.groupBy({
        by: ['field', 'province'],
        where: { AND: [visibleStore(now), { field: { in: fields } }] },
        _count: { _all: true },
      }),
      this.prisma.db.store.findMany({
        where: { AND: [visibleStore(now), { id: { in: rows.map((r) => r.storeId) } }] },
        select: { id: true, field: true, province: true },
      }),
    ]);
    const self = new Map(own.map((s) => [s.id, s]));
    for (const r of rows) {
      const me = self.get(r.storeId);
      const minus = (prov?: string) =>
        me && me.field === r.field && (prov === undefined || me.province === prov) ? 1 : 0;
      const of = groups.filter((g) => g.field === r.field);
      const all = of.reduce((a, g) => a + g._count._all, 0) - minus();
      const local =
        (of.find((g) => g.province === r.province)?._count._all ?? 0) - minus(r.province);
      out.set(
        r.id,
        all <= 0
          ? null
          : local > 0
            ? { count: local, sameProvince: true }
            : { count: all, sameProvince: false },
      );
    }
    return out;
  }

  /** Khối "Đang cần" ở chi tiết gian hàng — index `(store_id, status)` */
  async ofStore(storeId: string): Promise<StoreNeed[]> {
    const rows = await this.prisma.db.need.findMany({
      where: { storeId, status: 'open' },
      select: STORE_NEED_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: NEED_STORE_MAX,
    });
    return rows.map(toStoreNeed);
  }

  /** Badge "Đang tìm đối tác" cho cả trang Khám phá — một truy vấn */
  async seeking(storeIds: readonly string[]): Promise<Set<string>> {
    if (!storeIds.length) return new Set();
    const rows = await this.prisma.db.need.groupBy({
      by: ['storeId'],
      where: { storeId: { in: [...storeIds] }, status: 'open' },
    });
    return new Set(rows.map((r) => r.storeId));
  }
}
