import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  encodeMyRegionAffiliateCursor,
  type MyRegionAffiliateQuery,
  type MyRegionAffiliateCursor,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { forbidden } from '@/common/errors';
import { csvSafeText, toCsv } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MyRegionProjectionRepository } from '@/modules/reporting';

const BATCH = 1000,
  CAP = 20_000;
@Injectable()
export class MyRegionAffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: MyRegionProjectionRepository,
    private readonly audit: AuditService,
  ) {}
  private async slot(tx: DbTx, userId: string) {
    const slot = await tx.regionalDirector.findFirst({
      where: { userId, user: { status: 'active', deletedAt: null } },
      select: { region: true },
    });
    if (!slot) throw forbidden('Chỉ Giám đốc Vùng đương nhiệm được xem danh sách');
    return slot;
  }
  page(userId: string, query: MyRegionAffiliateQuery) {
    return this.prisma.db.$transaction(
      async (tx) => {
        const slot = await this.slot(tx, userId);
        const rows = await this.projection.affiliates(
          tx,
          slot.region,
          userId,
          query.cursor,
          query.limit,
        );
        const last = rows.at(-1),
          more = Math.max(0, (rows[0]?.total ?? 0) - rows.length);
        return {
          items: rows.map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            province: r.province,
            customers: r.customers,
            revenue: Number(r.revenue),
            share: Number(r.share),
          })),
          more,
          nextCursor:
            more && last
              ? encodeMyRegionAffiliateCursor({
                  share: last.share.toString(),
                  name: last.name,
                  id: last.id,
                })
              : null,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async csv(userId: string, ip: string | null) {
    // Bounded keyset batches are the explicit export exception, not an N+1 row loop.
    const result = await this.prisma.db.$transaction(
      async (tx) => {
        const slot = await this.slot(tx, userId);
        let cursor: MyRegionAffiliateCursor | undefined,
          cut = false;
        const lines: (string | number)[][] = [];
        for (let n = 0; n < CAP / BATCH; n++) {
          const rows = await this.projection.affiliates(tx, slot.region, userId, cursor, BATCH);
          lines.push(
            ...rows.map((r) => [
              csvSafeText(r.name),
              csvSafeText(r.code),
              csvSafeText(r.province),
              r.customers,
              r.revenue.toString(),
              r.share.toString(),
            ]),
          );
          const last = rows.at(-1);
          if (!last || rows.length < BATCH || (rows[0]?.total ?? 0) <= rows.length) break;
          cursor = { share: last.share.toString(), name: last.name, id: last.id };
          if (n === CAP / BATCH - 1) cut = true;
        }
        await this.audit.log(tx, {
          actorId: userId,
          action: 'regional.affiliates.export',
          entity: 'regional_director',
          entityId: slot.region,
          tag: 'affiliate',
          summary: `Xuất affiliate của vùng (${lines.length} dòng)`,
          diff: { count: lines.length, truncated: cut },
          ip,
        });
        if (cut) lines.push(['Đã cắt tại 20.000 dòng']);
        return toCsv(
          ['Họ tên', 'Mã affiliate', 'Tỉnh', 'Khách hàng', 'Doanh thu', 'Chia cho vùng'],
          lines,
        );
      },
      { isolationLevel: 'RepeatableRead' },
    );
    return result;
  }
}
