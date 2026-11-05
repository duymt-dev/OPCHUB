import { Injectable } from '@nestjs/common';
import { adminConversionSchema, type AdminConversion } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { toCsv, csvSafeText as safe } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConversionRepository } from './conversion.repository';
import { buildConversion } from './conversion';

export const CONVERSION_CACHE_KEY = 'admin:overview:conversion';
@Injectable()
export class ConversionService {
  constructor(
    private readonly repo: ConversionRepository,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<AdminConversion> {
    const hit = await this.redis.client.get(CONVERSION_CACHE_KEY);
    if (hit) {
      try {
        const parsed = adminConversionSchema.safeParse(JSON.parse(hit));
        if (parsed.success) return parsed.data;
      } catch {
        /* Corrupt cache is recomputed, never used as a response. */
      }
    }
    const aggregate = await this.repo.aggregate();
    const result = buildConversion(aggregate);
    await this.redis.client.set(CONVERSION_CACHE_KEY, JSON.stringify(result), 'EX', 60);
    return result;
  }

  async export(actor: { id: string; ip: string | null }) {
    const data = await this.get();
    const csv = toCsv(
      ['Vùng', 'GĐ Vùng', 'Đang dùng thử', 'Đã trả phí', 'Hết hạn chưa trả', 'Tỷ lệ chuyển đổi'],
      data.rows.map((r) => [
        r.label,
        safe(r.directorName ?? 'Chưa bổ nhiệm'),
        r.trial,
        r.paid,
        r.expired,
        `${r.ratePct}%`,
      ]),
    );
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'report.conversion_export',
        entity: 'report',
        entityId: 'conversion',
        tag: 'report',
        summary: 'xuất chuyển đổi miễn phí → trả phí theo vùng',
      }),
    );
    return { filename: 'chuyen-doi-theo-vung.csv', csv };
  }
}
