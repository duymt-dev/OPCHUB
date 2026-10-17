import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  type Report,
  type ReportMessageRequest,
  reportMessageSchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { ReportService } from '../services/report.service';

/** `POST /messages/:id/report` — thành viên báo cáo tin */
@Controller('messages/:id/report')
export class MessageReportController {
  constructor(private readonly reports: ReportService) {}

  @Post()
  @HttpCode(201)
  async report(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(reportMessageSchema) body: ReportMessageRequest,
  ): Promise<Report> {
    return respond(reportSchema, await this.reports.report(user, id, body));
  }
}
