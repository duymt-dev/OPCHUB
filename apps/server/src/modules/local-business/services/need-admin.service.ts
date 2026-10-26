import { Injectable } from '@nestjs/common';
import {
  ADMIN_NEED_PAGE_SIZE,
  type AdminNeedFilter,
  type AdminNeedList,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toAdminNeed } from '../domain/need.mapper';
import { NeedRepository } from '../repositories/need.repository';
import { NeedExploreService } from './need-explore.service';
import type { Actor } from './store-admin.service';

/** Admin › Nhu cầu (AD-07): danh sách + KPI, ẩn / hiện hàng loạt — không duyệt trước */
@Injectable()
export class NeedAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: NeedRepository,
    private readonly audit: AuditService,
    private readonly explore: NeedExploreService,
  ) {}

  async list(status: AdminNeedFilter, q: string | undefined, page: number): Promise<AdminNeedList> {
    const [{ rows, total }, summary] = await Promise.all([
      this.repo.adminPage(status, q, page),
      this.repo.summary(q),
    ]);
    return { items: rows.map(toAdminNeed), page, size: ADMIN_NEED_PAGE_SIZE, total, summary };
  }

  /** Ẩn / hiện: đổi có điều kiện + audit từng nhu cầu cùng transaction (luật 7, 10) */
  async moderate(actor: Actor, action: 'hide' | 'show', ids: string[], reason?: string) {
    const changed = await this.prisma.db.$transaction(async (tx) => {
      const done =
        action === 'hide'
          ? await this.repo.hide(tx, ids, actor.id, reason ?? null)
          : await this.repo.show(tx, ids);
      const titles = new Map((await this.repo.titles(tx, done)).map((r) => [r.id, r.title]));
      await this.audit.logMany(
        tx,
        done.map((id) => ({
          actorId: actor.id,
          action: `need.${action}`,
          entity: 'need',
          entityId: id,
          tag: 'moderation' as const,
          summary: `${action === 'hide' ? 'Ẩn' : 'Hiển thị lại'} nhu cầu ${titles.get(id) ?? ''}${
            reason ? ` · ${reason}` : ''
          }`,
          ip: actor.ip,
        })),
      );
      return done.length;
    });
    if (changed) await this.explore.invalidate();
    return { changed };
  }
}
