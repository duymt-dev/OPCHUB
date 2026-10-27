import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import {
  type AdminCategory,
  CATEGORY_SCOPES,
  type CategoryScope,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import type { categoryUpsertSchema } from '@opchub/shared/api-domains';
import { type AuditEntry, AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { AdminActor } from './admin-actor';

type CategoryInput = z.output<typeof categoryUpsertSchema>;

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  scopes: string[];
  hidden: boolean;
  project_count: number;
  biz_count: number;
}

const NOT_FOUND = 'Không tìm thấy lĩnh vực';
const DUPLICATE = 'Lĩnh vực đã tồn tại';
const isScope = (s: string): s is CategoryScope =>
  (CATEGORY_SCOPES as readonly string[]).includes(s);

const toDto = (r: CategoryRow): AdminCategory => ({
  id: r.id,
  name: r.name,
  color: r.color,
  scope: r.scopes.filter(isScope),
  enabled: !r.hidden,
  projectCount: r.project_count,
  bizCount: r.biz_count,
});

/** Danh mục lĩnh vực (`s.cfg`). BR-11: đang dùng thì chỉ ẩn, không xoá */
@Injectable()
export class CategoryAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Số dự án (projects_category_live) + doanh nghiệp (business_profiles_main_field) — bảng
   * lĩnh vực nhỏ (≤ 200), mỗi dòng 2 subquery dùng index.
   */
  private rows(id?: string) {
    return this.prisma.db.$queryRaw<CategoryRow[]>`
      SELECT c.id, c.name, c.color, c.scopes, c.hidden,
        (SELECT count(*)::int FROM projects p WHERE p.category_id = c.id AND p.deleted_at IS NULL)
          AS project_count,
        (SELECT count(*)::int FROM business_profiles b WHERE b.main_field = c.name) AS biz_count
      FROM categories c
      WHERE c.deleted_at IS NULL ${id ? Prisma.sql`AND c.id = ${id}` : Prisma.empty}
      ORDER BY c.sort, c.name`;
  }

  async list(): Promise<{ items: AdminCategory[] }> {
    return { items: (await this.rows()).map(toDto) };
  }

  private async one(id: string): Promise<AdminCategory> {
    const [r] = await this.rows(id);
    if (!r) throw notFound(NOT_FOUND);
    return toDto(r);
  }

  private async clash(name: string, exceptId: string | null): Promise<boolean> {
    const r = await this.prisma.db.category.findFirst({
      where: { name, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    return r !== null;
  }

  async create(actor: AdminActor, input: CategoryInput): Promise<AdminCategory> {
    if (await this.clash(input.name, null)) throw conflict(DUPLICATE);
    const id = await this.prisma.db.$transaction(async (tx) => {
      const max = await tx.category.aggregate({ _max: { sort: true } });
      const c = await tx.category.create({
        data: {
          name: input.name,
          color: input.color,
          scopes: input.scope,
          hidden: !input.enabled,
          sort: (max._max.sort ?? 0) + 1,
        },
        select: { id: true },
      });
      await this.audit.log(
        tx,
        this.entry(actor, 'category.create', c.id, `thêm lĩnh vực ${input.name}`),
      );
      return c.id;
    });
    return this.one(id);
  }

  async update(actor: AdminActor, id: string, input: CategoryInput): Promise<AdminCategory> {
    if (await this.clash(input.name, id)) throw conflict(DUPLICATE);
    await this.prisma.db.$transaction(async (tx) => {
      const r = await tx.category.updateMany({
        where: { id, deletedAt: null },
        data: { name: input.name, color: input.color, scopes: input.scope, hidden: !input.enabled },
      });
      if (!r.count) throw notFound(NOT_FOUND);
      await this.audit.log(
        tx,
        this.entry(actor, 'category.update', id, `cập nhật lĩnh vực ${input.name}`),
      );
    });
    return this.one(id);
  }

  async toggle(actor: AdminActor, id: string, enabled: boolean): Promise<AdminCategory> {
    await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.category.updateManyAndReturn({
        where: { id, deletedAt: null },
        data: { hidden: !enabled },
        select: { name: true },
      });
      const name = rows[0]?.name;
      if (!name) throw notFound(NOT_FOUND);
      await this.audit.log(
        tx,
        this.entry(actor, 'category.toggle', id, `${enabled ? 'hiện' : 'ẩn'} lĩnh vực ${name}`),
      );
    });
    return this.one(id);
  }

  /** Xoá mềm khi chưa dùng (đổi tên để giải phóng UQ tên) */
  async remove(actor: AdminActor, id: string): Promise<{ id: string }> {
    const c = await this.one(id);
    if (c.projectCount + c.bizCount > 0) {
      throw conflict('Lĩnh vực đang được sử dụng – hãy ẩn thay vì xoá');
    }
    await this.prisma.db.$transaction(async (tx) => {
      const r = await tx.category.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), name: `${c.name}#${id}` },
      });
      if (!r.count) throw notFound(NOT_FOUND);
      await this.audit.log(tx, this.entry(actor, 'category.delete', id, `xoá lĩnh vực ${c.name}`));
    });
    return { id };
  }

  /** Thứ tự mới phải đủ đúng tập lĩnh vực hiện có — 1 câu UPDATE … FROM unnest */
  async reorder(actor: AdminActor, ids: string[]): Promise<AdminCategory[]> {
    const live = await this.prisma.db.category.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const want = new Set(ids);
    if (
      want.size !== ids.length ||
      live.length !== ids.length ||
      live.some((c) => !want.has(c.id))
    ) {
      throw conflict('Danh sách lĩnh vực đã thay đổi, tải lại trang');
    }
    await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE categories c SET sort = o.ord, updated_at = now()
        FROM unnest(${ids}::text[]) WITH ORDINALITY AS o(id, ord)
        WHERE c.id = o.id`;
      await this.audit.log(
        tx,
        this.entry(actor, 'category.reorder', 'categories', 'sắp xếp lại danh mục lĩnh vực'),
      );
    });
    return (await this.list()).items;
  }

  private entry(actor: AdminActor, action: string, entityId: string, summary: string): AuditEntry {
    return {
      actorId: actor.id,
      action,
      entity: 'category',
      entityId,
      tag: 'content',
      summary: summary.slice(0, 500),
      ip: actor.ip,
    };
  }
}
