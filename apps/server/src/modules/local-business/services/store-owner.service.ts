import { StorePublicService } from './store-public.service';
import { Injectable } from '@nestjs/common';
import type { StoreOwner } from '../domain/store-owner.types';
export type { StoreOwner } from '../domain/store-owner.types';
import {
  firstStoreNeed,
  type StoreDetail,
  type StoreNeedInput,
  STORE_NEED_MESSAGES,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { AppError, conflict, forbidden, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaGcService } from '../../uploads';
import { BUSINESS_ONLY, HIDDEN_BY_ADMIN, NO_STORE_YET } from '../domain/store-status';
import { type StoreDetailRow, toStoreBuilder, toStoreDetail } from '../domain/store.mapper';
import { NeedExploreRepository } from '../repositories/need-explore.repository';
import { StoreRepository } from '../repositories/store.repository';
import { StoreExploreService } from './store-explore.service';
import { StoreMediaService, storeMediaUrls } from './store-media.service';

const PROVINCES = new Set(provinces.map(([name]) => name));
const FIELDS = new Set<string>(STORE_FIELDS);

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

/** D-97: bước đầu tiên chưa đủ → 400 câu lỗi prototype, `path` `step.N` (Portal nhảy về bước đó) */
function assertSteps(s: StoreNeedInput): void {
  const n = firstStoreNeed(s);
  if (n) throw invalid(`step.${n.step}`, STORE_NEED_MESSAGES[n.key]);
}

/**
 * Gian hàng của tôi (UT-09, D-97): trình tạo 5 bước, Xuất bản / về nháp — không qua duyệt (D-75).
 * D-114 S8: gian hàng đang hiển thị "Lưu thay đổi" giữ hiển thị nên phải đủ 5 bước như Xuất bản.
 */
@Injectable()
export class StoreOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StoreRepository,
    private readonly media: StoreMediaService,
    private readonly gc: MediaGcService,
    private readonly explore: StoreExploreService,
    private readonly publicPage: StorePublicService,
    private readonly outbox: OutboxService,
    private readonly needs: NeedExploreRepository,
  ) {}

  private async own(u: StoreOwner): Promise<StoreDetailRow> {
    if (u.accountType !== 'business') throw forbidden(BUSINESS_ONLY);
    const r = await this.repo.mine(u.id);
    if (!r) throw notFound(NO_STORE_YET);
    return r;
  }

  async mine(u: StoreOwner): Promise<StoreDetail> {
    const r = await this.own(u);
    return toStoreDetail(r, u.id, await this.needs.ofStore(r.id));
  }

  async save(u: StoreOwner, input: StoreUpsert): Promise<StoreDetail> {
    const cur = await this.own(u);
    if (input.field && !FIELDS.has(input.field)) throw invalid('field', 'Ngành nghề không hợp lệ');
    if (input.province && !PROVINCES.has(input.province))
      throw invalid('province', 'Tỉnh / thành không hợp lệ');
    if (cur.status === 'published') assertSteps(input);
    // Media kiểm NGOÀI transaction (luật 9): object của chính người gọi, hoặc giữ nguyên media cũ
    const next = await this.media.resolve(u.id, input, cur);
    const kept = new Set(next.mediaUrls);
    const old = storeMediaUrls({
      ...toStoreBuilder(cur),
      coverUrl: cur.coverUrl,
      items: cur.items,
    });
    const removed = old.filter((x) => !kept.has(x));
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.replace(tx, cur.id, next);
      await this.gc.enqueueRemoved(tx, removed, 'store-media');
    });
    await this.publicPage.invalidate(cur.slug);
    if (cur.status === 'published') await this.explore.invalidate();
    return this.mine(u);
  }

  async publish(u: StoreOwner): Promise<StoreDetail> {
    const cur = await this.own(u);
    if (cur.status === 'hidden') throw conflict(HIDDEN_BY_ADMIN);
    assertSteps(cur);
    if (cur.status === 'draft') {
      const at = new Date();
      const ok = await this.prisma.db.$transaction(async (tx) => {
        if (!(await this.repo.step(tx, cur.id, 'publish', at))) return false;
        await this.outbox.add(tx, 'store.published', {
          storeId: cur.id,
          ownerId: u.id,
          publishedAt: at.toISOString(),
        });
        return true;
      });
      if (!ok) throw conflict('Gian hàng đã thay đổi, vui lòng tải lại');
      await this.explore.invalidate();
      await this.publicPage.invalidate(cur.slug);
    }
    return this.mine(u);
  }

  async unpublish(u: StoreOwner): Promise<StoreDetail> {
    const cur = await this.own(u);
    if (cur.status === 'hidden') throw conflict(HIDDEN_BY_ADMIN);
    if (cur.status === 'published') {
      await this.prisma.db.$transaction((tx) =>
        this.repo.step(tx, cur.id, 'unpublish', new Date()),
      );
      await this.explore.invalidate();
      await this.publicPage.invalidate(cur.slug);
    }
    return this.mine(u);
  }
}
