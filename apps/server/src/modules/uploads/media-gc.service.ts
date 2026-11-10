import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { StorageProvider } from '@opchub/integrations';
import { STORAGE } from '@/common/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Ân hạn trước khi xoá object (cache/CDN, tab cũ còn hiển thị) */
export const GC_GRACE_MS = 24 * 3_600_000;
const BATCH = 500;

/**
 * Khoá storage của URL nếu là ảnh do hệ thống lưu (bắt đầu bằng `publicUrl('')`); data URL / URL
 * ngoài → null. Thuần, để unit test.
 */
export function storageKeyOf(url: string | null | undefined, base: string): string | null {
  if (!url || !base || !url.startsWith(base)) return null;
  const key = url.slice(base.length);
  return key && !key.includes('..') && !/[?#]/.test(key) ? key : null;
}

/**
 * NA-26 + NA-13: ảnh bị thay được dọn theo hàng `storage_gc`. Domain đổi ảnh gọi
 * `enqueueReplaced(tx, cũ, mới)` TRONG transaction cập nhật (luật 8); job 02:00 gọi `sweep` — xoá
 * object quá ân hạn 24h và không còn được bản ghi nào tham chiếu (1 query cho cả lô).
 */
@Injectable()
export class MediaGcService {
  private readonly logger = new Logger(MediaGcService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: StorageProvider,
  ) {}

  /** Chỉ enqueue khi ảnh cũ là object storage và khác ảnh mới */
  async enqueueReplaced(
    tx: DbTx,
    prev: string | null | undefined,
    next: string | null | undefined,
    reason: string,
  ): Promise<void> {
    if (!prev || prev === next) return;
    const key = storageKeyOf(prev, this.storage.publicUrl(''));
    if (!key) return;
    await tx.storageGc.upsert({
      where: { key },
      create: { key, reason },
      update: { reason, enqueuedAt: new Date() },
    });
  }

  /** Nhiều URL bị gỡ cùng lúc (media gian hàng) — một câu INSERT; URL ngoài storage bỏ qua */
  async enqueueRemoved(tx: DbTx, urls: readonly string[], reason: string): Promise<void> {
    const base = this.storage.publicUrl('');
    const keys = [...new Set(urls.flatMap((u) => storageKeyOf(u, base) ?? []))];
    if (!keys.length) return;
    await tx.storageGc.createMany({
      data: keys.map((key) => ({ key, reason })),
      skipDuplicates: true,
    });
  }

  /** Trả số object đã xoá. Lỗi storage một object → giữ dòng, lần sau thử lại */
  async sweep(now = new Date()): Promise<number> {
    const base = this.storage.publicUrl('');
    let removed = 0;
    let after = '';
    for (;;) {
      const rows = await this.prisma.db.storageGc.findMany({
        where: { enqueuedAt: { lt: new Date(now.getTime() - GC_GRACE_MS) }, key: { gt: after } },
        orderBy: { key: 'asc' },
        take: BATCH,
        select: { key: true },
      });
      if (!rows.length) return removed;
      after = rows.at(-1)?.key ?? after;
      const keys = rows.map((r) => r.key);
      const inUse = await this.stillReferenced(keys.map((k) => `${base}${k}`));
      const used = keys.filter((k) => inUse.has(`${base}${k}`));
      if (used.length) await this.prisma.db.storageGc.deleteMany({ where: { key: { in: used } } });
      for (const key of keys.filter((k) => !inUse.has(`${base}${k}`))) {
        try {
          await this.storage.delete(key);
          await this.prisma.db.storageGc.delete({ where: { key } });
          removed += 1;
        } catch (err) {
          this.logger.warn({ err, key }, 'Không xoá được ảnh cũ — thử lại lần sau');
        }
      }
    }
  }

  /**
   * URL còn ở bất kỳ cột ảnh nào (avatar, bìa, đội ngũ, persona, logo, media gian hàng `media_urls`
   * qua GIN `&&`) — 1 query UNION ALL
   */
  private async stillReferenced(urls: string[]): Promise<Set<string>> {
    const rows = await this.prisma.db.$queryRaw<{ url: string }[]>`
      SELECT avatar_url AS url FROM users WHERE avatar_url = ANY(${urls})
      UNION ALL SELECT avatar_url FROM admin_users WHERE avatar_url = ANY(${urls})
      UNION ALL SELECT cover_url FROM groups WHERE cover_url = ANY(${urls})
      UNION ALL SELECT cover_url FROM events WHERE cover_url = ANY(${urls})
      UNION ALL SELECT cover_url FROM projects WHERE cover_url = ANY(${urls})
      UNION ALL SELECT avatar_url FROM project_members WHERE avatar_url = ANY(${urls})
      UNION ALL SELECT avatar_url FROM personas WHERE avatar_url = ANY(${urls})
      UNION ALL SELECT value->>'logoUrl' FROM app_settings WHERE value->>'logoUrl' = ANY(${urls})
      UNION ALL SELECT u FROM stores, unnest(media_urls) u
        WHERE media_urls && ${urls}::text[] AND u = ANY(${urls})`;
    return new Set(rows.map((r) => r.url));
  }
}
