import { Injectable } from '@nestjs/common';
import {
  isStockCover,
  type StoreDoc,
  type StoreUpsert,
  type StoreVideo,
  type UploadKind,
} from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { ImageRefService, StoreFileRefService } from '../../uploads';
import type { StoreDetailRow } from '../domain/store.mapper';
import { toStoreBuilder } from '../domain/store.mapper';

export type ResolvedStore = StoreUpsert & { mediaUrls: string[] };

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

/** Mọi URL object storage của gian hàng (bìa, ảnh SP, logo, ảnh, video, đội ngũ, chứng nhận, tài liệu) */
export function storeMediaUrls(s: {
  coverUrl: string | null;
  items: readonly { imageUrl: string | null }[];
  logos: readonly string[];
  covers: readonly string[];
  gallery: readonly string[];
  videos: readonly StoreVideo[];
  team: readonly { photoUrl: string | null }[];
  certs: readonly { imageUrl: string }[];
  docs: readonly StoreDoc[];
}): string[] {
  const all = [
    s.coverUrl,
    ...s.items.map((i) => i.imageUrl),
    ...s.logos,
    ...s.covers,
    ...s.gallery,
    ...s.videos.map((v) => v.url),
    ...s.team.map((t) => t.photoUrl),
    ...s.certs.map((c) => c.imageUrl),
    ...s.docs.map((d) => d.url),
  ];
  return [...new Set(all.filter((u): u is string => !!u && !isStockCover(u)))];
}

/**
 * TIP-V42-710 (D-97, D-114 S5): kiểm media của PUT /me/store NGOÀI transaction (luật 9). URL đã có trong
 * gian hàng giữ nguyên; URL mới phải là object của chính chủ theo kind (ảnh: `head` + MIME ≤ 5 MB; video /
 * tài liệu: + chữ ký byte đầu). Ảnh bìa chọn trong ảnh đã tải hoặc 6 ảnh mẫu; logo chọn trong ảnh logo.
 * Kiểm `head` song song (gọi storage, không phải DB).
 */
@Injectable()
export class StoreMediaService {
  constructor(
    private readonly images: ImageRefService,
    private readonly files: StoreFileRefService,
  ) {}

  async resolve(userId: string, input: StoreUpsert, cur: StoreDetailRow): Promise<ResolvedStore> {
    const curB = toStoreBuilder(cur);
    const known = new Set(storeMediaUrls({ ...curB, coverUrl: cur.coverUrl, items: cur.items }));
    const img = (kind: UploadKind, path: string) => async (url: string) =>
      known.has(url) ? url : ((await this.images.resolve({ userId, kind, url, path })) ?? url);
    const urls = (list: readonly string[], kind: UploadKind, path: string) =>
      Promise.all(list.map((u, i) => img(kind, `${path}.${i}`)(u)));

    const [logos, covers, gallery, items, team, certs, videos, docs] = await Promise.all([
      urls(input.logos, 'store-logo', 'logos'),
      urls(input.covers, 'store-cover', 'covers'),
      urls(input.gallery, 'store-gallery', 'gallery'),
      Promise.all(
        input.items.map(async (it, i) => ({
          ...it,
          imageUrl: it.imageUrl
            ? await img('store-item', `items.${i}.imageUrl`)(it.imageUrl)
            : null,
        })),
      ),
      Promise.all(
        input.team.map(async (t, i) => ({
          ...t,
          photoUrl: t.photoUrl ? await img('store-team', `team.${i}.photoUrl`)(t.photoUrl) : null,
        })),
      ),
      Promise.all(
        input.certs.map(async (c, i) => ({
          ...c,
          imageUrl: await img('store-cert', `certs.${i}.imageUrl`)(c.imageUrl),
        })),
      ),
      Promise.all(input.videos.map((v, i) => this.video(userId, v, known, `videos.${i}.url`))),
      Promise.all(input.docs.map((d, i) => this.doc(userId, d, curB.docs, `docs.${i}.url`))),
    ]);
    const coverUrl = this.cover(input, covers, cur.coverUrl);
    if (input.logoUrl && !logos.includes(input.logoUrl))
      throw invalid('logoUrl', 'Ảnh đại diện không hợp lệ');
    const hiddenCovers = input.hiddenCovers.filter(isStockCover);
    const next = {
      ...input,
      ...{ coverUrl, logos, covers, hiddenCovers, gallery, items, team, certs, videos, docs },
    };
    return { ...next, mediaUrls: storeMediaUrls(next) };
  }

  /** Ảnh bìa: ảnh đã tải của gian hàng, 6 ảnh mẫu (D-97 `COVERS`), hoặc giữ ảnh đang dùng */
  private cover(input: StoreUpsert, covers: string[], current: string | null): string | null {
    const c = input.coverUrl?.trim() || null;
    if (!c || c === current || covers.includes(c) || isStockCover(c)) return c;
    throw invalid('coverUrl', 'Ảnh bìa không hợp lệ');
  }

  private async video(userId: string, v: StoreVideo, known: Set<string>, path: string) {
    if (known.has(v.url)) return v;
    const name = `${v.title || 'video'}.${v.url.split('.').pop() ?? ''}`;
    const f = await this.files.resolve({ userId, kind: 'store-video', url: v.url, name, path });
    return { url: f.url, title: v.title };
  }

  /** Tài liệu đã lưu giữ nguyên tên / đuôi / cỡ đã kiểm; tài liệu mới kiểm lại từ object */
  private async doc(userId: string, d: StoreDoc, saved: StoreDoc[], path: string) {
    const old = saved.find((x) => x.url === d.url);
    if (old) return old;
    const f = await this.files.resolve({
      userId,
      kind: 'store-doc',
      url: d.url,
      name: d.name,
      path,
    });
    return { url: f.url, name: f.name, ext: f.ext, size: f.size };
  }
}
