import { StorePublicService } from './store-public.service';
import { Injectable } from '@nestjs/common';
import {
  ADMIN_STORE_PAGE_SIZE,
  type AdminStore,
  type AdminStoreFilter,
  type AdminStoreList,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toAdminStore } from '../domain/store.mapper';
import { StoreRepository } from '../repositories/store.repository';
import { StoreExploreService } from './store-explore.service';

export interface Actor {
  id: string;
  ip: string | null;
}

/** Admin › Gian hàng (AD-07, AT-07): danh sách + KPI, ẩn / hiện hàng loạt — không duyệt trước */
@Injectable()
export class StoreAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StoreRepository,
    private readonly audit: AuditService,
    private readonly explore: StoreExploreService,
    private readonly publicPage: StorePublicService,
  ) {}

  async list(
    status: AdminStoreFilter,
    q: string | undefined,
    page: number,
  ): Promise<AdminStoreList> {
    const [{ rows, total }, summary] = await Promise.all([
      this.repo.adminPage(status, q, page),
      this.repo.summary(q),
    ]);
    return { items: rows.map(toAdminStore), page, size: ADMIN_STORE_PAGE_SIZE, total, summary };
  }

  async detail(id: string): Promise<AdminStore> {
    const rows = await this.repo.adminPageById(id);
    if (!rows) throw notFound('Không tìm thấy gian hàng');
    return toAdminStore(rows);
  }

  /** Ẩn / hiện: đổi có điều kiện + audit từng gian hàng cùng transaction (luật 7, 10) */
  async moderate(actor: Actor, action: 'hide' | 'show', ids: string[], reason?: string) {
    const changed = await this.prisma.db.$transaction(async (tx) => {
      const done =
        action === 'hide'
          ? await this.repo.hide(tx, ids, actor.id, reason ?? null)
          : await this.repo.show(tx, ids);
      const names = new Map((await this.repo.names(tx, done)).map((r) => [r.id, r.name]));
      await this.audit.logMany(
        tx,
        done.map((id) => ({
          actorId: actor.id,
          action: `store.${action}`,
          entity: 'store',
          entityId: id,
          tag: 'moderation' as const,
          summary: `${action === 'hide' ? 'Ẩn' : 'Hiển thị lại'} gian hàng ${names.get(id) ?? ''}${
            reason ? ` · ${reason}` : ''
          }`,
          ip: actor.ip,
        })),
      );
      return done.length;
    });
    if (changed) {
      await this.explore.invalidate();
      await this.publicPage.invalidateStores(ids);
    }
    return { changed };
  }

  /** D-89 (P-105): gắn / gỡ "Nổi bật" — cập nhật có điều kiện + audit cùng transaction */
  async feature(actor: Actor, id: string, featured: boolean): Promise<AdminStore> {
    await this.prisma.db.$transaction(async (tx) => {
      const r = await tx.store.updateMany({
        where: { id, featuredAt: featured ? null : { not: null } },
        data: { featuredAt: featured ? new Date() : null },
      });
      if (!r.count) return;
      const [row] = await this.repo.names(tx, [id]);
      await this.audit.logMany(tx, [
        {
          actorId: actor.id,
          action: featured ? 'store.feature' : 'store.unfeature',
          entity: 'store',
          entityId: id,
          tag: 'moderation' as const,
          summary: `${featured ? 'Gắn' : 'Gỡ'} "Nổi bật" gian hàng ${row?.name ?? ''}`,
          ip: actor.ip,
        },
      ]);
    });
    return this.detail(id);
  }
}
