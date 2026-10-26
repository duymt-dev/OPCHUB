import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  type ReportParams,
  reportExportResponseSchema,
  reportParamsSchema,
  reportPreviewQuerySchema,
  reportPreviewSchema,
  reportScopesSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { ReportExportService } from './report-export.service';

/**
 * Admin › Báo cáo B1/B2/B3 (V4-614, D-78) — quyền `reports.view`. Đường tĩnh `reports/scopes|preview|export`
 * không đụng `GET admin/reports` / `reports/:id/action` của kiểm duyệt.
 */
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportExportService) {}

  @RequireAdmin('reports.view')
  @Get('scopes')
  async scopes() {
    return respond(reportScopesSchema, await this.reports.scopes());
  }

  @RequireAdmin('reports.view')
  @Get('preview')
  async preview(@ZodQuery(reportPreviewQuerySchema) q: ReportParams) {
    return respond(reportPreviewSchema, await this.reports.preview(q));
  }

  @RequireAdmin('reports.view')
  @Post('export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(reportParamsSchema) body: ReportParams,
  ) {
    const res = await this.reports.requestExport({ id: user.sub, ip: req.ip ?? null }, body);
    return respond(reportExportResponseSchema, res);
  }
}
