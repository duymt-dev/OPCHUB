import { Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { auditLogRowSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RequireAdmin } from '@/common/auth';
import { AppError } from '@/common/errors';
import { respond } from '@/common/http/zod';
import { AuditLogService } from '../services/audit-log.service';

const auditListSchema = z.object({ items: z.array(auditLogRowSchema) });

/** Route phân quyền cũ (D-42/D-46) — thay bằng `/admin/admin-roles`, `/admin/admin-accounts` (§21) */
const gone = () =>
  new AppError('GONE', 'Chức năng đã chuyển sang Cài đặt › Tài khoản quản trị và Phân quyền');

/** Nhật ký hoạt động (`settings.log`) + route phân quyền cũ trả 410 (TIP-V2-203; xoá ở 204) */
@Controller('admin')
export class RolesController {
  constructor(private readonly audit: AuditLogService) {}

  @RequireAdmin('settings.admins')
  @Get('roles/permissions')
  legacyPermissions(): never {
    throw gone();
  }

  @RequireAdmin('settings.admins')
  @Put('roles/permissions')
  legacyPutPermissions(): never {
    throw gone();
  }

  @RequireAdmin('settings.admins')
  @Get('admins')
  legacyAdmins(): never {
    throw gone();
  }

  @RequireAdmin('settings.admins')
  @Post('admins/invite')
  legacyInvite(): never {
    throw gone();
  }

  @RequireAdmin('settings.admins')
  @Delete('admins/:id')
  legacyRevoke(): never {
    throw gone();
  }

  @RequireAdmin('settings.log')
  @Get('audit-logs')
  async auditLogs(): Promise<z.infer<typeof auditListSchema>> {
    return respond(auditListSchema, await this.audit.recent());
  }
}
