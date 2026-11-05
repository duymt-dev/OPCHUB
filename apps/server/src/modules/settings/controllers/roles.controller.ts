import { Controller, Get, Post, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  auditLogPageSchema,
  auditLogPageQuerySchema,
  exportJobSchema,
  type AuditLogPageQuery,
} from '@opchub/shared/api-domains';
import { RequireAdmin, CurrentUser, type AccessClaims } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogExportService } from '../services/audit-log-export.service';

/** Nhật ký hoạt động (`settings.log`); route phân quyền cũ đã xoá ở TIP-V2-204 (→ 404) */
@Controller('admin')
export class RolesController {
  constructor(
    private readonly audit: AuditLogService,
    private readonly exports: AuditLogExportService,
  ) {}

  @RequireAdmin('settings.log')
  @Get('audit-logs')
  async auditLogs(@ZodQuery(auditLogPageQuerySchema) query: AuditLogPageQuery) {
    return respond(auditLogPageSchema, await this.audit.page(query));
  }

  @RequireAdmin('settings.log')
  @Post('audit-logs/export')
  @HttpCode(202)
  async export(@CurrentUser() actor: AccessClaims, @Req() req: Request) {
    return respond(
      exportJobSchema,
      await this.exports.request({ id: actor.sub, ip: req.ip ?? null }),
    );
  }
}
