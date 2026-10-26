import { Injectable, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import {
  REPORT_REGION_LABEL,
  type ReportParams,
  type ReportPreview,
  type ReportRegion,
  type ReportScopes,
  reportFileName,
  reportMonthLabel,
} from '@opchub/shared/api-domains';
import { reportCsv } from '@opchub/shared/reports';
import { AuditService } from '@/common/audit';
import { AppError, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportBuilders, ExportService } from '@/modules/export';
import {
  type GroupScopeRow,
  type ReportPeriod,
  ReportMetricsRepository,
} from './report-metrics.repository';

const VN_OFFSET_MS = 7 * 3_600_000;

/** `YYYY-MM` → [01/MM 00:00, 01/MM+1 00:00) giờ VN (UTC); tháng VN hiện tại khi so sánh tương lai */
export function reportPeriod(month: string): ReportPeriod {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  return {
    start: new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS),
    end: new Date(Date.UTC(y, m + 1, 1) - VN_OFFSET_MS),
    monthKey: month,
  };
}

/** Tháng VN của `now` dạng `YYYY-MM` */
export const vnMonthKey = (now: Date) =>
  new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 7);

/**
 * Admin › Báo cáo (V4-614, D-78): phạm vi → số liệu "Thực hiện" của tháng → CSV khuôn B1/B2/B3
 * (`@opchub/shared/reports`). Chỉ đọc; xuất đi qua job `export` (audit + link ký 1 giờ).
 */
@Injectable()
export class ReportExportService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: ReportMetricsRepository,
    private readonly exports: ExportService,
    private readonly builders: ExportBuilders,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.builders.register('report', (p) => this.csv(p.report));
  }

  async scopes(): Promise<ReportScopes> {
    const rows = await this.prisma.db.group.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, province: true, region: true },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });
    const provinces = new Map<string, ReportRegion>();
    for (const g of rows) if (!provinces.has(g.province)) provinces.set(g.province, g.region);
    return {
      groups: rows.map(({ id, name, province }) => ({ id, name, province })),
      provinces: [...provinces].map(([name, region]) => ({ name, region })),
    };
  }

  /** 400 tháng tương lai; 404 phạm vi không có nhóm */
  async preview(p: ReportParams, now = new Date()): Promise<ReportPreview> {
    const groups = await this.scope(p, now);
    const first = groups[0] as GroupScopeRow;
    const period = reportPeriod(p.month);
    const ids = groups.map((g) => g.id);
    const t = await this.metrics.totals(ids, period);
    const metrics = { ...t, totalRevenue: t.feeRevenue + t.fundraisingRevenue };
    const base = { template: p.template, month: p.month, metrics, groups: [], provinces: [] };
    if (p.template === 'b1')
      return { ...base, scope: first.name, province: first.province, leader: first.owner };
    if (p.template === 'b2')
      return {
        ...base,
        scope: p.province,
        province: p.province,
        leader: '',
        groups: await this.groupRows(groups, period),
      };
    const rows = await this.metrics.perProvince(ids, period);
    return {
      ...base,
      scope: REPORT_REGION_LABEL[p.region],
      province: '',
      leader: '',
      provinces: rows.map((r) => ({
        province: r.province,
        newMembers: Number(r.new_members),
        totalMembers: Number(r.total_members),
        events: Number(r.events),
        feeRevenue: Number(r.fee_revenue),
      })),
    };
  }

  /** Worker export: CSV + số dòng dữ liệu (dòng chỉ số / nhóm / tỉnh) */
  async csv(p: ReportParams): Promise<{ csv: string; rows: number }> {
    const preview = await this.preview(p);
    const rows = preview.template === 'b2' ? preview.groups.length : preview.provinces.length;
    return { csv: reportCsv(preview), rows: rows || 1 };
  }

  /** Job `export(kind=report)` + outbox + audit `report.export` cùng transaction (luật 10) */
  async requestExport(actor: { id: string; ip: string | null }, p: ReportParams, now = new Date()) {
    const groups = await this.scope(p, now);
    const scope = this.scopeLabel(p, groups[0] as GroupScopeRow);
    const file = reportFileName(p.template, p.month, scope);
    const jobId = await this.prisma.db.$transaction(async (tx) => {
      const id = await this.exports.request(tx, actor.id, { kind: 'report', report: p, file }, now);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'report.export',
        entity: 'export',
        entityId: id,
        tag: 'report',
        summary: `xuất ${p.template.toUpperCase()} tháng ${reportMonthLabel(p.month)} · ${scope}`,
        ip: actor.ip,
      });
      return id;
    });
    return { jobId, status: 'queued' as const };
  }

  /** Nhóm của phạm vi (≥ 1) — 400 tháng tương lai, 404 phạm vi rỗng */
  private async scope(p: ReportParams, now: Date): Promise<GroupScopeRow[]> {
    if (p.month > vnMonthKey(now))
      throw new AppError('VALIDATION_ERROR', 'Chưa thể báo cáo tháng chưa diễn ra');
    const groups = await this.metrics.groups(this.scopeSql(p));
    if (!groups.length) throw notFound('Không tìm thấy phạm vi báo cáo');
    return groups;
  }

  private scopeLabel(p: ReportParams, first: GroupScopeRow): string {
    if (p.template === 'b1') return first.name;
    return p.template === 'b2' ? p.province : REPORT_REGION_LABEL[p.region];
  }

  private scopeSql(p: ReportParams): Prisma.Sql {
    if (p.template === 'b1') return Prisma.sql`g.id = ${p.groupId}`;
    if (p.template === 'b2') return Prisma.sql`g.province = ${p.province}`;
    return Prisma.sql`g.region = ${p.region}::region`;
  }

  private async groupRows(groups: GroupScopeRow[], period: ReportPeriod) {
    const per = new Map(
      (
        await this.metrics.perGroup(
          groups.map((g) => g.id),
          period,
        )
      ).map((r) => [r.group_id, r]),
    );
    return groups.map((g) => ({
      groupId: g.id,
      name: g.name,
      owner: g.owner,
      members: Number(per.get(g.id)?.members ?? 0),
      messages: Number(per.get(g.id)?.messages ?? 0),
    }));
  }
}
