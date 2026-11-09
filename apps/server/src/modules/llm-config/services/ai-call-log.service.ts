import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  aiCallsPageSchema,
  auditCsvTimestamp,
  encodeAiCallsCursor,
  type AiCallsQuery,
  type AiCallsFilter,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { csvCell, csvSafeText, toCsv } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportBuilders, ExportService } from '@/modules/export';
import { AiCallRepository } from '../repositories/ai-call.repository';

const HEAD = [
  'Thời gian',
  'Chức năng',
  'Nhà cung cấp',
  'Mô hình',
  'Token vào',
  'Token ra',
  'Chi phí (đ)',
  'Độ trễ (ms)',
  'Trạng thái',
  'Mã lỗi',
];

@Injectable()
export class AiCallLogService implements OnModuleInit {
  constructor(
    private readonly calls: AiCallRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly exports: ExportService,
    private readonly builders: ExportBuilders,
  ) {}
  onModuleInit() {
    this.builders.register('ai_calls', ({ filters }) => this.exportRows(filters));
  }
  async page(query: AiCallsQuery) {
    const [rows, totals] = await Promise.all([this.calls.page(query), this.calls.totals(query)]);
    const items = rows.slice(0, query.limit).map(({ actorRealm, actorId, cost, ...row }) => ({
      ...row,
      cost: Number(cost),
      actor: { realm: actorRealm, id: actorId?.slice(0, 8) ?? null },
    }));
    const last = items.at(-1);
    return aiCallsPageSchema.parse({
      items,
      totals,
      nextCursor:
        rows.length > query.limit && last
          ? encodeAiCallsCursor({ at: last.at, id: last.id })
          : null,
    });
  }
  async request(actor: { id: string; ip: string | null }, filters: AiCallsFilter) {
    const id = await this.prisma.db.$transaction(async (tx) => {
      const id = await this.exports.request(tx, actor.id, { kind: 'ai_calls', filters });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'llm.calls.export',
        entity: 'ai',
        entityId: id,
        tag: 'settings',
        summary: 'Xuất nhật ký gọi AI',
        diff: { filters },
      });
      return id;
    });
    return { jobId: id, status: 'queued' as const };
  }
  private async exportRows(filters: AiCallsFilter) {
    const lines: string[] = [];
    const append = async (cursor?: AiCallsQuery['cursor']): Promise<void> => {
      const rows = await this.calls.page(
        { ...filters, limit: 100, ...(cursor ? { cursor } : {}) },
        1000,
      );
      lines.push(
        ...rows.map((r) =>
          [
            auditCsvTimestamp(r.at),
            r.purpose,
            r.provider,
            r.model,
            r.promptTokens,
            r.completionTokens,
            r.cost.toString(),
            r.latencyMs,
            r.status,
            r.errorCode ?? '',
          ]
            .map((v) => csvCell(csvSafeText(String(v))))
            .join(','),
        ),
      );
      const last = rows.at(-1);
      if (rows.length === 1000 && last) await append({ at: last.at, id: last.id });
    };
    await append();
    return {
      csv: `${toCsv(HEAD, [])}${lines.length ? '\n' + lines.join('\n') : ''}`,
      rows: lines.length,
    };
  }
}
