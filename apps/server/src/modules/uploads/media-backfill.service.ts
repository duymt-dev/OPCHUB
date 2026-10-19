import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { StorageProvider } from '@opchub/integrations';
import type { UploadKind } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { STORAGE } from '@/common/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IMAGE_MAX_BYTES } from './image-ref.service';

const BATCH = 50;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Cột ảnh còn có thể chứa data URL (TD-014) — tên bảng/cột là hằng, không từ input */
const TARGETS = [
  { table: 'groups', column: 'cover_url', kind: 'group-cover' },
  { table: 'events', column: 'cover_url', kind: 'event-cover' },
  { table: 'projects', column: 'cover_url', kind: 'project-cover' },
  { table: 'project_members', column: 'avatar_url', kind: 'team-avatar' },
  { table: 'personas', column: 'avatar_url', kind: 'persona-avatar' },
] as const satisfies readonly { table: string; column: string; kind: UploadKind }[];

type Target = (typeof TARGETS)[number];

export interface BackfillStats {
  /** Số ô đã chuyển sang storage */
  moved: number;
  /** Số ô data URL hỏng → NULL (ảnh mặc định NA-26) */
  nulled: number;
  /** Logo `app_settings.general` đã đổi — caller xoá cache `general` */
  logoChanged: boolean;
}

interface Decoded {
  body: Buffer;
  contentType: string;
}

/** Giải mã + kiểm như NA-26 (JPG/PNG/WebP ≤ 5 MB); sai → null */
export function decodeDataUrl(url: string): Decoded | null {
  const m = DATA_URL.exec(url);
  if (!m?.[1] || !m[2]) return null;
  const body = Buffer.from(m[2], 'base64');
  if (body.length === 0 || body.length > IMAGE_MAX_BYTES) return null;
  return { body, contentType: m[1] };
}

/**
 * TD-014: chuyển ảnh data URL cũ trong DB sang storage. Keyset theo id, lô 50; `UPDATE` có điều kiện
 * (`WHERE id = $1 AND <cột> = $old`) nên chạy lại / chạy song song an toàn. Storage gọi ngoài
 * transaction (luật 9). Chạy một lần lúc worker khởi động (`MediaBackfillProcessor`).
 */
@Injectable()
export class MediaBackfillService {
  private readonly logger = new Logger(MediaBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: StorageProvider,
  ) {}

  async run(): Promise<BackfillStats> {
    const stats: BackfillStats = { moved: 0, nulled: 0, logoChanged: false };
    for (const t of TARGETS) await this.column(t, stats);
    await this.logo(stats);
    if (stats.moved || stats.nulled) this.logger.log(stats, 'Đã chuyển ảnh data URL sang storage');
    return stats;
  }

  private async column(t: Target, stats: BackfillStats): Promise<void> {
    const table = Prisma.raw(`"${t.table}"`);
    const col = Prisma.raw(`"${t.column}"`);
    let last = '';
    for (;;) {
      const rows = await this.prisma.db.$queryRaw<{ id: string; url: string }[]>`
        SELECT id, ${col} AS url FROM ${table}
        WHERE ${col} LIKE 'data:%' AND id > ${last}
        ORDER BY id LIMIT ${BATCH}`;
      for (const r of rows) {
        const next = await this.store(t.kind, r.url, `${t.table}.${t.column}#${r.id}`);
        const n = await this.prisma.db.$executeRaw`
          UPDATE ${table} SET ${col} = ${next} WHERE id = ${r.id} AND ${col} = ${r.url}`;
        this.count(stats, next, n);
      }
      const tail = rows.at(-1);
      if (!tail || rows.length < BATCH) return;
      last = tail.id;
    }
  }

  private async logo(stats: BackfillStats): Promise<void> {
    const rows = await this.prisma.db.$queryRaw<{ url: string }[]>`
      SELECT value->>'logoUrl' AS url FROM app_settings
      WHERE key = 'general' AND value->>'logoUrl' LIKE 'data:%'`;
    const old = rows[0]?.url;
    if (!old) return;
    const next = await this.store('platform-logo', old, 'app_settings.general.logoUrl');
    const n = await this.prisma.db.$executeRaw`
      UPDATE app_settings
      SET value = jsonb_set(value, '{logoUrl}', to_jsonb(${next}::text)), updated_at = now()
      WHERE key = 'general' AND value->>'logoUrl' = ${old}`;
    this.count(stats, next, n);
    if (n > 0) stats.logoChanged = true;
  }

  /** Ghi object `${kind}/system/<uuid>.<ext>` → URL công khai; hỏng → null */
  private async store(kind: UploadKind, url: string, where: string): Promise<string | null> {
    const d = decodeDataUrl(url);
    if (!d) {
      this.logger.warn({ where }, 'Data URL ảnh hỏng — đặt NULL (ảnh mặc định)');
      return null;
    }
    const key = `${kind}/system/${randomUUID()}.${EXT[d.contentType] ?? 'bin'}`;
    await this.storage.put(key, d.body, d.contentType);
    return this.storage.publicUrl(key);
  }

  private count(stats: BackfillStats, next: string | null, updated: number): void {
    if (updated === 0) return; // bản ghi đã đổi bởi người khác — bỏ qua (idempotent)
    if (next) stats.moved += updated;
    else stats.nulled += updated;
  }
}
