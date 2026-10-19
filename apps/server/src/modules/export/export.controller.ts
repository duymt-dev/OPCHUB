import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { type ExportStatus, exportStatusSchema } from '@opchub/shared/api-domains';
import { ADMIN_PERMISSION_KEYS } from '@opchub/shared';
import { type AccessClaims, CurrentUser, RequireAnyAdmin } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { ExportService } from './export.service';

/**
 * Trạng thái job xuất — chỉ người tạo (người khác 404); trả link = ghi audit `export.download`.
 * Khoá: bất kỳ `*.action` (mọi luồng xuất đều cần khoá thao tác của menu, §21)
 */
const ACTION_KEYS = ADMIN_PERMISSION_KEYS.filter((k) => k.endsWith('.action'));

@Controller('admin/exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @RequireAnyAdmin(...ACTION_KEYS)
  @Get(':id')
  async status(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ExportStatus> {
    return respond(exportStatusSchema, await this.exports.status(user.sub, id, req.ip ?? null));
  }
}
