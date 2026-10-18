import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRichHtml, toPlainText } from './sanitize';

const BATCH = 200;

type Mode = 'rich' | 'plain';

interface Target {
  table: string;
  /** Khoá chính (keyset) — `service_requests` dùng `code` */
  key: string;
  column: string;
  mode: Mode;
}

/** TD-017: cột nội dung người dùng có thể còn HTML bẩn — tên bảng/cột là hằng, không từ input */
export const HTML_BACKFILL_TARGETS: readonly Target[] = [
  { table: 'projects', key: 'id', column: 'description_html', mode: 'rich' },
  { table: 'projects', key: 'id', column: 'review_note', mode: 'rich' },
  { table: 'events', key: 'id', column: 'description', mode: 'rich' },
  { table: 'service_requests', key: 'code', column: 'note', mode: 'rich' },
  { table: 'service_request_comments', key: 'id', column: 'body', mode: 'rich' },
  { table: 'campaigns', key: 'id', column: 'body_html', mode: 'rich' },
  { table: 'project_comments', key: 'id', column: 'body', mode: 'plain' },
  { table: 'messages', key: 'id', column: 'body', mode: 'plain' },
  { table: 'investor_interests', key: 'id', column: 'message', mode: 'plain' },
];

export type HtmlBackfillStats = Record<string, number>;

const clean = (mode: Mode, v: string) => (mode === 'rich' ? sanitizeRichHtml(v) : toPlainText(v));

/**
 * TD-017: làm sạch dữ liệu đã lưu trước NA-27. Keyset theo khoá chính, lô 200; chỉ xét ô có `<`
 * (ô không có thẻ thì kết quả không đổi). `UPDATE … WHERE <khoá> = $1 AND <cột> = $old` chỉ khi
 * khác bản gốc → chạy lại/song song an toàn, lần 2 cập nhật 0 dòng. Gọi lúc worker khởi động.
 */
@Injectable()
export class HtmlBackfillService {
  private readonly logger = new Logger(HtmlBackfillService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<HtmlBackfillStats> {
    const stats: HtmlBackfillStats = {};
    for (const t of HTML_BACKFILL_TARGETS) {
      const n = await this.column(t);
      if (n) stats[`${t.table}.${t.column}`] = n;
    }
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    this.logger.log({ total, ...stats }, 'Làm sạch HTML dữ liệu cũ (TD-017)');
    return stats;
  }

  private async column(t: Target): Promise<number> {
    const table = Prisma.raw(`"${t.table}"`);
    const key = Prisma.raw(`"${t.key}"`);
    const col = Prisma.raw(`"${t.column}"`);
    let last = '';
    let updated = 0;
    for (;;) {
      const rows = await this.prisma.db.$queryRaw<{ k: string; v: string }[]>`
        SELECT ${key} AS k, ${col} AS v FROM ${table}
        WHERE ${key} > ${last} AND ${col} LIKE '%<%'
        ORDER BY ${key} LIMIT ${BATCH}`;
      const dirty = rows.flatMap((r) => {
        const next = clean(t.mode, r.v);
        return next === r.v ? [] : [{ k: r.k, old: r.v, next }];
      });
      if (dirty.length) updated += await this.updateBatch(table, key, col, dirty);
      const tail = rows.at(-1);
      if (!tail || rows.length < BATCH) return updated;
      last = tail.k;
    }
  }

  /** Một UPDATE cho cả lô (luật 5) — điều kiện giá trị cũ giữ tính idempotent */
  private updateBatch(
    table: Prisma.Sql,
    key: Prisma.Sql,
    col: Prisma.Sql,
    dirty: { k: string; old: string; next: string }[],
  ): Promise<number> {
    const keys = dirty.map((d) => d.k);
    const olds = dirty.map((d) => d.old);
    const nexts = dirty.map((d) => d.next);
    return this.prisma.db.$executeRaw`
      UPDATE ${table} AS t SET ${col} = d.next
      FROM unnest(${keys}::text[], ${olds}::text[], ${nexts}::text[]) AS d(k, old, next)
      WHERE t.${key} = d.k AND t.${col} = d.old`;
  }
}
