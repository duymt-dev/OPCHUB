import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  AUDIT_TAG_LABELS,
  auditCsvTimestamp as vnTime,
  auditLogPageQuerySchema,
  type AuditLogPageQuery,
  type AuditLogFilters,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { toCsv, csvSafeText as safe } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportBuilders, ExportService } from '@/modules/export';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogExportService implements OnModuleInit {
  constructor(
    private readonly pages: AuditLogService,
    private readonly builders: ExportBuilders,
    private readonly exports: ExportService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  onModuleInit() {
    this.builders.register('audit', (params) => this.build(new Date(), params.filters));
  }

  request(actor: { id: string; ip: string | null }, filters: AuditLogFilters = {}) {
    return this.prisma.db.$transaction(async (tx) => {
      const jobId = await this.exports.request(tx, actor.id, { kind: 'audit', filters });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'export.audit',
        entity: 'export',
        entityId: jobId,
        tag: 'settings',
        summary: 'xuất nhật ký hoạt động 90 ngày',
        diff: { filters },
      });
      return { jobId, status: 'queued' as const };
    });
  }

  async build(now = new Date(), filters: AuditLogFilters = {}) {
    let cursor: AuditLogPageQuery['cursor'];
    const rows: string[][] = [];
    // Export owns the bounded keyset scan; never a per-row database lookup.
    for (;;) {
      const page = await this.pages.page({ ...filters, limit: 500, cursor }, now);
      rows.push(
        ...page.items.map((r) => [
          safe(r.actorName),
          safe(r.summary),
          AUDIT_TAG_LABELS[r.tag],
          vnTime(r.at),
        ]),
      );
      if (!page.nextCursor) break;
      cursor = auditLogPageQuerySchema.parse({ cursor: page.nextCursor }).cursor;
    }
    return {
      csv: toCsv(['Người thực hiện', 'Thao tác', 'Nhóm', 'Thời gian'], rows),
      rows: rows.length,
    };
  }
}
