import { Injectable } from '@nestjs/common';
import type { AccountType } from '@opchub/shared';
import { canPublishStore, type StoreDetail, type StoreUpsert } from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { AppError, conflict, forbidden, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ImageRefService, MediaGcService } from '../../uploads';
import {
  BUSINESS_ONLY,
  HIDDEN_BY_ADMIN,
  NO_STORE_YET,
  PUBLISH_REQUIRED,
} from '../domain/store-status';
import { type StoreDetailRow, toStoreDetail } from '../domain/store.mapper';
import { StoreRepository } from '../repositories/store.repository';
import { StoreExploreService } from './store-explore.service';

const PROVINCES = new Set(provinces.map(([name]) => name));
const FIELDS = new Set<string>(STORE_FIELDS);

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

export interface StoreOwner {
  id: string;
  accountType: AccountType;
}

/** Gian hàng của tôi (UT-09): sửa, sản phẩm/dịch vụ, Xuất bản / về nháp — không qua duyệt (D-75) */
@Injectable()
export class StoreOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StoreRepository,
    private readonly images: ImageRefService,
    private readonly gc: MediaGcService,
    private readonly explore: StoreExploreService,
    private readonly outbox: OutboxService,
  ) {}

  private async own(u: StoreOwner): Promise<StoreDetailRow> {
    if (u.accountType !== 'business') throw forbidden(BUSINESS_ONLY);
    const r = await this.repo.mine(u.id);
    if (!r) throw notFound(NO_STORE_YET);
    return r;
  }

  async mine(u: StoreOwner): Promise<StoreDetail> {
    return toStoreDetail(await this.own(u), u.id);
  }

  async save(u: StoreOwner, input: StoreUpsert): Promise<StoreDetail> {
    const cur = await this.own(u);
    if (input.field && !FIELDS.has(input.field)) throw invalid('field', 'Ngành nghề không hợp lệ');
    if (input.province && !PROVINCES.has(input.province))
      throw invalid('province', 'Tỉnh / thành không hợp lệ');
    // Ảnh kiểm NGOÀI transaction (luật 9): object của chính người gọi, hoặc giữ nguyên ảnh cũ
    const oldItems = new Set(cur.items.flatMap((i) => (i.imageUrl ? [i.imageUrl] : [])));
    const coverUrl = await this.images.resolve({
      userId: u.id,
      kind: 'store-cover',
      url: input.coverUrl,
      current: cur.coverUrl,
      path: 'coverUrl',
    });
    const items = await Promise.all(
      input.items.map(async (it, i) => ({
        ...it,
        imageUrl:
          it.imageUrl && oldItems.has(it.imageUrl)
            ? it.imageUrl
            : await this.images.resolve({
                userId: u.id,
                kind: 'store-item',
                url: it.imageUrl,
                path: `items.${i}.imageUrl`,
              }),
      })),
    );
    const next = { ...input, coverUrl, items };
    const kept = new Set(items.flatMap((i) => (i.imageUrl ? [i.imageUrl] : [])));
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.replace(tx, cur.id, next);
      await this.gc.enqueueReplaced(tx, cur.coverUrl, coverUrl, 'store-cover');
      for (const old of oldItems) {
        if (!kept.has(old)) await this.gc.enqueueReplaced(tx, old, null, 'store-item');
      }
    });
    if (cur.status === 'published') await this.explore.invalidate();
    return this.mine(u);
  }

  async publish(u: StoreOwner): Promise<StoreDetail> {
    const cur = await this.own(u);
    if (cur.status === 'hidden') throw conflict(HIDDEN_BY_ADMIN);
    if (!canPublishStore(cur)) throw invalid('status', PUBLISH_REQUIRED);
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
    }
    return this.mine(u);
  }
}
