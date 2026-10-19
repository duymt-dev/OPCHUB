import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { type ExportStatus, exportStatusSchema } from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { ExportService } from './export.service';

/** Trạng thái job xuất — chỉ người tạo (người khác 404); trả link = ghi audit `export.download` */
@Controller('admin/exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @RequirePermission('m.view')
  @Get(':id')
  async status(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ExportStatus> {
    return respond(exportStatusSchema, await this.exports.status(user.sub, id, req.ip ?? null));
  }
}
